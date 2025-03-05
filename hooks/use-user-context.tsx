'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { User } from '@/types/app';
import { createClient } from '@/utils/supabase/client';
import { nullToUndefined } from '@/utils/type-utils';

type UserContextType = {
  currentUser: User | null;
  userProfiles: Record<string, User>;
  updateUser: (updates: Partial<User>) => void;
  loading: boolean;
};

const UserContext = createContext<UserContextType>({
  currentUser: null,
  userProfiles: {},
  updateUser: () => {},
  loading: true,
});

export function UserProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [userProfiles, setUserProfiles] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(false);

  // Subscribe to user changes
  useEffect(() => {
    if (!initialUser?.id) return;

    const supabase = createClient();

    // Add the initial user to profiles
    setUserProfiles(prev => ({
      ...prev,
      [initialUser.id]: initialUser,
    }));

    // Subscribe to the current user's changes
    const userSubscription = supabase
      .channel(`user-${initialUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${initialUser.id}`,
        },
        payload => {
          if (payload.new) {
            setCurrentUser(prev => {
              if (!prev) return null;

              const newUser = { ...prev };

              // Process each field to convert null to undefined
              if ('display_name' in payload.new) {
                newUser.display_name = nullToUndefined(payload.new.display_name);
              }
              if ('avatar_url' in payload.new) {
                newUser.avatar_url = nullToUndefined(payload.new.avatar_url);
              }
              if ('status' in payload.new) {
                newUser.status = nullToUndefined(payload.new.status) as User['status'];
              }
              if ('bio' in payload.new) {
                newUser.bio = nullToUndefined(payload.new.bio);
              }
              if ('ai_persona_prompt' in payload.new) {
                newUser.ai_persona_prompt = nullToUndefined(payload.new.ai_persona_prompt);
              }
              if ('last_seen' in payload.new) {
                newUser.last_seen = nullToUndefined(payload.new.last_seen);
              }

              // Copy other fields directly
              if ('id' in payload.new) newUser.id = payload.new.id;
              if ('username' in payload.new) newUser.username = payload.new.username;
              if ('email' in payload.new) newUser.email = payload.new.email;
              if ('updated_at' in payload.new) newUser.updated_at = payload.new.updated_at;
              if ('created_at' in payload.new) newUser.created_at = payload.new.created_at;

              return newUser;
            });

            // Also update the user in the profiles map
            setUserProfiles(prev => ({
              ...prev,
              [payload.new.id]: {
                ...prev[payload.new.id],
                ...payload.new,
              },
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to all user updates
    const allUsersSubscription = supabase
      .channel('all-users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        payload => {
          if (payload.new && payload.new.id) {
            const userId = payload.new.id;

            // Don't double-update the current user
            if (userId === initialUser.id) {
              return;
            }

            // Update the user in profiles
            setUserProfiles(prev => {
              // If we already have this user, merge the updates
              if (prev[userId]) {
                return {
                  ...prev,
                  [userId]: {
                    ...prev[userId],
                    ...payload.new,
                    // Convert nulls to undefined
                    display_name:
                      nullToUndefined(payload.new.display_name) || prev[userId].display_name,
                    avatar_url: nullToUndefined(payload.new.avatar_url) || prev[userId].avatar_url,
                    status:
                      (nullToUndefined(payload.new.status) as User['status']) ||
                      prev[userId].status,
                    bio: nullToUndefined(payload.new.bio) || prev[userId].bio,
                  },
                };
              }

              // If we don't have this user yet, fetch their complete profile
              fetchUserProfile(userId);
              return prev;
            });
          }
        }
      )
      .subscribe();

    // Function to fetch a complete user profile
    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

        if (error) throw error;

        if (data) {
          setUserProfiles(prev => ({
            ...prev,
            [userId]: data as User,
          }));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    return () => {
      supabase.removeChannel(userSubscription);
      supabase.removeChannel(allUsersSubscription);
    };
  }, [initialUser]);

  const updateUser = async (updates: Partial<User>) => {
    if (!currentUser?.id) return;

    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.from('users').update(updates).eq('id', currentUser.id);

      if (error) throw error;

      // Update local state immediately for a snappier UI
      setCurrentUser(prev => (prev ? { ...prev, ...updates } : null));

      // Also update in profiles
      setUserProfiles(prev => ({
        ...prev,
        [currentUser.id]: { ...prev[currentUser.id], ...updates },
      }));
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, userProfiles, updateUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
