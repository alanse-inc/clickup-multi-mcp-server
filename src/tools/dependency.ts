/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Task Dependency Tools
 *
 * This module defines tools for managing task dependencies and links.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../logger.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { getServicesForWorkspace, workspaceParameter } from './workspace-helper.js';

// Create a logger for dependency tools
const logger = new Logger('DependencyTool');

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Tool definition for adding a dependency
 */
export const addDependencyTool: Tool = {
  name: 'add_dependency',
  description: `Adds a dependency relationship between two tasks. Use depends_on to set what task this task is waiting on, or dependency_of to set what task is waiting on this task.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      task_id: {
        type: 'string',
        description: 'REQUIRED: The task ID to add the dependency to'
      },
      depends_on: {
        type: 'string',
        description: 'The task ID that this task depends on (is waiting on/blocked by)'
      },
      dependency_of: {
        type: 'string',
        description: 'The task ID that depends on this task (this task blocks)'
      },
      ...workspaceParameter
    },
    required: ['task_id']
  }
};

/**
 * Tool definition for removing a dependency
 */
export const deleteDependencyTool: Tool = {
  name: 'delete_dependency',
  description: `Removes a dependency relationship between two tasks.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      task_id: {
        type: 'string',
        description: 'REQUIRED: The task ID to remove the dependency from'
      },
      depends_on: {
        type: 'string',
        description: 'The task ID that this task depends on (to remove)'
      },
      dependency_of: {
        type: 'string',
        description: 'The task ID that depends on this task (to remove)'
      },
      ...workspaceParameter
    },
    required: ['task_id']
  }
};

/**
 * Tool definition for adding a task link
 */
export const addTaskLinkTool: Tool = {
  name: 'add_task_link',
  description: `Links two tasks together. Task links appear in the task's right sidebar and are bidirectional.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      task_id: {
        type: 'string',
        description: 'REQUIRED: The task ID to link from'
      },
      links_to: {
        type: 'string',
        description: 'REQUIRED: The task ID to link to'
      },
      ...workspaceParameter
    },
    required: ['task_id', 'links_to']
  }
};

/**
 * Tool definition for removing a task link
 */
export const deleteTaskLinkTool: Tool = {
  name: 'delete_task_link',
  description: `Removes the link between two tasks.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      task_id: {
        type: 'string',
        description: 'REQUIRED: The task ID to remove the link from'
      },
      links_to: {
        type: 'string',
        description: 'REQUIRED: The linked task ID to unlink'
      },
      ...workspaceParameter
    },
    required: ['task_id', 'links_to']
  }
};

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * Handler for add_dependency tool
 */
export async function handleAddDependency(params: {
  task_id: string;
  depends_on?: string;
  dependency_of?: string;
  workspace?: string;
}) {
  try {
    if (!params.task_id) {
      return sponsorService.createErrorResponse('task_id is required');
    }

    if (!params.depends_on && !params.dependency_of) {
      return sponsorService.createErrorResponse('Either depends_on or dependency_of is required');
    }

    const services = getServicesForWorkspace(params);
    const { task: taskService } = services;

    const dependency = await taskService.addDependency(params.task_id, {
      depends_on: params.depends_on,
      dependency_of: params.dependency_of
    });

    const relationshipType = params.depends_on
      ? `Task ${params.task_id} now depends on task ${params.depends_on}`
      : `Task ${params.dependency_of} now depends on task ${params.task_id}`;

    return sponsorService.createResponse({
      message: `Dependency added successfully. ${relationshipType}`,
      dependency
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error adding dependency: ${error.message}`);
  }
}

/**
 * Handler for delete_dependency tool
 */
export async function handleDeleteDependency(params: {
  task_id: string;
  depends_on?: string;
  dependency_of?: string;
  workspace?: string;
}) {
  try {
    if (!params.task_id) {
      return sponsorService.createErrorResponse('task_id is required');
    }

    if (!params.depends_on && !params.dependency_of) {
      return sponsorService.createErrorResponse('Either depends_on or dependency_of is required');
    }

    const services = getServicesForWorkspace(params);
    const { task: taskService } = services;

    await taskService.deleteDependency(params.task_id, params.depends_on, params.dependency_of);

    return sponsorService.createResponse({
      message: `Dependency removed successfully from task ${params.task_id}`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error removing dependency: ${error.message}`);
  }
}

/**
 * Handler for add_task_link tool
 */
export async function handleAddTaskLink(params: {
  task_id: string;
  links_to: string;
  workspace?: string;
}) {
  try {
    if (!params.task_id) {
      return sponsorService.createErrorResponse('task_id is required');
    }

    if (!params.links_to) {
      return sponsorService.createErrorResponse('links_to is required');
    }

    const services = getServicesForWorkspace(params);
    const { task: taskService } = services;

    const link = await taskService.addTaskLink(params.task_id, params.links_to);

    return sponsorService.createResponse({
      message: `Task link added successfully: ${params.task_id} <-> ${params.links_to}`,
      link
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error adding task link: ${error.message}`);
  }
}

/**
 * Handler for delete_task_link tool
 */
export async function handleDeleteTaskLink(params: {
  task_id: string;
  links_to: string;
  workspace?: string;
}) {
  try {
    if (!params.task_id) {
      return sponsorService.createErrorResponse('task_id is required');
    }

    if (!params.links_to) {
      return sponsorService.createErrorResponse('links_to is required');
    }

    const services = getServicesForWorkspace(params);
    const { task: taskService } = services;

    await taskService.deleteTaskLink(params.task_id, params.links_to);

    return sponsorService.createResponse({
      message: `Task link removed successfully: ${params.task_id} <-> ${params.links_to}`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error removing task link: ${error.message}`);
  }
}
