import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const accessToken = cookies.get('sp_at');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const artistId = url.searchParams.get('artistId');

	if (!artistId) {
		throw error(400, 'Artist ID is required');
	}

	try {
		const response = await fetch(
			`https://api.spotify.com/v1/artists/${encodeURIComponent(artistId)}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		);

		if (response.status === 429) {
			const retryAfter = response.headers.get('Retry-After');
			const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
			await new Promise((resolve) => setTimeout(resolve, delay));
			throw error(429, 'Rate limited');
		}

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Spotify API error:', response.status, response.statusText, errorText);
			throw error(response.status, `Spotify API error: ${response.statusText}`);
		}

		const artist = await response.json();

		return json({
			id: artist.id,
			name: artist.name,
			images: artist.images || [],
			type: 'artist'
		});
	} catch (err) {
		console.error('Get artist error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to fetch artist');
	}
};
