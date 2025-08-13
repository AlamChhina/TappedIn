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
		const allTracks: any[] = [];
		let nextUrl: string | null = `https://api.spotify.com/v1/albums/${albumId}/tracks?market=from_token&limit=50`;

		// Fetch all pages of album tracks
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

		// Get track IDs for batch fetching full track data (to get popularity and duration)
		const trackIds = allTracks.map((track: any) => track.id).join(',');

		if (!trackIds) {
			return json([]);
		}

		const tracksResponse: Response = await fetch(
			`https://api.spotify.com/v1/tracks?ids=${trackIds}&market=from_token`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		);

		if (!tracksResponse.ok) {
			throw error(tracksResponse.status, `Failed to fetch track details: ${tracksResponse.statusText}`);
		}

		const tracksData: any = await tracksResponse.json();

		// Filter tracks by duration (>= 30 seconds) and format for game
		const tracks = tracksData.tracks
			.filter((track: any) => track && track.duration_ms >= 30000)
			.map((track: any) => ({
				id: track.id,
				name: track.name,
				popularity: track.popularity || 0,
				uri: track.uri,
				artistIds: track.artists.map((artist: any) => artist.id),
				artistNames: track.artists.map((artist: any) => artist.name)
			}));

		return json(tracks);
	} catch (err) {
		console.error('Album tracks error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to fetch album tracks');
	}
};
