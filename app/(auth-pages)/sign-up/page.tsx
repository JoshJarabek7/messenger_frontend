import { SignupForm, SignupMessage } from '@/components/signup-form';
import { Message } from '@/utils/utils';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Server Component to get searchParams
export default async function SignupPage({ searchParams }: PageProps) {
  // In Next.js 15, searchParams should be awaited
  const resolvedParams = await searchParams;

  // Convert URL query params to Message object
  const message: Message = {};
  // Use type assertion for string values
  const error = typeof resolvedParams.error === 'string' ? resolvedParams.error : undefined;
  const success = typeof resolvedParams.success === 'string' ? resolvedParams.success : undefined;

  if (error) {
    message.type = 'error';
    message.message = error;
  } else if (success) {
    message.type = 'success';
    message.message = success;
  }

  if (message.type && message.message) {
    return <SignupMessage message={message} />;
  }

  // Pass parameters as regular props
  return <SignupForm errorMessage={error} successMessage={success} />;
}
