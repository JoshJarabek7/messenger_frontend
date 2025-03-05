import { redirect } from 'next/navigation';

import ShadcnSidebar from '@/components/shadcn-sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { User } from '@/types/app';
import { Database } from '@/types/supabase';
import { createClient } from '@/utils/supabase/server';
import { convertUser, convertOrganizations } from '@/utils/type-utils';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/sign-in');
  }

  // Get user profile data
  const { data: profile } = (await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()) as { data: Database['public']['Tables']['users']['Row'] | null };

  // Get all organizations where user has access (both as owner and member)
  let organizations: Database['public']['Tables']['organizations']['Row'][] = [];

  try {
    // Get organizations the user owns directly
    const { data: ownedOrgs } = (await supabase
      .from('organizations')
      .select('id, name, slug, description, avatar_url')
      .eq('owner_id', user.id)) as {
      data: Database['public']['Tables']['organizations']['Row'][] | null;
    };

    // Get organizations where user is a member
    const { data: memberOrgs } = await supabase
      .from('organization_members')
      .select(
        `
        organization:organizations(id, name, slug, description, avatar_url)
      `
      )
      .eq('user_id', user.id);

    // Combine both sets of organizations
    const ownedOrgsArray = ownedOrgs || [];
    const memberOrgsArray =
      memberOrgs
        ?.map(item => {
          return item.organization as Database['public']['Tables']['organizations']['Row'];
        })
        .filter(Boolean) || [];

    // Remove duplicates (in case user is both owner and explicitly listed as member)
    const orgMap = new Map();

    // Add member organizations to map
    memberOrgsArray.forEach(org => {
      if (org && org.id) {
        orgMap.set(org.id, org);
      }
    });

    // Add owned organizations to map (will overwrite duplicates)
    ownedOrgsArray.forEach(org => {
      if (org && org.id) {
        orgMap.set(org.id, org);
      }
    });

    // Convert map values to array
    organizations = Array.from(orgMap.values());
  } catch (error) {
    console.error('Error fetching organizations:', error);
  }

  // Make sure we have user profile data
  const userProfile: Database['public']['Tables']['users']['Row'] = profile || {
    id: user.id,
    username: user.email?.split('@')[0] || 'user',
    display_name: null,
    avatar_url: null,
    status: 'online',
    ai_persona_prompt: null,
    bio: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    email: user.email || '',
    last_seen: new Date().toISOString(),
  };

  // Redirect to the first organization if user is part of any
  if (organizations.length > 0) {
    // Optional: redirect to first organization
    // Uncomment the next line if you want to auto-redirect
    // return redirect(`/protected/org/${organizations[0].slug}`);
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background w-full">
        <ShadcnSidebar
          user={
            convertUser(userProfile) || {
              id: userProfile.id,
              username: userProfile.username,
              email: userProfile.email,
              display_name: userProfile.display_name ?? undefined,
              avatar_url: userProfile.avatar_url ?? undefined,
              status: userProfile.status as User['status'],
            }
          }
          currentOrganization={{
            id: 'placeholder',
            name: 'Home',
            slug: '',
            owner_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            avatar_url: undefined,
            description: undefined,
          }}
          organizations={convertOrganizations(organizations || [])}
          channels={[]}
          directMessages={[]}
        />

        <SidebarInset className="p-0">
          <div className="h-full flex flex-col w-full">
            <div className="p-2">
              <SidebarTrigger />
            </div>
            <main className="flex-1 overflow-auto h-screen w-full">
              {organizations.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center p-8">
                  <Card className="max-w-md shadow-md">
                    <CardHeader>
                      <CardTitle className="text-xl text-center">Welcome to ChatGenius</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-muted-foreground">
                      <p>
                        Use the sidebar to create a new organization or join an existing one to get
                        started.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center p-8 text-center text-muted-foreground">
                  <p>Select an organization from the sidebar to get started</p>
                </div>
              )}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
