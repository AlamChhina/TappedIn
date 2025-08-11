import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const accessToken = cookies.get('sp_at');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	// Return the access token for the Spotify Web Playback SDK
	// This is ephemeral and only used by the SDK in memory
	return json({
		access_token: accessToken,
		expires_in: 3600 // 1 hour (typical for Spotify tokens)
	});
};
