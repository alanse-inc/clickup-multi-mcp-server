import { workspaceService } from '../services/shared.js';
import { sponsorService } from '../utils/sponsor-service.js';

/**
 * Tool definition for getting all members in a ClickUp workspace
 */
export const getWorkspaceMembersTool = {
    name: 'get_workspace_members',
    description: 'Returns all members (users) in the ClickUp workspace/team. Useful for resolving assignees by name or email.',
    inputSchema: {
        type: 'object' as const,
        properties: {},
        required: []
    }
};

/**
 * Tool definition for finding a member by name or email
 */
export const findMemberByNameTool = {
    name: 'find_member_by_name',
    description: 'Finds a member in the ClickUp workspace by name or email. Returns the member object if found, or null if not found.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            nameOrEmail: {
                type: 'string',
                description: 'The name or email of the member to find.'
            }
        },
        required: ['nameOrEmail']
    }
};

/**
 * Tool definition for resolving an array of assignee names/emails to ClickUp user IDs
 */
export const resolveAssigneesTool = {
    name: 'resolve_assignees',
    description: 'Resolves an array of assignee names or emails to ClickUp user IDs. Returns an array of user IDs, or errors for any that cannot be resolved.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            assignees: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of assignee names or emails to resolve.'
            }
        },
        required: ['assignees']
    }
};

/// src/tools/member.ts

/**
 * Handler for get_workspace_members
 */
export async function handleGetWorkspaceMembers() {
    try {
        const members = await workspaceService.getWorkspaceMembers();
        return sponsorService.createResponse({ members }, true);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return sponsorService.createErrorResponse(`Failed to get workspace members: ${errorMessage}`);
    }
}

/**
 * Handler for find_member_by_name
 */
export async function handleFindMemberByName(parameters: any) {
    const { nameOrEmail } = parameters;
    if (!nameOrEmail) {
        throw new Error('nameOrEmail is required');
    }
    try {
        const members = await workspaceService.getWorkspaceMembers();
        const found = members.find((m: any) =>
            m.email?.toLowerCase() === nameOrEmail.toLowerCase() ||
            m.username?.toLowerCase() === nameOrEmail.toLowerCase() ||
            m.name?.toLowerCase() === nameOrEmail.toLowerCase()
        );
        return sponsorService.createResponse({ member: found || null }, true);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return sponsorService.createErrorResponse(`Failed to find member: ${errorMessage}`);
    }
}

/**
 * Handler for resolve_assignees
 */
export async function handleResolveAssignees(parameters: any) {
    const { assignees } = parameters;
    if (!Array.isArray(assignees)) {
        throw new Error('assignees must be an array');
    }
    try {
        const members = await workspaceService.getWorkspaceMembers();
        const resolved = assignees.map((input: string) => {
            const found = members.find((m: any) =>
                m.email?.toLowerCase() === input.toLowerCase() ||
                m.username?.toLowerCase() === input.toLowerCase() ||
                m.name?.toLowerCase() === input.toLowerCase()
            );
            return found ? found.id : null;
        });
        return sponsorService.createResponse({ userIds: resolved }, true);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return sponsorService.createErrorResponse(`Failed to resolve assignees: ${errorMessage}`);
    }
}