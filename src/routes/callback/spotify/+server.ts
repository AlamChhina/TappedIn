import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI } from '$env/static/private';

export const GET: RequestHandler = async ({ url, cookies }) => {
    try {
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');
        const expectedState = cookies.get('sp_state');

        if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
            return new Response('Invalid state or code', { status: 400 });
        }
        // clear state cookie
        cookies.delete('sp_state', { path: '/' });

        // Standard Authorization Code exchange (no PKCE)
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: SPOTIFY_REDIRECT_URI
        });

        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                // Basic auth with client id/secret
                Authorization:
                    'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
            },
            body
        });

        const tok = await res.json();
        if (!res.ok) {
            console.error('TOKEN EXCHANGE ERROR:', tok);
            return new Response('Token exchange failed', { status: 400 });
        }

        // Premium check
        const meRes = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${tok.access_token}` }
        });
        const me = await meRes.json();
        if (me?.product !== 'premium') {
            return new Response('Spotify Premium required', { status: 403 });
        }

        // Persist tokens
        cookies.set('sp_at', tok.access_token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: tok.expires_in });
        cookies.set('sp_rt', tok.refresh_token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
        cookies.set('sp_uid', me.id, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });

        throw redirect(302, '/'); // ✅ not Response.redirect
    } catch (e: any) {
        console.error('CALLBACK/SPOTIFY 500:', e);
        return new Response(`callback failed: ${e?.message || e}`, { status: 500 });
    }
};
