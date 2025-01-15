export enum MessageType {
	// User Events
	USER_JOINED_WORKSPACE = 'user_joined_workspace',
	USER_LEFT_WORKSPACE = 'user_left_workspace',
	USER_UPDATED = 'user_updated',
	USER_ONLINE = 'user_online',
	USER_OFFLINE = 'user_offline',
	USER_IS_TYPING = 'user_is_typing',
	USER_STOPPED_TYPING = 'user_stopped_typing',

	// Conversation Events
	CONVERSATION_CREATED = 'conversation_created',
	CONVERSATION_UPDATED = 'conversation_updated',
	CONVERSATION_DELETED = 'conversation_deleted',

	// Message Events
	MESSAGE_SENT = 'message_sent',
	MESSAGE_UPDATED = 'message_updated',
	MESSAGE_DELETED = 'message_deleted',

	// Channel Events
	CHANNEL_CREATED = 'channel_created',
	CHANNEL_UPDATED = 'channel_updated',
	CHANNEL_DELETED = 'channel_deleted',

	// Reaction Events
	REACTION_ADDED = 'reaction_added',
	REACTION_REMOVED = 'reaction_removed',

	// Workspace Events
	WORKSPACE_CREATED = 'workspace_created',
	WORKSPACE_UPDATED = 'workspace_updated',
	WORKSPACE_DELETED = 'workspace_deleted',
	WORKSPACE_ROLE_UPDATED = 'workspace_role_updated',

	// File Events
	FILE_UPLOADED = 'file_uploaded',
	FILE_UPDATED = 'file_updated',
	FILE_DELETED = 'file_deleted',
	WORKSPACE_FILE_ADDED = 'workspace_file_added',
	WORKSPACE_FILE_DELETED = 'workspace_file_deleted'
}
