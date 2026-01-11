/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * MCP Server for ClickUp integration
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import { createClickUpServices } from "./services/clickup/index.js";
import config from "./config.js";
import { workspaceHierarchyTool, handleGetWorkspaceHierarchy, availableWorkspacesTool, handleGetAvailableWorkspaces } from "./tools/workspace.js";
import {
  createTaskTool,
  updateTaskTool,
  moveTaskTool,
  duplicateTaskTool,
  getTaskTool,
  deleteTaskTool,
  getTaskCommentsTool,
  createTaskCommentTool,
  createBulkTasksTool,
  updateBulkTasksTool,
  moveBulkTasksTool,
  deleteBulkTasksTool,
  attachTaskFileTool,
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
  handleUpdateTask,
  handleMoveTask,
  handleDuplicateTask,
  handleGetTasks,
  handleDeleteTask,
  handleGetTaskComments,
  handleCreateTaskComment,
  handleCreateBulkTasks,
  handleUpdateBulkTasks,
  handleMoveBulkTasks,
  handleDeleteBulkTasks,
  handleGetTask,
  handleAttachTaskFile,
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
  removeTaskFromListHandler
} from "./tools/task/index.js";
import {
  createListTool, handleCreateList,
  createListInFolderTool, handleCreateListInFolder,
  getListTool, handleGetList,
  updateListTool, handleUpdateList,
  deleteListTool, handleDeleteList
} from "./tools/list.js";
import {
  createFolderTool, handleCreateFolder,
  getFolderTool, handleGetFolder,
  updateFolderTool, handleUpdateFolder,
  deleteFolderTool, handleDeleteFolder
} from "./tools/folder.js";
import {
  getSpaceTagsTool, handleGetSpaceTags,
  addTagToTaskTool, handleAddTagToTask,
  removeTagFromTaskTool, handleRemoveTagFromTask
} from "./tools/tag.js";
import {
  createDocumentTool, handleCreateDocument,
  getDocumentTool, handleGetDocument,
  listDocumentsTool, handleListDocuments,
  listDocumentPagesTool, handleListDocumentPages,
  getDocumentPagesTool, handleGetDocumentPages,
  createDocumentPageTool, handleCreateDocumentPage,
  updateDocumentPageTool, handleUpdateDocumentPage
} from "./tools/documents.js";

import {
  getWorkspaceMembersTool, handleGetWorkspaceMembers,
  findMemberByNameTool, handleFindMemberByName,
  resolveAssigneesTool, handleResolveAssignees
} from "./tools/member.js";

import {
  getGoalsTool, handleGetGoals,
  getGoalTool, handleGetGoal,
  createGoalTool, handleCreateGoal,
  updateGoalTool, handleUpdateGoal,
  deleteGoalTool, handleDeleteGoal,
  createKeyResultTool, handleCreateKeyResult,
  updateKeyResultTool, handleUpdateKeyResult,
  deleteKeyResultTool, handleDeleteKeyResult
} from "./tools/goal.js";

import {
  getSpacesTool, handleGetSpaces,
  getSpaceTool, handleGetSpace,
  createSpaceTool, handleCreateSpace,
  updateSpaceTool, handleUpdateSpace,
  deleteSpaceTool, handleDeleteSpace
} from "./tools/space.js";

import {
  addDependencyTool, handleAddDependency,
  deleteDependencyTool, handleDeleteDependency,
  addTaskLinkTool, handleAddTaskLink,
  deleteTaskLinkTool, handleDeleteTaskLink
} from "./tools/dependency.js";

import {
  checklistTools,
  handleCreateChecklist,
  handleEditChecklist,
  handleDeleteChecklist,
  handleCreateChecklistItem,
  handleEditChecklistItem,
  handleDeleteChecklistItem
} from "./tools/checklist.js";

import { Logger } from "./logger.js";
import { clickUpServices } from "./services/shared.js";
import { enhanceToolsWithWorkspace } from "./tools/tool-enhancer.js";

// Create a logger instance for server
const logger = new Logger('Server');

// Use existing services from shared module instead of creating new ones
const { workspace } = clickUpServices;

/**
 * Determines if a tool should be enabled based on ENABLED_TOOLS and DISABLED_TOOLS configuration.
 *
 * Logic:
 * 1. If ENABLED_TOOLS is specified, only tools in that list are enabled (ENABLED_TOOLS takes precedence)
 * 2. If ENABLED_TOOLS is not specified but DISABLED_TOOLS is, all tools except those in DISABLED_TOOLS are enabled
 * 3. If neither is specified, all tools are enabled
 *
 * @param toolName - The name of the tool to check
 * @returns true if the tool should be enabled, false otherwise
 */
const isToolEnabled = (toolName: string): boolean => {
  // If ENABLED_TOOLS is specified, it takes precedence
  if (config.enabledTools.length > 0) {
    return config.enabledTools.includes(toolName);
  }

  // If only DISABLED_TOOLS is specified, enable all tools except those disabled
  if (config.disabledTools.length > 0) {
    return !config.disabledTools.includes(toolName);
  }

  // If neither is specified, enable all tools
  return true;
};

export const server = new Server(
  {
    name: "clickup-mcp-server",
    version: "1.0.2", // x-release-please-version
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
  }
);

const documentModule = () => {
  if (config.documentSupport === 'true') {
    return [
      createDocumentTool,
      getDocumentTool,
      listDocumentsTool,
      listDocumentPagesTool,
      getDocumentPagesTool,
      createDocumentPageTool,
      updateDocumentPageTool,
    ]
  } else {
    return []
  }
}

/**
 * Configure the server routes and handlers
 */
export function configureServer() {
  logger.info("Registering server request handlers");

  // Register ListTools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug("Received ListTools request");

    // Collect all tool definitions
    const allTools: Tool[] = [
      workspaceHierarchyTool,
      availableWorkspacesTool,
      createTaskTool,
      getTaskTool,
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
      createListTool,
      createListInFolderTool,
      getListTool,
      updateListTool,
      deleteListTool,
      createFolderTool,
      getFolderTool,
      updateFolderTool,
      deleteFolderTool,
      getSpaceTagsTool,
      addTagToTaskTool,
      removeTagFromTaskTool,
      getWorkspaceMembersTool,
      findMemberByNameTool,
      resolveAssigneesTool,
      getGoalsTool,
      getGoalTool,
      createGoalTool,
      updateGoalTool,
      deleteGoalTool,
      createKeyResultTool,
      updateKeyResultTool,
      deleteKeyResultTool,
      getSpacesTool,
      getSpaceTool,
      createSpaceTool,
      updateSpaceTool,
      deleteSpaceTool,
      addDependencyTool,
      deleteDependencyTool,
      addTaskLinkTool,
      deleteTaskLinkTool,
      ...checklistTools,
      ...documentModule()
    ] as Tool[];

    // Enhance all tools with workspace parameter support
    const enhancedTools = enhanceToolsWithWorkspace(allTools) as Tool[];

    // Filter based on enabled/disabled tools configuration
    return {
      tools: enhancedTools.filter(tool => isToolEnabled(tool.name))
    };
  });

  // Add handler for resources/list
  server.setRequestHandler(ListResourcesRequestSchema, async (req) => {
    logger.debug("Received ListResources request");
    return { resources: [] };
  });

  // Register CallTool handler with proper logging
  logger.info("Registering tool handlers", {
    toolCount: 45,
    categories: ["workspace", "task", "time-tracking", "list", "folder", "tag", "member", "document", "goal", "space", "dependency", "checklist"]
  });

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: params } = req.params;

    // Improved logging with more context
    logger.info(`Received CallTool request for tool: ${name}`, {
      params
    });

    // Check if the tool is enabled
    if (!isToolEnabled(name)) {
      const reason = config.enabledTools.length > 0
        ? `Tool '${name}' is not in the enabled tools list.`
        : `Tool '${name}' is disabled.`;
      logger.warn(`Tool execution blocked: ${reason}`);
      throw {
        code: -32601,
        message: reason
      };
    }

    try {
      // Handle tool calls by routing to the appropriate handler
      switch (name) {
        case "get_workspace_hierarchy":
          return handleGetWorkspaceHierarchy(params);
        case "get_available_workspaces":
          return handleGetAvailableWorkspaces();
        case "create_task":
          return handleCreateTask(params);
        case "update_task":
          return handleUpdateTask(params);
        case "move_task":
          return handleMoveTask(params);
        case "duplicate_task":
          return handleDuplicateTask(params);
        case "get_task":
          return handleGetTask(params);
        case "delete_task":
          return handleDeleteTask(params);
        case "get_task_comments":
          return handleGetTaskComments(params);
        case "create_task_comment":
          return handleCreateTaskComment(params);
        case "attach_task_file":
          return handleAttachTaskFile(params);
        case "create_bulk_tasks":
          return handleCreateBulkTasks(params);
        case "update_bulk_tasks":
          return handleUpdateBulkTasks(params);
        case "move_bulk_tasks":
          return handleMoveBulkTasks(params);
        case "delete_bulk_tasks":
          return handleDeleteBulkTasks(params);
        case "get_workspace_tasks":
          return handleGetWorkspaceTasks(params);
        case "create_list":
          return handleCreateList(params);
        case "create_list_in_folder":
          return handleCreateListInFolder(params);
        case "get_list":
          return handleGetList(params);
        case "update_list":
          return handleUpdateList(params);
        case "delete_list":
          return handleDeleteList(params);
        case "create_folder":
          return handleCreateFolder(params);
        case "get_folder":
          return handleGetFolder(params);
        case "update_folder":
          return handleUpdateFolder(params);
        case "delete_folder":
          return handleDeleteFolder(params);
        case "get_space_tags":
          return handleGetSpaceTags(params);
        case "add_tag_to_task":
          return handleAddTagToTask(params);
        case "remove_tag_from_task":
          return handleRemoveTagFromTask(params);
        case "get_task_time_entries":
          return handleGetTaskTimeEntries(params);
        case "start_time_tracking":
          return handleStartTimeTracking(params);
        case "stop_time_tracking":
          return handleStopTimeTracking(params);
        case "add_time_entry":
          return handleAddTimeEntry(params);
        case "delete_time_entry":
          return handleDeleteTimeEntry(params);
        case "get_current_time_entry":
          return handleGetCurrentTimeEntry(params);
        case "merge_task":
          return mergeTaskHandler(params);
        case "get_task_time_in_status":
          return getTimeInStatusHandler(params);
        case "get_bulk_tasks_time_in_status":
          return getBulkTimeInStatusHandler(params);
        case "add_task_to_list":
          return addTaskToListHandler(params);
        case "remove_task_from_list":
          return removeTaskFromListHandler(params);
        case "create_document":
          return handleCreateDocument(params);
        case "get_document":
          return handleGetDocument(params);
        case "list_documents":
          return handleListDocuments(params);
        case "list_document_pages":
          return handleListDocumentPages(params);
        case "get_document_pages":
          return handleGetDocumentPages(params);
        case "create_document_page":
          return handleCreateDocumentPage(params);
        case "update_document_page":
          return handleUpdateDocumentPage(params);
        case "get_workspace_members":
          return handleGetWorkspaceMembers();
        case "find_member_by_name":
          return handleFindMemberByName(params);
        case "resolve_assignees":
          return handleResolveAssignees(params);
        case "get_goals":
          return handleGetGoals(params as any);
        case "get_goal":
          return handleGetGoal(params as any);
        case "create_goal":
          return handleCreateGoal(params as any);
        case "update_goal":
          return handleUpdateGoal(params as any);
        case "delete_goal":
          return handleDeleteGoal(params as any);
        case "create_key_result":
          return handleCreateKeyResult(params as any);
        case "update_key_result":
          return handleUpdateKeyResult(params as any);
        case "delete_key_result":
          return handleDeleteKeyResult(params as any);
        case "get_spaces":
          return handleGetSpaces(params as any);
        case "get_space":
          return handleGetSpace(params as any);
        case "create_space":
          return handleCreateSpace(params as any);
        case "update_space":
          return handleUpdateSpace(params as any);
        case "delete_space":
          return handleDeleteSpace(params as any);
        case "add_dependency":
          return handleAddDependency(params as any);
        case "delete_dependency":
          return handleDeleteDependency(params as any);
        case "add_task_link":
          return handleAddTaskLink(params as any);
        case "delete_task_link":
          return handleDeleteTaskLink(params as any);
        case "create_checklist":
          return handleCreateChecklist(params as any);
        case "edit_checklist":
          return handleEditChecklist(params as any);
        case "delete_checklist":
          return handleDeleteChecklist(params as any);
        case "create_checklist_item":
          return handleCreateChecklistItem(params as any);
        case "edit_checklist_item":
          return handleEditChecklistItem(params as any);
        case "delete_checklist_item":
          return handleDeleteChecklistItem(params as any);
        default:
          logger.error(`Unknown tool requested: ${name}`);
          const error = new Error(`Unknown tool: ${name}`);
          error.name = "UnknownToolError";
          throw error;
      }
    } catch (err) {
      logger.error(`Error executing tool: ${name}`, err);

      // Transform error to a more descriptive JSON-RPC error
      if (err.name === "UnknownToolError") {
        throw {
          code: -32601,
          message: `Method not found: ${name}`
        };
      } else if (err.name === "ValidationError") {
        throw {
          code: -32602,
          message: `Invalid params for tool ${name}: ${err.message}`
        };
      } else {
        // Generic server error
        throw {
          code: -32000,
          message: `Error executing tool ${name}: ${err.message}`
        };
      }
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.info("Received ListPrompts request");
    return { prompts: [] };
  });

  server.setRequestHandler(GetPromptRequestSchema, async () => {
    logger.error("Received GetPrompt request, but prompts are not supported");
    throw new Error("Prompt not found");
  });

  return server;
}

/**
 * Export the clickup service for use in tool handlers
 */
export { workspace };
