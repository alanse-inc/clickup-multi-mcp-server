/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service - Search Module
 * 
 * Handles search and lookup operations for tasks in ClickUp, including:
 * - Finding tasks by name
 * - Global workspace task lookup
 * - Task summaries and detailed task data
 */

import { TaskServiceCore } from './task-core.js';
import {
  ClickUpTask,
  TaskFilters,
  TaskSummary,
  WorkspaceTasksResponse,
  DetailedTaskResponse,
  ExtendedTaskFilters,
  UpdateTaskData
} from '../types.js';
import { isNameMatch } from '../../../utils/resolver-utils.js';
import { findListIDByName } from '../../../tools/list.js';
import { estimateTokensFromObject, wouldExceedTokenLimit } from '../../../utils/token-utils.js';

/**
 * Search functionality for the TaskService
 *
 * This service handles all search and lookup operations for ClickUp tasks.
 * It uses composition to access core functionality instead of inheritance.
 *
 * REFACTORED: Now uses composition instead of inheritance.
 * Only depends on TaskServiceCore for base functionality.
 */
export class TaskServiceSearch {
  constructor(private core: TaskServiceCore) {}
  /**
   * Find a task by name within a specific list
   * @param listId The ID of the list to search in
   * @param taskName The name of the task to find
   * @returns The task if found, otherwise null
   */
  async findTaskByName(listId: string, taskName: string): Promise<ClickUpTask | null> {
    (this.core as any).logOperation('findTaskByName', { listId, taskName });

    try {
      const tasks = await this.core.getTasks(listId);
      return this.findTaskInArray(tasks, taskName);
    } catch (error) {
      throw (this.core as any).handleError(error, `Failed to find task by name: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find a task by name from an array of tasks
   * @param taskArray Array of tasks to search in
   * @param name Name of the task to search for
   * @param includeDetails Whether to add list context to task
   * @returns The task that best matches the name, or null if no match
   */
  private findTaskInArray(taskArray: any[], name: string, includeDetails = false): any {
    if (!taskArray || !Array.isArray(taskArray) || taskArray.length === 0 || !name) {
      return null;
    }

    // Get match scores for each task
    const taskMatchScores = taskArray
      .map(task => {
        const matchResult = isNameMatch(task.name, name);
        return {
          task,
          matchResult,
          // Parse the date_updated field as a number for sorting
          updatedAt: task.date_updated ? parseInt(task.date_updated, 10) : 0
        };
      })
      .filter(result => result.matchResult.isMatch);

    if (taskMatchScores.length === 0) {
      return null;
    }

    // First, try to find exact matches
    const exactMatches = taskMatchScores
      .filter(result => result.matchResult.exactMatch)
      .sort((a, b) => {
        // For exact matches with the same score, sort by most recently updated
        if (b.matchResult.score === a.matchResult.score) {
          return b.updatedAt - a.updatedAt;
        }
        return b.matchResult.score - a.matchResult.score;
      });

    // Get the best matches based on whether we have exact matches or need to fall back to fuzzy matches
    const bestMatches = exactMatches.length > 0 ? exactMatches : taskMatchScores.sort((a, b) => {
      // First sort by match score (highest first)
      if (b.matchResult.score !== a.matchResult.score) {
        return b.matchResult.score - a.matchResult.score;
      }
      // Then sort by most recently updated
      return b.updatedAt - a.updatedAt;
    });

    // Get the best match
    const bestMatch = bestMatches[0].task;

    // If we need to include more details
    if (includeDetails) {
      // Include any additional details needed
    }

    return bestMatch;
  }

  /**
   * Formats a task into a lightweight summary format
   * @param task The task to format
   * @returns A TaskSummary object
   */
  protected formatTaskSummary(task: ClickUpTask): TaskSummary {
    return {
      id: task.id,
      name: task.name,
      status: task.status.status,
      list: {
        id: task.list.id,
        name: task.list.name
      },
      due_date: task.due_date,
      url: task.url,
      priority: (this.core as any).extractPriorityValue(task),
      tags: task.tags.map(tag => ({
        name: tag.name,
        tag_bg: tag.tag_bg,
        tag_fg: tag.tag_fg
      }))
    };
  }

  /**
   * Estimates token count for a task in JSON format
   * @param task ClickUp task
   * @returns Estimated token count
   */
  protected estimateTaskTokens(task: ClickUpTask): number {
    return estimateTokensFromObject(task);
  }

  /**
   * Get filtered tasks across the entire team/workspace using tags and other filters
   * @param filters Task filters to apply including tags, list/folder/space filtering
   * @returns Either a DetailedTaskResponse or WorkspaceTasksResponse depending on detail_level
   */
  async getWorkspaceTasks(filters: ExtendedTaskFilters = {}): Promise<DetailedTaskResponse | WorkspaceTasksResponse> {
    try {
      (this.core as any).logOperation('getWorkspaceTasks', { filters });

      const params = (this.core as any).buildTaskFilterParams(filters);
      const response = await (this.core as any).makeRequest(async () => {
        return await (this.core as any).client.get(`/team/${(this.core as any).teamId}/task`, {
          params
        });
      });

      const tasks = response.data.tasks;
      const totalCount = tasks.length; // Note: This is just the current page count
      const hasMore = totalCount === 100; // ClickUp returns max 100 tasks per page
      const nextPage = (filters.page || 0) + 1;

      // If the estimated token count exceeds 50,000 or detail_level is 'summary',
      // return summary format for efficiency and to avoid hitting token limits
      const TOKEN_LIMIT = 50000;
      
      // Estimate tokens for the full response
      let tokensExceedLimit = false;
      
      if (filters.detail_level !== 'summary' && tasks.length > 0) {
        // We only need to check token count if detailed was requested
        // For summary requests, we always return summary format
        
        // First check with a sample task - if one task exceeds the limit, we definitely need summary
        const sampleTask = tasks[0];
        
        // Check if all tasks would exceed the token limit
        const estimatedTokensPerTask = (this.core as any).estimateTaskTokens(sampleTask);
        const estimatedTotalTokens = estimatedTokensPerTask * tasks.length;
        
        // Add 10% overhead for the response wrapper
        tokensExceedLimit = estimatedTotalTokens * 1.1 > TOKEN_LIMIT;
        
        // Double-check with more precise estimation if we're close to the limit
        if (!tokensExceedLimit && estimatedTotalTokens * 1.1 > TOKEN_LIMIT * 0.8) {
          // More precise check - build a representative sample and extrapolate
          tokensExceedLimit = wouldExceedTokenLimit(
            { tasks, total_count: totalCount, has_more: hasMore, next_page: nextPage },
            TOKEN_LIMIT
          );
        }
      }

      // Determine if we should return summary or detailed based on request and token limit
      const shouldUseSummary = filters.detail_level === 'summary' || tokensExceedLimit;

      (this.core as any).logOperation('getWorkspaceTasks', {
        totalTasks: tasks.length,
        estimatedTokens: tasks.reduce((count, task) => count + (this.core as any).estimateTaskTokens(task), 0),
        usingDetailedFormat: !shouldUseSummary,
        requestedFormat: filters.detail_level || 'auto'
      });

      if (shouldUseSummary) {
        return {
          summaries: tasks.map(task => (this.core as any).formatTaskSummary(task)),
          total_count: totalCount,
          has_more: hasMore,
          next_page: nextPage
        };
      }

      return {
        tasks,
        total_count: totalCount,
        has_more: hasMore,
        next_page: nextPage
      };
    } catch (error) {
      (this.core as any).logOperation('getWorkspaceTasks', { error: error.message, status: error.response?.status });
      throw (this.core as any).handleError(error, 'Failed to get workspace tasks');
    }
  }

  /**
   * Get task summaries for lightweight retrieval
   * @param filters Task filters to apply
   * @returns WorkspaceTasksResponse with task summaries
   */
  async getTaskSummaries(filters: TaskFilters = {}): Promise<WorkspaceTasksResponse> {
    return this.getWorkspaceTasks({ ...filters, detail_level: 'summary' }) as Promise<WorkspaceTasksResponse>;
  }

  /**
   * Get all views for a given list and identify the default "List" view ID
   * @param listId The ID of the list to get views for
   * @returns The ID of the default list view, or null if not found
   */
  async getListViews(listId: string): Promise<string | null> {
    try {
      (this.core as any).logOperation('getListViews', { listId });

      const response = await (this.core as any).makeRequest(async () => {
        return await (this.core as any).client.get(`/list/${listId}/view`);
      });

      // First try to get the default list view from required_views.list
      if (response.data.required_views?.list?.id) {
        (this.core as any).logOperation('getListViews', {
          listId,
          foundDefaultView: response.data.required_views.list.id,
          source: 'required_views.list'
        });
        return response.data.required_views.list.id;
      }

      // Fallback: look for a view with type "list" in the views array
      const listView = response.data.views?.find(view =>
        view.type?.toLowerCase() === 'list' ||
        view.name?.toLowerCase().includes('list')
      );

      if (listView?.id) {
        (this.core as any).logOperation('getListViews', {
          listId,
          foundDefaultView: listView.id,
          source: 'views_array_fallback',
          viewName: listView.name
        });
        return listView.id;
      }

      // If no specific list view found, use the first available view
      if (response.data.views?.length > 0) {
        const firstView = response.data.views[0];
        (this.core as any).logOperation('getListViews', {
          listId,
          foundDefaultView: firstView.id,
          source: 'first_available_view',
          viewName: firstView.name,
          warning: 'No specific list view found, using first available view'
        });
        return firstView.id;
      }

      (this.core as any).logOperation('getListViews', {
        listId,
        error: 'No views found for list',
        responseData: response.data
      });
      return null;

    } catch (error) {
      (this.core as any).logOperation('getListViews', {
        listId,
        error: error.message,
        status: error.response?.status
      });
      throw (this.core as any).handleError(error, `Failed to get views for list ${listId}`);
    }
  }

  /**
   * Retrieve tasks from a specific view, applying supported filters
   * @param viewId The ID of the view to get tasks from
   * @param filters Task filters to apply (only supported filters will be used)
   * @returns Array of ClickUpTask objects from the view
   */
  async getTasksFromView(viewId: string, filters: ExtendedTaskFilters = {}): Promise<ClickUpTask[]> {
    try {
      (this.core as any).logOperation('getTasksFromView', { viewId, filters });

      // Build query parameters for supported filters
      const params: Record<string, any> = {};

      // Map supported filters to query parameters
      if (filters.subtasks !== undefined) params.subtasks = filters.subtasks;
      if (filters.include_closed !== undefined) params.include_closed = filters.include_closed;
      if (filters.archived !== undefined) params.archived = filters.archived;
      if (filters.page !== undefined) params.page = filters.page;
      if (filters.order_by) params.order_by = filters.order_by;
      if (filters.reverse !== undefined) params.reverse = filters.reverse;

      // Status filtering
      if (filters.statuses && filters.statuses.length > 0) {
        params.statuses = filters.statuses;
      }

      // Assignee filtering
      if (filters.assignees && filters.assignees.length > 0) {
        params.assignees = filters.assignees;
      }

      // Date filters
      if (filters.date_created_gt) params.date_created_gt = filters.date_created_gt;
      if (filters.date_created_lt) params.date_created_lt = filters.date_created_lt;
      if (filters.date_updated_gt) params.date_updated_gt = filters.date_updated_gt;
      if (filters.date_updated_lt) params.date_updated_lt = filters.date_updated_lt;
      if (filters.due_date_gt) params.due_date_gt = filters.due_date_gt;
      if (filters.due_date_lt) params.due_date_lt = filters.due_date_lt;

      // Custom fields
      if (filters.custom_fields) {
        params.custom_fields = filters.custom_fields;
      }

      let allTasks: ClickUpTask[] = [];
      let currentPage = filters.page || 0;
      let hasMore = true;
      const maxPages = 50; // Safety limit to prevent infinite loops
      let pageCount = 0;

      while (hasMore && pageCount < maxPages) {
        const pageParams = { ...params, page: currentPage };

        const response = await (this.core as any).makeRequest(async () => {
          return await (this.core as any).client.get(`/view/${viewId}/task`, {
            params: pageParams
          });
        });

        const tasks = response.data.tasks || [];
        allTasks = allTasks.concat(tasks);

        // Check if there are more pages
        hasMore = response.data.has_more === true && tasks.length > 0;
        currentPage++;
        pageCount++;

        (this.core as any).logOperation('getTasksFromView', {
          viewId,
          page: currentPage - 1,
          tasksInPage: tasks.length,
          totalTasksSoFar: allTasks.length,
          hasMore
        });

        // If we're not paginating (original request had no page specified),
        // only get the first page
        if (filters.page === undefined && currentPage === 1) {
          break;
        }
      }

      if (pageCount >= maxPages) {
        (this.core as any).logOperation('getTasksFromView', {
          viewId,
          warning: `Reached maximum page limit (${maxPages}) while fetching tasks`,
          totalTasks: allTasks.length
        });
      }

      (this.core as any).logOperation('getTasksFromView', {
        viewId,
        totalTasks: allTasks.length,
        totalPages: pageCount
      });

      return allTasks;

    } catch (error) {
      (this.core as any).logOperation('getTasksFromView', {
        viewId,
        error: error.message,
        status: error.response?.status
      });
      throw (this.core as any).handleError(error, `Failed to get tasks from view ${viewId}`);
    }
  }

  /**
   * Get detailed task data
   * @param filters Task filters to apply
   * @returns DetailedTaskResponse with full task data
   */
  async getTaskDetails(filters: TaskFilters = {}): Promise<DetailedTaskResponse> {
    return this.getWorkspaceTasks({ ...filters, detail_level: 'detailed' }) as Promise<DetailedTaskResponse>;
  }

  /**
   * Unified method for finding tasks by ID or name with consistent handling of global lookup
   * 
   * This method provides a single entry point for all task lookup operations:
   * - Direct lookup by task ID (highest priority)
   * - Lookup by task name within a specific list
   * - Global lookup by task name across the entire workspace
   * 
   * @param options Lookup options with the following parameters:
   *   - taskId: Optional task ID for direct lookup
   *   - customTaskId: Optional custom task ID for direct lookup
   *   - taskName: Optional task name to search for
   *   - listId: Optional list ID to scope the search
   *   - listName: Optional list name to scope the search
   *   - allowMultipleMatches: Whether to return all matches instead of throwing an error
   *   - useSmartDisambiguation: Whether to automatically select the most recently updated task
   *   - includeFullDetails: Whether to include full task details (true) or just task summaries (false)
   *   - includeListContext: Whether to include list/folder/space context with results
   *   - requireExactMatch: Whether to only consider exact name matches (true) or allow fuzzy matches (false)
   * @returns Either a single task or an array of tasks depending on options
   * @throws Error if task cannot be found or if multiple matches are found when not allowed
   */
  async findTasks({
    taskId,
    customTaskId,
    taskName,
    listId,
    listName,
    allowMultipleMatches = false,
    useSmartDisambiguation = true,
    includeFullDetails = true,
    includeListContext = false,
    requireExactMatch = false
  }: {
    taskId?: string;
    customTaskId?: string;
    taskName?: string;
    listId?: string;
    listName?: string;
    allowMultipleMatches?: boolean;
    useSmartDisambiguation?: boolean;
    includeFullDetails?: boolean;
    includeListContext?: boolean;
    requireExactMatch?: boolean;
  }): Promise<ClickUpTask | ClickUpTask[] | null> {
    try {
      (this.core as any).logOperation('findTasks', {
        taskId,
        customTaskId,
        taskName,
        listId,
        listName,
        allowMultipleMatches,
        useSmartDisambiguation,
        requireExactMatch
      });

      // Check name-to-ID cache first if we have a task name
      if (taskName && !taskId && !customTaskId) {
        // Resolve list ID if we have a list name
        let resolvedListId = listId;
        if (listName && !listId) {
          const listInfo = await findListIDByName((this.core as any).workspaceService!, listName);
          if (listInfo) {
            resolvedListId = listInfo.id;
          }
        }

        // Try to get cached task ID
        const cachedTaskId = (this.core as any).getCachedTaskId(taskName, resolvedListId);
        if (cachedTaskId) {
          (this.core as any).logOperation('findTasks', {
            message: 'Using cached task ID for name lookup',
            taskName,
            cachedTaskId
          });
          taskId = cachedTaskId;
        }
      }
      
      // Case 1: Direct task ID lookup (highest priority)
      if (taskId) {
        // Check if it looks like a custom ID
        if (taskId.includes('-') && /^[A-Z]+\-\d+$/.test(taskId)) {
          (this.core as any).logOperation('findTasks', { detectedCustomId: taskId });

          try {
            // Try to get it as a custom ID first
            let resolvedListId: string | undefined;
            if (listId) {
              resolvedListId = listId;
            } else if (listName) {
              const listInfo = await findListIDByName((this.core as any).workspaceService!, listName);
              if (listInfo) {
                resolvedListId = listInfo.id;
              }
            }

            const foundTask = await this.core.getTaskByCustomId(taskId, resolvedListId);
            return foundTask;
          } catch (error) {
            // If it fails as a custom ID, try as a regular ID
            (this.core as any).logOperation('findTasks', {
              message: `Failed to find task with custom ID "${taskId}", falling back to regular ID`,
              error: error.message
            });
            return await this.core.getTask(taskId);
          }
        }

        // Regular task ID
        return await this.core.getTask(taskId);
      }

      // Case 2: Explicit custom task ID lookup
      if (customTaskId) {
        let resolvedListId: string | undefined;
        if (listId) {
          resolvedListId = listId;
        } else if (listName) {
          const listInfo = await findListIDByName((this.core as any).workspaceService!, listName);
          if (listInfo) {
            resolvedListId = listInfo.id;
          }
        }

        return await this.core.getTaskByCustomId(customTaskId, resolvedListId);
      }
      
      // Case 3: Task name lookup (requires either list context or global lookup)
      if (taskName) {
        // Case 3a: Task name + list context - search in specific list
        if (listId || listName) {
          let resolvedListId: string;
          if (listId) {
            resolvedListId = listId;
          } else {
            const listInfo = await findListIDByName((this.core as any).workspaceService!, listName!);
            if (!listInfo) {
              throw new Error(`List "${listName}" not found`);
            }
            resolvedListId = listInfo.id;
          }

          const foundTask = (this.core as any).findTaskInArray(await this.core.getTasks(resolvedListId), taskName, includeListContext);
          if (!foundTask) {
            throw new Error(`Task "${taskName}" not found in list`);
          }

          // Cache the task name to ID mapping with list context
          (this.core as any).cacheTaskNameToId(taskName, foundTask.id, resolvedListId);

          // If includeFullDetails is true and we need context not already in the task,
          // get full details, otherwise return what we already have
          if (includeFullDetails && (!foundTask.list || !foundTask.list.name || !foundTask.status)) {
            return await this.core.getTask(foundTask.id);
          }

          return foundTask;
        }

        // Case 3b: Task name without list context - global lookup across workspace
        // Get lightweight task summaries for efficient first-pass filtering
        (this.core as any).logOperation('findTasks', {
          message: `Starting global task search for "${taskName}"`,
          includeFullDetails,
          useSmartDisambiguation,
          requireExactMatch
        });

        // Use statuses parameter to get both open and closed tasks
        // Include additional filters to ensure we get as many tasks as possible
        const response = await this.getTaskSummaries({
          include_closed: true,
          include_archived_lists: true,
          include_closed_lists: true,
          subtasks: true
        });

        if (!(this.core as any).workspaceService) {
          throw new Error("Workspace service required for global task lookup");
        }

        // Create an index to efficiently look up list context information
        const hierarchy = await (this.core as any).workspaceService.getWorkspaceHierarchy();
        const listContextMap = new Map<string, { 
          listId: string, 
          listName: string, 
          spaceId: string, 
          spaceName: string, 
          folderId?: string, 
          folderName?: string 
        }>();
        
        // Function to recursively build list context map
        function buildListContextMap(nodes: any[], spaceId?: string, spaceName?: string, folderId?: string, folderName?: string) {
          for (const node of nodes) {
            if (node.type === 'space') {
              // Process space children
              if (node.children) {
                buildListContextMap(node.children, node.id, node.name);
              }
            } else if (node.type === 'folder') {
              // Process folder children
              if (node.children) {
                buildListContextMap(node.children, spaceId, spaceName, node.id, node.name);
              }
            } else if (node.type === 'list') {
              // Add list context to map
              listContextMap.set(node.id, {
                listId: node.id,
                listName: node.name,
                spaceId: spaceId!,
                spaceName: spaceName!,
                folderId,
                folderName
              });
            }
          }
        }
        
        // Build the context map
        buildListContextMap(hierarchy.root.children);
        
        // Find tasks that match the provided name with scored match results
        const initialMatches: { 
          id: string, 
          task: any, 
          listContext: any,
          matchScore: number,
          matchReason: string
        }[] = [];
        
        // Process task summaries to find initial matches
        let taskCount = 0;
        let matchesFound = 0;
        
        // Add additional logging to debug task matching
        (this.core as any).logOperation('findTasks', {
          total_tasks_in_response: response.summaries.length,
          search_term: taskName,
          requireExactMatch
        });

        for (const taskSummary of response.summaries) {
          taskCount++;

          // Use isNameMatch for consistent matching behavior with scoring
          const matchResult = isNameMatch(taskSummary.name, taskName);
          const isMatch = matchResult.isMatch;

          // For debugging, log every 20th task or any task with a similar name
          if (taskCount % 20 === 0 || taskSummary.name.toLowerCase().includes(taskName.toLowerCase()) ||
              taskName.toLowerCase().includes(taskSummary.name.toLowerCase())) {
            (this.core as any).logOperation('findTasks:matching', {
              task_name: taskSummary.name,
              search_term: taskName,
              list_name: taskSummary.list?.name || 'Unknown list',
              is_match: isMatch,
              match_score: matchResult.score,
              match_reason: matchResult.reason || 'no-match'
            });
          }
          
          if (isMatch) {
            matchesFound++;
            // Get list context information
            const listContext = listContextMap.get(taskSummary.list.id);
            
            if (listContext) {
              // Store task summary and context with match score
              initialMatches.push({
                id: taskSummary.id,
                task: taskSummary,
                listContext,
                matchScore: matchResult.score,
                matchReason: matchResult.reason || 'unknown'
              });
            }
          }
        }
        
        (this.core as any).logOperation('findTasks', {
          globalSearch: true,
          searchTerm: taskName,
          tasksSearched: taskCount,
          matchesFound: matchesFound,
          validMatchesWithContext: initialMatches.length
        });
        
        // Handle the no matches case
        if (initialMatches.length === 0) {
          throw new Error(`Task "${taskName}" not found in any list across your workspace. Please check the task name and try again.`);
        }
        
        // Sort matches by match score first (higher is better), then by update time
        initialMatches.sort((a, b) => {
          // First sort by match score (highest first)
          if (b.matchScore !== a.matchScore) {
            return b.matchScore - a.matchScore;
          }
          
          // Try to get the date_updated from the task
          const aDate = a.task.date_updated ? parseInt(a.task.date_updated, 10) : 0;
          const bDate = b.task.date_updated ? parseInt(b.task.date_updated, 10) : 0;
          
          // For equal scores, sort by most recently updated
          return bDate - aDate;
        });
        
        // Handle the single match case - we can return early if we don't need full details
        if (initialMatches.length === 1 && !useSmartDisambiguation && !includeFullDetails) {
          const match = initialMatches[0];
          
          if (includeListContext) {
            return {
              ...match.task,
              list: {
                id: match.listContext.listId,
                name: match.listContext.listName
              },
              folder: match.listContext.folderId ? {
                id: match.listContext.folderId,
                name: match.listContext.folderName
              } : undefined,
              space: {
                id: match.listContext.spaceId,
                name: match.listContext.spaceName
              }
            };
          }
          
          return match.task;
        }
        
        // Handle the exact match case - if there's an exact or very good match, prefer it over others
        // This is our key improvement to prefer exact matches over update time
        const bestMatchScore = initialMatches[0].matchScore;
        if (bestMatchScore >= 80) { // 80+ is an exact match or case-insensitive exact match
          // If there's a single best match with score 80+, use it directly
          const exactMatches = initialMatches.filter(m => m.matchScore >= 80);
          
          if (exactMatches.length === 1 && !allowMultipleMatches) {
            (this.core as any).logOperation('findTasks', {
              message: `Found single exact match with score ${exactMatches[0].matchScore}, prioritizing over other matches`,
              matchReason: exactMatches[0].matchReason
            });

            // If we don't need details, return early
            if (!includeFullDetails) {
              const match = exactMatches[0];
              if (includeListContext) {
                return {
                  ...match.task,
                  list: {
                    id: match.listContext.listId,
                    name: match.listContext.listName
                  },
                  folder: match.listContext.folderId ? {
                    id: match.listContext.folderId,
                    name: match.listContext.folderName
                  } : undefined,
                  space: {
                    id: match.listContext.spaceId,
                    name: match.listContext.spaceName
                  }
                };
              }
              return match.task;
            }

            // Otherwise, get the full details
            const fullTask = await this.core.getTask(exactMatches[0].id);
            
            if (includeListContext) {
              const match = exactMatches[0];
              // Enhance task with context information
              (fullTask as any).list = {
                ...fullTask.list,
                name: match.listContext.listName
              };
              
              if (match.listContext.folderId) {
                (fullTask as any).folder = {
                  id: match.listContext.folderId,
                  name: match.listContext.folderName
                };
              }
              
              (fullTask as any).space = {
                id: match.listContext.spaceId,
                name: match.listContext.spaceName
              };
            }
            
            return fullTask;
          }
        }
        
        // For multiple matches or when we need details, fetch full task info
        const fullMatches: ClickUpTask[] = [];
        const matchScoreMap = new Map<string, number>(); // To preserve match scores
        
        try {
          // Process in sequence for better reliability
          for (const match of initialMatches) {
            const fullTask = await this.core.getTask(match.id);
            matchScoreMap.set(fullTask.id, match.matchScore);
            
            if (includeListContext) {
              // Enhance task with context information
              (fullTask as any).list = {
                ...fullTask.list,
                name: match.listContext.listName
              };
              
              if (match.listContext.folderId) {
                (fullTask as any).folder = {
                  id: match.listContext.folderId,
                  name: match.listContext.folderName
                };
              }
              
              (fullTask as any).space = {
                id: match.listContext.spaceId,
                name: match.listContext.spaceName
              };
            }
            
            fullMatches.push(fullTask);
          }
          
          // Sort matches - first by match score, then by update time
          if (fullMatches.length > 1) {
            fullMatches.sort((a, b) => {
              // First sort by match score (highest first)
              const aScore = matchScoreMap.get(a.id) || 0;
              const bScore = matchScoreMap.get(b.id) || 0;
              
              if (aScore !== bScore) {
                return bScore - aScore;
              }
              
              // For equal scores, sort by update time
              const aDate = parseInt(a.date_updated || '0', 10);
              const bDate = parseInt(b.date_updated || '0', 10);
              return bDate - aDate; // Most recent first
            });
          }
        } catch (error) {
          (this.core as any).logOperation('findTasks', {
            error: error.message,
            message: "Failed to get detailed task information"
          });
          
          // If detailed fetch fails, use the summaries with context info
          // This fallback ensures we still return something useful
          if (allowMultipleMatches) {
            return initialMatches.map(match => ({
              ...match.task,
              list: {
                id: match.listContext.listId,
                name: match.listContext.listName
              },
              folder: match.listContext.folderId ? {
                id: match.listContext.folderId,
                name: match.listContext.folderName
              } : undefined,
              space: {
                id: match.listContext.spaceId,
                name: match.listContext.spaceName
              }
            }));
          } else {
            // For single result, return the first match (best match score)
            const match = initialMatches[0];
            return {
              ...match.task,
              list: {
                id: match.listContext.listId,
                name: match.listContext.listName
              },
              folder: match.listContext.folderId ? {
                id: match.listContext.folderId,
                name: match.listContext.folderName
              } : undefined,
              space: {
                id: match.listContext.spaceId,
                name: match.listContext.spaceName
              }
            };
          }
        }
        
        // After finding the task in global search, cache the mapping
        if (initialMatches.length === 1 || useSmartDisambiguation) {
          const bestMatch = fullMatches[0];
          (this.core as any).cacheTaskNameToId(taskName, bestMatch.id, bestMatch.list?.id);
          return bestMatch;
        }
        
        // Return results based on options
        if (fullMatches.length === 1 || useSmartDisambiguation) {
          return fullMatches[0]; // Return best match (sorted by score then update time)
        } else if (allowMultipleMatches) {
          return fullMatches; // Return all matches
        } else {
          // Format error message for multiple matches
          const matchesInfo = fullMatches.map(task => {
            const listName = task.list?.name || "Unknown list";
            const folderName = (task as any).folder?.name;
            const spaceName = (task as any).space?.name || "Unknown space";
            
            const updateTime = task.date_updated 
              ? new Date(parseInt(task.date_updated, 10)).toLocaleString()
              : "Unknown date";
              
            const matchScore = matchScoreMap.get(task.id) || 0;
            const matchQuality = 
              matchScore >= 100 ? "Exact match" :
              matchScore >= 80 ? "Case-insensitive exact match" :
              matchScore >= 70 ? "Text match ignoring emojis" :
              matchScore >= 50 ? "Contains search term" :
              "Partial match";
              
            const location = `list "${listName}"${folderName ? ` (folder: "${folderName}")` : ''} (space: "${spaceName}")`;
            return `- "${task.name}" in ${location} - Updated ${updateTime} - Match quality: ${matchQuality} (${matchScore}/100)`;
          }).join('\n');
          
          throw new Error(`Multiple tasks found with name "${taskName}":\n${matchesInfo}\n\nPlease provide list context to disambiguate, use the exact task name with requireExactMatch=true, or set allowMultipleMatches to true.`);
        }
      }
      
      // No valid lookup parameters provided
      throw new Error("At least one of taskId, customTaskId, or taskName must be provided");
    } catch (error) {
      if (error.message?.includes('Task "') && error.message?.includes('not found')) {
        throw error;
      }
      
      if (error.message?.includes('Multiple tasks found')) {
        throw error;
      }
      
      // Unexpected errors
      throw (this.core as any).handleError(error, `Error finding task: ${error.message}`);
    }
  }

  /**
   * Update a task by name within a specific list
   * @param listId The ID of the list containing the task
   * @param taskName The name of the task to update
   * @param updateData The data to update the task with
   * @returns The updated task
   */
  async updateTaskByName(listId: string, taskName: string, updateData: UpdateTaskData): Promise<ClickUpTask> {
    (this.core as any).logOperation('updateTaskByName', { listId, taskName, ...updateData });

    try {
      const task = await this.findTaskByName(listId, taskName);
      if (!task) {
        throw new Error(`Task "${taskName}" not found in list ${listId}`);
      }

      return await this.core.updateTask(task.id, updateData);
    } catch (error) {
      throw (this.core as any).handleError(error, `Failed to update task by name: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Global task search by name across all lists
   * This is a specialized method that uses getWorkspaceTasks to search all lists at once
   * which is more efficient than searching list by list
   * 
   * @param taskName The name to search for
   * @returns The best matching task or null if no match found
   */
  async findTaskByNameGlobally(taskName: string): Promise<ClickUpTask | null> {
    (this.core as any).logOperation('findTaskByNameGlobally', { taskName });
    
    // Use a static cache for task data to avoid redundant API calls
    // This dramatically reduces API usage across multiple task lookups
    if (!this.constructor.hasOwnProperty('_taskCache')) {
      Object.defineProperty(this.constructor, '_taskCache', {
        value: {
          tasks: [],
          lastFetch: 0,
          cacheTTL: 60000, // 1 minute cache TTL
        },
        writable: true
      });
    }
    
    const cache = (this.constructor as any)._taskCache;
    const now = Date.now();
    
    try {
      // Use cached tasks if available and not expired
      let tasks: ClickUpTask[] = [];
      if (cache.tasks.length > 0 && (now - cache.lastFetch) < cache.cacheTTL) {
        (this.core as any).logOperation('findTaskByNameGlobally', {
          usedCache: true,
          cacheAge: now - cache.lastFetch,
          taskCount: cache.tasks.length
        });
        tasks = cache.tasks;
      } else {
        // Get tasks using a single efficient workspace-wide API call
        const response = await this.getWorkspaceTasks({
          include_closed: true,
          detail_level: 'detailed'
        });

        tasks = 'tasks' in response ? response.tasks : [];

        // Update cache
        cache.tasks = tasks;
        cache.lastFetch = now;

        (this.core as any).logOperation('findTaskByNameGlobally', {
          usedCache: false,
          fetchedTaskCount: tasks.length
        });
      }

      // Map tasks to include match scores and updated time for sorting
      const taskMatches = tasks.map(task => {
        const matchResult = isNameMatch(task.name, taskName);
        return {
          task,
          matchResult,
          updatedAt: task.date_updated ? parseInt(task.date_updated, 10) : 0
        };
      }).filter(result => result.matchResult.isMatch);

      (this.core as any).logOperation('findTaskByNameGlobally', {
        taskCount: tasks.length,
        matchCount: taskMatches.length,
        taskName
      });
      
      if (taskMatches.length === 0) {
        return null;
      }
      
      // First try exact matches
      const exactMatches = taskMatches
        .filter(result => result.matchResult.exactMatch)
        .sort((a, b) => {
          // For exact matches with the same score, sort by most recently updated
          if (b.matchResult.score === a.matchResult.score) {
            return b.updatedAt - a.updatedAt;
          }
          return b.matchResult.score - a.matchResult.score;
        });
      
      // Get the best matches based on whether we have exact matches or need to fall back to fuzzy matches
      const bestMatches = exactMatches.length > 0 ? exactMatches : taskMatches.sort((a, b) => {
        // First sort by match score (highest first)
        if (b.matchResult.score !== a.matchResult.score) {
          return b.matchResult.score - a.matchResult.score;
        }
        // Then sort by most recently updated
        return b.updatedAt - a.updatedAt;
      });
      
      // Log the top matches for debugging
      const topMatches = bestMatches.slice(0, 3).map(match => ({
        taskName: match.task.name,
        score: match.matchResult.score,
        reason: match.matchResult.reason,
        updatedAt: match.updatedAt,
        list: match.task.list?.name || 'Unknown list'
      }));
      
      (this.core as any).logOperation('findTaskByNameGlobally', { topMatches });

      // Return the best match
      return bestMatches[0].task;
    } catch (error) {
      (this.core as any).logOperation('findTaskByNameGlobally', { error: error.message });

      // If there's an error (like rate limit), try to use cached data even if expired
      if (cache.tasks.length > 0) {
        (this.core as any).logOperation('findTaskByNameGlobally', {
          message: 'Using expired cache due to API error',
          cacheAge: now - cache.lastFetch
        });
        
        // Perform the same matching logic with cached data
        const taskMatches = cache.tasks
          .map(task => {
            const matchResult = isNameMatch(task.name, taskName);
            return {
              task,
              matchResult,
              updatedAt: task.date_updated ? parseInt(task.date_updated, 10) : 0
            };
          })
          .filter(result => result.matchResult.isMatch)
          .sort((a, b) => {
            if (b.matchResult.score !== a.matchResult.score) {
              return b.matchResult.score - a.matchResult.score;
            }
            return b.updatedAt - a.updatedAt;
          });
          
        if (taskMatches.length > 0) {
          return taskMatches[0].task;
        }
      }
      
      return null;
    }
  }
}

