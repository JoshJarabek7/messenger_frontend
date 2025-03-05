import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import JoinOrganizationForm from '@/components/join-organization-form';
import { generateOrganizationEmbeddingsServer } from '@/utils/server-utils';
import { createClient } from '@/utils/supabase/server';
import { convertOrganizations } from '@/utils/type-utils';

export default async function JoinOrganizationPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/sign-in');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('id, username, display_name')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return redirect('/sign-in');
  }

  // Get public organizations the user is not part of
  const { data: userMemberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id);

  const excludedOrgIds = userMemberships?.map(m => m.organization_id) || [];

  // Get all organizations - don't exclude organizations the user is already part of
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*') // Get all fields
    .order('created_at', { ascending: false });

  // Mark organizations where the user is already a member
  const orgsWithMembership =
    organizations?.map(org => {
      const isMember = excludedOrgIds.includes(org.id);
      return {
        ...org,
        isMember,
      };
    }) || [];

  // Check if organizations have embeddings, if not, generate them
  if (organizations && organizations.length > 0) {
    const { data: existingEmbeddings } = await supabase
      .from('organization_embeddings')
      .select('organization_id')
      .in(
        'organization_id',
        organizations.map(org => org.id)
      );

    const orgIdsWithEmbeddings = existingEmbeddings?.map(e => e.organization_id) || [];

    // For each organization without an embedding, generate one
    for (const org of organizations) {
      if (!orgIdsWithEmbeddings.includes(org.id)) {
        console.log(`Generating embedding for organization: ${org.name} (${org.id})`);
        // This will run in the background - no need to await
        // Create content text that combines name and description for better search
        const contentText = [org.name, org.description || ''].filter(Boolean).join('\n\n');

        generateOrganizationEmbeddingsServer(org.id, contentText);
      }
    }
  }

  // Handle org parameter in URL - use await to resolve headers promise
  const headersList = await Promise.resolve(headers());
  const xUrl = headersList.get('x-url') || 'http://localhost';
  const { searchParams } = new URL(xUrl);
  const orgSlug = searchParams.get('org');

  // If org is specified in URL, try to get it
  let redirectOrg = null;
  if (orgSlug) {
    const { data: requestedOrg } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', orgSlug)
      .maybeSingle();

    if (requestedOrg) {
      redirectOrg = requestedOrg;
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Join an Organization</h1>
        {redirectOrg ? (
          <div className="bg-accent p-4 rounded-md mb-4">
            <p className="font-medium">
              You need to join &quot;{redirectOrg.name}&quot; to access it
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Discover and join public organizations on ChatGenius. You can search for specific
            organizations or browse the list below.
          </p>
        )}
      </div>

      <JoinOrganizationForm
        organizations={convertOrganizations(orgsWithMembership || [])}
        userId={profile.id}
        highlightOrgSlug={orgSlug || undefined}
      />
    </div>
  );
}
