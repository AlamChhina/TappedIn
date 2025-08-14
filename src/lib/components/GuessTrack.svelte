<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { tick } from 'svelte';
	import {
		Play,
		RotateCcw,
		CheckCircle,
		XCircle,
		Loader2,
		AlertCircle,
		Flame,
		Music
	} from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { normalizeTitle } from '$lib/utils/normalizeTitle';
	import { pickRandom } from '$lib/utils/random';
	import type {
		GameTrack,
		PlayerState,
		GuessStatus,
		Artist,
		SearchResult,
		SearchResultType
	} from '$lib/types';

	// Normalize text for search - remove punctuation and extra spaces for better matching
	function normalizeForSearch(text: string): string {
		return (
			text
				.toLowerCase()
				// Normalize Unicode characters and remove diacritics (accents)
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				// Replace common variations to be more forgiving
				.replace(/&/g, 'and') // Convert & to "and"
				.replace(/\b(feat|ft)\.?\s/gi, '') // Remove "feat." or "ft."
				// Remove all punctuation and special characters, keep only letters, numbers, and spaces
				.replace(/[^\w\s]/g, '')
				// Collapse multiple spaces into single spaces
				.replace(/\s+/g, ' ')
				.trim()
		);
	}

	// Props
	interface Props {
		tracks: GameTrack[];
		item?: SearchResult;
		itemType?: SearchResultType;
		// Legacy props for backward compatibility
		artist?: Artist;
		artistName?: string;
	}

	let { tracks, item, itemType, artist, artistName }: Props = $props();

	// Derive display properties from the selected item
	const displayName = $derived(() => {
		if (item) return item.name;
		if (artist) return artist.name;
		return artistName || 'Unknown';
	});

	const displayImage = $derived(() => {
		if (item && item.images.length > 0) return item.images[0].url;
		if (artist && artist.images.length > 0) return artist.images[0].url;
		return null;
	});

	const displayType = $derived(() => {
		if (itemType) return itemType;
		return 'artist'; // Default for backward compatibility
	});

	const headerText = $derived(() => {
		switch (displayType()) {
			case 'artist':
				return `Guess the song by ${displayName()}`;
			case 'album':
				return `Guess songs from ${displayName()}`;
			case 'playlist':
				return `Guess songs from ${displayName()}`;
			default:
				return `Guess the song by ${displayName()}`;
		}
	});

	const playingText = $derived(() => {
		switch (displayType()) {
			case 'artist':
				return `Playing songs by ${displayName()}`;
			case 'album':
				return `Playing songs from "${displayName()}"`;
			case 'playlist':
				return `Playing songs from "${displayName()}"`;
			default:
				return `Playing songs by ${displayName()}`;
		}
	});

	// Component state
	let playerState = $state<PlayerState>('idle');
	let deviceId = $state<string | null>(null);
	let currentTrack = $state<GameTrack | null>(null);
	let usedTracks = $state<Set<string>>(new Set()); // Track used songs to avoid repeats
	let guessStatus = $state<GuessStatus>('idle');
	let guessInput = $state('');
	let suggestions = $state<GameTrack[]>([]);
	let hoveredSuggestionIndex = $state<number | null>(null);
	let selectedSuggestionIndex = $state<number>(0); // Track keyboard selection
	let isTransferring = $state(false);
	let isPlaying = $state(false);
	let errorMessage = $state<string | null>(null);
	let showAnswer = $state(false);
	let canAdvance = $state(false); // Separate state for when Enter can advance
	let streak = $state(0); // Track correct guesses in a row
	let retryCount = $state(0); // Track auto-retry attempts
	let isFirstSongForArtist = $state(true); // Track if this is the first song for current artist
	let hasPlayedFirstSong = $state(false); // Track if first song has been manually played

	// Spotify SDK references
	let player: any = null;
	let sdkLoaded = false;
	let guessInputElement = $state<HTMLInputElement | null>(null);

	// Filter suggestions based on input
	$effect(() => {
		if (!guessInput.trim() || showAnswer) {
			suggestions = [];
			hoveredSuggestionIndex = null;
			selectedSuggestionIndex = 0;
			return;
		}

		const normalizedQuery = normalizeForSearch(guessInput);

		// Score tracks based on how well they match the query
		const scoredTracks = tracks
			.map((track) => {
				const normalizedTrackName = normalizeForSearch(track.name);

				// For playlists, also consider artist names in the search
				let searchTargets: string[] = [];

				if (displayType() === 'playlist') {
					// For playlists, only include "track artist" combinations (not just track name)
					searchTargets = [
						...track.artistNames.map((artist) => normalizeForSearch(`${track.name} ${artist}`)),
						// Add combined artist search
						normalizeForSearch(`${track.name} ${track.artistNames.join(', ')}`)
					];
				} else {
					// For artists and albums, just the track name is sufficient
					searchTargets = [normalizedTrackName];
				}

				// Calculate match score across all search targets (higher is better)
				let score = 0;

				for (const target of searchTargets) {
					// Exact match gets highest score
					if (target === normalizedQuery) {
						score = Math.max(score, 1000);
					}
					// Starts with query gets high score
					else if (target.startsWith(normalizedQuery)) {
						score = Math.max(score, 500);
					}
					// Contains query gets medium score
					else if (target.includes(normalizedQuery)) {
						score = Math.max(score, 100);
					}
				}

				// No match found
				if (score === 0) {
					return null;
				}

				// Bonus points for shorter titles (more likely to be exact matches)
				score += Math.max(0, 50 - normalizedTrackName.length);

				return { track, score };
			})
			.filter(Boolean) // Remove null entries (no matches)
			.sort((a, b) => b!.score - a!.score) // Sort by score descending
			.slice(0, 5) // Limit to 5 suggestions
			.map((item) => item!.track);

		suggestions = scoredTracks;

		// Reset selection when suggestions change
		hoveredSuggestionIndex = null;
		selectedSuggestionIndex = 0;
	});

	// Load Spotify Web Playback SDK
	function loadSpotifySDK(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.log('Loading Spotify SDK...');

			if (sdkLoaded) {
				console.log('SDK already loaded');
				resolve();
				return;
			}

			// Check if SDK is already loaded
			if (window.Spotify) {
				console.log('SDK already available on window');
				sdkLoaded = true;
				resolve();
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://sdk.scdn.co/spotify-player.js';
			script.async = true;

			script.onload = () => {
				console.log('SDK script loaded, waiting for ready callback...');
				// Wait for Spotify SDK to be ready
				window.onSpotifyWebPlaybackSDKReady = () => {
					console.log('Spotify Web Playback SDK ready!');
					sdkLoaded = true;
					resolve();
				};

				// Add a timeout in case the ready callback never fires
				setTimeout(() => {
					if (!sdkLoaded) {
						console.error('SDK ready callback timeout');
						reject(new Error('SDK ready callback timeout'));
					}
				}, 15000); // Increased timeout to 15 seconds
			};

			script.onerror = () => {
				console.error('Failed to load SDK script');
				reject(new Error('Failed to load Spotify SDK'));
			};

			document.head.appendChild(script);
		});
	}

	// Get OAuth token for SDK
	async function getOAuthToken(callback: (token: string) => void) {
		try {
			console.log('Fetching OAuth token...');
			const response = await fetch('/api/spotify/sdk-token');
			if (!response.ok) {
				throw new Error(`Failed to get SDK token: ${response.status} ${response.statusText}`);
			}
			const data = await response.json();
			console.log('OAuth token received');
			callback(data.access_token);
		} catch (error) {
			console.error('Failed to get OAuth token:', error);
			errorMessage = 'Failed to authenticate with Spotify';
			playerState = 'error';
		}
	}

	// Initialize Spotify player
	async function initializePlayer() {
		try {
			console.log('Initializing Spotify player...');
			playerState = 'connecting';
			errorMessage = null;

			await loadSpotifySDK();
			console.log('SDK loaded, creating player...');

			// Add a small delay to ensure SDK is fully ready
			await new Promise((resolve) => setTimeout(resolve, 500));

			player = new window.Spotify.Player({
				name: 'Guess the Song Game',
				getOAuthToken: getOAuthToken,
				volume: 0.5
			});

			console.log('Player created, adding listeners...');

			// Error handling
			player.addListener('initialization_error', ({ message }: any) => {
				console.error('Initialization error:', message);
				errorMessage = `Player initialization failed: ${message}`;
				playerState = 'error';
			});

			player.addListener('authentication_error', ({ message }: any) => {
				console.error('Authentication error:', message);
				errorMessage = `Authentication failed: ${message}`;
				playerState = 'error';
			});

			player.addListener('account_error', ({ message }: any) => {
				console.error('Account error:', message);
				errorMessage = `Account error: ${message}. You may need Spotify Premium.`;
				playerState = 'error';
			});

			player.addListener('playback_error', ({ message }: any) => {
				console.error('Playback error:', message);
				errorMessage = `Playback failed: ${message}`;
			});

			// Ready event
			player.addListener('ready', ({ device_id }: any) => {
				console.log('Player ready with device ID:', device_id);
				deviceId = device_id;
				playerState = 'ready';
				// Don't auto-transfer playback since we want manual first play
			});

			// Not ready
			player.addListener('not_ready', ({ device_id }: any) => {
				console.log('Device has gone offline:', device_id);
				deviceId = null;
				// Don't set playerState to 'error' here - just log it
				// The error will show when user tries to play and it fails
			});

			// Connect the player
			console.log('Connecting player...');
			const success = await player.connect();
			console.log('Player connect result:', success);
			if (!success) {
				throw new Error('Failed to connect player');
			}
		} catch (error) {
			console.error('Player initialization failed:', error);
			errorMessage = error instanceof Error ? error.message : 'Failed to initialize player';
			playerState = 'error';

			// Auto-retry after a short delay if this is the first attempt (max 2 retries)
			if (retryCount < 2) {
				retryCount += 1;
				setTimeout(() => {
					if (playerState === 'error' && tracks.length > 0) {
						console.log(`Auto-retrying player initialization... (attempt ${retryCount + 1}/3)`);
						initializePlayer();
					}
				}, 2000);
			}
		}
	}

	// Transfer playback to our device
	async function transferPlayback() {
		if (!deviceId) return;

		try {
			isTransferring = true;

			const response = await fetch('/api/spotify/player/transfer', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ device_id: deviceId })
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Transfer failed:', errorText);
				// Don't set errorMessage here - let the play function handle device errors
				return false;
			}

			console.log('Playback transferred successfully');
			return true;
		} catch (error) {
			console.error('Transfer failed:', error);
			// Don't set errorMessage here - let the play function handle device errors
			return false;
		} finally {
			isTransferring = false;
		}
	}

	// Pick a random unused track
	function pickUnusedTrack(): GameTrack | null {
		const availableTracks = tracks.filter((track) => !usedTracks.has(track.id));

		console.log('Available tracks:', availableTracks.length, 'out of', tracks.length);

		// If all tracks have been used, reset the used tracks set
		if (availableTracks.length === 0) {
			console.log('All tracks used, resetting...');
			usedTracks.clear();
			return pickRandom(tracks);
		}

		const selectedTrack = pickRandom(availableTracks);
		console.log('Selected track from available:', selectedTrack?.name);
		return selectedTrack;
	}

	// Skip to next track (simplified version without queue)
	async function skipToNext() {
		// Reset advance state
		canAdvance = false;

		// Add a small delay to ensure Spotify finishes processing the current track
		await new Promise((resolve) => setTimeout(resolve, 200));

		await startRound(true); // Start a new round with auto-play enabled

		// Re-focus the input for the next round (only if it's not the first song)
		await tick(); // Wait for DOM update
		if (guessInputElement && !showAnswer && !isFirstSongForArtist) {
			guessInputElement.focus();
		}
	}

	// Start a new round
	async function startRound(autoPlay = false) {
		if (tracks.length === 0) return;

		// Always pick a fresh track (no preloading to avoid queue issues)
		const newTrack = pickUnusedTrack();
		if (!newTrack) return;

		console.log('=== Starting new round ===');
		console.log('Previous track:', currentTrack?.name || 'None');
		console.log('New track selected:', newTrack.name);
		console.log('Track URI:', newTrack.uri);
		console.log('Used tracks count:', usedTracks.size);
		console.log('Auto-play:', autoPlay);

		// Mark this track as used
		usedTracks.add(newTrack.id);

		currentTrack = newTrack;
		guessStatus = 'idle';
		guessInput = '';
		suggestions = [];
		showAnswer = false;
		canAdvance = false; // Reset advance state
		errorMessage = null; // Clear any previous errors when starting new round

		// Auto-play the new track only if autoPlay is true (subsequent songs)
		if (autoPlay && playerState === 'ready' && deviceId) {
			await playFromStart();
		}
	}

	// Play current track from start
	async function playFromStart() {
		if (!currentTrack || !deviceId) {
			errorMessage = 'No device connected. Please ensure Spotify is open and try again.';
			return;
		}

		try {
			isPlaying = true;
			errorMessage = null; // Clear any previous errors

			console.log('=== Starting playback ===');
			console.log('Track:', currentTrack.name);
			console.log('URI:', currentTrack.uri);
			console.log('Device ID:', deviceId);

			// Always use a fresh play request with specific URI to avoid queue issues
			const payload = {
				uris: [currentTrack.uri],
				position_ms: 0
			};

			const response = await fetch(`/api/spotify/player/play?device_id=${deviceId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			// If we get a 404 (no active device), try to transfer playback first and retry
			if (response.status === 404) {
				console.log('Device not active, attempting transfer...');
				const transferSuccessful = await transferPlayback();
				if (transferSuccessful) {
					// Wait a moment for transfer to complete, then retry
					await new Promise((resolve) => setTimeout(resolve, 500));

					const retryResponse = await fetch(`/api/spotify/player/play?device_id=${deviceId}`, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(payload)
					});

					if (!retryResponse.ok) {
						const errorText = await retryResponse.text();
						throw new Error(errorText);
					}
				} else {
					throw new Error('No active device found - please ensure Spotify is open and try again.');
				}
			} else if (!response.ok) {
				const errorText = await response.text();
				console.error('Play API response error:', response.status, errorText);
				throw new Error(errorText);
			}

			console.log('✅ Playback started successfully for:', currentTrack.name);

			// Mark that first song has been played for this artist and focus input
			if (isFirstSongForArtist) {
				hasPlayedFirstSong = true;
				isFirstSongForArtist = false;
				// Focus the input after the first song starts playing
				setTimeout(() => {
					if (guessInputElement) {
						guessInputElement.focus();
					}
				}, 100);
			}
		} catch (error) {
			console.error('❌ Play failed:', error);
			errorMessage = error instanceof Error ? error.message : 'Failed to play track';
		} finally {
			isPlaying = false;
		}
	}

	// Submit guess
	function submitGuess() {
		if (!currentTrack || !guessInput.trim()) return;

		const normalizedGuess = normalizeTitle(guessInput.trim());
		const normalizedTitle = normalizeTitle(currentTrack.name);

		// For playlists, we need to check both title and artist match
		// For albums and artists, just check the title (since artist is implied)
		let isCorrect = false;

		if (displayType() === 'playlist') {
			// For playlists, require both title and artist to be specified
			// Check if the guess matches "title artist" combinations
			const possibleAnswers = [
				// Title with any of the artists
				...currentTrack.artistNames.map((artist) =>
					normalizeTitle(`${currentTrack!.name} ${artist}`)
				),
				// All artists combined
				normalizeTitle(`${currentTrack.name} ${currentTrack.artistNames.join(', ')}`)
			];

			isCorrect = possibleAnswers.some((answer) => normalizedGuess === answer);
		} else {
			// For artist and album types, just check the title (since artist is implied)
			isCorrect = normalizedGuess === normalizedTitle;
		}

		if (isCorrect) {
			guessStatus = 'correct';
			showAnswer = true;
			streak += 1; // Increment streak on correct guess
		} else {
			guessStatus = 'incorrect';
			showAnswer = true; // Show answer on incorrect guess too
			streak = 0; // Reset streak on incorrect guess
		}

		// Allow advancing to next song after a very short delay
		setTimeout(() => {
			canAdvance = true;
		}, 50); // 50ms delay - just enough to prevent immediate skip
	}

	// Handle keyboard navigation in input
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();

			// If answer is shown and we can advance, go to next song
			if (showAnswer && canAdvance) {
				skipToNext();
				return;
			}

			// If there are suggestions and answer not shown, select the highlighted one
			if (suggestions.length > 0 && !showAnswer) {
				const indexToSelect =
					hoveredSuggestionIndex !== null ? hoveredSuggestionIndex : selectedSuggestionIndex;
				selectSuggestion(suggestions[indexToSelect]);
			}
			// Do nothing if no suggestions or answer already shown (but can't advance yet)
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (suggestions.length > 0) {
				selectedSuggestionIndex = (selectedSuggestionIndex + 1) % suggestions.length;
				hoveredSuggestionIndex = null; // Clear mouse hover when using keyboard
			}
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (suggestions.length > 0) {
				selectedSuggestionIndex =
					selectedSuggestionIndex === 0 ? suggestions.length - 1 : selectedSuggestionIndex - 1;
				hoveredSuggestionIndex = null; // Clear mouse hover when using keyboard
			}
		}
	}

	// Handle global Enter key for next song
	function handleGlobalKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && showAnswer && canAdvance) {
			event.preventDefault();
			skipToNext();
		}
	}

	// Select suggestion
	function selectSuggestion(track: GameTrack) {
		guessInput = track.name;
		suggestions = [];
		submitGuess();
	}

	// Initialize on mount
	onMount(() => {
		// Add global keydown listener
		document.addEventListener('keydown', handleGlobalKeydown);

		// Reset retry count when component mounts
		retryCount = 0;

		// Delay initialization slightly to ensure DOM is ready
		setTimeout(() => {
			if (tracks.length > 0) {
				initializePlayer();
			}
		}, 100);
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (player) {
			player.disconnect();
		}

		// Remove global keydown listener
		document.removeEventListener('keydown', handleGlobalKeydown);
	});

	// Auto-start first round when player is ready
	$effect(() => {
		if (playerState === 'ready' && !currentTrack && tracks.length > 0) {
			startRound(false); // Don't auto-play the first song
		}
	});

	// Initialize player when tracks change (new artist selected)
	$effect(() => {
		if (tracks.length > 0 && playerState === 'idle') {
			retryCount = 0;
			// Reset first song state when tracks change (new artist)
			isFirstSongForArtist = true;
			hasPlayedFirstSong = false;
			initializePlayer();
		}
	});

	// Auto-focus input when a new round starts (but only if first song has been played)
	$effect(() => {
		if (currentTrack && !showAnswer && !isFirstSongForArtist && guessInputElement) {
			setTimeout(() => {
				guessInputElement?.focus();
			}, 100);
		}
	});
</script>

<div class="mx-auto w-full max-w-2xl space-y-6">
	<div
		class="rounded-lg border p-6"
		style="border-color: #282828; background-color: rgba(18, 18, 18, 0.6);"
	>
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<!-- Item Image -->
				{#if displayImage()}
					<img
						src={displayImage()}
						alt={displayName()}
						class="h-12 w-12 border-2 object-cover {displayType() === 'artist'
							? 'rounded-full'
							: 'rounded-sm'}"
						style="border-color: #282828;"
					/>
				{:else}
					<div
						class="flex h-12 w-12 items-center justify-center border-2 {displayType() === 'artist'
							? 'rounded-full'
							: 'rounded-sm'}"
						style="background-color: #282828; border-color: #181818;"
					>
						<Music class="h-6 w-6 text-gray-400" />
					</div>
				{/if}

				<h3 class="text-xl font-semibold text-white">
					{headerText()}
				</h3>
			</div>

			<!-- Streak Counter -->
			<div
				class="flex items-center gap-2 rounded-lg px-3 py-1.5"
				style="background-color: rgba(40, 40, 40, 0.6);"
			>
				{#if streak >= 3}
					<Flame class="h-4 w-4 text-orange-400" />
				{/if}
				<div class="text-sm font-medium text-gray-300">Streak:</div>
				<div class="text-lg font-bold {streak > 0 ? 'text-spotify-green' : 'text-gray-400'}">
					{streak}
				</div>
			</div>
		</div>

		<!-- Player Status -->
		<div class="mb-6">
			{#if playerState === 'idle'}
				<div class="flex items-center gap-2 text-gray-400">
					<Loader2 class="h-4 w-4 animate-spin" />
					<span>Initializing player...</span>
				</div>
			{:else if playerState === 'connecting'}
				<div class="flex items-center gap-4 text-blue-400">
					<div class="flex items-center gap-2">
						<Loader2 class="h-4 w-4 animate-spin" />
						<span>Connecting to Spotify...</span>
					</div>
					<Button
						onclick={() => {
							retryCount = 0;
							initializePlayer();
						}}
						size="sm"
						variant="outline">Retry Connection</Button
					>
				</div>
			{:else if playerState === 'ready'}
				<div class="text-spotify-green flex items-center gap-2">
					<CheckCircle class="h-4 w-4" />
					<span>Player connected</span>
					{#if isTransferring}
						<span class="text-gray-400">(transferring...)</span>
					{/if}
				</div>
			{:else if playerState === 'error'}
				<div class="flex items-center gap-4 text-red-400">
					<div class="flex items-center gap-2">
						<AlertCircle class="h-4 w-4" />
						<span>Connection failed</span>
					</div>
					<Button
						onclick={() => {
							retryCount = 0;
							initializePlayer();
						}}
						size="sm"
						variant="outline">Retry Connection</Button
					>
				</div>
			{/if}
		</div>

		<!-- Error Message -->
		{#if errorMessage}
			<div class="mb-4 rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
				<p>{errorMessage}</p>
				{#if errorMessage.includes('Premium')}
					<p class="mt-2 text-xs text-gray-400">
						Note: Spotify Web Playback SDK requires a Spotify Premium subscription.
					</p>
				{/if}
				{#if playerState === 'error'}
					<p class="mt-2 text-xs text-gray-400">
						Try opening Spotify in another tab first, then retry the connection.
					</p>
				{/if}
			</div>
		{/if}

		<!-- Current Track Info -->
		{#if currentTrack}
			<div class="mb-6">
				<div class="mb-4 flex items-center gap-4">
					<Button
						onclick={playFromStart}
						disabled={playerState !== 'ready' || !deviceId || isPlaying}
						class="flex items-center gap-2"
					>
						{#if isPlaying}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else if isFirstSongForArtist}
							<Play class="h-4 w-4" />
						{:else}
							<RotateCcw class="h-4 w-4" />
						{/if}
						{isFirstSongForArtist ? 'Play' : 'Replay'}
					</Button>
				</div>

				<!-- Guess Input -->
				<div class="relative mb-4">
					<input
						bind:this={guessInputElement}
						bind:value={guessInput}
						placeholder={isFirstSongForArtist
							? 'Press play to start guessing...'
							: 'Enter your guess...'}
						disabled={showAnswer || isFirstSongForArtist}
						class="focus:border-spotify-green focus:ring-spotify-green flex h-10 w-full rounded-md border px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						style="border-color: #282828; background-color: #121212; --tw-ring-offset-color: #121212;"
						onkeydown={handleKeydown}
					/>

					<!-- Suggestions Dropdown -->
					{#if suggestions.length > 0 && !showAnswer}
						<div
							class="absolute top-full right-0 left-0 z-50 mt-1 max-h-32 overflow-y-auto rounded-md border shadow-lg"
							style="border-color: #282828; background-color: #181818;"
						>
							{#each suggestions as suggestion, index}
								<button
									class="w-full px-3 py-2 text-left text-sm text-white"
									style="background-color: {hoveredSuggestionIndex === index ||
									(hoveredSuggestionIndex === null && selectedSuggestionIndex === index)
										? '#282828'
										: 'transparent'};"
									onmouseenter={() => (hoveredSuggestionIndex = index)}
									onmouseleave={() => (hoveredSuggestionIndex = null)}
									onclick={() => selectSuggestion(suggestion)}
								>
									<div class="flex flex-col">
										<span class="font-medium">{suggestion.name}</span>
										{#if displayType() === 'playlist'}
											<span class="mt-0.5 text-xs text-gray-400"
												>{suggestion.artistNames.join(', ')}</span
											>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Guess Status -->
				<div class="mb-4 flex items-center gap-4">
					{#if guessStatus === 'correct'}
						<div class="text-spotify-green flex items-center gap-2">
							<CheckCircle class="h-5 w-5" />
							<span>Correct!</span>
						</div>
					{:else if guessStatus === 'incorrect'}
						<div class="flex items-center gap-2 text-red-400">
							<XCircle class="h-5 w-5" />
							<span>Incorrect!</span>
						</div>
					{/if}
					<!-- //mobile button, will add later -->
					<!-- {#if !showAnswer && guessInput.trim()}
						<Button onclick={submitGuess} size="sm">Submit Guess</Button>
					{/if} -->
				</div>

				<!-- Show Answer -->
				{#if showAnswer}
					<div
						class="mb-4 rounded-md border p-3"
						style={guessStatus === 'correct'
							? 'border-color: #1DB954; background-color: rgba(29, 185, 84, 0.1);'
							: 'border-color: rgb(30 64 175); background-color: rgba(30, 64, 175, 0.1);'}
					>
						<p
							class="font-medium {guessStatus === 'correct'
								? 'text-spotify-green'
								: 'text-blue-400'}"
						>
							"{currentTrack.name}" by {currentTrack.artistNames.join(', ')}
						</p>
					</div>
				{/if}

				<!-- Next Button -->
				{#if showAnswer}
					<Button
						onclick={skipToNext}
						class="w-full {canAdvance ? '' : 'cursor-not-allowed opacity-50'}"
						disabled={!canAdvance}
					>
						Next Song {canAdvance ? '(Enter)' : ''}
					</Button>
				{/if}
			</div>
		{:else if playerState === 'ready'}
			<div class="py-8 text-center">
				<Button onclick={() => startRound(false)} disabled={tracks.length === 0}
					>Start Guessing</Button
				>
			</div>
		{/if}

		<!-- No Tracks Message -->
		{#if tracks.length === 0}
			<div class="py-8 text-center text-gray-400">
				<p>No tracks available for this artist.</p>
			</div>
		{/if}
	</div>
</div>
