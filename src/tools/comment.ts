/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP tools — comments on views and lists, threaded replies, update/delete
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { getServicesForWorkspace, workspaceParameter } from './workspace-helper.js';

export const updateCommentTool: Tool = {
  name: 'update_comment',
  description: `Updates an existing ClickUp comment (any comment ID). Optional fields: commentText, assignee (user id), resolved.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      commentId: {
        type: 'string',
        description: 'REQUIRED: The comment ID to update'
      },
      commentText: {
        type: 'string',
        description: 'New comment body (plain / markdown per ClickUp rules)'
      },
      assignee: {
        type: 'number',
        description: 'Optional user ID to assign the comment to'
      },
      resolved: {
        type: 'boolean',
        description: 'Whether the comment thread is resolved'
      },
      ...workspaceParameter
    },
    required: ['commentId']
  }
};

export const deleteCommentTool: Tool = {
  name: 'delete_comment',
  description: `Deletes a comment permanently by comment ID.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      commentId: {
        type: 'string',
        description: 'REQUIRED: The comment ID to delete'
      },
      ...workspaceParameter
    },
    required: ['commentId']
  }
};

export const getViewCommentsTool: Tool = {
  name: 'get_view_comments',
  description: `Gets all comments on a ClickUp view. Requires viewId.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      viewId: {
        type: 'string',
        description: 'REQUIRED: The view ID'
      },
      ...workspaceParameter
    },
    required: ['viewId']
  }
};

export const createViewCommentTool: Tool = {
  name: 'create_view_comment',
  description: `Creates a comment on a view. Required: viewId, commentText. Optional: notifyAll, assignee (user id).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      viewId: {
        type: 'string',
        description: 'REQUIRED: The view ID'
      },
      commentText: {
        type: 'string',
        description: 'REQUIRED: Comment body'
      },
      notifyAll: {
        type: 'boolean',
        description: 'Whether to notify all participants'
      },
      assignee: {
        type: 'number',
        description: 'Optional user ID to assign the comment to'
      },
      ...workspaceParameter
    },
    required: ['viewId', 'commentText']
  }
};

export const getListCommentsTool: Tool = {
  name: 'get_list_comments',
  description: `Gets all comments on a ClickUp list. Requires listId.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      listId: {
        type: 'string',
        description: 'REQUIRED: The list ID'
      },
      ...workspaceParameter
    },
    required: ['listId']
  }
};

export const createListCommentTool: Tool = {
  name: 'create_list_comment',
  description: `Creates a comment on a list. Required: listId, commentText. Optional: notifyAll, assignee.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      listId: {
        type: 'string',
        description: 'REQUIRED: The list ID'
      },
      commentText: {
        type: 'string',
        description: 'REQUIRED: Comment body'
      },
      notifyAll: {
        type: 'boolean',
        description: 'Whether to notify all participants'
      },
      assignee: {
        type: 'number',
        description: 'Optional user ID to assign the comment to'
      },
      ...workspaceParameter
    },
    required: ['listId', 'commentText']
  }
};

export const getCommentRepliesTool: Tool = {
  name: 'get_comment_replies',
  description: `Gets threaded replies for a parent comment. Requires commentId.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      commentId: {
        type: 'string',
        description: 'REQUIRED: Parent comment ID'
      },
      ...workspaceParameter
    },
    required: ['commentId']
  }
};

export const createCommentReplyTool: Tool = {
  name: 'create_comment_reply',
  description: `Creates a reply on an existing comment thread. Required: commentId (parent), commentText. Optional: notifyAll, assignee.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      commentId: {
        type: 'string',
        description: 'REQUIRED: Parent comment ID to reply under'
      },
      commentText: {
        type: 'string',
        description: 'REQUIRED: Reply body'
      },
      notifyAll: {
        type: 'boolean',
        description: 'Whether to notify all participants'
      },
      assignee: {
        type: 'number',
        description: 'Optional user ID to assign the comment to'
      },
      ...workspaceParameter
    },
    required: ['commentId', 'commentText']
  }
};

export const commentTools: Tool[] = [
  updateCommentTool,
  deleteCommentTool,
  getViewCommentsTool,
  createViewCommentTool,
  getListCommentsTool,
  createListCommentTool,
  getCommentRepliesTool,
  createCommentReplyTool
];

export async function handleUpdateComment(params: {
  commentId: string;
  commentText?: string;
  assignee?: number;
  resolved?: boolean;
  workspace?: string;
}) {
  try {
    if (!params.commentId) {
      return sponsorService.createErrorResponse('commentId is required');
    }
    if (
      params.commentText === undefined &&
      params.assignee === undefined &&
      params.resolved === undefined
    ) {
      return sponsorService.createErrorResponse(
        'At least one of commentText, assignee, or resolved is required'
      );
    }

    const { comment: commentService } = getServicesForWorkspace(params);
    const data: { comment_text?: string; assignee?: number; resolved?: boolean } = {};
    if (params.commentText !== undefined) {
      data.comment_text = params.commentText;
    }
    if (params.assignee !== undefined) {
      data.assignee = params.assignee;
    }
    if (params.resolved !== undefined) {
      data.resolved = params.resolved;
    }

    const comment = await commentService.updateComment(params.commentId, data);
    return sponsorService.createResponse({ comment }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error updating comment: ${error.message}`);
  }
}

export async function handleDeleteComment(params: { commentId: string; workspace?: string }) {
  try {
    if (!params.commentId) {
      return sponsorService.createErrorResponse('commentId is required');
    }

    const { comment: commentService } = getServicesForWorkspace(params);
    await commentService.deleteComment(params.commentId);
    return sponsorService.createResponse(
      { message: `Comment ${params.commentId} deleted successfully` },
      true
    );
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error deleting comment: ${error.message}`);
  }
}

export async function handleGetViewComments(params: { viewId: string; workspace?: string }) {
  try {
    if (!params.viewId) {
      return sponsorService.createErrorResponse('viewId is required');
    }

    const { comment: commentService } = getServicesForWorkspace(params);
    const comments = await commentService.getViewComments(params.viewId);
    return sponsorService.createResponse({ comments, count: comments.length }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting view comments: ${error.message}`);
  }
}

export async function handleCreateViewComment(params: {
  viewId: string;
  commentText: string;
  notifyAll?: boolean;
  assignee?: number;
  workspace?: string;
}) {
  try {
    if (!params.viewId) {
      return sponsorService.createErrorResponse('viewId is required');
    }
    if (!params.commentText) {
      return sponsorService.createErrorResponse('commentText is required');
    }

    const { comment: commentService } = getServicesForWorkspace(params);
    const comment = await commentService.createViewComment(params.viewId, {
      comment_text: params.commentText,
      notify_all: params.notifyAll,
      assignee: params.assignee
    });
    return sponsorService.createResponse({ comment, message: 'Comment created on view' }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating view comment: ${error.message}`);
  }
}

export async function handleGetListComments(params: { listId: string; workspace?: string }) {
  try {
    if (!params.listId) {
      return sponsorService.createErrorResponse('listId is required');
    }

    const { comment: commentService } = getServicesForWorkspace(params);
    const comments = await commentService.getListComments(params.listId);
    return sponsorService.createResponse({ comments, count: comments.length }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting list comments: ${error.message}`);
  }
}

export async function handleCreateListComment(params: {
  listId: string;
  commentText: string;
  notifyAll?: boolean;
  assignee?: number;
  workspace?: string;
}) {
  try {
    if (!params.listId) {
      return sponsorService.createErrorResponse('listId is required');
    }
    if (!params.commentText) {
      return sponsorService.createErrorResponse('commentText is required');
    }

    const { comment: commentService } = getServicesForWorkspace(params);
    const comment = await commentService.createListComment(params.listId, {
      comment_text: params.commentText,
      notify_all: params.notifyAll,
      assignee: params.assignee
    });
    return sponsorService.createResponse({ comment, message: 'Comment created on list' }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating list comment: ${error.message}`);
  }
}

export async function handleGetCommentReplies(params: { commentId: string; workspace?: string }) {
  try {
    if (!params.commentId) {
      return sponsorService.createErrorResponse('commentId is required');
    }

    const { comment: commentService } = getServicesForWorkspace(params);
    const replies = await commentService.getCommentReplies(params.commentId);
    return sponsorService.createResponse({ replies, count: replies.length }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting comment replies: ${error.message}`);
  }
}

export async function handleCreateCommentReply(params: {
  commentId: string;
  commentText: string;
  notifyAll?: boolean;
  assignee?: number;
  workspace?: string;
}) {
  try {
    if (!params.commentId) {
      return sponsorService.createErrorResponse('commentId is required');
    }
    if (!params.commentText) {
      return sponsorService.createErrorResponse('commentText is required');
    }

    const { comment: commentService } = getServicesForWorkspace(params);
    const comment = await commentService.createCommentReply(params.commentId, {
      comment_text: params.commentText,
      notify_all: params.notifyAll,
      assignee: params.assignee
    });
    return sponsorService.createResponse({ comment, message: 'Reply created' }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating comment reply: ${error.message}`);
  }
}
