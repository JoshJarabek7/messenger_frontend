import { Users, Hash, Info, User, Crown, Plus, Trash2, LogOut } from 'lucide-react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { deleteOrganizationAction, leaveOrganizationAction } from '@/app/actions';
import { CreateChannelDialog } from '@/components/create-channel-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/utils/supabase/server';

interface OrganizationPageProps {
  params: {
    slug: string;
  };
}

type Member = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status?: string | null;
};

export default async function OrganizationPage({ params }: OrganizationPageProps) {
  // You must await Promise params in Nextjs 15
  const promiseResult = await Promise.resolve(params);

  const slug = promiseResult.slug;
  console.log('Organization page - loading slug:', slug);
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/sign-in');
  }

  // Get the current user's details
  const { data: user } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, status')
    .eq('id', authUser.id)
    .single();

  if (!user) {
    redirect('/sign-in');
  }

  // Get the organization
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !organization) {
    redirect('/protected');
  }

  console.log('User accessing organization:', { organizationId: organization.id, userId: user.id });

  // Get the organization owner
  const { data: owner } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, status')
    .eq('id', organization.owner_id)
    .single();

  // Get all users who have interacted with this organization
  const { data: userRecords } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, status')
    .limit(20); // Limit to a reasonable number

  const members: Member[] = userRecords || [];

  // Make sure owner is always included
  if (owner && (!userRecords || !userRecords.some(u => u.id === owner.id))) {
    members.unshift(owner as Member);
  }

  // Count channels
  const { count: channelCount } = await supabase
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id);

  // Get the default (first) channel
  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .eq('organization_id', organization.id)
    .order('name', { ascending: true })
    .limit(1);

  // Only redirect to the first channel if there's a ?redirect=true query param
  // This allows direct access to the org page when clicking on org in sidebar
  const headersList = await Promise.resolve(headers());
  const xUrl = headersList.get('x-url') || '';
  let shouldRedirect = false;

  try {
    if (xUrl) {
      const url = new URL(xUrl);
      shouldRedirect = url.searchParams.get('redirect') === 'true';
    }
  } catch (error) {
    console.error('Invalid URL in headers:', error);
  }

  if (shouldRedirect && channels && channels.length > 0) {
    redirect(`/protected/org/${slug}/channel/${channels[0].slug}`);
  }

  return (
    <div className="w-full max-w-none p-4 flex justify-center items-center">
      <Card className="max-w-3xl shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{organization.name}</CardTitle>
              <CardDescription>
                {organization.description || 'No description provided'}
              </CardDescription>
            </div>
            {organization.avatar_url && (
              <Avatar className="h-16 w-16">
                <AvatarImage src={organization.avatar_url} alt={organization.name} />
                <AvatarFallback>
                  <Users />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center text-sm font-medium">
                <Hash className="mr-2 h-4 w-4" />
                <span>Channels</span>
              </div>
              {channelCount === 0 ? (
                <div className="rounded-md bg-muted p-4 text-sm text-center">
                  <p className="text-muted-foreground mb-3">
                    No channels available. Please create a channel to get started.
                  </p>
                  <CreateChannelDialog
                    organizationId={organization.id}
                    organizationSlug={organization.slug}
                    trigger={
                      <Button variant="secondary" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Channel
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="rounded-md bg-muted p-4 text-sm">
                  <p className="text-muted-foreground mb-3">
                    {channelCount} {channelCount === 1 ? 'channel' : 'channels'} available. Click on
                    a channel in the sidebar to view its content.
                  </p>
                  <div className="flex justify-end">
                    <CreateChannelDialog
                      organizationId={organization.id}
                      organizationSlug={organization.slug}
                      trigger={
                        <Button variant="secondary" size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Channel
                        </Button>
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm font-medium">
                  <Info className="mr-2 h-4 w-4" />
                  <span>Organization Details</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium">{members.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Channels</span>
                  <span className="font-medium">{channelCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(organization.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center text-sm font-medium">
                <User className="mr-2 h-4 w-4" />
                <span>Owner</span>
              </div>
              {owner && (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={owner.avatar_url || ''}
                      alt={owner.display_name || owner.username}
                    />
                    <AvatarFallback>
                      {(owner.display_name || owner.username || '').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{owner.display_name || owner.username}</p>
                    <p className="text-xs text-muted-foreground">@{owner.username}</p>
                  </div>
                  <Crown className="ml-1 h-3 w-3 text-amber-500" />
                </div>
              )}
            </div>

            {members.length > 0 && (
              <>
                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm font-medium">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Members</span>
                    </div>

                    {/* Organization management buttons */}
                    <div>
                      {/* Show different buttons based on whether user is owner */}
                      {organization.owner_id === user.id ? (
                        <form
                          action={async () => {
                            'use server';
                            console.log('Form submitted - deleting organization:', organization.id);
                            const result = await deleteOrganizationAction(organization.id, user.id);
                            console.log('Delete organization result:', result);

                            // Force redirect regardless of result
                            redirect('/protected');
                          }}
                        >
                          <Button type="submit" variant="destructive" size="sm">
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </form>
                      ) : (
                        <form
                          action={async () => {
                            'use server';
                            const result = await leaveOrganizationAction(organization.id, user.id);
                            if (result.success && result.redirect) {
                              redirect(result.redirect);
                            }
                          }}
                        >
                          <Button type="submit" variant="outline" size="sm">
                            <LogOut className="mr-1 h-3 w-3" />
                            Leave
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {members.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center space-x-2 rounded-md border p-2"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={member.avatar_url || ''}
                            alt={member.display_name || member.username}
                          />
                          <AvatarFallback>
                            {(member.display_name || member.username || '')
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">
                          {member.display_name || member.username}
                        </span>
                        {member.id === organization.owner_id && (
                          <Crown className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
