// src/routes/login/spotify/+server.ts
import type { RequestHandler } from './$types';
import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from '$env/static/private';
import { randomBytes } from 'node:crypto';
import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ cookies }) => {
  const state = randomBytes(16).toString('hex');

  const scopes = [
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-email',
    'user-read-private' // required for me.product
  ].join(' ');

  cookies.set('sp_state', state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // fine for http on 127.0.0.1
    maxAge: 600
  });

  const u = new URL('https://accounts.spotify.com/authorize');
  u.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', SPOTIFY_REDIRECT_URI);
  u.searchParams.set('scope', scopes);        // ← use the variable
  u.searchParams.set('state', state);
  u.searchParams.set('show_dialog', 'true');  // force re-consent during dev

  throw redirect(302, u.toString());
};
