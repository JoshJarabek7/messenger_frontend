'use client';

import { signInAction } from '@/app/actions';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AtSign, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function SignInForm({
  errorMessage,
  successMessage,
}: {
  errorMessage?: string;
  successMessage?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Enter your credentials to sign in to your account</p>
      </div>

      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <AtSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="pl-10"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="pl-10"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
        </div>

        <SubmitButton pendingText="Signing in..." formAction={signInAction} className="w-full">
          Sign in
        </SubmitButton>

        {/* Display error/success messages */}
        {(errorMessage || successMessage) && (
          <FormMessage
            message={{
              type: errorMessage ? 'error' : 'success',
              message: errorMessage || successMessage || '',
            }}
          />
        )}
      </form>

      <div className="text-center text-sm">
        Don't have an account?{' '}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
