// Global type definitions for the entire application

interface Window {
  // Custom function to remove a DM conversation from the sidebar
  // This is used as a backup mechanism when real-time events don't propagate
  removeDirectMessageFromSidebar?: (conversationId: string) => void;
}

export {};
