/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp List Service
 * 
 * Handles all operations related to lists in ClickUp, including:
 * - Creating lists
 * - Retrieving lists
 * - Updating lists
 * - Deleting lists
 * - Finding lists by name
 */

import { AxiosError } from 'axios';
import { BaseClickUpService, ErrorCode, ClickUpServiceError, ServiceResponse } from './base.js';
import { 
  ClickUpList,
  ClickUpTask,
  CreateListData
} from './types.js';
import { WorkspaceService } from './workspace.js';

export class ListService extends BaseClickUpService {
  private workspaceService: WorkspaceService | null = null;
  
  constructor(apiKey: string, teamId: string, baseUrl?: string, workspaceService?: WorkspaceService) {
    super(apiKey, teamId, baseUrl);
    this.workspaceService = workspaceService || null;
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
      message || `List service error: ${error.message}`,
      ErrorCode.UNKNOWN,
      error
    );
  }

  /**
   * Create a new list in a space
   * @param spaceId The ID of the space to create the list in
   * @param listData The data for the new list
   * @returns The created list
   */
  async createList(spaceId: string, listData: CreateListData): Promise<ClickUpList> {
    this.logOperation('createList', { spaceId, ...listData });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.post<ClickUpList>(
          `/space/${spaceId}/list`,
          listData
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to create list in space ${spaceId}`);
    }
  }

  /**
   * Create a new list in a folder
   * @param folderId The ID of the folder to create the list in
   * @param listData The data for the new list
   * @returns The created list
   */
  async createListInFolder(folderId: string, listData: CreateListData): Promise<ClickUpList> {
    this.logOperation('createListInFolder', { folderId, ...listData });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.post<ClickUpList>(
          `/folder/${folderId}/list`,
          listData
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to create list in folder ${folderId}`);
    }
  }

  /**
   * Get a list by ID
   * @param listId The ID of the list to retrieve
   * @returns The requested list
   */
  async getList(listId: string): Promise<ClickUpList> {
    this.logOperation('getList', { listId });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpList>(`/list/${listId}`);
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get list ${listId}`);
    }
  }

  /**
   * Update an existing list
   * @param listId The ID of the list to update
   * @param updateData The data to update on the list
   * @returns The updated list
   */
  async updateList(listId: string, updateData: Partial<CreateListData>): Promise<ClickUpList> {
    this.logOperation('updateList', { listId, ...updateData });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.put<ClickUpList>(
          `/list/${listId}`,
          updateData
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to update list ${listId}`);
    }
  }

  /**
   * Delete a list
   * @param listId The ID of the list to delete
   * @returns Success indicator
   */
  async deleteList(listId: string): Promise<ServiceResponse<void>> {
    this.logOperation('deleteList', { listId });
    
    try {
      await this.makeRequest(async () => {
        await this.client.delete(`/list/${listId}`);
      });
      
      return {
        success: true
      };
    } catch (error) {
      throw this.handleError(error, `Failed to delete list ${listId}`);
    }
  }

  /**
   * Get all lists in a space
   * @param spaceId The ID of the space to get lists from
   * @returns Array of lists in the space
   */
  async getListsInSpace(spaceId: string): Promise<ClickUpList[]> {
    this.logOperation('getListsInSpace', { spaceId });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<{ lists: ClickUpList[] }>(
          `/space/${spaceId}/list`
        );
        return response.data.lists;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get lists in space ${spaceId}`);
    }
  }

  /**
   * Get all lists in a folder
   * @param folderId The ID of the folder to get lists from
   * @returns Array of lists in the folder
   */
  async getListsInFolder(folderId: string): Promise<ClickUpList[]> {
    this.logOperation('getListsInFolder', { folderId });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<{ lists: ClickUpList[] }>(
          `/folder/${folderId}/list`
        );
        return response.data.lists;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get lists in folder ${folderId}`);
    }
  }

  /**
   * Find a list by its name in a space
   * @param spaceId The ID of the space to search in
   * @param listName The name of the list to find
   * @returns The list if found, otherwise null
   */
  async findListByNameInSpace(spaceId: string, listName: string): Promise<ClickUpList | null> {
    this.logOperation('findListByNameInSpace', { spaceId, listName });
    
    try {
      const lists = await this.getListsInSpace(spaceId);
      const matchingList = lists.find(list => 
        list.name.toLowerCase() === listName.toLowerCase()
      );
      
      return matchingList || null;
    } catch (error) {
      throw this.handleError(error, `Failed to find list by name in space ${spaceId}`);
    }
  }

  /**
   * Find a list by its name in a folder
   * @param folderId The ID of the folder to search in
   * @param listName The name of the list to find
   * @returns The list if found, otherwise null
   */
  async findListByNameInFolder(folderId: string, listName: string): Promise<ClickUpList | null> {
    this.logOperation('findListByNameInFolder', { folderId, listName });
    
    try {
      const lists = await this.getListsInFolder(folderId);
      const matchingList = lists.find(list => 
        list.name.toLowerCase() === listName.toLowerCase()
      );
      
      return matchingList || null;
    } catch (error) {
      throw this.handleError(error, `Failed to find list by name in folder ${folderId}`);
    }
  }
} 