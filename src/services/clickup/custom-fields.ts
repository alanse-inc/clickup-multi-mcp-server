/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Custom Fields Service
 *
 * Handles custom field operations across all ClickUp hierarchy levels:
 * - Retrieve custom field definitions from list, folder, space, and workspace
 * - Delete (clear) custom field values on tasks
 */

import { BaseClickUpService } from './base.js';

/**
 * Custom field definition as returned by the ClickUp API
 */
export interface ClickUpCustomField {
  id: string;
  name: string;
  /**
   * Field type — common values: 'text', 'number', 'money', 'date', 'dropdown',
   * 'checkbox', 'url', 'email', 'phone', 'labels', 'users', 'rating', 'files',
   * 'auto', 'formula', 'location', 'tasks', 'list_relationship'
   */
  type: string;
  type_config: Record<string, unknown>;
  date_created: string;
  hide_from_guests: boolean;
  value?: unknown;
  required?: boolean;
}

/**
 * API response shape for endpoints that return a list of fields
 */
interface CustomFieldsResponse {
  fields: ClickUpCustomField[];
}

/**
 * ClickUp Custom Fields Service
 *
 * Retrieves custom field definitions from different hierarchy levels and
 * provides the ability to clear field values from individual tasks.
 */
export class CustomFieldsService extends BaseClickUpService {
  /**
   * Get all custom field definitions accessible from a specific list
   *
   * @param listId - The list ID
   * @returns Array of custom field definitions
   */
  async getListFields(listId: string): Promise<ClickUpCustomField[]> {
    return this.makeRequest(async () => {
      this.logOperation('getListFields', { listId });

      const response = await this.client.get<CustomFieldsResponse>(
        `/list/${listId}/field`
      );

      this.logger.info(`Retrieved ${response.data.fields.length} fields for list: ${listId}`);
      return response.data.fields;
    });
  }

  /**
   * Get all custom field definitions accessible from a specific folder
   *
   * @param folderId - The folder ID
   * @returns Array of custom field definitions
   */
  async getFolderFields(folderId: string): Promise<ClickUpCustomField[]> {
    return this.makeRequest(async () => {
      this.logOperation('getFolderFields', { folderId });

      const response = await this.client.get<CustomFieldsResponse>(
        `/folder/${folderId}/field`
      );

      this.logger.info(`Retrieved ${response.data.fields.length} fields for folder: ${folderId}`);
      return response.data.fields;
    });
  }

  /**
   * Get all custom field definitions accessible from a specific space
   *
   * @param spaceId - The space ID
   * @returns Array of custom field definitions
   */
  async getSpaceFields(spaceId: string): Promise<ClickUpCustomField[]> {
    return this.makeRequest(async () => {
      this.logOperation('getSpaceFields', { spaceId });

      const response = await this.client.get<CustomFieldsResponse>(
        `/space/${spaceId}/field`
      );

      this.logger.info(`Retrieved ${response.data.fields.length} fields for space: ${spaceId}`);
      return response.data.fields;
    });
  }

  /**
   * Get all custom field definitions available across the entire workspace (team)
   *
   * @returns Array of custom field definitions
   */
  async getWorkspaceFields(): Promise<ClickUpCustomField[]> {
    return this.makeRequest(async () => {
      this.logOperation('getWorkspaceFields', { teamId: this.teamId });

      const response = await this.client.get<CustomFieldsResponse>(
        `/team/${this.teamId}/field`
      );

      this.logger.info(`Retrieved ${response.data.fields.length} fields for workspace: ${this.teamId}`);
      return response.data.fields;
    });
  }

  /**
   * Delete (clear) the value of a custom field on a specific task
   *
   * @param taskId - The task ID
   * @param fieldId - The custom field ID (UUID)
   */
  async deleteCustomFieldValue(taskId: string, fieldId: string): Promise<void> {
    return this.makeRequest(async () => {
      this.logOperation('deleteCustomFieldValue', { taskId, fieldId });

      await this.client.delete(`/task/${taskId}/field/${fieldId}`);

      this.logger.info(`Cleared custom field ${fieldId} on task: ${taskId}`);
    });
  }
}
