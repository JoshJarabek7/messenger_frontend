'use client';

import { resetPasswordAction } from '@/app/actions';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState } from 'react';

export function ResetPasswordForm({
  errorMessage,
  successMessage,
}: {
  errorMessage?: string;
  successMessage?: string;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);

    if (password && value) {
      setPasswordsMatch(password === value);
    } else {
      setPasswordsMatch(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Reset password</h1>
        <p className="text-muted-foreground">Enter your new password below</p>
      </div>

      <form className="space-y-4">
        {/* New Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            New password
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="••••••••"
              required
              minLength={6}
              className="pl-10 pr-10"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm password
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="••••••••"
              required
              className={`pl-10 ${
                passwordsMatch === false
                  ? 'border-destructive focus-visible:ring-destructive'
                  : passwordsMatch === true
                    ? 'border-green-600 focus-visible:ring-green-500'
                    : ''
              }`}
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
            />
          </div>
          {passwordsMatch === false && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>

        <SubmitButton
          formAction={resetPasswordAction}
          pendingText="Updating password..."
          disabled={password !== confirmPassword || !password}
          className="w-full"
        >
          Reset password
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
    </div>
  );
}
