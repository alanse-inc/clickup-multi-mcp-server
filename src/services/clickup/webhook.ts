/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Webhook Service
 *
 * Handles all operations related to webhooks in ClickUp, including:
 * - Listing webhooks for a workspace
 * - Creating webhooks with event subscriptions
 * - Updating webhook configuration and status
 * - Deleting webhooks
 */

import { BaseClickUpService } from './base.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ClickUpWebhook {
  id: string;
  userid: number;
  team_id: number;
  endpoint: string;
  client_id: string;
  events: string[];
  task_id: string | null;
  list_id: string | null;
  folder_id: string | null;
  space_id: string | null;
  health: {
    status: string;
    fail_count: number;
  };
  secret: string;
}

export interface CreateWebhookData {
  endpoint: string;
  events: string[];
  task_id?: string;
  list_id?: string;
  folder_id?: string;
  space_id?: string;
}

export interface UpdateWebhookData {
  endpoint?: string;
  events?: string[];
  status?: 'active' | 'deleted';
}

interface GetWebhooksResponse {
  webhooks: ClickUpWebhook[];
}

interface WebhookResponse {
  webhook: ClickUpWebhook;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class WebhookService extends BaseClickUpService {
  /**
   * Get all webhooks for the workspace
   * @returns List of webhooks
   */
  async getWebhooks(): Promise<ClickUpWebhook[]> {
    return this.makeRequest(async () => {
      this.logOperation('getWebhooks', { teamId: this.teamId });

      const response = await this.client.get<GetWebhooksResponse>(
        `/team/${this.teamId}/webhook`
      );

      this.logger.info(`Retrieved ${response.data.webhooks.length} webhooks for team: ${this.teamId}`);
      return response.data.webhooks;
    });
  }

  /**
   * Create a new webhook for the workspace
   * @param data Webhook creation data (endpoint, events, optional scope filters)
   * @returns The created webhook
   */
  async createWebhook(data: CreateWebhookData): Promise<ClickUpWebhook> {
    return this.makeRequest(async () => {
      this.logOperation('createWebhook', { teamId: this.teamId, endpoint: data.endpoint, events: data.events });

      const response = await this.client.post<WebhookResponse>(
        `/team/${this.teamId}/webhook`,
        data
      );

      this.logger.info(`Created webhook: ${response.data.webhook.id} -> ${response.data.webhook.endpoint}`);
      return response.data.webhook;
    });
  }

  /**
   * Update an existing webhook
   * @param webhookId The ID of the webhook to update
   * @param data Fields to update (endpoint, events, status)
   * @returns The updated webhook
   */
  async updateWebhook(webhookId: string, data: UpdateWebhookData): Promise<ClickUpWebhook> {
    return this.makeRequest(async () => {
      this.logOperation('updateWebhook', { webhookId, ...data });

      const response = await this.client.put<WebhookResponse>(
        `/webhook/${webhookId}`,
        data
      );

      this.logger.info(`Updated webhook: ${webhookId}`);
      return response.data.webhook;
    });
  }

  /**
   * Delete a webhook
   * @param webhookId The ID of the webhook to delete
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    return this.makeRequest(async () => {
      this.logOperation('deleteWebhook', { webhookId });

      await this.client.delete(`/webhook/${webhookId}`);

      this.logger.info(`Deleted webhook: ${webhookId}`);
    });
  }
}
