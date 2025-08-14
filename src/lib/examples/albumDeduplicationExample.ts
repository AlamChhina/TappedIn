/**
 * Example usage of the album deduplication utilities
 *
 * This demonstrates how to integrate the deduplication functionality
 * into your Spotify search flow.
 */

import {
	collapseExactDuplicatesPreferExplicit,
	collapseExactDuplicatesFast
} from '$lib/utils/albumDeduplication';
import type { SpotifyAlbumObjectSimplified } from '$lib/utils/albumDeduplication';

/**
 * Example: Enhanced search function that automatically deduplicates albums
 */
export async function searchAlbumsWithDeduplication(
	query: string,
	accessToken: string,
	userMarket?: string
): Promise<SpotifyAlbumObjectSimplified[]> {
	// 1. Call Spotify search API
	const response = await fetch(
		`https://api.spotify.com/v1/search?type=album&q=${encodeURIComponent(query)}&limit=20&market=from_token`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		}
	);

	if (!response.ok) {
		throw new Error(`Search failed: ${response.statusText}`);
	}

	const data = await response.json();
	const albums: SpotifyAlbumObjectSimplified[] = data.albums?.items || [];

	// 2. Deduplicate albums, preferring explicit versions
	const deduped = await collapseExactDuplicatesPreferExplicit(accessToken, albums, {
		market: userMarket
	});

	return deduped;
}

/**
 * Example: Fast deduplication without API calls (for performance-critical scenarios)
 */
export function quickDeduplicateAlbums(
	albums: SpotifyAlbumObjectSimplified[],
	userMarket?: string
): SpotifyAlbumObjectSimplified[] {
	return collapseExactDuplicatesFast(albums, { market: userMarket });
}

/**
 * Example: Process search results in your Svelte component
 */
export const searchExampleUsage = `
<script lang="ts">
	import { searchAlbumsWithDeduplication } from '$lib/examples/albumDeduplicationExample';
	
	let searchQuery = '';
	let albums: SpotifyAlbumObjectSimplified[] = [];
	let isLoading = false;
	
	async function handleSearch() {
		if (!searchQuery.trim()) return;
		
		isLoading = true;
		try {
			// This automatically deduplicates and prefers explicit versions
			albums = await searchAlbumsWithDeduplication(
				searchQuery, 
				accessToken, 
				userMarket
			);
		} catch (error) {
			console.error('Search failed:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<input bind:value={searchQuery} placeholder="Search for albums..." />
<button onclick={handleSearch} disabled={isLoading}>
	{isLoading ? 'Searching...' : 'Search'}
</button>

{#each albums as album}
	<div class="album-card">
		<h3>{album.name}</h3>
		<p>by {album.artists[0]?.name}</p>
		<p>{album.total_tracks} tracks • {album.release_date}</p>
	</div>
{/each}
`;

/**
 * Before/After comparison example
 */
export function demonstrateDeduplication() {
	// Example duplicate albums from Spotify search
	const searchResults: SpotifyAlbumObjectSimplified[] = [
		{
			id: 'album1_clean',
			name: 'My Beautiful Dark Twisted Fantasy',
			album_type: 'album',
			artists: [{ id: 'kanye', name: 'Kanye West' }],
			release_date: '2010-11-22',
			total_tracks: 13,
			images: []
		},
		{
			id: 'album1_explicit',
			name: 'My Beautiful Dark Twisted Fantasy',
			album_type: 'album',
			artists: [{ id: 'kanye', name: 'Kanye West' }],
			release_date: '2010-11-22',
			total_tracks: 13,
			images: []
		},
		{
			id: 'album2_deluxe',
			name: 'My Beautiful Dark Twisted Fantasy (Deluxe Edition)',
			album_type: 'album',
			artists: [{ id: 'kanye', name: 'Kanye West' }],
			release_date: '2010-11-22',
			total_tracks: 16, // Different track count = different edition
			images: []
		}
	];

	console.log('Before deduplication:', searchResults.length, 'albums');
	// Would output: 3 albums (including both clean/explicit versions)

	const deduplicated = collapseExactDuplicatesFast(searchResults);
	console.log('After deduplication:', deduplicated.length, 'albums');
	// Would output: 2 albums (clean/explicit merged, deluxe kept separate)

	return {
		original: searchResults,
		deduplicated
	};
}
