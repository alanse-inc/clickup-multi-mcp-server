/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-FileCopyrightText: © 2025 Daichi Okazaki (Alanse)
 * SPDX-License-Identifier: MIT
 *
 * Response Service Module
 *
 * Provides utilities for creating standardized MCP responses
 */

import { Logger } from '../logger.js';

// Create logger instance for this module
const logger = new Logger('ResponseService');

/**
 * ResponseService - Provides standardized response formatting
 */
export class ResponseService {
  constructor() {
    logger.info('ResponseService initialized');
  }

  /**
   * Creates a standardized response
   */
  public createResponse(data: any, _includeSponsorMessage: boolean = false): { content: { type: string; text: string }[] } {
    const content: { type: string; text: string }[] = [];

    // Special handling for workspace hierarchy which contains a preformatted tree
    if (data && typeof data === 'object' && 'hierarchy' in data && typeof data.hierarchy === 'string') {
      // Handle workspace hierarchy specially - it contains a preformatted tree
      content.push({
        type: "text",
        text: data.hierarchy
      });
    } else if (typeof data === 'string') {
      // If it's already a string, use it directly
      content.push({
        type: "text",
        text: data
      });
    } else {
      // Otherwise, stringify the JSON object
      content.push({
        type: "text",
        text: JSON.stringify(data, null, 2)
      });
    }

    return { content };
  }

  /**
   * Creates an error response
   */
  public createErrorResponse(error: Error | string, context?: any): { content: { type: string; text: string }[] } {
    return this.createResponse({
      error: typeof error === 'string' ? error : error.message,
      ...context
    });
  }

  /**
   * Creates a bulk operation response
   */
  public createBulkResponse(result: any): { content: { type: string; text: string }[] } {
    return this.createResponse({
      success: true,
      total: result.totals.total,
      successful: result.totals.success,
      failed: result.totals.failure,
      failures: result.failed.map((failure: any) => ({
        id: failure.item?.id || failure.item,
        error: failure.error.message
      }))
    });
  }
}

// Export a singleton instance for backwards compatibility
// (keeping the name 'sponsorService' to avoid changing all imports)
export const sponsorService = new ResponseService(); 