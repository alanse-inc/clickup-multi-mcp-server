/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Workspace Helper Utilities
 *
 * This module provides helper functions for workspace-aware tool operations.
 */

import { getClickUpServices } from '../services/shared.js';
import { getAvailableWorkspaces } from '../config.js';

/**
 * Common workspace parameter schema for all tools
 */
export const workspaceParameter = {
  workspace: {
    type: 'string' as const,
    description: 'Workspace identifier (optional, uses default if not specified)',
    optional: true
  }
};

/**
 * Get services for a specific workspace from tool parameters
 * @param params - Tool parameters that may contain workspace property
 * @returns ClickUp services instance for the specified or default workspace
 */
export function getServicesForWorkspace(params: { workspace?: string }) {
  try {
    console.error('[DEBUG] getServicesForWorkspace called with workspace:', params.workspace);
    const services = getClickUpServices(params.workspace);
    console.error('[DEBUG] Retrieved services for workspace:', params.workspace || 'default');
    return services;
  } catch (error) {
    // Enhance error message with available workspaces
    const available = getAvailableWorkspaces().join(', ');
    throw new Error(
      `${error.message}\nAvailable workspaces: ${available}`
    );
  }
}

/**
 * Extract workspace ID from parameters and remove it before passing to service methods
 * @param params - Tool parameters
 * @returns Tuple of [workspace ID or undefined, params without workspace]
 */
export function extractWorkspace<T extends { workspace?: string }>(
  params: T
): [string | undefined, Omit<T, 'workspace'>] {
  const { workspace, ...rest } = params;
  return [workspace, rest as Omit<T, 'workspace'>];
}
