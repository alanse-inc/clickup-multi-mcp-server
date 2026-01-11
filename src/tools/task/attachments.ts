/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Task Attachment Tool
 * 
 * This module implements a tool for attaching files to ClickUp tasks
 * with automatic method selection based on file source and size.
 */

import * as fs from 'fs';
import { promisify } from 'util';
import { createReadStream } from 'fs';
import { Stream } from 'stream';
import { IncomingMessage, request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { 
  ClickUpTask, 
  ClickUpTaskAttachment 
} from '../../services/clickup/types.js';
import { clickUpServices } from '../../services/shared.js';
import { 
  ChunkSession, 
  TaskAttachmentResponse, 
  ChunkedUploadInitResponse, 
  ChunkedUploadProgressResponse 
} from './attachments.types.js';
import { validateTaskIdentification } from './utilities.js';
import { sponsorService } from '../../utils/sponsor-service.js';
import { Logger } from '../../logger.js';

// Use shared services instance
const { task: taskService } = clickUpServices;

// Create a logger instance for attachments
const logger = new Logger('TaskAttachments');

// Session storage for chunked uploads (in-memory for demonstration)
const chunkSessions = new Map<string, ChunkSession>();

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  const expired = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [token, session] of chunkSessions.entries()) {
    if (now - session.timestamp > expired) {
      chunkSessions.delete(token);
      logger.debug(`Cleaned up expired upload session: ${token}`);
    }
  }
}, 3600 * 1000); // Check every hour

/**
 * Single unified tool for attaching files to ClickUp tasks
 */
export const attachTaskFileTool = {
  name: "attach_task_file",
  description: `Attaches file to task. Use taskId (preferred) or taskName + optional listName. File sources: 1) base64 + filename (≤10MB), 2) URL (http/https), 3) local path (absolute), 4) chunked for large files. WARNING: taskName without listName may match multiple tasks.`,
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task to attach the file to. Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
      },
      taskName: {
        type: "string",
        description: "Name of the task to attach the file to. The tool will search for tasks with this name across all lists unless listName is specified."
      },
      listName: {
        type: "string",
        description: "Optional: Name of list containing the task. Providing this narrows the search to a specific list, improving performance and reducing ambiguity."
      },
      file_name: {
        type: "string",
        description: "Name of the file to be attached (include the extension). Required when using file_data."
      },
      file_data: {
        type: "string",
        description: "Base64-encoded content of the file (without the data URL prefix)."
      },
      file_url: {
        type: "string",
        description: "DUAL PURPOSE PARAMETER: Either (1) a web URL starting with http/https to download a file from, OR (2) an absolute local file path starting with / or drive letter. DO NOT use relative paths."
      },
      auth_header: {
        type: "string",
        description: "Optional authorization header to use when downloading from a web URL (ignored for local files)."
      },
      // Advanced parameters for chunked uploads - usually not needed as chunking is automatic
      chunk_index: {
        type: "number",
        description: "Optional: For advanced usage with large file chunking. The 0-based index of this chunk."
      },
      chunk_session: {
        type: "string",
        description: "Optional: For advanced usage with large file chunking. Session identifier from a previous chunk upload."
      },
      chunk_total: {
        type: "number",
        description: "Optional: For advanced usage with large file chunking. Total number of chunks expected."
      },
      chunk_is_last: {
        type: "boolean",
        description: "Optional: For advanced usage with large file chunking. Whether this is the final chunk."
      }
    }
  }
};

/**
 * Handler function for the attachTaskFileTool
 */
async function attachTaskFileHandler(params: any): Promise<any> {
  // Extract common parameters
  const { taskId, taskName, listName, customTaskId, file_name, file_data, file_url, auth_header,
    chunk_total, chunk_size, chunk_index, session_id } = params;
  
  // Validate task identification
  const validationResult = validateTaskIdentification(
    { taskId, taskName, listName, customTaskId },
    { useGlobalLookup: true }
  );
  
  if (!validationResult.isValid) {
    throw new Error(validationResult.errorMessage);
  }
  
  // Validate file source - either file_data or file_url must be provided
  if (!file_data && !file_url && !session_id) {
    throw new Error("Either file_data, file_url, or session_id must be provided");
  }
  
  // Resolve task ID
  const result = await taskService.findTasks({
    taskId,
    taskName,
    listName,
    allowMultipleMatches: false,
    useSmartDisambiguation: true,
    includeFullDetails: false
  });

  if (!result || Array.isArray(result)) {
    throw new Error("Task not found");
  }

  const resolvedTaskId = result.id;
  
  try {
    // CASE 1: Chunked upload continuation
    if (session_id) {
      return await handleChunkUpload(resolvedTaskId, session_id, chunk_index, file_data, chunk_total === chunk_index + 1);
    }
    
    // CASE 2: URL-based upload or local file path
    if (file_url) {
      // Check if it's a local file path
      logger.debug(`Checking if path is local: ${file_url}`);
      if (file_url.startsWith('/') || /^[A-Za-z]:\\/.test(file_url)) {
        logger.debug(`Detected as local path, proceeding to handle: ${file_url}`);
        return await handleLocalFileUpload(resolvedTaskId, file_url, file_name);
      } else if (file_url.startsWith('http://') || file_url.startsWith('https://')) {
        logger.debug(`Detected as URL, proceeding with URL upload: ${file_url}`);
        return await handleUrlUpload(resolvedTaskId, file_url, file_name, auth_header);
      } else {
        throw new Error(`Invalid file_url format: "${file_url}". The file_url parameter must be either an absolute file path (starting with / or drive letter) or a web URL (starting with http:// or https://)`);
      }
    }
    
    // CASE 3: Base64 upload (with automatic chunking for large files)
    if (file_data) {
      if (!file_name) {
        throw new Error("file_name is required when using file_data");
      }
      
      // Check if we need to use chunking (file > 10MB)
      const fileBuffer = Buffer.from(file_data, 'base64');
      const fileSize = fileBuffer.length;
      
      if (fileSize > 10 * 1024 * 1024) {
        // For large files, start chunked upload process
        return await startChunkedUpload(resolvedTaskId, file_name, fileBuffer);
      } else {
        // For small files, upload directly
        return await handleDirectUpload(resolvedTaskId, file_name, fileBuffer);
      }
    }
    
    throw new Error("Invalid parameters: Unable to determine upload method");
  } catch (error) {
    logger.error(`Error attaching file to task:`, error);
    throw error;
  }
}

/**
 * Handle direct upload for small files
 */
async function handleDirectUpload(taskId: string, fileName: string, fileBuffer: Buffer): Promise<TaskAttachmentResponse> {
  try {
    // Call service method
    const result = await taskService.uploadTaskAttachment(taskId, fileBuffer, fileName);
    
    return {
      success: true,
      message: `File "${fileName}" successfully attached to task ${taskId}`,
      attachment: result
    };
  } catch (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Handle URL-based upload
 */
async function handleUrlUpload(taskId: string, fileUrl: string, fileName: string | undefined, authHeader: string | undefined): Promise<TaskAttachmentResponse> {
  try {
    // Extract filename from URL if not provided
    const extractedFileName = fileName || new URL(fileUrl).pathname.split('/').pop() || 'downloaded-file';
    
    // Call service method
    const result = await taskService.uploadTaskAttachmentFromUrl(taskId, fileUrl, extractedFileName, authHeader);
    
    return {
      success: true,
      message: `File from "${fileUrl}" successfully attached to task ${taskId}`,
      attachment: result
    };
  } catch (error) {
    if (error.message === 'Invalid URL') {
      throw new Error(`Failed to upload file from URL: Invalid URL format. The file_url parameter must be a valid web URL starting with http:// or https://`);
    }
    throw new Error(`Failed to upload file from URL: ${error.message}`);
  }
}

/**
 * Start a chunked upload process for large files
 */
async function startChunkedUpload(taskId: string, fileName: string, fileBuffer: Buffer): Promise<ChunkedUploadInitResponse> {
  // Generate a session token
  const sessionToken = `chunk_session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  // Store the file in chunks (for demonstration - in production would store chunk info only)
  // Split the file into chunks for storage
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const chunksMap = new Map<number, Buffer>();
  
  for (let i = 0; i < fileBuffer.length; i += chunkSize) {
    const chunk = fileBuffer.slice(i, i + chunkSize);
    chunksMap.set(Math.floor(i / chunkSize), chunk);
  }
  
  // Create a new session
  chunkSessions.set(sessionToken, {
    taskId,
    fileName,
    fileSize: fileBuffer.length,
    chunks: chunksMap,
    timestamp: Date.now()
  });
  
  // Return initial chunk
  return {
    success: true,
    message: `Large file detected. Chunked upload initialized for "${fileName}" (${fileBuffer.length} bytes)`,
    chunk_session: sessionToken,
    chunks_total: chunksMap.size,
    chunk_uploaded: 1,
    attachment: null,
    details: {
      taskId,
      fileName,
      fileSize: fileBuffer.length,
      chunkCount: chunksMap.size,
      progress: Math.round((1 / chunksMap.size) * 100)
    }
  };
}

/**
 * Handle chunk upload as part of a multi-chunk process
 */
async function handleChunkUpload(
  taskId: string,
  sessionToken: string,
  chunkIndex: number | undefined,
  chunkData: string | undefined,
  isLastChunk: boolean | undefined
): Promise<TaskAttachmentResponse | ChunkedUploadProgressResponse> {
  // Verify session exists
  const session = chunkSessions.get(sessionToken);
  if (!session) {
    throw new Error("Upload session not found or expired");
  }
  
  // If this is the last chunk or all chunks are uploaded, finalize the upload
  if (isLastChunk || (session.chunks.size === 1 && chunkIndex === undefined)) {
    // Combine all chunks
    const fileData = Buffer.allocUnsafe(session.fileSize);
    let offset = 0;
    
    // Sort chunks by index
    const sortedChunks = Array.from(session.chunks.entries())
      .sort((a, b) => a[0] - b[0]);
    
    for (const entry of sortedChunks) {
      const [index, chunk] = entry;
      chunk.copy(fileData, offset);
      offset += chunk.length;
    }
    
    try {
      // Call service method
      const result = await taskService.uploadTaskAttachment(session.taskId, fileData, session.fileName);
      
      // Clean up the session
      chunkSessions.delete(sessionToken);
      
      return {
        success: true,
        message: `File "${session.fileName}" successfully attached to task ${session.taskId}`,
        attachment: result
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
  
  // Otherwise handle the current chunk
  if (chunkIndex === undefined || chunkData === undefined) {
    throw new Error("chunk_index and chunk_data are required for chunk uploads");
  }
  
  // Store the chunk
  // (In a real implementation, we'd append to a temp file or storage)
  session.chunks.delete(chunkIndex); // Remove the chunk if it exists
  session.chunks.set(chunkIndex, Buffer.from(chunkData, 'base64'));
  
  return {
    success: true,
    message: `Chunk ${chunkIndex + 1}/${session.chunks.size} received`,
    chunk_session: sessionToken,
    chunks_remaining: session.chunks.size - chunkIndex - 1,
    details: {
      taskId: session.taskId,
      fileName: session.fileName,
      chunksReceived: chunkIndex + 1,
      progress: Math.round(((chunkIndex + 1) / session.chunks.size) * 100)
    }
  };
}

/**
 * Handle local file path upload
 */
async function handleLocalFileUpload(taskId: string, filePath: string, fileName: string | undefined): Promise<TaskAttachmentResponse> {
  try {
    // Import fs and path modules
    const fs = await import('fs');
    const path = await import('path');
    
    logger.debug(`Processing absolute file path: ${filePath}`);
    
    // Normalize the path to prevent directory traversal attacks
    const normalizedPath = path.normalize(filePath);
    
    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Local file not found: ${normalizedPath}`);
    }
    
    // Validate file stats
    const stats = fs.statSync(normalizedPath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${normalizedPath}`);
    }
    
    // Get file name if not provided
    const extractedFileName = fileName || path.basename(normalizedPath);
    
    // Read file
    const fileBuffer = fs.readFileSync(normalizedPath);
    const fileSize = fileBuffer.length;
    
    logger.debug(`Successfully read file: ${extractedFileName} (${fileSize} bytes)`);
    
    // Choose upload method based on file size
    if (fileSize > 10 * 1024 * 1024) {
      // For large files, start chunked upload process
      return await startChunkedUpload(taskId, extractedFileName, fileBuffer);
    } else {
      // For small files, upload directly
      return await handleDirectUpload(taskId, extractedFileName, fileBuffer);
    }
  } catch (error) {
    if (error.message.includes('ENOENT')) {
      throw new Error(`Failed to upload local file: Local file not found: ${filePath}. Make sure the file exists and the path is absolute.`);
    } else if (error.message.includes('EACCES')) {
      throw new Error(`Failed to upload local file: Permission denied accessing: ${filePath}. Check file permissions.`);
    }
    throw new Error(`Failed to upload local file: ${error.message}`);
  }
}

/**
 * Creates a wrapped handler function with standard error handling and response formatting
 */
function createHandlerWrapper<T>(
  handler: (params: any) => Promise<T>,
  formatResponse: (result: T) => any = (result) => result
) {
  return async (parameters: any) => {
    try {
      const result = await handler(parameters);
      return sponsorService.createResponse(formatResponse(result), true);
    } catch (error) {
      return sponsorService.createErrorResponse(error, parameters);
    }
  };
}

export const handleAttachTaskFile = createHandlerWrapper(attachTaskFileHandler); 