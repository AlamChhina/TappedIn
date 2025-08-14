// src/routes/callback/spotify/+server.ts
import type { RequestHandler } from './$types';
import {
	SPOTIFY_CLIENT_ID,
	SPOTIFY_CLIENT_SECRET,
	SPOTIFY_REDIRECT_URI
} from '$env/static/private';
import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');
	const returnedState = url.searchParams.get('state');
	const expectedState = cookies.get('sp_state');

	// Handle user cancellation gracefully
	if (error === 'access_denied') {
		// Clean up state cookie and redirect back to landing page
		cookies.delete('sp_state', { path: '/' });
		throw redirect(302, '/');
	}

	if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
		return new Response('Invalid state or code', { status: 400 });
	}
	cookies.delete('sp_state', { path: '/' });

	// Exchange code -> tokens
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: SPOTIFY_REDIRECT_URI
	});

	const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization:
				'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
		},
		body
	});

	if (!tokenRes.ok) {
		const err = await tokenRes.text();
		return new Response(`Token exchange failed: ${err}`, { status: 400 });
	}

	const tok = await tokenRes.json();

	// Verify Premium
	const meRes = await fetch('https://api.spotify.com/v1/me', {
		headers: { Authorization: `Bearer ${tok.access_token}` }
	});
	if (!meRes.ok) {
		const err = await meRes.text();
		return new Response(`Failed to fetch /v1/me: ${err}`, { status: 500 });
	}
	const me = await meRes.json();
	const product = (me?.product ?? '').toLowerCase();
	if (product !== 'premium') {
		return new Response('Spotify Premium required', { status: 403 });
	}

	// Persist tokens
	cookies.set('sp_at', tok.access_token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: tok.expires_in
	});
	cookies.set('sp_rt', tok.refresh_token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30
	});
	cookies.set('sp_uid', me.id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30
	});

	throw redirect(302, '/classic');
};
