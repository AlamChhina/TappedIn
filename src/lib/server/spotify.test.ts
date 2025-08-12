import { describe, it, expect } from 'vitest';
import { sanitizeArtistTracks, type SimplifiedTrack } from './spotify';

describe('sanitizeArtistTracks', () => {
	const primaryArtistId = 'artist123';
	
	const createTrack = (overrides: Partial<SimplifiedTrack>): SimplifiedTrack => ({
		id: 'track1',
		name: 'Test Song',
		uri: 'spotify:track:track1',
		artists: [{ id: primaryArtistId, name: 'Test Artist' }],
		popularity: 50,
		...overrides
	});

	describe('exclusion filtering', () => {
		it('should exclude tracks with "live" in title', () => {
			const tracks = [
				createTrack({ id: 'track1', name: 'Song Title - Live at Madison Square Garden' }),
				createTrack({ id: 'track2', name: 'Song Title (Live)' }),
				createTrack({ id: 'track3', name: 'Live Wire' }), // Should NOT be excluded
				createTrack({ id: 'track4', name: 'Live It Up' }), // Should NOT be excluded
				createTrack({ id: 'track5', name: 'Normal Song' })
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(3);
			expect(result.map(t => t.name)).toEqual(['Live Wire', 'Live It Up', 'Normal Song']);
		});

		it('should exclude tracks with "remix" variations', () => {
			const tracks = [
				createTrack({ id: 'track1', name: 'Song Title (Remix)' }),
				createTrack({ id: 'track2', name: 'Song Title - Remixed' }),
				createTrack({ id: 'track3', name: 'Song Title (RMX)' }),
				createTrack({ id: 'track4', name: 'Remixed Emotions' }), // Should NOT be excluded
				createTrack({ id: 'track5', name: 'Normal Song' })
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(2);
			expect(result.map(t => t.name)).toEqual(['Remixed Emotions', 'Normal Song']);
		});

		it('should exclude tracks with "instrumental"', () => {
			const tracks = [
				createTrack({ id: 'track1', name: 'Song Title (Instrumental Version)' }),
				createTrack({ id: 'track2', name: 'Song Title - Instrumental' }),
				createTrack({ id: 'track3', name: 'Instrumentality of Man' }), // Should NOT be excluded
				createTrack({ id: 'track4', name: 'Normal Song' })
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(2);
			expect(result.map(t => t.name)).toEqual(['Instrumentality of Man', 'Normal Song']);
		});

		it('should exclude tracks with "acoustic"', () => {
			const tracks = [
				createTrack({ id: 'track1', name: 'Song Title - Acoustic' }),
				createTrack({ id: 'track2', name: 'Song Title (Acoustic Version)' }),
				createTrack({ id: 'track3', name: 'Acoustics 101' }), // Should NOT be excluded
				createTrack({ id: 'track4', name: 'Normal Song' })
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(2);
			expect(result.map(t => t.name)).toEqual(['Acoustics 101', 'Normal Song']);
		});
	});

	describe('deduplication by ISRC', () => {
		it('should deduplicate tracks with same ISRC', () => {
			const tracks = [
				createTrack({ 
					id: 'track1', 
					name: 'Song Title', 
					isrc: 'USRC17607839',
					popularity: 80,
					album: { id: 'album1', name: 'Album', album_type: 'album' }
				}),
				createTrack({ 
					id: 'track2', 
					name: 'Song Title - Remastered', 
					isrc: 'USRC17607839',
					popularity: 60,
					album: { id: 'single1', name: 'Single', album_type: 'single' }
				})
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('track1'); // Higher popularity wins
		});
	});

	describe('deduplication by normalized title', () => {
		it('should deduplicate tracks with similar titles', () => {
			const tracks = [
				createTrack({ 
					id: 'track1', 
					name: 'Song Title', 
					popularity: 70
				}),
				createTrack({ 
					id: 'track2', 
					name: 'Song Title - Remastered 2023', 
					popularity: 60
				}),
				createTrack({ 
					id: 'track3', 
					name: 'Song Title (Single Version)', 
					popularity: 50
				})
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('track1'); // Higher popularity wins
		});

		it('should preserve bracketed content if it would empty the title', () => {
			const tracks = [
				createTrack({ 
					id: 'track1', 
					name: '(Intro)', 
					popularity: 50
				}),
				createTrack({ 
					id: 'track2', 
					name: 'Normal Song', 
					popularity: 60
				})
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(2);
			expect(result.map(t => t.name)).toEqual(['(Intro)', 'Normal Song']);
		});
	});

	describe('tie-breaking preferences', () => {
		it('should prefer higher popularity', () => {
			const tracks = [
				createTrack({ 
					id: 'track1', 
					name: 'Song Title', 
					popularity: 50
				}),
				createTrack({ 
					id: 'track2', 
					name: 'Song Title', 
					popularity: 80
				})
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('track2');
		});

		it('should prefer album tracks over singles when popularity is equal', () => {
			const tracks = [
				createTrack({ 
					id: 'track1', 
					name: 'Song Title', 
					popularity: 70,
					album: { id: 'single1', name: 'Single', album_type: 'single' }
				}),
				createTrack({ 
					id: 'track2', 
					name: 'Song Title', 
					popularity: 70,
					album: { id: 'album1', name: 'Album', album_type: 'album' }
				})
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('track2'); // Album track wins
		});

		it('should prefer earlier release date when other factors are equal', () => {
			const tracks = [
				createTrack({ 
					id: 'track1', 
					name: 'Song Title', 
					popularity: 70,
					album: { 
						id: 'album1', 
						name: 'Album', 
						album_type: 'album',
						release_date: '2023-01-01'
					}
				}),
				createTrack({ 
					id: 'track2', 
					name: 'Song Title', 
					popularity: 70,
					album: { 
						id: 'album2', 
						name: 'Album', 
						album_type: 'album',
						release_date: '2022-01-01'
					}
				})
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('track2'); // Earlier release wins
		});

		it('should prefer shorter title when other factors are equal', () => {
			const tracks = [
				createTrack({ 
					id: 'track1', 
					name: 'Song Title - Extended Version', 
					popularity: 70
				}),
				createTrack({ 
					id: 'track2', 
					name: 'Song Title', 
					popularity: 70
				})
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('track2'); // Shorter title wins
		});
	});

	describe('edge cases', () => {
		it('should handle empty array', () => {
			const result = sanitizeArtistTracks([], primaryArtistId);
			expect(result).toEqual([]);
		});

		it('should handle tracks without ISRC', () => {
			const tracks = [
				createTrack({ 
					id: 'track1', 
					name: 'Song Title', 
					isrc: null
				})
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			expect(result).toHaveLength(1);
		});

		it('should handle tracks without popularity', () => {
			const tracks = [
				createTrack({ 
					id: 'track1', 
					name: 'Song Title', 
					popularity: null
				}),
				createTrack({ 
					id: 'track2', 
					name: 'Another Song', 
					popularity: 50
				})
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			expect(result).toHaveLength(2);
		});

		it('should handle tracks without album info', () => {
			const tracks = [
				createTrack({ 
					id: 'track1', 
					name: 'Song Title', 
					album: undefined
				})
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			expect(result).toHaveLength(1);
		});
	});

	describe('complex scenarios', () => {
		it('should handle mixed exclusions and duplications', () => {
			const tracks = [
				createTrack({ 
					id: 'track1', 
					name: 'Song Title', 
					popularity: 80
				}),
				createTrack({ 
					id: 'track2', 
					name: 'Song Title - Live', 
					popularity: 70 // Should be excluded
				}),
				createTrack({ 
					id: 'track3', 
					name: 'Song Title (Remastered)', 
					popularity: 60 // Duplicate of track1
				}),
				createTrack({ 
					id: 'track4', 
					name: 'Another Song - Remix', 
					popularity: 90 // Should be excluded
				}),
				createTrack({ 
					id: 'track5', 
					name: 'Different Song', 
					popularity: 50
				})
			];

			const result = sanitizeArtistTracks(tracks, primaryArtistId);
			
			expect(result).toHaveLength(2);
			expect(result.map(t => t.name)).toEqual(['Song Title', 'Different Song']);
			expect(result[0].id).toBe('track1'); // Higher popularity wins deduplication
		});
	});
});
