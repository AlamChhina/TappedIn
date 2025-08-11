import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	// Clear all Spotify-related cookies
	cookies.delete('sp_at', { path: '/' });
	cookies.delete('sp_rt', { path: '/' });
	cookies.delete('sp_uid', { path: '/' });
	cookies.delete('sp_state', { path: '/' });

	// Redirect to landing page
	throw redirect(302, '/');
};
