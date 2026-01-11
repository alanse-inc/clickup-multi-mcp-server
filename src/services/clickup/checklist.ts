/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Checklist Service
 *
 * Handles checklist operations for ClickUp tasks:
 * - Create, edit, delete checklists
 * - Create, edit, delete checklist items
 */

import { BaseClickUpService } from './base.js';

/**
 * Checklist item interface
 */
export interface ChecklistItem {
  id: string;
  name: string;
  orderindex: number;
  assignee: {
    id: number;
    username: string;
    email: string;
    color: string;
    initials: string;
    profilePicture: string | null;
  } | null;
  group_assignee: any | null;
  resolved: boolean;
  parent: string | null;
  date_created: string;
  children: ChecklistItem[];
}

/**
 * Checklist interface
 */
export interface Checklist {
  id: string;
  task_id: string;
  name: string;
  date_created: string;
  orderindex: number;
  creator: number;
  resolved: number;
  unresolved: number;
  items: ChecklistItem[];
}

/**
 * Create checklist data
 */
export interface CreateChecklistData {
  name: string;
}

/**
 * Edit checklist data
 */
export interface EditChecklistData {
  name?: string;
  position?: number;
}

/**
 * Create checklist item data
 */
export interface CreateChecklistItemData {
  name: string;
  assignee?: number;
}

/**
 * Edit checklist item data
 */
export interface EditChecklistItemData {
  name?: string;
  assignee?: number | null;
  resolved?: boolean;
  parent?: string | null;
}

/**
 * Response type for checklist operations
 */
interface ChecklistResponse {
  checklist: Checklist;
}

/**
 * ClickUp Checklist Service
 */
export class ChecklistService extends BaseClickUpService {
  /**
   * Create a new checklist on a task
   *
   * @param taskId - The task ID to add checklist to
   * @param data - Checklist data (name)
   * @returns The created checklist
   */
  async createChecklist(taskId: string, data: CreateChecklistData): Promise<Checklist> {
    return this.makeRequest(async () => {
      this.logOperation('createChecklist', { taskId, data });

      const response = await this.client.post<ChecklistResponse>(
        `/task/${taskId}/checklist`,
        data
      );

      this.logger.info(`Created checklist: ${response.data.checklist.name}`);
      return response.data.checklist;
    });
  }

  /**
   * Edit a checklist (rename or reorder)
   *
   * @param checklistId - The checklist ID to edit
   * @param data - Edit data (name and/or position)
   * @returns The updated checklist
   */
  async editChecklist(checklistId: string, data: EditChecklistData): Promise<Checklist> {
    return this.makeRequest(async () => {
      this.logOperation('editChecklist', { checklistId, data });

      const response = await this.client.put<ChecklistResponse>(
        `/checklist/${checklistId}`,
        data
      );

      this.logger.info(`Updated checklist: ${response.data.checklist.name}`);
      return response.data.checklist;
    });
  }

  /**
   * Delete a checklist from a task
   *
   * @param checklistId - The checklist ID to delete
   */
  async deleteChecklist(checklistId: string): Promise<void> {
    return this.makeRequest(async () => {
      this.logOperation('deleteChecklist', { checklistId });

      await this.client.delete(`/checklist/${checklistId}`);

      this.logger.info(`Deleted checklist: ${checklistId}`);
    });
  }

  /**
   * Create a new item in a checklist
   *
   * @param checklistId - The checklist ID to add item to
   * @param data - Item data (name, optional assignee)
   * @returns The updated checklist
   */
  async createChecklistItem(checklistId: string, data: CreateChecklistItemData): Promise<Checklist> {
    return this.makeRequest(async () => {
      this.logOperation('createChecklistItem', { checklistId, data });

      const response = await this.client.post<ChecklistResponse>(
        `/checklist/${checklistId}/checklist_item`,
        data
      );

      this.logger.info(`Created checklist item: ${data.name}`);
      return response.data.checklist;
    });
  }

  /**
   * Edit a checklist item
   *
   * @param checklistId - The checklist ID containing the item
   * @param checklistItemId - The checklist item ID to edit
   * @param data - Edit data (name, assignee, resolved, parent)
   * @returns The updated checklist
   */
  async editChecklistItem(
    checklistId: string,
    checklistItemId: string,
    data: EditChecklistItemData
  ): Promise<Checklist> {
    return this.makeRequest(async () => {
      this.logOperation('editChecklistItem', { checklistId, checklistItemId, data });

      const response = await this.client.put<ChecklistResponse>(
        `/checklist/${checklistId}/checklist_item/${checklistItemId}`,
        data
      );

      this.logger.info(`Updated checklist item: ${checklistItemId}`);
      return response.data.checklist;
    });
  }

  /**
   * Delete a checklist item
   *
   * @param checklistId - The checklist ID containing the item
   * @param checklistItemId - The checklist item ID to delete
   */
  async deleteChecklistItem(checklistId: string, checklistItemId: string): Promise<void> {
    return this.makeRequest(async () => {
      this.logOperation('deleteChecklistItem', { checklistId, checklistItemId });

      await this.client.delete(`/checklist/${checklistId}/checklist_item/${checklistItemId}`);

      this.logger.info(`Deleted checklist item: ${checklistItemId}`);
    });
  }
}
