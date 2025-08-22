/**
 * Fast Mobile Connection Manager
 * Simulates the "mode switching" fix by creating and destroying a temporary player
 * during the initial connection phase to prime mobile device registration
 */

export interface FastConnectionResult {
	success: boolean;
	message: string;
	deviceReady: boolean;
}

export class FastMobileConnectionManager {
	private hasPerformedPriming = false;
	private primingInProgress = false;

	/**
	 * Prime mobile device connection by simulating the "mode switch" behavior
	 * This creates a temporary player that gets cleaned up, forcing fresh device registration
	 */
	async primeMobileConnection(): Promise<FastConnectionResult> {
		if (this.hasPerformedPriming || this.primingInProgress) {
			console.log('🔄 Connection already primed, skipping');
			return { success: true, message: 'Already primed', deviceReady: true };
		}

		this.primingInProgress = true;
		console.log('🚀 Starting fast mobile connection priming...');

		try {
			// Wait for Spotify SDK to be available
			if (!window.Spotify) {
				console.log('⏳ Waiting for Spotify SDK...');
				await this.waitForSpotifySDK();
			}

			// Create a temporary "priming" player with a different name
			console.log('📱 Creating temporary priming player...');
			const tempPlayer = new window.Spotify.Player({
				name: 'Tapped In 👀 - Connection Primer',
				getOAuthToken: this.getOAuthToken,
				volume: 0.1 // Very low volume
			});

			// Set up minimal listeners
			let tempDeviceId: string | null = null;
			let connectionReady = false;

			tempPlayer.addListener('ready', ({ device_id }: any) => {
				console.log('✅ Temp device ready:', device_id);
				tempDeviceId = device_id;
				connectionReady = true;
			});

			tempPlayer.addListener('not_ready', () => {
				console.log('📱 Temp device disconnected');
			});

			// Connect the temporary player
			console.log('🔌 Connecting temporary player...');
			const connected = await tempPlayer.connect();
			
			if (!connected) {
				throw new Error('Failed to connect temporary player');
			}

			// Wait for the device to be ready (max 3 seconds)
			const waitStart = Date.now();
			while (!connectionReady && Date.now() - waitStart < 3000) {
				await this.delay(100);
			}

			if (connectionReady && tempDeviceId) {
				console.log('✅ Mobile connection primed successfully');
				
				// Wait a moment for mobile device registration to stabilize
				await this.delay(500);
			}

			// Clean up the temporary player
			console.log('🧹 Cleaning up temporary player...');
			try {
				await tempPlayer.disconnect();
			} catch (error) {
				console.log('Temp player cleanup (expected):', error);
			}

			// Wait for cleanup to complete
			await this.delay(300);

			this.hasPerformedPriming = true;
			console.log('🎯 Mobile connection priming complete - device should be ready');

			return {
				success: true,
				message: 'Mobile connection primed successfully',
				deviceReady: connectionReady
			};

		} catch (error) {
			console.error('❌ Mobile connection priming failed:', error);
			return {
				success: false,
				message: `Priming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				deviceReady: false
			};
		} finally {
			this.primingInProgress = false;
		}
	}

	/**
	 * Reset priming state (useful when switching modes manually)
	 */
	resetPrimingState(): void {
		console.log('🔄 Resetting mobile connection priming state');
		this.hasPerformedPriming = false;
		this.primingInProgress = false;
	}

	/**
	 * Check if connection has been primed
	 */
	isPrimed(): boolean {
		return this.hasPerformedPriming;
	}

	private async waitForSpotifySDK(): Promise<void> {
		const maxWait = 10000; // 10 seconds
		const start = Date.now();
		
		while (!window.Spotify && Date.now() - start < maxWait) {
			await this.delay(100);
		}
		
		if (!window.Spotify) {
			throw new Error('Spotify SDK not available');
		}
	}

	private async getOAuthToken(callback: (token: string) => void) {
		try {
			const response = await fetch('/api/spotify/sdk-token');
			if (!response.ok) {
				throw new Error(`Failed to get SDK token: ${response.status}`);
			}
			const data = await response.json();
			callback(data.access_token);
		} catch (error) {
			console.error('Failed to get OAuth token for priming:', error);
			throw error;
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

// Global instance
export const fastMobileConnectionManager = new FastMobileConnectionManager();
