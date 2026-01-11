/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Bulk Service
 * 
 * Enhanced implementation for bulk operations that leverages the existing single-operation methods.
 * This approach reduces code duplication while offering powerful concurrency management.
 */
import { Logger } from '../../logger.js';
import { TaskService } from './task/index.js';
import { ClickUpTask, CreateTaskData, UpdateTaskData } from './types.js';
import { BatchProcessingOptions, BatchResult, processBatch } from '../../utils/concurrency-utils.js';
import { ClickUpServiceError, ErrorCode } from './base.js';
import { clickUpServices } from '../shared.js';
import { findListIDByName } from '../../tools/list.js';

// Create logger instance
const logger = new Logger('BulkService');

/**
 * Service for performing bulk operations in ClickUp
 */
export class BulkService {
  private taskService: TaskService;

  /**
   * Create a new bulk service
   * @param taskService ClickUp Task Service instance
   */
  constructor(taskService: TaskService) {
    this.taskService = taskService;
    logger.info('BulkService initialized');
  }

  /**
   * Create multiple tasks in a list efficiently
   * 
   * @param listId ID of the list to create tasks in
   * @param tasks Array of task data
   * @param options Batch processing options
   * @returns Results containing successful and failed tasks
   */
  async createTasks(
    listId: string,
    tasks: CreateTaskData[],
    options?: BatchProcessingOptions
  ): Promise<BatchResult<ClickUpTask>> {
    logger.info(`Creating ${tasks.length} tasks in list ${listId}`, {
      batchSize: options?.batchSize,
      concurrency: options?.concurrency
    });

    try {
      // First validate that the list exists - do this once for all tasks
      await this.taskService.validateListExists(listId);

      // Process the tasks in batches
      return await processBatch(
        tasks,
        (task, index) => {
          logger.debug(`Creating task ${index + 1}/${tasks.length}`, {
            taskName: task.name
          });
          
          // Reuse the single-task creation method
          return this.taskService.createTask(listId, task);
        },
        options
      );
    } catch (error) {
      logger.error(`Failed to create tasks in bulk`, {
        listId,
        taskCount: tasks.length,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new ClickUpServiceError(
        `Failed to create tasks in bulk: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof ClickUpServiceError ? error.code : ErrorCode.UNKNOWN,
        { listId, taskCount: tasks.length }
      );
    }
  }

  /**
   * Find task by name within a specific list
   */
  private async findTaskInList(taskName: string, listName: string): Promise<string> {
    try {
      const result = await this.taskService.findTasks({
        taskName,
        listName,
        allowMultipleMatches: false,
        useSmartDisambiguation: true,
        includeFullDetails: false
      });

      if (!result || Array.isArray(result)) {
        throw new ClickUpServiceError(
          `Task "${taskName}" not found in list "${listName}"`,
          ErrorCode.NOT_FOUND
        );
      }

      logger.info(`Task "${taskName}" found with ID: ${result.id}`);
      return result.id;
    } catch (error) {
      // Enhance the error message
      if (error instanceof ClickUpServiceError) {
        throw error;
      }
      throw new ClickUpServiceError(
        `Error finding task "${taskName}" in list "${listName}": ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.UNKNOWN
      );
    }
  }

  /**
   * Resolve task ID using provided identifiers
   */
  private async resolveTaskId(task: { taskId?: string; taskName?: string; listName?: string; customTaskId?: string }): Promise<string> {
    const { taskId, taskName, listName, customTaskId } = task;

    if (taskId) {
      return taskId;
    }

    if (customTaskId) {
      const resolvedTask = await this.taskService.getTaskByCustomId(customTaskId);
      return resolvedTask.id;
    }

    if (taskName && listName) {
      return await this.findTaskInList(taskName, listName);
    }

    throw new ClickUpServiceError(
      'Invalid task identification. Provide either taskId, customTaskId, or both taskName and listName',
      ErrorCode.INVALID_PARAMETER
    );
  }

  /**
   * Update multiple tasks
   * @param tasks Array of tasks to update with their new data
   * @param options Optional batch processing settings
   * @returns Array of updated tasks
   */
  async updateTasks(
    tasks: (UpdateTaskData & { taskId?: string; taskName?: string; listName?: string; customTaskId?: string })[],
    options?: BatchProcessingOptions
  ): Promise<BatchResult<ClickUpTask>> {
    logger.info('Starting bulk update operation', { taskCount: tasks.length });
    
    try {
      return await processBatch(
        tasks,
        async (task) => {
          const { taskId, taskName, listName, customTaskId, ...updateData } = task;
          const resolvedTaskId = await this.resolveTaskId({ taskId, taskName, listName, customTaskId });
          return await this.taskService.updateTask(resolvedTaskId, updateData);
        },
        options
      );
    } catch (error) {
      logger.error('Bulk update operation failed', error);
      throw error;
    }
  }

  /**
   * Move multiple tasks to a different list
   * @param tasks Array of tasks to move (each with taskId or taskName + listName)
   * @param targetListId ID of the destination list or list name
   * @param options Optional batch processing settings
   * @returns Array of moved tasks
   */
  async moveTasks(
    tasks: { taskId?: string; taskName?: string; listName?: string; customTaskId?: string }[],
    targetListId: string,
    options?: BatchProcessingOptions
  ): Promise<BatchResult<ClickUpTask>> {
    logger.info('Starting bulk move operation', { taskCount: tasks.length, targetListId });
    
    try {
      // Determine if targetListId is actually an ID or a name
      let resolvedTargetListId = targetListId;
      
      // If the targetListId doesn't match the pattern of a list ID (usually just numbers),
      // assume it's a list name and try to resolve it
      if (!/^\d+$/.test(targetListId)) {
        logger.info(`Target list appears to be a name: "${targetListId}", attempting to resolve`);
        const listInfo = await findListIDByName(clickUpServices.workspace, targetListId);
        if (!listInfo) {
          throw new ClickUpServiceError(
            `Target list "${targetListId}" not found`,
            ErrorCode.NOT_FOUND
          );
        }
        resolvedTargetListId = listInfo.id;
        logger.info(`Resolved target list to ID: ${resolvedTargetListId}`);
      }

      // Validate the destination list exists
      await this.taskService.validateListExists(resolvedTargetListId);

      return await processBatch(
        tasks,
        async (task) => {
          const resolvedTaskId = await this.resolveTaskId(task);
          return await this.taskService.moveTask(resolvedTaskId, resolvedTargetListId);
        },
        options
      );
    } catch (error) {
      logger.error('Bulk move operation failed', error);
      throw error;
    }
  }

  /**
   * Delete multiple tasks
   * @param tasks Array of tasks to delete (each with taskId or taskName + listName)
   * @param options Batch processing options
   * @returns Results containing successful and failed deletions
   */
  async deleteTasks(
    tasks: { taskId?: string; taskName?: string; listName?: string; customTaskId?: string }[],
    options?: BatchProcessingOptions
  ): Promise<BatchResult<void>> {
    logger.info('Starting bulk delete operation', { taskCount: tasks.length });
    
    try {
      return await processBatch(
        tasks,
        async (task) => {
          const resolvedTaskId = await this.resolveTaskId(task);
          await this.taskService.deleteTask(resolvedTaskId);
        },
        options
      );
    } catch (error) {
      logger.error('Bulk delete operation failed', error);
      throw error;
    }
  }
}