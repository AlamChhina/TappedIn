import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SpotifySearchResponse, SpotifyArtist } from '$lib/server/spotify';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const accessToken = cookies.get('sp_at');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const query = url.searchParams.get('q');

	if (!query || query.trim().length === 0) {
		return json([]);
	}

	try {
		const response = await fetch(
			`https://api.spotify.com/v1/search?type=artist&q=${encodeURIComponent(query)}&limit=10&market=from_token`,
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
			throw error(response.status, `Spotify API error: ${response.statusText}`);
		}

		const data: SpotifySearchResponse = await response.json();

		// Return minimal artist data
		const artists = data.artists.items.map((artist: SpotifyArtist) => ({
			id: artist.id,
			name: artist.name,
			images: artist.images
		}));

		return json(artists);
	} catch (err) {
		console.error('Search error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to search artists');
	}
};
