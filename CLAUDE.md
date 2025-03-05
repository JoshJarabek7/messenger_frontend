# ChatGenius: AI-Enhanced Workplace Communication Platform

## Project Overview

ChatGenius is a Slack-like application that enhances workplace communication through AI. The platform provides users with AI avatars that can represent them when they're unavailable, bringing more nuance to digital communication while preserving the convenience of asynchronous collaboration.

## Implementation Status

The application has been extensively developed with the following components implemented:

1. **Core Infrastructure**: Complete database schema, authentication, and real-time messaging system
2. **UI Components**: Comprehensive interface with organizations, channels, direct messages, and user profiles
3. **API Endpoints**: Next.js API routes for AI features are in place and ready for implementation

Remaining work focuses on connecting the OpenAI API for the actual AI functionality directly in the Next.js API routes.

## Technology Stack

```
Frontend:
- React 19
- NextJS 15
- ShadCN UI components
- Sonner for toast notifications

Backend:
- Supabase for database, authentication, storage, and real-time functionality
- OpenAI for AI capabilities (to be implemented):
  - Embeddings: text-embedding-3-large (1536 dimensions)
  - Chat: o1 model with high reasoning setting
  - Vector storage in Supabase with pgvector
```

## Key Files for AI Integration

The following files need OpenAI API integration:

1. `/app/api/embeddings/route.ts`:

   - Implement real OpenAI embedding generation
   - Replace mock function with actual API calls

2. `/app/api/ai-response/route.ts`:

   - Implement OpenAI chat completion
   - Build context from user history and conversation
   - Use RAG for contextually relevant responses

3. `/components/join-organization-form.tsx`:
   - Implement vector search for organizations
   - Replace text filtering with semantic search

## Data Schema

- **Users**: Authentication, profiles, online status, AI personas
- **Organizations**: Teams with members and channels
- **Channels**: Topic-based messaging within organizations
- **Direct Messages**: Private conversations between users
- **Messages**: Text content with thread support and file attachments
- **Reactions**: Emoji reactions to messages
- **Notifications**: System for @mentions and other alerts

## Implemented Features

### User Management

- User registration with unique username validation
- Profile management including avatar uploads
- Online/offline status tracking
- AI persona customization

### Messaging

- Real-time message sending and receiving
- File attachments
- Emoji reactions
- Thread support
- @mentions system

### Organizations & Channels

- Create and join organizations
- Create channels within organizations
- Real-time slug validation
- Member management

## Development Guidelines

- Focus on feature completeness over security concerns
- Project is intended for local demonstration to hiring partners
- Keep track of tasks in the TODO.md file that is regularly updated
- Apply appropriate visual feedback for user actions
- Ensure compatibility with latest MacOS environment
- Supabase CLI is already installed via Homebrew
- DO NOT EVER EDIT ANYTHING IN components/ui, THOSE ARE OFFICIAL SHADCN COMPONENTS

## Environment Setup Requirements

To complete the integration, you will need:

- OpenAI API key in `.env.local`
- Supabase project with pgvector extension enabled
- Valid auth configuration for Supabase

Refer to TODO.md for the specific remaining implementation tasks.
