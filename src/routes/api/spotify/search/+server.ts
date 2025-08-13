import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const accessToken = cookies.get('sp_at');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const query = url.searchParams.get('q');

	if (!query || query.trim().length === 0) {
		return json([]);
	}

	try {
		// Make parallel requests for public search and user's own playlists
		const [searchResponse, userPlaylistsResponse] = await Promise.all([
			// Search for artists, albums, and playlists
			fetch(
				`https://api.spotify.com/v1/search?type=artist,album,playlist&q=${encodeURIComponent(query)}&limit=10&market=from_token`,
				{
					headers: {
						Authorization: `Bearer ${accessToken}`
					}
				}
			),
			// Get user's own playlists
			fetch(
				`https://api.spotify.com/v1/me/playlists?limit=50`,
				{
					headers: {
						Authorization: `Bearer ${accessToken}`
					}
				}
			)
		]);

		if (searchResponse.status === 429) {
			const retryAfter = searchResponse.headers.get('Retry-After');
			const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
			await new Promise((resolve) => setTimeout(resolve, delay));
			throw error(429, 'Rate limited');
		}

		if (!searchResponse.ok) {
			const errorText = await searchResponse.text();
			console.error('Spotify API error:', searchResponse.status, searchResponse.statusText, errorText);
			throw error(searchResponse.status, `Spotify API error: ${searchResponse.statusText}`);
		}

		const data = await searchResponse.json();
		const userPlaylistsData = userPlaylistsResponse.ok ? await userPlaylistsResponse.json() : { items: [] };
		console.log('Spotify search response structure:', {
			hasArtists: !!data.artists,
			artistsCount: data.artists?.items?.length || 0,
			hasAlbums: !!data.albums,
			albumsCount: data.albums?.items?.length || 0,
			hasPlaylists: !!data.playlists,
			playlistsCount: data.playlists?.items?.length || 0
		});
		const results: any[] = [];

		// Add artists
		if (data.artists?.items && Array.isArray(data.artists.items)) {
			data.artists.items.forEach((artist: any) => {
				if (artist && artist.id && artist.name) {
					results.push({
						id: artist.id,
						name: artist.name,
						images: artist.images || [],
						type: 'artist'
					});
				}
			});
		}

		// Add albums (only those with more than 1 track and not singles)
		if (data.albums?.items && Array.isArray(data.albums.items)) {
			data.albums.items
				.filter((album: any) => 
					album && 
					album.id && 
					album.name &&
					album.total_tracks > 1 && 
					(album.album_type === 'album' || album.album_type === 'compilation')
				)
				.forEach((album: any) => {
					results.push({
						id: album.id,
						name: album.name,
						images: album.images || [],
						artist: (album.artists && album.artists[0]?.name) || 'Unknown Artist',
						total_tracks: album.total_tracks,
						release_date: album.release_date,
						album_type: album.album_type,
						type: 'album'
					});
				});
		}

		// Add playlists from public search
		if (data.playlists?.items && Array.isArray(data.playlists.items)) {
			data.playlists.items
				.filter((playlist: any) => 
					playlist && 
					playlist.id && 
					playlist.name &&
					playlist.tracks && 
					playlist.tracks.total > 0
				)
				.forEach((playlist: any) => {
					results.push({
						id: playlist.id,
						name: playlist.name,
						images: playlist.images || [],
						owner: {
							id: playlist.owner?.id || '',
							display_name: playlist.owner?.display_name || 'Unknown User'
						},
						tracks: {
							total: playlist.tracks.total
						},
						description: playlist.description || '',
						type: 'playlist',
						isUserOwned: false
					});
				});
		}

		// Add user's own playlists that match the search query
		if (userPlaylistsData.items && Array.isArray(userPlaylistsData.items)) {
			const queryLower = query.toLowerCase();
			userPlaylistsData.items
				.filter((playlist: any) => {
					if (!playlist || !playlist.id || !playlist.name) return false;
					if (!playlist.tracks || playlist.tracks.total === 0) return false;
					
					// Check if playlist name matches the search query
					const nameMatches = playlist.name.toLowerCase().includes(queryLower);
					const descriptionMatches = playlist.description?.toLowerCase().includes(queryLower) || false;
					
					return nameMatches || descriptionMatches;
				})
				.forEach((playlist: any) => {
					// Check if this playlist is already in results from public search
					const alreadyExists = results.some(result => 
						result.type === 'playlist' && result.id === playlist.id
					);
					
					if (!alreadyExists) {
						results.push({
							id: playlist.id,
							name: playlist.name,
							images: playlist.images || [],
							owner: {
								id: playlist.owner?.id || '',
								display_name: playlist.owner?.display_name || 'You'
							},
							tracks: {
								total: playlist.tracks.total
							},
							description: playlist.description || '',
							type: 'playlist',
							isUserOwned: true
						});
					} else {
						// Update existing playlist to mark as user-owned
						const existingPlaylist = results.find(result => 
							result.type === 'playlist' && result.id === playlist.id
						);
						if (existingPlaylist) {
							existingPlaylist.isUserOwned = true;
							existingPlaylist.owner.display_name = 'You';
						}
					}
				});
		}

		// Sort results to prioritize artists, then albums, then user playlists, then other playlists
		results.sort((a, b) => {
			const typeOrder = { artist: 0, album: 1, playlist: 2 };
			const aTypeOrder = typeOrder[a.type as keyof typeof typeOrder];
			const bTypeOrder = typeOrder[b.type as keyof typeof typeOrder];
			
			if (aTypeOrder !== bTypeOrder) {
				return aTypeOrder - bTypeOrder;
			}
			
			// Within playlists, prioritize user-owned ones
			if (a.type === 'playlist' && b.type === 'playlist') {
				if (a.isUserOwned && !b.isUserOwned) return -1;
				if (!a.isUserOwned && b.isUserOwned) return 1;
			}
			
			return 0;
		});

		return json(results);
	} catch (err) {
		console.error('Search error:', err);
		console.error('Error details:', {
			message: err instanceof Error ? err.message : 'Unknown error',
			stack: err instanceof Error ? err.stack : undefined,
			type: typeof err
		});
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to search');
	}
};
