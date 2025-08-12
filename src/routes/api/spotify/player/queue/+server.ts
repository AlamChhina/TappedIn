import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function addToQueue(uri: string, deviceId: string, accessToken: string) {
	const response = await fetch(
		`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}&device_id=${deviceId}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		}
	);

	if (response.status === 404) {
		throw error(404, 'No active device found');
	}

	if (!response.ok) {
		const errorText = await response.text();
		throw error(response.status, `Failed to add track to queue: ${errorText}`);
	}

	return response;
}

export const POST: RequestHandler = async ({ url, request, cookies }) => {
	const accessToken = cookies.get('sp_at');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	try {
		const deviceId = url.searchParams.get('device_id');
		const { uri } = await request.json();

		if (!deviceId) {
			throw error(400, 'Device ID is required');
		}

		if (!uri) {
			throw error(400, 'URI is required');
		}

		let retryCount = 0;
		const maxRetries = 3;

		while (retryCount < maxRetries) {
			try {
				await addToQueue(uri, deviceId, accessToken);
				return json({ success: true });
			} catch (err) {
				if (err && typeof err === 'object' && 'status' in err && err.status === 429) {
					const delay = Math.pow(2, retryCount) * 1000;
					await new Promise((resolve) => setTimeout(resolve, delay));
					retryCount++;
					continue;
				}
				throw err;
			}
		}

		throw error(429, 'Rate limited after multiple retries');
	} catch (err) {
		console.error('Queue track error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to queue track');
	}
};
