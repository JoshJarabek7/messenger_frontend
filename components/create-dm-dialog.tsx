'use client';

import React, { useState, useEffect } from 'react';
import { Users, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/utils/supabase/client';

interface User {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
  similarity?: number;
  similarityPercent?: string;
}

interface CreateDMDialogProps {
  organizationId: string;
  organizationSlug: string;
  currentUserId: string;
  trigger?: React.ReactNode;
}

export function CreateDMDialog({
  organizationId,
  organizationSlug,
  currentUserId,
  trigger,
}: CreateDMDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  // Load users from organization when dialog opens
  useEffect(() => {
    if (open) {
      loadOrganizationUsers();
    } else {
      // Reset state when dialog closes
      setSearchQuery('');
      setSelectedUsers([]);
    }
  }, [open, organizationId]);

  // Filter users when search query changes
  const filteredUsers = users.filter(user => {
    // Don't include current user
    if (user.id === currentUserId) return false;

    // Don't include already selected users
    if (selectedUsers.some(selected => selected.id === user.id)) return false;

    // Filter by search query
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      (user.display_name && user.display_name.toLowerCase().includes(query))
    );
  });

  // Search for users using vector similarity if available
  const searchWithVectors = async (query: string) => {
    if (!query.trim()) return;

    try {
      // Format the search query with repetition to better match user embeddings
      const queryParts = query.split(/\s+/);

      // Create enhanced query to better match name patterns
      const formattedQuery = `User: ${query} ${query}
Username: ${query} ${query}
Display Name: ${query} ${query}
Name: ${query} ${query}
Person: ${query}
${queryParts.join(' ')} ${queryParts.join(' ')}
${queryParts.map(p => `${p} ${p} ${p}`).join('\n')}
Keywords: ${query}, ${queryParts.join(', ')}`;

      console.log('Using enhanced query format for user search:', formattedQuery);

      // First, get embedding for the search query
      // Get the base URL from window.location in the browser
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

      const response = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: formattedQuery,
          type: 'search_query',
          id: 'temp-search-id',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate embedding for user search');
      }

      const { embedding } = await response.json();

      // Use the embedding for vector search with a lower threshold to get more results
      const supabase = createClient();
      const { data: userEmbeddings, error } = await supabase.rpc('search_users', {
        query_embedding: embedding,
        similarity_threshold: 0.3, // Lower threshold to get more results
        match_count: 20, // Increase match count to get more potential matches
        organization_id: organizationId,
      });

      if (error) {
        console.error('Vector search error:', error);
        return null;
      }

      if (userEmbeddings && userEmbeddings.length > 0) {
        console.log(
          'Vector search results:',
          userEmbeddings.map(u => `${u.id}: ${(u.similarity * 100).toFixed(1)}%`)
        );

        // Get full user details
        const { data: vectorUsers } = await supabase
          .from('users')
          .select('*')
          .in(
            'id',
            userEmbeddings.map((u: any) => u.id)
          );

        if (vectorUsers && vectorUsers.length > 0) {
          // Add similarity scores and text match boosting
          const enhancedUsers = vectorUsers.map(user => {
            // Find the similarity score from vector search
            const userEmbed = userEmbeddings.find((u: any) => u.id === user.id);
            let similarity = userEmbed ? userEmbed.similarity : 0;

            // Add text match boost
            const lowerQuery = query.trim().toLowerCase();
            const lowerUsername = user.username.toLowerCase();
            const lowerDisplayName = user.display_name ? user.display_name.toLowerCase() : '';

            // Exact match with username or display name
            if (lowerUsername === lowerQuery || lowerDisplayName === lowerQuery) {
              similarity = 1.0;
              console.log(`Exact match found for user ${user.username}! Boosting to 100%`);
            }
            // Partial match with username or display name
            else if (lowerUsername.includes(lowerQuery) || lowerDisplayName.includes(lowerQuery)) {
              const newScore = Math.max(similarity, 0.85);
              console.log(
                `Search term found in user ${user.username}! Boosting from ${(similarity * 100).toFixed(0)}% to ${(newScore * 100).toFixed(0)}%`
              );
              similarity = newScore;
            }
            // Query contains username or display name
            else if (
              lowerQuery.includes(lowerUsername) ||
              (lowerDisplayName && lowerQuery.includes(lowerDisplayName))
            ) {
              const newScore = Math.max(similarity, 0.8);
              console.log(
                `User name found in search query! Boosting from ${(similarity * 100).toFixed(0)}% to ${(newScore * 100).toFixed(0)}%`
              );
              similarity = newScore;
            }
            // Word-level matches
            else {
              const userNameWords = [...lowerUsername.split(/\s+/)];
              if (lowerDisplayName) {
                userNameWords.push(...lowerDisplayName.split(/\s+/));
              }

              const queryWords = lowerQuery.split(/\s+/);

              const matchingWords = queryWords.filter(word =>
                userNameWords.some(
                  nameWord =>
                    nameWord === word || nameWord.includes(word) || word.includes(nameWord)
                )
              );

              if (matchingWords.length > 0) {
                const matchPercentage =
                  matchingWords.length / Math.max(userNameWords.length, queryWords.length);
                const wordBoostFactor = 0.7 + 0.3 * matchPercentage;
                const newScore = Math.max(similarity, wordBoostFactor);
                console.log(
                  `Found ${matchingWords.length} matching words for user ${user.username}! Boosting similarity from ${(similarity * 100).toFixed(0)}% to ${(newScore * 100).toFixed(0)}%`
                );
                similarity = newScore;
              }
            }

            // Add similarity and formatted percentage to user object
            return {
              ...user,
              similarity,
              similarityPercent: `${(similarity * 100).toFixed(0)}%`,
            };
          });

          // Sort by similarity
          return enhancedUsers.sort((a, b) => b.similarity - a.similarity);
        }
      }

      // Return null if no results found via vector search
      return null;
    } catch (error) {
      console.error('Error in vector search:', error);
      return null;
    }
  };

  const loadOrganizationUsers = async () => {
    setLoading(true);
    const supabase = createClient();

    // Get all members of the organization
    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
        user:users (
          id,
          username,
          display_name,
          avatar_url,
          status
        )
      `
      )
      .eq('organization_id', organizationId);

    if (data && !error) {
      setUsers(data.map((item: any) => item.user));
    } else {
      console.error('Failed to load users:', error);
    }

    setLoading(false);
  };

  // Handle search with debounce for vector search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) return;

    const timer = setTimeout(async () => {
      // Try vector search first
      const vectorResults = await searchWithVectors(searchQuery);

      // If vector search returned results, use them
      if (vectorResults) {
        console.log('Vector search found users:', vectorResults.length);
        // Maintain currently selected users
        const selected = selectedUsers.map(u => u.id);
        // Filter out currentUser and already selected users
        const filteredResults = vectorResults.filter(
          u => u.id !== currentUserId && !selected.includes(u.id)
        );
        setUsers(
          filteredResults.map(user => ({
            ...user,
            display_name: user.display_name ?? undefined,
            avatar_url: user.avatar_url ?? undefined,
            status: user.status as any,
          }))
        );
      }
      // Otherwise the normal text filter will apply to the existing users
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUserSelect = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
  };

  const handleUserRemove = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedUsers.length === 0) {
      return;
    }

    console.log(
      'Submitting form to create DM with users:',
      selectedUsers.map(u => u.username).join(', ')
    );

    try {
      // Create form data
      const formData = new FormData();
      formData.append('organization_slug', organizationSlug);
      formData.append('organization_id', organizationId);

      // Add all selected user IDs
      selectedUsers.forEach(user => {
        formData.append('user_ids[]', user.id);
      });

      // Use fetch API to submit directly
      // Summarize what's being sent
      console.log(`POSTing to /protected/org/${organizationSlug}/dm/create with:`, {
        organizationId,
        organizationSlug,
        userIds: selectedUsers.map(u => u.id),
      });

      const response = await fetch(`/protected/org/${organizationSlug}/dm/create`, {
        method: 'POST',
        body: formData,
        redirect: 'follow',
      });

      console.log('Response status:', response.status, response.statusText);

      if (response.redirected) {
        // If we got a redirect, follow it
        console.log('Redirecting to:', response.url);
        window.location.href = response.url;
        return;
      }

      // Check if we got a successful response
      if (response.ok) {
        console.log('Successful response but no redirect');

        try {
          // Try to parse the response body
          const text = await response.text();
          console.log('Response body:', text);

          // Look for any redirect URL in the response
          const redirectMatch = text.match(/URL=['"]([^'"]+)['"]/);
          if (redirectMatch && redirectMatch[1]) {
            const redirectUrl = redirectMatch[1];
            console.log('Found redirect URL in response:', redirectUrl);
            window.location.href = redirectUrl;
            return;
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
        }

        // If we couldn't find a redirect, just close the dialog
        setOpen(false);
      } else {
        // Handle error response
        console.error('Error response:', response.status, response.statusText);
        try {
          const errorText = await response.text();
          console.error('Error details:', errorText);
        } catch (e) {
          console.error('Could not read error response');
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">New Message</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New conversation</DialogTitle>
            <DialogDescription>Start a direct message with one or more people.</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {selectedUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1 bg-accent rounded-full px-2 py-1 text-xs"
                  >
                    <span className="max-w-[120px] truncate">
                      {user.display_name || user.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUserRemove(user.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* User list */}
            <ScrollArea className="h-[200px] mt-2">
              <div className="space-y-1 p-1">
                {filteredUsers.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {loading ? 'Loading...' : 'No users found'}
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 hover:bg-accent text-left"
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="relative h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <Users size={12} />
                        <span
                          className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${getStatusColor(user.status)}`}
                        />
                      </div>
                      <span className="flex-1 truncate">{user.display_name || user.username}</span>
                      {user.similarityPercent && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full mr-1 ${
                            (user.similarity || 0) >= 0.8
                              ? 'bg-green-100 text-green-800'
                              : (user.similarity || 0) >= 0.65
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {user.similarityPercent}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">@{user.username}</span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Hidden input fields are now handled in JavaScript */}

          <DialogFooter>
            <Button type="submit" disabled={selectedUsers.length === 0}>
              Start Conversation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
