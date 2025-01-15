### Current todo list

- [ ] Refactor the database models
- [ ] Simplify the websocket pubsub
- [ ] Implement pgvector for vector search
- [ ] Implement caching with redis
- [ ] Third party auth with OAuth2

### Planning

We should preload all users that the current user would be subscribed to on initial connection,
and then only subscribe to new users as they join. Otherwise, when returning a user, we should
only return their User ID, which the client can map to the user object in the store.

We should change the avatar_url field name to be avatar_s3_key which will be the key in the S3 bucket.
When returning a full user object, we should add an avatar_url field, which will be the presigned url using the avatar s3 key.

When doing search, we should be returning the full user object, not just the user ID.

We should implement read/unread message counts for each channel/conversation, based on when the user last read a channel/conversation.

To make things easier, we should probably split up conversations and channels into separate tables again.

Be sure to handle cascading deletes when deleting a workspace, channel, or conversation. Also, be sure to delete files from s3 when deleting a workspace, channel, or conversation.

We should increase the expiration time of the presigned url for the avatar to 30 days.

We need to prepare the database models for the Week 2 AI implementations. Users will have bot responses when the user is not available.They should have a system prompt in their user settings that gives instructions on how to respond and if they want a bot response at all. A bot response should have an indictor on the frontend that it is a bot response. Messages should also have a field indicating if it is a bot response.

Potentially implement notification system for when a user is mentioned in a message.

When a user leaves or is removed from a workspace, we should remove them from all channels and delete all of their messages and files.

Threads should only be one level deep.

Network API classes should handle requests and responses.

Stores should strictly handle state. Stores should almost exclusively be communicating with websocket messages, other than on initial load and updating the object.

### WebSocket Message Types

- `user_joined_workspace`: Should handle both when a user joins a workspace and when a user is added to a workspace.
- `user_left_workspace`: Should handle both when a user leaves a workspace and when a user is removed from a workspace.
- `user_joined_channel`: Should handle both when a user joins a channel and when a user is added to a channel.
- `user_left_channel`: Should handle both when a user leaves a channel and when a user is removed from a channel.
- `user_updated`: Should handle when a user is updated. Be sure to handle the new profile picture if it is modified.
- `user_active`: Should handle when a user is active.
- `conversation_created`: Should handle when a conversation is created with a user.
- `message_sent`: Should handle when a direct message is sent.
- `channel_created`: Should handle when a channel is created.
- `channel_updated`: Should handle when a channel is updated.
- `channel_deleted`: Should handle when a channel is deleted.
- `reaction_added`: Should handle when a reaction is added to a message.
- `reaction_removed`: Should handle when a reaction is removed from a message.
- `user_is_typing`: Should handle when a user is typing in a channel.
- `user_stopped_typing`: Should handle when a user stops typing in a channel.
- `workspace_role_updated`: Should handle when a user's workspace role is updated.
- `workspace_deleted`: Should handle when a workspace is deleted.
- `workspace_file_added`: Should handle when a file is added to a workspace.
- `workspace_file_deleted`: Should handle when a file is deleted from a workspace.

### Different Stores

We're going to make sure that we're referencing IDs in the stores, not the full objects.
This allows for less overhead when sending data over the websocket.

- `users` store: This will store all users in the workspace.

  - `id`: The user's ID. Will act as the key in the store.
  - `display_name`: The user's display name
  - `image_s3_key`: The s3 key for the user's profile picture
  - `username`: The user's username
  - `email`: The user's email
  - `image_url`: The user's presigned profile picture url
  - `image_blob`: The user's profile picture blob
  - `is_online`: Whether the user is online

- `workspaces` store: This will store all workspaces that the user is a part of.

  - `id`: The workspace's ID. Will act as the key in the store.
  - `name`: The workspace's name
  - `description`: The workspace's description
  - `slug`: The workspace's slug
  - `image_s3_key`: The s3 key for the workspace's image
  - `image_url`: The presigned image url for the workspace's image
  - `files`: An array of file ids
  - `channels`: An array of channel ids
  - `owner_id`: The id of the user that owns the workspace
  - `admins`: An array of user ids that are admins of the workspace
  - `members`: An array of user ids that are members of the workspace

- `channels` store: This will store all channels the user is a part of.

  - `id`: The channel's ID. Will act as the key in the store.
  - `name`: The channel's name
  - `description`: The channel's description
  - `slug`: The channel's slug
  - `workspace_id`: The id of the workspace the channel is in
  - `messages`: An array of message objects.
    - `id`: The message's ID
      - `user_id`: The id of the user that sent the message
      - `content`: The textual data of the message
      - `attachment`: An attachment object.
        - `id`: The attachment's ID
        - `file_s3_key`: The s3 key for the attachment
        - `file_url`: The presigned url for the attachment
        - `file_name`: The name of the file
        - `file_type`: The type of the file
        - `file_size`: The size of the file
      - `reactions`: A dictionary of reaction objects. The key will be the reaction emoji.
        - `emoji`: The emoji for the reaction. A dictionary.
          - `user_id`: The id of the user that reacted
          - `reaction_id`: The id of the reaction
      - `children`: An array of message objects.
      - `parent_id`: The id of the parent message.
      - `created_at`: The timestamp of when the message was created.
      - `thread_input_text`: The text value of the input field in the channel. We need to have different input fields for non-thread and thread inputs.
      - `thread_input_attachment`: The attachment object of the input field in the channel. We need to have different input fields for non-thread and thread inputs.
  - `users_typing`: A hashset of user ids that are typing in the channel.
  - `last_message_sent_at`: The timestamp of when the last message was sent in the channel.
  - `last_viewed_at`: The timestamp of when the user last viewed the channel.
  - `unread_message_count`: The number of unread messages in the channel.
  - `main_input_text`: The text value of the input field in the channel. We need to have different input fields for non-thread and thread inputs.
  - `main_input_attachment`: The attachment object of the input field in the channel. We need to have different input fields for non-thread and thread inputs.

- `direct_messages` store: This will store all direct messages the user is a part of.

  - `id`: The direct message's ID. Will act as the key in the store.
    - `user_id`: The other user's id.
    - `messages`: An array of message objects. Sorted by created_at. Newest messages at the end. See above.
      - `thread_input_text`: The text value of the input field in the channel. We need to have different input fields for non-thread and thread inputs.
      - `thread_input_attachment`: The attachment object of the input field in the channel. We need to have different input fields for non-thread and thread inputs.
    - `users_typing`: A hashset of user ids that are typing in the direct message conversation.
    - `files`: An array of file ids.
    - `last_message_sent_at`: The timestamp of when the last message was sent in the direct message conversation.
    - `last_viewed_at`: The timestamp of when the user last viewed the direct message conversation.
    - `unread_message_count`: The number of unread messages in the direct message conversation.
    - `main_input_text`: The text value of the input field in the direct message conversation.
    - `main_input_attachment`: The attachment object of the input field in the direct message conversation.

- `selection` store: This will store the currently selected channel, direct message, workspace, dialog open states, etc. Should allow for simple switching between different selections.

  - `selected_channel_id`: The id of the currently selected channel.
  - `selected_direct_message_id`: The id of the currently selected direct message.
  - `selected_workspace_id`: The id of the currently selected workspace.
  - `global_search_open`: Determines if the global search dialog is open.
  - `global_search_tab`: The currently selected tab in the global search dialog.
  - `direct_message_user_search_open`: Determines if the direct message user search dialog is open.

- `websocket` store: This will store the websocket connection. Global singleton.
