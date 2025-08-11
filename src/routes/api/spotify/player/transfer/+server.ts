import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function makeTransferRequest(deviceId: string, accessToken: string) {
	const response = await fetch('https://api.spotify.com/v1/me/player', {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			device_ids: [deviceId],
			play: false
		})
	});

	if (response.status === 404) {
		throw error(404, 'No active device found');
	}

	if (!response.ok) {
		const errorText = await response.text();
		throw error(response.status, `Failed to transfer playback: ${errorText}`);
	}

	return response;
}

export const PUT: RequestHandler = async ({ request, cookies }) => {
	const accessToken = cookies.get('sp_at');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	try {
		const { device_id } = await request.json();

		if (!device_id) {
			throw error(400, 'Device ID is required');
		}

		let retryCount = 0;
		const maxRetries = 3;

		while (retryCount < maxRetries) {
			try {
				await makeTransferRequest(device_id, accessToken);
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
		console.error('Transfer playback error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to transfer playback');
	}
};
