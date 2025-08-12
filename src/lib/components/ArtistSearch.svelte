<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Search, Music, Loader2 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import GuessTrack from './GuessTrack.svelte';
	import type { GameTrack, Artist } from '$lib/types';

	// Component state
	let searchQuery = $state('');
	let searchResults = $state<Artist[]>([]);
	let selectedArtist = $state<Artist | null>(null);
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

		debounceTimer = setTimeout(async () => {
			await searchArtists(query);
		}, 300);
	}

	// Search for artists
	async function searchArtists(query: string) {
		if (query.trim().length === 0) return;

		isSearching = true;
		searchError = null;

		try {
			const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);

			if (!response.ok) {
				throw new Error(`Search failed: ${response.statusText}`);
			}

			const artists: Artist[] = await response.json();
			searchResults = artists;
			showDropdown = artists.length > 0;
			selectedIndex = -1;
		} catch (error) {
			console.error('Search error:', error);
			searchError = 'Failed to search artists. Please try again.';
			searchResults = [];
			showDropdown = false;
		} finally {
			isSearching = false;
		}
	}

	// Fetch tracks for selected artist
	async function fetchArtistTracks(artist: Artist) {
		selectedArtist = artist;
		searchQuery = artist.name;
		showDropdown = false;
		isFetchingTracks = true;
		tracksError = null;
		tracks = [];

		try {
			const response = await fetch(
				`/api/spotify/artist-tracks?artistId=${encodeURIComponent(artist.id)}`
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch tracks: ${response.statusText}`);
			}

			const artistTracks: GameTrack[] = await response.json();
			tracks = artistTracks;
		} catch (error) {
			console.error('Tracks error:', error);
			tracksError = 'Failed to fetch artist tracks. Please try again.';
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
					fetchArtistTracks(searchResults[selectedIndex]);
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
		debounceSearch(searchQuery);
	}

	// Reset search when input is cleared
	$effect(() => {
		if (searchQuery.trim().length === 0) {
			searchResults = [];
			showDropdown = false;
			selectedArtist = null;
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
				placeholder="Search for an artist..."
				class="pr-10 pl-10 text-white placeholder:text-gray-400 border-[#282828] bg-[#282828] focus-visible:ring-2 focus-visible:ring-spotify-green focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] focus:border-spotify-green"
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
				{#each searchResults as artist, index}
					<button
						class="flex w-full items-center gap-3 p-3 transition-colors focus:outline-none {selectedIndex ===
						index
							? ''
							: ''}"
						style="background-color: {selectedIndex === index ? '#282828' : 'transparent'};"
						onmouseenter={() => (selectedIndex = index)}
						onclick={() => fetchArtistTracks(artist)}
					>
						{#if artist.images.length > 0}
							<img
								src={artist.images[artist.images.length - 1].url}
								alt={artist.name}
								class="h-10 w-10 rounded-full object-cover"
							/>
						{:else}
							<div class="flex h-10 w-10 items-center justify-center rounded-full" style="background-color: #282828;">
								<Music class="h-5 w-5 text-gray-400" />
							</div>
						{/if}
						<div class="flex flex-1 items-center justify-between">
							<span class="text-left text-white">{artist.name}</span>
							<span class="text-xs text-gray-400 font-medium">Artist</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Search Error -->
	{#if searchError}
		<div class="rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
			{searchError}
		</div>
	{/if}

	<!-- Loading State for Tracks -->
	{#if isFetchingTracks}
		<div class="flex items-center justify-center gap-2 p-8 text-gray-400">
			<Loader2 class="h-6 w-6 animate-spin" />
			<span>Fetching tracks for {selectedArtist?.name}...</span>
		</div>
	{/if}

	<!-- Tracks Error -->
	{#if tracksError}
		<div class="rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
			{tracksError}
		</div>
	{/if}

	<!-- Tracks List -->
	{#if tracks.length > 0 && selectedArtist}
		<div class="space-y-4">
			<!-- Comment out the tracks list display for now -->
			<!-- 
			<h3 class="text-xl font-semibold text-white">
				Primary tracks by {selectedArtist.name} ({tracks.length} songs)
			</h3>

			<div class="space-y-2 rounded-lg border p-4" style="border-color: #282828; background-color: rgba(18, 18, 18, 0.6);">
				{#each tracks as track, index}
					<div
						class="flex items-center justify-between rounded p-2 transition-colors"
						style="hover:background-color: rgba(40, 40, 40, 0.5);"
					>
						<div class="flex-1">
							<span class="font-medium text-white">{track.name}</span>
							{#if track.artistNames.length > 1}
								<span class="ml-2 text-sm text-gray-400">
									(feat. {track.artistNames.slice(1).join(', ')})
								</span>
							{/if}
						</div>
						<span class="ml-4 text-sm font-medium text-spotify-green">
							{track.popularity}
						</span>
					</div>
				{/each}
			</div>
			-->

			<!-- Guess Track Component -->
			<GuessTrack {tracks} artist={selectedArtist} />
		</div>
	{:else if selectedArtist && !isFetchingTracks && !tracksError}
		<div class="p-8 text-center text-gray-400">
			<Music class="mx-auto mb-4 h-12 w-12 opacity-50" />
			<p>No tracks found for {selectedArtist.name} that meet the criteria.</p>
			<p class="mt-2 text-sm">
				Looking for primary tracks over 30 seconds from albums and singles.
			</p>
		</div>
	{/if}
</div>
