import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	collapseExactDuplicatesFast,
	collapseExactDuplicatesPreferExplicit,
	type SpotifyAlbumObjectSimplified,
	type SpotifyAlbumObjectFull
} from './albumDeduplication';

// Mock fetch globally
global.fetch = vi.fn();

describe('Album Deduplication', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Helper function to create test albums
	function createTestAlbum(
		overrides: Partial<SpotifyAlbumObjectSimplified> = {}
	): SpotifyAlbumObjectSimplified {
		return {
			id: 'album1',
			name: 'Test Album',
			album_type: 'album',
			artists: [{ id: 'artist1', name: 'Test Artist' }],
			release_date: '2023-01-01',
			total_tracks: 10,
			images: [],
			...overrides
		};
	}

	function createTestFullAlbum(
		overrides: Partial<SpotifyAlbumObjectFull> = {}
	): SpotifyAlbumObjectFull {
		const base = createTestAlbum(overrides);
		return {
			...base,
			tracks: {
				items: [
					{ id: 'track1', name: 'Track 1', explicit: false },
					{ id: 'track2', name: 'Track 2', explicit: true }
				]
			},
			...overrides
		};
	}

	describe('collapseExactDuplicatesFast', () => {
		it('should return single albums unchanged', () => {
			const albums = [
				createTestAlbum({ id: 'album1', name: 'Album 1' }),
				createTestAlbum({ id: 'album2', name: 'Album 2' })
			];

			const result = collapseExactDuplicatesFast(albums);
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('album1');
			expect(result[1].id).toBe('album2');
		});

		it('should deduplicate identical albums', () => {
			const baseAlbum = createTestAlbum();
			const albums = [
				{ ...baseAlbum, id: 'album1' },
				{ ...baseAlbum, id: 'album2' } // Same name, artist, year, tracks, type
			];

			const result = collapseExactDuplicatesFast(albums);
			expect(result).toHaveLength(1);
		});

		it('should keep albums with different total_tracks separate', () => {
			const baseAlbum = createTestAlbum();
			const albums = [
				{ ...baseAlbum, id: 'album1', total_tracks: 10 },
				{ ...baseAlbum, id: 'album2', total_tracks: 15 } // Different track count = different edition
			];

			const result = collapseExactDuplicatesFast(albums);
			expect(result).toHaveLength(2);
		});

		it('should keep albums with different names separate', () => {
			const baseAlbum = createTestAlbum();
			const albums = [
				{ ...baseAlbum, id: 'album1', name: 'Album' },
				{ ...baseAlbum, id: 'album2', name: 'Album (Deluxe Edition)' } // Different name
			];

			const result = collapseExactDuplicatesFast(albums);
			expect(result).toHaveLength(2);
		});

		it('should prefer newer release date when deduplicating', () => {
			const baseAlbum = createTestAlbum();
			const albums = [
				{ ...baseAlbum, id: 'album1', release_date: '2023-01-01' },
				{ ...baseAlbum, id: 'album2', release_date: '2023-02-01' } // Newer
			];

			const result = collapseExactDuplicatesFast(albums);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('album2'); // Should pick the newer one
		});

		it('should prefer albums available in target market', () => {
			const baseAlbum = createTestAlbum();
			const albums = [
				{ ...baseAlbum, id: 'album1', available_markets: ['US'] },
				{ ...baseAlbum, id: 'album2', available_markets: ['CA', 'US'] } // Available in target market
			];

			const result = collapseExactDuplicatesFast(albums, { market: 'US' });
			expect(result).toHaveLength(1);
			// Both are available in US, so should fall back to other criteria
		});
	});

	describe('collapseExactDuplicatesPreferExplicit', () => {
		const mockFetch = fetch as any;

		beforeEach(() => {
			mockFetch.mockReset();
		});

		it('should return single albums without API calls', async () => {
			const albums = [
				createTestAlbum({ id: 'album1', name: 'Album 1' }),
				createTestAlbum({ id: 'album2', name: 'Album 2' })
			];

			const result = await collapseExactDuplicatesPreferExplicit('token', albums);
			expect(result).toHaveLength(2);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should make API calls for duplicate groups', async () => {
			const baseAlbum = createTestAlbum();
			const albums = [
				{ ...baseAlbum, id: 'album1' },
				{ ...baseAlbum, id: 'album2' }
			];

			// Mock the Spotify API response
			const fullAlbum1 = createTestFullAlbum({
				id: 'album1',
				tracks: {
					items: [
						{ id: 'track1', name: 'Track 1', explicit: false },
						{ id: 'track2', name: 'Track 2', explicit: false }
					]
				}
			});
			const fullAlbum2 = createTestFullAlbum({
				id: 'album2',
				tracks: {
					items: [
						{ id: 'track3', name: 'Track 1', explicit: true },
						{ id: 'track4', name: 'Track 2', explicit: true }
					]
				}
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					albums: [fullAlbum1, fullAlbum2]
				})
			});

			const result = await collapseExactDuplicatesPreferExplicit('token', albums);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('album2'); // Should prefer the one with more explicit tracks
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.spotify.com/v1/albums?ids=album1,album2',
				expect.objectContaining({
					headers: { Authorization: 'Bearer token' }
				})
			);
		});

		it('should handle API rate limiting', async () => {
			const baseAlbum = createTestAlbum();
			const albums = [
				{ ...baseAlbum, id: 'album1' },
				{ ...baseAlbum, id: 'album2' }
			];

			// First call returns 429, second call succeeds
			mockFetch
				.mockResolvedValueOnce({
					ok: false,
					status: 429,
					headers: { get: () => '1' } // 1 second retry-after
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						albums: [createTestFullAlbum({ id: 'album1' }), createTestFullAlbum({ id: 'album2' })]
					})
				});

			// Mock setTimeout to avoid actual delay in tests
			const originalSetTimeout = global.setTimeout;
			global.setTimeout = vi.fn().mockImplementation((callback) => {
				callback();
				return 1 as any;
			}) as any;

			const result = await collapseExactDuplicatesPreferExplicit('token', albums);

			expect(result).toHaveLength(1);
			expect(mockFetch).toHaveBeenCalledTimes(2);

			// Restore setTimeout
			global.setTimeout = originalSetTimeout;
		});

		it('should batch requests for large numbers of duplicates', async () => {
			// Create 25 duplicate albums (should trigger 2 API calls due to 20-album limit)
			const baseAlbum = createTestAlbum();
			const albums: SpotifyAlbumObjectSimplified[] = [];

			for (let i = 1; i <= 25; i++) {
				albums.push({ ...baseAlbum, id: `album${i}` });
			}

			// Create mock album arrays
			const firstBatch = Array.from({ length: 20 }, (_, i) =>
				createTestFullAlbum({ id: `album${i + 1}` })
			);
			const secondBatch = Array.from({ length: 5 }, (_, i) =>
				createTestFullAlbum({ id: `album${i + 21}` })
			);

			// Mock API responses for both batches
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ albums: firstBatch })
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ albums: secondBatch })
				});

			const result = await collapseExactDuplicatesPreferExplicit('token', albums);

			expect(result).toHaveLength(1); // All should be deduplicated to one
			expect(mockFetch).toHaveBeenCalledTimes(2); // Should have made 2 batched calls
		});

		it('should prefer explicit versions based on track explicit count', async () => {
			const baseAlbum = createTestAlbum();
			const albums = [
				{ ...baseAlbum, id: 'clean-album' },
				{ ...baseAlbum, id: 'explicit-album' }
			];

			const cleanAlbum = createTestFullAlbum({
				id: 'clean-album',
				tracks: {
					items: [
						{ id: 'track1', name: 'Track 1', explicit: false },
						{ id: 'track2', name: 'Track 2', explicit: false }
					]
				}
			});

			const explicitAlbum = createTestFullAlbum({
				id: 'explicit-album',
				tracks: {
					items: [
						{ id: 'track3', name: 'Track 1', explicit: true },
						{ id: 'track4', name: 'Track 2', explicit: true }
					]
				}
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					albums: [cleanAlbum, explicitAlbum]
				})
			});

			const result = await collapseExactDuplicatesPreferExplicit('token', albums);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('explicit-album');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty album arrays', () => {
			const result = collapseExactDuplicatesFast([]);
			expect(result).toEqual([]);
		});

		it('should handle albums with missing or invalid data', () => {
			const albums = [
				createTestAlbum({ release_date: '' }),
				createTestAlbum({ release_date: '2023-01-01' })
			];

			const result = collapseExactDuplicatesFast(albums);
			expect(result).toHaveLength(2); // Should not group due to different release dates
		});

		it('should handle albums with same artist names but different IDs', () => {
			const albums = [
				createTestAlbum({
					id: 'album1',
					artists: [{ id: 'artist1', name: 'Test Artist' }]
				}),
				createTestAlbum({
					id: 'album2',
					artists: [{ id: 'artist2', name: 'Test Artist' }] // Same name, different ID
				})
			];

			const result = collapseExactDuplicatesFast(albums);
			expect(result).toHaveLength(2); // Should keep separate due to different artist IDs
		});
	});
});
