/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Tool Enhancer Utilities
 *
 * This module provides utilities to enhance existing tool definitions with workspace support.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { workspaceParameter } from './workspace-helper.js';

/**
 * Enhance a tool definition with workspace parameter
 * @param tool - Original tool definition
 * @returns Enhanced tool with workspace parameter
 */
export function enhanceToolWithWorkspace(tool: Tool): Tool {
  // Clone the tool to avoid modifying the original
  const enhanced: Tool = {
    ...tool,
    inputSchema: {
      type: 'object' as const,
      ...(tool.inputSchema || {}),
      properties: {
        ...(tool.inputSchema?.properties || {}),
        ...workspaceParameter
      }
    }
  };

  return enhanced;
}

/**
 * Enhance multiple tools with workspace parameter
 * @param tools - Array of tool definitions
 * @returns Array of enhanced tools
 */
export function enhanceToolsWithWorkspace(tools: Tool[]): Tool[] {
  return tools.map(enhanceToolWithWorkspace);
}
