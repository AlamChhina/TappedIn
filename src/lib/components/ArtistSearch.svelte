<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Search, Music, Loader2, Album, ListMusic, ExternalLink } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import GuessTrack from './GuessTrack.svelte';
	import type { GameTrack, SearchResult, SearchResultType } from '$lib/types';
	import { parseSpotifyUrl, isSpotifyUrl } from '$lib/utils/spotifyUrl';

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

	// Debounced search function
	function debounceSearch(query: string) {
		clearTimeout(debounceTimer);

		if (query.trim().length === 0) {
			searchResults = [];
			showDropdown = false;
			searchError = null;
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
		}
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
		<div class="flex items-center justify-center gap-2 p-8 text-gray-400">
			<Loader2 class="h-6 w-6 animate-spin" />
			<span>Fetching tracks from {selectedItem.name}...</span>
		</div>
	{/if}

	<!-- Tracks Error -->
	{#if tracksError}
		<div class="rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
			{tracksError}
		</div>
	{/if}

	<!-- Tracks List -->
	{#if tracks.length > 0 && selectedItem && selectedType}
		<div class="space-y-4">
			<!-- Guess Track Component -->
			<GuessTrack {tracks} item={selectedItem} itemType={selectedType} />
		</div>
	{:else if selectedItem && selectedType && !isFetchingTracks && !tracksError}
		<div class="p-8 text-center text-gray-400">
			<Music class="mx-auto mb-4 h-12 w-12 opacity-50" />
			<p>No tracks found for {selectedItem.name} that meet the criteria.</p>
			<p class="mt-2 text-sm">Looking for tracks over 30 seconds that can be played in the game.</p>
		</div>
	{/if}
</div>
