/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Goal Service
 *
 * This module provides functionality for managing Goals and Key Results in ClickUp.
 */

import { BaseClickUpService } from './base.js';
import {
  ClickUpGoal,
  ClickUpKeyResult,
  GoalsResponse,
  GoalResponse,
  CreateGoalData,
  UpdateGoalData,
  CreateKeyResultData,
  UpdateKeyResultData,
  KeyResultResponse
} from './types.js';

/**
 * Service for managing ClickUp Goals and Key Results
 */
export class GoalService extends BaseClickUpService {
  /**
   * Get all goals for the workspace
   * @param includeCompleted - Include completed goals (default: false)
   * @returns Promise resolving to goals response
   */
  async getGoals(includeCompleted: boolean = false): Promise<GoalsResponse> {
    return this.makeRequest(async () => {
      this.logOperation('getGoals', { teamId: this.teamId, includeCompleted });

      const response = await this.client.get<GoalsResponse>(
        `/team/${this.teamId}/goal`,
        {
          params: {
            include_completed: includeCompleted
          }
        }
      );

      this.logger.debug(`Retrieved ${response.data.goals.length} goals`);
      return response.data;
    });
  }

  /**
   * Get a single goal by ID
   * @param goalId - The goal ID
   * @returns Promise resolving to the goal
   */
  async getGoal(goalId: string): Promise<ClickUpGoal> {
    return this.makeRequest(async () => {
      this.logOperation('getGoal', { goalId });

      const response = await this.client.get<GoalResponse>(`/goal/${goalId}`);

      this.logger.debug(`Retrieved goal: ${response.data.goal.name}`);
      return response.data.goal;
    });
  }

  /**
   * Create a new goal
   * @param data - Goal creation data
   * @returns Promise resolving to the created goal
   */
  async createGoal(data: CreateGoalData): Promise<ClickUpGoal> {
    return this.makeRequest(async () => {
      this.logOperation('createGoal', { name: data.name });

      const response = await this.client.post<GoalResponse>(
        `/team/${this.teamId}/goal`,
        data
      );

      this.logger.info(`Created goal: ${response.data.goal.name} (${response.data.goal.id})`);
      return response.data.goal;
    });
  }

  /**
   * Update an existing goal
   * @param goalId - The goal ID
   * @param data - Goal update data
   * @returns Promise resolving to the updated goal
   */
  async updateGoal(goalId: string, data: UpdateGoalData): Promise<ClickUpGoal> {
    return this.makeRequest(async () => {
      this.logOperation('updateGoal', { goalId, updates: data });

      const response = await this.client.put<GoalResponse>(
        `/goal/${goalId}`,
        data
      );

      this.logger.info(`Updated goal: ${response.data.goal.name}`);
      return response.data.goal;
    });
  }

  /**
   * Delete a goal
   * @param goalId - The goal ID
   * @returns Promise resolving when deleted
   */
  async deleteGoal(goalId: string): Promise<void> {
    return this.makeRequest(async () => {
      this.logOperation('deleteGoal', { goalId });

      await this.client.delete(`/goal/${goalId}`);

      this.logger.info(`Deleted goal: ${goalId}`);
    });
  }

  /**
   * Create a key result (target) for a goal
   * @param goalId - The goal ID
   * @param data - Key result creation data
   * @returns Promise resolving to the created key result
   */
  async createKeyResult(goalId: string, data: CreateKeyResultData): Promise<ClickUpKeyResult> {
    return this.makeRequest(async () => {
      this.logOperation('createKeyResult', { goalId, name: data.name });

      const response = await this.client.post<KeyResultResponse>(
        `/goal/${goalId}/key_result`,
        data
      );

      this.logger.info(`Created key result: ${response.data.key_result.name} (${response.data.key_result.id})`);
      return response.data.key_result;
    });
  }

  /**
   * Update a key result
   * @param keyResultId - The key result ID
   * @param data - Key result update data
   * @returns Promise resolving to the updated key result
   */
  async updateKeyResult(keyResultId: string, data: UpdateKeyResultData): Promise<ClickUpKeyResult> {
    return this.makeRequest(async () => {
      this.logOperation('updateKeyResult', { keyResultId, updates: data });

      const response = await this.client.put<KeyResultResponse>(
        `/key_result/${keyResultId}`,
        data
      );

      this.logger.info(`Updated key result: ${response.data.key_result.name}`);
      return response.data.key_result;
    });
  }

  /**
   * Delete a key result
   * @param keyResultId - The key result ID
   * @returns Promise resolving when deleted
   */
  async deleteKeyResult(keyResultId: string): Promise<void> {
    return this.makeRequest(async () => {
      this.logOperation('deleteKeyResult', { keyResultId });

      await this.client.delete(`/key_result/${keyResultId}`);

      this.logger.info(`Deleted key result: ${keyResultId}`);
    });
  }
}
