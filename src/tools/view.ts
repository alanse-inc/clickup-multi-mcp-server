/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp View Tools
 *
 * Provides tools for managing views in ClickUp across all hierarchy levels:
 * - Workspace (Everything), Space, Folder, and List level views
 * - CRUD operations on views
 * - Retrieving tasks within a view
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../logger.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { getServicesForWorkspace, workspaceParameter } from './workspace-helper.js';

const logger = new Logger('ViewTools');

//=============================================================================
// TOOL DEFINITIONS
//=============================================================================

export const getWorkspaceViewsTool: Tool = {
  name: 'get_workspace_views',
  description: `Get all views at the workspace (Everything) level.

Returns all views accessible at the top-level workspace hierarchy.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      ...workspaceParameter
    },
    required: []
  }
};

export const createWorkspaceViewTool: Tool = {
  name: 'create_workspace_view',
  description: `Create a new view at the workspace (Everything) level.

Requirements:
- name: REQUIRED - The name of the view
- type: REQUIRED - View type: list, board, calendar, table, gantt, timeline, workload, activity, map, chat`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'The name of the view'
      },
      type: {
        type: 'string',
        enum: ['list', 'board', 'calendar', 'table', 'gantt', 'timeline', 'workload', 'activity', 'map', 'chat'],
        description: 'The type of view to create'
      },
      ...workspaceParameter
    },
    required: ['name', 'type']
  }
};

export const getSpaceViewsTool: Tool = {
  name: 'get_space_views',
  description: `Get all views for a specific space.

Requirements:
- spaceId: REQUIRED - The ID of the space`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      spaceId: {
        type: 'string',
        description: 'The ID of the space'
      },
      ...workspaceParameter
    },
    required: ['spaceId']
  }
};

export const createSpaceViewTool: Tool = {
  name: 'create_space_view',
  description: `Create a new view in a space.

Requirements:
- spaceId: REQUIRED - The ID of the space
- name: REQUIRED - The name of the view
- type: REQUIRED - View type: list, board, calendar, table, gantt, timeline, workload, activity, map, chat`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      spaceId: {
        type: 'string',
        description: 'The ID of the space'
      },
      name: {
        type: 'string',
        description: 'The name of the view'
      },
      type: {
        type: 'string',
        enum: ['list', 'board', 'calendar', 'table', 'gantt', 'timeline', 'workload', 'activity', 'map', 'chat'],
        description: 'The type of view to create'
      },
      ...workspaceParameter
    },
    required: ['spaceId', 'name', 'type']
  }
};

export const getFolderViewsTool: Tool = {
  name: 'get_folder_views',
  description: `Get all views for a specific folder.

Requirements:
- folderId: REQUIRED - The ID of the folder`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      folderId: {
        type: 'string',
        description: 'The ID of the folder'
      },
      ...workspaceParameter
    },
    required: ['folderId']
  }
};

export const createFolderViewTool: Tool = {
  name: 'create_folder_view',
  description: `Create a new view in a folder.

Requirements:
- folderId: REQUIRED - The ID of the folder
- name: REQUIRED - The name of the view
- type: REQUIRED - View type: list, board, calendar, table, gantt, timeline, workload, activity, map, chat`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      folderId: {
        type: 'string',
        description: 'The ID of the folder'
      },
      name: {
        type: 'string',
        description: 'The name of the view'
      },
      type: {
        type: 'string',
        enum: ['list', 'board', 'calendar', 'table', 'gantt', 'timeline', 'workload', 'activity', 'map', 'chat'],
        description: 'The type of view to create'
      },
      ...workspaceParameter
    },
    required: ['folderId', 'name', 'type']
  }
};

export const getListViewsTool: Tool = {
  name: 'get_list_views',
  description: `Get all views for a specific list.

Requirements:
- listId: REQUIRED - The ID of the list`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      listId: {
        type: 'string',
        description: 'The ID of the list'
      },
      ...workspaceParameter
    },
    required: ['listId']
  }
};

export const createListViewTool: Tool = {
  name: 'create_list_view',
  description: `Create a new view in a list.

Requirements:
- listId: REQUIRED - The ID of the list
- name: REQUIRED - The name of the view
- type: REQUIRED - View type: list, board, calendar, table, gantt, timeline, workload, activity, map, chat`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      listId: {
        type: 'string',
        description: 'The ID of the list'
      },
      name: {
        type: 'string',
        description: 'The name of the view'
      },
      type: {
        type: 'string',
        enum: ['list', 'board', 'calendar', 'table', 'gantt', 'timeline', 'workload', 'activity', 'map', 'chat'],
        description: 'The type of view to create'
      },
      ...workspaceParameter
    },
    required: ['listId', 'name', 'type']
  }
};

export const getViewTool: Tool = {
  name: 'get_view',
  description: `Get details of a specific view by its ID.

Requirements:
- viewId: REQUIRED - The ID of the view`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      viewId: {
        type: 'string',
        description: 'The ID of the view'
      },
      ...workspaceParameter
    },
    required: ['viewId']
  }
};

export const updateViewTool: Tool = {
  name: 'update_view',
  description: `Update an existing view's properties.

Requirements:
- viewId: REQUIRED - The ID of the view to update

Optional:
- name: New name for the view
- grouping: Grouping configuration (field, direction)
- sorting: Sorting configuration (fields with direction)
- filters: Filter configuration (operator, fields)

Note: view type and parent location cannot be changed after creation.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      viewId: {
        type: 'string',
        description: 'The ID of the view to update'
      },
      name: {
        type: 'string',
        description: 'New name for the view'
      },
      grouping: {
        type: 'object',
        description: 'Grouping configuration with field and dir (1=asc, -1=desc)',
        properties: {
          field: { type: 'string' },
          dir: { type: 'number', enum: [1, -1] }
        }
      },
      sorting: {
        type: 'object',
        description: 'Sorting configuration with array of fields and directions',
        properties: {
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                dir: { type: 'number', enum: [1, -1] }
              }
            }
          }
        }
      },
      ...workspaceParameter
    },
    required: ['viewId']
  }
};

export const deleteViewTool: Tool = {
  name: 'delete_view',
  description: `Delete a view permanently.

Requirements:
- viewId: REQUIRED - The ID of the view to delete

Warning: This action cannot be undone.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      viewId: {
        type: 'string',
        description: 'The ID of the view to delete'
      },
      ...workspaceParameter
    },
    required: ['viewId']
  }
};

export const getViewTasksTool: Tool = {
  name: 'get_view_tasks',
  description: `Get all tasks visible in a specific view.

Requirements:
- viewId: REQUIRED - The ID of the view

Optional:
- page: Page number for pagination (0-based, default 0)

Returns tasks with pagination support (100 tasks per page).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      viewId: {
        type: 'string',
        description: 'The ID of the view'
      },
      page: {
        type: 'number',
        description: 'Page number for pagination (0-based, default 0)'
      },
      ...workspaceParameter
    },
    required: ['viewId']
  }
};

//=============================================================================
// HANDLER FUNCTIONS
//=============================================================================

export async function handleGetWorkspaceViews(params: {
  workspace?: string;
}) {
  try {
    const services = getServicesForWorkspace(params);
    const views = await services.view.getWorkspaceViews();

    return sponsorService.createResponse({
      views: views.views.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        visibility: v.visibility,
        orderindex: v.orderindex
      })),
      count: views.views.length
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting workspace views: ${error.message}`);
  }
}

export async function handleCreateWorkspaceView(params: {
  name: string;
  type: string;
  workspace?: string;
}) {
  try {
    if (!params.name) return sponsorService.createErrorResponse('name is required');
    if (!params.type) return sponsorService.createErrorResponse('type is required');

    const services = getServicesForWorkspace(params);
    const view = await services.view.createWorkspaceView({
      name: params.name,
      type: params.type as any
    });

    return sponsorService.createResponse({
      message: `View "${params.name}" created successfully`,
      view: { id: view.id, name: view.name, type: view.type }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating workspace view: ${error.message}`);
  }
}

export async function handleGetSpaceViews(params: {
  spaceId: string;
  workspace?: string;
}) {
  try {
    if (!params.spaceId) return sponsorService.createErrorResponse('spaceId is required');

    const services = getServicesForWorkspace(params);
    const views = await services.view.getSpaceViews(params.spaceId);

    return sponsorService.createResponse({
      views: views.views.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        visibility: v.visibility,
        orderindex: v.orderindex
      })),
      count: views.views.length
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting space views: ${error.message}`);
  }
}

export async function handleCreateSpaceView(params: {
  spaceId: string;
  name: string;
  type: string;
  workspace?: string;
}) {
  try {
    if (!params.spaceId) return sponsorService.createErrorResponse('spaceId is required');
    if (!params.name) return sponsorService.createErrorResponse('name is required');
    if (!params.type) return sponsorService.createErrorResponse('type is required');

    const services = getServicesForWorkspace(params);
    const view = await services.view.createSpaceView(params.spaceId, {
      name: params.name,
      type: params.type as any
    });

    return sponsorService.createResponse({
      message: `View "${params.name}" created successfully`,
      view: { id: view.id, name: view.name, type: view.type }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating space view: ${error.message}`);
  }
}

export async function handleGetFolderViews(params: {
  folderId: string;
  workspace?: string;
}) {
  try {
    if (!params.folderId) return sponsorService.createErrorResponse('folderId is required');

    const services = getServicesForWorkspace(params);
    const views = await services.view.getFolderViews(params.folderId);

    return sponsorService.createResponse({
      views: views.views.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        visibility: v.visibility,
        orderindex: v.orderindex
      })),
      count: views.views.length
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting folder views: ${error.message}`);
  }
}

export async function handleCreateFolderView(params: {
  folderId: string;
  name: string;
  type: string;
  workspace?: string;
}) {
  try {
    if (!params.folderId) return sponsorService.createErrorResponse('folderId is required');
    if (!params.name) return sponsorService.createErrorResponse('name is required');
    if (!params.type) return sponsorService.createErrorResponse('type is required');

    const services = getServicesForWorkspace(params);
    const view = await services.view.createFolderView(params.folderId, {
      name: params.name,
      type: params.type as any
    });

    return sponsorService.createResponse({
      message: `View "${params.name}" created successfully`,
      view: { id: view.id, name: view.name, type: view.type }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating folder view: ${error.message}`);
  }
}

export async function handleGetListViews(params: {
  listId: string;
  workspace?: string;
}) {
  try {
    if (!params.listId) return sponsorService.createErrorResponse('listId is required');

    const services = getServicesForWorkspace(params);
    const views = await services.view.getListViews(params.listId);

    return sponsorService.createResponse({
      views: views.views.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        visibility: v.visibility,
        orderindex: v.orderindex
      })),
      count: views.views.length
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting list views: ${error.message}`);
  }
}

export async function handleCreateListView(params: {
  listId: string;
  name: string;
  type: string;
  workspace?: string;
}) {
  try {
    if (!params.listId) return sponsorService.createErrorResponse('listId is required');
    if (!params.name) return sponsorService.createErrorResponse('name is required');
    if (!params.type) return sponsorService.createErrorResponse('type is required');

    const services = getServicesForWorkspace(params);
    const view = await services.view.createListView(params.listId, {
      name: params.name,
      type: params.type as any
    });

    return sponsorService.createResponse({
      message: `View "${params.name}" created successfully`,
      view: { id: view.id, name: view.name, type: view.type }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating list view: ${error.message}`);
  }
}

export async function handleGetView(params: {
  viewId: string;
  workspace?: string;
}) {
  try {
    if (!params.viewId) return sponsorService.createErrorResponse('viewId is required');

    const services = getServicesForWorkspace(params);
    const view = await services.view.getView(params.viewId);

    return sponsorService.createResponse({
      id: view.id,
      name: view.name,
      type: view.type,
      visibility: view.visibility,
      protected: view.protected,
      orderindex: view.orderindex,
      date_created: view.date_created,
      parent: view.parent
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting view: ${error.message}`);
  }
}

export async function handleUpdateView(params: {
  viewId: string;
  name?: string;
  grouping?: { field: string; dir: 1 | -1 };
  sorting?: { fields: Array<{ field: string; dir: 1 | -1 }> };
  workspace?: string;
}) {
  try {
    if (!params.viewId) return sponsorService.createErrorResponse('viewId is required');

    const { viewId, workspace, ...updateData } = params;

    const services = getServicesForWorkspace(params);
    const view = await services.view.updateView(viewId, updateData);

    return sponsorService.createResponse({
      message: 'View updated successfully',
      view: { id: view.id, name: view.name, type: view.type }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error updating view: ${error.message}`);
  }
}

export async function handleDeleteView(params: {
  viewId: string;
  workspace?: string;
}) {
  try {
    if (!params.viewId) return sponsorService.createErrorResponse('viewId is required');

    const services = getServicesForWorkspace(params);
    await services.view.deleteView(params.viewId);

    return sponsorService.createResponse({
      message: `View ${params.viewId} deleted successfully`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error deleting view: ${error.message}`);
  }
}

export async function handleGetViewTasks(params: {
  viewId: string;
  page?: number;
  workspace?: string;
}) {
  try {
    if (!params.viewId) return sponsorService.createErrorResponse('viewId is required');

    const services = getServicesForWorkspace(params);
    const result = await services.view.getViewTasks(params.viewId, params.page);

    return sponsorService.createResponse({
      tasks: result.tasks,
      has_more: result.has_more ?? false,
      next_page: result.next_page,
      count: result.tasks.length
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting view tasks: ${error.message}`);
  }
}

//=============================================================================
// EXPORTS
//=============================================================================

export const viewTools = [
  getWorkspaceViewsTool,
  createWorkspaceViewTool,
  getSpaceViewsTool,
  createSpaceViewTool,
  getFolderViewsTool,
  createFolderViewTool,
  getListViewsTool,
  createListViewTool,
  getViewTool,
  updateViewTool,
  deleteViewTool,
  getViewTasksTool
];
