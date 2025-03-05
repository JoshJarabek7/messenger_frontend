import { createOrganizationAction } from '@/app/actions';

// This is a workaround since Next.js doesn't support actions in dynamic routes yet
export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await createOrganizationAction(formData);

  if (result.success && result.redirect) {
    return Response.redirect(new URL(result.redirect, request.url));
  } else {
    // Redirect back to the form with error message
    const errorUrl = new URL('/protected', request.url);
    if (!result.success && result.message) {
      errorUrl.searchParams.set('error', result.message);
    }
    return Response.redirect(errorUrl);
  }
}
