'use client';

import { forgotPasswordAction } from '@/app/actions';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AtSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function ForgotPasswordForm({
  errorMessage,
  successMessage,
}: {
  errorMessage?: string;
  successMessage?: string;
}) {
  const [email, setEmail] = useState('');

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Forgot password</h1>
        <p className="text-muted-foreground">Enter your email to reset your password</p>
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

        <SubmitButton
          formAction={forgotPasswordAction}
          pendingText="Sending reset link..."
          className="w-full"
        >
          Send reset instructions
        </SubmitButton>

        {/* Display error/success messages */}
        {(errorMessage || successMessage) && (
          <FormMessage
            message={{
              type: errorMessage ? 'error' : 'success',
              message: errorMessage || successMessage || '',
            }}
            className="mt-2"
          />
        )}
      </form>

      <div className="text-center">
        <Link
          href="/sign-in"
          className="text-sm inline-flex items-center gap-1 text-primary hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
