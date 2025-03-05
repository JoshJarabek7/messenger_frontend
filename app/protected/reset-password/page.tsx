// Remove unused import
import { ResetPasswordForm } from '@/components/reset-password-form';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Server Component to handle searchParams
export default async function ResetPasswordPage({ searchParams }: PageProps) {
  // Await the searchParams promise
  const resolvedParams = await searchParams;

  // Use type checking to ensure string values
  const error = typeof resolvedParams.error === 'string' ? resolvedParams.error : undefined;
  const success = typeof resolvedParams.success === 'string' ? resolvedParams.success : undefined;

  return <ResetPasswordForm errorMessage={error} successMessage={success} />;
}
