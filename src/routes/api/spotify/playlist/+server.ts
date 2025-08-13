import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const accessToken = cookies.get('sp_at');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const playlistId = url.searchParams.get('playlistId');

	if (!playlistId) {
		throw error(400, 'Playlist ID is required');
	}

	try {
		// Get playlist details and user info in parallel
		const [playlistResponse, userResponse] = await Promise.all([
			fetch(
				`https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}?market=from_token&fields=id,name,description,images,owner,tracks.total`,
				{
					headers: {
						Authorization: `Bearer ${accessToken}`
					}
				}
			),
			fetch(
				`https://api.spotify.com/v1/me`,
				{
					headers: {
						Authorization: `Bearer ${accessToken}`
					}
				}
			)
		]);

		if (playlistResponse.status === 429) {
			const retryAfter = playlistResponse.headers.get('Retry-After');
			const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
			await new Promise((resolve) => setTimeout(resolve, delay));
			throw error(429, 'Rate limited');
		}

		if (!playlistResponse.ok) {
			const errorText = await playlistResponse.text();
			console.error('Spotify API error:', playlistResponse.status, playlistResponse.statusText, errorText);
			throw error(playlistResponse.status, `Spotify API error: ${playlistResponse.statusText}`);
		}

		const playlist = await playlistResponse.json();
		const userData = userResponse.ok ? await userResponse.json() : null;

		// Check if playlist has tracks
		if (!playlist.tracks || playlist.tracks.total === 0) {
			throw error(400, 'Playlist must have tracks');
		}

		// Check if user owns the playlist
		const isUserOwned = userData && playlist.owner && playlist.owner.id === userData.id;

		return json({
			id: playlist.id,
			name: playlist.name,
			images: playlist.images || [],
			owner: {
				id: playlist.owner?.id || '',
				display_name: isUserOwned ? 'You' : (playlist.owner?.display_name || 'Unknown User')
			},
			tracks: {
				total: playlist.tracks.total
			},
			description: playlist.description || '',
			type: 'playlist',
			isUserOwned: Boolean(isUserOwned)
		});
	} catch (err) {
		console.error('Get playlist error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to fetch playlist');
	}
};
