import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function makePlayRequest(
	deviceId: string,
	uris: string[],
	positionMs: number,
	accessToken: string
) {
	const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			uris,
			position_ms: positionMs
		})
	});

	if (response.status === 404) {
		throw error(404, 'No active device found');
	}

	if (!response.ok) {
		const errorText = await response.text();
		throw error(response.status, `Failed to play track: ${errorText}`);
	}

	return response;
}

export const PUT: RequestHandler = async ({ url, request, cookies }) => {
	const accessToken = cookies.get('sp_at');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	try {
		const deviceId = url.searchParams.get('device_id');
		const { uris, position_ms = 0 } = await request.json();

		if (!deviceId) {
			throw error(400, 'Device ID is required');
		}

		if (!uris || !Array.isArray(uris) || uris.length === 0) {
			throw error(400, 'URIs are required');
		}

		let retryCount = 0;
		const maxRetries = 3;

		while (retryCount < maxRetries) {
			try {
				await makePlayRequest(deviceId, uris, position_ms, accessToken);
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
		console.error('Play track error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to play track');
	}
};
