import type { Album } from '$lib/types';

// Types for Spotify API responses - using actual Spotify API structure
export interface SpotifyAlbumObjectSimplified {
	id: string;
	name: string;
	album_type: string;
	artists: Array<{
		id: string;
		name: string;
	}>;
	release_date: string;
	total_tracks: number;
	available_markets?: string[];
	images: Array<{
		url: string;
		height: number;
		width: number;
	}>;
}

export interface SpotifyAlbumObjectFull extends SpotifyAlbumObjectSimplified {
	tracks: {
		items: Array<{
			id: string;
			name: string;
			explicit: boolean;
		}>;
	};
}

export interface SpotifyAlbumsResponse {
	albums: (SpotifyAlbumObjectFull | null)[];
}

export interface CollapseOptions {
	market?: string;
}

// Convert our internal Album type to SpotifyAlbumObjectSimplified for processing
function albumToSpotifyAlbum(album: Album): SpotifyAlbumObjectSimplified {
	return {
		id: album.id,
		name: album.name,
		album_type: album.album_type,
		artists: [{ id: '', name: album.artist }], // We don't have artist IDs in our Album type
		release_date: album.release_date,
		total_tracks: album.total_tracks,
		images: album.images
	};
}

// Convert SpotifyAlbumObjectSimplified back to our internal Album type
function spotifyAlbumToAlbum(spotifyAlbum: SpotifyAlbumObjectSimplified): Album {
	return {
		id: spotifyAlbum.id,
		name: spotifyAlbum.name,
		images: spotifyAlbum.images,
		artist: spotifyAlbum.artists[0]?.name || 'Unknown Artist',
		total_tracks: spotifyAlbum.total_tracks,
		release_date: spotifyAlbum.release_date,
		album_type: spotifyAlbum.album_type
	};
}

/**
 * Generate a key to identify potentially duplicate albums.
 * Albums with the same key are considered duplicates.
 */
function generateAlbumKey(album: SpotifyAlbumObjectSimplified): string {
	const normalizedName = album.name.toLowerCase().trim();
	const sortedArtistIds = album.artists
		.map((artist) => artist.id)
		.sort((a, b) => a.localeCompare(b))
		.join(',');
	const year = album.release_date ? album.release_date.substring(0, 4) : '';

	return `${normalizedName}||${sortedArtistIds}||${year}||${album.total_tracks}||${album.album_type}`;
}

/**
 * Group albums by their identity key to find potential duplicates.
 */
function groupAlbumsByKey(
	albums: SpotifyAlbumObjectSimplified[]
): Map<string, SpotifyAlbumObjectSimplified[]> {
	const groups = new Map<string, SpotifyAlbumObjectSimplified[]>();

	for (const album of albums) {
		const key = generateAlbumKey(album);
		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key)!.push(album);
	}

	return groups;
}

/**
 * Fetch full album details for a batch of album IDs.
 * Batch size should not exceed 20 per Spotify API limits.
 */
async function fetchFullAlbums(
	albumIds: string[],
	token: string,
	market?: string
): Promise<SpotifyAlbumObjectFull[]> {
	if (albumIds.length === 0) return [];
	if (albumIds.length > 20) {
		throw new Error('Batch size cannot exceed 20 albums');
	}

	const idsParam = albumIds.join(',');
	const marketParam = market ? `&market=${market}` : '';

	const response = await fetch(`https://api.spotify.com/v1/albums?ids=${idsParam}${marketParam}`, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});

	if (response.status === 429) {
		const retryAfter = response.headers.get('Retry-After');
		const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
		await new Promise((resolve) => setTimeout(resolve, delay));
		// Retry the request
		return fetchFullAlbums(albumIds, token, market);
	}

	if (!response.ok) {
		throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
	}

	const data: SpotifyAlbumsResponse = await response.json();
	return data.albums.filter((album): album is SpotifyAlbumObjectFull => album !== null);
}

/**
 * Score an album based on explicit track count.
 * Higher score = more explicit tracks = preferred.
 */
function scoreAlbumByExplicitness(album: SpotifyAlbumObjectFull): number {
	if (!album.tracks?.items) return 0;
	return album.tracks.items.filter((track) => track.explicit).length;
}

/**
 * Determine if an album is available in the target market.
 */
function isAlbumAvailableInMarket(album: SpotifyAlbumObjectFull, market?: string): boolean {
	if (!market || !album.available_markets) return true;
	return album.available_markets.includes(market);
}

/**
 * Select the best album from a group of duplicates.
 * Preference order:
 * 1. Highest explicit track count
 * 2. Available in target market (if market specified)
 * 3. Newer release date
 * 4. Lexicographic ID (stable fallback)
 */
function selectBestAlbum(
	fullAlbums: SpotifyAlbumObjectFull[],
	market?: string
): SpotifyAlbumObjectFull {
	if (fullAlbums.length === 1) return fullAlbums[0];

	const sortedAlbums = fullAlbums.toSorted((a, b) => {
		// 1. Explicit track count (higher is better)
		const aExplicitScore = scoreAlbumByExplicitness(a);
		const bExplicitScore = scoreAlbumByExplicitness(b);
		if (aExplicitScore !== bExplicitScore) {
			return bExplicitScore - aExplicitScore;
		}

		// 2. Market availability (available is better)
		if (market) {
			const aAvailable = isAlbumAvailableInMarket(a, market);
			const bAvailable = isAlbumAvailableInMarket(b, market);
			if (aAvailable !== bAvailable) {
				return aAvailable ? -1 : 1;
			}
		}

		// 3. Release date (newer is better)
		if (a.release_date && b.release_date) {
			const dateComparison = b.release_date.localeCompare(a.release_date);
			if (dateComparison !== 0) {
				return dateComparison;
			}
		}

		// 4. Stable fallback: lexicographic ID
		return a.id.localeCompare(b.id);
	});

	return sortedAlbums[0];
}

/**
 * Fast deduplication without making API requests.
 * This doesn't guarantee explicit preference but is useful for quick deduplication.
 */
export function collapseExactDuplicatesFast(
	albums: SpotifyAlbumObjectSimplified[],
	opts: CollapseOptions = {}
): SpotifyAlbumObjectSimplified[] {
	const groups = groupAlbumsByKey(albums);
	const result: SpotifyAlbumObjectSimplified[] = [];

	for (const group of groups.values()) {
		if (group.length === 1) {
			result.push(group[0]);
		} else {
			// Simple selection based on available data
			const sortedGroup = group.toSorted((a, b) => {
				// Prefer albums available in target market
				if (opts.market) {
					const aAvailable = a.available_markets?.includes(opts.market) ?? true;
					const bAvailable = b.available_markets?.includes(opts.market) ?? true;
					if (aAvailable !== bAvailable) {
						return aAvailable ? -1 : 1;
					}
				}

				// Prefer newer release date
				if (a.release_date && b.release_date) {
					const dateComparison = b.release_date.localeCompare(a.release_date);
					if (dateComparison !== 0) {
						return dateComparison;
					}
				}

				// Stable fallback
				return a.id.localeCompare(b.id);
			});

			result.push(sortedGroup[0]);
		}
	}

	return result;
}

/**
 * Main function to collapse exact duplicates, preferring explicit versions.
 * Makes API requests only for groups with duplicates.
 */
export async function collapseExactDuplicatesPreferExplicit(
	token: string,
	albums: SpotifyAlbumObjectSimplified[],
	opts: CollapseOptions = {}
): Promise<SpotifyAlbumObjectSimplified[]> {
	const groups = groupAlbumsByKey(albums);
	const result: SpotifyAlbumObjectSimplified[] = [];

	// Collect all duplicate groups that need API calls
	const duplicateGroups: SpotifyAlbumObjectSimplified[][] = [];
	const allDuplicateIds: string[] = [];

	for (const group of groups.values()) {
		if (group.length === 1) {
			// No duplicates, keep as-is
			result.push(group[0]);
		} else {
			// Has duplicates, needs API call
			duplicateGroups.push(group);
			allDuplicateIds.push(...group.map((album) => album.id));
		}
	}

	// If no duplicates, return original array
	if (duplicateGroups.length === 0) {
		return albums;
	}

	// Fetch full album details in batches of 20
	const fullAlbums: SpotifyAlbumObjectFull[] = [];
	for (let i = 0; i < allDuplicateIds.length; i += 20) {
		const batch = allDuplicateIds.slice(i, i + 20);
		const batchAlbums = await fetchFullAlbums(batch, token, opts.market);
		fullAlbums.push(...batchAlbums);

		// Small delay between batches to be nice to the API
		if (i + 20 < allDuplicateIds.length) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	// Create a map for quick lookup
	const fullAlbumMap = new Map<string, SpotifyAlbumObjectFull>();
	fullAlbums.forEach((album) => fullAlbumMap.set(album.id, album));

	// Process each duplicate group
	for (const group of duplicateGroups) {
		const groupFullAlbums = group
			.map((album) => fullAlbumMap.get(album.id))
			.filter((album): album is SpotifyAlbumObjectFull => album !== undefined);

		if (groupFullAlbums.length > 0) {
			const bestAlbum = selectBestAlbum(groupFullAlbums, opts.market);
			// Convert back to simplified format
			const simplified: SpotifyAlbumObjectSimplified = {
				id: bestAlbum.id,
				name: bestAlbum.name,
				album_type: bestAlbum.album_type,
				artists: bestAlbum.artists,
				release_date: bestAlbum.release_date,
				total_tracks: bestAlbum.total_tracks,
				available_markets: bestAlbum.available_markets,
				images: bestAlbum.images
			};
			result.push(simplified);
		} else {
			// Fallback: if we couldn't fetch full details, just pick the first
			result.push(group[0]);
		}
	}

	return result;
}

// Convenience functions that work with our internal Album type
export function collapseAlbumDuplicatesFast(albums: Album[], opts: CollapseOptions = {}): Album[] {
	const spotifyAlbums = albums.map(albumToSpotifyAlbum);
	const deduplicated = collapseExactDuplicatesFast(spotifyAlbums, opts);
	return deduplicated.map(spotifyAlbumToAlbum);
}

export async function collapseAlbumDuplicatesPreferExplicit(
	token: string,
	albums: Album[],
	opts: CollapseOptions = {}
): Promise<Album[]> {
	const spotifyAlbums = albums.map(albumToSpotifyAlbum);
	const deduplicated = await collapseExactDuplicatesPreferExplicit(token, spotifyAlbums, opts);
	return deduplicated.map(spotifyAlbumToAlbum);
}
