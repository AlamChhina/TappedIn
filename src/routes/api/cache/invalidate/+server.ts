import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { cache } from '$lib/server/cache.js';

/**
 * Cache invalidation endpoint
 * POST /api/cache/invalidate - Invalidate specific cache entries
 * Body: { type: 'artist' | 'playlist', id: string }
 */

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { type, id } = await request.json();

		if (!type || !id) {
			throw error(400, 'Type and id are required');
		}

		switch (type) {
			case 'artist':
				await cache.invalidateArtistTracks(id);
				return json({ 
					success: true, 
					message: `Artist ${id} cache invalidated` 
				});
			
			case 'playlist':
				await cache.invalidatePlaylistTracks(id);
				return json({ 
					success: true, 
					message: `Playlist ${id} cache invalidated` 
				});
			
			default:
				throw error(400, 'Invalid type. Must be "artist" or "playlist"');
		}
	} catch (err) {
		console.error('Cache invalidation error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		return json(
			{ success: false, error: 'Failed to invalidate cache' },
			{ status: 500 }
		);
	}
};
