/**
 * Utility functions for parsing Spotify URLs and extracting IDs
 */

export type SpotifyUrlType = 'artist' | 'album' | 'playlist' | 'track';

export interface SpotifyUrlInfo {
	type: SpotifyUrlType;
	id: string;
}

/**
 * Parses a Spotify URL and extracts the type and ID
 * Supports both open.spotify.com URLs and spotify: URIs
 */
export function parseSpotifyUrl(url: string): SpotifyUrlInfo | null {
	const trimmedUrl = url.trim();

	// Handle spotify: URIs (e.g., spotify:artist:4dpARuHxo51G3z768sgnrY)
	const uriRegex = /^spotify:(artist|album|playlist|track):([a-zA-Z0-9]+)$/;
	const uriMatch = uriRegex.exec(trimmedUrl);
	if (uriMatch) {
		return {
			type: uriMatch[1] as SpotifyUrlType,
			id: uriMatch[2]
		};
	}

	// Handle open.spotify.com URLs
	try {
		const urlObj = new URL(trimmedUrl);

		if (urlObj.hostname !== 'open.spotify.com') {
			return null;
		}

		// Parse the pathname: /{type}/{id}
		const pathRegex = /^\/(artist|album|playlist|track)\/([a-zA-Z0-9]+)$/;
		const pathMatch = pathRegex.exec(urlObj.pathname);
		if (pathMatch) {
			return {
				type: pathMatch[1] as SpotifyUrlType,
				id: pathMatch[2]
			};
		}
	} catch {
		// Invalid URL format
		return null;
	}

	return null;
}

/**
 * Checks if a string looks like a Spotify URL or URI
 */
export function isSpotifyUrl(input: string): boolean {
	return parseSpotifyUrl(input) !== null;
}

/**
 * Creates a Spotify URI from type and ID
 */
export function createSpotifyUri(type: SpotifyUrlType, id: string): string {
	return `spotify:${type}:${id}`;
}

/**
 * Creates a Spotify open URL from type and ID
 */
export function createSpotifyUrl(type: SpotifyUrlType, id: string): string {
	return `https://open.spotify.com/${type}/${id}`;
}
