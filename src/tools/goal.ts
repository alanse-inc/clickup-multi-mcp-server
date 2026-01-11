/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Goal Tools
 *
 * This module defines goal-related tools for managing Goals and Key Results.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../logger.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { getServicesForWorkspace, workspaceParameter } from './workspace-helper.js';
import { CreateGoalData, UpdateGoalData, CreateKeyResultData, UpdateKeyResultData, KeyResultType } from '../services/clickup/types.js';

// Create a logger for goal tools
const logger = new Logger('GoalTool');

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Tool definition for getting all goals
 */
export const getGoalsTool: Tool = {
  name: 'get_goals',
  description: `Gets all goals for the workspace. Returns goal names, descriptions, progress, key results, and owners.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      include_completed: {
        type: 'boolean',
        description: 'Include completed goals in the response (default: false)'
      },
      ...workspaceParameter
    }
  }
};

/**
 * Tool definition for getting a single goal
 */
export const getGoalTool: Tool = {
  name: 'get_goal',
  description: `Gets a single goal by ID with full details including all key results.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      goal_id: {
        type: 'string',
        description: 'REQUIRED: The goal ID to retrieve'
      },
      ...workspaceParameter
    },
    required: ['goal_id']
  }
};

/**
 * Tool definition for creating a goal
 */
export const createGoalTool: Tool = {
  name: 'create_goal',
  description: `Creates a new goal in the workspace.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'REQUIRED: Name of the goal'
      },
      due_date: {
        type: 'number',
        description: 'REQUIRED: Due date as Unix timestamp in milliseconds'
      },
      description: {
        type: 'string',
        description: 'Optional description for the goal'
      },
      multiple_owners: {
        type: 'boolean',
        description: 'Allow multiple owners (default: true)'
      },
      owners: {
        type: 'array',
        items: { type: 'number' },
        description: 'Optional array of user IDs to assign as owners'
      },
      color: {
        type: 'string',
        description: 'Optional hex color code for the goal (e.g., "#FF0000")'
      },
      ...workspaceParameter
    },
    required: ['name', 'due_date']
  }
};

/**
 * Tool definition for updating a goal
 */
export const updateGoalTool: Tool = {
  name: 'update_goal',
  description: `Updates an existing goal.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      goal_id: {
        type: 'string',
        description: 'REQUIRED: The goal ID to update'
      },
      name: {
        type: 'string',
        description: 'New name for the goal'
      },
      due_date: {
        type: 'number',
        description: 'New due date as Unix timestamp in milliseconds'
      },
      description: {
        type: 'string',
        description: 'New description for the goal'
      },
      add_owners: {
        type: 'array',
        items: { type: 'number' },
        description: 'User IDs to add as owners'
      },
      rem_owners: {
        type: 'array',
        items: { type: 'number' },
        description: 'User IDs to remove as owners'
      },
      color: {
        type: 'string',
        description: 'New hex color code for the goal'
      },
      ...workspaceParameter
    },
    required: ['goal_id']
  }
};

/**
 * Tool definition for deleting a goal
 */
export const deleteGoalTool: Tool = {
  name: 'delete_goal',
  description: `Deletes a goal and all its key results.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      goal_id: {
        type: 'string',
        description: 'REQUIRED: The goal ID to delete'
      },
      ...workspaceParameter
    },
    required: ['goal_id']
  }
};

/**
 * Tool definition for creating a key result
 */
export const createKeyResultTool: Tool = {
  name: 'create_key_result',
  description: `Creates a new key result (target) for a goal.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      goal_id: {
        type: 'string',
        description: 'REQUIRED: The goal ID to add the key result to'
      },
      name: {
        type: 'string',
        description: 'REQUIRED: Name of the key result'
      },
      type: {
        type: 'string',
        enum: ['number', 'currency', 'boolean', 'percentage', 'automatic'],
        description: 'REQUIRED: Type of key result tracking'
      },
      steps_start: {
        type: 'number',
        description: 'REQUIRED: Starting value for the key result'
      },
      steps_end: {
        type: 'number',
        description: 'REQUIRED: Target/end value for the key result'
      },
      unit: {
        type: 'string',
        description: 'Optional unit for the key result (e.g., "tasks", "dollars", "%")'
      },
      owners: {
        type: 'array',
        items: { type: 'number' },
        description: 'Optional array of user IDs to assign as owners'
      },
      task_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional array of task IDs to link'
      },
      list_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional array of list IDs to link'
      },
      ...workspaceParameter
    },
    required: ['goal_id', 'name', 'type', 'steps_start', 'steps_end']
  }
};

/**
 * Tool definition for updating a key result
 */
export const updateKeyResultTool: Tool = {
  name: 'update_key_result',
  description: `Updates a key result's progress or settings.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      key_result_id: {
        type: 'string',
        description: 'REQUIRED: The key result ID to update'
      },
      steps_current: {
        type: 'number',
        description: 'Current progress value'
      },
      steps_start: {
        type: 'number',
        description: 'New starting value'
      },
      steps_end: {
        type: 'number',
        description: 'New target/end value'
      },
      name: {
        type: 'string',
        description: 'New name for the key result'
      },
      unit: {
        type: 'string',
        description: 'New unit for the key result'
      },
      note: {
        type: 'string',
        description: 'Note to add with the progress update'
      },
      ...workspaceParameter
    },
    required: ['key_result_id']
  }
};

/**
 * Tool definition for deleting a key result
 */
export const deleteKeyResultTool: Tool = {
  name: 'delete_key_result',
  description: `Deletes a key result from a goal.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      key_result_id: {
        type: 'string',
        description: 'REQUIRED: The key result ID to delete'
      },
      ...workspaceParameter
    },
    required: ['key_result_id']
  }
};

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * Handler for get_goals tool
 */
export async function handleGetGoals(params: { include_completed?: boolean; workspace?: string } = {}) {
  try {
    const services = getServicesForWorkspace(params);
    const { goal: goalService } = services;

    const includeCompleted = params.include_completed ?? false;
    const response = await goalService.getGoals(includeCompleted);

    return sponsorService.createResponse({
      goals: response.goals.map(goal => ({
        id: goal.id,
        name: goal.name,
        description: goal.description,
        due_date: goal.due_date,
        percent_completed: goal.percent_completed,
        color: goal.color,
        archived: goal.archived,
        owners: goal.owners.map(o => ({ id: o.id, username: o.username })),
        key_results_count: goal.key_results.length,
        pretty_url: goal.pretty_url
      })),
      total: response.goals.length
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting goals: ${error.message}`);
  }
}

/**
 * Handler for get_goal tool
 */
export async function handleGetGoal(params: { goal_id: string; workspace?: string }) {
  try {
    if (!params.goal_id) {
      return sponsorService.createErrorResponse('goal_id is required');
    }

    const services = getServicesForWorkspace(params);
    const { goal: goalService } = services;

    const goal = await goalService.getGoal(params.goal_id);

    return sponsorService.createResponse({ goal }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting goal: ${error.message}`);
  }
}

/**
 * Handler for create_goal tool
 */
export async function handleCreateGoal(params: {
  name: string;
  due_date: number;
  description?: string;
  multiple_owners?: boolean;
  owners?: number[];
  color?: string;
  workspace?: string;
}) {
  try {
    if (!params.name) {
      return sponsorService.createErrorResponse('name is required');
    }
    if (!params.due_date) {
      return sponsorService.createErrorResponse('due_date is required');
    }

    const services = getServicesForWorkspace(params);
    const { goal: goalService } = services;

    const data: CreateGoalData = {
      name: params.name,
      due_date: params.due_date,
      description: params.description,
      multiple_owners: params.multiple_owners,
      owners: params.owners,
      color: params.color
    };

    const goal = await goalService.createGoal(data);

    return sponsorService.createResponse({
      message: `Goal "${goal.name}" created successfully`,
      goal: {
        id: goal.id,
        name: goal.name,
        pretty_url: goal.pretty_url
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating goal: ${error.message}`);
  }
}

/**
 * Handler for update_goal tool
 */
export async function handleUpdateGoal(params: {
  goal_id: string;
  name?: string;
  due_date?: number;
  description?: string;
  add_owners?: number[];
  rem_owners?: number[];
  color?: string;
  workspace?: string;
}) {
  try {
    if (!params.goal_id) {
      return sponsorService.createErrorResponse('goal_id is required');
    }

    const services = getServicesForWorkspace(params);
    const { goal: goalService } = services;

    const data: UpdateGoalData = {
      name: params.name,
      due_date: params.due_date,
      description: params.description,
      add_owners: params.add_owners,
      rem_owners: params.rem_owners,
      color: params.color
    };

    const goal = await goalService.updateGoal(params.goal_id, data);

    return sponsorService.createResponse({
      message: `Goal "${goal.name}" updated successfully`,
      goal: {
        id: goal.id,
        name: goal.name,
        percent_completed: goal.percent_completed,
        pretty_url: goal.pretty_url
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error updating goal: ${error.message}`);
  }
}

/**
 * Handler for delete_goal tool
 */
export async function handleDeleteGoal(params: { goal_id: string; workspace?: string }) {
  try {
    if (!params.goal_id) {
      return sponsorService.createErrorResponse('goal_id is required');
    }

    const services = getServicesForWorkspace(params);
    const { goal: goalService } = services;

    await goalService.deleteGoal(params.goal_id);

    return sponsorService.createResponse({
      message: `Goal ${params.goal_id} deleted successfully`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error deleting goal: ${error.message}`);
  }
}

/**
 * Handler for create_key_result tool
 */
export async function handleCreateKeyResult(params: {
  goal_id: string;
  name: string;
  type: KeyResultType;
  steps_start: number;
  steps_end: number;
  unit?: string;
  owners?: number[];
  task_ids?: string[];
  list_ids?: string[];
  workspace?: string;
}) {
  try {
    if (!params.goal_id) {
      return sponsorService.createErrorResponse('goal_id is required');
    }
    if (!params.name) {
      return sponsorService.createErrorResponse('name is required');
    }
    if (!params.type) {
      return sponsorService.createErrorResponse('type is required');
    }
    if (params.steps_start === undefined) {
      return sponsorService.createErrorResponse('steps_start is required');
    }
    if (params.steps_end === undefined) {
      return sponsorService.createErrorResponse('steps_end is required');
    }

    const services = getServicesForWorkspace(params);
    const { goal: goalService } = services;

    const data: CreateKeyResultData = {
      name: params.name,
      type: params.type,
      steps_start: params.steps_start,
      steps_end: params.steps_end,
      unit: params.unit,
      owners: params.owners,
      task_ids: params.task_ids,
      list_ids: params.list_ids
    };

    const keyResult = await goalService.createKeyResult(params.goal_id, data);

    return sponsorService.createResponse({
      message: `Key result "${keyResult.name}" created successfully`,
      key_result: {
        id: keyResult.id,
        name: keyResult.name,
        type: keyResult.type,
        steps_start: keyResult.steps_start,
        steps_end: keyResult.steps_end,
        steps_current: keyResult.steps_current,
        percent_completed: keyResult.percent_completed
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating key result: ${error.message}`);
  }
}

/**
 * Handler for update_key_result tool
 */
export async function handleUpdateKeyResult(params: {
  key_result_id: string;
  steps_current?: number;
  steps_start?: number;
  steps_end?: number;
  name?: string;
  unit?: string;
  note?: string;
  workspace?: string;
}) {
  try {
    if (!params.key_result_id) {
      return sponsorService.createErrorResponse('key_result_id is required');
    }

    const services = getServicesForWorkspace(params);
    const { goal: goalService } = services;

    const data: UpdateKeyResultData = {
      steps_current: params.steps_current,
      steps_start: params.steps_start,
      steps_end: params.steps_end,
      name: params.name,
      unit: params.unit,
      note: params.note
    };

    const keyResult = await goalService.updateKeyResult(params.key_result_id, data);

    return sponsorService.createResponse({
      message: `Key result "${keyResult.name}" updated successfully`,
      key_result: {
        id: keyResult.id,
        name: keyResult.name,
        steps_current: keyResult.steps_current,
        steps_end: keyResult.steps_end,
        percent_completed: keyResult.percent_completed,
        completed: keyResult.completed
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error updating key result: ${error.message}`);
  }
}

/**
 * Handler for delete_key_result tool
 */
export async function handleDeleteKeyResult(params: { key_result_id: string; workspace?: string }) {
  try {
    if (!params.key_result_id) {
      return sponsorService.createErrorResponse('key_result_id is required');
    }

    const services = getServicesForWorkspace(params);
    const { goal: goalService } = services;

    await goalService.deleteKeyResult(params.key_result_id);

    return sponsorService.createResponse({
      message: `Key result ${params.key_result_id} deleted successfully`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error deleting key result: ${error.message}`);
  }
}
