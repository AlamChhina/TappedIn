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
		const allTracks: any[] = [];
		let nextUrl: string | null =
			`https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=from_token&limit=50&fields=items(track(id,name,uri,artists,duration_ms,popularity)),next`;

		// Fetch all pages of playlist tracks
		while (nextUrl) {
			const response: Response = await fetch(nextUrl, {
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			});

			if (response.status === 429) {
				const retryAfter = response.headers.get('Retry-After');
				const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}

			if (!response.ok) {
				throw error(response.status, `Spotify API error: ${response.statusText}`);
			}

			const data: any = await response.json();
			allTracks.push(...data.items);
			nextUrl = data.next;

			// Add small delay to be respectful to API
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Filter and format tracks for the game
		const tracks = allTracks
			.filter(
				(item: any) =>
					item.track &&
					item.track.id &&
					item.track.duration_ms >= 30000 && // At least 30 seconds
					item.track.name &&
					item.track.artists &&
					item.track.artists.length > 0 &&
					!item.track.is_local // Exclude local files
			)
			.map((item: any) => ({
				id: item.track.id,
				name: item.track.name,
				popularity: item.track.popularity || 0,
				uri: item.track.uri,
				artistIds: item.track.artists.map((artist: any) => artist.id),
				artistNames: item.track.artists.map((artist: any) => artist.name),
				duration_ms: item.track.duration_ms
			}));

		return json(tracks);
	} catch (err) {
		console.error('Playlist tracks error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to fetch playlist tracks');
	}
};
