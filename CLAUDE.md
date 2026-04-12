# ClickUp Multi-Workspace MCP Server — Developer Guide

## Project Overview

A Model Context Protocol (MCP) server that exposes ClickUp API operations as tools for AI agents. Supports multiple ClickUp workspaces simultaneously via a unified interface.

---

## File Architecture

```
src/
├── index.ts                        # Entry point — starts STDIO/HTTP transports
├── server.ts                       # MCP server: registers all tools + routes CallTool requests
├── config.ts                       # Reads env vars (API keys, feature flags, tool filters)
├── logger.ts                       # Structured logger used throughout the codebase
│
├── services/
│   ├── shared.ts                   # Singleton: exports instantiated services for default workspace
│   └── clickup/
│       ├── index.ts                # Factory function createClickUpServices() + ClickUpServices type
│       ├── base.ts                 # BaseClickUpService: Axios client, makeRequest(), logOperation()
│       ├── types.ts                # All shared TypeScript types and interfaces for ClickUp API
│       ├── workspace.ts            # WorkspaceService — hierarchy, members
│       ├── task/
│       │   ├── index.ts            # Re-exports all task service methods
│       │   ├── task-core.ts        # TaskServiceCore — base task CRUD
│       │   ├── handlers.ts         # High-level task handlers (smart lookup by name)
│       │   └── workspace-operations.ts  # Bulk task operations
│       ├── list.ts                 # ListService — list CRUD
│       ├── folder.ts               # FolderService — folder CRUD
│       ├── space.ts                # SpaceService — space CRUD
│       ├── tag.ts                  # TagService — space tags and task tags
│       ├── member.ts               # MemberService — member lookup and assignee resolution
│       ├── time.ts                 # TimeTrackingService — start/stop/entries
│       ├── document.ts             # DocumentService — docs and pages
│       ├── goal.ts                 # GoalService — goals and key results
│       ├── checklist.ts            # ChecklistService — task checklists and items
│       └── view.ts                 # ViewService — views across all hierarchy levels
│
├── tools/
│   ├── index.ts                    # Re-exports from all tool modules (subset; server.ts imports directly)
│   ├── workspace.ts                # Tools: get_workspace_hierarchy, get_available_workspaces
│   ├── task/
│   │   ├── index.ts                # Re-exports all task tool definitions and handlers
│   │   ├── definitions.ts          # Tool schema definitions for task operations
│   │   └── handlers.ts             # Tool handler functions for task operations
│   ├── list.ts                     # Tools: create_list, get_list, update_list, delete_list, create_list_in_folder
│   ├── folder.ts                   # Tools: create_folder, get_folder, update_folder, delete_folder
│   ├── space.ts                    # Tools: get_spaces, get_space, create_space, update_space, delete_space
│   ├── tag.ts                      # Tools: get_space_tags, add_tag_to_task, remove_tag_from_task
│   ├── member.ts                   # Tools: get_workspace_members, find_member_by_name, resolve_assignees
│   ├── documents.ts                # Tools: create_document, get_document, list_documents, etc.
│   ├── goal.ts                     # Tools: get_goals, create_goal, update_goal, delete_goal, key results
│   ├── dependency.ts               # Tools: add_dependency, delete_dependency, add_task_link, delete_task_link
│   ├── checklist.ts                # Tools: create_checklist, edit_checklist, delete_checklist, items
│   ├── view.ts                     # Tools: get/create views (workspace/space/folder/list), update/delete view, get_view_tasks
│   ├── tool-enhancer.ts            # Injects workspace parameter into every tool schema
│   └── workspace-helper.ts        # getServicesForWorkspace() — resolves correct service set from params
│
└── utils/
    └── sponsor-service.ts          # createResponse() / createErrorResponse() — standard MCP response format
```

---

## Service Layer Patterns

### Extending BaseClickUpService

All services extend `BaseClickUpService` (`src/services/clickup/base.ts`):

```typescript
export class MyService extends BaseClickUpService {
  // No explicit constructor needed — inherited from BaseClickUpService

  async doSomething(id: string): Promise<SomeType> {
    return this.makeRequest(async () => {
      this.logOperation('doSomething', { id });           // Always INSIDE makeRequest
      const response = await this.client.get<SomeType>(`/endpoint/${id}`);
      this.logger.info(`Did something: ${response.data.name} (${id})`);  // Success log
      return response.data;
    });
    // No try/catch needed — makeRequest + handleAxiosError in base handles errors
  }

  async deleteItem(id: string): Promise<void> {          // Delete returns Promise<void>
    return this.makeRequest(async () => {
      this.logOperation('deleteItem', { id });
      await this.client.delete(`/endpoint/${id}`);
      this.logger.info(`Deleted item: ${id}`);
    });
  }
}
```

**Rules:**
- `logOperation()` must be called **inside** the `makeRequest` callback (not before it)
- No `try/catch` in service methods — `makeRequest` and `handleAxiosError` handle all errors
- No explicit constructor unless it does something beyond `super(apiKey, teamId, baseUrl)`
- Delete methods return `Promise<void>`, not `ServiceResponse<void>`
- Always add a `this.logger.info()` confirmation on success

---

## Tool Layer Patterns

### Structure of a tool file (`src/tools/something.ts`)

```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { getServicesForWorkspace, workspaceParameter } from './workspace-helper.js';

// 1. Tool definition (schema for MCP clients)
export const doSomethingTool: Tool = {
  name: 'do_something',
  description: `...`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: '...' },
      ...workspaceParameter    // Always spread this
    },
    required: ['id']
  }
};

// 2. Handler function
export async function handleDoSomething(params: { id: string; workspace?: string }) {
  try {
    if (!params.id) return sponsorService.createErrorResponse('id is required');

    const services = getServicesForWorkspace(params);
    const result = await services.something.doSomething(params.id);

    return sponsorService.createResponse({ result }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error doing something: ${error.message}`);
  }
}

// 3. Grouped export for server.ts allTools array
export const somethingTools = [doSomethingTool, ...];
```

---

## Checklist: How to Add a New API Feature to MCP

Follow these steps in order to expose a new ClickUp API feature as MCP tools.

### Step 1 — Add Types (`src/services/clickup/types.ts`)

- [ ] Define response type (e.g., `ClickUpMyFeature`)
- [ ] Define input types (e.g., `CreateMyFeatureData`, `UpdateMyFeatureData`)
- [ ] Use specific union types instead of `string` or `number` where possible
- [ ] Use `string | number | boolean | null` instead of `any` for variable values
- [ ] Avoid index signatures (`[key: string]: any`) — use `Record<string, unknown>` if needed
- [ ] For delete data types, omit immutable fields and add a comment explaining why
- [ ] If adding a parent/container type enum, reuse or extend `ClickUpParentType` rather than duplicating

### Step 2 — Implement Service (`src/services/clickup/myfeature.ts`)

- [ ] Extend `BaseClickUpService` — no explicit constructor
- [ ] Each method: call `logOperation()` **inside** `makeRequest`, never before it
- [ ] Each method: add `this.logger.info()` confirmation on success
- [ ] Delete methods return `Promise<void>`
- [ ] No `try/catch` blocks — let `makeRequest` handle errors
- [ ] No `handleError()` helper method

### Step 3 — Register Service (`src/services/clickup/index.ts`)

- [ ] Export the new service class at the top
- [ ] Import the service class in the factory section
- [ ] Add the service to the `ClickUpServices` interface
- [ ] Instantiate the service in `createClickUpServices()` with `logger.info()`
- [ ] Include in the returned `services` object

### Step 4 — Export Singleton (`src/services/shared.ts`)

- [ ] Destructure the new service from `clickUpServices` and export it

### Step 5 — Implement Tools (`src/tools/myfeature.ts`)

- [ ] One `Tool` definition per API operation (name, description, inputSchema)
- [ ] Always spread `...workspaceParameter` in `inputSchema.properties`
- [ ] Handler functions: validate required params first, then call `getServicesForWorkspace(params)`
- [ ] Return `sponsorService.createResponse(data, true)` on success
- [ ] Return `sponsorService.createErrorResponse(message)` on failure
- [ ] Export a grouped `myfeatureTools = [tool1, tool2, ...]` array

### Step 6 — Register in Server (`src/server.ts`)

- [ ] Import tool definitions, handler functions, and the grouped `myfeatureTools` array
- [ ] Add `...myfeatureTools` to the `allTools` array in `ListToolsRequestSchema` handler
- [ ] Add `case "tool_name": return handleToolName(params as any);` for each tool in the `switch`
- [ ] Update `toolCount` in the `logger.info("Registering tool handlers", ...)` call
- [ ] Add the category name to the `categories` array in the same log call

### Step 7 — Update Documentation

- [ ] Add new tools to the **Available Tools** table in `README.md`
- [ ] Update the tool count in the `README.md` section header (e.g., "42 Total" → "54 Total")
- [ ] Add a row to the **Features** table if it represents a new capability category
- [ ] Update `CLAUDE.md` file architecture if new files were added

### Step 8 — Build & Verify

- [ ] Run `npm run build` — must compile with zero errors
- [ ] Test affected tools manually if possible

---

## Multi-Workspace Support

Every tool handler calls `getServicesForWorkspace(params)` which resolves the correct service
instance based on the optional `workspace` parameter. This is injected automatically into every
tool schema by `tool-enhancer.ts`. No special handling is needed in individual tool files.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `CLICKUP_API_KEY` | Single workspace API key | — |
| `CLICKUP_TEAM_ID` | Single workspace team ID | — |
| `CLICKUP_WORKSPACES` | JSON config for multi-workspace | — |
| `DOCUMENT_SUPPORT` | Enable document tools | `false` |
| `ENABLED_TOOLS` | Comma-separated allowlist | all |
| `DISABLED_TOOLS` | Comma-separated denylist | none |
| `ENABLE_SSE` | Enable HTTP/SSE transport | `false` |
| `PORT` | HTTP server port | `3231` |
| `LOG_LEVEL` | trace/debug/info/warn/error | `error` |
