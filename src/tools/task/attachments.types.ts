/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Task Attachment Types
 * 
 * This module defines types for file attachment operations.
 */

import { ClickUpTaskAttachment } from '../../services/clickup/types.js';

/**
 * Session data for chunked file uploads
 */
export interface ChunkSession {
  taskId: string;
  fileName: string;
  fileSize: number;
  chunks: Map<number, Buffer>;
  timestamp: number;
}

/**
 * Response for successful task attachment
 */
export interface TaskAttachmentResponse {
  success: boolean;
  message: string;
  attachment: ClickUpTaskAttachment | null;
}

/**
 * Response for chunked upload initialization
 */
export interface ChunkedUploadInitResponse {
  success: boolean;
  message: string;
  chunk_session: string;
  chunks_total: number;
  chunk_uploaded: number;
  attachment: null;
  details: {
    taskId: string;
    fileName: string;
    fileSize: number;
    chunkCount: number;
    progress: number;
  };
}

/**
 * Response for chunked upload progress
 */
export interface ChunkedUploadProgressResponse {
  success: boolean;
  message: string;
  chunk_session: string;
  chunks_remaining: number;
  details: {
    taskId: string;
    fileName: string;
    chunksReceived: number;
    progress: number;
  };
} 