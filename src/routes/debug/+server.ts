// src/routes/debug/+server.ts
import type { RequestHandler } from './$types';
import { env as dyn } from '$env/dynamic/private';
import {
  SPOTIFY_CLIENT_ID as STAT_ID,
  SPOTIFY_REDIRECT_URI as STAT_REDIRECT
} from '$env/static/private';

export const GET: RequestHandler = async () => {
  try {
    return new Response(JSON.stringify({
      dynamic: {
        SPOTIFY_CLIENT_ID: dyn.SPOTIFY_CLIENT_ID ?? null,
        SPOTIFY_CLIENT_SECRET: dyn.SPOTIFY_CLIENT_SECRET ? '***present***' : null,
        SPOTIFY_REDIRECT_URI: dyn.SPOTIFY_REDIRECT_URI ?? null
      },
      static: {
        SPOTIFY_CLIENT_ID: STAT_ID ?? null,
        SPOTIFY_REDIRECT_URI: STAT_REDIRECT ?? null
      }
    }, null, 2), { headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }, null, 2), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
};
