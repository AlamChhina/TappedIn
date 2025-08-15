import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cache } from '$lib/server/cache.js';

// Helper function to fetch all pages of album tracks
async function fetchAlbumTracksPages(albumId: string, accessToken: string): Promise<any[]> {
	const allTracks: any[] = [];
	let nextUrl: string | null =
		`https://api.spotify.com/v1/albums/${albumId}/tracks?market=from_token&limit=50`;

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

	return allTracks;
}

// Helper function to fetch full track details
async function fetchTrackDetails(trackIds: string, accessToken: string): Promise<any> {
	const response: Response = await fetch(
		`https://api.spotify.com/v1/tracks?ids=${trackIds}&market=from_token`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		}
	);

	if (!response.ok) {
		throw error(response.status, `Failed to fetch track details: ${response.statusText}`);
	}

	return response.json();
}

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
		// Check cache first
		const cached = await cache.getCachedApiResponse<any[]>('album-tracks-formatted', { albumId });
		if (cached) {
			return json(cached);
		}

		// Fetch album tracks from all pages
		const allTracks = await fetchAlbumTracksPages(albumId, accessToken);

		// Get track IDs for batch fetching full track data
		const trackIds = allTracks.map((track: any) => track.id).join(',');

		if (!trackIds) {
			return json([]);
		}

		// Fetch full track details
		const tracksData = await fetchTrackDetails(trackIds, accessToken);

		// Filter tracks by duration and format for game
		const tracks = tracksData.tracks
			.filter((track: any) => track && track.duration_ms >= 30000)
			.map((track: any) => ({
				id: track.id,
				name: track.name,
				popularity: track.popularity || 0,
				uri: track.uri,
				artistIds: track.artists.map((artist: any) => artist.id),
				artistNames: track.artists.map((artist: any) => artist.name),
				duration_ms: track.duration_ms
			}));

		// Cache the result for 24 hours
		await cache.cacheApiResponse('album-tracks-formatted', { albumId }, tracks, 24 * 60 * 60 * 1000);

		return json(tracks);
	} catch (err) {
		console.error('Album tracks error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to fetch album tracks');
	}
};
