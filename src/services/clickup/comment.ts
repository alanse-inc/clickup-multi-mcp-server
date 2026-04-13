/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Comment Service
 *
 * Handles comment operations for views, lists, and threaded replies.
 * Task comments remain on TaskService (get/create task comment tools).
 */

import { BaseClickUpService } from './base.js';
import type {
  ClickUpComment,
  CommentsResponse,
  CreateCommentData,
  UpdateCommentData
} from './types.js';

function unwrapCommentPayload(data: unknown): ClickUpComment {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid comment response from ClickUp API');
  }
  const d = data as Record<string, unknown>;
  if (d.comment && typeof d.comment === 'object') {
    return d.comment as ClickUpComment;
  }
  if (typeof d.id === 'string' && (d.comment_text !== undefined || d.comment !== undefined)) {
    return data as ClickUpComment;
  }
  throw new Error('Unexpected comment response shape from ClickUp API');
}

/**
 * ClickUp Comment Service — views, lists, and comment threads (replies)
 */
export class CommentService extends BaseClickUpService {
  async updateComment(commentId: string, data: UpdateCommentData): Promise<ClickUpComment> {
    return this.makeRequest(async () => {
      this.logOperation('updateComment', { commentId, data });

      const response = await this.client.put<ClickUpComment | { comment: ClickUpComment }>(
        `/comment/${commentId}`,
        data
      );

      const comment = unwrapCommentPayload(response.data);
      this.logger.info(`Updated comment: ${commentId}`);
      return comment;
    });
  }

  async deleteComment(commentId: string): Promise<void> {
    return this.makeRequest(async () => {
      this.logOperation('deleteComment', { commentId });

      await this.client.delete(`/comment/${commentId}`);

      this.logger.info(`Deleted comment: ${commentId}`);
    });
  }

  async getViewComments(viewId: string): Promise<ClickUpComment[]> {
    return this.makeRequest(async () => {
      this.logOperation('getViewComments', { viewId });

      const response = await this.client.get<CommentsResponse>(`/view/${viewId}/comment`);

      const comments = response.data.comments ?? [];
      this.logger.info(`Retrieved ${comments.length} comment(s) for view: ${viewId}`);
      return comments;
    });
  }

  async createViewComment(viewId: string, data: CreateCommentData): Promise<ClickUpComment> {
    return this.makeRequest(async () => {
      this.logOperation('createViewComment', { viewId, data });

      const response = await this.client.post<ClickUpComment | { comment: ClickUpComment }>(
        `/view/${viewId}/comment`,
        data
      );

      const comment = unwrapCommentPayload(response.data);
      this.logger.info(`Created comment on view: ${viewId}`);
      return comment;
    });
  }

  async getListComments(listId: string): Promise<ClickUpComment[]> {
    return this.makeRequest(async () => {
      this.logOperation('getListComments', { listId });

      const response = await this.client.get<CommentsResponse>(`/list/${listId}/comment`);

      const comments = response.data.comments ?? [];
      this.logger.info(`Retrieved ${comments.length} comment(s) for list: ${listId}`);
      return comments;
    });
  }

  async createListComment(listId: string, data: CreateCommentData): Promise<ClickUpComment> {
    return this.makeRequest(async () => {
      this.logOperation('createListComment', { listId, data });

      const response = await this.client.post<ClickUpComment | { comment: ClickUpComment }>(
        `/list/${listId}/comment`,
        data
      );

      const comment = unwrapCommentPayload(response.data);
      this.logger.info(`Created comment on list: ${listId}`);
      return comment;
    });
  }

  async getCommentReplies(commentId: string): Promise<ClickUpComment[]> {
    return this.makeRequest(async () => {
      this.logOperation('getCommentReplies', { commentId });

      const response = await this.client.get<
        CommentsResponse | { replies?: ClickUpComment[]; comments?: ClickUpComment[] }
      >(`/comment/${commentId}/reply`);

      const raw = response.data;
      let replies: ClickUpComment[] = [];
      if ('comments' in raw && Array.isArray(raw.comments)) {
        replies = raw.comments;
      } else if ('replies' in raw && Array.isArray(raw.replies)) {
        replies = raw.replies;
      }

      this.logger.info(`Retrieved ${replies.length} replies for comment: ${commentId}`);
      return replies;
    });
  }

  async createCommentReply(commentId: string, data: CreateCommentData): Promise<ClickUpComment> {
    return this.makeRequest(async () => {
      this.logOperation('createCommentReply', { commentId, data });

      const response = await this.client.post<ClickUpComment | { comment: ClickUpComment }>(
        `/comment/${commentId}/reply`,
        data
      );

      const comment = unwrapCommentPayload(response.data);
      this.logger.info(`Created reply on comment: ${commentId}`);
      return comment;
    });
  }
}
