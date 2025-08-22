/**
 * Utility for managing Spotify Web Playback SDK device connections
 * Helps with mobile device connection issues by providing better error messages
 * and connection state management
 */

export interface DeviceInfo {
	id: string;
	name: string;
	is_active: boolean;
	type: string;
	volume_percent: number;
}

export interface DeviceCheckResult {
	isAvailable: boolean;
	isActive: boolean;
	device?: DeviceInfo;
	allDevices: DeviceInfo[];
}

/**
 * Check if a specific device ID is available in the user's Spotify devices
 */
export async function checkDeviceAvailability(deviceId: string): Promise<DeviceCheckResult> {
	try {
		const response = await fetch('/api/spotify/player/devices');
		if (!response.ok) {
			throw new Error(`Failed to fetch devices: ${response.status}`);
		}
		
		const data = await response.json();
		const devices: DeviceInfo[] = data.devices || [];
		
		const ourDevice = devices.find(device => device.id === deviceId);
		
		return {
			isAvailable: !!ourDevice,
			isActive: ourDevice?.is_active || false,
			device: ourDevice,
			allDevices: devices
		};
	} catch (error) {
		console.error('Failed to check device availability:', error);
		return {
			isAvailable: false,
			isActive: false,
			allDevices: []
		};
	}
}

/**
 * Transfer playback to a specific device
 */
export async function transferPlaybackToDevice(deviceId: string): Promise<boolean> {
	try {
		const response = await fetch('/api/spotify/player/transfer', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ device_id: deviceId })
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Transfer failed:', errorText);
			return false;
		}

		console.log('Playback transferred successfully to device:', deviceId);
		return true;
	} catch (error) {
		console.error('Transfer failed:', error);
		return false;
	}
}

/**
 * Generate helpful error messages for mobile device connection issues
 */
export function getDeviceConnectionError(deviceCheck: DeviceCheckResult, isMobile: boolean = false): string {
	if (!deviceCheck.isAvailable) {
		if (isMobile) {
			return 'Device not found in Spotify app. Please ensure the Spotify mobile app is open and try refreshing this page. If the issue persists, try switching to the other game mode and back.';
		} else {
			return 'Device not found. Please ensure Spotify is running and try refreshing this page.';
		}
	}
	
	if (!deviceCheck.isActive) {
		if (isMobile) {
			return 'Device found but not active. This is common on mobile - try switching to the other game mode and back to refresh the connection.';
		} else {
			return 'Device found but not active. Attempting to transfer playback...';
		}
	}
	
	return 'Unknown device connection issue occurred.';
}

/**
 * Detect if user is on mobile device (simple check)
 */
export function isMobileDevice(): boolean {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
