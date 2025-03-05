import { Info } from 'lucide-react';
import Link from 'next/link';

export function SmtpMessage() {
  return (
    <div className="bg-muted/50 border rounded-md flex items-start gap-3 p-3 mt-4">
      <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Verification emails are rate limited. Enable Custom SMTP for higher
          limits.
        </p>
        <Link
          href="https://supabase.com/docs/guides/auth/auth-smtp"
          target="_blank"
          className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm"
        >
          Learn more
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 9.5L9.5 2.5M9.5 2.5H4.5M9.5 2.5V7.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
