/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Date Utility Functions
 * 
 * This module provides utilities for handling dates, timestamps, and due date parsing.
 */

import { Logger } from '../logger.js';

// Create a logger instance for date utilities
const logger = new Logger('DateUtils');

/**
 * Get a timestamp for a relative time
 * 
 * @param minutes Minutes from now
 * @param hours Hours from now
 * @param days Days from now
 * @param weeks Weeks from now
 * @param months Months from now
 * @returns Timestamp in milliseconds
 */
export function getRelativeTimestamp(minutes = 0, hours = 0, days = 0, weeks = 0, months = 0): number {
  const now = new Date();
  
  if (minutes) now.setMinutes(now.getMinutes() + minutes);
  if (hours) now.setHours(now.getHours() + hours);
  if (days) now.setDate(now.getDate() + days);
  if (weeks) now.setDate(now.getDate() + (weeks * 7));
  if (months) now.setMonth(now.getMonth() + months);
  
  return now.getTime();
}

/**
 * Get the start of today (midnight) in Unix milliseconds
 * @returns Timestamp in milliseconds for start of current day
 */
function getStartOfDay(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

/**
 * Get the end of today (23:59:59.999) in Unix milliseconds
 * @returns Timestamp in milliseconds for end of current day
 */
function getEndOfDay(): number {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.getTime();
}

/**
 * Get the current time in Unix milliseconds
 * @returns Current timestamp in milliseconds
 */
function getCurrentTimestamp(): number {
  return new Date().getTime();
}

/**
 * Smart preprocessing layer for date strings
 * Normalizes input, handles common variations, and prepares for regex patterns
 *
 * @param input Raw date string input
 * @returns Preprocessed and normalized date string
 */
function preprocessDateString(input: string): string {
  if (!input) return input;

  let processed = input.toLowerCase().trim();

  // Normalize common variations and typos
  const normalizations: Array<[RegExp, string]> = [
    // Handle "a" and "an" as "1" FIRST (before other patterns)
    [/\ba\s+(day|week|month|year)\s+ago\b/g, '1 $1 ago'],
    [/\ba\s+(day|week|month|year)\s+from\s+now\b/g, '1 $1 from now'],
    [/\ba\s+(day|week|month|year)\s+later\b/g, '1 $1 later'],
    [/\ban\s+(hour|day|week|month|year)\s+ago\b/g, '1 $1 ago'],
    [/\ban\s+(hour|day|week|month|year)\s+from\s+now\b/g, '1 $1 from now'],
    [/\ban\s+(hour|day|week|month|year)\s+later\b/g, '1 $1 later'],
    [/\bin\s+a\s+(day|week|month|year)\b/g, 'in 1 $1'],
    [/\bin\s+an\s+(hour|day|week|month|year)\b/g, 'in 1 $1'],

    // Handle common typos and variations
    [/\btommorow\b/g, 'tomorrow'],
    [/\byesterady\b/g, 'yesterday'],
    [/\btomorrow\s*mornin[g]?\b/g, 'tomorrow 9am'],
    [/\byesterday\s*mornin[g]?\b/g, 'yesterday 9am'],
    [/\btomorrow\s*evenin[g]?\b/g, 'tomorrow 6pm'],
    [/\byesterday\s*evenin[g]?\b/g, 'yesterday 6pm'],
    [/\btomorrow\s*night\b/g, 'tomorrow 9pm'],
    [/\byesterday\s*night\b/g, 'yesterday 9pm'],

    // Normalize time expressions
    [/\b(\d{1,2})\s*:\s*(\d{2})\s*(a\.?m\.?|p\.?m\.?)\b/g, '$1:$2$3'],
    [/\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)\b/g, '$1$2'],
    [/\ba\.?m\.?\b/g, 'am'],
    [/\bp\.?m\.?\b/g, 'pm'],

    // Normalize "at" usage and additional time connectors
    [/\s+at\s+/g, ' '],
    [/\s+@\s+/g, ' '],
    [/\s+around\s+/g, ' '],
    [/\s+by\s+/g, ' '],
    [/\s+on\s+/g, ' '],

    // Handle "day after tomorrow" and "day before yesterday" + additional variations
    [/\bday\s+after\s+tomorrow\b/g, '+2 days'],
    [/\bday\s+before\s+yesterday\b/g, '-2 days'],
    [/\bovermorrow\b/g, '+2 days'], // Formal term for "day after tomorrow"
    [/\bereyesterday\b/g, '-2 days'], // Formal term for "day before yesterday"

    // Handle "next/last" with time units
    [/\bnext\s+(\d+)\s+days?\b/g, '+$1 days'],
    [/\bnext\s+(\d+)\s+weeks?\b/g, '+$1 weeks'],
    [/\blast\s+(\d+)\s+days?\b/g, '-$1 days'],
    [/\blast\s+(\d+)\s+weeks?\b/g, '-$1 weeks'],

    // Normalize relative expressions - comprehensive natural language support
    [/\bin\s+(\d+)\s+days?\b/g, '+$1 days'],
    [/\b(\d+)\s+days?\s+ago\b/g, '-$1 days'],
    [/\bin\s+(\d+)\s+weeks?\b/g, '+$1 weeks'],
    [/\b(\d+)\s+weeks?\s+ago\b/g, '-$1 weeks'],
    [/\b(\d+)\s+weeks?\s+from\s+now\b/g, '+$1 weeks'],
    [/\b(\d+)\s+days?\s+from\s+now\b/g, '+$1 days'],

    // Additional natural language variations
    [/\b(\d+)\s+days?\s+later\b/g, '+$1 days'],
    [/\b(\d+)\s+weeks?\s+later\b/g, '+$1 weeks'],
    [/\bafter\s+(\d+)\s+days?\b/g, '+$1 days'],
    [/\bafter\s+(\d+)\s+weeks?\b/g, '+$1 weeks'],
    [/\b(\d+)\s+days?\s+ahead\b/g, '+$1 days'],
    [/\b(\d+)\s+weeks?\s+ahead\b/g, '+$1 weeks'],
    [/\b(\d+)\s+days?\s+forward\b/g, '+$1 days'],
    [/\b(\d+)\s+weeks?\s+forward\b/g, '+$1 weeks'],

    // Past variations
    [/\b(\d+)\s+days?\s+back\b/g, '-$1 days'],
    [/\b(\d+)\s+weeks?\s+back\b/g, '-$1 weeks'],
    [/\b(\d+)\s+days?\s+before\b/g, '-$1 days'],
    [/\b(\d+)\s+weeks?\s+before\b/g, '-$1 weeks'],
    [/\b(\d+)\s+days?\s+earlier\b/g, '-$1 days'],
    [/\b(\d+)\s+weeks?\s+earlier\b/g, '-$1 weeks'],

    // Extended time units - months and years
    [/\bin\s+(\d+)\s+months?\b/g, '+$1 months'],
    [/\b(\d+)\s+months?\s+from\s+now\b/g, '+$1 months'],
    [/\b(\d+)\s+months?\s+later\b/g, '+$1 months'],
    [/\bafter\s+(\d+)\s+months?\b/g, '+$1 months'],
    [/\b(\d+)\s+months?\s+ago\b/g, '-$1 months'],
    [/\b(\d+)\s+months?\s+back\b/g, '-$1 months'],
    [/\b(\d+)\s+months?\s+earlier\b/g, '-$1 months'],

    [/\bin\s+(\d+)\s+years?\b/g, '+$1 years'],
    [/\b(\d+)\s+years?\s+from\s+now\b/g, '+$1 years'],
    [/\b(\d+)\s+years?\s+later\b/g, '+$1 years'],
    [/\bafter\s+(\d+)\s+years?\b/g, '+$1 years'],
    [/\b(\d+)\s+years?\s+ago\b/g, '-$1 years'],
    [/\b(\d+)\s+years?\s+back\b/g, '-$1 years'],
    [/\b(\d+)\s+years?\s+earlier\b/g, '-$1 years'],



    // Handle "this" and "next" prefixes more consistently
    [/\bthis\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g, '$1'],
    [/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g, 'next $1'],

    // Normalize timezone abbreviations (remove them for now)
    [/\s+(est|edt|pst|pdt|cst|cdt|mst|mdt)\b/g, ''],

    // Clean up extra whitespace
    [/\s+/g, ' '],
  ];

  // Apply all normalizations
  for (const [pattern, replacement] of normalizations) {
    processed = processed.replace(pattern, replacement);
  }

  return processed.trim();
}

/**
 * Helper function to parse time components and convert to 24-hour format
 * Reduces code duplication across different date parsing patterns
 */
function parseTimeComponents(hours: string, minutes?: string, meridian?: string): { hours: number; minutes: number } {
  let parsedHours = parseInt(hours);
  const parsedMinutes = minutes ? parseInt(minutes) : 0;

  // Convert to 24-hour format if meridian is specified
  if (meridian?.toLowerCase() === 'pm' && parsedHours < 12) parsedHours += 12;
  if (meridian?.toLowerCase() === 'am' && parsedHours === 12) parsedHours = 0;

  return { hours: parsedHours, minutes: parsedMinutes };
}

/**
 * Helper function to set time on a date object with default fallback
 */
function setTimeOnDate(date: Date, hours?: string, minutes?: string, meridian?: string): void {
  if (hours) {
    const { hours: parsedHours, minutes: parsedMinutes } = parseTimeComponents(hours, minutes, meridian);
    date.setHours(parsedHours, parsedMinutes, 0, 0);
  } else {
    // Default to end of day if no time specified
    date.setHours(23, 59, 59, 999);
  }
}

/**
 * Enhanced pattern matching with consolidated regex patterns
 * Uses more flexible patterns to reduce redundancy
 */
interface DatePattern {
  name: string;
  pattern: RegExp;
  handler: (match: RegExpMatchArray) => Date | null;
}

/**
 * Consolidated date patterns with enhanced flexibility
 */
function getDatePatterns(): DatePattern[] {
  return [
    // Relative day expressions with optional time
    {
      name: 'relative_days',
      pattern: /^([+-]?\d+)\s+days?(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/,
      handler: (match) => {
        const days = parseInt(match[1]);
        const date = new Date();
        date.setDate(date.getDate() + days);
        setTimeOnDate(date, match[2], match[3], match[4]);
        return date;
      }
    },

    // Relative week expressions with optional time
    {
      name: 'relative_weeks',
      pattern: /^([+-]?\d+)\s+weeks?(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/,
      handler: (match) => {
        const weeks = parseInt(match[1]);
        const date = new Date();
        date.setDate(date.getDate() + (weeks * 7));
        setTimeOnDate(date, match[2], match[3], match[4]);
        return date;
      }
    },

    // Relative month expressions with optional time
    {
      name: 'relative_months',
      pattern: /^([+-]?\d+)\s+months?(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/,
      handler: (match) => {
        const months = parseInt(match[1]);
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        setTimeOnDate(date, match[2], match[3], match[4]);
        return date;
      }
    },

    // Relative year expressions with optional time
    {
      name: 'relative_years',
      pattern: /^([+-]?\d+)\s+years?(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/,
      handler: (match) => {
        const years = parseInt(match[1]);
        const date = new Date();
        date.setFullYear(date.getFullYear() + years);
        setTimeOnDate(date, match[2], match[3], match[4]);
        return date;
      }
    },

    // Yesterday/Tomorrow with enhanced time support
    {
      name: 'yesterday_tomorrow',
      pattern: /^(yesterday|tomorrow)(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/,
      handler: (match) => {
        const isYesterday = match[1] === 'yesterday';
        const date = new Date();
        date.setDate(date.getDate() + (isYesterday ? -1 : 1));
        setTimeOnDate(date, match[2], match[3], match[4]);
        return date;
      }
    }
  ];
}

/**
 * Parse a due date string into a timestamp
 * Enhanced with smart preprocessing and consolidated patterns
 *
 * @param dateString Date string to parse
 * @returns Timestamp in milliseconds or undefined if parsing fails
 */
export function parseDueDate(dateString: string): number | undefined {
  if (!dateString) return undefined;

  try {
    // First, try to parse as a direct timestamp
    const numericValue = Number(dateString);
    if (!isNaN(numericValue) && numericValue > 0) {
      // If it's a reasonable timestamp (after year 2000), use it
      if (numericValue >= 946684800000) { // Jan 1, 2000 (inclusive)
        return numericValue;
      }
    }

    // Apply smart preprocessing
    const preprocessed = preprocessDateString(dateString);
    logger.debug(`Preprocessed date: "${dateString}" -> "${preprocessed}"`);

    // Handle natural language dates with preprocessed input
    const lowerDate = preprocessed;

    // Try enhanced pattern matching first
    const patterns = getDatePatterns();
    for (const pattern of patterns) {
      const match = lowerDate.match(pattern.pattern);
      if (match) {
        const result = pattern.handler(match);
        if (result && !isNaN(result.getTime())) {
          logger.debug(`Matched pattern "${pattern.name}" for: ${lowerDate}`);
          return result.getTime();
        }
      }
    }

    // Handle "now" specifically
    if (lowerDate === 'now') {
      return getCurrentTimestamp();
    }

    // Handle "today" with different options
    if (lowerDate === 'today') {
      return getEndOfDay();
    }

    if (lowerDate === 'today start' || lowerDate === 'start of today') {
      return getStartOfDay();
    }

    if (lowerDate === 'today end' || lowerDate === 'end of today') {
      return getEndOfDay();
    }

    // Note: Yesterday/tomorrow patterns are now handled by enhanced patterns above

    // Handle day names (Monday, Tuesday, etc.) - find next occurrence
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayMatch = lowerDate.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (dayMatch) {
      const targetDayName = dayMatch[1];
      const targetDayIndex = dayNames.indexOf(targetDayName);
      const today = new Date();
      const currentDayIndex = today.getDay();

      // Calculate days until target day
      let daysUntilTarget = targetDayIndex - currentDayIndex;
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7; // Next week
      }

      // Handle "next" prefix explicitly
      if (lowerDate.includes('next ')) {
        daysUntilTarget += 7;
      }

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntilTarget);

      // Extract time if specified (e.g., "Friday at 3pm", "Saturday 2:30pm")
      const timeMatch = lowerDate.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      setTimeOnDate(targetDate, timeMatch?.[1], timeMatch?.[2], timeMatch?.[3]);

      return targetDate.getTime();
    }
    
    // Note: Relative date patterns are now handled by enhanced patterns above
    // Legacy support for "X from now" patterns
    const legacyRelativeFormats = [
      { regex: /(\d+)\s*minutes?\s*from\s*now/i, handler: (m: number) => getRelativeTimestamp(m) },
      { regex: /(\d+)\s*hours?\s*from\s*now/i, handler: (h: number) => getRelativeTimestamp(0, h) },
      { regex: /(\d+)\s*days?\s*from\s*now/i, handler: (d: number) => getRelativeTimestamp(0, 0, d) },
      { regex: /(\d+)\s*weeks?\s*from\s*now/i, handler: (w: number) => getRelativeTimestamp(0, 0, 0, w) },
      { regex: /(\d+)\s*months?\s*from\s*now/i, handler: (m: number) => getRelativeTimestamp(0, 0, 0, 0, m) }
    ];

    for (const format of legacyRelativeFormats) {
      if (format.regex.test(lowerDate)) {
        const value = parseInt(lowerDate.match(format.regex)![1]);
        return format.handler(value);
      }
    }
    
    // Handle specific date formats
    // Format: MM/DD/YYYY with enhanced time support (handles both "5pm" and "5 pm")
    const usDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?)?$/i;
    const usDateMatch = lowerDate.match(usDateRegex);
    
    if (usDateMatch) {
      const [_, month, day, year, hours, minutes, meridian] = usDateMatch;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1, // JS months are 0-indexed
        parseInt(day)
      );
      
      // Add time if specified
      setTimeOnDate(date, hours, minutes, meridian);
      
      return date.getTime();
    }

    // Handle MM/DD format without year (assume current year)
    const usDateNoYearRegex = /^(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?)?$/i;
    const usDateNoYearMatch = lowerDate.match(usDateNoYearRegex);

    if (usDateNoYearMatch) {
      const [_, month, day, hours, minutes, meridian] = usDateNoYearMatch;
      const currentYear = new Date().getFullYear();
      const date = new Date(
        currentYear,
        parseInt(month) - 1, // JS months are 0-indexed
        parseInt(day)
      );

      // Add time if specified
      setTimeOnDate(date, hours, minutes, meridian);

      return date.getTime();
    }

    // Handle text month formats (e.g., "march 10 2025 6:30pm")
    const textMonthRegex = /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s+(\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?)?$/i;
    const textMonthMatch = lowerDate.match(textMonthRegex);

    if (textMonthMatch) {
      const [_, monthName, day, year, hours, minutes, meridian] = textMonthMatch;
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                         'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = monthNames.indexOf(monthName.toLowerCase());

      if (monthIndex !== -1) {
        const date = new Date(
          parseInt(year),
          monthIndex,
          parseInt(day)
        );

        // Add time if specified
        setTimeOnDate(date, hours, minutes, meridian);

        return date.getTime();
      }
    }

    // Enhanced fallback chain with better validation and error handling
    return enhancedFallbackParsing(dateString, preprocessed);
  } catch (error) {
    logger.warn(`Failed to parse due date: ${dateString}`, error);
    throw new Error(`Invalid date format: ${dateString}`);
  }
}

/**
 * Enhanced fallback parsing with multiple strategies
 *
 * @param originalInput Original date string
 * @param preprocessedInput Preprocessed date string
 * @returns Timestamp in milliseconds or undefined
 */
function enhancedFallbackParsing(originalInput: string, preprocessedInput: string): number | undefined {
  const now = Date.now();
  const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
  const tenYearsFromNow = now + (10 * 365 * 24 * 60 * 60 * 1000);

  /**
   * Validate if a date is reasonable
   */
  function isReasonableDate(date: Date): boolean {
    const time = date.getTime();
    return !isNaN(time) && time > oneYearAgo && time < tenYearsFromNow;
  }

  /**
   * Try parsing with automatic future adjustment for past dates
   */
  function tryParseWithFutureAdjustment(input: string): Date | null {
    const date = new Date(input);
    if (!isReasonableDate(date)) return null;

    // If the parsed date is in the past and looks like a day of the week, assume next occurrence
    if (date.getTime() < now && input.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i)) {
      date.setDate(date.getDate() + 7);
    }

    return isReasonableDate(date) ? date : null;
  }

  // Strategy 1: Try preprocessed input with native Date constructor
  let result = tryParseWithFutureAdjustment(preprocessedInput);
  if (result) {
    logger.debug(`Fallback strategy 1 succeeded for: ${preprocessedInput}`);
    return result.getTime();
  }

  // Strategy 2: Try original input with native Date constructor
  result = tryParseWithFutureAdjustment(originalInput);
  if (result) {
    logger.debug(`Fallback strategy 2 succeeded for: ${originalInput}`);
    return result.getTime();
  }

  // Strategy 3: Try common variations and transformations
  const variations = [
    // Remove common words that might confuse the parser
    originalInput.replace(/\s+at\s+/gi, ' '),
    originalInput.replace(/\s+(est|edt|pst|pdt|cst|cdt|mst|mdt)\b/gi, ''),
    originalInput.replace(/\bnext\s+/gi, ''),
    originalInput.replace(/\bthis\s+/gi, ''),
    originalInput.replace(/\bon\s+/gi, ''),

    // Try with different separators
    originalInput.replace(/[-\/]/g, '/'),
    originalInput.replace(/[-\/]/g, '-'),

    // Try adding current year if it looks like a date without year
    (() => {
      const currentYear = new Date().getFullYear();
      if (originalInput.match(/^\d{1,2}[\/\-]\d{1,2}$/)) {
        return `${originalInput}/${currentYear}`;
      }
      return originalInput;
    })(),
  ];

  for (const variation of variations) {
    if (variation === originalInput) continue; // Skip if no change

    result = tryParseWithFutureAdjustment(variation);
    if (result) {
      logger.debug(`Fallback strategy 3 succeeded with variation: ${variation}`);
      return result.getTime();
    }
  }

  // Strategy 4: Last resort - try ISO format variations
  const isoVariations = [
    originalInput.replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, '$1-$2-$3T23:59:59'),
    originalInput.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$1-$2'),
  ];

  for (const isoVariation of isoVariations) {
    if (isoVariation === originalInput) continue;

    const date = new Date(isoVariation);
    if (isReasonableDate(date)) {
      logger.debug(`Fallback strategy 4 succeeded with ISO variation: ${isoVariation}`);
      return date.getTime();
    }
  }

  logger.debug(`All fallback strategies failed for: ${originalInput}`);
  return undefined;
}

/**
 * Format a due date timestamp into a human-readable string
 * 
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted date string or undefined if timestamp is invalid
 */
export function formatDueDate(timestamp: number | null | undefined): string | undefined {
  if (!timestamp) return undefined;
  
  try {
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) return undefined;
    
    // Format: "March 10, 2025 at 10:56 PM"
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(' at', ',');
  } catch (error) {
    logger.warn(`Failed to format due date: ${timestamp}`, error);
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }
}



/**
 * Format a date for display in errors and messages
 * @param timestamp The timestamp to format
 * @returns A human-readable relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: string | number): string {
  if (!timestamp) return 'Unknown';
  
  const timestampNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  const now = Date.now();
  const diffMs = now - timestampNum;
  
  // Convert to appropriate time unit
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec} seconds ago`;
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minutes ago`;
  
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hours ago`;
  
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 30) return `${diffDays} days ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} months ago`;
  
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} years ago`;
} 