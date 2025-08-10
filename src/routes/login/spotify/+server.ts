// src/routes/login/spotify/+server.ts
import type { RequestHandler } from './$types';
import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from '$env/static/private';
import { randomBytes } from 'node:crypto';
import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ cookies }) => {
  // ...build `state` and auth URL `u`...
  const state = randomBytes(16).toString('hex');
  cookies.set('sp_state', state, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600 });

  const u = new URL('https://accounts.spotify.com/authorize');
  u.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', SPOTIFY_REDIRECT_URI);
  u.searchParams.set('scope', 'streaming user-read-playback-state user-modify-playback-state user-read-email');
  u.searchParams.set('state', state);

  throw redirect(302, u.toString()); // ✅ instead of return Response.redirect(...)
};
