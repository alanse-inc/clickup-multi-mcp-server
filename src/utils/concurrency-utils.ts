/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Concurrency Utilities
 * 
 * This module provides utilities for handling concurrent operations,
 * batch processing, rate limiting, and retry logic.
 */

import { Logger } from '../logger.js';

// Create logger instance for this module
const logger = new Logger('ConcurrencyUtils');

/**
 * Options for batch processing
 */
export interface BatchProcessingOptions {
  /** Maximum items to process in a single batch (default: 10) */
  batchSize?: number;
  /** Maximum concurrent operations (default: 3) */
  concurrency?: number;
  /** Whether to continue processing if some operations fail (default: true) */
  continueOnError?: boolean;
  /** Number of retry attempts for failed operations (default: 3) */
  retryCount?: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Whether to use exponential backoff for retries (default: true) */
  exponentialBackoff?: boolean;
  /** Callback for tracking progress */
  progressCallback?: (completed: number, total: number, successes: number, failures: number) => void;
}

/**
 * Results of batch processing
 */
export interface BatchResult<T> {
  /** Array of successful operation results */
  successful: T[];
  /** Array of failed operations with context */
  failed: Array<{ item: any, error: Error, index: number }>;
  /** Summary totals */
  totals: {
    /** Total number of successful operations */
    success: number;
    /** Total number of failed operations */
    failure: number;
    /** Total operations attempted */
    total: number;
  };
}

/**
 * Process a collection of items in batches with configurable concurrency
 * 
 * This utility handles:
 * - Breaking items into manageable batches
 * - Processing multiple items concurrently
 * - Retrying failed operations with backoff
 * - Tracking progress and aggregating results
 * - Graceful error handling
 * 
 * @param items Array of items to process
 * @param processor Function that processes a single item
 * @param options Configuration options for batch processing
 * @returns Results of the processing with success and failure information
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options?: BatchProcessingOptions
): Promise<BatchResult<R>> {
  // Apply default options
  const opts: Required<BatchProcessingOptions> = {
    batchSize: options?.batchSize ?? 10,
    concurrency: options?.concurrency ?? 3,
    continueOnError: options?.continueOnError ?? true,
    retryCount: options?.retryCount ?? 3,
    retryDelay: options?.retryDelay ?? 1000,
    exponentialBackoff: options?.exponentialBackoff ?? true,
    progressCallback: options?.progressCallback ?? (() => {})
  };

  // Initialize results
  const result: BatchResult<R> = {
    successful: [],
    failed: [],
    totals: {
      success: 0,
      failure: 0,
      total: items.length
    }
  };

  // Handle empty input array
  if (items.length === 0) {
    logger.info('processBatch called with empty items array');
    return result;
  }

  try {
    const totalBatches = Math.ceil(items.length / opts.batchSize);
    let processedItems = 0;

    logger.info(`Starting batch processing of ${items.length} items`, {
      totalBatches,
      batchSize: opts.batchSize,
      concurrency: opts.concurrency
    });

    // Process items in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * opts.batchSize;
      const endIdx = Math.min(startIdx + opts.batchSize, items.length);
      const batch = items.slice(startIdx, endIdx);
      
      logger.debug(`Processing batch ${batchIndex + 1}/${totalBatches}`, {
        batchSize: batch.length,
        startIdx,
        endIdx
      });

      // Process the current batch
      const batchResults = await processSingleBatch(
        batch, 
        processor,
        startIdx, 
        opts
      );

      // Aggregate results
      result.successful.push(...batchResults.successful);
      result.failed.push(...batchResults.failed);
      result.totals.success += batchResults.totals.success;
      result.totals.failure += batchResults.totals.failure;

      // Stop processing if an error occurred and continueOnError is false
      if (batchResults.totals.failure > 0 && !opts.continueOnError) {
        logger.warn(`Stopping batch processing due to failure and continueOnError=false`, {
          failedItems: batchResults.totals.failure
        });
        break;
      }

      // Update progress
      processedItems += batch.length;
      opts.progressCallback(
        processedItems, 
        items.length, 
        result.totals.success, 
        result.totals.failure
      );
    }

    logger.info(`Batch processing completed`, {
      totalItems: items.length,
      successful: result.totals.success,
      failed: result.totals.failure
    });

    return result;
  } catch (error: any) {
    logger.error(`Unexpected error in batch processing`, {
      error: error.message || String(error)
    });

    // Add any unprocessed items as failures
    const processedCount = result.totals.success + result.totals.failure;
    if (processedCount < items.length) {
      const remainingItems = items.slice(processedCount);
      for (let i = 0; i < remainingItems.length; i++) {
        const index = processedCount + i;
        result.failed.push({
          item: remainingItems[i],
          error: new Error('Batch processing failed: ' + (error.message || 'Unknown error')),
          index
        });
        result.totals.failure++;
      }
    }

    return result;
  }
}

/**
 * Process a single batch of items with concurrency
 * 
 * @param batch The batch of items to process
 * @param processor The function to process each item
 * @param startIndex The starting index of the batch in the original array
 * @param opts Processing options
 * @returns Results for this batch
 */
async function processSingleBatch<T, R>(
  batch: T[],
  processor: (item: T, index: number) => Promise<R>,
  startIndex: number,
  opts: Required<BatchProcessingOptions>
): Promise<BatchResult<R>> {
  const result: BatchResult<R> = {
    successful: [],
    failed: [],
    totals: {
      success: 0,
      failure: 0,
      total: batch.length
    }
  };

  try {
    // Process items in concurrent chunks
    for (let i = 0; i < batch.length; i += opts.concurrency) {
      const concurrentBatch = batch.slice(i, Math.min(i + opts.concurrency, batch.length));
      
      // Create a promise for each item in the concurrent batch
      const promises = concurrentBatch.map((item, idx) => {
        const index = startIndex + i + idx;
        return processWithRetry(
          () => processor(item, index),
          item,
          index,
          opts
        );
      });

      // Wait for all promises to settle (either resolve or reject)
      const results = await Promise.allSettled(promises);
      
      // Process the results
      results.forEach((promiseResult, idx) => {
        const index = startIndex + i + idx;
        
        if (promiseResult.status === 'fulfilled') {
          // Operation succeeded
          result.successful.push(promiseResult.value);
          result.totals.success++;
        } else {
          // Operation failed
          const error = promiseResult.reason as Error;
          result.failed.push({ 
            item: batch[i + idx], 
            error, 
            index 
          });
          result.totals.failure++;
          
          // If continueOnError is false, stop processing
          if (!opts.continueOnError) {
            throw new Error(`Operation failed at index ${index}: ${error.message || String(error)}`);
          }
        }
      });
    }
    
    return result;
  } catch (error) {
    logger.error(`Error in batch processing`, {
      batchSize: batch.length,
      startIndex,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // If we've hit an error that stopped the whole batch (continueOnError=false),
    // we need to record any unprocessed items as failures
    const processedCount = result.totals.success + result.totals.failure;
    
    if (processedCount < batch.length) {
      const remainingItems = batch.slice(processedCount);
      for (let i = 0; i < remainingItems.length; i++) {
        const index = startIndex + processedCount + i;
        result.failed.push({
          item: remainingItems[i],
          error: new Error('Batch processing aborted: ' + 
            (error instanceof Error ? error.message : String(error))),
          index
        });
        result.totals.failure++;
      }
    }
    
    return result;
  }
}

/**
 * Process a single item with retry logic
 * 
 * @param operation The operation to perform
 * @param item The item being processed (for context)
 * @param index The index of the item (for logging)
 * @param options Processing options
 * @returns The result of the operation if successful
 * @throws Error if all retry attempts fail
 */
async function processWithRetry<R>(
  operation: () => Promise<R>,
  item: any,
  index: number,
  options: Required<BatchProcessingOptions>
): Promise<R> {
  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts <= options.retryCount) {
    try {
      // Attempt the operation
      attempts++;
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      
      logger.warn(`Operation failed for item at index ${index}`, {
        attempt: attempts,
        maxAttempts: options.retryCount + 1,
        error: err.message
      });
      
      // If this was our last attempt, don't delay, just throw
      if (attempts > options.retryCount) {
        break;
      }
      
      // Calculate delay for next retry
      let delay = options.retryDelay;
      if (options.exponentialBackoff) {
        // Use exponential backoff with jitter
        delay = options.retryDelay * Math.pow(2, attempts - 1) + Math.random() * 1000;
      }
      
      logger.debug(`Retrying operation after delay`, {
        index,
        attempt: attempts,
        delayMs: delay
      });
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all retry attempts failed
  throw new Error(
    `Operation failed after ${attempts} attempts for item at index ${index}: ` +
    (lastError?.message || 'Unknown error')
  );
} 