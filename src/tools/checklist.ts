/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Checklist Tools
 *
 * Provides tools for managing checklists on ClickUp tasks:
 * - Create, edit, delete checklists
 * - Create, edit, delete checklist items
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../logger.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { getServicesForWorkspace, workspaceParameter } from './workspace-helper.js';

const logger = new Logger('ChecklistTools');

//=============================================================================
// TOOL DEFINITIONS
//=============================================================================

/**
 * Tool definition for creating a checklist
 */
export const createChecklistTool: Tool = {
  name: 'create_checklist',
  description: `Create a new checklist on a ClickUp task.

Requirements:
- taskId: REQUIRED - The task ID to add the checklist to
- name: REQUIRED - The name of the checklist

Example: Create a checklist named "Pre-launch checklist" on task "abc123"`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'The ID of the task to add the checklist to'
      },
      name: {
        type: 'string',
        description: 'The name of the checklist'
      },
      ...workspaceParameter
    },
    required: ['taskId', 'name']
  }
};

/**
 * Tool definition for editing a checklist
 */
export const editChecklistTool: Tool = {
  name: 'edit_checklist',
  description: `Edit a checklist on a ClickUp task (rename or reorder).

Requirements:
- checklistId: REQUIRED - The checklist ID (UUID format)
- At least one of: name, position

Notes:
- position: Use to reorder checklists on a task (0 = first position)`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      checklistId: {
        type: 'string',
        description: 'The ID of the checklist to edit (UUID format)'
      },
      name: {
        type: 'string',
        description: 'New name for the checklist'
      },
      position: {
        type: 'number',
        description: 'New position for the checklist (0 = first)'
      },
      ...workspaceParameter
    },
    required: ['checklistId']
  }
};

/**
 * Tool definition for deleting a checklist
 */
export const deleteChecklistTool: Tool = {
  name: 'delete_checklist',
  description: `Delete a checklist from a ClickUp task.

Requirements:
- checklistId: REQUIRED - The checklist ID (UUID format)

Warning: This will delete the checklist and all its items permanently.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      checklistId: {
        type: 'string',
        description: 'The ID of the checklist to delete (UUID format)'
      },
      ...workspaceParameter
    },
    required: ['checklistId']
  }
};

/**
 * Tool definition for creating a checklist item
 */
export const createChecklistItemTool: Tool = {
  name: 'create_checklist_item',
  description: `Add a new item to a checklist.

Requirements:
- checklistId: REQUIRED - The checklist ID (UUID format)
- name: REQUIRED - The name/text of the checklist item

Optional:
- assignee: User ID to assign the item to`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      checklistId: {
        type: 'string',
        description: 'The ID of the checklist to add the item to (UUID format)'
      },
      name: {
        type: 'string',
        description: 'The name/text of the checklist item'
      },
      assignee: {
        type: 'number',
        description: 'User ID to assign this item to (optional)'
      },
      ...workspaceParameter
    },
    required: ['checklistId', 'name']
  }
};

/**
 * Tool definition for editing a checklist item
 */
export const editChecklistItemTool: Tool = {
  name: 'edit_checklist_item',
  description: `Edit a checklist item (rename, mark resolved, assign, or nest under another item).

Requirements:
- checklistId: REQUIRED - The checklist ID (UUID format)
- checklistItemId: REQUIRED - The checklist item ID

Optional:
- name: New name for the item
- resolved: true to mark as complete, false to mark as incomplete
- assignee: User ID to assign, or null to unassign
- parent: Another checklist item ID to nest this item under, or null to un-nest`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      checklistId: {
        type: 'string',
        description: 'The ID of the checklist (UUID format)'
      },
      checklistItemId: {
        type: 'string',
        description: 'The ID of the checklist item to edit'
      },
      name: {
        type: 'string',
        description: 'New name for the checklist item'
      },
      resolved: {
        type: 'boolean',
        description: 'Mark as resolved (true) or unresolved (false)'
      },
      assignee: {
        type: ['number', 'null'],
        description: 'User ID to assign, or null to unassign'
      },
      parent: {
        type: ['string', 'null'],
        description: 'Parent checklist item ID to nest under, or null to un-nest'
      },
      ...workspaceParameter
    },
    required: ['checklistId', 'checklistItemId']
  }
};

/**
 * Tool definition for deleting a checklist item
 */
export const deleteChecklistItemTool: Tool = {
  name: 'delete_checklist_item',
  description: `Delete a checklist item.

Requirements:
- checklistId: REQUIRED - The checklist ID (UUID format)
- checklistItemId: REQUIRED - The checklist item ID to delete`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      checklistId: {
        type: 'string',
        description: 'The ID of the checklist (UUID format)'
      },
      checklistItemId: {
        type: 'string',
        description: 'The ID of the checklist item to delete'
      },
      ...workspaceParameter
    },
    required: ['checklistId', 'checklistItemId']
  }
};

//=============================================================================
// HANDLER FUNCTIONS
//=============================================================================

/**
 * Handler for create_checklist tool
 */
export async function handleCreateChecklist(params: {
  taskId: string;
  name: string;
  workspace?: string;
}) {
  try {
    if (!params.taskId) {
      return sponsorService.createErrorResponse('taskId is required');
    }
    if (!params.name) {
      return sponsorService.createErrorResponse('name is required');
    }

    const services = getServicesForWorkspace(params);
    const { checklist: checklistService } = services;

    const checklist = await checklistService.createChecklist(params.taskId, {
      name: params.name
    });

    return sponsorService.createResponse({
      message: `Checklist "${params.name}" created successfully`,
      checklist: {
        id: checklist.id,
        name: checklist.name,
        task_id: checklist.task_id,
        items_count: checklist.items.length
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating checklist: ${error.message}`);
  }
}

/**
 * Handler for edit_checklist tool
 */
export async function handleEditChecklist(params: {
  checklistId: string;
  name?: string;
  position?: number;
  workspace?: string;
}) {
  try {
    if (!params.checklistId) {
      return sponsorService.createErrorResponse('checklistId is required');
    }
    if (!params.name && params.position === undefined) {
      return sponsorService.createErrorResponse('At least one of name or position is required');
    }

    const services = getServicesForWorkspace(params);
    const { checklist: checklistService } = services;

    const checklist = await checklistService.editChecklist(params.checklistId, {
      name: params.name,
      position: params.position
    });

    return sponsorService.createResponse({
      message: 'Checklist updated successfully',
      checklist: {
        id: checklist.id,
        name: checklist.name,
        orderindex: checklist.orderindex
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error editing checklist: ${error.message}`);
  }
}

/**
 * Handler for delete_checklist tool
 */
export async function handleDeleteChecklist(params: {
  checklistId: string;
  workspace?: string;
}) {
  try {
    if (!params.checklistId) {
      return sponsorService.createErrorResponse('checklistId is required');
    }

    const services = getServicesForWorkspace(params);
    const { checklist: checklistService } = services;

    await checklistService.deleteChecklist(params.checklistId);

    return sponsorService.createResponse({
      message: `Checklist ${params.checklistId} deleted successfully`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error deleting checklist: ${error.message}`);
  }
}

/**
 * Handler for create_checklist_item tool
 */
export async function handleCreateChecklistItem(params: {
  checklistId: string;
  name: string;
  assignee?: number;
  workspace?: string;
}) {
  try {
    if (!params.checklistId) {
      return sponsorService.createErrorResponse('checklistId is required');
    }
    if (!params.name) {
      return sponsorService.createErrorResponse('name is required');
    }

    const services = getServicesForWorkspace(params);
    const { checklist: checklistService } = services;

    const checklist = await checklistService.createChecklistItem(params.checklistId, {
      name: params.name,
      assignee: params.assignee
    });

    return sponsorService.createResponse({
      message: `Checklist item "${params.name}" created successfully`,
      checklist: {
        id: checklist.id,
        name: checklist.name,
        items_count: checklist.items.length,
        resolved: checklist.resolved,
        unresolved: checklist.unresolved
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating checklist item: ${error.message}`);
  }
}

/**
 * Handler for edit_checklist_item tool
 */
export async function handleEditChecklistItem(params: {
  checklistId: string;
  checklistItemId: string;
  name?: string;
  resolved?: boolean;
  assignee?: number | null;
  parent?: string | null;
  workspace?: string;
}) {
  try {
    if (!params.checklistId) {
      return sponsorService.createErrorResponse('checklistId is required');
    }
    if (!params.checklistItemId) {
      return sponsorService.createErrorResponse('checklistItemId is required');
    }

    const services = getServicesForWorkspace(params);
    const { checklist: checklistService } = services;

    const checklist = await checklistService.editChecklistItem(
      params.checklistId,
      params.checklistItemId,
      {
        name: params.name,
        resolved: params.resolved,
        assignee: params.assignee,
        parent: params.parent
      }
    );

    return sponsorService.createResponse({
      message: 'Checklist item updated successfully',
      checklist: {
        id: checklist.id,
        name: checklist.name,
        resolved: checklist.resolved,
        unresolved: checklist.unresolved
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error editing checklist item: ${error.message}`);
  }
}

/**
 * Handler for delete_checklist_item tool
 */
export async function handleDeleteChecklistItem(params: {
  checklistId: string;
  checklistItemId: string;
  workspace?: string;
}) {
  try {
    if (!params.checklistId) {
      return sponsorService.createErrorResponse('checklistId is required');
    }
    if (!params.checklistItemId) {
      return sponsorService.createErrorResponse('checklistItemId is required');
    }

    const services = getServicesForWorkspace(params);
    const { checklist: checklistService } = services;

    await checklistService.deleteChecklistItem(params.checklistId, params.checklistItemId);

    return sponsorService.createResponse({
      message: `Checklist item ${params.checklistItemId} deleted successfully`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error deleting checklist item: ${error.message}`);
  }
}

//=============================================================================
// EXPORTS
//=============================================================================

export const checklistTools = [
  createChecklistTool,
  editChecklistTool,
  deleteChecklistTool,
  createChecklistItemTool,
  editChecklistItemTool,
  deleteChecklistItemTool
];
