/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Logger module for MCP Server
 * 
 * This module provides logging functionality for the server,
 * writing logs to only the log file to avoid interfering with JSON-RPC.
 */

import { createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config, { LogLevel } from './config.js';

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Current process ID for logging
const pid = process.pid;

// Create a write stream for logging - use a fixed filename in the build directory
const logFileName = 'server.log';
const logStream = createWriteStream(join(__dirname, logFileName), { flags: 'w' });
// Write init message to log file only
logStream.write(`Logging initialized to ${join(__dirname, logFileName)}\n`);

// Use the configured log level from config.ts
const configuredLevel = config.logLevel;

// Re-export LogLevel enum
export { LogLevel };

/**
 * Check if a log level is enabled based on the configured level
 * @param level The log level to check
 * @returns True if the level should be logged
 */
function isLevelEnabled(level: LogLevel): boolean {
  return level >= configuredLevel;
}

/**
 * Log function that writes only to file to avoid interfering with JSON-RPC
 * @param level Log level (trace, debug, info, warn, error)
 * @param message Message to log
 * @param data Optional data to include in log
 */
function log(level: 'trace' | 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) {
  const levelEnum = level === 'trace' ? LogLevel.TRACE 
    : level === 'debug' ? LogLevel.DEBUG
    : level === 'info' ? LogLevel.INFO
    : level === 'warn' ? LogLevel.WARN 
    : LogLevel.ERROR;
  
  // Skip if level is below configured level
  if (!isLevelEnabled(levelEnum)) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  
  // Format the log message differently based on the level and data
  let logMessage = `[${timestamp}] [PID:${pid}] ${level.toUpperCase()}: ${message}`;
  
  // Format data differently based on content and log level
  if (data) {
    // For debugging and trace levels, try to make the data more readable
    if (level === 'debug' || level === 'trace') {
      // If data is a simple object with few properties, format it inline
      if (typeof data === 'object' && data !== null && !Array.isArray(data) && 
          Object.keys(data).length <= 4 && Object.keys(data).every(k => 
            typeof data[k] !== 'object' || data[k] === null)) {
        const dataStr = Object.entries(data)
          .map(([k, v]) => `${k}=${v === undefined ? 'undefined' : 
            (v === null ? 'null' : 
              (typeof v === 'string' ? `"${v}"` : v))}`)
          .join(' ');
        
        logMessage += ` (${dataStr})`;
      } else {
        // For more complex data, keep the JSON format but on new lines
        logMessage += '\n' + JSON.stringify(data, null, 2);
      }
    } else {
      // For other levels, keep the original JSON format
      logMessage += '\n' + JSON.stringify(data, null, 2);
    }
  }

  // Write to file only, not to stderr which would interfere with JSON-RPC
  logStream.write(logMessage + '\n');
}

/**
 * Shorthand for info level logs
 * @param message Message to log
 * @param data Optional data to include in log
 */
export function info(message: string, data?: any) {
  log('info', message, data);
}

/**
 * Shorthand for error level logs
 * @param message Message to log
 * @param data Optional data to include in log
 */
export function error(message: string, data?: any) {
  log('error', message, data);
}

/**
 * Logger class for creating context-specific loggers
 */
export class Logger {
  private context: string;

  /**
   * Create a new logger with context
   * @param context The context to prepend to log messages
   */
  constructor(context: string) {
    this.context = context;
  }

  /**
   * Check if a log level is enabled for this logger
   * @param level The level to check
   * @returns True if logging at this level is enabled
   */
  isLevelEnabled(level: LogLevel): boolean {
    return isLevelEnabled(level);
  }

  /**
   * Log at trace level
   * @param message Message to log
   * @param data Optional data to include in log
   */
  trace(message: string, data?: any) {
    log('trace', `[${this.context}] ${message}`, data);
  }

  /**
   * Log at debug level
   * @param message Message to log
   * @param data Optional data to include in log
   */
  debug(message: string, data?: any) {
    log('debug', `[${this.context}] ${message}`, data);
  }

  /**
   * Log at info level
   * @param message Message to log
   * @param data Optional data to include in log
   */
  info(message: string, data?: any) {
    log('info', `[${this.context}] ${message}`, data);
  }

  /**
   * Log at warn level
   * @param message Message to log
   * @param data Optional data to include in log
   */
  warn(message: string, data?: any) {
    log('warn', `[${this.context}] ${message}`, data);
  }

  /**
   * Log at error level
   * @param message Message to log
   * @param data Optional data to include in log
   */
  error(message: string, data?: any) {
    log('error', `[${this.context}] ${message}`, data);
  }
}

// Handle SIGTERM for clean shutdown
process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM signal, shutting down...');
  logStream.end(() => {
    process.exit(0);
  });
}); 