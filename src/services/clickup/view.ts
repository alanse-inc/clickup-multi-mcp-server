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

import { BaseClickUpService, ErrorCode, ClickUpServiceError, ServiceResponse } from './base.js';
import {
  ClickUpView,
  ClickUpListViewsResponse,
  ClickUpViewTasksResponse,
  CreateViewData,
  UpdateViewData
} from './types.js';

export class ViewService extends BaseClickUpService {
  constructor(apiKey: string, teamId: string, baseUrl?: string) {
    super(apiKey, teamId, baseUrl);
  }

  /**
   * Helper method to handle errors consistently
   * @param error The error that occurred
   * @param message Optional custom error message
   * @returns A ClickUpServiceError
   */
  private handleError(error: any, message?: string): ClickUpServiceError {
    if (error instanceof ClickUpServiceError) {
      return error;
    }

    return new ClickUpServiceError(
      message || `View service error: ${error.message}`,
      ErrorCode.UNKNOWN,
      error
    );
  }

  // ============================================================================
  // Workspace (Everything level) Views
  // ============================================================================

  /**
   * Get all views at the workspace (team/everything) level
   * @param teamId The ID of the workspace/team
   * @returns List of views
   */
  async getWorkspaceViews(teamId: string): Promise<ClickUpListViewsResponse> {
    this.logOperation('getWorkspaceViews', { teamId });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpListViewsResponse>(
          `/team/${teamId}/view`
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get workspace views for team ${teamId}`);
    }
  }

  /**
   * Create a new view at the workspace (team/everything) level
   * @param teamId The ID of the workspace/team
   * @param viewData The data for the new view
   * @returns The created view
   */
  async createWorkspaceView(teamId: string, viewData: CreateViewData): Promise<ClickUpView> {
    this.logOperation('createWorkspaceView', { teamId, ...viewData });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.post<ClickUpView>(
          `/team/${teamId}/view`,
          viewData
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to create workspace view in team ${teamId}`);
    }
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
    this.logOperation('getSpaceViews', { spaceId });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpListViewsResponse>(
          `/space/${spaceId}/view`
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get space views for space ${spaceId}`);
    }
  }

  /**
   * Create a new view in a space
   * @param spaceId The ID of the space
   * @param viewData The data for the new view
   * @returns The created view
   */
  async createSpaceView(spaceId: string, viewData: CreateViewData): Promise<ClickUpView> {
    this.logOperation('createSpaceView', { spaceId, ...viewData });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.post<ClickUpView>(
          `/space/${spaceId}/view`,
          viewData
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to create space view in space ${spaceId}`);
    }
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
    this.logOperation('getFolderViews', { folderId });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpListViewsResponse>(
          `/folder/${folderId}/view`
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get folder views for folder ${folderId}`);
    }
  }

  /**
   * Create a new view in a folder
   * @param folderId The ID of the folder
   * @param viewData The data for the new view
   * @returns The created view
   */
  async createFolderView(folderId: string, viewData: CreateViewData): Promise<ClickUpView> {
    this.logOperation('createFolderView', { folderId, ...viewData });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.post<ClickUpView>(
          `/folder/${folderId}/view`,
          viewData
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to create folder view in folder ${folderId}`);
    }
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
    this.logOperation('getListViews', { listId });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpListViewsResponse>(
          `/list/${listId}/view`
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get list views for list ${listId}`);
    }
  }

  /**
   * Create a new view in a list
   * @param listId The ID of the list
   * @param viewData The data for the new view
   * @returns The created view
   */
  async createListView(listId: string, viewData: CreateViewData): Promise<ClickUpView> {
    this.logOperation('createListView', { listId, ...viewData });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.post<ClickUpView>(
          `/list/${listId}/view`,
          viewData
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to create list view in list ${listId}`);
    }
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
    this.logOperation('getView', { viewId });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpView>(`/view/${viewId}`);
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get view ${viewId}`);
    }
  }

  /**
   * Update an existing view
   * @param viewId The ID of the view to update
   * @param updateData The data to update on the view
   * @returns The updated view
   */
  async updateView(viewId: string, updateData: UpdateViewData): Promise<ClickUpView> {
    this.logOperation('updateView', { viewId, ...updateData });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.put<ClickUpView>(
          `/view/${viewId}`,
          updateData
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to update view ${viewId}`);
    }
  }

  /**
   * Delete a view
   * @param viewId The ID of the view to delete
   * @returns Success indicator
   */
  async deleteView(viewId: string): Promise<ServiceResponse<void>> {
    this.logOperation('deleteView', { viewId });

    try {
      await this.makeRequest(async () => {
        await this.client.delete(`/view/${viewId}`);
      });

      return {
        success: true
      };
    } catch (error) {
      throw this.handleError(error, `Failed to delete view ${viewId}`);
    }
  }

  /**
   * Get tasks within a specific view
   * @param viewId The ID of the view
   * @param page Optional page number for pagination
   * @returns Tasks in the view
   */
  async getViewTasks(viewId: string, page?: number): Promise<ClickUpViewTasksResponse> {
    this.logOperation('getViewTasks', { viewId, page });

    try {
      return await this.makeRequest(async () => {
        const params: any = {};
        if (page !== undefined) {
          params.page = page;
        }

        const response = await this.client.get<ClickUpViewTasksResponse>(
          `/view/${viewId}/task`,
          { params }
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get tasks for view ${viewId}`);
    }
  }
}
