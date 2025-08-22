import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const accessToken = cookies.get('sp_at');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	try {
		const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Failed to get devices:', response.status, errorText);
			throw error(response.status, `Failed to get devices: ${errorText}`);
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		console.error('Get devices error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to get devices');
	}
};
