'use client';

import { Button } from '@/components/ui/button';
import { signOutAction } from '@/app/actions';

export default function HeaderAuth() {
  return (
    <form action={signOutAction} className="w-fit">
      <Button variant="outline" type="submit">
        Sign out
      </Button>
    </form>
  );
}
