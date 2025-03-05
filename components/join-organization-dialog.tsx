'use client';

import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import JoinOrganizationForm from '@/components/join-organization-form';
import { createClient } from '@/utils/supabase/client';
import { useEffect } from 'react';

interface JoinOrganizationDialogProps {
  trigger?: React.ReactNode;
  userId: string;
}

export function JoinOrganizationDialog({ trigger, userId }: JoinOrganizationDialogProps) {
  const [open, setOpen] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch organizations when dialog opens
  useEffect(() => {
    if (open) {
      fetchOrganizations();
    }
  }, [open, userId]);

  // Generate embeddings for organizations
  const checkAndGenerateEmbeddings = async (organizations: any[]) => {
    try {
      const supabase = createClient();

      if (organizations && organizations.length > 0) {
        // Get existing embeddings
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

            // Create content text that combines name and description for better search
            const contentText = [org.name, org.description || ''].filter(Boolean).join('\n\n');

            // Call the embedding generation API
            try {
              // Format the text to better match search inputs
              const orgKeywords = org.name.split(/\s+/);

              // Build a structured text for embedding
              const formattedContent = `${org.name} ${org.name} ${org.name}
Organization: ${org.name} ${org.name}
Organization Name: ${org.name} ${org.name}
Name: ${org.name} ${org.name}
Company: ${org.name}
Business: ${org.name}
Title: ${org.name}
Brand: ${org.name}
Organization: ${orgKeywords.join(' ')}
Name: ${orgKeywords.join(' ')}
Company: ${orgKeywords.join(' ')}
${orgKeywords.map((word: string) => `${word} ${word} ${word}`).join('\n')}
Keywords: ${orgKeywords.join(', ')}
Description: ${org.description || `Organization called ${org.name}`}
About: ${org.description || org.name}
Additional Information: ${org.name} organization`;

              // Get the base URL from window.location in the browser
              const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

              const response = await fetch(`${baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: formattedContent,
                  type: 'organization',
                  organizationId: org.id,
                }),
              });

              if (!response.ok) {
                console.error(
                  `Failed to generate embedding for organization ${org.name}:`,
                  await response.text()
                );
              }
            } catch (err) {
              console.error(`Error generating embedding for organization ${org.name}:`, err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking and generating embeddings:', error);
    }
  };

  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // Get user memberships
      const { data: userMemberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId);

      const excludedOrgIds = userMemberships?.map(m => m.organization_id) || [];

      // Get all organizations
      const { data: organizations } = await supabase
        .from('organizations')
        .select('id, name, slug, description, avatar_url, owner_id')
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

      setOrganizations(orgsWithMembership);

      // Check and generate embeddings for organizations without them
      if (orgsWithMembership.length > 0) {
        checkAndGenerateEmbeddings(orgsWithMembership);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Callback function for the join form to close the dialog when done
  const handleJoinComplete = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="mr-2 h-4 w-4" />
            Join Organization
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Join an Organization</DialogTitle>
          <DialogDescription>
            Discover and join public organizations on ChatGenius. You can search for specific
            organizations or browse the list below.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <JoinOrganizationForm
            organizations={organizations}
            userId={userId}
            onJoinComplete={handleJoinComplete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
