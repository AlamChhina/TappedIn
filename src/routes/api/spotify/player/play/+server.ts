import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function makePlayRequest(
	deviceId: string,
	accessToken: string,
	uris?: string[],
	positionMs?: number
) {
	const url = `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`;
	const headers = {
		Authorization: `Bearer ${accessToken}`,
		'Content-Type': 'application/json'
	};

	// If no URIs provided, this is a resume request - don't send a body
	const requestOptions: RequestInit = {
		method: 'PUT',
		headers
	};

	// Only add body if we have URIs (play specific track)
	if (uris && uris.length > 0) {
		requestOptions.body = JSON.stringify({
			uris,
			position_ms: positionMs || 0
		});
	}

	const response = await fetch(url, requestOptions);

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

		if (!deviceId) {
			throw error(400, 'Device ID is required');
		}

		// Try to parse request body, but don't require it (for resume requests)
		let uris: string[] | undefined;
		let position_ms: number | undefined;

		try {
			const body = await request.json();
			uris = body.uris;
			position_ms = body.position_ms || 0;
		} catch {
			// No body or invalid JSON - this is a resume request
			uris = undefined;
			position_ms = undefined;
		}

		// Validate URIs only if they're provided
		if (uris !== undefined && (!Array.isArray(uris) || uris.length === 0)) {
			throw error(400, 'URIs must be a non-empty array when provided');
		}

		let retryCount = 0;
		const maxRetries = 3;

		while (retryCount < maxRetries) {
			try {
				await makePlayRequest(deviceId, accessToken, uris, position_ms);
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
