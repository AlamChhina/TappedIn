import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { cache } from '$lib/server/cache.js';

/**
 * Cache management endpoint
 * GET /api/cache/stats - Get cache statistics
 * DELETE /api/cache/clear - Clear all cache entries
 */

export const GET: RequestHandler = async () => {
	const stats = cache.getStats();
	return json(stats);
};

export const DELETE: RequestHandler = async () => {
	try {
		await cache.clear();
		return json({ success: true, message: 'Cache cleared successfully' });
	} catch (error) {
		console.error('Failed to clear cache:', error);
		return json({ success: false, error: 'Failed to clear cache' }, { status: 500 });
	}
};
