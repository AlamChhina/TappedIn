import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const accessToken = cookies.get('sp_at');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const albumId = url.searchParams.get('albumId');

	if (!albumId) {
		throw error(400, 'Album ID is required');
	}

	try {
		const response = await fetch(
			`https://api.spotify.com/v1/albums/${encodeURIComponent(albumId)}?market=from_token`,
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

		const album = await response.json();

		// Filter albums (same logic as search endpoint)
		if (album.total_tracks <= 1 || (album.album_type !== 'album' && album.album_type !== 'compilation')) {
			throw error(400, 'Album must have more than 1 track and be an album or compilation');
		}

		return json({
			id: album.id,
			name: album.name,
			images: album.images || [],
			artist: (album.artists && album.artists[0]?.name) || 'Unknown Artist',
			total_tracks: album.total_tracks,
			release_date: album.release_date,
			album_type: album.album_type,
			type: 'album'
		});
	} catch (err) {
		console.error('Get album error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to fetch album');
	}
};
