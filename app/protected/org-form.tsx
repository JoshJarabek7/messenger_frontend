'use client';

import React from 'react';

export default function OrgForm({ user: _user }: { user: { id: string; email?: string } }) {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slugField = document.getElementById('slug') as HTMLInputElement;
    if (slugField) {
      // Convert to lowercase, replace spaces with hyphens, remove special chars
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      slugField.value = slug;
    }
  };

  return (
    <div className="w-full">
      <form className="flex flex-col gap-4" action="/protected/org/create" method="POST">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Organization Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className="w-full p-2 border rounded-md"
            placeholder="My Awesome Team"
            onChange={handleNameChange}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="slug" className="text-sm font-medium">
            Organization URL
          </label>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">chatgenius.io/</span>
            <input
              type="text"
              id="slug"
              name="slug"
              className="w-full p-2 border rounded-md bg-muted"
              placeholder="my-awesome-team"
              pattern="^[a-z0-9-]{3,30}$"
              title="3-30 lowercase letters, numbers, and hyphens only"
              readOnly
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            3-30 characters, lowercase letters, numbers, and hyphens only
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            className="w-full p-2 border rounded-md"
            placeholder="What's your organization all about?"
            rows={3}
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 mt-2 bg-primary text-primary-foreground rounded-md"
        >
          Create Organization
        </button>
      </form>
    </div>
  );
}
