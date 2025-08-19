<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Search, Music, Loader2, Album, ListMusic, ExternalLink } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import GuessTrack from './GuessTrack.svelte';
	import GuessTrackClassic from './GuessTrackClassic.svelte';
	import GameHistory from './GameHistory.svelte';
	import LoadingMessages from './LoadingMessages.svelte';
	import type { GameTrack, SearchResult, SearchResultType, GameSession } from '$lib/types';
	import { parseSpotifyUrl, isSpotifyUrl } from '$lib/utils/spotifyUrl';
	import { loadingMessages, type ItemType } from '$lib/stores/loadingMessages';
	import { gameHistory } from '$lib/stores/gameHistory';

	// Props
	interface Props {
		gameMode?: 'classic' | 'zen';
		playbackMode?: 'beginning' | 'random';
		onPlayerStateChange?: (isLoading: boolean) => void;
	}

	let { gameMode = 'zen', playbackMode = 'beginning', onPlayerStateChange }: Props = $props();

	// Component state
	let searchQuery = $state('');
	let searchResults = $state<SearchResult[]>([]);
	let selectedItem = $state<SearchResult | null>(null);
	let selectedType = $state<SearchResultType | null>(null);
	let tracks = $state<GameTrack[]>([]);
	let isSearching = $state(false);
	let isFetchingTracks = $state(false);
	let showDropdown = $state(false);
	let searchError = $state<string | null>(null);
	let tracksError = $state<string | null>(null);
	let searchInputRef = $state<HTMLInputElement | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let selectedIndex = $state(-1);

	// Subscribe to game history for display
	let history = $state<GameSession[]>([]);
	let currentSessionId = $state<string | null>(null);
	
	gameHistory.subscribe(value => {
		console.log('ArtistSearch - History updated:', value);
		history = value;
	});

	// Handle session changes from GuessTrack components
	function handleSessionChange(sessionId: string | null) {
		currentSessionId = sessionId;
	}

	// Handle player state changes from GuessTrack components
	function handlePlayerStateChange(isLoading: boolean) {
		onPlayerStateChange?.(isLoading);
	}

	// Debounced search function
	function debounceSearch(query: string) {
		clearTimeout(debounceTimer);
		
		// Stop any ongoing loading when starting new search
		if (query.trim().length === 0) {
			searchResults = [];
			showDropdown = false;
			searchError = null;
			loadingMessages.stopLoading();
			return;
		}

		// If it's a Spotify URL, search immediately without debounce
		if (isSpotifyUrl(query.trim())) {
			searchItems(query);
			return;
		}

		debounceTimer = setTimeout(async () => {
			await searchItems(query);
		}, 300);
	}

	// Search for artists, albums, and playlists
	async function searchItems(query: string) {
		if (query.trim().length === 0) return;

		// Check if the query is a Spotify URL
		const urlInfo = parseSpotifyUrl(query);
		if (urlInfo) {
			if (urlInfo.type === 'track') {
				searchError = 'Track URLs are not supported. Please use artist, album, or playlist URLs.';
				searchResults = [];
				showDropdown = false;
				return;
			}
			await fetchFromSpotifyUrl(urlInfo.type as SearchResultType, urlInfo.id);
			return;
		}

		isSearching = true;
		searchError = null;

		try {
			const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);

			if (!response.ok) {
				throw new Error(`Search failed: ${response.statusText}`);
			}

			const results: SearchResult[] = await response.json();
			searchResults = results;
			showDropdown = results.length > 0;
			selectedIndex = -1;
		} catch (error) {
			console.error('Search error:', error);
			searchError = 'Failed to search. Please try again.';
			searchResults = [];
			showDropdown = false;
		} finally {
			isSearching = false;
		}
	}

	// Fetch item directly from Spotify URL
	async function fetchFromSpotifyUrl(type: SearchResultType, id: string) {
		isSearching = true;
		searchError = null;
		showDropdown = false;

		try {
			// Fetch the item metadata
			const response = await fetch(`/api/spotify/${type}?${type}Id=${encodeURIComponent(id)}`);

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} not found`);
				} else if (response.status === 400) {
					const errorText = await response.text();
					throw new Error(errorText || `Invalid ${type}`);
				}
				throw new Error(`Failed to fetch ${type}: ${response.statusText}`);
			}

			const item: SearchResult = await response.json();

			// Directly proceed to fetch tracks for this item
			await fetchTracks(item);
		} catch (error) {
			console.error('URL fetch error:', error);
			searchError = error instanceof Error ? error.message : `Failed to fetch ${type} from URL.`;
		} finally {
			isSearching = false;
		}
	}

	// Fetch tracks for selected item
	async function fetchTracks(item: SearchResult) {
		const type = (item as any).type as SearchResultType;
		selectedItem = item;
		selectedType = type;
		searchQuery = item.name;
		showDropdown = false;
		isFetchingTracks = true;
		tracksError = null;
		tracks = [];

		// Determine if this is likely a large collection
		const isLargeCollection = determineIfLargeCollection(item, type);

		// Start loading messages
		loadingMessages.startLoading(item.name, type as ItemType, isLargeCollection);

		try {
			let response;

			if (type === 'artist') {
				response = await fetch(
					`/api/spotify/artist-tracks?artistId=${encodeURIComponent(item.id)}`
				);
			} else if (type === 'album') {
				response = await fetch(`/api/spotify/album-tracks?albumId=${encodeURIComponent(item.id)}`);
			} else if (type === 'playlist') {
				response = await fetch(
					`/api/spotify/playlist-tracks?playlistId=${encodeURIComponent(item.id)}`
				);
			} else {
				throw new Error('Unknown item type');
			}

			if (!response.ok) {
				throw new Error(`Failed to fetch tracks: ${response.statusText}`);
			}

			const fetchedTracks: GameTrack[] = await response.json();
			tracks = fetchedTracks;
		} catch (error) {
			console.error('Tracks error:', error);
			tracksError = `Failed to fetch ${type} tracks. Please try again.`;
			tracks = [];
		} finally {
			isFetchingTracks = false;
			loadingMessages.stopLoading();
		}
	}

	// Helper function to determine if a collection is likely large
	function determineIfLargeCollection(item: SearchResult, type: SearchResultType): boolean {
		if (type === 'playlist') {
			// Check if playlist has more than 100 tracks
			const playlistItem = item as any;
			return playlistItem.tracks?.total > 100;
		}
		
		if (type === 'artist') {
			// For artists, we could check popularity or known prolific artists
			// For now, we'll use a simple heuristic based on name recognition or assume larger artists
			// In the future, we could use additional API data to make this smarter
			const artistItem = item as any;
			// Very popular artists (high follower count) likely have large catalogs
			return artistItem.followers?.total > 1000000 || artistItem.popularity > 80;
		}
		
		// Albums are typically not that large, but compilations might be
		if (type === 'album') {
			const albumItem = item as any;
			// Check for compilation albums or box sets which tend to be larger
			return albumItem.total_tracks > 20 || 
				   albumItem.name.toLowerCase().includes('compilation') ||
				   albumItem.name.toLowerCase().includes('collection') ||
				   albumItem.name.toLowerCase().includes('box set');
		}
		
		return false;
	}

	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (!showDropdown || searchResults.length === 0) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = selectedIndex < searchResults.length - 1 ? selectedIndex + 1 : 0;
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : searchResults.length - 1;
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
					fetchTracks(searchResults[selectedIndex]);
				}
				break;
			case 'Escape':
				showDropdown = false;
				selectedIndex = -1;
				break;
		}
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (searchInputRef && !searchInputRef.contains(target)) {
			showDropdown = false;
			selectedIndex = -1;
		}
	}

	// Handle input changes
	function handleInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		searchQuery = input.value;

		// If it's a Spotify URL, don't show dropdown and search immediately
		if (isSpotifyUrl(searchQuery.trim())) {
			showDropdown = false;
			debounceSearch(searchQuery);
		} else {
			debounceSearch(searchQuery);
		}
	}

	// Get icon for result type
	function getTypeIcon(type: SearchResultType) {
		switch (type) {
			case 'artist':
				return Music;
			case 'album':
				return Album;
			case 'playlist':
				return ListMusic;
		}
	}

	// Get display name for result type
	function getTypeName(type: SearchResultType) {
		switch (type) {
			case 'artist':
				return 'Artist';
			case 'album':
				return 'Album';
			case 'playlist':
				return 'Playlist';
		}
	}

	// Get subtitle for search result
	function getSubtitle(item: SearchResult, type: SearchResultType) {
		switch (type) {
			case 'artist':
				return null;
			case 'album':
				return (item as any).artist || 'Unknown Artist';
			case 'playlist':
				const playlist = item as any;
				const ownerName = playlist.owner?.display_name || 'Unknown User';
				return playlist.isUserOwned ? `${ownerName} • Your Playlist` : ownerName;
		}
	}

	// Reset search when input is cleared
	$effect(() => {
		if (searchQuery.trim().length === 0) {
			searchResults = [];
			showDropdown = false;
			selectedItem = null;
			selectedType = null;
			tracks = [];
			searchError = null;
			tracksError = null;
		}
	});

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
			clearTimeout(debounceTimer);
		};
	});

	onDestroy(() => {
		// Clean up loading messages when component is destroyed
		loadingMessages.stopLoading();
		clearTimeout(debounceTimer);
	});
</script>

<div class="mx-auto w-full max-w-2xl space-y-6">
	<!-- Search Input -->
	<div class="relative">
		<div class="relative">
			<Search class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
			<Input
				bind:ref={searchInputRef}
				bind:value={searchQuery}
				placeholder="Search for artists, albums, or playlists..."
				class="focus-visible:ring-spotify-green focus:border-spotify-green border-[#282828] bg-[#282828] pr-10 pl-10 text-white placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
				onInput={handleInput}
				onKeydown={handleKeydown}
				onFocus={() => {
					if (searchResults.length > 0) {
						showDropdown = true;
					}
				}}
			/>
			{#if isSearching}
				<Loader2
					class="absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 transform animate-spin text-gray-400"
				/>
			{/if}
		</div>

		<!-- Search Results Dropdown -->
		{#if showDropdown && searchResults.length > 0}
			<div
				class="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border shadow-lg"
				style="border-color: #282828; background-color: #181818;"
			>
				{#each searchResults as item, index}
					{@const type = (item as any).type as SearchResultType}
					{@const Icon = getTypeIcon(type)}
					{@const subtitle = getSubtitle(item, type)}
					<button
						class="flex w-full items-center gap-3 p-3 transition-colors focus:outline-none"
						style="background-color: {selectedIndex === index ? '#282828' : 'transparent'};"
						onmouseenter={() => (selectedIndex = index)}
						onclick={() => fetchTracks(item)}
					>
						{#if item.images.length > 0}
							<img
								src={item.images[item.images.length - 1].url}
								alt={item.name}
								class="h-10 w-10 object-cover {type === 'artist' ? 'rounded-full' : 'rounded-sm'}"
							/>
						{:else}
							<div
								class="flex h-10 w-10 items-center justify-center {type === 'artist'
									? 'rounded-full'
									: 'rounded-sm'}"
								style="background-color: #282828;"
							>
								<Icon class="h-5 w-5 text-gray-400" />
							</div>
						{/if}
						<div class="flex flex-1 flex-col items-start">
							<span class="text-left font-medium text-white">{item.name}</span>
							{#if subtitle}
								<span class="text-xs text-gray-400">{subtitle}</span>
							{/if}
						</div>
						<span class="text-xs font-medium text-gray-400">{getTypeName(type)}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Search Note -->
	<div class="flex items-center justify-center gap-2 text-center text-xs text-gray-400">
		<span>
			Can't find what you're looking for? You can paste a Spotify share link for any artist, album,
			or playlist.
		</span>
	</div>

	<!-- Search Error -->
	{#if searchError}
		<div class="rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
			{searchError}
		</div>
	{/if}

	<!-- Loading State for Tracks -->
	{#if isFetchingTracks && selectedItem && selectedType}
		<LoadingMessages />
	{/if}

	<!-- Tracks Error -->
	{#if tracksError}
		<div class="rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
			{tracksError}
		</div>
	{/if}

	<!-- Tracks List -->
	{#if tracks.length > 0 && selectedItem && selectedType}
		<div class="space-y-6">
			<!-- Guess Track Component -->
			{#if gameMode === 'classic'}
				<GuessTrackClassic {tracks} item={selectedItem} itemType={selectedType} {playbackMode} onSessionChange={handleSessionChange} onPlayerStateChange={handlePlayerStateChange} />
			{:else}
				<GuessTrack {tracks} item={selectedItem} itemType={selectedType} {playbackMode} onSessionChange={handleSessionChange} onPlayerStateChange={handlePlayerStateChange} />
			{/if}

			<!-- Game History Component -->
			<GameHistory {history} {currentSessionId} />
		</div>
	{:else if selectedItem && selectedType && !isFetchingTracks && !tracksError}
		<div class="p-8 text-center text-gray-400">
			<Music class="mx-auto mb-4 h-12 w-12 opacity-50" />
			<p>No tracks found for {selectedItem.name} that meet the criteria.</p>
			<p class="mt-2 text-sm">Looking for tracks over 30 seconds that can be played in the game.</p>
		</div>
	{:else if history.length > 0}
		<!-- Show history even when no current game is active -->
		<GameHistory {history} {currentSessionId} />
	{/if}
</div>
