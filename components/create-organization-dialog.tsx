'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
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

interface CreateOrganizationDialogProps {
  trigger?: React.ReactNode;
}

export function CreateOrganizationDialog({ trigger }: CreateOrganizationDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    // Auto-generate slug from name
    const generatedSlug = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setSlug(generatedSlug);
  };

  const handleSubmit = (e: React.FormEvent) => {
    // Just close the dialog - the form submission will handle the rest
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form action="/protected/org/create" method="POST" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a new organization</DialogTitle>
            <DialogDescription>
              Organizations are where your team communicates. Create one for your team, project, or
              company.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="col-span-4">
                Organization name
              </Label>
              <div className="col-span-4">
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="My Awesome Team"
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="slug" className="col-span-4">
                Organization URL
              </Label>
              <div className="col-span-4 flex items-center gap-1">
                <span className="text-muted-foreground">chatgenius.io/</span>
                <Input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="my-awesome-team"
                  pattern="^[a-z0-9-]{3,30}$"
                  title="3-30 lowercase letters, numbers, and hyphens only"
                  readOnly
                  required
                />
              </div>
              <p className="col-span-4 text-xs text-muted-foreground">
                3-30 characters, lowercase letters, numbers, and hyphens only
              </p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="col-span-4">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What's your organization all about?"
                className="col-span-4"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name || !slug}>
              Create Organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
