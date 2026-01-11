/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service - Custom Fields Module
 *
 * Handles custom fields operations for ClickUp tasks, including:
 * - Setting custom field values
 * - Retrieving custom field values
 *
 * REFACTORED: Now uses composition instead of inheritance.
 * Only depends on TaskServiceCore for getTask() and base functionality.
 */

import { TaskServiceCore } from './task-core.js';
import { ErrorCode } from '../base.js';

/**
 * Interface for custom field value
 */
export interface CustomFieldValue {
  id: string;
  value: any;
}

/**
 * Custom fields functionality for the TaskService
 *
 * This service handles all custom field operations for ClickUp tasks.
 * It uses composition to access core functionality instead of inheritance.
 */
export class TaskServiceCustomFields {
  constructor(private core: TaskServiceCore) {}
  /**
   * Set a single custom field value on a task
   *
   * @param taskId ID of the task
   * @param fieldId ID of the custom field
   * @param value Value to set for the custom field
   * @returns Success response
   */
  async setCustomFieldValue(taskId: string, fieldId: string, value: any): Promise<boolean> {
    (this.core as any).logOperation('setCustomFieldValue', { taskId, fieldId, value });

    try {
      const payload = {
        value
      };

      await (this.core as any).makeRequest(async () => {
        return await (this.core as any).client.post(
          `/task/${taskId}/field/${fieldId}`,
          payload
        );
      });

      return true;
    } catch (error) {
      throw (this.core as any).handleError(error, `Failed to set custom field "${fieldId}" value`);
    }
  }

  /**
   * Set multiple custom field values on a task
   *
   * @param taskId ID of the task
   * @param customFields Array of custom field ID and value pairs
   * @returns Success response
   */
  async setCustomFieldValues(taskId: string, customFields: CustomFieldValue[]): Promise<boolean> {
    (this.core as any).logOperation('setCustomFieldValues', { taskId, customFields });

    try {
      // Execute each update sequentially
      for (const field of customFields) {
        await this.setCustomFieldValue(taskId, field.id, field.value);
      }

      return true;
    } catch (error) {
      throw (this.core as any).handleError(error, 'Failed to set custom field values');
    }
  }

  /**
   * Get all custom field values for a task
   *
   * @param taskId ID of the task
   * @returns Record mapping field IDs to their values
   */
  async getCustomFieldValues(taskId: string): Promise<Record<string, any>> {
    (this.core as any).logOperation('getCustomFieldValues', { taskId });

    try {
      // We need to fetch the full task to get its custom fields
      const task = await this.core.getTask(taskId);
      return task.custom_fields || {};
    } catch (error) {
      throw (this.core as any).handleError(error, 'Failed to get custom field values');
    }
  }

  /**
   * Get a specific custom field value for a task
   * 
   * @param taskId ID of the task
   * @param fieldId ID of the custom field
   * @returns The value of the custom field
   * @throws ClickUpServiceError if the field doesn't exist
   */
  async getCustomFieldValue(taskId: string, fieldId: string): Promise<any> {
    (this.core as any).logOperation('getCustomFieldValue', { taskId, fieldId });

    try {
      const customFields = await this.getCustomFieldValues(taskId);

      if (fieldId in customFields) {
        return customFields[fieldId];
      } else {
        throw (this.core as any).handleError(
          new Error(`Custom field "${fieldId}" not found on task`),
          `Custom field "${fieldId}" not found on task`
        );
      }
    } catch (error) {
      throw (this.core as any).handleError(error, `Failed to get custom field "${fieldId}" value`);
    }
  }
} 