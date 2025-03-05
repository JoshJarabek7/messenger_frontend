'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { convertOrganizations } from '@/utils/type-utils';
import { Organization } from '@/types/app';
import { Database } from '@/types/supabase';

// Organization interface is now imported from @/types/app

interface JoinOrganizationFormProps {
  organizations: Organization[];
  userId: string;
  highlightOrgSlug?: string;
  onJoinComplete?: () => void;
}

export default function JoinOrganizationForm({
  organizations: initialOrganizations,
  userId,
  highlightOrgSlug,
  onJoinComplete,
}: JoinOrganizationFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  // No need for client-side filtering when using vector search
  // Only filter if organizations were not already set by vector search
  const filteredOrganizations = organizations;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // Set loading state
    setIsSearching(true);

    // Initialize Supabase client
    const supabase = createClient();

    try {
      if (!searchQuery.trim()) {
        // If search is empty, reset to initial organizations
        console.log('Search cleared, resetting to initial organizations:', initialOrganizations);
        setOrganizations(initialOrganizations);
        setIsSearching(false);
        return;
      }

      // Clear current results before starting a new search
      setOrganizations([]);

      // Perform semantic search using vector embeddings
      const supabase = createClient();

      try {
        // First, get embedding for the search query
        console.log('Generating embedding for search query:', searchQuery);

        // Extract search query parts for better matching
        const queryParts = searchQuery.split(/\s+/);

        // Create extremely keyword-heavy search query
        // Repeat the exact search query many times for very strong exact match
        const exactSearchQuery = Array(10).fill(searchQuery).join(' ');

        // Add individual words with repetition - 5x for each word
        const individualWords = [];
        for (const part of queryParts) {
          individualWords.push(...Array(5).fill(part));
        }

        // Build list of all variations for keywords
        const queryKeywords = [
          ...Array(5).fill(searchQuery), // Full query repeated
          ...individualWords, // Individual words repeated 5x
          queryParts.join(' '), // Space-separated
          queryParts.join(', '), // Comma-separated
          queryParts.join('-'), // Hyphen-separated
          ...queryParts, // Individual words once more
        ];

        // Format the search query to exactly mirror organization embeddings
        // with heavy repetition of search terms
        const formattedQuery = `${exactSearchQuery}
Organization: ${searchQuery} ${searchQuery} ${searchQuery}
Organization Name: ${searchQuery} ${searchQuery} ${searchQuery}
Name: ${searchQuery} ${searchQuery} ${searchQuery}
Company: ${searchQuery} ${searchQuery} ${searchQuery}
Business: ${searchQuery} ${searchQuery}
Title: ${searchQuery} ${searchQuery}
Brand: ${searchQuery} ${searchQuery}
Organization: ${queryParts.join(' ')} ${queryParts.join(' ')}
Name: ${queryParts.join(' ')} ${queryParts.join(' ')}
Company: ${queryParts.join(' ')} ${queryParts.join(' ')}
${queryParts.map(p => `${p} ${p} ${p} ${p} ${p}`).join('\n')}
Keywords: ${queryKeywords.join(', ')}
Description: Organization called ${searchQuery}
About: ${searchQuery}
Additional Information: ${searchQuery} organization
Context: Searching for ${searchQuery} organization`;

        console.log('Using formatted query for better semantic matching:', formattedQuery);

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
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to generate embedding for search query:', errorText);
          // Make error visible to user
          toast.error(`Vector search failed: ${errorText}. Check API key.`);
          // Fall back to text search
          console.log('Falling back to text search');
          const { data: textMatchOrgs } = await supabase
            .from('organizations')
            .select('*')
            .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

          setOrganizations(convertOrganizations(textMatchOrgs || []));
          return;
        }

        const result = await response.json();
        const embedding = result.embedding;

        if (!embedding || embedding.length !== 1536) {
          console.error('Invalid embedding received:', embedding);
          // Make error visible to user
          toast.error(`Vector search failed: Invalid embedding format. Check console for details.`);
          // Fall back to text search
          console.log('Invalid embedding, falling back to text search');
          const { data: textMatchOrgs } = await supabase
            .from('organizations')
            .select('*')
            .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

          setOrganizations(convertOrganizations(textMatchOrgs || []));
          return;
        }

        // Use the embedding to perform a similarity search in Supabase
        // This uses pgvector's cosine similarity operator (<=>)
        console.log('Searching organizations with embedding...');
        const { data: matchingOrgs, error } = await supabase.rpc('search_organizations', {
          query_embedding: embedding, // the embedding from our search query
          similarity_threshold: 0.3, // lower threshold for more matches
          match_count: 20, // return up to 20 matches
        });

        console.log(
          'Vector search similarity scores:',
          matchingOrgs?.map((org: any) => `${org.id}: ${(org.similarity * 100).toFixed(1)}%`)
        );

        console.log('Search results:', matchingOrgs);

        if (error) {
          console.error('Vector search error:', error);
          // Show detailed error to user
          toast.error(`Vector search failed: ${error.message || error}`);
          throw error;
        }

        // This block is now inside the try, where matchingOrgs is in scope
        if (matchingOrgs && matchingOrgs.length > 0) {
          console.log(
            `Found ${matchingOrgs.length} organizations with vector search. Fetching details...`
          );

          // Get IDs of all matching organizations
          const matchingIds = matchingOrgs.map((org: { id: string }) => org.id);
          console.log('Matching organization IDs:', matchingIds);

          // Get full organization details for the matching IDs
          const { data: foundOrganizations, error: fetchError } = await supabase
            .from('organizations')
            .select('*')
            .in('id', matchingIds);

          if (fetchError) {
            console.error('Error fetching organization details:', fetchError);
            toast.error(`Failed to fetch organization details: ${fetchError.message}`);
            return;
          }

          console.log('Fetched organization details:', foundOrganizations);

          // Check if we successfully fetched organizations
          if (!foundOrganizations || foundOrganizations.length === 0) {
            console.error('No organizations found despite vector search results');
            toast.error("Found matches but couldn't retrieve organization details");
            return;
          }

          // Check if user is already a member of any organizations
          const { data: memberships } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', userId);

          // Mark organizations with membership status and add similarity scores
          const orgsWithMembership = foundOrganizations.map(org => {
            // Find the matching org with similarity score
            const matchingOrg = matchingOrgs.find((match: any) => match.id === org.id);
            let similarity = matchingOrg ? matchingOrg.similarity : 0;

            // Apply exact text match boost
            const lowerSearchQuery = searchQuery.trim().toLowerCase();
            const lowerOrgName = org.name.trim().toLowerCase();

            // Boost exact matches to 100%
            if (lowerOrgName === lowerSearchQuery) {
              similarity = 1.0;
              console.log(`Exact match found for "${org.name}"! Boosting similarity to 100%`);
            }
            // Boost partial matches where search is part of name
            else if (lowerOrgName.includes(lowerSearchQuery)) {
              const newScore = Math.max(similarity, 0.85);
              console.log(
                `Search term "${searchQuery}" found in "${org.name}"! Boosting similarity from ${(similarity * 100).toFixed(0)}% to ${(newScore * 100).toFixed(0)}%`
              );
              similarity = newScore;
            }
            // Boost partial matches where name is part of search
            else if (lowerSearchQuery.includes(lowerOrgName)) {
              const newScore = Math.max(similarity, 0.8);
              console.log(
                `Organization name "${org.name}" found in search term "${searchQuery}"! Boosting similarity from ${(similarity * 100).toFixed(0)}% to ${(newScore * 100).toFixed(0)}%`
              );
              similarity = newScore;
            }
            // Boost word-level matches
            else {
              const orgNameWords = lowerOrgName.split(/\s+/);
              const searchQueryWords = lowerSearchQuery.split(/\s+/);

              const matchingWords = searchQueryWords.filter(word =>
                orgNameWords.some(
                  orgWord => orgWord === word || orgWord.includes(word) || word.includes(orgWord)
                )
              );

              if (matchingWords.length > 0) {
                // Calculate word match percentage
                const matchPercentage =
                  matchingWords.length / Math.max(orgNameWords.length, searchQueryWords.length);
                const wordBoostFactor = 0.7 + 0.3 * matchPercentage; // Between 0.7 and 1.0
                const newScore = Math.max(similarity, wordBoostFactor);

                console.log(
                  `Found ${matchingWords.length} matching words between "${org.name}" and "${searchQuery}"! Boosting similarity from ${(similarity * 100).toFixed(0)}% to ${(newScore * 100).toFixed(0)}%`
                );
                similarity = newScore;
              }
            }

            return {
              ...org,
              isMember: memberships?.some(m => m.organization_id === org.id) || false,
              similarity: similarity, // Add similarity score to the org object
              similarityPercent: `${(similarity * 100).toFixed(0)}%`, // Add formatted percentage
            };
          });

          // Sort organizations by similarity score (highest first)
          const sortedOrgs = [...orgsWithMembership].sort(
            (a, b) => (b.similarity || 0) - (a.similarity || 0)
          );

          console.log(
            'Setting organizations with membership info (sorted by similarity):',
            sortedOrgs
          );
          setOrganizations(convertOrganizations(sortedOrgs || []));
        } else {
          console.log('No vector search matches, falling back to text search');
          // No semantic matches, fall back to basic text search
          const { data: textMatchOrgs } = await supabase
            .from('organizations')
            .select('*')
            .or(
              `name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
            );

          // Check if user is already a member of any organizations
          const { data: memberships } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', userId);

          // Mark organizations with membership status and add text-match similarity scores
          const orgsWithMembership = textMatchOrgs?.map(org => {
            let similarity = 0.5; // Default similarity for text matches

            // Apply exact text match boost just like in vector results
            const lowerSearchQuery = searchQuery.trim().toLowerCase();
            const lowerOrgName = org.name.trim().toLowerCase();

            // Boost exact matches to 100%
            if (lowerOrgName === lowerSearchQuery) {
              similarity = 1.0;
              console.log(`Exact text match found for "${org.name}"! Setting similarity to 100%`);
            }
            // Boost partial matches where search is part of name
            else if (lowerOrgName.includes(lowerSearchQuery)) {
              similarity = 0.85;
              console.log(
                `Search term "${searchQuery}" found in "${org.name}"! Setting similarity to 85%`
              );
            }
            // Boost partial matches where name is part of search
            else if (lowerSearchQuery.includes(lowerOrgName)) {
              similarity = 0.8;
              console.log(
                `Organization name "${org.name}" found in search term "${searchQuery}"! Setting similarity to 80%`
              );
            }
            // Word-level matches
            else {
              const orgNameWords = lowerOrgName.split(/\s+/);
              const searchQueryWords = lowerSearchQuery.split(/\s+/);

              const matchingWords = searchQueryWords.filter(word =>
                orgNameWords.some(
                  orgWord => orgWord === word || orgWord.includes(word) || word.includes(orgWord)
                )
              );

              if (matchingWords.length > 0) {
                // Calculate word match percentage
                const matchPercentage =
                  matchingWords.length / Math.max(orgNameWords.length, searchQueryWords.length);
                similarity = 0.7 + 0.3 * matchPercentage; // Between 0.7 and 1.0
                console.log(
                  `Found ${matchingWords.length} matching words between "${org.name}" and "${searchQuery}"! Setting similarity to ${(similarity * 100).toFixed(0)}%`
                );
              }
            }

            return {
              ...org,
              isMember: memberships?.some(m => m.organization_id === org.id) || false,
              similarity: similarity,
              similarityPercent: `${(similarity * 100).toFixed(0)}%`,
            };
          });

          // Sort by similarity score
          const sortedOrgs = [...(orgsWithMembership || [])].sort(
            (a, b) => (b.similarity || 0) - (a.similarity || 0)
          );

          console.log('Setting organizations with membership info (text search):', sortedOrgs);
          setOrganizations(convertOrganizations(sortedOrgs || []));
        }
      } catch (err) {
        console.error('Error during vector search:', err);
        toast.error(`Vector search error: ${err instanceof Error ? err.message : String(err)}`);
        // Fall back to text search
        console.log('Error during vector search, falling back to text search');
        const { data: textMatchOrgs } = await supabase
          .from('organizations')
          .select('*')
          .or(
            `name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
          );

        // Check if user is already a member of any organizations
        const { data: memberships } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', userId);

        // Mark organizations with membership status and add text-match similarity scores
        const orgsWithMembership = textMatchOrgs?.map(org => {
          let similarity = 0.5; // Default similarity for text matches

          // Apply exact text match boost just like in vector results
          const lowerSearchQuery = searchQuery.trim().toLowerCase();
          const lowerOrgName = org.name.trim().toLowerCase();

          // Boost exact matches to 100%
          if (lowerOrgName === lowerSearchQuery) {
            similarity = 1.0;
            console.log(`Exact text match found for "${org.name}"! Setting similarity to 100%`);
          }
          // Boost partial matches where search is part of name
          else if (lowerOrgName.includes(lowerSearchQuery)) {
            similarity = 0.85;
            console.log(
              `Search term "${searchQuery}" found in "${org.name}"! Setting similarity to 85%`
            );
          }
          // Boost partial matches where name is part of search
          else if (lowerSearchQuery.includes(lowerOrgName)) {
            similarity = 0.8;
            console.log(
              `Organization name "${org.name}" found in search term "${searchQuery}"! Setting similarity to 80%`
            );
          }
          // Word-level matches
          else {
            const orgNameWords = lowerOrgName.split(/\s+/);
            const searchQueryWords = lowerSearchQuery.split(/\s+/);

            const matchingWords = searchQueryWords.filter(word =>
              orgNameWords.some(
                orgWord => orgWord === word || orgWord.includes(word) || word.includes(orgWord)
              )
            );

            if (matchingWords.length > 0) {
              // Calculate word match percentage
              const matchPercentage =
                matchingWords.length / Math.max(orgNameWords.length, searchQueryWords.length);
              similarity = 0.7 + 0.3 * matchPercentage; // Between 0.7 and 1.0
              console.log(
                `Found ${matchingWords.length} matching words between "${org.name}" and "${searchQuery}"! Setting similarity to ${(similarity * 100).toFixed(0)}%`
              );
            }
          }

          return {
            ...org,
            isMember: memberships?.some(m => m.organization_id === org.id) || false,
            similarity: similarity,
            similarityPercent: `${(similarity * 100).toFixed(0)}%`,
          };
        });

        // Sort by similarity score
        const sortedOrgs = [...(orgsWithMembership || [])].sort(
          (a, b) => (b.similarity || 0) - (a.similarity || 0)
        );

        console.log('Setting organizations with membership info (after error):', sortedOrgs);
        setOrganizations(convertOrganizations(sortedOrgs || []));
        return;
      }
    } catch (error) {
      console.error('Error in organization search:', error);
      toast.error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);

      try {
        // Attempt a direct database search as last resort
        const { data: textMatchOrgs } = await supabase
          .from('organizations')
          .select('*')
          .or(
            `name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
          );

        // Check if user is already a member of any organizations
        const { data: memberships } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', userId);

        // Mark organizations with membership status and add text-match similarity scores
        const orgsWithMembership = textMatchOrgs?.map(org => {
          let similarity = 0.5; // Default similarity for text matches

          // Apply exact text match boost just like in vector results
          const lowerSearchQuery = searchQuery.trim().toLowerCase();
          const lowerOrgName = org.name.trim().toLowerCase();

          // Boost exact matches to 100%
          if (lowerOrgName === lowerSearchQuery) {
            similarity = 1.0;
            console.log(`Exact text match found for "${org.name}"! Setting similarity to 100%`);
          }
          // Boost partial matches where search is part of name
          else if (lowerOrgName.includes(lowerSearchQuery)) {
            similarity = 0.85;
            console.log(
              `Search term "${searchQuery}" found in "${org.name}"! Setting similarity to 85%`
            );
          }
          // Boost partial matches where name is part of search
          else if (lowerSearchQuery.includes(lowerOrgName)) {
            similarity = 0.8;
            console.log(
              `Organization name "${org.name}" found in search term "${searchQuery}"! Setting similarity to 80%`
            );
          }
          // Word-level matches
          else {
            const orgNameWords = lowerOrgName.split(/\s+/);
            const searchQueryWords = lowerSearchQuery.split(/\s+/);

            const matchingWords = searchQueryWords.filter(word =>
              orgNameWords.some(
                orgWord => orgWord === word || orgWord.includes(word) || word.includes(orgWord)
              )
            );

            if (matchingWords.length > 0) {
              // Calculate word match percentage
              const matchPercentage =
                matchingWords.length / Math.max(orgNameWords.length, searchQueryWords.length);
              similarity = 0.7 + 0.3 * matchPercentage; // Between 0.7 and 1.0
              console.log(
                `Found ${matchingWords.length} matching words between "${org.name}" and "${searchQuery}"! Setting similarity to ${(similarity * 100).toFixed(0)}%`
              );
            }
          }

          return {
            ...org,
            isMember: memberships?.some(m => m.organization_id === org.id) || false,
            similarity: similarity,
            similarityPercent: `${(similarity * 100).toFixed(0)}%`,
          };
        });

        // Sort by similarity score
        const sortedOrgs = [...(orgsWithMembership || [])].sort(
          (a, b) => (b.similarity || 0) - (a.similarity || 0)
        );

        console.log('Setting organizations from direct database search:', sortedOrgs);
        setOrganizations(convertOrganizations(sortedOrgs || []));
      } catch (finalError) {
        // As absolute last resort, filter the initial organizations
        console.error('Final fallback search error:', finalError);

        // Get membership info for initial organizations
        try {
          const { data: memberships } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', userId);

          const filteredOrgs = initialOrganizations.filter(
            org =>
              org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (org.description && org.description.toLowerCase().includes(searchQuery.toLowerCase()))
          );

          // Apply same text-matching logic to add similarity scores
          const filteredWithMembership = filteredOrgs
            .map(org => {
              let similarity = 0.5; // Default similarity for text matches

              // Apply exact text match boost
              const lowerSearchQuery = searchQuery.trim().toLowerCase();
              const lowerOrgName = org.name.trim().toLowerCase();

              // Boost exact matches to 100%
              if (lowerOrgName === lowerSearchQuery) {
                similarity = 1.0;
              }
              // Boost partial matches where search is part of name
              else if (lowerOrgName.includes(lowerSearchQuery)) {
                similarity = 0.85;
              }
              // Boost partial matches where name is part of search
              else if (lowerSearchQuery.includes(lowerOrgName)) {
                similarity = 0.8;
              }
              // Word-level matches
              else {
                const orgNameWords = lowerOrgName.split(/\s+/);
                const searchQueryWords = lowerSearchQuery.split(/\s+/);

                const matchingWords = searchQueryWords.filter(word =>
                  orgNameWords.some(
                    orgWord => orgWord === word || orgWord.includes(word) || word.includes(orgWord)
                  )
                );

                if (matchingWords.length > 0) {
                  // Calculate word match percentage
                  const matchPercentage =
                    matchingWords.length / Math.max(orgNameWords.length, searchQueryWords.length);
                  similarity = 0.7 + 0.3 * matchPercentage; // Between 0.7 and 1.0
                }
              }

              return {
                ...org,
                isMember: memberships?.some(m => m.organization_id === org.id) || false,
                similarity: similarity,
                similarityPercent: `${(similarity * 100).toFixed(0)}%`,
              };
            })
            // Sort by similarity
            .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

          setOrganizations(filteredWithMembership);
        } catch {
          // If even that fails, just filter the initial orgs without membership info
          const filteredOrgs = initialOrganizations
            .filter(
              org =>
                org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (org.description &&
                  org.description.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .map(org => {
              // Simple exact match detection
              const lowerSearchQuery = searchQuery.trim().toLowerCase();
              const lowerOrgName = org.name.trim().toLowerCase();
              let similarity = 0.5;

              if (lowerOrgName === lowerSearchQuery) {
                similarity = 1.0;
              }

              return {
                ...org,
                similarity,
                similarityPercent: `${(similarity * 100).toFixed(0)}%`,
              };
            })
            .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

          setOrganizations(filteredOrgs);
        }

        toast.error('All search methods failed. Showing basic filtered results.');
      }
    } finally {
      // Always reset the loading state
      setIsSearching(false);
    }
  };

  const handleJoin = async (orgId: string, orgSlug: string) => {
    setIsLoading(orgId);

    try {
      const supabase = createClient();

      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .single();

      if (existingMembership) {
        // User is already a member, redirect to the organization
        router.push(`/protected/org/${orgSlug}`);
        return;
      }

      // Add user as a member
      const { error } = await supabase.from('organization_members').insert({
        organization_id: orgId,
        user_id: userId,
        role: 'member',
      });

      if (error) {
        throw error;
      }

      // No need to join channels anymore - all users can access all channels

      toast.success(`You've joined ${orgSlug} successfully!`);

      // Call onJoinComplete callback if provided
      if (onJoinComplete) {
        onJoinComplete();
      }

      // Redirect to the organization page
      router.push(`/protected/org/${orgSlug}`);
    } catch (error: any) {
      console.error('Error joining organization:', error);
      toast.error(`Failed to join organization: ${error.message}`);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search organizations..."
            className="pl-8"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </form>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">
            {searchQuery ? 'Search Results' : 'Available Organizations'}
          </h2>
          {searchQuery &&
            filteredOrganizations.length > 0 &&
            filteredOrganizations[0].similarity && (
              <p className="text-sm text-muted-foreground mt-1">
                Showing organizations ranked by text similarity and semantic relevance
              </p>
            )}
        </div>

        {isSearching ? (
          <div className="text-center py-8 border rounded-md">
            <p className="text-muted-foreground mb-4">Searching organizations...</p>
            <div className="flex justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="text-center py-8 border rounded-md">
            <p className="text-muted-foreground">
              No organizations found. Try a different search or create your own organization.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/protected')}>
              Create Organization
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredOrganizations.map(org => (
              <div
                key={org.id}
                className={`border rounded-md p-4 transition-colors ${
                  highlightOrgSlug === org.slug
                    ? 'border-primary border-2 bg-accent/30'
                    : 'hover:border-primary'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium">{org.name}</h3>
                  {org.similarity !== undefined && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      ${
                        org.similarity >= 0.8
                          ? 'bg-green-100 text-green-800'
                          : org.similarity >= 0.65
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {org.similarityPercent} match
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{org.slug}</p>
                {org.description && <p className="mt-2 text-sm line-clamp-2">{org.description}</p>}
                <div className="mt-4 flex justify-end">
                  {org.isMember ? (
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/protected/org/${org.slug}`)}
                    >
                      Open
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleJoin(org.id, org.slug)}
                      disabled={isLoading === org.id}
                    >
                      {isLoading === org.id ? 'Joining...' : 'Join'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
