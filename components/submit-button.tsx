'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingText?: string;
  disabled?: boolean;
  formAction?: string | ((formData: FormData) => void | Promise<void>);
  className?: string;
}

export function SubmitButton({
  children,
  pendingText,
  disabled = false,
  formAction,
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isPending = pending && !disabled;

  return (
    <Button
      type="submit"
      className={className}
      disabled={disabled || isPending}
      formAction={formAction}
    >
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isPending && pendingText ? pendingText : children}
    </Button>
  );
}
