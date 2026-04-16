/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Chat Service (v3 API)
 *
 * Handles all operations related to Chat channels and messages in ClickUp.
 * Uses the v3 API endpoint (https://api.clickup.com/api/v3) instead of v2.
 *
 * - Listing and creating channels
 * - Retrieving, updating, and deleting channels
 * - Sending, updating, and deleting messages
 * - Paginated message retrieval via cursor
 */

import { BaseClickUpService } from './base.js';

// ── Type Definitions ──────────────────────────────────────────────────────────

export interface ClickUpChatChannel {
  id: string;
  name: string;
  /** Channel visibility type: 'public' | 'private' | 'direct_message' | 'location' */
  type: string;
  access?: string;
  description?: string;
  workspace_id: string;
  created_at?: string;
}

export interface ClickUpChatMessage {
  id: string;
  content: string;
  channel_id: string;
  created_by?: {
    id: string;
    username?: string;
  };
  created_at?: string;
  reactions?: Array<{
    emoji: string;
    count: number;
  }>;
}

export interface CreateChannelData {
  name: string;
  type?: 'public' | 'private';
  description?: string;
  member_can_invite?: boolean;
}

export interface SendMessageData {
  content: string;
  notify_all?: boolean;
}

export interface GetMessagesResponse {
  messages: ClickUpChatMessage[];
  cursor?: string;
}

// ── Service Implementation ────────────────────────────────────────────────────

/**
 * ChatService — wraps ClickUp Chat v3 API endpoints.
 *
 * This service uses a dedicated v3 base URL because ClickUp Chat
 * is not available on the standard v2 endpoint.
 */
export class ChatService extends BaseClickUpService {
  constructor(apiKey: string, teamId: string, _baseUrl?: string) {
    // Always force v3 endpoint for Chat API regardless of the passed baseUrl
    super(apiKey, teamId, 'https://api.clickup.com/api/v3');
  }

  // ── Channel Methods ──────────────────────────────────────────────────────

  /**
   * Get all chat channels for the workspace.
   * @returns Array of chat channels
   */
  async getChannels(): Promise<ClickUpChatChannel[]> {
    return this.makeRequest(async () => {
      this.logOperation('getChannels', { teamId: this.teamId });

      const response = await this.client.get(
        `/workspaces/${this.teamId}/chat/channels`
      );

      // v3 API may wrap results in data.channels, channels, or return an array directly
      const channels: ClickUpChatChannel[] =
        response.data?.data?.channels ||
        response.data?.channels ||
        (Array.isArray(response.data) ? response.data : []);

      this.logger.info(`Retrieved ${channels.length} chat channel(s) for workspace: ${this.teamId}`);
      return channels;
    });
  }

  /**
   * Create a new chat channel in the workspace.
   * @param data Channel creation data
   * @returns The created channel
   */
  async createChannel(data: CreateChannelData): Promise<ClickUpChatChannel> {
    return this.makeRequest(async () => {
      this.logOperation('createChannel', { teamId: this.teamId, ...data });

      const response = await this.client.post<ClickUpChatChannel>(
        `/workspaces/${this.teamId}/chat/channels`,
        data
      );

      const channel: ClickUpChatChannel =
        (response.data as any)?.data || response.data;

      this.logger.info(`Created chat channel: ${channel.name} (${channel.id})`);
      return channel;
    });
  }

  /**
   * Get details of a specific chat channel.
   * @param channelId The ID of the channel
   * @returns The channel details
   */
  async getChannel(channelId: string): Promise<ClickUpChatChannel> {
    return this.makeRequest(async () => {
      this.logOperation('getChannel', { channelId });

      const response = await this.client.get<ClickUpChatChannel>(
        `/workspaces/${this.teamId}/chat/channels/${channelId}`
      );

      const channel: ClickUpChatChannel =
        (response.data as any)?.data || response.data;

      this.logger.info(`Retrieved chat channel: ${channel.name} (${channelId})`);
      return channel;
    });
  }

  /**
   * Update properties of an existing chat channel.
   * @param channelId The ID of the channel to update
   * @param data Partial channel data to update
   * @returns The updated channel
   */
  async updateChannel(channelId: string, data: Partial<CreateChannelData>): Promise<ClickUpChatChannel> {
    return this.makeRequest(async () => {
      this.logOperation('updateChannel', { channelId, ...data });

      const response = await this.client.patch<ClickUpChatChannel>(
        `/workspaces/${this.teamId}/chat/channels/${channelId}`,
        data
      );

      const channel: ClickUpChatChannel =
        (response.data as any)?.data || response.data;

      this.logger.info(`Updated chat channel: ${channel.name} (${channelId})`);
      return channel;
    });
  }

  /**
   * Delete a chat channel permanently.
   * @param channelId The ID of the channel to delete
   */
  async deleteChannel(channelId: string): Promise<void> {
    return this.makeRequest(async () => {
      this.logOperation('deleteChannel', { channelId });

      await this.client.delete(
        `/workspaces/${this.teamId}/chat/channels/${channelId}`
      );

      this.logger.info(`Deleted chat channel: ${channelId}`);
    });
  }

  // ── Message Methods ──────────────────────────────────────────────────────

  /**
   * Get messages from a chat channel with optional cursor-based pagination.
   * @param channelId The ID of the channel
   * @param cursor Optional pagination cursor from a previous response
   * @param limit Optional maximum number of messages to return
   * @returns Messages array and optional next cursor
   */
  async getMessages(
    channelId: string,
    cursor?: string,
    limit?: number
  ): Promise<GetMessagesResponse> {
    return this.makeRequest(async () => {
      this.logOperation('getMessages', { channelId, cursor, limit });

      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      if (limit) params.append('limit', limit.toString());
      const qs = params.toString() ? `?${params}` : '';

      const response = await this.client.get(
        `/workspaces/${this.teamId}/chat/channels/${channelId}/messages${qs}`
      );

      const raw = response.data?.data || response.data || {};
      const messages: ClickUpChatMessage[] =
        raw.messages ||
        (Array.isArray(raw) ? raw : []);
      const nextCursor: string | undefined = raw.cursor;

      this.logger.info(`Retrieved ${messages.length} message(s) from channel: ${channelId}`);
      return { messages, cursor: nextCursor };
    });
  }

  /**
   * Send a new message to a chat channel.
   * @param channelId The ID of the target channel
   * @param data Message content and optional settings
   * @returns The sent message
   */
  async sendMessage(channelId: string, data: SendMessageData): Promise<ClickUpChatMessage> {
    return this.makeRequest(async () => {
      this.logOperation('sendMessage', { channelId, ...data });

      const response = await this.client.post<ClickUpChatMessage>(
        `/workspaces/${this.teamId}/chat/channels/${channelId}/messages`,
        data
      );

      const message: ClickUpChatMessage =
        (response.data as any)?.data || response.data;

      this.logger.info(`Sent message to channel: ${channelId} (message id: ${message.id})`);
      return message;
    });
  }

  /**
   * Update the content of an existing chat message.
   * @param messageId The ID of the message to update
   * @param content New message content
   * @returns The updated message
   */
  async updateMessage(messageId: string, content: string): Promise<ClickUpChatMessage> {
    return this.makeRequest(async () => {
      this.logOperation('updateMessage', { messageId });

      const response = await this.client.patch<ClickUpChatMessage>(
        `/workspaces/${this.teamId}/chat/messages/${messageId}`,
        { content }
      );

      const message: ClickUpChatMessage =
        (response.data as any)?.data || response.data;

      this.logger.info(`Updated chat message: ${messageId}`);
      return message;
    });
  }

  /**
   * Delete a chat message permanently.
   * @param messageId The ID of the message to delete
   */
  async deleteMessage(messageId: string): Promise<void> {
    return this.makeRequest(async () => {
      this.logOperation('deleteMessage', { messageId });

      await this.client.delete(
        `/workspaces/${this.teamId}/chat/messages/${messageId}`
      );

      this.logger.info(`Deleted chat message: ${messageId}`);
    });
  }
}
