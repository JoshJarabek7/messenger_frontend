# Slack Clone Frontend

A modern Slack style chat application with SvelteKit 5+, featuring real-time messaging, user search, and direct messaging capabilities.

Backend repository: [messenger_backend](https://github.com/JoshJarabek7/messenger_backend)

## Features

- Real-time messaging using WebSocket
- Direct messaging between users
- Workspace and channel management
- User and workspace search functionality
- Modern UI with Svelte Shadcn components
- Responsive dashboard layout
- Authentication and user management

## Prerequisites

- Node.js 23+ installed
- Backend server running (see backend README)
- npm or pnpm package manager

## Getting Started

1. Install dependencies:
```bash
npm install
# or
pnpm install
```

2. Set up environment variables (PLACEHOLDER):
Create a `.env` file in the root directory with:
```env
PUBLIC_API_URL=http://localhost:8000  # Backend API URL
PUBLIC_WS_URL=ws://localhost:8000/ws  # WebSocket URL
```

3. Start the development server:
```bash
npm run dev
# or
pnpm dev
```

To open the app in a new browser tab automatically:
```bash
npm run dev -- --open
# or
pnpm dev -- --open
```

## Building for Production (PLACEHOLDER)

1. Create a production build:
```bash
npm run build
# or
pnpm build
```

2. Preview the production build:
```bash
npm run preview
# or
pnpm preview
```

## Project Structure

- `/src/lib/components/` - Reusable Svelte components
- `/src/lib/stores/` - Svelte stores for state management
- `/src/routes/` - SvelteKit routes and layouts
- `/static/` - Static assets

## Development Notes

- The app uses SvelteKit's server-side rendering capabilities
- WebSocket connection is managed through the websocket store
- User authentication state is persisted using cookies
- UI components are built using Svelte Shadcn

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
