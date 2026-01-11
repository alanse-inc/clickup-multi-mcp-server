/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Shared Services Module
 *
 * This module maintains singleton instances of services that should be shared
 * across the application to ensure consistent state.
 * Supports multiple workspaces with lazy initialization.
 */

import { createClickUpServices, ClickUpServices } from './clickup/index.js';
import config, { getWorkspaceConfig, getDefaultWorkspace, getAvailableWorkspaces } from '../config.js';
import { Logger } from '../logger.js';

const logger = new Logger('SharedServices');

// Map of workspace ID to services instance
const workspaceServicesMap = new Map<string, ClickUpServices>();

/**
 * Get or create the ClickUp services instance for a specific workspace
 * @param workspaceId - Workspace identifier (optional, uses default if not specified)
 * @returns ClickUp services instance for the workspace
 */
export function getClickUpServices(workspaceId?: string): ClickUpServices {
  const wsId = workspaceId || getDefaultWorkspace();

  console.error('[DEBUG] getClickUpServices called with workspaceId:', workspaceId);
  console.error('[DEBUG] Resolved workspace ID:', wsId);

  // Check if services already exist for this workspace
  let services = workspaceServicesMap.get(wsId);

  if (!services) {
    logger.info(`Creating ClickUp services for workspace: ${wsId}`);

    // Get workspace configuration
    const workspaceConfig = getWorkspaceConfig(wsId);
    console.error('[DEBUG] Workspace config:', JSON.stringify(workspaceConfig));

    // Create the services instance
    services = createClickUpServices({
      apiKey: workspaceConfig.token,
      teamId: workspaceConfig.teamId
    });

    // Store in map
    workspaceServicesMap.set(wsId, services);

    // Log what services were initialized
    logger.info(`Services initialization complete for workspace: ${wsId}`, {
      services: Object.keys(services).join(', '),
      teamId: workspaceConfig.teamId,
      description: workspaceConfig.description
    });
  }

  return services;
}

/**
 * Get services for all configured workspaces
 * @returns Map of workspace ID to services
 */
export function getAllWorkspaceServices(): Map<string, ClickUpServices> {
  const availableWorkspaces = getAvailableWorkspaces();

  // Initialize services for all workspaces
  for (const wsId of availableWorkspaces) {
    getClickUpServices(wsId);
  }

  return workspaceServicesMap;
}

// Create a default instance of ClickUp services to be shared (for backwards compatibility)
export const clickUpServices = getClickUpServices();

// Export individual services for convenience (uses default workspace)
export const {
  list: listService,
  task: taskService,
  folder: folderService,
  workspace: workspaceService,
  timeTracking: timeTrackingService,
  document: documentService,
  goal: goalService
} = clickUpServices;
