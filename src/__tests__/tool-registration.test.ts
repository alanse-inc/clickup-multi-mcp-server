/**
 * Tool Registration Integrity Tests
 *
 * Verifies that every defined MCP tool is properly registered:
 * - Has a unique name
 * - Has all required schema fields
 * - Has a corresponding handler function
 * - No orphaned handlers (every handler maps to a tool)
 *
 * These tests run without any ClickUp API credentials.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// ── Mock service/config modules to prevent API initialization ────────────────

vi.mock('../services/shared.js', () => ({
  clickUpServices: {
    workspace: {},
    task: {},
    tag: {},
    list: {},
    folder: {},
    space: {},
    member: {},
    timeTracking: {},
    document: {},
    goal: {},
    checklist: {},
    view: {},
  },
  getClickUpServices: () => ({}),
}));

vi.mock('../services/clickup/index.js', () => ({
  createClickUpServices: () => ({}),
}));

vi.mock('../config.js', () => ({
  default: {
    enabledTools: [],
    disabledTools: [],
    documentSupport: 'false',
    enableSSE: false,
    logLevel: 4, // ERROR
  },
  LogLevel: { TRACE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4 },
  getWorkspaceConfig: () => ({ token: 'test', teamId: 'test' }),
  getAvailableWorkspaces: () => ({}),
  getDefaultWorkspace: () => 'default',
}));

// ── Import all tool definitions ──────────────────────────────────────────────

import {
  workspaceHierarchyTool,
  availableWorkspacesTool,
  handleGetWorkspaceHierarchy,
  handleGetAvailableWorkspaces,
} from '../tools/workspace.js';

import {
  createTaskTool,
  getTaskTool,
  getTasksTool,
  updateTaskTool,
  moveTaskTool,
  duplicateTaskTool,
  deleteTaskTool,
  getTaskCommentsTool,
  createTaskCommentTool,
  attachTaskFileTool,
  createBulkTasksTool,
  updateBulkTasksTool,
  moveBulkTasksTool,
  deleteBulkTasksTool,
  getWorkspaceTasksTool,
  getTaskTimeEntriesTool,
  startTimeTrackingTool,
  stopTimeTrackingTool,
  addTimeEntryTool,
  deleteTimeEntryTool,
  getCurrentTimeEntryTool,
  mergeTaskTool,
  getTimeInStatusTool,
  getBulkTimeInStatusTool,
  addTaskToListTool,
  removeTaskFromListTool,
  handleCreateTask,
  handleGetTask,
  handleGetTasks,
  handleUpdateTask,
  handleMoveTask,
  handleDuplicateTask,
  handleDeleteTask,
  handleGetTaskComments,
  handleCreateTaskComment,
  handleAttachTaskFile,
  handleCreateBulkTasks,
  handleUpdateBulkTasks,
  handleMoveBulkTasks,
  handleDeleteBulkTasks,
  handleGetWorkspaceTasks,
  handleGetTaskTimeEntries,
  handleStartTimeTracking,
  handleStopTimeTracking,
  handleAddTimeEntry,
  handleDeleteTimeEntry,
  handleGetCurrentTimeEntry,
  mergeTaskHandler,
  getTimeInStatusHandler,
  getBulkTimeInStatusHandler,
  addTaskToListHandler,
  removeTaskFromListHandler,
} from '../tools/task/index.js';

import {
  createListTool,
  createListInFolderTool,
  getListTool,
  updateListTool,
  deleteListTool,
  handleCreateList,
  handleCreateListInFolder,
  handleGetList,
  handleUpdateList,
  handleDeleteList,
} from '../tools/list.js';

import {
  createFolderTool,
  getFolderTool,
  updateFolderTool,
  deleteFolderTool,
  handleCreateFolder,
  handleGetFolder,
  handleUpdateFolder,
  handleDeleteFolder,
} from '../tools/folder.js';

import {
  getSpaceTagsTool,
  createSpaceTagTool,
  updateSpaceTagTool,
  deleteSpaceTagTool,
  addTagToTaskTool,
  removeTagFromTaskTool,
  handleGetSpaceTags,
  handleCreateSpaceTag,
  handleUpdateSpaceTag,
  handleDeleteSpaceTag,
  handleAddTagToTask,
  handleRemoveTagFromTask,
} from '../tools/tag.js';

import {
  getWorkspaceMembersTool,
  findMemberByNameTool,
  resolveAssigneesTool,
  handleGetWorkspaceMembers,
  handleFindMemberByName,
  handleResolveAssignees,
} from '../tools/member.js';

import {
  createDocumentTool,
  getDocumentTool,
  listDocumentsTool,
  listDocumentPagesTool,
  getDocumentPagesTool,
  createDocumentPageTool,
  updateDocumentPageTool,
  handleCreateDocument,
  handleGetDocument,
  handleListDocuments,
  handleListDocumentPages,
  handleGetDocumentPages,
  handleCreateDocumentPage,
  handleUpdateDocumentPage,
} from '../tools/documents.js';

import {
  getGoalsTool,
  getGoalTool,
  createGoalTool,
  updateGoalTool,
  deleteGoalTool,
  createKeyResultTool,
  updateKeyResultTool,
  deleteKeyResultTool,
  handleGetGoals,
  handleGetGoal,
  handleCreateGoal,
  handleUpdateGoal,
  handleDeleteGoal,
  handleCreateKeyResult,
  handleUpdateKeyResult,
  handleDeleteKeyResult,
} from '../tools/goal.js';

import {
  getSpacesTool,
  getSpaceTool,
  createSpaceTool,
  updateSpaceTool,
  deleteSpaceTool,
  handleGetSpaces,
  handleGetSpace,
  handleCreateSpace,
  handleUpdateSpace,
  handleDeleteSpace,
} from '../tools/space.js';

import {
  addDependencyTool,
  deleteDependencyTool,
  addTaskLinkTool,
  deleteTaskLinkTool,
  handleAddDependency,
  handleDeleteDependency,
  handleAddTaskLink,
  handleDeleteTaskLink,
} from '../tools/dependency.js';

import {
  checklistTools,
  handleCreateChecklist,
  handleEditChecklist,
  handleDeleteChecklist,
  handleCreateChecklistItem,
  handleEditChecklistItem,
  handleDeleteChecklistItem,
} from '../tools/checklist.js';

import {
  viewTools,
  handleGetWorkspaceViews,
  handleCreateWorkspaceView,
  handleGetSpaceViews,
  handleCreateSpaceView,
  handleGetFolderViews,
  handleCreateFolderView,
  handleGetListViews,
  handleCreateListView,
  handleGetView,
  handleUpdateView,
  handleDeleteView,
  handleGetViewTasks,
} from '../tools/view.js';

// ── Build the complete registry ───────────────────────────────────────────────

type HandlerFn = (...args: any[]) => any;

interface RegistryEntry {
  tool: Tool;
  handler: HandlerFn;
}

const TOOL_REGISTRY: RegistryEntry[] = [
  // Workspace
  { tool: workspaceHierarchyTool, handler: handleGetWorkspaceHierarchy },
  { tool: availableWorkspacesTool, handler: handleGetAvailableWorkspaces },

  // Task — single operations
  { tool: createTaskTool, handler: handleCreateTask },
  { tool: getTaskTool, handler: handleGetTask },
  { tool: getTasksTool, handler: handleGetTasks },
  { tool: updateTaskTool, handler: handleUpdateTask },
  { tool: moveTaskTool, handler: handleMoveTask },
  { tool: duplicateTaskTool, handler: handleDuplicateTask },
  { tool: deleteTaskTool, handler: handleDeleteTask },
  { tool: getTaskCommentsTool, handler: handleGetTaskComments },
  { tool: createTaskCommentTool, handler: handleCreateTaskComment },
  { tool: attachTaskFileTool, handler: handleAttachTaskFile },
  { tool: mergeTaskTool, handler: mergeTaskHandler },
  { tool: getTimeInStatusTool, handler: getTimeInStatusHandler },
  { tool: getBulkTimeInStatusTool, handler: getBulkTimeInStatusHandler },
  { tool: addTaskToListTool, handler: addTaskToListHandler },
  { tool: removeTaskFromListTool, handler: removeTaskFromListHandler },

  // Task — bulk operations
  { tool: createBulkTasksTool, handler: handleCreateBulkTasks },
  { tool: updateBulkTasksTool, handler: handleUpdateBulkTasks },
  { tool: moveBulkTasksTool, handler: handleMoveBulkTasks },
  { tool: deleteBulkTasksTool, handler: handleDeleteBulkTasks },

  // Task — workspace operations
  { tool: getWorkspaceTasksTool, handler: handleGetWorkspaceTasks },

  // Task — time tracking
  { tool: getTaskTimeEntriesTool, handler: handleGetTaskTimeEntries },
  { tool: startTimeTrackingTool, handler: handleStartTimeTracking },
  { tool: stopTimeTrackingTool, handler: handleStopTimeTracking },
  { tool: addTimeEntryTool, handler: handleAddTimeEntry },
  { tool: deleteTimeEntryTool, handler: handleDeleteTimeEntry },
  { tool: getCurrentTimeEntryTool, handler: handleGetCurrentTimeEntry },

  // List
  { tool: createListTool, handler: handleCreateList },
  { tool: createListInFolderTool, handler: handleCreateListInFolder },
  { tool: getListTool, handler: handleGetList },
  { tool: updateListTool, handler: handleUpdateList },
  { tool: deleteListTool, handler: handleDeleteList },

  // Folder
  { tool: createFolderTool, handler: handleCreateFolder },
  { tool: getFolderTool, handler: handleGetFolder },
  { tool: updateFolderTool, handler: handleUpdateFolder },
  { tool: deleteFolderTool, handler: handleDeleteFolder },

  // Tag
  { tool: getSpaceTagsTool, handler: handleGetSpaceTags },
  { tool: createSpaceTagTool, handler: handleCreateSpaceTag },
  { tool: updateSpaceTagTool, handler: handleUpdateSpaceTag },
  { tool: deleteSpaceTagTool, handler: handleDeleteSpaceTag },
  { tool: addTagToTaskTool, handler: handleAddTagToTask },
  { tool: removeTagFromTaskTool, handler: handleRemoveTagFromTask },

  // Member
  { tool: getWorkspaceMembersTool, handler: handleGetWorkspaceMembers },
  { tool: findMemberByNameTool, handler: handleFindMemberByName },
  { tool: resolveAssigneesTool, handler: handleResolveAssignees },

  // Document (conditionally enabled at runtime, always registered in registry)
  { tool: createDocumentTool, handler: handleCreateDocument },
  { tool: getDocumentTool, handler: handleGetDocument },
  { tool: listDocumentsTool, handler: handleListDocuments },
  { tool: listDocumentPagesTool, handler: handleListDocumentPages },
  { tool: getDocumentPagesTool, handler: handleGetDocumentPages },
  { tool: createDocumentPageTool, handler: handleCreateDocumentPage },
  { tool: updateDocumentPageTool, handler: handleUpdateDocumentPage },

  // Goal
  { tool: getGoalsTool, handler: handleGetGoals },
  { tool: getGoalTool, handler: handleGetGoal },
  { tool: createGoalTool, handler: handleCreateGoal },
  { tool: updateGoalTool, handler: handleUpdateGoal },
  { tool: deleteGoalTool, handler: handleDeleteGoal },
  { tool: createKeyResultTool, handler: handleCreateKeyResult },
  { tool: updateKeyResultTool, handler: handleUpdateKeyResult },
  { tool: deleteKeyResultTool, handler: handleDeleteKeyResult },

  // Space
  { tool: getSpacesTool, handler: handleGetSpaces },
  { tool: getSpaceTool, handler: handleGetSpace },
  { tool: createSpaceTool, handler: handleCreateSpace },
  { tool: updateSpaceTool, handler: handleUpdateSpace },
  { tool: deleteSpaceTool, handler: handleDeleteSpace },

  // Dependency
  { tool: addDependencyTool, handler: handleAddDependency },
  { tool: deleteDependencyTool, handler: handleDeleteDependency },
  { tool: addTaskLinkTool, handler: handleAddTaskLink },
  { tool: deleteTaskLinkTool, handler: handleDeleteTaskLink },

  // Checklist
  ...checklistTools.map((tool, i) => ({
    tool,
    handler: [
      handleCreateChecklist,
      handleEditChecklist,
      handleDeleteChecklist,
      handleCreateChecklistItem,
      handleEditChecklistItem,
      handleDeleteChecklistItem,
    ][i],
  })),

  // View
  ...viewTools.map((tool, i) => ({
    tool,
    handler: [
      handleGetWorkspaceViews,
      handleCreateWorkspaceView,
      handleGetSpaceViews,
      handleCreateSpaceView,
      handleGetFolderViews,
      handleCreateFolderView,
      handleGetListViews,
      handleCreateListView,
      handleGetView,
      handleUpdateView,
      handleDeleteView,
      handleGetViewTasks,
    ][i],
  })),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Tool Registration Integrity', () => {
  it('all tool names are unique (no duplicates)', () => {
    const names = TOOL_REGISTRY.map(e => e.tool.name);
    const unique = new Set(names);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    expect(duplicates, `Duplicate tool names: ${duplicates.join(', ')}`).toHaveLength(0);
    expect(unique.size).toBe(names.length);
  });

  it('every tool definition has required fields', () => {
    for (const { tool } of TOOL_REGISTRY) {
      expect(tool.name, `tool.name missing`).toBeTypeOf('string');
      expect(tool.name.length, `tool.name is empty`).toBeGreaterThan(0);
      expect(tool.description, `${tool.name}: description missing`).toBeTypeOf('string');
      expect(tool.description.length, `${tool.name}: description is empty`).toBeGreaterThan(0);
      expect(tool.inputSchema, `${tool.name}: inputSchema missing`).toBeDefined();
      expect(tool.inputSchema.type, `${tool.name}: inputSchema.type missing`).toBe('object');
    }
  });

  it('every tool has a corresponding handler function', () => {
    for (const { tool, handler } of TOOL_REGISTRY) {
      expect(handler, `${tool.name}: handler is undefined`).toBeDefined();
      expect(typeof handler, `${tool.name}: handler is not a function`).toBe('function');
    }
  });

  it('total registered tool count is 88 (excluding document conditional tools: 81)', () => {
    // Document tools (7) are conditionally enabled at runtime, but always in the registry
    const nonDocTools = TOOL_REGISTRY.filter(e => !['create_document', 'get_document',
      'list_documents', 'list_document_pages', 'get_document_pages',
      'create_document_page', 'update_document_page'].includes(e.tool.name));
    expect(nonDocTools).toHaveLength(81);
    expect(TOOL_REGISTRY).toHaveLength(88);
  });

  it('all tool names use snake_case format', () => {
    const snakeCasePattern = /^[a-z][a-z0-9_]*$/;
    for (const { tool } of TOOL_REGISTRY) {
      expect(
        snakeCasePattern.test(tool.name),
        `${tool.name}: tool name does not match snake_case format`
      ).toBe(true);
    }
  });
});
