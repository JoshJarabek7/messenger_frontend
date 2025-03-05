import { NextRequest, NextResponse } from 'next/server';

import { deleteOrganizationAction, leaveOrganizationAction } from '@/app/actions';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;
    const organizationId = formData.get('organization_id') as string;

    // Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process based on action type
    if (action === 'delete') {
      const result = await deleteOrganizationAction(organizationId, user.id);

      if (result.success && result.redirect) {
        return NextResponse.redirect(new URL(result.redirect, request.nextUrl.origin));
      } else {
        return NextResponse.json(
          { error: result.message || 'Failed to delete organization' },
          { status: 400 }
        );
      }
    } else if (action === 'leave') {
      const result = await leaveOrganizationAction(organizationId, user.id);

      if (result.success && result.redirect) {
        return NextResponse.redirect(new URL(result.redirect, request.nextUrl.origin));
      } else {
        return NextResponse.json(
          { error: result.message || 'Failed to leave organization' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing organization action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
