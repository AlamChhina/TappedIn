import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ cookies }) => {
  const at = cookies.get('sp_at');
  if (!at) return new Response('Unauthorized', { status: 401 });
  return new Response(JSON.stringify({ access_token: at }), { headers: { 'content-type':'application/json' }});
};
