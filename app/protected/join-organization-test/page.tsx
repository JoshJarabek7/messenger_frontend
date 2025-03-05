'use client';

import { useEffect, useState } from 'react';

import { JoinOrganizationDialog } from '@/components/join-organization-dialog';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';

export default function JoinOrganizationTestPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };

    fetchUserId();
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Join Organization Dialog Test</h1>

      {userId ? (
        <div className="space-y-8">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-medium mb-4">Test Dialog</h2>
            <JoinOrganizationDialog
              userId={userId}
              trigger={<Button>Open Join Organization Dialog</Button>}
            />
          </div>
        </div>
      ) : (
        <p>Loading user data...</p>
      )}
    </div>
  );
}
