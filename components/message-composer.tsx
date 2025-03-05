'use client';

import React, { useState, useRef } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Database } from '@/types/supabase';

interface MessageComposerProps {
  placeholder?: string;
  channelId?: string;
  conversationId?: string;
  parentMessageId?: string;
  userId: string;
  onSent?: () => void;
  members?: Array<{ id: string; username: string; display_name?: string }>;
}

export default function MessageComposer({
  placeholder = 'Type a message...',
  channelId,
  conversationId,
  parentMessageId,
  userId,
  onSent,
  members = [],
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // State for mention suggestions
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [userSuggestions, setUserSuggestions] = useState<
    Array<{ id: string; username: string; display_name?: string }>
  >([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Handle text changes
  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Track cursor position
    const curPos = e.target.selectionStart;
    setCursorPosition(curPos);

    // Check if we're in a mention context (after @ symbol)
    const textBeforeCursor = value.substring(0, curPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      // Extract the query (text after @)
      const query = mentionMatch[1] || '';
      setMentionQuery(query);

      // We're now positioning the mentions dropdown directly above the textarea
      // No need to calculate specific cursor position anymore
      // This ensures it's always visible above the compose box

      // First search in channel members if available
      if (members && members.length > 0) {
        const matchingMembers = members
          .filter(
            member =>
              member.username.toLowerCase().includes(query.toLowerCase()) ||
              (member.display_name &&
                member.display_name.toLowerCase().includes(query.toLowerCase()))
          )
          .slice(0, 5);

        if (matchingMembers.length > 0) {
          setActiveSuggestionIndex(0); // Reset the active selection
          setUserSuggestions(matchingMembers);
          setShowMentions(true);
          return;
        }
      }

      // Fall back to database search if no matches in members
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name')
        .ilike('username', `${query}%`)
        .order('username')
        .limit(5);

      if (error) {
        console.error('Error fetching user suggestions:', error);
        return;
      }

      setActiveSuggestionIndex(0); // Reset active selection when setting new suggestions
      setUserSuggestions(
        data
          ? data.map(user => ({
              id: user.id,
              username: user.username,
              display_name: user.display_name ?? undefined,
            }))
          : []
      );
      setShowMentions(true);
    } else {
      // Close mentions dropdown if we're not in a mention context
      setShowMentions(false);
    }
  };

  // Helper function to get cursor coordinates in a textarea
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    // Create a mirror div to calculate position
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(element);

    // Copy textarea styles to the mirror
    mirror.style.width = style.width;
    mirror.style.height = style.height;
    mirror.style.fontSize = style.fontSize;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.fontWeight = style.fontWeight;
    mirror.style.padding = style.padding;
    mirror.style.border = style.border;
    mirror.style.boxSizing = style.boxSizing;
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.position = 'absolute';
    mirror.style.top = '0';
    mirror.style.left = '-9999px';

    // Get text before cursor and add a span at the end
    const textBeforeCursor = element.value.substring(0, position);
    mirror.textContent = textBeforeCursor;

    // Add a marker span
    const marker = document.createElement('span');
    marker.textContent = '|';
    mirror.appendChild(marker);

    // Add text after cursor
    mirror.appendChild(document.createTextNode(element.value.substring(position)));

    // Append to body, measure, then remove
    document.body.appendChild(mirror);
    const markerRect = marker.getBoundingClientRect();
    document.body.removeChild(mirror);

    return {
      top: markerRect.top - mirror.getBoundingClientRect().top,
      left: markerRect.left - mirror.getBoundingClientRect().left,
    };
  };

  // Handle mention selection
  const selectMention = (username: string) => {
    // Replace the @query with @username
    const textBeforeMention = message.substring(0, cursorPosition).replace(/@\w*$/, '');
    const textAfterMention = message.substring(cursorPosition);
    const newText = `${textBeforeMention}@${username} ${textAfterMention}`;

    setMessage(newText);
    setShowMentions(false);

    // Focus back on textarea and set cursor position after the mention
    if (textareaRef.current) {
      const newPosition = textBeforeMention.length + username.length + 2; // +2 for @ and space
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  // State for active mention suggestion
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Enter key for sending message (if not showing mentions)
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Handle navigation in mentions dropdown
    if (showMentions && userSuggestions.length > 0) {
      if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'Enter' ||
        e.key === 'Tab' ||
        e.key === 'Escape'
      ) {
        e.preventDefault();

        if (e.key === 'Escape') {
          setShowMentions(false);
          return;
        }

        if (e.key === 'ArrowDown') {
          // Move to next suggestion, loop back to first
          setActiveSuggestionIndex(prev => (prev < userSuggestions.length - 1 ? prev + 1 : 0));
          return;
        }

        if (e.key === 'ArrowUp') {
          // Move to previous suggestion, loop back to last
          setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : userSuggestions.length - 1));
          return;
        }

        // Select active suggestion on Enter or Tab
        if ((e.key === 'Enter' || e.key === 'Tab') && userSuggestions.length > 0) {
          selectMention(userSuggestions[activeSuggestionIndex].username);
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;
    if (!userId) return;
    if (!channelId && !conversationId) return;

    try {
      setIsSubmitting(true);
      const supabase = createClient();

      console.log('Sending message to channel:', channelId, 'or conversation:', conversationId);

      // Create the message with broadcast option
      const messageToSend = {
        content: message.trim(),
        sender_id: userId,
        channel_id: channelId,
        conversation_id: conversationId,
        parent_message_id: parentMessageId,
        is_ai_generated: false,
      };

      console.log('Inserting message with data:', messageToSend);

      // Send message with explicit broadcast option
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert(messageToSend)
        .select()
        .single();

      console.log('Message sent:', messageData, 'Error:', messageError);

      if (messageError) {
        console.error('Error sending message:', messageError);
        toast.error('Failed to send message');
        return;
      }

      // Upload any attachments if there are any
      if (attachments.length > 0 && messageData) {
        const uploadPromises = attachments.map(async file => {
          try {
            // Upload file to storage
            const { data: fileData, error: fileError } = await supabase.storage
              .from('attachments')
              .upload(`${userId}/${Date.now()}-${file.name}`, file);

            if (fileError) {
              console.error('Error uploading file:', fileError);
              toast.error(`Failed to upload ${file.name}`);
              return null;
            }

            // Create file attachment record
            if (fileData) {
              const { error: attachmentError } = await supabase.from('file_attachments').insert({
                message_id: messageData.id,
                file_path: fileData.path,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
              });

              if (attachmentError) {
                console.error('Error saving attachment:', attachmentError);
                toast.error(`Failed to save attachment for ${file.name}`);
              }
            }
          } catch (error) {
            console.error(`Error processing attachment ${file.name}:`, error);
          }
        });

        await Promise.all(uploadPromises);
      }

      // Check if the message contains @mentions of offline users
      if (message.includes('@')) {
        // Extract usernames from @mentions - use a compatible approach
        const mentionRegex = /@(\w+)/g;
        let match;
        const mentionedUsernames = [];

        while ((match = mentionRegex.exec(message)) !== null) {
          mentionedUsernames.push(match[1]);
        }

        if (mentionedUsernames.length > 0) {
          // Find users that are mentioned and offline
          const { data: mentionedUsers } = await supabase
            .from('users')
            .select('id, username, status')
            .in('username', mentionedUsernames)
            .eq('status', 'offline');

          if (mentionedUsers && mentionedUsers.length > 0) {
            // Trigger AI response for each offline user
            mentionedUsers.forEach(async mentionedUser => {
              try {
                // Get the base URL from window.location in the browser
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

                await fetch(`${baseUrl}/api/ai-response`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messageId: messageData.id,
                    mentionedUserId: mentionedUser.id,
                    channelId,
                    conversationId,
                    parentMessageId,
                    content: message,
                  }),
                });
              } catch (error) {
                console.error('Failed to generate AI response:', error);
              }
            });
          }
        }
      }

      // Clear the form
      setMessage('');
      setAttachments([]);

      // Directly trigger a message list refresh
      // This is a backup that will work even if real-time doesn't
      if (messageData) {
        try {
          // Create an event that can be picked up by message list components on this page
          const refreshEvent = new CustomEvent('refresh-messages', {
            detail: {
              channelId,
              conversationId,
              messageId: messageData.id,
              parentMessageId, // Include parent message ID for thread refreshing
            },
          });
          window.dispatchEvent(refreshEvent);

          console.log('Dispatched refresh-messages event with details:', {
            channelId,
            conversationId,
            messageId: messageData.id,
            parentMessageId,
          });
        } catch (err) {
          console.error('Error dispatching refresh event:', err);
        }
      }

      onSent?.();
    } catch (error) {
      console.error('Error in message send process:', error);
      toast.error('An error occurred while sending your message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-accent rounded-md px-2 py-1 text-xs"
            >
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 relative">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn('min-h-[60px] resize-none', isSubmitting && 'opacity-50')}
            disabled={isSubmitting}
          />

          {/* Mention suggestions dropdown - positioned above the input */}
          {showMentions && userSuggestions.length > 0 && (
            <div
              className="absolute bg-background border z-10 rounded-md shadow-lg overflow-hidden"
              style={{
                bottom: 'calc(100% + 5px)' /* Position above the textarea with a small gap */,
                left: 0,
                width: '250px',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {userSuggestions.map((user, index) => (
                <div
                  key={user.id}
                  className={`px-3 py-2 cursor-pointer flex items-center ${
                    index === activeSuggestionIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => selectMention(user.username)}
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                >
                  <div
                    className={`w-6 h-6 rounded-full ${
                      index === activeSuggestionIndex ? 'bg-primary-foreground/20' : 'bg-primary/20'
                    } mr-2 flex items-center justify-center text-xs`}
                  >
                    {user.display_name?.[0] || user.username[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{user.display_name || user.username}</div>
                    <div
                      className={`text-xs ${
                        index === activeSuggestionIndex
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}
                    >
                      @{user.username}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />

          <Button
            variant="ghost"
            size="icon"
            type="button"
            disabled={isSubmitting}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Button
            variant="default"
            size="icon"
            type="button"
            disabled={isSubmitting || (!message.trim() && attachments.length === 0)}
            onClick={handleSend}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
