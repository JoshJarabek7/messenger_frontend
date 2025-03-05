import { redirect } from 'next/navigation';

import { createClient } from '@/utils/supabase/server';

export default async function Home() {
  // Check if user is authenticated and redirect accordingly
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // User is logged in, redirect to protected area
    redirect('/protected');
  } else {
    // User is not logged in, redirect to sign-in page
    redirect('/sign-in');
  }

  // This won't actually render as we're redirecting
  return null;
}
