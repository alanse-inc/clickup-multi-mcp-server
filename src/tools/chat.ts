/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Chat Tools
 *
 * Provides MCP tools for managing ClickUp Chat (v3 API):
 * - Channel CRUD operations
 * - Message send, update, delete, and paginated listing
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { getServicesForWorkspace, workspaceParameter } from './workspace-helper.js';

//=============================================================================
// TOOL DEFINITIONS
//=============================================================================

export const getChatChannelsTool: Tool = {
  name: 'get_chat_channels',
  description: `Get all chat channels in the workspace.

Returns a list of all accessible chat channels including their IDs, names, types, and descriptions.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      ...workspaceParameter
    },
    required: []
  }
};

export const createChatChannelTool: Tool = {
  name: 'create_chat_channel',
  description: `Create a new chat channel in the workspace.

Requirements:
- name: REQUIRED - The name of the channel

Optional:
- type: Channel visibility ('public' or 'private', default: 'public')
- description: A description for the channel
- member_can_invite: Whether members can invite others to the channel`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'The name of the channel'
      },
      type: {
        type: 'string',
        enum: ['public', 'private'],
        description: "Channel visibility: 'public' or 'private' (default: 'public')"
      },
      description: {
        type: 'string',
        description: 'A description for the channel'
      },
      member_can_invite: {
        type: 'boolean',
        description: 'Whether members can invite others to the channel'
      },
      ...workspaceParameter
    },
    required: ['name']
  }
};

export const getChatChannelTool: Tool = {
  name: 'get_chat_channel',
  description: `Get details of a specific chat channel.

Requirements:
- channelId: REQUIRED - The ID of the channel`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      channelId: {
        type: 'string',
        description: 'The ID of the chat channel'
      },
      ...workspaceParameter
    },
    required: ['channelId']
  }
};

export const updateChatChannelTool: Tool = {
  name: 'update_chat_channel',
  description: `Update properties of an existing chat channel.

Requirements:
- channelId: REQUIRED - The ID of the channel to update

Optional (at least one should be provided):
- name: New name for the channel
- description: New description for the channel
- member_can_invite: Whether members can invite others`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      channelId: {
        type: 'string',
        description: 'The ID of the chat channel to update'
      },
      name: {
        type: 'string',
        description: 'New name for the channel'
      },
      description: {
        type: 'string',
        description: 'New description for the channel'
      },
      member_can_invite: {
        type: 'boolean',
        description: 'Whether members can invite others to the channel'
      },
      ...workspaceParameter
    },
    required: ['channelId']
  }
};

export const deleteChatChannelTool: Tool = {
  name: 'delete_chat_channel',
  description: `Delete a chat channel permanently.

Requirements:
- channelId: REQUIRED - The ID of the channel to delete

Warning: This action cannot be undone. All messages in the channel will be lost.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      channelId: {
        type: 'string',
        description: 'The ID of the chat channel to delete'
      },
      ...workspaceParameter
    },
    required: ['channelId']
  }
};

export const getChatMessagesTool: Tool = {
  name: 'get_chat_messages',
  description: `Get messages from a chat channel with optional cursor-based pagination.

Requirements:
- channelId: REQUIRED - The ID of the channel

Optional:
- cursor: Pagination cursor from a previous response to fetch the next page
- limit: Maximum number of messages to return per page`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      channelId: {
        type: 'string',
        description: 'The ID of the chat channel'
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor from a previous response to fetch the next page'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of messages to return per page'
      },
      ...workspaceParameter
    },
    required: ['channelId']
  }
};

export const sendChatMessageTool: Tool = {
  name: 'send_chat_message',
  description: `Send a new message to a chat channel.

Requirements:
- channelId: REQUIRED - The ID of the target channel
- content: REQUIRED - The text content of the message

Optional:
- notify_all: Whether to notify all channel members`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      channelId: {
        type: 'string',
        description: 'The ID of the chat channel to send the message to'
      },
      content: {
        type: 'string',
        description: 'The text content of the message'
      },
      notify_all: {
        type: 'boolean',
        description: 'Whether to notify all channel members'
      },
      ...workspaceParameter
    },
    required: ['channelId', 'content']
  }
};

export const updateChatMessageTool: Tool = {
  name: 'update_chat_message',
  description: `Update the content of an existing chat message.

Requirements:
- messageId: REQUIRED - The ID of the message to update
- content: REQUIRED - The new text content for the message`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      messageId: {
        type: 'string',
        description: 'The ID of the chat message to update'
      },
      content: {
        type: 'string',
        description: 'The new text content for the message'
      },
      ...workspaceParameter
    },
    required: ['messageId', 'content']
  }
};

export const deleteChatMessageTool: Tool = {
  name: 'delete_chat_message',
  description: `Delete a chat message permanently.

Requirements:
- messageId: REQUIRED - The ID of the message to delete

Warning: This action cannot be undone.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      messageId: {
        type: 'string',
        description: 'The ID of the chat message to delete'
      },
      ...workspaceParameter
    },
    required: ['messageId']
  }
};

//=============================================================================
// HANDLER FUNCTIONS
//=============================================================================

export async function handleGetChatChannels(params: {
  workspace?: string;
}) {
  try {
    const services = getServicesForWorkspace(params);
    const channels = await services.chat.getChannels();

    return sponsorService.createResponse({
      channels: channels.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        access: c.access,
        description: c.description,
        workspace_id: c.workspace_id,
        created_at: c.created_at
      })),
      count: channels.length
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting chat channels: ${error.message}`);
  }
}

export async function handleCreateChatChannel(params: {
  name: string;
  type?: 'public' | 'private';
  description?: string;
  member_can_invite?: boolean;
  workspace?: string;
}) {
  try {
    if (!params.name) return sponsorService.createErrorResponse('name is required');

    const services = getServicesForWorkspace(params);
    const { workspace, ...channelData } = params;
    const channel = await services.chat.createChannel(channelData);

    return sponsorService.createResponse({
      message: `Channel "${channel.name}" created successfully`,
      channel: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        description: channel.description,
        workspace_id: channel.workspace_id
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error creating chat channel: ${error.message}`);
  }
}

export async function handleGetChatChannel(params: {
  channelId: string;
  workspace?: string;
}) {
  try {
    if (!params.channelId) return sponsorService.createErrorResponse('channelId is required');

    const services = getServicesForWorkspace(params);
    const channel = await services.chat.getChannel(params.channelId);

    return sponsorService.createResponse({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      access: channel.access,
      description: channel.description,
      workspace_id: channel.workspace_id,
      created_at: channel.created_at
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting chat channel: ${error.message}`);
  }
}

export async function handleUpdateChatChannel(params: {
  channelId: string;
  name?: string;
  description?: string;
  member_can_invite?: boolean;
  workspace?: string;
}) {
  try {
    if (!params.channelId) return sponsorService.createErrorResponse('channelId is required');

    const { channelId, workspace, ...updateData } = params;
    const services = getServicesForWorkspace(params);
    const channel = await services.chat.updateChannel(channelId, updateData);

    return sponsorService.createResponse({
      message: 'Channel updated successfully',
      channel: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        description: channel.description
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error updating chat channel: ${error.message}`);
  }
}

export async function handleDeleteChatChannel(params: {
  channelId: string;
  workspace?: string;
}) {
  try {
    if (!params.channelId) return sponsorService.createErrorResponse('channelId is required');

    const services = getServicesForWorkspace(params);
    await services.chat.deleteChannel(params.channelId);

    return sponsorService.createResponse({
      message: `Channel ${params.channelId} deleted successfully`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error deleting chat channel: ${error.message}`);
  }
}

export async function handleGetChatMessages(params: {
  channelId: string;
  cursor?: string;
  limit?: number;
  workspace?: string;
}) {
  try {
    if (!params.channelId) return sponsorService.createErrorResponse('channelId is required');

    const services = getServicesForWorkspace(params);
    const result = await services.chat.getMessages(
      params.channelId,
      params.cursor,
      params.limit
    );

    return sponsorService.createResponse({
      messages: result.messages.map(m => ({
        id: m.id,
        content: m.content,
        channel_id: m.channel_id,
        created_by: m.created_by,
        created_at: m.created_at,
        reactions: m.reactions
      })),
      cursor: result.cursor,
      count: result.messages.length
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error getting chat messages: ${error.message}`);
  }
}

export async function handleSendChatMessage(params: {
  channelId: string;
  content: string;
  notify_all?: boolean;
  workspace?: string;
}) {
  try {
    if (!params.channelId) return sponsorService.createErrorResponse('channelId is required');
    if (!params.content) return sponsorService.createErrorResponse('content is required');

    const services = getServicesForWorkspace(params);
    const { channelId, workspace, ...messageData } = params;
    const message = await services.chat.sendMessage(channelId, messageData);

    return sponsorService.createResponse({
      message: 'Message sent successfully',
      sent_message: {
        id: message.id,
        content: message.content,
        channel_id: message.channel_id,
        created_by: message.created_by,
        created_at: message.created_at
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error sending chat message: ${error.message}`);
  }
}

export async function handleUpdateChatMessage(params: {
  messageId: string;
  content: string;
  workspace?: string;
}) {
  try {
    if (!params.messageId) return sponsorService.createErrorResponse('messageId is required');
    if (!params.content) return sponsorService.createErrorResponse('content is required');

    const services = getServicesForWorkspace(params);
    const message = await services.chat.updateMessage(params.messageId, params.content);

    return sponsorService.createResponse({
      message: 'Message updated successfully',
      updated_message: {
        id: message.id,
        content: message.content,
        channel_id: message.channel_id,
        created_at: message.created_at
      }
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error updating chat message: ${error.message}`);
  }
}

export async function handleDeleteChatMessage(params: {
  messageId: string;
  workspace?: string;
}) {
  try {
    if (!params.messageId) return sponsorService.createErrorResponse('messageId is required');

    const services = getServicesForWorkspace(params);
    await services.chat.deleteMessage(params.messageId);

    return sponsorService.createResponse({
      message: `Message ${params.messageId} deleted successfully`
    }, true);
  } catch (error: any) {
    return sponsorService.createErrorResponse(`Error deleting chat message: ${error.message}`);
  }
}

//=============================================================================
// EXPORTS
//=============================================================================

export const chatTools = [
  getChatChannelsTool,
  createChatChannelTool,
  getChatChannelTool,
  updateChatChannelTool,
  deleteChatChannelTool,
  getChatMessagesTool,
  sendChatMessageTool,
  updateChatMessageTool,
  deleteChatMessageTool
];
