import { createChannelAction } from '@/app/actions';

export async function POST(request: Request) {
  const formData = await request.formData();
  return createChannelAction(formData);
}
