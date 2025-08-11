import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { collectPrimaryTracks } from '$lib/server/spotify';

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
		const tracks = await collectPrimaryTracks(artistId, accessToken);

		// Return minimal track data for the UI
		const trackData = tracks.map((track) => ({
			id: track.id,
			name: track.name,
			popularity: track.popularity,
			artists: track.artists.map((artist) => ({
				id: artist.id,
				name: artist.name
			})),
			uri: track.uri
		}));

		return json(trackData);
	} catch (err) {
		console.error('Artist tracks error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to fetch artist tracks');
	}
};
