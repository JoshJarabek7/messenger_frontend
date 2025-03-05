'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bot, Users, User, MessageSquare } from 'lucide-react';
import { JoinOrganizationDialog } from '@/components/join-organization-dialog';

interface WelcomeProps {
  username: string;
  userId: string;
}

export default function Welcome({ username, userId }: WelcomeProps) {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center p-8 max-w-2xl mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to ChatGenius, {username}!</h1>

      <p className="text-lg mb-8">
        Your AI-powered communication platform that helps teams collaborate more effectively.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
        <div className="flex flex-col border p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-medium">AI Avatars</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Your AI-powered avatar will respond to @mentions when you're offline, making async
            communication more efficient.
          </p>
          <Link href="/protected/profile" className="mt-auto">
            <Button className="w-full" variant="outline">
              Set up your AI persona
            </Button>
          </Link>
        </div>

        <div className="flex flex-col border p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-medium">Organizations</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Create or join teams to collaborate effectively with channels and direct messages.
          </p>
          <div className="flex gap-2 mt-auto">
            <Link href="/protected" className="flex-1">
              <Button className="w-full" variant="default">
                Create
              </Button>
            </Link>
            <div className="flex-1">
              <JoinOrganizationDialog
                userId={userId}
                trigger={
                  <Button className="w-full" variant="outline">
                    Join
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t w-full pt-8 mt-4">
        <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
        <ul className="text-left space-y-4">
          <li className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <User size={18} className="text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Complete your profile</h4>
              <p className="text-sm text-muted-foreground">
                Add a profile picture, display name, and customize your AI persona.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Users size={18} className="text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Create or join an organization</h4>
              <p className="text-sm text-muted-foreground">
                Set up your team or join an existing one to start collaborating.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <MessageSquare size={18} className="text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Start messaging</h4>
              <p className="text-sm text-muted-foreground">
                Send messages, create threads, and @mention others in your organization.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
