import { redirect } from 'next/navigation';

import ProfileForm from '@/components/profile-form';
import { createClient } from '@/utils/supabase/server';
import { convertUser } from '@/utils/type-utils';

export default async function ProfilePage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/sign-in');
  }

  // Get user profile data
  const { data: profileData } = await supabase.from('users').select('*').eq('id', user.id).single();

  if (!profileData) {
    return redirect('/sign-in');
  }

  // Convert profile to component format
  const profile = convertUser(profileData);
  if (!profile) {
    return redirect('/sign-in');
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>

      <ProfileForm
        profile={{
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          email: profile.email,
          bio: profile.bio,
          ai_persona_prompt: profile.ai_persona_prompt,
          avatar_url: profile.avatar_url,
        }}
      />
    </div>
  );
}
