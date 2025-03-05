// Remove unused import
import { ForgotPasswordForm } from '@/components/forgot-password-form';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Server Component to handle searchParams
export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  // Await the searchParams promise
  const resolvedParams = await searchParams;

  // Use type checking to ensure string values
  const error = typeof resolvedParams.error === 'string' ? resolvedParams.error : undefined;
  const success = typeof resolvedParams.success === 'string' ? resolvedParams.success : undefined;

  return <ForgotPasswordForm errorMessage={error} successMessage={success} />;
}
