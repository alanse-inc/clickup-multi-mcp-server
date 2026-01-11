/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Space Tools
 *
 * This module defines space-related tools for managing Spaces in ClickUp.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../logger.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { getServicesForWorkspace, workspaceParameter } from './workspace-helper.js';
import { CreateSpaceData, UpdateSpaceData, SpaceFeatures } from '../services/clickup/types.js';

// Create a logger for space tools
const logger = new Logger('SpaceTool');

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Tool definition for getting all spaces
 */
export const getSpacesTool: Tool = {
  name: 'get_spaces',
  description: `Gets all spaces in the workspace. Returns space names, IDs, and feature configurations.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      ...workspaceParameter
    }
  }
};

/**
 * Tool definition for getting a single space
 */
export const getSpaceTool: Tool = {
  name: 'get_space',
  description: `Gets a single space by ID with full details including features and statuses.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      space_id: {
        type: 'string',
        description: 'REQUIRED: The space ID to retrieve'
      },
      ...workspaceParameter
    },
    required: ['space_id']
  }
};

/**
 * Tool definition for creating a space
 */
export const createSpaceTool: Tool = {
  name: 'create_space',
  description: `Creates a new space in the workspace.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'REQUIRED: Name of the space'
      },
      multiple_assignees: {
        type: 'boolean',
        description: 'Allow multiple assignees on tasks (default: true)'
      },
      features: {
        type: 'object',
        description: 'Optional feature configurations for the space',
        properties: {
          due_dates: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              start_date: { type: 'boolean' },
              remap_due_dates: { type: 'boolean' },
              remap_closed_due_date: { type: 'boolean' }
            }
          },
          time_tracking: {
            type: 'object',
            properties: { enabled: { type: 'boolean' } }
          },
          tags: {
            type: 'object',
            properties: { enabled: { type: 'boolean' } }
          },
          time_estimates: {
            type: 'object',
            properties: { enabled: { type: 'boolean' } }
          },
          checklists: {
            type: 'object',
            properties: { enabled: { type: 'boolean' } }
          },
          custom_fields: {
            type: 'object',
            properties: { enabled: { type: 'boolean' } }
          }
        }
      },
      ...workspaceParameter
    },
    required: ['name']
  }
};

/**
 * Tool definition for updating a space
 */
export const updateSpaceTool: Tool = {
  name: 'update_space',
  description: `Updates an existing space. Can rename, set color, and enable/disable features.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      space_id: {
        type: 'string',
        description: 'REQUIRED: The space ID to update'
      },
      name: {
        type: 'string',
        description: 'New name for the space'
      },
      color: {
        type: 'string',
        description: 'New hex color code for the space (e.g., "#FF0000")'
      },
      private: {
        type: 'boolean',
        description: 'Make the space private'
      },
      admin_can_manage: {
        type: 'boolean',
        description: 'Allow admins to manage the space'
      },
      multiple_assignees: {
        type: 'boolean',
        description: 'Allow multiple assignees on tasks'
      },
      features: {
        type: 'object',
        description: 'Feature configurations to update'
      },
      ...workspaceParameter
    },
    required: ['space_id']
  }
};

/**
 * Tool definition for deleting a space
 */
export const deleteSpaceTool: Tool = {
  name: 'delete_space',
  description: `Deletes a space and all its contents (folders, lists, tasks). This action cannot be undone.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      space_id: {
        type: 'string',
        description: 'REQUIRED: The space ID to delete'
      },
      ...workspaceParameter
    },
    required: ['space_id']
  }
};

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * Handler for get_spaces tool
 */
export async function handleGetSpaces(params: { workspace?: string } = {}) {
  try {
    const services = getServicesForWorkspace(params);
    const { workspace: workspaceService } = services;

    const spaces = await workspaceService.getSpaces();

    return sponsorService.createResponse({
      spaces: spaces.map(space => ({
        id: space.id,
        name: space.name,
        private: space.private,
        archived: space.archived,
        multiple_assignees: space.multiple_assignees,
        features: space.features
      })),
      total: spaces.length
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting spaces: ${error.message}`);
  }
}

/**
 * Handler for get_space tool
 */
export async function handleGetSpace(params: { space_id: string; workspace?: string }) {
  try {
    if (!params.space_id) {
      return sponsorService.createErrorResponse('space_id is required');
    }

    const services = getServicesForWorkspace(params);
    const { workspace: workspaceService } = services;

    const space = await workspaceService.getSpace(params.space_id);

    return sponsorService.createResponse({ space }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting space: ${error.message}`);
  }
}

/**
 * Handler for create_space tool
 */
export async function handleCreateSpace(params: {
  name: string;
  multiple_assignees?: boolean;
  features?: SpaceFeatures;
  workspace?: string;
}) {
  try {
    if (!params.name) {
      return sponsorService.createErrorResponse('name is required');
    }

    const services = getServicesForWorkspace(params);
    const { workspace: workspaceService } = services;

    const data: CreateSpaceData = {
      name: params.name,
      multiple_assignees: params.multiple_assignees,
      features: params.features
    };

    const space = await workspaceService.createSpace(data);

    return sponsorService.createResponse({
      message: `Space "${space.name}" created successfully`,
      space: {
        id: space.id,
        name: space.name,
        private: space.private
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating space: ${error.message}`);
  }
}

/**
 * Handler for update_space tool
 */
export async function handleUpdateSpace(params: {
  space_id: string;
  name?: string;
  color?: string;
  private?: boolean;
  admin_can_manage?: boolean;
  multiple_assignees?: boolean;
  features?: SpaceFeatures;
  workspace?: string;
}) {
  try {
    if (!params.space_id) {
      return sponsorService.createErrorResponse('space_id is required');
    }

    const services = getServicesForWorkspace(params);
    const { workspace: workspaceService } = services;

    const data: UpdateSpaceData = {
      name: params.name,
      color: params.color,
      private: params.private,
      admin_can_manage: params.admin_can_manage,
      multiple_assignees: params.multiple_assignees,
      features: params.features
    };

    const space = await workspaceService.updateSpace(params.space_id, data);

    return sponsorService.createResponse({
      message: `Space "${space.name}" updated successfully`,
      space: {
        id: space.id,
        name: space.name,
        private: space.private
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error updating space: ${error.message}`);
  }
}

/**
 * Handler for delete_space tool
 */
export async function handleDeleteSpace(params: { space_id: string; workspace?: string }) {
  try {
    if (!params.space_id) {
      return sponsorService.createErrorResponse('space_id is required');
    }

    const services = getServicesForWorkspace(params);
    const { workspace: workspaceService } = services;

    await workspaceService.deleteSpace(params.space_id);

    return sponsorService.createResponse({
      message: `Space ${params.space_id} deleted successfully`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error deleting space: ${error.message}`);
  }
}
