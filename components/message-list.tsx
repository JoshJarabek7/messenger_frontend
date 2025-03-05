'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { CircleUser, Reply, MoreHorizontal, Bot, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { toggleReactionAction } from '@/app/actions';
import { Database } from '@/types/supabase';
import { useUserContext } from '@/hooks/use-user-context';
import MessageComposer from './message-composer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  User,
  Message as AppMessage,
  Reaction as AppReaction,
  FileAttachment as AppFileAttachment,
} from '@/types/app';
import { nullToUndefined } from '@/utils/type-utils';

// For compatibility with the existing code
export type MessageListUser = User;

// Extended reaction type for displaying usernames in tooltips
export type Reaction = AppReaction & {
  username?: string;
};

export type FileAttachment = AppFileAttachment;

// For the Message, we need a custom interface because we're joining tables
export interface Message extends Omit<AppMessage, 'parent_message_id'> {
  id: string;
  content: string;
  created_at: string;
  is_ai_generated: boolean;
  parent_message_id: string | null; // Keep this as null for compatibility with database
  sender: User;
  reactions: Reaction[];
  file_attachments: FileAttachment[];
  reply_count?: number; // Count of replies to this message
}

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  organizationId: string;
  channelId?: string;
  conversationId?: string;
  members?: User[]; // Channel or conversation members for @mentions
}

const MessageItem = React.memo(function MessageItem({
  message,
  currentUser,
  onReactionAdd,
  onReplyClick,
}: {
  message: Message;
  currentUser: User;
  onReactionAdd: (messageId: string, emoji: string) => void;
  onReplyClick: (message: Message) => void;
}) {
  const { currentUser: contextUser, userProfiles } = useUserContext();
  const isCurrentUser = message.sender.id === currentUser.id;

  // Create a stable reference for message date
  const messageDate = useMemo(() => new Date(message.created_at), [message.created_at]);

  // Start with an empty string to avoid hydration mismatch
  const [formattedDate, setFormattedDate] = useState<string>('');

  // Format date only on the client side to avoid hydration mismatches
  useEffect(() => {
    // Set the initial date format
    setFormattedDate(formatDistanceToNow(messageDate, { addSuffix: true }));

    // Update the time display periodically
    const updateTime = () => {
      setFormattedDate(formatDistanceToNow(messageDate, { addSuffix: true }));
    };

    // Update every 60 seconds for "minutes ago" changes
    const intervalId = setInterval(updateTime, 60000);
    return () => clearInterval(intervalId);
  }, [messageDate]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  // Get the updated user data from either context current user or user profiles
  const senderWithUpdatedAvatar =
    message.sender.id === currentUser.id && contextUser
      ? { ...message.sender, avatar_url: contextUser.avatar_url }
      : userProfiles[message.sender.id]
        ? { ...message.sender, ...userProfiles[message.sender.id] }
        : message.sender;

  // Common emojis for quick reactions
  const commonEmojis = ['👍', '❤️', '😂', '🎉', '👏', '🔥'];

  // Handle clicking outside the emoji picker
  useEffect(() => {
    if (!showEmojiPicker) return;

    console.log('Emoji picker opened');

    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        console.log('Click outside emoji picker detected');
        setShowEmojiPicker(false);
      }
    };

    // Add event listener immediately
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside);
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      console.log('Emoji picker cleanup');
    };
  }, [showEmojiPicker]);

  const handleReactionClick = (emoji: string) => {
    // Add error handling to track potential issues
    try {
      console.log('Reaction click:', emoji, 'for message:', message.id);

      // Call parent handler
      onReactionAdd(message.id, emoji);
      setShowEmojiPicker(false);
    } catch (err) {
      console.error('Error in reaction click handler:', err);
    }
  };

  // Enhanced function to handle emoji button clicks
  const toggleEmojiPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Emoji button clicked, current state:', showEmojiPicker);

    // Calculate and set position before changing visibility state
    if (emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      console.log('Button position:', rect.top, rect.left);

      // Always update position when toggling
      requestAnimationFrame(() => {
        if (emojiPickerRef.current) {
          emojiPickerRef.current.style.position = 'fixed';
          emojiPickerRef.current.style.bottom = `${window.innerHeight - rect.top + 5}px`;
          emojiPickerRef.current.style.left = `${rect.left - 180}px`; // Align right side with button
        }
      });
    }

    // Toggle visibility - explicitly set to true when false, and vice versa
    const newVisibility = !showEmojiPicker;
    setShowEmojiPicker(newVisibility);
    if (newVisibility) {
      console.log('Emoji picker opened');
    }
  };

  const handleReplyClick = () => {
    // Open a thread view with this message as parent
    onReplyClick(message);
  };

  return (
    <div
      id={`message-${message.id}`}
      className="group flex gap-3 py-2 px-2 hover:bg-accent/50 rounded-md"
    >
      {/* Avatar container with presence indicator - fixed positioning */}
      <div className="flex-shrink-0 relative h-9 w-9">
        {senderWithUpdatedAvatar.avatar_url ? (
          senderWithUpdatedAvatar.avatar_url.startsWith('data:image/') ? (
            // Handle base64 images
            <div
              className="h-9 w-9 rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url(${senderWithUpdatedAvatar.avatar_url})` }}
            />
          ) : (
            // Handle normal URLs
            <Image
              src={senderWithUpdatedAvatar.avatar_url}
              alt={senderWithUpdatedAvatar.display_name || senderWithUpdatedAvatar.username}
              width={36}
              height={36}
              className="rounded-full"
            />
          )
        ) : (
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
            <CircleUser className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {/* Presence indicator - absolute positioned within the avatar container with improved positioning */}
        <div
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
            senderWithUpdatedAvatar.status === 'online'
              ? 'bg-green-500'
              : senderWithUpdatedAvatar.status === 'away'
                ? 'bg-yellow-500'
                : 'bg-red-500'
          }`}
          style={{ zIndex: 10 }}
          title={`${senderWithUpdatedAvatar.display_name || senderWithUpdatedAvatar.username} is ${senderWithUpdatedAvatar.status || 'offline'}`}
        />
      </div>

      {/* Message content and reactions */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {message.sender.display_name || message.sender.username}
          </span>

          {message.is_ai_generated && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Bot className="h-3 w-3" />
              AI
            </span>
          )}

          <span className="text-xs text-muted-foreground">{formattedDate}</span>
        </div>

        <div className="mt-1 whitespace-pre-wrap">
          {/* Format message content to highlight mentions */}
          {message.content.split(/(@\w+)/).map((part, i) => {
            // If this part is a mention (@username)
            if (part.startsWith('@')) {
              return (
                <span key={i} className="bg-primary/10 text-primary rounded px-1 font-medium">
                  {part}
                </span>
              );
            }
            return part;
          })}
        </div>

        {message.file_attachments && message.file_attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.file_attachments.map(file => {
              const handleDownload = async () => {
                try {
                  const supabase = createClient();
                  const { data, error } = await supabase.storage
                    .from('attachments')
                    .download(file.file_path);

                  if (error) {
                    console.error('Error downloading file:', error);
                    toast.error('Failed to download file');
                    return;
                  }

                  // Create a download link and trigger the download
                  const url = URL.createObjectURL(data);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = file.file_name;
                  document.body.appendChild(a);
                  a.click();

                  // Cleanup
                  URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (err) {
                  console.error('Error downloading file:', err);
                  toast.error('Failed to download file');
                }
              };

              return (
                <div
                  key={file.id}
                  className="border rounded-md p-2 bg-muted/50 text-sm flex items-center gap-2 cursor-pointer hover:bg-muted"
                  onClick={handleDownload}
                >
                  <span className="truncate max-w-[180px] text-xs">{file.file_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {groupReactions(message.reactions).map(group => (
              <TooltipProvider key={group.emoji}>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs',
                        group.users.includes(currentUser.id) && 'bg-primary/20'
                      )}
                      onClick={() => handleReactionClick(group.emoji)}
                    >
                      <span>{group.emoji}</span>
                      <span>{group.count}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs p-1">
                      {group.usernames.map((username, i) => (
                        <div key={i}>{username}</div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}
      </div>

      {/* Message actions */}
      <div className="flex items-start gap-1 pt-1 relative">
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="bg-background border border-input rounded-md p-3 shadow-xl flex flex-wrap gap-2 z-[999] w-72"
            style={{
              position: 'fixed',
              bottom: '0',
              left: '0',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              zIndex: 9999,
            }}
          >
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                className="hover:bg-accent p-2.5 rounded text-center text-lg w-12 h-12 flex items-center justify-center"
                onClick={e => {
                  e.stopPropagation();
                  handleReactionClick(emoji);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <button
          ref={emojiButtonRef}
          type="button"
          className="rounded-full p-1.5 h-8 w-8 bg-primary/10 hover:bg-primary/20 flex items-center justify-center"
          onClick={toggleEmojiPicker}
          data-testid="emoji-button"
        >
          <Smile className="h-4 w-4 text-primary" />
        </button>

        <Button size="icon" variant="ghost" className="h-6 w-6 relative" onClick={handleReplyClick}>
          <Reply className="h-4 w-4" />
          {message.reply_count && message.reply_count > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {message.reply_count > 9 ? '9+' : message.reply_count}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Copy Text</DropdownMenuItem>
            <DropdownMenuItem>Copy Link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export default function MessageList({
  messages: initialMessages,
  currentUser,
  organizationId,
  channelId,
  conversationId,
}: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);

  // Track scroll position helper function (defined outside useCallback for safety)
  const checkScrollPosition = (
    scrollElement: HTMLDivElement | null,
    currentScrolled: boolean,
    currentNewCount: number
  ) => {
    if (!scrollElement) return { showButton: false, isScrolled: false, resetCount: false };

    const { scrollHeight, scrollTop, clientHeight } = scrollElement;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Consider "scrolled up" if more than 150px from bottom
    const isScrolledUp = distanceFromBottom > 150;
    const shouldResetCount = distanceFromBottom < 50 && currentNewCount > 0;

    return {
      showButton: isScrolledUp,
      isScrolled: isScrolledUp,
      resetCount: shouldResetCount,
      distanceFromBottom,
    };
  };

  // Memoized handler using the helper function
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const result = checkScrollPosition(scrollRef.current, isUserScrolled, newMessageCount);

    console.log(
      `Scroll position: ${result.distanceFromBottom}px from bottom, showing button: ${result.showButton}`
    );

    if (isUserScrolled !== result.isScrolled) {
      console.log(`Updating isUserScrolled from ${isUserScrolled} to ${result.isScrolled}`);
    }

    // Update UI state based on scroll position
    setShowScrollButton(result.showButton);
    setIsUserScrolled(result.isScrolled);

    // Reset new message count if scrolled to bottom
    if (result.resetCount) {
      setNewMessageCount(0);
    }
  }, [isUserScrolled, newMessageCount]);

  // Function to scroll to bottom - also use useCallback
  const scrollToBottom = useCallback(() => {
    console.log('scrollToBottom called');

    // Execute immediately without setTimeout
    if (scrollRef.current) {
      console.log('Scrolling to bottom, starting scroll animation');

      // Use smooth scrolling for better UX
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });

      // Reset UI state
      setNewMessageCount(0);

      // We'll rely on the scroll event to update isUserScrolled naturally
      // The scroll event will fire when the smooth scroll animation completes

      // Set up a one-time scroll listener to detect when animation is done
      const handleScrollEnd = () => {
        if (scrollRef.current) {
          const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

          console.log(`After scroll animation: ${distanceFromBottom}px from bottom`);

          // Update state only if we're actually at the bottom
          if (distanceFromBottom < 50) {
            setIsUserScrolled(false);
          }

          // Remove this listener after it fires once
          scrollRef.current.removeEventListener('scrollend', handleScrollEnd);
        }
      };

      // Add the listener for scrollend event (modern browsers)
      // This fires when a programmatic scroll finishes
      scrollRef.current.addEventListener('scrollend', handleScrollEnd, { once: true });
    }
  }, []);

  // Stable message IDs reference to prevent loops
  const messageIdsRef = useRef<Set<string>>(new Set());

  // Last refresh timestamp to prevent rapid firing
  const lastRefreshTimeRef = useRef<number>(0);

  // Refresh messages - completely stabilized with improved memo handling
  const refreshMessages = React.useCallback(async () => {
    // Throttle refreshes to at most once every 500ms
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 500) {
      console.log('Throttling message refresh - called too soon');
      return;
    }
    lastRefreshTimeRef.current = now;

    // Use the current refs to safely access channel/conversation ID
    const activeChannelId = channelId;
    const activeConversationId = conversationId;

    if (!activeChannelId && !activeConversationId) return;

    // Use the stable supabase client reference
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = createClient();
    }
    const supabase = supabaseClientRef.current;

    console.log(
      'Refreshing messages for',
      activeChannelId ? `channel ${activeChannelId}` : `conversation ${activeConversationId}`
    );

    // Capture current scroll position before fetching - using the safe helper
    const scrollResult = checkScrollPosition(scrollRef.current, isUserScrolled, newMessageCount);

    try {
      // Create a unique key for this query to avoid duplicate refreshes
      const queryKey = activeChannelId || activeConversationId;

      const query = supabase
        .from('messages')
        .select(
          `
          id,
          content,
          created_at,
          is_ai_generated,
          parent_message_id,
          sender:users (
            id,
            username,
            display_name,
            avatar_url,
            status
          ),
          reactions (
            id,
            emoji,
            user_id
          ),
          file_attachments (
            id,
            file_name,
            file_type,
            file_path,
            file_size
          )
        `
        )
        .is('parent_message_id', null) // Only get top-level messages, not thread replies
        .order('created_at', { ascending: true }) // Important: ascending order
        .limit(50);

      // Apply the appropriate filter based on the context
      const filteredQuery = activeChannelId
        ? query.eq('channel_id', activeChannelId)
        : activeConversationId
          ? query.eq('conversation_id', activeConversationId)
          : query;

      const { data, error } = await filteredQuery;

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      if (data) {
        // Process messages into our format
        const formattedMessages: Message[] = data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          is_ai_generated: msg.is_ai_generated,
          parent_message_id: msg.parent_message_id,
          sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
          reactions: msg.reactions || [],
          file_attachments: msg.file_attachments || [],
          reply_count: 0, // Will be updated below
        }));

        // Fetch reply counts for these messages - simplified approach without group_by
        try {
          const messageIds = formattedMessages.map(m => m.id);
          if (messageIds.length > 0) {
            // Direct query approach instead of group_by
            const { data: replyMessages } = await supabase
              .from('messages')
              .select('parent_message_id')
              .in('parent_message_id', messageIds);

            if (replyMessages && replyMessages.length > 0) {
              // Count replies manually
              const countMap = new Map();

              replyMessages.forEach((msg: any) => {
                const parentId = msg.parent_message_id;
                countMap.set(parentId, (countMap.get(parentId) || 0) + 1);
              });

              // Update messages with reply counts
              formattedMessages.forEach(msg => {
                const count = countMap.get(msg.id);
                if (count) {
                  msg.reply_count = count;
                }
              });
            }
          }
        } catch (err) {
          console.error('Error fetching reply counts:', err);
        }

        // Detect new messages using our stable ref instead of messages state
        const newMessages: Message[] = [];

        // Update our current message IDs set
        const newMessageIds = new Set<string>();
        for (const msg of formattedMessages) {
          newMessageIds.add(msg.id);
          if (!messageIdsRef.current.has(msg.id)) {
            newMessages.push(msg);
          }
        }

        // Update the ref with current message IDs
        messageIdsRef.current = newMessageIds;

        // Check if reactions have changed even if message IDs are the same
        // This is important for real-time updates of reactions
        const hasReactionChanges =
          messages.length === formattedMessages.length &&
          formattedMessages.some((newMsg, idx) => {
            if (idx >= messages.length) return false;
            const oldMsg = messages[idx];

            // Need to handle undefined reactions properly first
            const oldReactions = oldMsg.reactions || [];
            const newReactions = newMsg.reactions || [];

            // Debug reactions on specific message for tracking real-time updates
            if (oldReactions.length !== newReactions.length) {
              console.log(`🔄 Reaction count changed for message ${newMsg.id}: 
                was ${oldReactions.length}, now ${newReactions.length}`);
              return true;
            }

            // Compare reaction contents by stringifying and comparing the most important fields
            const simplifyReaction = (r: any) => ({
              id: r.id,
              emoji: r.emoji,
              user_id: r.user_id,
            });

            const oldSimplified = oldReactions
              .map(simplifyReaction)
              .sort((a: any, b: any) => a.id.localeCompare(b.id));
            const newSimplified = newReactions
              .map(simplifyReaction)
              .sort((a: any, b: any) => a.id.localeCompare(b.id));

            const oldStr = JSON.stringify(oldSimplified);
            const newStr = JSON.stringify(newSimplified);

            // If we found a difference in this message's reactions
            if (oldStr !== newStr) {
              console.log(`🔄 Reaction content changed for message ${newMsg.id}`);
              return true;
            }

            return false;
          });

        // Update state if there are new messages, different count, or reaction changes
        if (
          newMessages.length > 0 ||
          formattedMessages.length !== messages.length ||
          hasReactionChanges
        ) {
          // If only reactions changed, log this fact
          if (
            hasReactionChanges &&
            newMessages.length === 0 &&
            formattedMessages.length === messages.length
          ) {
            console.log('Updating messages due to reaction changes');
          }

          // Update messages state using functional update
          setMessages(formattedMessages);

          // Handle new messages display when user is scrolled up
          if (newMessages.length > 0 && scrollResult.isScrolled) {
            console.log(`${newMessages.length} new messages detected while user was scrolled up`);
            setNewMessageCount(prev => prev + newMessages.length);
            setIsUserScrolled(true);
            setShowScrollButton(true);
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error refreshing messages:', err);
    }
  }, [channelId, conversationId, isUserScrolled, newMessageCount]);

  // Update message IDs ref when messages change (but don't trigger refresh)
  useEffect(() => {
    messageIdsRef.current = new Set(messages.map(m => m.id));
  }, [messages]);

  // Initially load messages - with stable reference to avoid loops
  const initialLoadRef = useRef({
    isLoaded: false,
    channelId: channelId,
    conversationId: conversationId,
  });

  // Listen for custom refresh events from message composer
  useEffect(() => {
    const handleRefreshEvent = (event: CustomEvent) => {
      const detail = event.detail;

      // Make sure this event is for our channel/conversation
      if (
        (detail.channelId && detail.channelId === channelId) ||
        (detail.conversationId && detail.conversationId === conversationId)
      ) {
        console.log('Received refresh-messages event, forcing refresh');
        try {
          refreshMessages().catch(err => {
            console.error('Error during forced message refresh:', err);
          });

          // Also refresh thread messages if we have an active thread
          if (activeThread && detail.parentMessageId === activeThread.id) {
            console.log('Refreshing thread messages from custom event');
            loadThreadMessages(activeThread.id)
              .then(replies => {
                console.log('Thread messages refreshed, got', replies.length, 'replies');
                setThreadMessages(replies);
              })
              .catch(err => {
                console.error('Error refreshing thread messages from event:', err);
              });
          }
        } catch (err) {
          console.error('Exception during forced message refresh:', err);
        }
      }
    };

    // Add event listener
    window.addEventListener('refresh-messages', handleRefreshEvent as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('refresh-messages', handleRefreshEvent as EventListener);
    };
  }, [channelId, conversationId, refreshMessages, activeThread]);

  // Initial load when channel/conversation changes
  useEffect(() => {
    const needsRefresh =
      // Not yet loaded
      !initialLoadRef.current.isLoaded ||
      // Or the channel changed
      initialLoadRef.current.channelId !== channelId ||
      initialLoadRef.current.conversationId !== conversationId;

    if (needsRefresh) {
      console.log('Initial load or channel changed, refreshing messages');

      // Update our ref to mark this combination as loaded
      initialLoadRef.current = {
        isLoaded: true,
        channelId: channelId,
        conversationId: conversationId,
      };

      // Load messages with error handling
      try {
        refreshMessages().catch(err => {
          console.error('Error during initial message load:', err);
        });
      } catch (err) {
        console.error('Exception during initial message load:', err);
      }
    }
  }, [channelId, conversationId, refreshMessages]);

  // Add automatic refresh as main mechanism when real-time isn't dependable
  useEffect(() => {
    // Only set up if we're in a channel or conversation
    if (!channelId && !conversationId) return;

    console.log('Setting up timed refresh as backup');

    // Refresh every 3 seconds
    const intervalId = setInterval(() => {
      refreshMessages().catch(err => {
        console.error('Error in timed refresh:', err);
      });
    }, 3000);

    // Clean up on unmount or channel/conversation change
    return () => {
      clearInterval(intervalId);
    };
  }, [channelId, conversationId, refreshMessages]);

  // Store Supabase channel in a ref to avoid it being recreated
  // Use any type but add our custom property
  interface ExtendedChannel {
    isConnected?: boolean;
    [key: string]: any;
  }

  const channelRef = useRef<ExtendedChannel | null>(null);

  // Create a single stable Supabase client instance
  const supabaseClientRef = useRef<any>(null);

  // Initialize the client once
  useEffect(() => {
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = createClient();
      console.log('Created stable Supabase client instance');
    }

    return () => {
      // No need to clean up the client itself, it's managed globally
    };
  }, []);

  // Connection status tracking to prevent loops
  const connectionStatusRef = useRef({
    isConnecting: false,
    lastAttemptTime: 0,
    attemptCount: 0,
    key: '',
  });

  // Set up real-time subscription to messages with loop prevention
  useEffect(() => {
    // Use an identifier to track the current subscription target
    const currentId = channelId || conversationId || '';
    if (!currentId) return;

    // Create a stable key for this channel/conversation to prevent infinite loop
    const subscriptionKey = `${channelId ? 'channel' : 'conversation'}-${currentId}`;

    // Initialize Supabase client if needed
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = createClient();
    }

    // Use our stable client instance
    const supabase = supabaseClientRef.current;

    // Enhanced debugging for Supabase client
    console.log('🔌 Supabase client setup check:', {
      hasSupabase: !!supabase,
      realtime: !!supabase?.realtime,
    });

    // Reset connection stats if we're switching channels
    if (connectionStatusRef.current.key !== subscriptionKey) {
      connectionStatusRef.current = {
        isConnecting: false,
        lastAttemptTime: 0,
        attemptCount: 0,
        key: subscriptionKey,
      };
    }

    // Prevent rapid reconnection attempts - only connect if enough time has passed
    const now = Date.now();
    if (
      connectionStatusRef.current.isConnecting ||
      (now - connectionStatusRef.current.lastAttemptTime < 2000 &&
        connectionStatusRef.current.attemptCount > 2)
    ) {
      console.log(
        `Skipping connection attempt for ${subscriptionKey} - already connecting or too many recent attempts`
      );
      return;
    }

    // Update connection state
    connectionStatusRef.current.isConnecting = true;
    connectionStatusRef.current.lastAttemptTime = now;
    connectionStatusRef.current.attemptCount++;

    console.log(
      `Setting up real-time subscription for ${subscriptionKey} (attempt #${connectionStatusRef.current.attemptCount})`
    );

    // Track this effect's execution with a variable
    let isEffectActive = true;

    // Make a unique channel name with timestamp to ensure we get a fresh connection
    // Adding a random component to avoid name collisions
    const randomId = Math.random().toString(36).substring(2, 8);
    const channelName = `${subscriptionKey}-messages-${Date.now()}-${randomId}`;

    // Clean up any previous subscription to avoid duplicates
    if (channelRef.current) {
      console.log(`Cleaning up previous subscription`);
      try {
        // Store the old channel in a local variable
        const oldChannel = channelRef.current;
        // Clear the reference first to prevent race conditions
        channelRef.current = null;

        // Now remove the channel safely - wrapped in timeout to avoid race conditions
        setTimeout(() => {
          if (supabase && supabase.removeChannel) {
            supabase.removeChannel(oldChannel).catch((err: Error) => {
              console.error('Error in removeChannel promise:', err);
            });
          }
        }, 500);
      } catch (err) {
        console.error('Error removing channel:', err);
        // Ensure reference is cleared even if removal fails
        channelRef.current = null;
      }
    }

    try {
      // Use component props directly - don't create new variables
      const currentChannelId = channelId;
      const currentConversationId = conversationId;

      // Create channel (Supabase JS v2 - properly configured)
      channelRef.current = supabase.channel(channelName);

      // Verify our channel is properly configured
      console.log('📡 Created channel:', {
        name: channelName,
        hasChannel: !!channelRef.current,
      });

      // Define a function to process new message events with enhanced debugging
      const handleNewMessage = (payload: any) => {
        if (!isEffectActive) return; // Skip if no longer active

        // Detailed debugging to see what's happening with realtime events
        console.log('---------------- NEW MESSAGE EVENT ----------------');
        console.log('Message event received:', payload);
        console.log('Current channel ID:', currentChannelId);
        console.log('Payload channel ID:', payload.new?.channel_id);
        console.log(
          'Is relevant:',
          currentChannelId === payload.new?.channel_id ||
            currentConversationId === payload.new?.conversation_id
        );
        console.log('-------------------------------------------------');

        // Aggressively handle new messages in real-time
        console.log('🔄 PROCESSING REAL-TIME MESSAGE UPDATE');
        console.log('Message payload:', JSON.stringify(payload.new));

        // Get the scroll position before we update
        const scrollResult = checkScrollPosition(
          scrollRef.current,
          isUserScrolled,
          newMessageCount
        );

        // Format the new message to match our expected structure
        if (payload.new) {
          // Force message refresh instead of trying to update manually
          // This ensures we get full data with all relationships
          refreshMessages().catch(err => {
            console.error('Error refreshing after new message:', err);

            // Fallback: Try manual addition
            console.log('Attempting manual message addition as fallback');
            supabase
              .from('users')
              .select('id, username, display_name, avatar_url, status')
              .eq('id', payload.new.sender_id)
              .single()
              .then(({ data: senderData }: { data: any }) => {
                if (senderData) {
                  const newMsg = {
                    ...payload.new,
                    sender: senderData,
                    reactions: [],
                    file_attachments: [],
                    reply_count: 0,
                  };

                  console.log('Adding new message manually:', newMsg);

                  // Update our messages state
                  setMessages(currentMessages => {
                    // Check if this message already exists
                    if (!currentMessages.some(m => m.id === newMsg.id)) {
                      return [...currentMessages, newMsg];
                    }
                    return currentMessages;
                  });
                }
              });
          });
        }

        // If user is scrolled up, increment the new message count
        if (scrollResult.isScrolled) {
          setNewMessageCount(prev => prev + 1);
          setIsUserScrolled(true);
          setShowScrollButton(true);
        }
      };

      // Create proper filters for all event types (insert, update, delete)
      const channelFilter = currentChannelId
        ? `channel_id=eq.${currentChannelId}`
        : `conversation_id=eq.${currentConversationId}`;

      // Handle message updates (like reactions)
      const handleUpdate = (payload: any) => {
        console.log('Message updated:', payload);
        // Real-time updates will handle this - no need for manual refresh
      };

      // Handle message deletions
      const handleDelete = (payload: any) => {
        console.log('Message deleted:', payload);
        // Real-time updates will handle this - no need for manual refresh
      };

      // Create more basic filter
      const simpleFilter = currentChannelId
        ? `channel_id=eq.${currentChannelId}`
        : `conversation_id=eq.${currentConversationId}`;

      console.log(
        `Setting up filters for ${currentChannelId ? 'channel' : 'conversation'} with filter: ${simpleFilter}`
      );

      // Define handlers for helper functions
      const handleAnyMessage = (payload: any) => {
        console.log('ANY message insert detected:', payload);
      };

      const handleReactionInsert = (payload: any) => {
        console.log('🔍 Reaction INSERT event received:', payload);
        // Use the payload to update message reactions in real-time
        if (payload.new && payload.new.message_id) {
          // Find the message that this reaction belongs to
          const messageId = payload.new.message_id;
          const userId = payload.new.user_id;

          // If this is our own reaction and we already have an optimistic update, skip
          if (userId === currentUser.id) {
            // Look for a matching temp reaction
            setMessages(currentMessages => {
              const msgToUpdate = currentMessages.find(m => m.id === messageId);
              if (msgToUpdate) {
                // Check if there's a temporary reaction we should replace
                const tempReaction = msgToUpdate.reactions.find(
                  r =>
                    r.id.startsWith('temp-') &&
                    r.user_id === userId &&
                    r.emoji === payload.new.emoji
                );

                if (tempReaction) {
                  // Replace temporary reaction with real one
                  return currentMessages.map(msg => {
                    if (msg.id === messageId) {
                      return {
                        ...msg,
                        reactions: msg.reactions.map(r =>
                          r.id === tempReaction.id
                            ? {
                                ...payload.new,
                                username: currentUser.display_name || currentUser.username,
                              }
                            : r
                        ),
                      };
                    }
                    return msg;
                  });
                }
              }
              return currentMessages;
            });
          } else {
            // If it's someone else's reaction, we need to get their username
            // For optimal UX, we add it immediately with default username and update in the background
            setMessages(currentMessages => {
              return currentMessages.map(msg => {
                if (msg.id === messageId) {
                  // Add this reaction to the message if it doesn't already exist
                  const existingReactionIndex = msg.reactions.findIndex(
                    r => r.id === payload.new.id
                  );

                  if (existingReactionIndex === -1) {
                    // Add with temp username
                    const newReaction = {
                      ...payload.new,
                      username: `User ${userId.substring(0, 4)}`, // Temporary display name
                    };

                    return {
                      ...msg,
                      reactions: [...msg.reactions, newReaction],
                    };
                  }
                }
                return msg;
              });
            });

            // Then fetch the real username in background
            if (!supabaseClientRef.current) {
              supabaseClientRef.current = createClient();
            }

            // Get the real username for this user
            supabaseClientRef.current
              .from('users')
              .select('username, display_name')
              .eq('id', userId)
              .single()
              .then(({ data: userData, error }: { data: any; error: any }) => {
                if (!error && userData) {
                  // Update the reaction with the correct username
                  setMessages(currentMessages => {
                    return currentMessages.map(msg => {
                      if (msg.id === messageId) {
                        return {
                          ...msg,
                          reactions: msg.reactions.map(r =>
                            r.id === payload.new.id
                              ? {
                                  ...r,
                                  username: userData.display_name || userData.username,
                                }
                              : r
                          ),
                        };
                      }
                      return msg;
                    });
                  });
                }
              })
              .catch((err: Error) => {
                console.error('Error fetching username for reaction:', err);
              });
          }
        }
      };

      // Completely revamped reaction delete handler with more reliable logic
      const handleReactionDelete = (payload: any) => {
        console.log('🔍 Reaction DELETE event received:', payload);

        // Extract available data from payload - support minimal payloads
        const reactionId = payload.old?.id;

        // Skip processing if we don't even have a reaction ID
        if (!reactionId) {
          console.error('DELETE payload missing reaction ID:', payload);
          return;
        }

        // Extract other data if available (might be missing in some DELETE payloads)
        const messageId = payload.old?.message_id;
        const emoji = payload.old?.emoji;
        const userId = payload.old?.user_id;

        console.log(`Removing reaction (ID: ${reactionId}) from messages`);

        // Force refresh if this was a reaction deletion delay - redundancy for reliability
        if (Date.now() - lastRefreshTimeRef.current > 1000) {
          console.log('Forcing full message refresh due to delayed reaction deletion');
          refreshMessages().catch(err => {
            console.error('Error in forced refresh:', err);
          });
        }

        // Always update both main message list and thread messages
        // For main message list
        setMessages(currentMessages => {
          // Iterate through all messages if we don't know which message the reaction belongs to
          return currentMessages.map(msg => {
            // If we know the message ID, only process that message
            if (messageId && msg.id !== messageId) {
              return msg;
            }

            // Use both reaction ID and a combination of user+emoji as fallback
            return {
              ...msg,
              reactions: msg.reactions.filter(r => {
                // Primary filter - by reaction ID (most reliable)
                const idMatch = r.id === reactionId;

                // Secondary filter - by user+emoji combination (if we have that data)
                const userEmojiMatch = userId && emoji && r.user_id === userId && r.emoji === emoji;

                // Remove if either condition matches
                return !(idMatch || userEmojiMatch);
              }),
            };
          });
        });

        // Also update any thread messages
        if (activeThread && threadMessages.length > 0) {
          setThreadMessages(currentThreadMessages => {
            return currentThreadMessages.map(msg => {
              // If we know the message ID, only process that message
              if (messageId && msg.id !== messageId) {
                return msg;
              }

              return {
                ...msg,
                reactions: msg.reactions.filter(r => {
                  // Same logic as above - dual filtering method
                  const idMatch = r.id === reactionId;
                  const userEmojiMatch =
                    userId && emoji && r.user_id === userId && r.emoji === emoji;
                  return !(idMatch || userEmojiMatch);
                }),
              };
            });
          });
        }
      };

      const handleConnected = () => {
        if (!channelRef.current?.isConnected) {
          console.log('Realtime subscription initially connected');
        }
        // Set this flag once connected
        if (channelRef.current) {
          channelRef.current.isConnected = true;
        }
      };

      const handleStatus = (status: string) => {
        if (!isEffectActive) return;
        connectionStatusRef.current.isConnecting = false;

        console.log(`Subscription status: ${status}`);

        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${channelName}`);
          // Reset attempt counter on success
          connectionStatusRef.current.attemptCount = 0;

          // Successfully connected - no need to manually refresh
          console.log('Real-time connection established - waiting for updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error connecting to channel ${channelName}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`Connection timed out for ${channelName}`);
        }
      };

      // Get the channel reference for clarity
      const channel = channelRef.current;

      if (channel) {
        // IMPORTANT: Enhanced real-time subscription setup
        console.log('Setting up real-time subscriptions with filters:');
        console.log(`Channel ID: ${currentChannelId || 'none'}`);
        console.log(`Conversation ID: ${currentConversationId || 'none'}`);

        if (currentChannelId) {
          // Clear any existing listeners
          channel.unsubscribe();

          // Channel-specific subscription with simplified filter
          channel.on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `channel_id=eq.${currentChannelId}`,
            },
            (payload: any) => {
              console.log('🔔 CHANNEL MESSAGE RECEIVED:', payload);
              if (payload.eventType === 'INSERT') {
                handleNewMessage(payload);
              } else if (payload.eventType === 'UPDATE') {
                handleNewMessage(payload); // Use handleNewMessage for updates too
              }
            }
          );
        }

        if (currentConversationId) {
          // Conversation-specific subscription with explicit filter
          channel.on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${currentConversationId}`,
            },
            (payload: any) => {
              console.log('🔔 DM MESSAGE RECEIVED:', payload);
              if (payload.eventType === 'INSERT') {
                handleNewMessage(payload);
              } else if (payload.eventType === 'UPDATE') {
                handleNewMessage(payload); // Use handleNewMessage for updates too
              }
            }
          );
        }

        // Remove the wildcard subscription - it can cause permission issues

        // Listen for reaction changes with proper message_id filtering
        if (currentChannelId || currentConversationId) {
          const filter = currentChannelId
            ? `channel_id=eq.${currentChannelId}`
            : `conversation_id=eq.${currentConversationId}`;

          // Create subscriptions for message reactions
          // For reaction insertions, we also need to filter by message_id
          channel.on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'reactions',
            },
            (payload: any) => {
              console.log('🔍 Reaction INSERT event raw:', payload);

              // Ensure we have a valid payload with message_id
              if (!payload.new || !payload.new.message_id) {
                console.log('Invalid INSERT payload, missing message_id:', payload);
                return;
              }

              // Get all message IDs currently in view
              const currentMessageIds = messages.map(m => m.id);

              // Only process reactions for messages in the current conversation/channel
              if (currentMessageIds.includes(payload.new.message_id)) {
                console.log('Processing reaction INSERT for message in current view');
                handleReactionInsert(payload);
              } else {
                console.log(
                  'Ignoring reaction INSERT for message not in current view:',
                  payload.new.message_id
                );
              }
            }
          );

          // For reaction deletions, directly process all reactions changes
          // This ensures maximum reliability for reaction deletions
          channel.on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'reactions',
            },
            (payload: any) => {
              console.log('🔍 Reaction DELETE event received, processing immediately:', payload);

              // Always process the reaction delete events regardless of current filters
              // This ensures we never miss a reaction deletion
              handleReactionDelete(payload);

              // Force message refresh as a fallback for reliability
              setTimeout(() => {
                console.log('Performing backup refresh after reaction delete');
                refreshMessages().catch(err => {
                  console.error('Error in backup refresh:', err);
                });
              }, 500);
            }
          );
        }

        // Handle message updates - use proper filter based on channel or conversation
        channel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: currentChannelId
              ? `channel_id=eq.${currentChannelId}`
              : `conversation_id=eq.${currentConversationId}`,
          },
          handleUpdate
        );

        // Handle message deletions - use proper filter based on channel or conversation
        channel.on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: currentChannelId
              ? `channel_id=eq.${currentChannelId}`
              : `conversation_id=eq.${currentConversationId}`,
          },
          handleDelete
        );

        // Listen for new replies to update reply counts
        channel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload: any) => {
            // Check if this is a reply to an existing message
            if (payload.new && payload.new.parent_message_id) {
              // Update the reply count for the parent message
              setMessages(currentMessages => {
                // Find the parent message
                const parentMsgIndex = currentMessages.findIndex(
                  msg => msg.id === payload.new.parent_message_id
                );

                if (parentMsgIndex === -1) {
                  // Parent message not in the current view
                  return currentMessages;
                }

                // Clone the messages array
                const updatedMessages = [...currentMessages];

                // Increment the reply count
                updatedMessages[parentMsgIndex] = {
                  ...updatedMessages[parentMsgIndex],
                  reply_count: (updatedMessages[parentMsgIndex].reply_count || 0) + 1,
                };

                return updatedMessages;
              });

              console.log('Detected new reply message in thread:', payload.new.content);
              console.log('Active thread ID:', activeThread?.id);
              console.log('Parent message ID:', payload.new.parent_message_id);

              // Check if we have a thread open, and if it matches this parent message
              if (activeThread && activeThread.id === payload.new.parent_message_id) {
                console.log('Thread is open and matches parent, refreshing thread messages');

                // Set up an interval to retry a few times in case of database latency
                let retryCount = 0;
                const maxRetries = 3;
                const retryInterval = setInterval(() => {
                  retryCount++;
                  console.log(`Refreshing thread messages (attempt ${retryCount}/${maxRetries})`);

                  // Reload the thread messages to include the new reply
                  loadThreadMessages(activeThread.id)
                    .then(replies => {
                      console.log('Refreshed thread messages:', replies.length);
                      setThreadMessages(replies);
                      clearInterval(retryInterval); // Success, clear the interval
                    })
                    .catch(err => {
                      console.error(
                        `Error refreshing thread messages (attempt ${retryCount}):`,
                        err
                      );

                      // If we've reached max retries, stop trying
                      if (retryCount >= maxRetries) {
                        clearInterval(retryInterval);
                      }
                    });
                }, 500); // Try every 500ms

                // Set a timeout to clear the interval if it's still running after a few seconds
                setTimeout(() => {
                  clearInterval(retryInterval);
                }, 5000);
              }
            }
          }
        );

        // Subscribe to user status changes with improved handling
        channel.on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users' },
          (payload: any) => {
            console.log('User status changed:', payload);

            if (payload.new && payload.new.id) {
              // Force a refresh to ensure we have the latest data for all users
              setTimeout(
                () =>
                  refreshMessages().catch(err => {
                    console.error('Error refreshing after user status change:', err);

                    // Fallback: Update messages manually
                    // Update messages with this user to show the new status
                    setMessages(currentMessages => {
                      // Check if any messages were sent by this user
                      const hasUserMessages = currentMessages.some(
                        msg => msg.sender.id === payload.new.id
                      );

                      if (!hasUserMessages) {
                        // No messages from this user, no need to update
                        return currentMessages;
                      }

                      // Update all messages from this user with the new status
                      return currentMessages.map(msg => {
                        if (msg.sender.id === payload.new.id) {
                          return {
                            ...msg,
                            sender: {
                              ...msg.sender,
                              status: payload.new.status,
                            },
                          };
                        }
                        return msg;
                      });
                    });

                    // Also update thread messages if any
                    setThreadMessages(current => {
                      return current.map(msg => {
                        if (msg.sender.id === payload.new.id) {
                          return {
                            ...msg,
                            sender: {
                              ...msg.sender,
                              status: payload.new.status,
                            },
                          };
                        }
                        return msg;
                      });
                    });
                  }),
                100
              );
            }
          }
        );

        // Track first connection
        channel.on('system', { event: 'connected' }, handleConnected);

        // Now do the actual subscription with proper error handling, retry logic, and debugging
        try {
          let retryCount = 0;
          const maxRetries = 3;

          const subscribeWithRetry = (channel: any) => {
            try {
              if (!channel || !isEffectActive) {
                console.error('Cannot subscribe - invalid channel or effect inactive');
                connectionStatusRef.current.isConnecting = false;
                return;
              }

              console.log('Subscribing to channel:', channel.topic);

              // Create the actual subscription with simplified error handling
              try {
                const subscription = channel.subscribe((status: any) => {
                  if (!isEffectActive) return;

                  console.log(`Subscription status update: ${status}`);
                  connectionStatusRef.current.isConnecting = false;

                  if (status === 'SUBSCRIBED') {
                    console.log(`Successfully subscribed to ${channelName}`);

                    // Force a refresh after subscribing to verify everything is working
                    setTimeout(() => {
                      if (isEffectActive) {
                        console.log('🔄 Performing verification refresh of messages');
                        refreshMessages().catch(err => {
                          console.error('Error in verification refresh:', err);
                        });
                      }
                    }, 1000);
                  } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
                    // Don't treat timeouts as errors for channels - this is expected behavior
                    const isChannel = channelId ? true : false;
                    const logMethod = isChannel ? console.log : console.error;

                    logMethod(
                      `${isChannel ? 'Channel' : 'Conversation'} ${status} - switching to manual refresh mode`
                    );

                    // When subscription fails, just make sure we have the latest data
                    refreshMessages().catch(err => {
                      console.error('Error in manual refresh:', err);
                    });

                    // Create a one-time refresh to avoid multiple intervals
                    if (isEffectActive) {
                      setTimeout(() => refreshMessages(), 3000);
                    }

                    // For channels, keep trying with fewer subscriptions
                    if (isChannel && isEffectActive) {
                      console.log('Setting up simplified channel subscription after timeout');
                      // Try a more minimal subscription that's less likely to timeout
                      setTimeout(() => {
                        if (channelRef.current && isEffectActive) {
                          // Remove existing subscriptions to reduce load
                          try {
                            channelRef.current.unsubscribe();
                          } catch (e) {
                            // Ignore unsubscribe errors
                          }

                          // Only subscribe to message INSERTs which are most important
                          channelRef.current.on(
                            'postgres_changes',
                            {
                              event: 'INSERT',
                              schema: 'public',
                              table: 'messages',
                              filter: channelId
                                ? `channel_id=eq.${channelId}`
                                : `conversation_id=eq.${conversationId}`,
                            },
                            (payload: any) => {
                              console.log('📣 Simplified subscription received message:', payload);
                              handleNewMessage(payload);
                            }
                          );

                          // Only resubscribe if not already subscribed
                          try {
                            if (!channelRef.current.isJoined()) {
                              channelRef.current.subscribe();
                            } else {
                              console.log('Channel already subscribed, skipping resubscription');
                            }
                          } catch (e) {
                            console.error('Error checking subscription status:', e);
                          }
                        }
                      }, 5000);
                    }
                  }
                });

                console.log('💬 Channel subscription created:', subscription);
              } catch (subError) {
                console.error('Error in channel.subscribe():', subError);
                connectionStatusRef.current.isConnecting = false;

                // Simply refresh messages when subscription fails completely
                refreshMessages().catch(err => {
                  console.error('Error in fallback refresh:', err);
                });
              }
            } catch (err) {
              console.error('Error in subscribeWithRetry:', err);
              connectionStatusRef.current.isConnecting = false;
            }
          };

          // Note: The setupChannelHandlers function is not properly implemented
          // and is not used in the updated retry logic
          const setupChannelHandlers = (ch: any) => {
            // This function is not used in the current version
            console.log('setupChannelHandlers called but not utilized');
          };

          // Start the subscription process with the current channel
          subscribeWithRetry(channelRef.current);
        } catch (err) {
          console.error('Error in subscription:', err);
          connectionStatusRef.current.isConnecting = false;
        }
      }
    } catch (err) {
      console.error('Error setting up real-time subscription:', err);
      connectionStatusRef.current.isConnecting = false;
    }

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isEffectActive) {
        console.log('Tab visible again - real-time connection will automatically sync');
        // No manual refresh - real-time will handle this
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount or channel change
    return () => {
      isEffectActive = false; // Mark effect as inactive
      connectionStatusRef.current.isConnecting = false;

      if (channelRef.current) {
        console.log(`Cleaning up subscription for ${subscriptionKey}`);
        try {
          supabase.removeChannel(channelRef.current);
        } catch (err) {
          console.error('Error removing channel during cleanup:', err);
        }
        channelRef.current = null;
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [channelId, conversationId]); // IMPORTANT: Remove refreshMessages from dependencies

  // Load thread messages for a specific parent message
  const loadThreadMessages = async (parentMessageId: string) => {
    try {
      if (!supabaseClientRef.current) {
        supabaseClientRef.current = createClient();
      }

      const supabase = supabaseClientRef.current;

      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          id,
          content,
          created_at,
          is_ai_generated,
          parent_message_id,
          sender:users (
            id,
            username,
            display_name,
            avatar_url,
            status
          ),
          reactions (
            id,
            emoji,
            user_id
          ),
          file_attachments (
            id,
            file_name,
            file_type,
            file_path,
            file_size
          )
        `
        )
        .eq('parent_message_id', parentMessageId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching thread messages:', error);
        return [];
      }

      return data.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        is_ai_generated: msg.is_ai_generated,
        parent_message_id: msg.parent_message_id,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
        reactions: msg.reactions || [],
        file_attachments: msg.file_attachments || [],
      }));
    } catch (error) {
      console.error('Error loading thread messages:', error);
      return [];
    }
  };

  // Create a ref to store the thread-specific channel subscription
  const threadChannelRef = useRef<any>(null);

  // Reference for thread refresh interval
  const threadRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle opening thread view
  const handleOpenThread = async (message: Message) => {
    setActiveThread(message);
    setThreadOpen(true);
    const replies = await loadThreadMessages(message.id);
    setThreadMessages(replies);

    // Set up a polling interval as fallback for thread messages
    if (threadRefreshIntervalRef.current) {
      clearInterval(threadRefreshIntervalRef.current);
    }

    // Poll every 2.5 seconds as a backup
    threadRefreshIntervalRef.current = setInterval(() => {
      if (message.id) {
        loadThreadMessages(message.id)
          .then(replies => {
            // Only update if we have different messages (to avoid unnecessary renders)
            if (replies.length !== threadMessages.length) {
              console.log('Thread polling found new messages:', replies.length);
              setThreadMessages(replies);
            }
          })
          .catch(err => {
            console.error('Error in thread polling:', err);
          });
      }
    }, 2500);

    // Set up a dedicated real-time subscription for this thread
    try {
      // Clean up any existing thread subscription
      if (threadChannelRef.current) {
        if (supabaseClientRef.current) {
          try {
            supabaseClientRef.current.removeChannel(threadChannelRef.current);
          } catch (err) {
            console.error('Error removing previous thread channel:', err);
          }
        }
        threadChannelRef.current = null;
      }

      // Create a new subscription for this thread
      if (!supabaseClientRef.current) {
        supabaseClientRef.current = createClient();
      }

      const supabase = supabaseClientRef.current;
      const threadId = message.id;
      const channelName = `thread-${threadId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      console.log('Setting up dedicated thread subscription for thread:', threadId);

      threadChannelRef.current = supabase.channel(channelName);

      // Subscribe to message inserts with the thread's parent_message_id
      threadChannelRef.current.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `parent_message_id=eq.${threadId}`,
        },
        (payload: any) => {
          console.log('🧵 THREAD: New reply detected:', payload);

          // Force thread message refresh
          loadThreadMessages(threadId).then(replies => {
            console.log(
              'Thread refreshed from direct subscription, got',
              replies.length,
              'messages'
            );
            setThreadMessages(replies);
          });
        }
      );

      // Also listen for updates to existing messages
      threadChannelRef.current.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `parent_message_id=eq.${threadId}`,
        },
        (payload: any) => {
          console.log('🧵 THREAD: Message updated:', payload);

          // Force thread message refresh
          loadThreadMessages(threadId).then(replies => {
            setThreadMessages(replies);
          });
        }
      );

      // Subscribe and handle status
      threadChannelRef.current.subscribe((status: string) => {
        console.log(`Thread subscription status: ${status}`);
      });

      console.log('Thread subscription created');
    } catch (err) {
      console.error('Error setting up thread subscription:', err);
    }
  };

  // Handle closing thread view
  const handleCloseThread = () => {
    // Clean up the thread subscription if it exists
    if (threadChannelRef.current) {
      console.log('Cleaning up thread subscription');

      try {
        if (supabaseClientRef.current) {
          supabaseClientRef.current.removeChannel(threadChannelRef.current);
        }
      } catch (err) {
        console.error('Error removing thread channel:', err);
      }

      threadChannelRef.current = null;
    }

    // Clear the polling interval
    if (threadRefreshIntervalRef.current) {
      console.log('Clearing thread polling interval');
      clearInterval(threadRefreshIntervalRef.current);
      threadRefreshIntervalRef.current = null;
    }

    setThreadOpen(false);
    setActiveThread(null);
    setThreadMessages([]);
  };

  // Handle adding/removing reactions with optimistic UI updates using server action
  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      console.log('Reaction click:', emoji, 'for message:', messageId);

      // Create a temporary id for optimistic UI updates
      const tempId = `temp-${Date.now()}`;

      // Check if user already reacted with this emoji
      // We'll do this client-side to avoid extra server round-trips
      const existingReaction = messages
        .find(msg => msg.id === messageId)
        ?.reactions.find(r => r.user_id === currentUser.id && r.emoji === emoji);

      if (existingReaction) {
        // Removing a reaction - optimistic update
        console.log('Removing reaction', existingReaction.id);

        // Optimistically update the UI
        setMessages(currentMessages => {
          return currentMessages.map(msg => {
            if (msg.id === messageId) {
              // Remove the reaction from this message
              return {
                ...msg,
                reactions: msg.reactions.filter(r => r.id !== existingReaction.id),
              };
            }
            return msg;
          });
        });

        // If we have thread messages, we also need to update them
        if (activeThread && threadMessages.length > 0) {
          const threadMsgIndex = threadMessages.findIndex(msg => msg.id === messageId);
          if (threadMsgIndex >= 0) {
            setThreadMessages(currentThreadMessages => {
              return currentThreadMessages.map(msg => {
                if (msg.id === messageId) {
                  return {
                    ...msg,
                    reactions: msg.reactions.filter(r => r.id !== existingReaction.id),
                  };
                }
                return msg;
              });
            });
          }
        }
      } else {
        // Adding a reaction - optimistic update
        console.log('Adding reaction', { messageId, userId: currentUser.id, emoji });

        // Create the new reaction object
        const newReaction = {
          id: tempId,
          message_id: messageId,
          user_id: currentUser.id,
          emoji,
          created_at: new Date().toISOString(),
          username: currentUser.display_name || currentUser.username,
        };

        // Optimistically update the UI
        setMessages(currentMessages => {
          return currentMessages.map(msg => {
            if (msg.id === messageId) {
              // Add this reaction to the message
              return {
                ...msg,
                reactions: [...msg.reactions, newReaction],
              };
            }
            return msg;
          });
        });

        // If we have thread messages, we also need to update them
        if (activeThread && threadMessages.length > 0) {
          const threadMsgIndex = threadMessages.findIndex(msg => msg.id === messageId);
          if (threadMsgIndex >= 0) {
            setThreadMessages(currentThreadMessages => {
              return currentThreadMessages.map(msg => {
                if (msg.id === messageId) {
                  return {
                    ...msg,
                    reactions: [...msg.reactions, newReaction],
                  };
                }
                return msg;
              });
            });
          }
        }
      }

      // Call the server action
      const result = await toggleReactionAction(messageId, emoji);
      console.log('Reaction toggled result:', result);

      // Handle errors if needed
      if (!result.success) {
        console.error('Error toggling reaction:', result.error);
        toast.error('Failed to update reaction');

        // Refresh messages to get the correct state
        await refreshMessages();
      } else {
        console.log(`Reaction ${result.action} successfully: ${result.reactionId}`);

        // For deletions, ensure the UI is updated
        if (result.action === 'removed') {
          // Add a fallback update for the UI after a short delay
          // This ensures the reaction is removed even if the realtime event fails
          setTimeout(() => {
            console.log('Executing fallback UI update for removed reaction');
            // Apply the deletion again just to be sure it shows up in the UI
            setMessages(currentMessages => {
              return currentMessages.map(msg => {
                if (msg.id === result.messageId) {
                  return {
                    ...msg,
                    reactions: msg.reactions.filter(
                      r => !(r.user_id === currentUser.id && r.emoji === result.emoji)
                    ),
                  };
                }
                return msg;
              });
            });

            // Update thread messages if needed
            if (activeThread && threadMessages.length > 0) {
              setThreadMessages(currentThreadMessages => {
                return currentThreadMessages.map(msg => {
                  if (msg.id === result.messageId) {
                    return {
                      ...msg,
                      reactions: msg.reactions.filter(
                        r => !(r.user_id === currentUser.id && r.emoji === result.emoji)
                      ),
                    };
                  }
                  return msg;
                });
              });
            }
          }, 400); // Wait to allow real-time to work first if it's going to
        }
      }
    } catch (error) {
      console.error('Error in reaction handler:', error);
      toast.error('Failed to update reaction');

      // Refresh messages to recover
      await refreshMessages();
    }
  };

  // Initial scroll to bottom when messages load OR when ID changes - with stable reference
  const initialScrollRef = useRef({
    channelId,
    conversationId,
    messageCount: 0,
  });

  useEffect(() => {
    // Only scroll when:
    // 1. We have messages AND
    // 2. Either the channel/conversation ID changed OR message count increased from 0
    const shouldScroll =
      messages.length > 0 &&
      (channelId !== initialScrollRef.current.channelId ||
        conversationId !== initialScrollRef.current.conversationId ||
        (initialScrollRef.current.messageCount === 0 && messages.length > 0));

    if (shouldScroll && scrollRef.current) {
      console.log('Auto-scrolling to bottom due to channel change or initial load');

      // Use immediate scroll without animation for initial load
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;

      // Reset UI state
      setIsUserScrolled(false);
      setShowScrollButton(false);
      setNewMessageCount(0);

      // Update our reference values
      initialScrollRef.current = {
        channelId,
        conversationId,
        messageCount: messages.length,
      };
    } else if (messages.length > initialScrollRef.current.messageCount) {
      // Just update the message count in our reference
      initialScrollRef.current.messageCount = messages.length;
    }
  }, [messages.length, channelId, conversationId]);

  // Optimized scroll detection system with memoized handler
  useEffect(() => {
    const scrollDiv = scrollRef.current;
    if (!scrollDiv) return;

    // Create a stable reference for the last state to avoid unnecessary updates
    // IMPORTANT: useRef must be called at the component level, not inside useEffect
    const lastState = {
      isScrolled: false,
      distanceFromBottom: 0,
      lastUpdateTime: 0,
    };

    console.log('Setting up optimized scroll detection system');

    // Throttled function to check scroll position and update state
    const checkScrollPosition = () => {
      if (!scrollDiv) return;

      const now = Date.now();
      // Throttle checks to max once every 100ms unless forced
      if (now - lastState.lastUpdateTime < 100) return;

      const { scrollHeight, scrollTop, clientHeight } = scrollDiv;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const shouldShowButton = distanceFromBottom > 150;

      // Only update if there's a meaningful change in position or state
      const stateChanged =
        shouldShowButton !== lastState.isScrolled ||
        Math.abs(distanceFromBottom - lastState.distanceFromBottom) > 50;

      if (stateChanged) {
        // Update our reference of the last state
        lastState.isScrolled = shouldShowButton;
        lastState.distanceFromBottom = distanceFromBottom;
        lastState.lastUpdateTime = now;

        // Apply UI updates only when needed
        setShowScrollButton(shouldShowButton);
        setIsUserScrolled(shouldShowButton);

        // Only log significant changes to reduce console noise
        console.log(
          `[Scroll] Distance: ${Math.round(distanceFromBottom)}px, ` +
            `Button: ${shouldShowButton ? 'visible' : 'hidden'}`
        );
      }

      // Reset new message count if scrolled to bottom
      if (distanceFromBottom < 50 && newMessageCount > 0) {
        setNewMessageCount(0);
      }
    };

    // Create a more stable scroll handler
    const handleScroll = () => {
      // Use requestAnimationFrame for performance
      window.requestAnimationFrame(checkScrollPosition);
    };

    // Direct DOM event listener with passive option for performance
    scrollDiv.addEventListener('scroll', handleScroll, { passive: true });

    // Lightweight interval as backup (less frequent than before)
    const intervalId = setInterval(checkScrollPosition, 1000);

    // Initial check when component mounts (with a short delay)
    setTimeout(checkScrollPosition, 100);

    return () => {
      scrollDiv.removeEventListener('scroll', handleScroll);
      clearInterval(intervalId);
      console.log('Cleaned up scroll detection system');
    };
  }, [newMessageCount]); // Only depend on newMessageCount to avoid recreating handlers

  // Smarter handling of message changes and auto-scrolling
  useEffect(() => {
    // Only run if we have messages and a scroll container
    if (messages.length === 0 || !scrollRef.current) return;

    // Get message IDs for comparison
    const messageIds = new Set(messages.map(m => m.id));

    // Determine if this is an initial load or contains new messages
    const isFirstLoad = prevMessagesCountRef.current === 0;
    const hasNewMessages = messages.length > prevMessagesCountRef.current;

    // Get the current scroll position
    const scrollElement = scrollRef.current;
    const { scrollHeight, scrollTop, clientHeight } = scrollElement;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Check if user is at bottom or near bottom (within 100px)
    const isNearBottom = distanceFromBottom < 100;

    console.log(
      `[Message Change] Count: ${messages.length}, Was: ${prevMessagesCountRef.current}, Near bottom: ${isNearBottom}`
    );

    if (isFirstLoad) {
      // On first load, always scroll to bottom immediately
      scrollElement.scrollTop = scrollHeight;
    } else if (hasNewMessages && isNearBottom) {
      // If user is near bottom and new messages arrive, smooth scroll to bottom
      scrollToBottom();
    } else if (hasNewMessages && !isNearBottom) {
      // If user is scrolled up and new messages arrive, update count (don't scroll)
      const newMessages = messages.length - prevMessagesCountRef.current;
      setNewMessageCount(prev => prev + newMessages);
      setShowScrollButton(true);
      setIsUserScrolled(true);
    }

    // Update the reference count for next comparison
    prevMessagesCountRef.current = messages.length;
  }, [messages]); // Depend on the full messages array for deep comparison

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h3 className="text-xl font-medium mb-2">No messages yet</h3>
        <p className="text-muted-foreground">Be the first to send a message!</p>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden flex">
      {/* Main message list */}
      <div className={`${threadOpen ? 'w-7/12' : 'w-full'} relative h-full`}>
        <div ref={scrollRef} className="space-y-1 h-full w-full overflow-y-auto pr-2">
          {messages.map(message => (
            <MessageItem
              key={message.id}
              message={message}
              currentUser={currentUser}
              onReactionAdd={handleAddReaction}
              onReplyClick={handleOpenThread}
            />
          ))}
        </div>

        {/* Scroll button with improved visibility control */}
        {messages.length > 5 && (
          <button
            className={`absolute bottom-4 right-2 transition-opacity duration-300 ${
              showScrollButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } ${
              newMessageCount > 0
                ? 'bg-primary text-primary-foreground pl-2 pr-3 animate-pulse'
                : 'bg-secondary text-secondary-foreground'
            } rounded-full p-2 shadow-md hover:bg-primary/90 flex items-center gap-1 z-10`}
            onClick={() => {
              console.log(`Button clicked, scrolling to bottom`);
              // Hide the button immediately for better UX
              setShowScrollButton(false);
              setIsUserScrolled(false);
              scrollToBottom();
            }}
            aria-label={
              newMessageCount > 0 ? `${newMessageCount} new messages` : 'Scroll to bottom'
            }
          >
            {newMessageCount > 0 && <span className="font-medium text-sm">{newMessageCount}</span>}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        )}
      </div>

      {/* Thread view */}
      {threadOpen && activeThread && (
        <div className="w-5/12 h-full border-l overflow-hidden flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="text-lg font-medium">Thread</h3>
            <button onClick={handleCloseThread} className="p-1 rounded-full hover:bg-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            {/* Parent message */}
            <div className="mb-4 pb-4 border-b">
              <MessageItem
                message={activeThread}
                currentUser={currentUser}
                onReactionAdd={handleAddReaction}
                onReplyClick={() => {}} // No-op since we're already in thread view
              />
            </div>

            {/* Replies */}
            {threadMessages.map(message => (
              <MessageItem
                key={message.id}
                message={message}
                currentUser={currentUser}
                onReactionAdd={handleAddReaction}
                onReplyClick={() => {}} // No-op for thread replies
              />
            ))}

            {threadMessages.length === 0 && (
              <div className="text-center text-muted-foreground p-4">No replies yet</div>
            )}
          </div>

          {/* Thread composer */}
          <div className="p-3 border-t">
            <MessageComposer
              placeholder="Reply in thread..."
              channelId={channelId}
              conversationId={conversationId}
              parentMessageId={activeThread.id}
              userId={currentUser.id}
              onSent={() => {
                // Refresh thread messages when a new reply is sent
                loadThreadMessages(activeThread.id).then(replies => {
                  setThreadMessages(replies);
                });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Utility functions
function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}

// New version of grouping function that works with array of pending reactions
function groupReactionsWithPendingList(
  messageId: string,
  reactions: Reaction[],
  pendingReactions: Array<{
    messageId: string;
    emoji: string;
    action: 'add' | 'remove';
    userId: string;
  }>,
  currentUserId: string
) {
  // Get only pending reactions for this message
  const messagePendingReactions = pendingReactions.filter(p => p.messageId === messageId);

  // Enhanced to include usernames for tooltips and handle pending states
  const groups: Record<
    string,
    {
      emoji: string;
      count: number;
      users: string[];
      usernames: string[];
      hasPendingAdd: boolean;
      hasPendingRemove: boolean;
    }
  > = {};

  // First, gather all reactions by emoji
  reactions.forEach(reaction => {
    if (!groups[reaction.emoji]) {
      groups[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        usernames: [],
        hasPendingAdd: false,
        hasPendingRemove: false,
      };
    }

    // Check if there's a pending remove for this reaction
    const isPendingRemove = messagePendingReactions.some(
      p => p.action === 'remove' && p.emoji === reaction.emoji && p.userId === reaction.user_id
    );

    if (!isPendingRemove) {
      groups[reaction.emoji].count += 1;
      groups[reaction.emoji].users.push(reaction.user_id);

      // Add username if available from the enhanced reaction
      const displayName = reaction.username || `User ${reaction.user_id.substring(0, 4)}`;
      groups[reaction.emoji].usernames.push(displayName);
    } else {
      // Mark this group as having a pending remove
      groups[reaction.emoji].hasPendingRemove = true;
    }
  });

  // Add any pending 'add' reactions
  messagePendingReactions.forEach(pending => {
    if (pending.action === 'add') {
      const emoji = pending.emoji;

      if (!groups[emoji]) {
        groups[emoji] = {
          emoji,
          count: 0,
          users: [],
          usernames: [],
          hasPendingAdd: false,
          hasPendingRemove: false,
        };
      }

      // Only add the user if not already included
      if (!groups[emoji].users.includes(pending.userId)) {
        groups[emoji].count += 1;
        groups[emoji].users.push(pending.userId);
        groups[emoji].usernames.push('You (pending)');
        groups[emoji].hasPendingAdd = true;
      }
    }
  });

  // Remove any groups with zero count after processing
  return Object.values(groups).filter(g => g.count > 0);
}

// Keep the original function for compatibility
function groupReactions(reactions: Reaction[]) {
  // Enhanced to include usernames for tooltips
  const groups: Record<
    string,
    {
      emoji: string;
      count: number;
      users: string[];
      usernames: string[];
    }
  > = {};

  // First, gather all reactions by emoji
  reactions.forEach(reaction => {
    if (!groups[reaction.emoji]) {
      groups[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        usernames: [],
      };
    }
    groups[reaction.emoji].count += 1;
    groups[reaction.emoji].users.push(reaction.user_id);

    // Add username if available from the enhanced reaction
    const displayName = reaction.username || `User ${reaction.user_id.substring(0, 4)}`;
    groups[reaction.emoji].usernames.push(displayName);
  });

  return Object.values(groups);
}
