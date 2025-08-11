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

// Main function to collect all primary tracks for an artist
export async function collectPrimaryTracks(
	artistId: string,
	token: string
): Promise<SpotifyTrack[]> {
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
	return hydratedTracks
		.filter((track) => track.duration_ms >= 30000)
		.sort((a, b) => b.popularity - a.popularity);
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
