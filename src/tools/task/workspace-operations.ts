/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Workspace Task Operations
 * 
 * This module defines tools for workspace-wide task operations, including
 * filtering tasks across the entire workspace with tag-based filtering.
 */

import { TaskFilters } from '../../services/clickup/types.js';

/**
 * Tool definition for getting workspace tasks
 */
export const getWorkspaceTasksTool = {
  name: "get_workspace_tasks",
  description: `Purpose: Retrieve tasks from across the entire workspace with powerful filtering options, including tag-based filtering.

Valid Usage:
1. Apply any combination of filters (tags, lists, folders, spaces, statuses, etc.)
2. Use pagination to manage large result sets
3. Include subtasks by setting subtasks=true

Requirements:
- At least one filter parameter is REQUIRED (tags, list_ids, folder_ids, space_ids, statuses, assignees, or date filters)
- Pagination parameters (page, order_by, reverse) alone are not considered filters

Notes:
- Provides workspace-wide task access (unlike get_tasks which only searches in one list)
- Returns complete task details including descriptions, assignees, custom fields, and all metadata
- Tag filtering is especially useful for cross-list organization (e.g., "project-x", "blocker", "needs-review")
- Combine multiple filters to narrow down your search scope
- Use pagination for large result sets
- Set subtasks=true to include subtask details in the response
  IMPORTANT: subtasks=true enables subtasks to appear in results, but subtasks must still match your other filter criteria (tags, lists, etc.) to be returned. To see all subtasks of a specific task regardless of filters, use the get_task tool with subtasks=true instead.
- Use the detail_level parameter to control the amount of data returned:
  - "summary": Returns lightweight task data (name, status, list, tags)
  - "detailed": Returns complete task data with all fields (DEFAULT if not specified)
- Responses exceeding 50,000 tokens automatically switch to summary format to avoid hitting LLM token limits
- **Enhanced List Filtering**: When list_ids are provided, the tool leverages ClickUp's Views API to include tasks that are *associated with* the specified lists, including tasks that have been added to multiple lists. This provides comprehensive coverage of all tasks related to your specified lists, not just tasks that were originally created in those lists.
`,
  parameters: {
    type: 'object' as const,
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by tag names. Only tasks with ALL specified tags will be returned.'
      },
      list_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by list IDs. Narrows the search to specific lists.'
      },
      folder_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by folder IDs. Narrows the search to specific folders.'
      },
      space_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by space IDs. Narrows the search to specific spaces.'
      },
      statuses: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by status names (e.g., [\'To Do\', \'In Progress\']).'
      },
      assignees: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by assignee IDs.'
      },
      date_created_gt: {
        type: 'number',
        description: 'Filter for tasks created after this timestamp.'
      },
      date_created_lt: {
        type: 'number',
        description: 'Filter for tasks created before this timestamp.'
      },
      date_updated_gt: {
        type: 'number',
        description: 'Filter for tasks updated after this timestamp.'
      },
      date_updated_lt: {
        type: 'number',
        description: 'Filter for tasks updated before this timestamp.'
      },
      due_date_gt: {
        type: 'number',
        description: 'Filter for tasks with due date greater than this timestamp.'
      },
      due_date_lt: {
        type: 'number',
        description: 'Filter for tasks with due date less than this timestamp.'
      },
      include_closed: {
        type: 'boolean',
        description: 'Include closed tasks in the results.'
      },
      include_archived_lists: {
        type: 'boolean',
        description: 'Include tasks from archived lists.'
      },
      include_closed_lists: {
        type: 'boolean',
        description: 'Include tasks from closed lists.'
      },
      archived: {
        type: 'boolean',
        description: 'Include archived tasks in the results.'
      },
      order_by: {
        type: 'string',
        enum: ['id', 'created', 'updated', 'due_date'],
        description: 'Sort field for ordering results.'
      },
      reverse: {
        type: 'boolean',
        description: 'Reverse sort order (descending).'
      },
      page: {
        type: 'number',
        description: 'Page number for pagination (0-based).'
      },
      detail_level: {
        type: 'string',
        enum: ['summary', 'detailed'],
        description: 'Level of detail to return. Use summary for lightweight responses or detailed for full task data. If not specified, defaults to "detailed".'
      },
      subtasks: {
        type: 'boolean',
        description: 'Include subtasks in the response. Set to true to retrieve subtask details for all returned tasks. Note: subtasks must still match your other filter criteria to appear in results.'
      },
      include_subtasks: {
        type: 'boolean',
        description: 'Alternative parameter for including subtasks (legacy support).'
      },
      include_compact_time_entries: {
        type: 'boolean',
        description: 'Include compact time entry data in the response.'
      },
      custom_fields: {
        type: 'object' as const,
        description: 'Filter by custom field values. Provide as key-value pairs where keys are custom field IDs.'
      }
    }
  },
  inputSchema: {
    type: 'object' as const,
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by tag names. Only tasks with ALL specified tags will be returned.'
      },
      list_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by list IDs. Narrows the search to specific lists.'
      },
      folder_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by folder IDs. Narrows the search to specific folders.'
      },
      space_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by space IDs. Narrows the search to specific spaces.'
      },
      statuses: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by status names (e.g., [\'To Do\', \'In Progress\']).'
      },
      assignees: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by assignee IDs.'
      },
      date_created_gt: {
        type: 'number',
        description: 'Filter for tasks created after this timestamp.'
      },
      date_created_lt: {
        type: 'number',
        description: 'Filter for tasks created before this timestamp.'
      },
      date_updated_gt: {
        type: 'number',
        description: 'Filter for tasks updated after this timestamp.'
      },
      date_updated_lt: {
        type: 'number',
        description: 'Filter for tasks updated before this timestamp.'
      },
      due_date_gt: {
        type: 'number',
        description: 'Filter for tasks with due date greater than this timestamp.'
      },
      due_date_lt: {
        type: 'number',
        description: 'Filter for tasks with due date less than this timestamp.'
      },
      include_closed: {
        type: 'boolean',
        description: 'Include closed tasks in the results.'
      },
      include_archived_lists: {
        type: 'boolean',
        description: 'Include tasks from archived lists.'
      },
      include_closed_lists: {
        type: 'boolean',
        description: 'Include tasks from closed lists.'
      },
      archived: {
        type: 'boolean',
        description: 'Include archived tasks in the results.'
      },
      order_by: {
        type: 'string',
        enum: ['id', 'created', 'updated', 'due_date'],
        description: 'Sort field for ordering results.'
      },
      reverse: {
        type: 'boolean',
        description: 'Reverse sort order (descending).'
      },
      page: {
        type: 'number',
        description: 'Page number for pagination (0-based).'
      },
      detail_level: {
        type: 'string',
        enum: ['summary', 'detailed'],
        description: 'Level of detail to return. Use summary for lightweight responses or detailed for full task data. If not specified, defaults to "detailed".'
      },
      subtasks: {
        type: 'boolean',
        description: 'Include subtasks in the response. Set to true to retrieve subtask details for all returned tasks. Note: subtasks must still match your other filter criteria to appear in results.'
      },
      include_subtasks: {
        type: 'boolean',
        description: 'Alternative parameter for including subtasks (legacy support).'
      },
      include_compact_time_entries: {
        type: 'boolean',
        description: 'Include compact time entry data in the response.'
      },
      custom_fields: {
        type: 'object' as const,
        description: 'Filter by custom field values. Provide as key-value pairs where keys are custom field IDs.'
      }
    }
  }
};