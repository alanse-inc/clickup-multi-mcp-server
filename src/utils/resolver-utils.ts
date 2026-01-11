/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Resolver Utility Functions
 * 
 * This module provides utilities for resolving entity IDs from names or other identifiers.
 */

import { clickUpServices } from '../services/shared.js';
import { findListIDByName } from '../tools/list.js';

/**
 * Result of a name match operation including the quality of the match
 */
interface NameMatchResult {
  isMatch: boolean;
  score: number; // 0-100, higher is better
  exactMatch: boolean; // Whether this is an exact match
  reason?: string; // Optional reason for debugging
}

/**
 * Check if a name matches another name using a variety of matching strategies
 * Returns a structured result with match quality information rather than just a boolean
 * 
 * @param actualName The actual name to check
 * @param searchName The name being searched for
 * @returns A structured result with match details
 */
export function isNameMatch(actualName: string, searchName: string): NameMatchResult {
  if (!actualName || !searchName) {
    return { isMatch: false, score: 0, exactMatch: false, reason: 'One of the names is empty' };
  }

  // Remove any extra whitespace
  const normalizedActualName = actualName.trim();
  const normalizedSearchName = searchName.trim();
  
  // Handle empty names after normalization
  if (normalizedActualName === '') {
    return { isMatch: false, score: 0, exactMatch: false, reason: 'Actual name is empty' };
  }
  
  if (normalizedSearchName === '') {
    return { isMatch: false, score: 0, exactMatch: false, reason: 'Search name is empty' };
  }

  // 1. Exact match (highest quality)
  if (normalizedActualName === normalizedSearchName) {
    return { 
      isMatch: true, 
      score: 100, 
      exactMatch: true,
      reason: 'Exact match' 
    };
  }

  // 2. Case-insensitive exact match (high quality)
  if (normalizedActualName.toLowerCase() === normalizedSearchName.toLowerCase()) {
    return { 
      isMatch: true, 
      score: 90, 
      exactMatch: true,
      reason: 'Case-insensitive exact match' 
    };
  }

  // 3. Match after removing emojis (moderate quality)
  const actualNameWithoutEmoji = normalizedActualName.replace(/[\p{Emoji}\u{FE00}-\u{FE0F}\u200d]+/gu, '').trim();
  const searchNameWithoutEmoji = normalizedSearchName.replace(/[\p{Emoji}\u{FE00}-\u{FE0F}\u200d]+/gu, '').trim();
  
  if (actualNameWithoutEmoji === searchNameWithoutEmoji) {
    return { 
      isMatch: true, 
      score: 80, 
      exactMatch: false,
      reason: 'Exact match after removing emojis' 
    };
  }
  
  if (actualNameWithoutEmoji.toLowerCase() === searchNameWithoutEmoji.toLowerCase()) {
    return { 
      isMatch: true, 
      score: 70, 
      exactMatch: false,
      reason: 'Case-insensitive match after removing emojis' 
    };
  }

  // 4. Substring matches (lower quality)
  const lowerActual = normalizedActualName.toLowerCase();
  const lowerSearch = normalizedSearchName.toLowerCase();
  
  // Full substring (term completely contained)
  if (lowerActual.includes(lowerSearch)) {
    return { 
      isMatch: true, 
      score: 60, 
      exactMatch: false,
      reason: 'Search term found as substring in actual name' 
    };
  }
  
  if (lowerSearch.includes(lowerActual)) {
    return { 
      isMatch: true, 
      score: 50, 
      exactMatch: false,
      reason: 'Actual name found as substring in search term' 
    };
  }
  
  // 5. Fuzzy emoji-less matches (lowest quality)
  const lowerActualNoEmoji = actualNameWithoutEmoji.toLowerCase();
  const lowerSearchNoEmoji = searchNameWithoutEmoji.toLowerCase();
  
  if (lowerActualNoEmoji.includes(lowerSearchNoEmoji)) {
    return { 
      isMatch: true, 
      score: 40, 
      exactMatch: false,
      reason: 'Search term (without emoji) found as substring in actual name' 
    };
  }
  
  if (lowerSearchNoEmoji.includes(lowerActualNoEmoji)) {
    return { 
      isMatch: true, 
      score: 30, 
      exactMatch: false,
      reason: 'Actual name (without emoji) found as substring in search term' 
    };
  }

  // No match found
  return { 
    isMatch: false, 
    score: 0, 
    exactMatch: false,
    reason: 'No match found with any matching strategy' 
  };
}

/**
 * Resolve a list ID from either a direct ID or list name
 */
export async function resolveListId(
  listId?: string,
  listName?: string,
  workspaceService = clickUpServices.workspace
): Promise<string> {
  // If list ID is directly provided, use it
  if (listId) {
    return listId;
  }
  
  // If list name is provided, find the corresponding ID
  if (listName) {
    const listInfo = await findListIDByName(workspaceService, listName);
    if (!listInfo) {
      throw new Error(`List "${listName}" not found`);
    }
    return listInfo.id;
  }
  
  // If neither is provided, throw an error
  throw new Error("Either listId or listName must be provided");
} 