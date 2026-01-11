/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service - Dependencies Module
 *
 * Handles task dependency and link operations:
 * - Adding/removing dependencies between tasks
 * - Adding/removing links between tasks
 *
 * REFACTORED: Uses composition instead of inheritance.
 * Only depends on TaskServiceCore for base functionality.
 */

import { TaskServiceCore } from './task-core.js';
import { AddDependencyData, TaskDependency, TaskLink } from '../types.js';

/**
 * Dependencies functionality for the TaskService
 *
 * This service handles all dependency and link-related operations for ClickUp tasks.
 * It uses composition to access core functionality instead of inheritance.
 */
export class TaskServiceDependencies {
  constructor(private core: TaskServiceCore) {}

  /**
   * Add a dependency between two tasks
   * @param taskId - The task to add the dependency to
   * @param data - Dependency data (depends_on or dependency_of)
   * @returns - Promise resolving to the created dependency
   */
  async addDependency(taskId: string, data: AddDependencyData): Promise<TaskDependency> {
    (this.core as any).logOperation('addDependency', { taskId, ...data });

    try {
      if (!data.depends_on && !data.dependency_of) {
        throw new Error('Either depends_on or dependency_of is required');
      }

      const response = await (this.core as any).client.post(
        `/task/${taskId}/dependency`,
        data
      );

      return response.data;
    } catch (error: any) {
      throw (this.core as any).handleError(error, 'Failed to add dependency');
    }
  }

  /**
   * Remove a dependency from a task
   * @param taskId - The task to remove the dependency from
   * @param dependsOn - The task ID that this task depends on
   * @param dependencyOf - The task ID that depends on this task
   * @returns - Promise resolving when the dependency is removed
   */
  async deleteDependency(
    taskId: string,
    dependsOn?: string,
    dependencyOf?: string
  ): Promise<void> {
    (this.core as any).logOperation('deleteDependency', { taskId, dependsOn, dependencyOf });

    try {
      if (!dependsOn && !dependencyOf) {
        throw new Error('Either depends_on or dependency_of query parameter is required');
      }

      const params = new URLSearchParams();
      if (dependsOn) {
        params.append('depends_on', dependsOn);
      }
      if (dependencyOf) {
        params.append('dependency_of', dependencyOf);
      }

      await (this.core as any).client.delete(
        `/task/${taskId}/dependency?${params.toString()}`
      );
    } catch (error: any) {
      throw (this.core as any).handleError(error, 'Failed to remove dependency');
    }
  }

  /**
   * Add a link between two tasks
   * @param taskId - The task to link from
   * @param linksTo - The task to link to
   * @returns - Promise resolving to the created link
   */
  async addTaskLink(taskId: string, linksTo: string): Promise<TaskLink> {
    (this.core as any).logOperation('addTaskLink', { taskId, linksTo });

    try {
      const response = await (this.core as any).client.post(
        `/task/${taskId}/link/${linksTo}`
      );

      return response.data;
    } catch (error: any) {
      throw (this.core as any).handleError(error, 'Failed to add task link');
    }
  }

  /**
   * Remove a link between two tasks
   * @param taskId - The task to remove the link from
   * @param linksTo - The linked task to unlink
   * @returns - Promise resolving when the link is removed
   */
  async deleteTaskLink(taskId: string, linksTo: string): Promise<void> {
    (this.core as any).logOperation('deleteTaskLink', { taskId, linksTo });

    try {
      await (this.core as any).client.delete(
        `/task/${taskId}/link/${linksTo}`
      );
    } catch (error: any) {
      throw (this.core as any).handleError(error, 'Failed to remove task link');
    }
  }
}
