'use client';

import React, { useState, useTransition, useRef } from 'react';
import { Hash } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { checkChannelSlugAction } from '@/app/actions';

interface CreateChannelDialogProps {
  organizationId: string;
  organizationSlug: string;
  trigger?: React.ReactNode;
}

export function CreateChannelDialog({
  organizationId,
  organizationSlug,
  trigger,
}: CreateChannelDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Use a ref to keep track of the timeout for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    // Auto-generate slug from name
    const generatedSlug = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setSlug(generatedSlug);

    // Clear any existing validation errors immediately when typing
    setSlugError(null);

    // Clear previous timeout if it exists
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timeout to validate after typing stops
    if (generatedSlug && generatedSlug.length >= 2) {
      // Show optimistic UI - mark as potentially available while we check
      setSlugAvailable(true);

      // Debounce the validation
      debounceTimerRef.current = setTimeout(() => {
        validateSlug(generatedSlug);
      }, 500);
    } else if (!generatedSlug) {
      setSlugAvailable(null);
      setSlugError(null);
    } else {
      setSlugAvailable(null);
      setSlugError('Slug must be at least 2 characters');
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSlug(value);

    // Clear any existing validation errors immediately when typing
    setSlugError(null);

    // Clear previous timeout if it exists
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timeout to validate after typing stops
    if (value && value.length >= 2) {
      // Show optimistic UI - mark as potentially available while we check
      setSlugAvailable(true);

      // Debounce the validation
      debounceTimerRef.current = setTimeout(() => {
        validateSlug(value);
      }, 500);
    } else if (!value) {
      setSlugAvailable(null);
      setSlugError(null);
    } else {
      setSlugAvailable(null);
      setSlugError('Slug must be at least 2 characters');
    }
  };

  // Debounced validation function to avoid frequent API calls
  const validateSlug = (value: string) => {
    // Clear previous validation state
    setSlugAvailable(null);
    setSlugError(null);

    // Basic client-side validation
    if (!value || value.length < 2) {
      setSlugError('Slug must be at least 2 characters');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(value)) {
      setSlugError('Slug can only contain letters, numbers, and hyphens');
      return;
    }

    // Store the current slug to prevent race conditions
    const currentSlug = value;

    // Since the input passed basic validation, consider it temporarily available
    // This improves UX by not showing errors while typing
    setSlugAvailable(true);

    // Debounce the actual server check
    startTransition(async () => {
      try {
        console.log(`Checking slug: ${currentSlug}`);
        const result = await checkChannelSlugAction(organizationId, currentSlug);

        // Only update if this is still the current slug (avoid race conditions)
        if (slug === currentSlug) {
          console.log(`Slug check result for ${currentSlug}:`, result);
          setSlugAvailable(result.available);
          setSlugError(result.available ? null : 'Channel URL already taken');
        }
      } catch (error) {
        console.error(`Error checking slug ${currentSlug}:`, error);
        // In case of error, assume it's available and let server validation catch any issues
        if (slug === currentSlug) {
          setSlugAvailable(true);
          setSlugError(null);
        }
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Create Channel</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form
          action={`/protected/org/${organizationSlug}/channel/create`}
          method="POST"
          onSubmit={handleSubmit}
        >
          <DialogHeader>
            <DialogTitle>Create a new channel</DialogTitle>
            <DialogDescription>
              Channels are where your team communicates. They&apos;re best organized around a topic
              — #marketing, for example.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="col-span-4">
                Channel name
              </Label>
              <div className="col-span-4 flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="marketing"
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="slug" className="col-span-4">
                Channel URL
                {slug && (
                  <span
                    className={cn(
                      'ml-2 text-xs',
                      slugAvailable === true
                        ? 'text-green-600'
                        : slugAvailable === false
                          ? 'text-red-600'
                          : ''
                    )}
                  >
                    {isPending ? 'Checking...' : slugAvailable === true ? '✓ Available' : slugError}
                  </span>
                )}
              </Label>
              <div className="col-span-4 flex items-center gap-1">
                <span className="text-muted-foreground">/</span>
                <Input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="marketing"
                  className={cn(
                    slug &&
                      (slugAvailable === true
                        ? 'border-green-600'
                        : slugAvailable === false
                          ? 'border-red-600'
                          : '')
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="col-span-4">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What's this channel about?"
                className="col-span-4"
              />
            </div>
            <input type="hidden" name="organization_id" value={organizationId} />
            <input type="hidden" name="organization_slug" value={organizationSlug} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name || !slug || slugAvailable !== true}>
              Create Channel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
