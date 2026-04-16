/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Custom Fields Tools
 *
 * Provides MCP tools for retrieving custom field definitions and clearing
 * custom field values on tasks across all ClickUp hierarchy levels.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { getServicesForWorkspace, workspaceParameter } from './workspace-helper.js';

//=============================================================================
// TOOL DEFINITIONS
//=============================================================================

/**
 * Tool definition for retrieving custom field definitions from a list
 */
export const getListFieldsTool: Tool = {
  name: 'get_list_fields',
  description: `Get all custom field definitions accessible from a specific ClickUp list.

Requirements:
- listId: REQUIRED - The ID of the list

Returns the full definition of each custom field including its type, configuration,
and whether it is required. Use this to understand which fields are available before
setting or reading values on tasks within the list.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      listId: {
        type: 'string',
        description: 'The ID of the list to retrieve custom field definitions from'
      },
      ...workspaceParameter
    },
    required: ['listId']
  }
};

/**
 * Tool definition for retrieving custom field definitions from a folder
 */
export const getFolderFieldsTool: Tool = {
  name: 'get_folder_fields',
  description: `Get all custom field definitions accessible from a specific ClickUp folder.

Requirements:
- folderId: REQUIRED - The ID of the folder

Returns the full definition of each custom field including its type, configuration,
and whether it is required.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      folderId: {
        type: 'string',
        description: 'The ID of the folder to retrieve custom field definitions from'
      },
      ...workspaceParameter
    },
    required: ['folderId']
  }
};

/**
 * Tool definition for retrieving custom field definitions from a space
 */
export const getSpaceFieldsTool: Tool = {
  name: 'get_space_fields',
  description: `Get all custom field definitions accessible from a specific ClickUp space.

Requirements:
- spaceId: REQUIRED - The ID of the space

Returns the full definition of each custom field including its type, configuration,
and whether it is required.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      spaceId: {
        type: 'string',
        description: 'The ID of the space to retrieve custom field definitions from'
      },
      ...workspaceParameter
    },
    required: ['spaceId']
  }
};

/**
 * Tool definition for retrieving all custom field definitions in the workspace
 */
export const getWorkspaceFieldsTool: Tool = {
  name: 'get_workspace_fields',
  description: `Get all custom field definitions available across the entire ClickUp workspace (team level).

No required parameters beyond the optional workspace selector.

Returns every custom field defined in the workspace regardless of which list, folder,
or space it belongs to.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      ...workspaceParameter
    },
    required: []
  }
};

/**
 * Tool definition for deleting (clearing) a custom field value on a task
 */
export const deleteCustomFieldValueTool: Tool = {
  name: 'delete_custom_field_value',
  description: `Clear (delete) the value of a custom field on a specific ClickUp task.

Requirements:
- taskId: REQUIRED - The ID of the task
- fieldId: REQUIRED - The UUID of the custom field to clear

This removes the stored value for the field on that task without deleting the field
definition itself. The field will appear empty/unset after this operation.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'The ID of the task whose custom field value should be cleared'
      },
      fieldId: {
        type: 'string',
        description: 'The UUID of the custom field to clear on the task'
      },
      ...workspaceParameter
    },
    required: ['taskId', 'fieldId']
  }
};

//=============================================================================
// HANDLER FUNCTIONS
//=============================================================================

/**
 * Handler for get_list_fields tool
 */
export async function handleGetListFields(params: {
  listId: string;
  workspace?: string;
}) {
  try {
    if (!params.listId) {
      return sponsorService.createErrorResponse('listId is required');
    }

    const services = getServicesForWorkspace(params);
    const fields = await services.customFields.getListFields(params.listId);

    return sponsorService.createResponse({ fields }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting list fields: ${error.message}`);
  }
}

/**
 * Handler for get_folder_fields tool
 */
export async function handleGetFolderFields(params: {
  folderId: string;
  workspace?: string;
}) {
  try {
    if (!params.folderId) {
      return sponsorService.createErrorResponse('folderId is required');
    }

    const services = getServicesForWorkspace(params);
    const fields = await services.customFields.getFolderFields(params.folderId);

    return sponsorService.createResponse({ fields }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting folder fields: ${error.message}`);
  }
}

/**
 * Handler for get_space_fields tool
 */
export async function handleGetSpaceFields(params: {
  spaceId: string;
  workspace?: string;
}) {
  try {
    if (!params.spaceId) {
      return sponsorService.createErrorResponse('spaceId is required');
    }

    const services = getServicesForWorkspace(params);
    const fields = await services.customFields.getSpaceFields(params.spaceId);

    return sponsorService.createResponse({ fields }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting space fields: ${error.message}`);
  }
}

/**
 * Handler for get_workspace_fields tool
 */
export async function handleGetWorkspaceFields(params: {
  workspace?: string;
}) {
  try {
    const services = getServicesForWorkspace(params);
    const fields = await services.customFields.getWorkspaceFields();

    return sponsorService.createResponse({ fields }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting workspace fields: ${error.message}`);
  }
}

/**
 * Handler for delete_custom_field_value tool
 */
export async function handleDeleteCustomFieldValue(params: {
  taskId: string;
  fieldId: string;
  workspace?: string;
}) {
  try {
    if (!params.taskId) {
      return sponsorService.createErrorResponse('taskId is required');
    }
    if (!params.fieldId) {
      return sponsorService.createErrorResponse('fieldId is required');
    }

    const services = getServicesForWorkspace(params);
    await services.customFields.deleteCustomFieldValue(params.taskId, params.fieldId);

    return sponsorService.createResponse({
      message: `Custom field ${params.fieldId} cleared successfully on task ${params.taskId}`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error deleting custom field value: ${error.message}`);
  }
}

//=============================================================================
// EXPORTS
//=============================================================================

export const customFieldsTools = [
  getListFieldsTool,
  getFolderFieldsTool,
  getSpaceFieldsTool,
  getWorkspaceFieldsTool,
  deleteCustomFieldValueTool
];
