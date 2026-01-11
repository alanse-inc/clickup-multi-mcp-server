/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Token Utilities
 * 
 * Functions for estimating token counts for LLM processing
 */

/**
 * Simple heuristic to estimate token count from text
 * Based on the approximate ratio of 4 characters per token for English text
 * 
 * @param text Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  
  // Characters per token varies by language, but ~4 chars per token
  // is a reasonable approximation for English text
  const CHARS_PER_TOKEN = 4;
  
  // Add some overhead for non-text elements and special tokens
  const OVERHEAD_FACTOR = 1.1;
  
  return Math.ceil((text.length / CHARS_PER_TOKEN) * OVERHEAD_FACTOR);
}

/**
 * Estimate tokens for a JSON object
 * 
 * @param obj Object to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokensFromObject(obj: any): number {
  // Convert to JSON string
  const jsonString = JSON.stringify(obj);
  
  // Use text estimation on the JSON string
  // JSON has more special chars than plain text, so we adjust overhead
  return Math.ceil(estimateTokensFromText(jsonString) * 1.2);
}

/**
 * Check if an object would exceed the token limit when serialized to JSON
 * 
 * @param obj Object to check
 * @param tokenLimit Token limit to check against
 * @returns Whether the object would exceed the token limit
 */
export function wouldExceedTokenLimit(obj: any, tokenLimit: number): boolean {
  const estimatedTokens = estimateTokensFromObject(obj);
  return estimatedTokens > tokenLimit;
} 