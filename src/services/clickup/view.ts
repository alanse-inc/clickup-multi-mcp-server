/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp View Service
 *
 * Handles all operations related to views in ClickUp, including:
 * - Creating views (Workspace, Space, Folder, List levels)
 * - Retrieving views
 * - Updating views
 * - Deleting views
 * - Getting tasks within a view
 */

import { BaseClickUpService } from './base.js';
import {
  ClickUpView,
  ClickUpListViewsResponse,
  ClickUpViewTasksResponse,
  CreateViewData,
  UpdateViewData
} from './types.js';

export class ViewService extends BaseClickUpService {
  // ============================================================================
  // Workspace (Everything level) Views
  // ============================================================================

  /**
   * Get all views at the workspace (team/everything) level
   * @returns List of views
   */
  async getWorkspaceViews(): Promise<ClickUpListViewsResponse> {
    return this.makeRequest(async () => {
      this.logOperation('getWorkspaceViews', { teamId: this.teamId });

      const response = await this.client.get<ClickUpListViewsResponse>(
        `/team/${this.teamId}/view`
      );

      this.logger.info(`Retrieved workspace views for team: ${this.teamId}`);
      return response.data;
    });
  }

  /**
   * Create a new view at the workspace (team/everything) level
   * @param viewData The data for the new view
   * @returns The created view
   */
  async createWorkspaceView(viewData: CreateViewData): Promise<ClickUpView> {
    return this.makeRequest(async () => {
      this.logOperation('createWorkspaceView', { teamId: this.teamId, ...viewData });

      const response = await this.client.post<ClickUpView>(
        `/team/${this.teamId}/view`,
        viewData
      );

      this.logger.info(`Created workspace view: ${response.data.name} (${response.data.id})`);
      return response.data;
    });
  }

  // ============================================================================
  // Space Views
  // ============================================================================

  /**
   * Get all views for a space
   * @param spaceId The ID of the space
   * @returns List of views
   */
  async getSpaceViews(spaceId: string): Promise<ClickUpListViewsResponse> {
    return this.makeRequest(async () => {
      this.logOperation('getSpaceViews', { spaceId });

      const response = await this.client.get<ClickUpListViewsResponse>(
        `/space/${spaceId}/view`
      );

      this.logger.info(`Retrieved views for space: ${spaceId}`);
      return response.data;
    });
  }

  /**
   * Create a new view in a space
   * @param spaceId The ID of the space
   * @param viewData The data for the new view
   * @returns The created view
   */
  async createSpaceView(spaceId: string, viewData: CreateViewData): Promise<ClickUpView> {
    return this.makeRequest(async () => {
      this.logOperation('createSpaceView', { spaceId, ...viewData });

      const response = await this.client.post<ClickUpView>(
        `/space/${spaceId}/view`,
        viewData
      );

      this.logger.info(`Created space view: ${response.data.name} (${response.data.id})`);
      return response.data;
    });
  }

  // ============================================================================
  // Folder Views
  // ============================================================================

  /**
   * Get all views for a folder
   * @param folderId The ID of the folder
   * @returns List of views
   */
  async getFolderViews(folderId: string): Promise<ClickUpListViewsResponse> {
    return this.makeRequest(async () => {
      this.logOperation('getFolderViews', { folderId });

      const response = await this.client.get<ClickUpListViewsResponse>(
        `/folder/${folderId}/view`
      );

      this.logger.info(`Retrieved views for folder: ${folderId}`);
      return response.data;
    });
  }

  /**
   * Create a new view in a folder
   * @param folderId The ID of the folder
   * @param viewData The data for the new view
   * @returns The created view
   */
  async createFolderView(folderId: string, viewData: CreateViewData): Promise<ClickUpView> {
    return this.makeRequest(async () => {
      this.logOperation('createFolderView', { folderId, ...viewData });

      const response = await this.client.post<ClickUpView>(
        `/folder/${folderId}/view`,
        viewData
      );

      this.logger.info(`Created folder view: ${response.data.name} (${response.data.id})`);
      return response.data;
    });
  }

  // ============================================================================
  // List Views
  // ============================================================================

  /**
   * Get all views for a list
   * @param listId The ID of the list
   * @returns List of views
   */
  async getListViews(listId: string): Promise<ClickUpListViewsResponse> {
    return this.makeRequest(async () => {
      this.logOperation('getListViews', { listId });

      const response = await this.client.get<ClickUpListViewsResponse>(
        `/list/${listId}/view`
      );

      this.logger.info(`Retrieved views for list: ${listId}`);
      return response.data;
    });
  }

  /**
   * Create a new view in a list
   * @param listId The ID of the list
   * @param viewData The data for the new view
   * @returns The created view
   */
  async createListView(listId: string, viewData: CreateViewData): Promise<ClickUpView> {
    return this.makeRequest(async () => {
      this.logOperation('createListView', { listId, ...viewData });

      const response = await this.client.post<ClickUpView>(
        `/list/${listId}/view`,
        viewData
      );

      this.logger.info(`Created list view: ${response.data.name} (${response.data.id})`);
      return response.data;
    });
  }

  // ============================================================================
  // View Management
  // ============================================================================

  /**
   * Get a specific view by ID
   * @param viewId The ID of the view to retrieve
   * @returns The requested view
   */
  async getView(viewId: string): Promise<ClickUpView> {
    return this.makeRequest(async () => {
      this.logOperation('getView', { viewId });

      const response = await this.client.get<ClickUpView>(`/view/${viewId}`);

      this.logger.info(`Retrieved view: ${response.data.name} (${viewId})`);
      return response.data;
    });
  }

  /**
   * Update an existing view
   * @param viewId The ID of the view to update
   * @param updateData The data to update on the view
   * @returns The updated view
   */
  async updateView(viewId: string, updateData: UpdateViewData): Promise<ClickUpView> {
    return this.makeRequest(async () => {
      this.logOperation('updateView', { viewId, ...updateData });

      const response = await this.client.put<ClickUpView>(
        `/view/${viewId}`,
        updateData
      );

      this.logger.info(`Updated view: ${response.data.name} (${viewId})`);
      return response.data;
    });
  }

  /**
   * Delete a view
   * @param viewId The ID of the view to delete
   */
  async deleteView(viewId: string): Promise<void> {
    return this.makeRequest(async () => {
      this.logOperation('deleteView', { viewId });

      await this.client.delete(`/view/${viewId}`);

      this.logger.info(`Deleted view: ${viewId}`);
    });
  }

  /**
   * Get tasks within a specific view
   * @param viewId The ID of the view
   * @param page Optional page number for pagination
   * @returns Tasks in the view
   */
  async getViewTasks(viewId: string, page?: number): Promise<ClickUpViewTasksResponse> {
    return this.makeRequest(async () => {
      this.logOperation('getViewTasks', { viewId, page });

      const params: Record<string, number> = {};
      if (page !== undefined) {
        params['page'] = page;
      }

      const response = await this.client.get<ClickUpViewTasksResponse>(
        `/view/${viewId}/task`,
        { params }
      );

      this.logger.info(`Retrieved tasks for view: ${viewId}`);
      return response.data;
    });
  }
}
