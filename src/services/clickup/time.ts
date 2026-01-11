/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Time tracking service for ClickUp tasks
 * 
 * This service provides methods to manage time tracking for ClickUp tasks:
 * - Get time entries for a task
 * - Start time tracking on a task
 * - Stop time tracking on a task
 * - Add a manual time entry
 * - Delete a time entry
 */

import { BaseClickUpService, ServiceResponse, ErrorCode, ClickUpServiceError } from './base.js';

// Local type definition instead of importing from axios
interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: any;
  request?: any;
}

/**
 * Time entry object as returned by the ClickUp API
 */
export interface ClickUpTimeEntry {
  id: string;
  task: {
    id: string;
    name: string;
    status: {
      status: string;
      color: string;
      type: string;
      orderindex: number;
    };
    custom_id?: string;
  };
  wid: string;
  user: {
    id: number;
    username: string;
    email: string;
    color: string;
    profilePicture: string | null;
  };
  billable: boolean;
  start: string; // ISO date string
  end: string | null; // ISO date string, null if timer is running
  duration: number; // Duration in milliseconds
  description: string;
  tags: string[];
  source: string;
  at: string; // ISO date string when the entry was created
  task_location: {
    list_id: string;
    folder_id: string;
    space_id: string;
    list_name: string;
    folder_name: string;
    space_name: string;
  };
}

/**
 * Response for listing time entries
 */
export interface TimeEntriesResponse {
  data: ClickUpTimeEntry[];
}

/**
 * Data for starting time tracking
 */
export interface StartTimeTrackingData {
  tid: string; // Task ID
  description?: string;
  billable?: boolean;
  tags?: string[];
}

/**
 * Data for stopping time tracking
 */
export interface StopTimeTrackingData {
  description?: string;
  tags?: string[];
}

/**
 * Data for adding a manual time entry
 */
export interface AddTimeEntryData {
  tid: string; // Task ID
  start: number; // Unix timestamp in milliseconds
  duration: number; // Duration in milliseconds
  description?: string;
  billable?: boolean;
  tags?: string[];
}

/**
 * Time tracking service for ClickUp
 */
export class TimeTrackingService extends BaseClickUpService {
  /**
   * Get all time entries for a task
   * @param taskId ID of the task
   * @param startDate Optional start date filter (Unix timestamp in milliseconds)
   * @param endDate Optional end date filter (Unix timestamp in milliseconds)
   * @returns List of time entries
   */
  async getTimeEntries(taskId: string, startDate?: number, endDate?: number): Promise<ServiceResponse<ClickUpTimeEntry[]>> {
    try {
      this.logOperation('getTimeEntries', { taskId, startDate, endDate });
      
      // Build query parameters
      let query: Record<string, any> = {};
      if (startDate) query.start_date = startDate;
      if (endDate) query.end_date = endDate;
      
      const path = `/task/${taskId}/time`;
      this.traceRequest('GET', path, query);
      
      const response = await this.makeRequest<AxiosResponse<TimeEntriesResponse>>(() =>
        this.client.get(path, {
          params: query
        })
      );
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.data
          }
        };
      }
      
      return {
        success: false,
        error: {
          message: `Failed to get time entries: ${(error as Error).message}`,
          code: ErrorCode.UNKNOWN
        }
      };
    }
  }
  
  /**
   * Start time tracking on a task
   * @param data Task ID and optional parameters
   * @returns The created time entry
   */
  async startTimeTracking(data: StartTimeTrackingData): Promise<ServiceResponse<ClickUpTimeEntry>> {
    try {
      this.logOperation('startTimeTracking', { taskId: data.tid });
      
      const path = `/team/${this.teamId}/time_entries/start`;
      this.traceRequest('POST', path, data);
      
      const response = await this.makeRequest<AxiosResponse<{ data: ClickUpTimeEntry }>>(() =>
        this.client.post(path, data)
      );
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.data
          }
        };
      }
      
      return {
        success: false,
        error: {
          message: `Failed to start time tracking: ${(error as Error).message}`,
          code: ErrorCode.UNKNOWN
        }
      };
    }
  }
  
  /**
   * Stop the currently running time tracker
   * @param data Optional parameters for the stopped time entry
   * @returns The completed time entry
   */
  async stopTimeTracking(data?: StopTimeTrackingData): Promise<ServiceResponse<ClickUpTimeEntry>> {
    try {
      this.logOperation('stopTimeTracking', {});
      
      const path = `/team/${this.teamId}/time_entries/stop`;
      this.traceRequest('POST', path, data || {});
      
      const response = await this.makeRequest<AxiosResponse<{ data: ClickUpTimeEntry }>>(() =>
        this.client.post(path, data || {})
      );
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.data
          }
        };
      }
      
      return {
        success: false,
        error: {
          message: `Failed to stop time tracking: ${(error as Error).message}`,
          code: ErrorCode.UNKNOWN
        }
      };
    }
  }
  
  /**
   * Add a manual time entry to a task
   * @param data Time entry data including task ID, start time, and duration
   * @returns The created time entry
   */
  async addTimeEntry(data: AddTimeEntryData): Promise<ServiceResponse<ClickUpTimeEntry>> {
    try {
      this.logOperation('addTimeEntry', { taskId: data.tid, duration: data.duration });
      
      const path = `/team/${this.teamId}/time_entries`;
      this.traceRequest('POST', path, data);
      
      const response = await this.makeRequest<AxiosResponse<{ data: ClickUpTimeEntry }>>(() =>
        this.client.post(path, data)
      );
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.data
          }
        };
      }
      
      return {
        success: false,
        error: {
          message: `Failed to add time entry: ${(error as Error).message}`,
          code: ErrorCode.UNKNOWN
        }
      };
    }
  }
  
  /**
   * Delete a time entry
   * @param timeEntryId ID of the time entry to delete
   * @returns Success response
   */
  async deleteTimeEntry(timeEntryId: string): Promise<ServiceResponse<boolean>> {
    try {
      this.logOperation('deleteTimeEntry', { timeEntryId });
      
      const path = `/team/${this.teamId}/time_entries/${timeEntryId}`;
      this.traceRequest('DELETE', path);
      
      await this.makeRequest<AxiosResponse<any>>(() =>
        this.client.delete(path)
      );
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.data
          }
        };
      }
      
      return {
        success: false,
        error: {
          message: `Failed to delete time entry: ${(error as Error).message}`,
          code: ErrorCode.UNKNOWN
        }
      };
    }
  }
  
  /**
   * Get currently running time entry for the user
   * @returns The currently running time entry or null if no timer is running
   */
  async getCurrentTimeEntry(): Promise<ServiceResponse<ClickUpTimeEntry | null>> {
    try {
      this.logOperation('getCurrentTimeEntry', {});
      
      const path = `/team/${this.teamId}/time_entries/current`;
      this.traceRequest('GET', path);
      
      const response = await this.makeRequest<AxiosResponse<{ data: ClickUpTimeEntry | null }>>(() =>
        this.client.get(path)
      );
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.data
          }
        };
      }
      
      return {
        success: false,
        error: {
          message: `Failed to get current time entry: ${(error as Error).message}`,
          code: ErrorCode.UNKNOWN
        }
      };
    }
  }
}
