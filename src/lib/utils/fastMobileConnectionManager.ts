/**
 * Fast Mobile Connection Manager
 * 
 * Optimized approach for mobile Spotify Web Playback SDK connections.
 * Instead of waiting 8-12 seconds for device activation, this primes
 * the connection using a temporary player strategy that simulates the
 * mode-switching fix automatically.
 */

import { isMobileDevice } from './deviceManager.js';

let isPriming = false;
let isPrimed = false;

/**
 * Prime mobile connection by creating a temporary player and transferring playback
 * This simulates the mode-switching behavior that fixes mobile connections
 */
export async function primeMobileConnection(deviceId: string): Promise<void> {
	if (!isMobileDevice()) {
		console.log('🖥️ Desktop detected - no priming needed');
		return;
	}

	if (isPriming || isPrimed) {
		console.log('📱 Connection already primed or priming in progress');
		return;
	}

	console.log('📱 Starting mobile connection priming...');
	isPriming = true;

	try {
		// Create a temporary Web Playback SDK player
		const tempPlayer = new (window as any).Spotify.Player({
			name: 'GTS Connection Primer',
			getOAuthToken: async (cb: (token: string) => void) => {
				try {
					const response = await fetch('/api/spotify/token');
					if (!response.ok) {
						throw new Error(`Failed to get token: ${response.status}`);
					}
					const data = await response.json();
					cb(data.access_token);
				} catch (error) {
					console.error('Failed to get OAuth token for priming:', error);
				}
			},
			volume: 0.0 // Silent priming
		});

		// Connect the temporary player
		const connected = await tempPlayer.connect();
		if (!connected) {
			throw new Error('Failed to connect temporary player');
		}

		console.log('📱 Temporary player connected, waiting for device...');

		// Wait for temporary player to be ready
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error('Temporary player ready timeout'));
			}, 5000);

			tempPlayer.addListener('ready', ({ device_id }: any) => {
				clearTimeout(timeout);
				console.log('📱 Temporary player ready:', device_id);
				resolve();
			});

			tempPlayer.addListener('not_ready', ({ device_id }: any) => {
				clearTimeout(timeout);
				reject(new Error(`Temporary player not ready: ${device_id}`));
			});
		});

		// Transfer playback to main device to prime the connection
		console.log('📱 Transferring playback to prime connection...');
		const transferResponse = await fetch('/api/spotify/player/transfer', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				device_ids: [deviceId],
				play: false // Don't start playing automatically
			})
		});

		if (!transferResponse.ok) {
			console.warn('📱 Playback transfer failed, but continuing...');
		}

		// Wait a moment for the transfer to take effect
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Clean up temporary player
		tempPlayer.disconnect();
		console.log('📱 Temporary player disconnected');

		isPrimed = true;
		console.log('✅ Mobile connection priming complete');

	} catch (error) {
		console.error('❌ Mobile connection priming failed:', error);
		// Don't throw - allow fallback to standard playback
	} finally {
		isPriming = false;
	}
}

/**
 * Reset priming state (called when device changes)
 */
export function resetPrimingState(): void {
	isPriming = false;
	isPrimed = false;
	console.log('🔄 Mobile connection priming state reset');
}

/**
 * Check if connection has been primed
 */
export function isConnectionPrimed(): boolean {
	return isPrimed;
}
