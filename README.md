<p align="center">
  <img src="assets/images/clickup-social.png" alt="ClickUp Multi-Workspace MCP Server" width="100%">
</p>

<h1 align="center">ClickUp Multi-Workspace MCP Server</h1>

<p align="center">
  <a href="https://github.com/alanse-inc/clickup-multi-mcp-server/stargazers">
    <img src="https://img.shields.io/github/stars/alanse-inc/clickup-multi-mcp-server?style=flat&logo=github" alt="GitHub Stars">
  </a>
  <a href="https://www.npmjs.com/package/@alanse/clickup-multi-mcp-server">
    <img src="https://img.shields.io/npm/v/@alanse/clickup-multi-mcp-server.svg?style=flat&logo=npm" alt="NPM Version">
  </a>
</p>

<p align="center">
  A Model Context Protocol (MCP) server for integrating <strong>multiple ClickUp workspaces</strong> with AI applications. This server allows AI agents to interact with tasks, spaces, lists, and folders across different ClickUp workspaces through a standardized protocol.
</p>

## 🎯 Key Feature: Multi-Workspace Support

This MCP server supports managing multiple ClickUp workspaces simultaneously, allowing you to:
- Work with multiple ClickUp accounts/teams
- Switch between workspaces seamlessly
- Maintain separate configurations for each workspace
- Full backwards compatibility with single workspace setup

Developed and maintained by Alanse Inc.

## Requirements

- **Node.js v18.0.0 or higher** (required for MCP SDK compatibility)
- ClickUp API key and Team ID for each workspace you want to integrate

## Quick Start

### Claude Code CLI Setup

The easiest way to add this MCP server to Claude Code:

**Single Workspace:**
```bash
claude mcp add clickup \
  -e CLICKUP_API_KEY=your_api_key_here \
  -e CLICKUP_TEAM_ID=your_team_id_here \
  -- npx -y @alanse/clickup-multi-mcp-server@latest
```

**Multiple Workspaces:**
```bash
claude mcp add clickup \
  -e CLICKUP_WORKSPACES='{"default":"work","workspaces":{"work":{"token":"pk_xxx_work","teamId":"123456"},"personal":{"token":"pk_xxx_personal","teamId":"789012"}}}' \
  -- npx -y @alanse/clickup-multi-mcp-server@latest
```

### Manual Configuration

### Single Workspace (Backwards Compatible)

The traditional single workspace setup still works exactly as before:

```json
{
  "mcpServers": {
    "ClickUp": {
      "command": "npx",
      "args": ["-y", "@alanse/clickup-multi-mcp-server@latest"],
      "env": {
        "CLICKUP_API_KEY": "your-api-key",
        "CLICKUP_TEAM_ID": "your-team-id"
      }
    }
  }
}
```

### Multiple Workspaces (New Feature)

Configure multiple workspaces using the `CLICKUP_WORKSPACES` environment variable.

**Step 1: Create your workspace configuration**

Create a JSON structure like this:

```json
{
  "default": "work",
  "workspaces": {
    "work": {
      "token": "pk_xxx_work",
      "teamId": "123456",
      "description": "Work workspace"
    },
    "personal": {
      "token": "pk_xxx_personal",
      "teamId": "789012",
      "description": "Personal projects"
    }
  }
}
```

**Step 2: Use in your MCP settings**

You can specify the configuration in a more readable multi-line format:

```jsonc
{
  "mcpServers": {
    "ClickUp": {
      "command": "npx",
      "args": ["-y", "@alanse/clickup-multi-mcp-server@latest"],
      "env": {
        // Multi-line format (most readable)
        "CLICKUP_WORKSPACES": {
          "default": "work",
          "workspaces": {
            "work": {
              "token": "pk_xxx_work",
              "teamId": "123456",
              "description": "Work workspace"
            },
            "personal": {
              "token": "pk_xxx_personal",
              "teamId": "789012",
              "description": "Personal projects"
            }
          }
        }
      }
    }
  }
}
```

Or as a JSON string (if your MCP client requires string format):

```json
{
  "mcpServers": {
    "ClickUp": {
      "command": "npx",
      "args": ["-y", "@alanse/clickup-multi-mcp-server@latest"],
      "env": {
        "CLICKUP_WORKSPACES": "{\"default\":\"work\",\"workspaces\":{\"work\":{\"token\":\"pk_xxx_work\",\"teamId\":\"123456\"},\"personal\":{\"token\":\"pk_xxx_personal\",\"teamId\":\"789012\"}}}"
      }
    }
  }
}
```

**💡 Tip:** Use an online JSON minifier and then escape the quotes, or use a script to generate the escaped string:

```javascript
const config = {
  default: "work",
  workspaces: {
    work: { token: "pk_xxx_work", teamId: "123456", description: "Work workspace" },
    personal: { token: "pk_xxx_personal", teamId: "789012", description: "Personal projects" }
  }
};
console.log(JSON.stringify(config));
// Copy the output and use it as CLICKUP_WORKSPACES value
```

### Using Workspace Parameter

All tools now support an optional `workspace` parameter:

```typescript
// Get tasks from default workspace
await getTasks({ list_id: "123456789" });

// Get tasks from specific workspace
await getTasks({ workspace: "personal", list_id: "987654321" });

// Get workspace hierarchy for a specific workspace
await getWorkspaceHierarchy({ workspace: "work" });
```

## Local Development Setup

For local development or when running the server directly from source code:

### 1. Clone and Install

```bash
git clone https://github.com/alanse-inc/clickup-multi-mcp-server.git
cd clickup-multi-mcp-server
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure your ClickUp credentials:

```bash
cp .env.example .env
```

Edit `.env` file:

```bash
# Multi-workspace configuration
CLICKUP_WORKSPACES={"default":"alanse","workspaces":{"alanse":{"token":"pk_YOUR_TOKEN_1","teamId":"YOUR_TEAM_ID_1","description":"Alanse workspace"},"potz":{"token":"pk_YOUR_TOKEN_2","teamId":"YOUR_TEAM_ID_2","description":"Potz workspace"}}}

# Or use single workspace (legacy)
# CLICKUP_API_KEY=your_api_key_here
# CLICKUP_TEAM_ID=your_team_id_here
```

**Note**: The `.env` file is automatically loaded when the server starts. Environment variables in `.env` are automatically picked up without needing to pass them via command line.

### 3. Build and Run

```bash
# Build the project
npm run build

# Run locally
node build/index.js
```

### 4. Configure Claude Code for Local Development

If you want to use your local build with Claude Code, update `~/.claude.json`:

```json
{
  "mcpServers": {
    "clickup": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/clickup-multi-mcp-server/build/index.js"]
    }
  }
}
```

**Important**: When using local build with Claude Code:
- Environment variables are loaded from `.env` file in the project root
- No need to specify `env` in `~/.claude.json` (unless you want to override `.env` values)
- Rebuild after making changes: `npm run build`

## NPM Installation

This package is available on npm as `@alanse/clickup-multi-mcp-server`.

Add this entry to your client's MCP settings JSON file:

```json
{
  "mcpServers": {
    "ClickUp": {
      "command": "npx",
      "args": [
        "-y",
        "@alanse/clickup-multi-mcp-server@latest"
      ],
      "env": {
        "CLICKUP_API_KEY": "your-api-key",
        "CLICKUP_TEAM_ID": "your-team-id",
        "DOCUMENT_SUPPORT": "true"
      }
    }
  }
}
```

Or use this npx command:

`npx -y @alanse/clickup-multi-mcp-server@latest --env CLICKUP_API_KEY=your-api-key --env CLICKUP_TEAM_ID=your-team-id`

**Obs: if you don't pass "DOCUMENT_SUPPORT": "true", the default is false and document support will not be active.**

### Tool Filtering

You can control which tools are available using two complementary environment variables:

#### ENABLED_TOOLS (Recommended)
Use `ENABLED_TOOLS` to specify exactly which tools should be available:
```bash
# Environment variable
export ENABLED_TOOLS="create_task,get_task,update_task,get_workspace_hierarchy"

# Command line argument
--env ENABLED_TOOLS=create_task,get_task,update_task,get_workspace_hierarchy
```

#### DISABLED_TOOLS (Legacy)
Use `DISABLED_TOOLS` to disable specific tools while keeping all others enabled:
```bash
# Environment variable
export DISABLED_TOOLS="delete_task,delete_bulk_tasks"

# Command line argument
--env DISABLED_TOOLS=delete_task,delete_bulk_tasks
```

#### Precedence Rules
- If `ENABLED_TOOLS` is specified, only those tools will be available (takes precedence over `DISABLED_TOOLS`)
- If only `DISABLED_TOOLS` is specified, all tools except those listed will be available
- If neither is specified, all tools are available (default behavior)

**Example:**
```bash
# Only enable task creation and reading tools
npx -y @alanse/clickup-multi-mcp-server@latest \
  --env CLICKUP_API_KEY=your-api-key \
  --env CLICKUP_TEAM_ID=your-team-id \
  --env ENABLED_TOOLS=create_task,get_task,get_workspace_hierarchy
```

Please filter tools you don't need if you are having issues with the number of tools or any context limitations.

## Running with HTTP Transport Support

The server supports both modern **HTTP Streamable** transport (MCP Inspector compatible) and legacy **SSE (Server-Sent Events)** transport for backwards compatibility.

```json
{
  "mcpServers": {
    "ClickUp": {
      "command": "npx",
      "args": [
        "-y",
        "@alanse/clickup-multi-mcp-server@latest"
      ],
      "env": {
        "CLICKUP_API_KEY": "your-api-key",
        "CLICKUP_TEAM_ID": "your-team-id",
        "ENABLE_SSE": "true",
        "PORT": "3231"
      }
    }
  }
}
```

**Endpoints:**
- **Primary**: `http://127.0.0.1:3231/mcp` (Streamable HTTP)
- **Legacy**: `http://127.0.0.1:3231/sse` (SSE for backwards compatibility)

### Command Line Usage

```bash
npx -y @alanse/clickup-multi-mcp-server@latest --env CLICKUP_API_KEY=your-api-key --env CLICKUP_TEAM_ID=your-team-id --env ENABLE_SSE=true --env PORT=3231
```

Available configuration options:

| Option | Description | Default |
| ------ | ----------- | ------- |
| `ENABLED_TOOLS` | Comma-separated list of tools to enable (takes precedence) | All tools |
| `DISABLED_TOOLS` | Comma-separated list of tools to disable | None |
| `ENABLE_SSE` | Enable the HTTP/SSE transport | `false` |
| `PORT` | Port for the HTTP server | `3231` |
| `ENABLE_STDIO` | Enable the STDIO transport | `true` |
| `ENABLE_SECURITY_FEATURES` | Enable security headers and logging | `false` |
| `ENABLE_HTTPS` | Enable HTTPS/TLS encryption | `false` |
| `ENABLE_ORIGIN_VALIDATION` | Validate Origin header against whitelist | `false` |
| `ENABLE_RATE_LIMIT` | Enable rate limiting protection | `false` |

### 🔒 Security Features

The server includes optional security enhancements for production deployments. All security features are **opt-in** and **disabled by default** to maintain backwards compatibility.

**Quick security setup:**
```bash
# Generate SSL certificates for HTTPS
./scripts/generate-ssl-cert.sh

# Start with full security
ENABLE_SECURITY_FEATURES=true \
ENABLE_HTTPS=true \
ENABLE_ORIGIN_VALIDATION=true \
ENABLE_RATE_LIMIT=true \
SSL_KEY_PATH=./ssl/server.key \
SSL_CERT_PATH=./ssl/server.crt \
npx @alanse/clickup-multi-mcp-server@latest --env CLICKUP_API_KEY=your-key --env CLICKUP_TEAM_ID=your-team --env ENABLE_SSE=true
```

**HTTPS Endpoints:**
- **Primary**: `https://127.0.0.1:3443/mcp` (Streamable HTTPS)
- **Legacy**: `https://127.0.0.1:3443/sse` (SSE HTTPS for backwards compatibility)
- **Health**: `https://127.0.0.1:3443/health` (Health check)

For detailed security configuration, see [Security Features Documentation](docs/security-features.md).

#### n8n Integration

To integrate with n8n:

1. Start the clickup-mcp-server with SSE enabled
2. In n8n, add a new "MCP AI Tool" node
3. Configure the node with:
   - Transport: SSE
   - Server URL: `http://localhost:3231` (or your server address)
   - Tools: Select the ClickUp tools you want to use

#### Example Client

An example SSE client is provided in the `examples` directory. To run it:

```bash
# Start the server with SSE enabled
ENABLE_SSE=true PORT=3231 npx -y @alanse/clickup-multi-mcp-server@latest --env CLICKUP_API_KEY=your-api-key --env CLICKUP_TEAM_ID=your-team-id

# In another terminal, run the example client
cd examples
npm install
npm run sse-client
```

## Features

| 📝 Task Management                                                                                                                                                                                                                                                   | 🏷️ Tag Management                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| • Create, update, and delete tasks<br>• Move and duplicate tasks anywhere<br>• Support for single and bulk operations<br>• Set start/due dates with natural language<br>• Create and manage subtasks<br>• Add comments and attachments | • Create, update, and delete space tags<br>• Add and remove tags from tasks<br>• Use natural language color commands<br>• Automatic contrasting foreground colors<br>• View all space tags<br>• Tag-based task organization across workspace |
| ⏱️ **Time Tracking**                                                                                                                                                                                                                                          | 🌳 **Workspace Organization**                                                                                                                                                                                                                                         |
| • View time entries for tasks<br>• Start/stop time tracking on tasks<br>• Add manual time entries<br>• Delete time entries<br>• View currently running timer<br>• Track billable and non-billable time                                 | • Navigate spaces, folders, and lists<br>• Create and manage folders<br>• Organize lists within spaces<br>• Create lists in folders<br>• View workspace hierarchy<br>• Efficient path navigation                                             |
| 📄 **Document Management**                                                                                                                                                                                                                                      | 👥 **Member Management**                                                                                                                                                                                                                                             |
| • Document Listing through all workspace<br>• Document Page listing<br>• Document Page Details<br>• Document Creation<br>• Document page update (append & prepend)                                                                       | • Find workspace members by name or email<br>• Resolve assignees for tasks<br>• View member details and permissions<br>• Assign tasks to users during creation and updates<br>• Support for user IDs, emails, or usernames<br>• Team-wide user management                            |
| ⚡ **Integration Features**                                                                                                                                                                                                                                      | 🏗️ **Architecture & Performance**                                                                                                                                                                                                                                        |
| • Global name or ID-based lookups<br>• Case-insensitive matching<br>• Markdown formatting support<br>• Built-in rate limiting<br>• Error handling and validation<br>• Comprehensive API coverage                                             | • **70% codebase reduction** for improved performance<br>• **Unified architecture** across all transport types<br>• **Zero code duplication**<br>• **HTTP Streamable transport** (MCP Inspector compatible)<br>• **Legacy SSE support** for backwards compatibility |

## Available Tools (42 Total)

| Tool                                                               | Description                     | Required Parameters                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [get_workspace_hierarchy](docs/user-guide.md#workspace-navigation) | Get workspace structure         | None                                                                                                                         |
| [get_available_workspaces](docs/user-guide.md#workspace-navigation) | Get all available workspaces    | None                                                                                                                         |
| [create_task](docs/user-guide.md#task-management)                  | Create a task                   | `name`, (`listId`/`listName`)                                                                                          |
| [create_bulk_tasks](docs/user-guide.md#task-management)            | Create multiple tasks           | `tasks[]`                                                                                                                  |
| [update_task](docs/user-guide.md#task-management)                  | Modify task                     | `taskId`/`taskName`                                                                                                      |
| [update_bulk_tasks](docs/user-guide.md#task-management)            | Update multiple tasks           | `tasks[]` with IDs or names                                                                                                |
| [get_tasks](docs/user-guide.md#task-management)                    | Get tasks from list             | `listId`/`listName`                                                                                                      |
| [get_task](docs/user-guide.md#task-management)                     | Get single task details         | `taskId`/`taskName` (with smart disambiguation)                                                                          |
| [get_workspace_tasks](docs/user-guide.md#task-management)          | Get tasks with filtering        | At least one filter (tags, list_ids, space_ids, etc.)                                                                        |
| [get_task_comments](docs/user-guide.md#task-management)            | Get comments on a task          | `taskId`/`taskName`                                                                                                      |
| [create_task_comment](docs/user-guide.md#task-management)          | Add a comment to a task         | `commentText`, (`taskId`/(`taskName`+`listName`))                                                                    |
| [attach_task_file](docs/user-guide.md#task-management)             | Attach file to a task           | `taskId`/`taskName`, (`file_data` or `file_url`)                                                                     |
| [delete_task](docs/user-guide.md#task-management)                  | Remove task                     | `taskId`/`taskName`                                                                                                      |
| [delete_bulk_tasks](docs/user-guide.md#task-management)            | Remove multiple tasks           | `tasks[]` with IDs or names                                                                                                |
| [move_task](docs/user-guide.md#task-management)                    | Move task                       | `taskId`/`taskName`, `listId`/`listName`                                                                             |
| [move_bulk_tasks](docs/user-guide.md#task-management)              | Move multiple tasks             | `tasks[]` with IDs or names, target list                                                                                   |
| [duplicate_task](docs/user-guide.md#task-management)               | Copy task                       | `taskId`/`taskName`, `listId`/`listName`                                                                             |
| [merge_task](docs/user-guide.md#task-management)                   | Merge two tasks                 | `taskId`, `mergeFromId`                                                                                                  |
| [get_task_time_in_status](docs/user-guide.md#task-management)      | Get time in status for a task   | `taskId`/`taskName`                                                                                                      |
| [get_bulk_tasks_time_in_status](docs/user-guide.md#task-management)| Get bulk time in status         | `taskIds[]`                                                                                                              |
| [add_task_to_list](docs/user-guide.md#list-management)             | Add task to additional list     | `listId`, `taskId`                                                                                                       |
| [remove_task_from_list](docs/user-guide.md#list-management)        | Remove task from list           | `listId`, `taskId`                                                                                                       |
| [create_list](docs/user-guide.md#list-management)                  | Create list in space            | `name`, `spaceId`/`spaceName`                                                                                          |
| [create_folder](docs/user-guide.md#folder-management)              | Create folder                   | `name`, `spaceId`/`spaceName`                                                                                          |
| [create_list_in_folder](docs/user-guide.md#list-management)        | Create list in folder           | `name`, `folderId`/`folderName`                                                                                        |
| [get_folder](docs/user-guide.md#folder-management)                 | Get folder details              | `folderId`/`folderName`                                                                                                  |
| [update_folder](docs/user-guide.md#folder-management)              | Update folder properties        | `folderId`/`folderName`                                                                                                  |
| [delete_folder](docs/user-guide.md#folder-management)              | Delete folder                   | `folderId`/`folderName`                                                                                                  |
| [get_list](docs/user-guide.md#list-management)                     | Get list details                | `listId`/`listName`                                                                                                      |
| [update_list](docs/user-guide.md#list-management)                  | Update list properties          | `listId`/`listName`                                                                                                      |
| [delete_list](docs/user-guide.md#list-management)                  | Delete list                     | `listId`/`listName`                                                                                                      |
| [get_space_tags](docs/user-guide.md#tag-management)                | Get space tags                  | `spaceId`/`spaceName`                                                                                                    |
| [create_space_tag](docs/user-guide.md#tag-management)              | Create tag                      | `tagName`, `spaceId`/`spaceName`                                                                                       |
| [update_space_tag](docs/user-guide.md#tag-management)              | Update tag                      | `tagName`, `spaceId`/`spaceName`                                                                                       |
| [delete_space_tag](docs/user-guide.md#tag-management)              | Delete tag                      | `tagName`, `spaceId`/`spaceName`                                                                                       |
| [add_tag_to_task](docs/user-guide.md#tag-management)               | Add tag to task                 | `tagName`, `taskId`/(`taskName`+`listName`)                                                                          |
| [remove_tag_from_task](docs/user-guide.md#tag-management)          | Remove tag from task            | `tagName`, `taskId`/(`taskName`+`listName`)                                                                          |
| [get_task_time_entries](docs/user-guide.md#time-tracking)          | Get time entries for a task     | `taskId`/`taskName`                                                                                                      |
| [start_time_tracking](docs/user-guide.md#time-tracking)            | Start time tracking on a task   | `taskId`/`taskName`                                                                                                      |
| [stop_time_tracking](docs/user-guide.md#time-tracking)             | Stop current time tracking      | None                                                                                                                         |
| [add_time_entry](docs/user-guide.md#time-tracking)                 | Add manual time entry to a task | `taskId`/`taskName`, `start`, `duration`                                                                             |
| [delete_time_entry](docs/user-guide.md#time-tracking)              | Delete a time entry             | `timeEntryId`                                                                                                              |
| [get_current_time_entry](docs/user-guide.md#time-tracking)         | Get currently running timer     | None                                                                                                                         |
| [get_workspace_members](docs/user-guide.md#member-management)      | Get all workspace members       | None                                                                                                                         |
| [find_member_by_name](docs/user-guide.md#member-management)        | Find member by name or email    | `nameOrEmail`                                                                                                               |
| [resolve_assignees](docs/user-guide.md#member-management)          | Resolve member names to IDs     | `assignees[]`                                                                                                              |
| [create_document](docs/user-guide.md#document-management)          | Create a document               | `workspaceId`, `name`, `parentId`/`parentType`, `visibility`, `create_pages`                                     |
| [get_document](docs/user-guide.md#document-management)             | Get a document                  | `workspaceId`/`documentId`                                                                                               |
| [list_documents](docs/user-guide.md#document-management)           | List documents                  | `workspaceId`, `documentId`/`creator`/`deleted`/`archived`/`parent_id`/`parent_type`/`limit`/`next_cursor` |
| [list_document_pages](docs/user-guide.md#document-management)      | List document pages             | `documentId`/`documentName`                                                                                              |
| [get_document_pages](docs/user-guide.md#document-management)       | Get document pages              | `documentId`/`documentName`, `pageIds`                                                                                 |
| [create_document_pages](docs/user-guide.md#document-management)    | Create a document page          | `workspaceId`/`documentId`, `parent_page_id`/`name`/`sub_title`,`content`/`content_format`                     |
| [update_document_page](docs/user-guide.md#document-management)     | Update a document page          | `workspaceId`/`documentId`, `name`/`sub_title`,`content`/`content_edit_mode`/`content_format`                  |

See [full documentation](docs/user-guide.md) for optional parameters and advanced usage.

## Member Management Tools

When creating or updating tasks, you can assign users using the `assignees` parameter. The parameter accepts an array of user IDs, emails, or usernames:

**Creating tasks with assignees:**
```json
{
  "name": "New Task",
  "description": "This is a new task.",
  "assignees": ["jdoe@example.com", "Jane Smith"]  // Emails, usernames, or user IDs
}
```

**Updating task assignees:**
```json
{
  "taskId": "abc123",
  "assignees": ["newuser@example.com"]  // Replace existing assignees
}
```

The member management tools help resolve user references when needed.

## Prompts

Not yet implemented and not supported by all client apps. Request a feature for a Prompt implementation that would be most beneficial for your workflow (without it being too specific). Examples:

| Prompt                                             | Purpose                   | Features                                  |
| -------------------------------------------------- | ------------------------- | ----------------------------------------- |
| [summarize_tasks](docs/user-guide.md#prompts)      | Task overview             | Status summary, priorities, relationships |
| [analyze_priorities](docs/user-guide.md#prompts)   | Priority optimization     | Distribution analysis, sequencing         |
| [generate_description](docs/user-guide.md#prompts) | Task description creation | Objectives, criteria, dependencies        |

## Error Handling

The server provides clear error messages for:

- Missing required parameters
- Invalid IDs or names
- Items not found
- Permission issues
- API errors
- Rate limiting

The `LOG_LEVEL` environment variable can be specified to control the verbosity of server logs. Valid values are `trace`, `debug`, `info`, `warn`, and `error` (default).
This can be also be specified on the command line as, e.g. `--env LOG_LEVEL=info`.


## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
