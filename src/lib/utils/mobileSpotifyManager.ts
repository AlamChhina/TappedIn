/**
 * Mobile-specific Spotify Web Playback SDK manager
 * Handles the complexities of device connection and playback on mobile devices
 */

export interface PlayerConnectionState {
	isConnected: boolean;
	deviceId: string | null;
	isReady: boolean;
	hasActiveTransfer: boolean;
	lastConnectionAttempt: number;
}

export interface DeviceConnectionOptions {
	retryAttempts?: number;
	retryDelay?: number;
	transferTimeout?: number;
	connectionTimeout?: number;
}

export class MobileSpotifyManager {
	private connectionState: PlayerConnectionState = {
		isConnected: false,
		deviceId: null,
		isReady: false,
		hasActiveTransfer: false,
		lastConnectionAttempt: 0
	};

	private readonly options: Required<DeviceConnectionOptions> = {
		retryAttempts: 3,
		retryDelay: 2000,
		transferTimeout: 5000,
		connectionTimeout: 10000
	};

	constructor(options?: DeviceConnectionOptions) {
		this.options = { ...this.options, ...options };
	}

	/**
	 * Enhanced device readiness check that waits for proper mobile registration
	 */
	async waitForDeviceReady(deviceId: string, timeout: number = this.options.connectionTimeout): Promise<boolean> {
		console.log('🔄 Waiting for device to be ready on mobile:', deviceId);
		
		const startTime = Date.now();
		
		while (Date.now() - startTime < timeout) {
			try {
				const response = await fetch('/api/spotify/player/devices');
				if (!response.ok) {
					await this.delay(1000);
					continue;
				}

				const data = await response.json();
				const devices = data.devices || [];
				const ourDevice = devices.find((d: any) => d.id === deviceId);

				if (ourDevice) {
					console.log('✅ Device found in mobile Spotify:', ourDevice);
					this.connectionState.isReady = true;
					return true;
				}

				console.log('⏳ Device not yet visible in mobile Spotify, waiting...', {
					elapsed: Date.now() - startTime,
					availableDevices: devices.map((d: any) => ({ id: d.id, name: d.name }))
				});

				await this.delay(1000);
			} catch (error) {
				console.warn('Device check failed:', error);
				await this.delay(1000);
			}
		}

		console.error('❌ Device readiness timeout after', timeout, 'ms');
		return false;
	}

	/**
	 * Robust device activation with mobile-specific handling
	 */
	async activateDevice(deviceId: string): Promise<boolean> {
		console.log('🎯 Activating device for mobile playback:', deviceId);

		// First, ensure device is ready
		const isReady = await this.waitForDeviceReady(deviceId, 8000);
		if (!isReady) {
			throw new Error('Device not ready for activation. Please ensure Spotify mobile app is open and try switching game modes.');
		}

		// Attempt activation with retries
		for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
			try {
				console.log(`📱 Attempt ${attempt}/${this.options.retryAttempts}: Transferring playback to mobile device`);
				
				const response = await fetch('/api/spotify/player/transfer', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ 
						device_id: deviceId,
						play: false  // Don't auto-play, just transfer
					})
				});

				if (response.ok) {
					console.log('✅ Device activation successful');
					this.connectionState.hasActiveTransfer = true;
					
					// Wait for transfer to stabilize on mobile (reduced for speed)
					await this.delay(1000);
					
					// Verify activation
					if (await this.verifyDeviceActive(deviceId)) {
						return true;
					}
				} else {
					const errorText = await response.text();
					console.warn(`❌ Activation attempt ${attempt} failed:`, response.status, errorText);
				}
			} catch (error) {
				console.warn(`❌ Activation attempt ${attempt} error:`, error);
			}

			if (attempt < this.options.retryAttempts) {
				console.log(`⏳ Waiting ${this.options.retryDelay}ms before retry...`);
				await this.delay(this.options.retryDelay);
			}
		}

		throw new Error('Failed to activate device after multiple attempts. Try switching to the other game mode and back.');
	}

	/**
	 * Verify that device is actually active and ready for playback
	 */
	async verifyDeviceActive(deviceId: string): Promise<boolean> {
		try {
			const response = await fetch('/api/spotify/player/devices');
			if (!response.ok) return false;

			const data = await response.json();
			const devices = data.devices || [];
			const ourDevice = devices.find((d: any) => d.id === deviceId);

			const isActive = ourDevice?.is_active || false;
			console.log('🔍 Device verification:', {
				deviceFound: !!ourDevice,
				isActive,
				allActiveDevices: devices.filter((d: any) => d.is_active).map((d: any) => d.name)
			});

			return isActive;
		} catch (error) {
			console.error('Device verification failed:', error);
			return false;
		}
	}

	/**
	 * Enhanced play command with mobile-specific error handling
	 */
	async playTrack(deviceId: string, trackUri: string, positionMs: number = 0): Promise<void> {
		console.log('🎵 Starting enhanced mobile playback:', { deviceId, trackUri, positionMs });

		// First ensure device is activated
		if (!this.connectionState.hasActiveTransfer) {
			const activated = await this.activateDevice(deviceId);
			if (!activated) {
				throw new Error('Could not activate device for playback');
			}
		}

		// Attempt playback with mobile-specific retry logic
		const maxRetries = 2;
		for (let retry = 0; retry <= maxRetries; retry++) {
			try {
				const payload = {
					uris: [trackUri],
					position_ms: positionMs
				};

				const response = await fetch(`/api/spotify/player/play?device_id=${deviceId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});

				if (response.ok) {
					console.log('✅ Mobile playback started successfully');
					return;
				}

				// Handle specific error cases
				if (response.status === 404) {
					console.log('📱 Device became inactive, reactivating...');
					this.connectionState.hasActiveTransfer = false;
					await this.activateDevice(deviceId);
					continue; // Retry
				}

				if (response.status === 403) {
					const errorText = await response.text();
					if (errorText.includes('PREMIUM_REQUIRED') || errorText.includes('premium')) {
						throw new Error('Spotify Premium is required for playback control.');
					}
				}

				const errorText = await response.text();
				if (retry === maxRetries) {
					throw new Error(`Playback failed: ${errorText}`);
				}

				console.warn(`Playback attempt ${retry + 1} failed, retrying...`, errorText);
				await this.delay(750);  // Reduced from 1500ms to 750ms
			} catch (error) {
				if (retry === maxRetries) {
					throw error;
				}
				console.warn(`Playback attempt ${retry + 1} error, retrying...`, error);
				await this.delay(750);  // Reduced from 1500ms to 750ms
			}
		}
	}

	/**
	 * Reset connection state (useful when switching modes)
	 */
	resetConnectionState(): void {
		console.log('🔄 Resetting mobile connection state');
		this.connectionState = {
			isConnected: false,
			deviceId: null,
			isReady: false,
			hasActiveTransfer: false,
			lastConnectionAttempt: Date.now()
		};
	}

	/**
	 * Get current connection state for debugging
	 */
	getConnectionState(): PlayerConnectionState {
		return { ...this.connectionState };
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

// Global instance for the app with optimized timeouts for speed
export const mobileSpotifyManager = new MobileSpotifyManager({
	retryAttempts: 2,  // Reduced from 3 to 2
	retryDelay: 1000,  // Reduced from 2000ms to 1000ms (1 second)
	transferTimeout: 3000,  // Reduced from 8000ms to 3000ms (3 seconds)
	connectionTimeout: 5000  // Reduced from 12000ms to 5000ms (5 seconds)
});
