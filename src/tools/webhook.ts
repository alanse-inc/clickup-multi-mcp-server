/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Webhook Tools
 *
 * Provides MCP tools for managing webhooks in ClickUp:
 * - Listing all webhooks in a workspace
 * - Creating webhooks with event subscriptions and optional scope filters
 * - Updating webhook endpoint, events, or status
 * - Deleting webhooks
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { workspaceParameter } from './workspace-helper.js';
import { getWorkspaceConfig, getDefaultWorkspace } from '../config.js';
import { WebhookService } from '../services/clickup/webhook.js';

/**
 * Resolve a WebhookService instance for the requested workspace.
 * WebhookService is not registered in ClickUpServices, so we instantiate it
 * directly using the workspace credentials resolved from config.
 */
function getWebhookService(workspace?: string): WebhookService {
  const wsId = workspace || getDefaultWorkspace();
  const { token, teamId } = getWorkspaceConfig(wsId);
  return new WebhookService(token, teamId);
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const getWebhooksTool: Tool = {
  name: 'get_webhooks',
  description: `Get all webhooks configured for the workspace.

Returns a list of all webhooks including their endpoints, subscribed events,
scope filters (task/list/folder/space), health status, and fail counts.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      ...workspaceParameter
    },
    required: []
  }
};

export const createWebhookTool: Tool = {
  name: 'create_webhook',
  description: `Create a new webhook that fires on specified ClickUp events.

Requirements:
- endpoint: REQUIRED - The HTTPS URL that will receive webhook payloads
- events: REQUIRED - Array of event names to subscribe to, or ["*"] for all events

Available events:
  taskCreated, taskUpdated, taskDeleted, taskStatusUpdated, taskAssigneeUpdated,
  taskCommentPosted, taskCommentUpdated, taskTimeEstimateUpdated, taskTimerStarted,
  taskTimerStopped, listCreated, listUpdated, listDeleted, folderCreated,
  folderUpdated, folderDeleted, spaceCreated, spaceUpdated, spaceDeleted,
  goalCreated, goalUpdated, goalDeleted, keyResultCreated, keyResultUpdated,
  keyResultDeleted, * (all events)

Optional scope filters (webhook fires only for items under the specified scope):
- task_id: Limit to a specific task
- list_id: Limit to a specific list
- folder_id: Limit to a specific folder
- space_id: Limit to a specific space`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      endpoint: {
        type: 'string',
        description: 'The HTTPS URL that will receive webhook POST payloads'
      },
      events: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of event names to subscribe to. Use ["*"] to subscribe to all events. Examples: ["taskCreated","taskUpdated"], ["taskStatusUpdated","taskAssigneeUpdated"], ["*"]'
      },
      task_id: {
        type: 'string',
        description: 'Optional: limit webhook scope to a specific task ID'
      },
      list_id: {
        type: 'string',
        description: 'Optional: limit webhook scope to a specific list ID'
      },
      folder_id: {
        type: 'string',
        description: 'Optional: limit webhook scope to a specific folder ID'
      },
      space_id: {
        type: 'string',
        description: 'Optional: limit webhook scope to a specific space ID'
      },
      ...workspaceParameter
    },
    required: ['endpoint', 'events']
  }
};

export const updateWebhookTool: Tool = {
  name: 'update_webhook',
  description: `Update an existing webhook's endpoint, subscribed events, or status.

Requirements:
- webhookId: REQUIRED - The ID of the webhook to update

Optional (at least one should be provided):
- endpoint: New HTTPS URL for the webhook
- events: New array of event names (replaces existing subscriptions)
- status: Set to "active" to re-enable or "deleted" to deactivate the webhook`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      webhookId: {
        type: 'string',
        description: 'The ID of the webhook to update'
      },
      endpoint: {
        type: 'string',
        description: 'New HTTPS URL for the webhook'
      },
      events: {
        type: 'array',
        items: { type: 'string' },
        description: 'New array of event names to subscribe to (replaces all existing subscriptions)'
      },
      status: {
        type: 'string',
        enum: ['active', 'deleted'],
        description: 'Set webhook status: "active" to enable, "deleted" to deactivate'
      },
      ...workspaceParameter
    },
    required: ['webhookId']
  }
};

export const deleteWebhookTool: Tool = {
  name: 'delete_webhook',
  description: `Permanently delete a webhook.

Requirements:
- webhookId: REQUIRED - The ID of the webhook to delete

Warning: This action cannot be undone. The webhook will stop receiving events immediately.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      webhookId: {
        type: 'string',
        description: 'The ID of the webhook to delete'
      },
      ...workspaceParameter
    },
    required: ['webhookId']
  }
};

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================

export async function handleGetWebhooks(params: {
  workspace?: string;
}) {
  try {
    const service = getWebhookService(params.workspace);
    const webhooks = await service.getWebhooks();

    return sponsorService.createResponse({
      webhooks: webhooks.map(w => ({
        id: w.id,
        endpoint: w.endpoint,
        events: w.events,
        task_id: w.task_id,
        list_id: w.list_id,
        folder_id: w.folder_id,
        space_id: w.space_id,
        health: w.health
      })),
      count: webhooks.length
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting webhooks: ${error.message}`);
  }
}

export async function handleCreateWebhook(params: {
  endpoint: string;
  events: string[];
  task_id?: string;
  list_id?: string;
  folder_id?: string;
  space_id?: string;
  workspace?: string;
}) {
  try {
    if (!params.endpoint) return sponsorService.createErrorResponse('endpoint is required');
    if (!params.events || params.events.length === 0) {
      return sponsorService.createErrorResponse('events is required and must contain at least one event');
    }

    const service = getWebhookService(params.workspace);

    const createData = {
      endpoint: params.endpoint,
      events: params.events,
      ...(params.task_id && { task_id: params.task_id }),
      ...(params.list_id && { list_id: params.list_id }),
      ...(params.folder_id && { folder_id: params.folder_id }),
      ...(params.space_id && { space_id: params.space_id })
    };

    const webhook = await service.createWebhook(createData);

    return sponsorService.createResponse({
      message: `Webhook created successfully`,
      webhook: {
        id: webhook.id,
        endpoint: webhook.endpoint,
        events: webhook.events,
        task_id: webhook.task_id,
        list_id: webhook.list_id,
        folder_id: webhook.folder_id,
        space_id: webhook.space_id,
        health: webhook.health,
        secret: webhook.secret
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating webhook: ${error.message}`);
  }
}

export async function handleUpdateWebhook(params: {
  webhookId: string;
  endpoint?: string;
  events?: string[];
  status?: 'active' | 'deleted';
  workspace?: string;
}) {
  try {
    if (!params.webhookId) return sponsorService.createErrorResponse('webhookId is required');

    const { webhookId, workspace, endpoint, events, status } = params;
    const updateData: { endpoint?: string; events?: string[]; status?: 'active' | 'deleted' } = {};
    if (endpoint !== undefined) updateData.endpoint = endpoint;
    if (events !== undefined) updateData.events = events;
    if (status !== undefined) updateData.status = status;

    const service = getWebhookService(workspace);
    const webhook = await service.updateWebhook(webhookId, updateData);

    return sponsorService.createResponse({
      message: `Webhook ${webhookId} updated successfully`,
      webhook: {
        id: webhook.id,
        endpoint: webhook.endpoint,
        events: webhook.events,
        health: webhook.health
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error updating webhook: ${error.message}`);
  }
}

export async function handleDeleteWebhook(params: {
  webhookId: string;
  workspace?: string;
}) {
  try {
    if (!params.webhookId) return sponsorService.createErrorResponse('webhookId is required');

    const service = getWebhookService(params.workspace);
    await service.deleteWebhook(params.webhookId);

    return sponsorService.createResponse({
      message: `Webhook ${params.webhookId} deleted successfully`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error deleting webhook: ${error.message}`);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const webhookTools = [
  getWebhooksTool,
  createWebhookTool,
  updateWebhookTool,
  deleteWebhookTool
];
