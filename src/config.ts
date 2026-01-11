/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Configuration handling for ClickUp API credentials and application settings
 *
 * Multiple workspace support:
 * - CLICKUP_WORKSPACES: JSON string with workspace configurations (takes precedence)
 * - CLICKUP_API_KEY and CLICKUP_TEAM_ID: Legacy single workspace mode (backwards compatible)
 *
 * The document support is optional and can be passed via command line arguments.
 * The default value is 'false' (string), which means document support will be disabled if
 * no parameter is passed. Pass it as 'true' (string) to enable it.
 *
 * Tool filtering options:
 * - ENABLED_TOOLS: Comma-separated list of tools to enable (takes precedence over DISABLED_TOOLS)
 * - DISABLED_TOOLS: Comma-separated list of tools to disable (ignored if ENABLED_TOOLS is specified)
 *
 * Server transport options:
 * - ENABLE_SSE: Enable Server-Sent Events transport (default: false)
 * - SSE_PORT: Port for SSE server (default: 3000)
 * - ENABLE_STDIO: Enable STDIO transport (default: true)
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Parse any command line environment arguments
const args = process.argv.slice(2);
const envArgs: { [key: string]: string } = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--env' && i + 1 < args.length) {
    const [key, value] = args[i + 1].split('=');
    if (key === 'CLICKUP_API_KEY') envArgs.clickupApiKey = value;
    if (key === 'CLICKUP_TEAM_ID') envArgs.clickupTeamId = value;
    if (key === 'CLICKUP_WORKSPACES') envArgs.clickupWorkspaces = value;
    if (key === 'DOCUMENT_SUPPORT') envArgs.documentSupport = value;
    if (key === 'LOG_LEVEL') envArgs.logLevel = value;
    if (key === 'DISABLED_TOOLS') envArgs.disabledTools = value;
    if (key === 'ENABLED_TOOLS') envArgs.enabledTools = value;
    if (key === 'ENABLE_SSE') envArgs.enableSSE = value;
    if (key === 'SSE_PORT') envArgs.ssePort = value;
    if (key === 'ENABLE_STDIO') envArgs.enableStdio = value;
    if (key === 'PORT') envArgs.port = value;
    i++;
  }
}

// Log levels enum
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

// Parse LOG_LEVEL string to LogLevel enum
const parseLogLevel = (levelStr: string | undefined): LogLevel => {
  if (!levelStr) return LogLevel.ERROR; // Default to ERROR if not specified

  switch (levelStr.toUpperCase()) {
    case 'TRACE': return LogLevel.TRACE;
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    default:
      // Don't use console.error as it interferes with JSON-RPC communication
      return LogLevel.ERROR;
  }
};

// Workspace configuration for multi-workspace support
export interface WorkspaceConfig {
  token: string;
  teamId: string;
  description?: string;
}

// Multiple workspaces configuration
export interface ClickUpWorkspacesConfig {
  default: string;
  workspaces: Record<string, WorkspaceConfig>;
}

// Define required configuration interface
interface Config {
  clickupApiKey: string;
  clickupTeamId: string;
  clickupWorkspaces?: ClickUpWorkspacesConfig;
  documentSupport: string;
  logLevel: LogLevel;
  disabledTools: string[];
  enabledTools: string[];
  enableSSE: boolean;
  ssePort: number;
  enableStdio: boolean;
  port?: string;
  // Security configuration (opt-in for backwards compatibility)
  enableSecurityFeatures: boolean;
  enableOriginValidation: boolean;
  enableRateLimit: boolean;
  enableCors: boolean;
  allowedOrigins: string[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
  maxRequestSize: string;
  // HTTPS configuration
  enableHttps: boolean;
  httpsPort?: string;
  sslKeyPath?: string;
  sslCertPath?: string;
  sslCaPath?: string;
}

// Parse boolean string
const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Parse integer string
const parseInteger = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Parse comma-separated origins list
const parseOrigins = (value: string | undefined, defaultValue: string[]): string[] => {
  if (!value) return defaultValue;
  return value.split(',').map(origin => origin.trim()).filter(origin => origin !== '');
};

// Parse workspace configuration
const parseWorkspaces = (): ClickUpWorkspacesConfig | undefined => {
  const workspacesJson = envArgs.clickupWorkspaces || process.env.CLICKUP_WORKSPACES;

  if (workspacesJson) {
    try {
      const parsed = JSON.parse(workspacesJson);
      // Validate the structure
      if (!parsed.default || !parsed.workspaces || typeof parsed.workspaces !== 'object') {
        throw new Error('Invalid CLICKUP_WORKSPACES format: must have "default" and "workspaces" properties');
      }
      // Validate each workspace has required fields
      for (const [key, workspace] of Object.entries(parsed.workspaces)) {
        const ws = workspace as any;
        if (!ws.token || !ws.teamId) {
          throw new Error(`Invalid workspace "${key}": must have "token" and "teamId" properties`);
        }
      }
      return parsed as ClickUpWorkspacesConfig;
    } catch (error) {
      throw new Error(`Failed to parse CLICKUP_WORKSPACES: ${error.message}`);
    }
  }

  return undefined;
};

// Load configuration from command line args or environment variables
const configuration: Config = {
  clickupApiKey: envArgs.clickupApiKey || process.env.CLICKUP_API_KEY || '',
  clickupTeamId: envArgs.clickupTeamId || process.env.CLICKUP_TEAM_ID || '',
  clickupWorkspaces: parseWorkspaces(),
  documentSupport: envArgs.documentSupport || process.env.DOCUMENT_SUPPORT || process.env.DOCUMENT_MODULE || process.env.DOCUMENT_MODEL || 'false',
  logLevel: parseLogLevel(envArgs.logLevel || process.env.LOG_LEVEL),
  disabledTools: (
    (envArgs.disabledTools || process.env.DISABLED_TOOLS || process.env.DISABLED_COMMANDS)?.split(',').map(cmd => cmd.trim()).filter(cmd => cmd !== '') || []
  ),
  enabledTools: (
    (envArgs.enabledTools || process.env.ENABLED_TOOLS)?.split(',').map(cmd => cmd.trim()).filter(cmd => cmd !== '') || []
  ),
  enableSSE: parseBoolean(envArgs.enableSSE || process.env.ENABLE_SSE, false),
  ssePort: parseInteger(envArgs.ssePort || process.env.SSE_PORT, 3000),
  enableStdio: parseBoolean(envArgs.enableStdio || process.env.ENABLE_STDIO, true),
  port: envArgs.port || process.env.PORT || '3231',
  // Security configuration (opt-in for backwards compatibility)
  enableSecurityFeatures: parseBoolean(process.env.ENABLE_SECURITY_FEATURES, false),
  enableOriginValidation: parseBoolean(process.env.ENABLE_ORIGIN_VALIDATION, false),
  enableRateLimit: parseBoolean(process.env.ENABLE_RATE_LIMIT, false),
  enableCors: parseBoolean(process.env.ENABLE_CORS, false),
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS, [
    'http://127.0.0.1:3231',
    'http://localhost:3231',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'https://127.0.0.1:3443',
    'https://localhost:3443',
    'https://127.0.0.1:3231',
    'https://localhost:3231'
  ]),
  rateLimitMax: parseInteger(process.env.RATE_LIMIT_MAX, 100),
  rateLimitWindowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
  // HTTPS configuration
  enableHttps: parseBoolean(process.env.ENABLE_HTTPS, false),
  httpsPort: process.env.HTTPS_PORT || '3443',
  sslKeyPath: process.env.SSL_KEY_PATH,
  sslCertPath: process.env.SSL_CERT_PATH,
  sslCaPath: process.env.SSL_CA_PATH,
};

// Don't log to console as it interferes with JSON-RPC communication

// Validate configuration
// If CLICKUP_WORKSPACES is provided, use it (multi-workspace mode)
// Otherwise, require CLICKUP_API_KEY and CLICKUP_TEAM_ID (single workspace mode)
if (configuration.clickupWorkspaces) {
  // Multi-workspace mode - validate workspace configuration
  const defaultWorkspace = configuration.clickupWorkspaces.default;
  if (!configuration.clickupWorkspaces.workspaces[defaultWorkspace]) {
    throw new Error(
      `Default workspace "${defaultWorkspace}" not found in workspaces configuration`
    );
  }
} else {
  // Single workspace mode (backwards compatible) - validate legacy variables
  const requiredVars = ['clickupApiKey', 'clickupTeamId'];
  const missingEnvVars = requiredVars
    .filter(key => !configuration[key as keyof Config])
    .map(key => key);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}. ` +
      `Either provide CLICKUP_API_KEY and CLICKUP_TEAM_ID, or CLICKUP_WORKSPACES for multi-workspace support.`
    );
  }
}

/**
 * Get workspace configuration by workspace identifier
 * @param workspaceId - Workspace identifier (optional, uses default if not specified)
 * @returns Workspace configuration with token and teamId
 */
export function getWorkspaceConfig(workspaceId?: string): WorkspaceConfig {
  if (configuration.clickupWorkspaces) {
    // Multi-workspace mode
    const wsId = workspaceId || configuration.clickupWorkspaces.default;
    const workspace = configuration.clickupWorkspaces.workspaces[wsId];

    if (!workspace) {
      const available = Object.keys(configuration.clickupWorkspaces.workspaces).join(', ');
      throw new Error(
        `Workspace "${wsId}" not found. Available workspaces: ${available}`
      );
    }

    return workspace;
  } else {
    // Single workspace mode (backwards compatible)
    if (workspaceId && workspaceId !== 'default') {
      throw new Error(
        `Multiple workspaces not configured. Only default workspace is available. ` +
        `Set CLICKUP_WORKSPACES environment variable to enable multi-workspace support.`
      );
    }

    return {
      token: configuration.clickupApiKey,
      teamId: configuration.clickupTeamId,
      description: 'Default workspace'
    };
  }
}

/**
 * Get list of available workspace identifiers
 * @returns Array of workspace identifiers
 */
export function getAvailableWorkspaces(): string[] {
  if (configuration.clickupWorkspaces) {
    return Object.keys(configuration.clickupWorkspaces.workspaces);
  } else {
    return ['default'];
  }
}

/**
 * Get the default workspace identifier
 * @returns Default workspace identifier
 */
export function getDefaultWorkspace(): string {
  if (configuration.clickupWorkspaces) {
    return configuration.clickupWorkspaces.default;
  } else {
    return 'default';
  }
}

export default configuration;
