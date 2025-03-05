# ChatGenius: AI-Enhanced Workplace Communication

ChatGenius is a modern workplace communication platform that combines the familiar interface of Slack with innovative AI capabilities. The platform creates AI avatars that represent users when they're offline, ensuring seamless communication regardless of availability.

## 🌟 Key Features

### AI-Powered Avatars
- **Personalized AI Representation**: Custom AI personas respond on your behalf when you're offline
- **Contextual Understanding**: AI avatars use message history to provide relevant responses
- **Clear Indicators**: Visual cues distinguish between human and AI-generated messages

### Real-Time Communication
- **Channels & Direct Messages**: Organize conversations by topic or have private discussions
- **Rich Message Formatting**: Share code blocks, files, links, and more
- **Interactive Components**: Emoji reactions, threads, and @mentions

### Organization Management
- **Team Workspaces**: Create separate organizations for different teams
- **Channel Organization**: Structure communications with public and private channels
- **Member Controls**: Invite, manage, and organize team members

## 🛠️ Tech Stack

- **Frontend**: React 19, Next.js 15, ShadCN/UI, Tailwind CSS, TypeScript
- **Backend**: Supabase (PostgreSQL), Next.js API Routes
- **Real-time**: Supabase Realtime for instant messaging and presence indicators
- **AI Components**: OpenAI embeddings and chat completions with RAG for contextually relevant responses
- **Authentication**: Secure email/password auth with Supabase Auth
- **File Storage**: Supabase Storage for avatar images and file attachments

## 📝 Development Status

ChatGenius is currently in active development with:

- ✅ Complete UI/UX implementation
- ✅ User authentication and profile management
- ✅ Organizations, channels, and direct messaging
- ✅ Real-time message delivery and status updates
- ✅ API endpoints for AI integration
- ✅ OpenAI integrations for AI avatars

## 📊 Architecture

- **App Directory**: Next.js App Router with dedicated directories for authenticated and public routes
- **API Routes**: Server-side functionality for user management, messaging, and AI features
- **Component Library**: Reusable UI components built with ShadCN/UI and Tailwind CSS
- **Database**: Structured PostgreSQL schema with vector storage capabilities for embeddings

---

Built with ❤️ using Next.js, Supabase, and OpenAI