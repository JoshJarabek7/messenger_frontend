'use client';

import { signUpAction, checkUsernameAction } from '@/app/actions';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Message } from '@/utils/utils';
import { AlertCircle, AtSign, CheckCircle2, KeyRound, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function SignupMessage({ message }: { message: Message }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Account Created</h1>
        <p className="text-muted-foreground">
          Your account has been created successfully
        </p>
      </div>

      <FormMessage message={message} className="mt-4" />

      <div className="space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Ready to get started?</p>
          <Button onClick={() => router.push('/sign-in')} className="w-full">
            Go to Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SignupForm({
  errorMessage,
  successMessage,
}: {
  errorMessage?: string;
  successMessage?: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: '',
  });

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to lowercase automatically
    const rawValue = e.target.value;
    const value = rawValue.toLowerCase();

    // Update field if user typed uppercase
    if (value !== rawValue) {
      e.target.value = value;
    }

    setUsername(value);

    if (value.length < 3) {
      setUsernameAvailable(null);
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(value)) {
      setUsernameAvailable(null);
      setUsernameError('Letters, numbers, and underscores only');
      return;
    }

    // Debounce the server check a bit to avoid too many requests
    startTransition(async () => {
      try {
        const result = await checkUsernameAction(value);

        if (result.available === undefined) {
          setUsernameAvailable(true);
          setUsernameError(null);
        } else {
          setUsernameAvailable(result.available);
          setUsernameError(result.available ? null : 'Username already taken');
        }
      } catch (error) {
        // If there's an error checking, we'll let the server validate later
        setUsernameAvailable(true);
        setUsernameError(null);
      }
    });
  };

  const checkPasswordStrength = (password: string) => {
    if (!password) {
      return setPasswordStrength({ score: 0, message: '' });
    }

    let score = 0;
    let message = '';

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Set message based on score
    if (score < 2) message = 'Weak password';
    else if (score < 4) message = 'Decent password';
    else message = 'Strong password';

    setPasswordStrength({ score, message });
  };

  const handleSignUp = async (formData: FormData) => {
    const result = await signUpAction(formData);
    if (result.success) {
      if (result.redirect) {
        // Redirect to sign-in page with success message
        router.push(`${result.redirect}?success=${encodeURIComponent(result.message)}`);
      } else {
        router.push(`/sign-up?success=${encodeURIComponent(result.message)}`);
      }
    } else {
      // Show consistent error message
      return { error: result.message };
    }
  };

  // Calculate password strength color
  const getPasswordStrengthColor = () => {
    if (passwordStrength.score === 0) return 'bg-muted';
    if (passwordStrength.score < 2) return 'bg-destructive';
    if (passwordStrength.score < 4) return 'bg-yellow-500';
    return 'bg-green-600';
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Create an account</h1>
        <p className="text-muted-foreground">Enter your information to create your account</p>
      </div>

      <form className="space-y-4">
        {/* Email Field */}
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

        {/* Username Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="username" className="text-sm font-medium">
              Username
            </Label>
            {username && (
              <span
                className={cn(
                  'text-xs',
                  usernameAvailable === true
                    ? 'text-green-600'
                    : usernameAvailable === false
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                )}
              >
                {isPending
                  ? 'Checking...'
                  : usernameAvailable === true
                    ? '✓ Available'
                    : usernameError}
              </span>
            )}
          </div>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="username"
              name="username"
              placeholder="yourusername"
              required
              pattern="^[a-z0-9_]{3,20}$"
              title="Username must be 3-20 characters and can only contain lowercase letters, numbers, and underscores"
              onChange={handleUsernameChange}
              value={username}
              className={cn(
                'pl-10',
                username &&
                  (usernameAvailable === true
                    ? 'border-green-600 focus-visible:ring-green-500'
                    : usernameAvailable === false
                      ? 'border-destructive focus-visible:ring-destructive'
                      : '')
              )}
            />
          </div>
          {username && !isPending && !usernameError && (
            <p className="text-xs text-muted-foreground">Your unique identifier in ChatGenius</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              minLength={6}
              required
              className="pl-10"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                checkPasswordStrength(e.target.value);
              }}
            />
          </div>

          {/* Password strength meter */}
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1 h-1">
                <div
                  className={cn(
                    'h-full w-1/5 rounded-l-full',
                    passwordStrength.score >= 1 ? getPasswordStrengthColor() : 'bg-muted'
                  )}
                />
                <div
                  className={cn(
                    'h-full w-1/5',
                    passwordStrength.score >= 2 ? getPasswordStrengthColor() : 'bg-muted'
                  )}
                />
                <div
                  className={cn(
                    'h-full w-1/5',
                    passwordStrength.score >= 3 ? getPasswordStrengthColor() : 'bg-muted'
                  )}
                />
                <div
                  className={cn(
                    'h-full w-1/5',
                    passwordStrength.score >= 4 ? getPasswordStrengthColor() : 'bg-muted'
                  )}
                />
                <div
                  className={cn(
                    'h-full w-1/5 rounded-r-full',
                    passwordStrength.score >= 5 ? getPasswordStrengthColor() : 'bg-muted'
                  )}
                />
              </div>
              <p
                className={cn(
                  'text-xs',
                  passwordStrength.score < 2
                    ? 'text-destructive'
                    : passwordStrength.score < 4
                      ? 'text-yellow-500'
                      : 'text-green-600'
                )}
              >
                {passwordStrength.message}
              </p>
            </div>
          )}
        </div>

        <SubmitButton
          formAction={async (formData: FormData) => {
            const result = await handleSignUp(formData);
            if (result?.error) {
              // Handle error if needed
            }
          }}
          pendingText="Creating account..."
          disabled={username ? !usernameAvailable : false}
          className="w-full"
        >
          Create account
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
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
