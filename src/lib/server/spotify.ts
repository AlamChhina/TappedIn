import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '$env/static/private';

// Types for Spotify API responses
export interface SpotifyArtist {
	id: string;
	name: string;
	images: { url: string; height: number; width: number }[];
}

export interface SpotifyAlbum {
	id: string;
	name: string;
	album_type: string;
	total_tracks: number;
}

export interface SpotifyTrack {
	id: string;
	name: string;
	artists: SpotifyArtist[];
	duration_ms: number;
	popularity: number;
	uri: string;
}

export interface SpotifySearchResponse {
	artists: {
		items: SpotifyArtist[];
		next: string | null;
	};
}

export interface SpotifyAlbumsResponse {
	items: SpotifyAlbum[];
	next: string | null;
}

export interface SpotifyTracksResponse {
	items: SpotifyTrack[];
	next: string | null;
}

export interface SpotifyBatchTracksResponse {
	tracks: SpotifyTrack[];
}

export interface SimplifiedTrack {
	id: string;
	name: string;
	uri: string;
	artists: { id: string; name: string }[];
	album?: { id: string; name: string; album_type?: string; release_date?: string };
	isrc?: string | null;
	popularity?: number | null;
	duration_ms: number;
}

// Utility to handle paginated requests with rate limiting
export async function pagedFetch<T>(
	initialUrl: string,
	token: string,
	itemsKey: string = 'items'
): Promise<T[]> {
	const allItems: T[] = [];
	let url: string | null = initialUrl;

	while (url) {
		await new Promise((resolve) => setTimeout(resolve, 50)); // Basic rate limiting

		const response: Response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (response.status === 429) {
			const retryAfter = response.headers.get('Retry-After');
			const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
			await new Promise((resolve) => setTimeout(resolve, delay));
			continue;
		}

		if (!response.ok) {
			throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
		}

		const data: any = await response.json();
		allItems.push(...(data[itemsKey] || []));
		url = data.next;
	}

	return allItems;
}

// Get all albums/singles for an artist
export async function getArtistAlbums(artistId: string, token: string): Promise<SpotifyAlbum[]> {
	const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=from_token&limit=50`;
	return pagedFetch<SpotifyAlbum>(url, token, 'items');
}

// Get all tracks for an album
export async function getAlbumTracks(albumId: string, token: string): Promise<SpotifyTrack[]> {
	const url = `https://api.spotify.com/v1/albums/${albumId}/tracks?market=from_token&limit=50`;
	return pagedFetch<SpotifyTrack>(url, token, 'items');
}

// Hydrate track IDs in batches to get full track info
export async function hydrateTracks(trackIds: string[], token: string): Promise<SpotifyTrack[]> {
	const allTracks: SpotifyTrack[] = [];

	// Process in chunks of 50 (Spotify's limit)
	for (let i = 0; i < trackIds.length; i += 50) {
		const chunk = trackIds.slice(i, i + 50);
		const idsParam = chunk.join(',');
		let retryCount = 0;
		const maxRetries = 3;

		while (retryCount < maxRetries) {
			await new Promise((resolve) => setTimeout(resolve, 100)); // Rate limiting

			const response = await fetch(
				`https://api.spotify.com/v1/tracks?ids=${idsParam}&market=from_token`,
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			if (response.status === 429) {
				const retryAfter = response.headers.get('Retry-After');
				const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
				await new Promise((resolve) => setTimeout(resolve, delay));
				retryCount++;
				continue;
			}

			if (!response.ok) {
				throw new Error(`Failed to hydrate tracks: ${response.status} ${response.statusText}`);
			}

			const data: SpotifyBatchTracksResponse = await response.json();
			allTracks.push(...data.tracks.filter((track) => track !== null));
			break; // Success, exit retry loop
		}

		if (retryCount >= maxRetries) {
			throw new Error(`Failed to hydrate tracks after ${maxRetries} retries`);
		}
	}

	return allTracks;
}

// Precompiled regex patterns for performance
const EXCLUSION_PATTERNS = /\b(live|remix|remixed|rmx|instrumental|acoustic)\b/i;
const REMASTERED_SUFFIX = /\s*-\s*remastered?\s*(\d{4}|\d{2})?\s*$/i;
const SINGLE_VERSION_SUFFIX = /\s*-\s*single\s+version\s*$/i;
const RADIO_EDIT_SUFFIX = /\s*-\s*radio\s+edit\s*$/i;
const EDIT_SUFFIX = /\s*-\s*edit\s*$/i;
const EXTENDED_SUFFIX = /\s*-\s*extended\s+(version|mix)?\s*$/i;
const BRACKETED_CONTENT = /[([{][^)\]}]*[)\]}]/g;
const WHITESPACE_PUNCT = /[\s-]+/g;

/**
 * Normalize a track title for comparison by:
 * 1. Converting to lowercase
 * 2. Removing common suffixes (remastered, single version, radio edit, etc.)
 * 3. Removing bracketed qualifiers, but preserving if it would remove entire title
 * 4. Collapsing whitespace and punctuation to single spaces
 * 5. Trimming
 */
function normalizeTitle(title: string): string {
	if (!title?.trim()) return '';

	let normalized = title.toLowerCase();

	// Remove common suffixes
	normalized = normalized
		.replace(REMASTERED_SUFFIX, '')
		.replace(SINGLE_VERSION_SUFFIX, '')
		.replace(RADIO_EDIT_SUFFIX, '')
		.replace(EDIT_SUFFIX, '')
		.replace(EXTENDED_SUFFIX, '');

	// Remove bracketed content, but preserve if it would empty the string
	const withoutBrackets = normalized.replace(BRACKETED_CONTENT, '').trim();
	if (withoutBrackets.length > 0) {
		normalized = withoutBrackets;
	}

	// Collapse whitespace and punctuation
	normalized = normalized.replace(WHITESPACE_PUNCT, ' ').trim();

	return normalized;
}

/**
 * Check if a track should be excluded based on title content.
 * Excludes tracks that are clearly alternate versions (live performances, remixes, etc.)
 * but preserves song titles that happen to contain these words.
 */
function shouldExcludeTrack(title: string): boolean {
	const lowerTitle = title.toLowerCase();

	// Patterns that clearly indicate alternate versions
	const exclusionPatterns = [
		// Live performance indicators
		/\blive\s+(at|from|in|version|recording|performance|session)/,
		/\(live\)/,
		/-\s*live\s*$/,
		/-\s*live\s+(at|from|in|version|recording|performance|session)/,

		// Remix indicators
		/\bremix\b/,
		/\brmx\b/,
		/\(remix\)/,
		/-\s*remix/,
		/\bremixed\s+(version|by)/,

		// Instrumental indicators
		/\binstrumental\s+(version|mix|track)/,
		/\(instrumental\)/,
		/-\s*instrumental/,

		// Acoustic indicators
		/\bacoustic\s+(version|mix|track)/,
		/\(acoustic\)/,
		/-\s*acoustic/,

		// Acapella indicators
		/\bacapella\s+(version|mix|track)/,
		/\(acapella\)/,
		/-\s*acapella/,
		/\ba\s*capella\s+(version|mix|track)/,
		/\(a\s*capella\)/,
		/-\s*a\s*capella/,

		// Rock version indicators
		/\brock\s+(version|mix|track)/,
		/\(rock\s+version\)/,
		/-\s*rock\s+version/
	];

	return exclusionPatterns.some((pattern) => pattern.test(lowerTitle));
}

/**
 * Convert SpotifyTrack to SimplifiedTrack format
 */
function simplifyTrack(track: SpotifyTrack, album?: SpotifyAlbum): SimplifiedTrack {
	return {
		id: track.id,
		name: track.name,
		uri: track.uri || `spotify:track:${track.id}`,
		artists: track.artists.map((artist) => ({ id: artist.id, name: artist.name })),
		album: album
			? {
					id: album.id,
					name: album.name,
					album_type: album.album_type
				}
			: undefined,
		isrc: null, // Will be populated if we fetch extended track info
		popularity: track.popularity || null,
		duration_ms: track.duration_ms
	};
}

/**
 * Filters and de-duplicates a list of tracks for a single primary artist.
 *
 * SUMMARY: This function implements a two-stage pipeline for cleaning up artist track lists:
 * 1. EXCLUSION: Removes alternate versions (live performances, remixes, instrumentals, acoustics)
 *    while preserving legitimate song titles that happen to contain these words
 * 2. DEDUPLICATION: Groups tracks by ISRC (preferred) or normalized title, then selects the
 *    best version using popularity, album preference, release date, and title length
 *
 * FILTERING RULES:
 * - Excludes tracks with clear alternate version indicators like "- Live at...", "(Remix)", etc.
 * - Preserves song titles like "Live Wire", "Live For", "Remixed Emotions", "Instrumentality"
 *
 * DEDUPLICATION STRATEGY:
 * - Primary key: ISRC (International Standard Recording Code) when available
 * - Fallback key: normalized title + primary artist ID
 * - Tie-breaker preferences: popularity → album over single → earlier release → shorter title
 *
 * @param tracks Array of tracks to process
 * @param primaryArtistId The ID of the primary artist
 * @returns Filtered and deduplicated tracks suitable for guess-the-song games
 */
export function sanitizeArtistTracks(
	tracks: SimplifiedTrack[],
	primaryArtistId: string
): SimplifiedTrack[] {
	// Step 1: Filter out excluded tracks
	const filteredTracks = tracks.filter((track) => !shouldExcludeTrack(track.name));

	// Step 2: Group tracks by deduplication key
	const trackGroups = new Map<string, SimplifiedTrack[]>();

	for (const track of filteredTracks) {
		// Use ISRC if available, otherwise use normalized title + artist ID
		const key = track.isrc || `${normalizeTitle(track.name)}::${primaryArtistId}`;

		if (!trackGroups.has(key)) {
			trackGroups.set(key, []);
		}
		trackGroups.get(key)!.push(track);
	}

	// Step 3: Select best track from each group using tie-breaker rules
	const dedupedTracks: SimplifiedTrack[] = [];

	for (const group of trackGroups.values()) {
		if (group.length === 1) {
			dedupedTracks.push(group[0]);
			continue;
		}

		// Sort by preference: popularity desc, album > single, earlier release, shorter title, order
		group.sort((a, b) => {
			// 1. Higher popularity
			const aPopularity = a.popularity || 0;
			const bPopularity = b.popularity || 0;
			if (aPopularity !== bPopularity) {
				return bPopularity - aPopularity;
			}

			// 2. Album track over single
			const aIsAlbum = a.album?.album_type === 'album';
			const bIsAlbum = b.album?.album_type === 'album';
			if (aIsAlbum !== bIsAlbum) {
				return aIsAlbum ? -1 : 1;
			}

			// 3. Earlier release date (if available)
			if (a.album?.release_date && b.album?.release_date) {
				const dateComparison = a.album.release_date.localeCompare(b.album.release_date);
				if (dateComparison !== 0) {
					return dateComparison;
				}
			}

			// 4. Shorter title
			if (a.name.length !== b.name.length) {
				return a.name.length - b.name.length;
			}

			// 5. Keep first encountered (stable sort)
			return 0;
		});

		dedupedTracks.push(group[0]);
	}

	return dedupedTracks;
}

// Main function to collect all primary tracks for an artist
export async function collectPrimaryTracks(
	artistId: string,
	token: string
): Promise<SimplifiedTrack[]> {
	// 1. Get all albums/singles for the artist
	const albums = await getArtistAlbums(artistId, token);

	// 2. Get all tracks from all albums (with controlled concurrency)
	const trackPromises: Promise<SpotifyTrack[]>[] = [];
	const concurrencyLimit = 5;

	for (let i = 0; i < albums.length; i += concurrencyLimit) {
		const batch = albums.slice(i, i + concurrencyLimit);
		const batchPromises = batch.map((album) => getAlbumTracks(album.id, token));
		trackPromises.push(...batchPromises);

		// Wait for this batch to complete before starting the next
		await Promise.all(batchPromises);
	}

	const allTrackArrays = await Promise.all(trackPromises);
	const allTracks = allTrackArrays.flat();

	// 3. De-duplicate by track ID
	const uniqueTrackIds = new Set<string>();
	const uniqueTracks: SpotifyTrack[] = [];

	for (const track of allTracks) {
		if (!uniqueTrackIds.has(track.id)) {
			uniqueTrackIds.add(track.id);
			uniqueTracks.push(track);
		}
	}

	// 4. Filter for primary artist only (first artist must match)
	const primaryTracks = uniqueTracks.filter(
		(track) => track.artists.length > 0 && track.artists[0].id === artistId
	);

	// 5. Hydrate tracks to get duration and popularity
	const hydratedTracks = await hydrateTracks(
		primaryTracks.map((t) => t.id),
		token
	);

	// 6. Filter by duration (>= 30 seconds) and sort by popularity
	const filteredTracks = hydratedTracks
		.filter((track) => track.duration_ms >= 30000)
		.sort((a, b) => b.popularity - a.popularity);

	// 7. Convert to SimplifiedTrack format and create album lookup
	const trackToAlbumMap = new Map<string, SpotifyAlbum>();

	// Build track-to-album mapping
	for (let i = 0; i < albums.length; i++) {
		const album = albums[i];
		const albumTracks = allTrackArrays[i] || [];
		for (const track of albumTracks) {
			trackToAlbumMap.set(track.id, album);
		}
	}

	const simplifiedTracks = filteredTracks.map((track) => {
		const album = trackToAlbumMap.get(track.id);
		return simplifyTrack(track, album);
	});

	// 8. Apply sanitization
	return sanitizeArtistTracks(simplifiedTracks, artistId);
}

export async function refreshWith(refresh_token: string) {
	const body = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token,
		client_id: SPOTIFY_CLIENT_ID,
		client_secret: SPOTIFY_CLIENT_SECRET
	});
	const r = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!r.ok) throw new Error('refresh failed');
	return r.json();
}
