'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

// Database type is imported for type checking in this file
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Database } from '@/types/supabase';
import { generateUserEmbeddingsServer } from '@/utils/server-utils';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { encodedRedirect } from '@/utils/utils';

export const checkUsernameAction = async (username: string) => {
  const supabase = await createClient();

  if (!username || username.length < 3) {
    return { available: false };
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { available: false };
  }

  try {
    // Check if username exists in the database
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    console.log('Username check result:', { username, data, error });

    // If the query returned a row, username exists and is not available
    // If data is null, username is available
    return { available: data === null };
  } catch (e) {
    console.error('Error checking username:', e);
    return { available: false };
  }
};

// Removed test auth function

export const signUpAction = async (formData: FormData) => {
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const username = formData.get('username')?.toString()?.toLowerCase(); // Ensure lowercase
  const supabase = await createClient();
  const headerObj = await headers();
  const origin = headerObj.get('origin');

  // Check if Supabase auth is working
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Supabase auth check - session:', sessionData ? 'exists' : 'none');
  } catch (e) {
    console.error('Error checking Supabase auth:', e);
    return encodedRedirect(
      'error',
      '/sign-up',
      'Authentication service unavailable. Please try again later.'
    );
  }

  // Simple validation
  if (!email || !password || !username) {
    return encodedRedirect('error', '/sign-up', 'All fields required');
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return encodedRedirect('error', '/sign-up', 'Username format invalid');
  }

  console.log('Attempting signup with:', { email, username });

  try {
    // First just check if the username is available
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('username', username);

    if (countError) {
      console.error('Error checking username availability:', countError);
      return encodedRedirect('error', '/sign-up', 'Error checking username: ' + countError.message);
    }

    if (count && count > 0) {
      console.log('Username already taken:', username);
      return encodedRedirect('error', '/sign-up', 'Username already taken');
    }

    // Add metadata with username to help the trigger create the profile
    // Disable email confirmation for demo purposes
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
        emailRedirectTo: `${origin}/auth/callback?redirect_to=/protected`,
        // Skip email verification for demo purposes
        emailConfirmationRedirectTo: null,
      },
    });

    if (error) {
      console.error('Auth signup error:', error);
      return encodedRedirect('error', '/sign-up', 'Signup failed: ' + error.message);
    }

    console.log('Auth signup successful:', { user: data.user });

    // If we got here successfully, check if we need to manually create the user profile
    if (data.user) {
      // Wait a moment to allow the trigger to execute first
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if a profile was automatically created by the trigger
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileCheckError) {
        console.error('Error checking for existing profile:', profileCheckError);
      }

      // If no profile was created by the trigger, create it manually
      if (!existingProfile) {
        console.log('Creating user profile manually');

        // Use admin client for this operation
        const adminSupabase = await createAdminClient();

        const { error: profileError } = await adminSupabase.from('users').insert({
          id: data.user.id,
          email: email,
          username: username,
          status: 'online',
          last_seen: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          return encodedRedirect(
            'error',
            '/sign-up',
            'Profile creation failed: ' + profileError.message
          );
        }

        console.log('User profile created manually successfully');

        // Generate embeddings for the new user for vector search
        try {
          const contentText = username; // Just the username for now
          await generateUserEmbeddingsServer(data.user.id, contentText);
          console.log('User embeddings generated successfully');
        } catch (embedError) {
          console.error('Error generating user embeddings:', embedError);
          // Continue anyway, embeddings can be generated later
        }
      } else {
        console.log('User profile was created by trigger successfully');

        // Generate embeddings for the existing user profile
        try {
          // Use the proper Database type from supabase.ts
          const profile = existingProfile as Database['public']['Tables']['users']['Row'];
          const contentText = [username, profile.display_name ?? '', profile.bio ?? '']
            .filter(Boolean)
            .join('\n\n');

          await generateUserEmbeddingsServer(data.user.id, contentText);
          console.log('User embeddings generated successfully');
        } catch (embedError) {
          console.error('Error generating user embeddings:', embedError);
          // Continue anyway, embeddings can be generated later
        }
      }
    }

    // For demo purposes, redirect directly to sign-in page
    // This avoids the need for email verification
    return {
      success: true,
      message: 'Account created successfully! You can now sign in.',
      redirect: '/sign-in',
    };
  } catch (error) {
    console.error('Exception during signup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Signup failed: ${errorMessage}`,
    };
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = await createClient();

  // If the user hasn't been email-verified, automatically confirm them when they sign in
  // This is for demo purposes only! In production, email verification is important.
  try {
    const { data: adminData } = await supabase.auth.admin.getUserByEmail(email);
    
    if (adminData?.user && !adminData.user.email_confirmed_at) {
      console.log('Auto-confirming user email for demo purposes');
      await supabase.auth.admin.updateUserById(adminData.user.id, {
        email_confirmed: true
      });
    }
  } catch (e) {
    // Ignore errors with admin operations - will fall back to normal sign in
    console.log('Email auto-confirmation skipped, continuing with normal sign in');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect('error', '/sign-in', error.message);
  }

  // Update user status to online
  if (data?.user) {
    await supabase
      .from('users')
      .update({
        status: 'online',
        last_seen: new Date().toISOString(),
      })
      .eq('id', data.user.id);
  }

  return redirect('/protected');
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get('email')?.toString();
  const supabase = await createClient();
  const origin = (await Promise.resolve(headers())).get('origin');
  const callbackUrl = formData.get('callbackUrl')?.toString();

  if (!email) {
    return encodedRedirect('error', '/forgot-password', 'Email is required');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect('error', '/forgot-password', 'Could not reset password');
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    'success',
    '/forgot-password',
    'Check your email for a link to reset your password.'
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    return encodedRedirect(
      'error',
      '/protected/reset-password',
      'Password and confirm password are required'
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect('error', '/protected/reset-password', 'Passwords do not match');
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return encodedRedirect(
      'error',
      '/protected/reset-password',
      'Password update failed: ' + error.message
    );
  }

  return encodedRedirect('success', '/protected/reset-password', 'Password updated successfully');
};

export const signOutAction = async () => {
  const supabase = await createClient();

  // Get current user before signing out
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Update user status to offline
  if (user) {
    await supabase
      .from('users')
      .update({
        status: 'offline',
        last_seen: new Date().toISOString(),
      })
      .eq('id', user.id);
  }

  await supabase.auth.signOut();
  return redirect('/sign-in');
};

// Create an organization
export async function createOrganizationAction(formData: FormData) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/sign-in');
  }

  // Get form data
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const description = (formData.get('description') as string) || null;

  // Validate inputs
  if (!name || !slug) {
    return {
      success: false,
      message: 'Name and slug are required',
    };
  }

  // Validate slug format
  if (!/^[a-z0-9-]{3,30}$/.test(slug)) {
    return {
      success: false,
      message:
        'Slug must be 3-30 characters and can only contain lowercase letters, numbers, and hyphens',
    };
  }

  // Check if slug is already taken
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('slug')
    .eq('slug', slug)
    .single();

  if (existingOrg) {
    return {
      success: false,
      message: 'This URL is already taken. Please choose another one.',
    };
  }

  // Create the organization
  const { data: org, error } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      description,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create organization:', error);
    return {
      success: false,
      message: 'Failed to create organization: ' + error.message,
    };
  }

  // Generate embeddings for the new organization
  try {
    console.log('Generating organization embedding for:', org.id);

    // Extract company name parts for better matching
    const nameParts = name.split(/\s+/);

    // Create extremely keyword-heavy content
    const exactOrgName = Array(10).fill(name).join(' ');

    // Add individual words with repetition
    const individualWords = [];
    for (const part of nameParts) {
      individualWords.push(...Array(5).fill(part));
    }

    // Build list of all variations for keywords
    const keywords = [
      ...Array(5).fill(name), // Full name repeated
      ...individualWords, // Individual words repeated 5x
      nameParts.join(' '), // Space-separated
      nameParts.join(', '), // Comma-separated
      nameParts.join('-'), // Hyphen-separated
      ...nameParts, // Individual words once more
    ];

    // Create content text with very heavy repetition and structured format
    const contentText = `${exactOrgName}
Organization: ${name} ${name} ${name}
Organization Name: ${name} ${name} ${name}
Name: ${name} ${name} ${name}
Company: ${name} ${name} ${name}
Business: ${name} ${name}
Title: ${name} ${name}
Brand: ${name} ${name}
Organization: ${nameParts.join(' ')} ${nameParts.join(' ')}
Name: ${nameParts.join(' ')} ${nameParts.join(' ')}
Company: ${nameParts.join(' ')} ${nameParts.join(' ')}
${nameParts.map(p => `${p} ${p} ${p} ${p} ${p}`).join('\n')}
Keywords: ${keywords.join(', ')}
Description: ${description || `Organization called ${name}`}
About: ${name}
Additional Information: ${name} organization
${description ? `Context: ${description}` : ``}`;

    // Import the getBaseUrl function to get the correct base URL
    const { getBaseUrl } = await import('@/utils/server-utils');
    const baseUrl = getBaseUrl();

    // Call the embeddings API directly to generate and save the embedding
    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass the user's session cookie for authentication
        Cookie: (await headers()).get('cookie') || '',
      },
      body: JSON.stringify({
        text: contentText,
        type: 'organization',
        id: org.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to generate organization embedding:', errorData);

      // Clean up - delete the organization if embedding generation fails
      console.log('Deleting organization due to embedding generation failure:', org.id);
      const { error: deleteError } = await supabase.from('organizations').delete().eq('id', org.id);

      if (deleteError) {
        console.error('Failed to delete organization after embedding failure:', deleteError);
      }

      return {
        success: false,
        message:
          'Failed to create organization: Could not generate embeddings for search functionality.',
      };
    }

    console.log('Successfully created organization embedding');
  } catch (embedErr) {
    console.error('Exception creating organization embedding:', embedErr);

    // Clean up - delete the organization if embedding generation fails
    console.log('Deleting organization due to embedding generation exception:', org.id);
    const { error: deleteError } = await supabase.from('organizations').delete().eq('id', org.id);

    if (deleteError) {
      console.error('Failed to delete organization after embedding exception:', deleteError);
    }

    return {
      success: false,
      message: 'Failed to create organization: Error during embedding generation.',
    };
  }

  // Use admin client to add organization membership - only proceed if embedding was successful
  console.log('Creating organization membership...');

  try {
    // First check if a membership already exists
    const { data: existingMembership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', org.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      console.log('Membership already exists, skipping creation');
    } else {
      // Insert the membership record
      const { error: memberError } = await supabase.from('organization_members').insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
      });

      if (memberError) {
        console.error('Failed to add user as organization member:', memberError);

        // If it's a duplicate key error, it's probably fine, just log and continue
        if (memberError.code === '23505') {
          console.log('Membership already exists (according to error), proceeding');
        } else {
          console.log('Will attempt to proceed anyway');
        }
      } else {
        console.log('Successfully created organization membership');
      }
    }
  } catch (err) {
    console.error('Exception when creating organization membership:', err);
  }

  // Create a general channel for the organization
  const { error: channelError } = await supabase.from('channels').insert({
    name: 'general',
    slug: 'general',
    description: 'General discussion',
    organization_id: org.id,
  });

  if (channelError) {
    console.error('Failed to create general channel:', channelError);
    // Continue anyway so we at least have the organization, even without the general channel
  }
  // Note: channel membership is not required as all organization members have access to all channels

  // Redirect to the new organization
  return {
    success: true,
    redirect: `/protected/org/${org.slug}`,
  };
}

// Delete an organization
export async function deleteOrganizationAction(orgId: string, userId: string) {
  const supabase = await createClient();

  // Check if user is the owner
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    return {
      success: false,
      message: 'Organization not found',
    };
  }

  if (org.owner_id !== userId) {
    return {
      success: false,
      message: 'Only the owner can delete an organization',
    };
  }

  console.log('Attempting to delete organization:', orgId);

  // Try multiple approaches to delete the organization
  try {
    // Approach 1: Try using admin client to bypass RLS
    const adminClient = await createAdminClient();

    // Delete the organization using DELETE operation
    const { error } = await adminClient.from('organizations').delete().eq('id', orgId);

    if (error) {
      console.error('Failed to delete organization using admin client DELETE:', error);

      // Approach 2: Try using raw SQL through RPC
      console.log('Attempting to delete organization with raw SQL through RPC');
      const { error: rpcError } = await adminClient.rpc('delete_organization', { org_id: orgId });

      if (rpcError) {
        console.error('Failed to delete organization using RPC:', rpcError);

        // Approach 3: Try direct client
        console.log('Attempting to delete organization with direct client');
        const { error: directError } = await supabase
          .from('organizations')
          .delete()
          .eq('id', orgId);

        if (directError) {
          console.error('Failed to delete organization with direct client:', directError);
          return {
            success: false,
            message: 'Failed to delete organization after multiple attempts',
          };
        }
      }
    }
  } catch (e) {
    console.error('Exception when deleting organization:', e);
    return {
      success: false,
      message: 'Exception when deleting organization',
    };
  }

  console.log('Organization deletion process completed for:', orgId);

  return {
    success: true,
    message: 'Organization deleted successfully',
    redirect: '/protected',
  };
}

// Leave an organization
export async function leaveOrganizationAction(orgId: string, userId: string) {
  const supabase = await createClient();

  // Check if user is the owner
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    return {
      success: false,
      message: 'Organization not found',
    };
  }

  // Owners cannot leave their organization
  if (org.owner_id === userId) {
    return {
      success: false,
      message:
        'Organization owners cannot leave. Transfer ownership or delete the organization instead.',
    };
  }

  // Delete the member record
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', orgId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to leave organization:', error);
    return {
      success: false,
      message: 'Failed to leave organization: ' + error.message,
    };
  }

  return {
    success: true,
    message: 'You have left the organization',
    redirect: '/protected',
  };
}

// Create a new channel
export async function createChannelAction(formData: FormData) {
  // Use admin client to bypass RLS policies that might be causing infinite recursion
  const _supabase = await createAdminClient();
  const regularClient = await createClient();

  // Get current user
  const {
    data: { user },
  } = await regularClient.auth.getUser();

  if (!user) {
    return redirect('/sign-in');
  }

  // Get form data
  const organizationId = formData.get('organization_id') as string;
  const organizationSlug = formData.get('organization_slug') as string;
  const name = formData.get('name') as string;
  const slug = (formData.get('slug') as string) || name.toLowerCase().replace(/\s+/g, '-');
  const description = (formData.get('description') as string) || null;

  // Validate inputs
  if (!name || !organizationId || !organizationSlug) {
    return encodedRedirect(
      'error',
      `/protected/org/${organizationSlug}`,
      'Channel name and organization are required'
    );
  }

  // Validate slug format
  if (!/^[a-z0-9-]{2,30}$/.test(slug)) {
    return encodedRedirect(
      'error',
      `/protected/org/${organizationSlug}`,
      'Slug must be 2-30 characters and can only contain lowercase letters, numbers, and hyphens'
    );
  }

  try {
    // Always use adminClient for operations to avoid RLS infinite recursion issues
    const adminClient = await createAdminClient();

    // Check if slug is already taken in this organization using count
    const { count } = await adminClient
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('slug', slug);

    if (count && count > 0) {
      return encodedRedirect(
        'error',
        `/protected/org/${organizationSlug}`,
        'A channel with this URL already exists in this organization'
      );
    }

    // Insert the new channel using admin client to bypass RLS
    const { data: channel, error } = await adminClient
      .from('channels')
      .insert({
        name,
        slug,
        description,
        organization_id: organizationId,
        created_by: user.id,
        is_public: true, // Ensure the channel is public by default
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create channel:', error);
      return encodedRedirect(
        'error',
        `/protected/org/${organizationSlug}`,
        'Failed to create channel: ' + error.message
      );
    }

    console.log('Channel created successfully:', channel.name);

    // Generate embeddings for the new channel
    try {
      console.log('Generating channel embedding for:', channel.id);

      // Extract channel name parts for better matching
      const nameParts = name.split(/\s+/);
      const keywords = [
        name, // Full name (most important)
        ...nameParts, // Individual words
        nameParts.join(', '), // Words as comma list
      ];

      // Additional variations for better matching
      if (name.includes(' ')) {
        // For multi-word names, add individual words with higher weight
        keywords.push(...Array(3).fill(nameParts).flat());
      }

      // Create enhanced content text with structured format to improve semantic similarity
      const contentText = `Channel: ${name}
Channel Name: ${name}
Topic: ${name}
Description: ${description || ''}
Keywords: ${keywords.join(', ')}
${description ? `About: ${description}` : ''}
${description ? `Additional Context: ${description}` : ''}`;

      // Import the getBaseUrl function to get the correct base URL
      const { getBaseUrl } = await import('@/utils/server-utils');
      const baseUrl = getBaseUrl();

      // Call the embeddings API directly to generate and save the embedding
      const response = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pass the user's session cookie for authentication
          Cookie: (await headers()).get('cookie') || '',
        },
        body: JSON.stringify({
          text: contentText,
          type: 'channel',
          id: channel.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to generate channel embedding:', errorData);

        // Clean up - delete the channel if embedding generation fails
        console.log('Deleting channel due to embedding generation failure:', channel.id);
        const { error: deleteError } = await adminClient
          .from('channels')
          .delete()
          .eq('id', channel.id);

        if (deleteError) {
          console.error('Failed to delete channel after embedding failure:', deleteError);
        }

        return encodedRedirect(
          'error',
          `/protected/org/${organizationSlug}`,
          'Failed to create channel: Could not generate embeddings for search functionality.'
        );
      }

      console.log('Successfully created channel embedding');
    } catch (embedErr) {
      console.error('Exception creating channel embedding:', embedErr);

      // Clean up - delete the channel if embedding generation fails
      console.log('Deleting channel due to embedding generation exception:', channel.id);
      const { error: deleteError } = await adminClient
        .from('channels')
        .delete()
        .eq('id', channel.id);

      if (deleteError) {
        console.error('Failed to delete channel after embedding exception:', deleteError);
      }

      return encodedRedirect(
        'error',
        `/protected/org/${organizationSlug}`,
        'Failed to create channel: Error during embedding generation.'
      );
    }

    // Only redirect to the new channel if embedding was successful
    return redirect(`/protected/org/${organizationSlug}/channel/${channel.slug}`);
  } catch (error) {
    console.error('Error in channel creation:', error);
    return encodedRedirect(
      'error',
      `/protected/org/${organizationSlug}`,
      'Error creating channel. Please try again.'
    );
  }
}

// Check if slug is available for a channel
export async function checkChannelSlugAction(organizationId: string, slug: string) {
  // Return a Promise that resolves with the result to handle Next.js serialization properly
  return Promise.resolve().then(async () => {
    // Use admin client to bypass RLS policies that might be causing infinite recursion
    const adminClient = await createAdminClient();

    if (!slug || slug.length < 2) {
      return { available: false };
    }

    if (!/^[a-z0-9-]{2,30}$/.test(slug)) {
      return { available: false };
    }

    try {
      // Check if any channels with this slug already exist in this organization - use direct query
      // to avoid RPC issues
      const { count } = await adminClient
        .from('channels')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('slug', slug);

      return { available: count === 0 };
    } catch (error) {
      console.error('Error checking channel slug:', error);

      // In case of error, default to saying it's available and let server-side validation catch it
      return { available: true };
    }
  });
}

// Create or get existing direct message conversation
// Toggle a reaction (add if it doesn't exist, remove if it does)
export async function toggleReactionAction(messageId: string, emoji: string) {
  try {
    // Use admin client to bypass RLS policies
    const adminClient = await createAdminClient();
    const regularClient = await createClient();

    // Get current user
    const {
      data: { user },
    } = await regularClient.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if the user already has this reaction
    const { data: existingReaction, error: checkError } = await adminClient
      .from('reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing reaction:', checkError);
      return { success: false, error: 'Failed to check existing reaction' };
    }

    if (existingReaction) {
      // Remove the reaction
      // For reaction deletion, use multiple strategies for reliability
      // First try the specific reaction ID
      const { error: deleteError } = await adminClient
        .from('reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        console.error('Error removing reaction by ID:', deleteError);

        // If that fails, try using both the message and user IDs with emoji as a fallback
        console.log('Trying alternate deletion method with message_id + user_id + emoji');
        const { error: fallbackDeleteError } = await adminClient
          .from('reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (fallbackDeleteError) {
          console.error('Fallback deletion also failed:', fallbackDeleteError);
          return { success: false, error: 'Failed to remove reaction' };
        }
      }

      // Short pause to ensure propagation completes
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        action: 'removed',
        reactionId: existingReaction.id,
        messageId, // Include messageId for client-side updates
        emoji,
      };
    } else {
      // Add the reaction
      const { data: newReaction, error: insertError } = await adminClient
        .from('reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji: emoji,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error adding reaction:', insertError);
        return { success: false, error: 'Failed to add reaction' };
      }

      return {
        success: true,
        action: 'added',
        reactionId: newReaction.id,
      };
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function deleteDirectMessageAction(conversationId: string) {
  console.log(`Deleting direct message conversation: ${conversationId}`);
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // First verify the user is a participant in this conversation
    const { data: isParticipant, error: participantCheckError } = await supabase
      .from('direct_message_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantCheckError || !isParticipant) {
      console.log('User is not a participant in this conversation');
      return { success: false, error: 'You are not authorized to delete this conversation' };
    }

    // First get the conversation details to find the organization
    const { data: conversation, error: convError } = await supabase
      .from('direct_message_conversations')
      .select('organization_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.log('Error getting conversation details:', convError);
      return { success: false, error: 'Conversation not found' };
    }

    // Get organization slug for redirect
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', conversation.organization_id)
      .single();

    if (orgError) {
      console.log('Error getting organization details:', orgError);
      return { success: false, error: 'Organization not found' };
    }

    // Use the database function for deletion (uses CASCADE constraints)
    try {
      console.log('Using database function for conversation deletion');

      // Call the delete_direct_message_conversation database function
      const { data, error } = await supabase.rpc('delete_direct_message_conversation', {
        conversation_id: conversationId,
      });

      if (error) {
        console.error('Error calling delete conversation function:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }

      if (!data) {
        console.error('Deletion function returned false');
        return { success: false, error: 'Deletion function did not complete successfully' };
      }

      console.log('Database function deletion result:', data);

      // Verify deletion
      console.log('Verifying deletion');
      const { data: verifyData } = await supabase
        .from('direct_message_conversations')
        .select('id')
        .eq('id', conversationId);

      if (verifyData && verifyData.length > 0) {
        console.error('CRITICAL: Conversation still exists after deletion attempt');

        // Last resort: Try simple DELETE query directly
        console.log('Attempting direct DELETE as last resort');
        await supabase.from('direct_message_conversations').delete().eq('id', conversationId);

        // Check again
        const { data: finalCheck } = await supabase
          .from('direct_message_conversations')
          .select('id')
          .eq('id', conversationId);

        if (finalCheck && finalCheck.length > 0) {
          return {
            success: false,
            error: 'Failed to delete conversation - it still exists in database',
          };
        }
      }

      console.log('Verification successful - conversation has been deleted');
    } catch (error) {
      console.error('Error in deletion process:', error);

      // Fall back to direct delete as last resort
      console.log('Falling back to direct DELETE');

      // Now that we have CASCADE constraints, we only need to delete the conversation itself
      const { error: deleteError } = await supabase
        .from('direct_message_conversations')
        .delete()
        .eq('id', conversationId);

      if (deleteError) {
        console.error('Final deletion attempt failed:', deleteError);
        return { success: false, error: 'All deletion attempts failed' };
      }

      console.log('Fallback deletion completed successfully');
    }

    console.log('Successfully deleted conversation and all related data');

    // Return success with redirect information
    return {
      success: true,
      redirect: `/protected/org/${organization.slug}`,
    };
  } catch (error) {
    console.error('Error in deleteDirectMessageAction:', error);
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function createDirectMessageAction(formData: FormData) {
  console.log('Starting createDirectMessageAction with form data');
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log('No authenticated user found');
    return redirect('/sign-in');
  }

  // Log all form fields for debugging
  console.log('Form data entries:');
  // Convert FormData entries to array for TypeScript compatibility
  Array.from(formData.entries()).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  // Get form data
  const organizationSlug = formData.get('organization_slug') as string;
  const organizationId = formData.get('organization_id') as string;
  const userIds = formData.getAll('user_ids[]') as string[];

  console.log('Form data extracted:', {
    organizationSlug,
    organizationId,
    userIds,
    currentUser: user.id,
  });

  // Make sure to include the current user
  if (!userIds.includes(user.id)) {
    userIds.push(user.id);
  }

  // Validate inputs
  if (userIds.length < 2) {
    console.log('Not enough recipients selected');
    return encodedRedirect(
      'error',
      `/protected/org/${organizationSlug}`,
      'At least one recipient is required'
    );
  }

  if (!organizationSlug) {
    console.log('Missing organization slug');
    return encodedRedirect('error', `/protected`, 'Organization information is missing');
  }

  console.log('Input validation passed');

  // Sort user IDs to ensure consistency for conversation lookup
  const sortedUserIds = [...userIds].sort();

  // Improved check for an existing conversation with exactly these participants
  // This is crucial to ensure uniqueness - we need to verify that:
  // 1. There's a conversation where all selected users are participants
  // 2. The conversation has exactly the number of participants we're looking for
  // 3. The conversation belongs to the current organization

  // If organization_id wasn't provided in the form, get it from the slug
  console.log('Checking organization ID');
  let orgId = organizationId;

  if (!orgId) {
    console.log(`Organization ID not provided, looking up from slug: ${organizationSlug}`);
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .single();

    if (orgError) {
      console.log('Error fetching organization:', orgError);
      return encodedRedirect('error', `/protected`, 'Organization not found');
    }

    if (!organization) {
      console.log('Organization not found for slug:', organizationSlug);
      return encodedRedirect('error', `/protected`, 'Organization not found');
    }

    orgId = organization.id;
    console.log(`Found organization ID: ${orgId}`);
  } else {
    console.log(`Using provided organization ID: ${orgId}`);
  }

  // First, get all conversations in the current organization
  const { data: orgConversations } = await supabase
    .from('direct_message_conversations')
    .select('id, organization_id')
    .eq('organization_id', orgId);

  if (!orgConversations || orgConversations.length === 0) {
    // No conversations in this org yet, we'll create a new one
    console.log('No existing conversations in this organization');
  } else {
    // Get the conversation IDs from this organization
    const orgConversationIds = orgConversations.map(conv => conv.id);

    // Then, get all participations in these conversations
    const { data: allParticipations } = await supabase
      .from('direct_message_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', orgConversationIds)
      .in('user_id', sortedUserIds);

    if (allParticipations && allParticipations.length > 0) {
      // Group participations by conversation
      const conversationParticipants: Record<string, Set<string>> = {};

      allParticipations.forEach(item => {
        if (!conversationParticipants[item.conversation_id]) {
          conversationParticipants[item.conversation_id] = new Set();
        }
        conversationParticipants[item.conversation_id].add(item.user_id);
      });

      // Find conversations that contain exactly our participants and no others
      for (const [conversationId, participants] of Object.entries(conversationParticipants)) {
        // Must have the exact number of participants
        if (participants.size === sortedUserIds.length) {
          // Check if all our users are in this conversation
          const allUsersIncluded = sortedUserIds.every(userId => participants.has(userId));

          // Verify that this conversation has exactly these participants and no more
          if (allUsersIncluded) {
            const { count: participantCount } = await supabase
              .from('direct_message_participants')
              .select('*', { count: 'exact' })
              .eq('conversation_id', conversationId);

            // Final check - the count must match exactly
            if (participantCount === sortedUserIds.length) {
              console.log(
                'Found existing conversation with exact participants in this org:',
                conversationId
              );
              return redirect(`/protected/org/${organizationSlug}/dm/${conversationId}`);
            }
          }
        }
      }
    }
  }

  console.log('Creating new conversation - no matching conversation found');
  // If no matching conversation exists, create a new one
  console.log(`Creating new DM conversation in organization: ${orgId}`);
  const { data: conversation, error: convError } = await supabase
    .from('direct_message_conversations')
    .insert({
      organization_id: orgId, // Associate the DM with this organization
    })
    .select()
    .single();

  if (convError) {
    console.log('Error creating conversation:', convError);
    return encodedRedirect(
      'error',
      `/protected/org/${organizationSlug}`,
      'Failed to create conversation'
    );
  }

  if (!conversation) {
    console.log('No conversation returned after creation');
    return encodedRedirect(
      'error',
      `/protected/org/${organizationSlug}`,
      'Failed to create conversation - no data returned'
    );
  }

  console.log(`Created conversation with ID: ${conversation.id}`);

  // Add all participants to the conversation
  const participants = sortedUserIds.map(userId => ({
    conversation_id: conversation.id,
    user_id: userId,
  }));

  console.log(`Adding ${participants.length} participants to conversation`);

  const { error: participantError } = await supabase
    .from('direct_message_participants')
    .insert(participants);

  if (participantError) {
    console.error('Failed to add participants:', participantError);
    // Try to clean up the conversation
    console.log(`Cleaning up conversation ${conversation.id} due to participant error`);
    await supabase.from('direct_message_conversations').delete().eq('id', conversation.id);

    return encodedRedirect(
      'error',
      `/protected/org/${organizationSlug}`,
      'Failed to add participants to conversation'
    );
  }

  console.log(
    `Successfully created DM conversation ${conversation.id} with ${participants.length} participants`
  );

  // Construct the redirect URL
  const redirectUrl = `/protected/org/${organizationSlug}/dm/${conversation.id}`;
  console.log(`Redirecting to: ${redirectUrl}`);

  // Redirect to the new DM conversation
  return redirect(redirectUrl);
}
