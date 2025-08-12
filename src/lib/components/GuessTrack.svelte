<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { tick } from 'svelte';
	import { Play, RotateCcw, CheckCircle, XCircle, Loader2, AlertCircle, Flame } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { normalizeTitle } from '$lib/utils/normalizeTitle';
	import { pickRandom } from '$lib/utils/random';
	import type { GameTrack, PlayerState, GuessStatus } from '$lib/types';

	// Props
	interface Props {
		tracks: GameTrack[];
		artistName?: string;
	}

	let { tracks, artistName = 'Unknown Artist' }: Props = $props();

	// Component state
	let playerState = $state<PlayerState>('idle');
	let deviceId = $state<string | null>(null);
	let currentTrack = $state<GameTrack | null>(null);
	let nextTrack = $state<GameTrack | null>(null); // Preloaded next track
	let usedTracks = $state<Set<string>>(new Set()); // Track used songs to avoid repeats
	let guessStatus = $state<GuessStatus>('idle');
	let guessInput = $state('');
	let suggestions = $state<GameTrack[]>([]);
	let hoveredSuggestionIndex = $state<number | null>(null);
	let selectedSuggestionIndex = $state<number>(0); // Track keyboard selection
	let isTransferring = $state(false);
	let isPlaying = $state(false);
	let isPreloading = $state(false);
	let errorMessage = $state<string | null>(null);
	let showAnswer = $state(false);
	let canAdvance = $state(false); // Separate state for when Enter can advance
	let streak = $state(0); // Track correct guesses in a row

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

		const query = guessInput.toLowerCase();
		suggestions = tracks.filter((track) => track.name.toLowerCase().includes(query)).slice(0, 5); // Limit to 5 suggestions
		
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
				}, 10000); // 10 second timeout
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
				transferPlayback();
			});

			// Not ready
			player.addListener('not_ready', ({ device_id }: any) => {
				console.log('Device has gone offline:', device_id);
				deviceId = null;
				playerState = 'error';
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
		}
	}

	// Transfer playback to our device
	async function transferPlayback() {
		if (!deviceId) return;

		try {
			isTransferring = true;
			errorMessage = null;

			const response = await fetch('/api/spotify/player/transfer', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ device_id: deviceId })
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText);
			}

			console.log('Playback transferred successfully');
		} catch (error) {
			console.error('Transfer failed:', error);
			errorMessage = error instanceof Error ? error.message : 'Failed to transfer playback';
		} finally {
			isTransferring = false;
		}
	}

	// Pick a random unused track
	function pickUnusedTrack(): GameTrack | null {
		const availableTracks = tracks.filter(track => !usedTracks.has(track.id));
		
		// If all tracks have been used, reset the used tracks set
		if (availableTracks.length === 0) {
			console.log('All tracks used, resetting...');
			usedTracks.clear();
			return pickRandom(tracks);
		}
		
		return pickRandom(availableTracks);
	}

	// Preload the next track by adding it to Spotify's queue
	async function preloadNextTrack() {
		if (isPreloading || tracks.length === 0 || !deviceId) return;
		
		try {
			isPreloading = true;
			const track = pickUnusedTrack();
			if (track) {
				nextTrack = track;
				console.log('Preloading next track to queue:', track.name);
				
				// Add the track to Spotify's queue for faster switching
				await fetch(`/api/spotify/player/queue?device_id=${deviceId}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ uri: track.uri })
				});
				
				console.log('Successfully queued next track:', track.name);
			}
		} catch (error) {
			console.error('Failed to preload next track:', error);
			// Don't throw error, just log it - preloading is optional
		} finally {
			isPreloading = false;
		}
	}

	// Skip to next track (optimized version using preloaded track)
	async function skipToNext() {
		// Reset advance state
		canAdvance = false;
		await startRound(); // Use the optimized startRound that uses preloaded tracks
		
		// Re-focus the input for the next round
		await tick(); // Wait for DOM update
		if (guessInputElement && !showAnswer) {
			guessInputElement.focus();
		}
	}

	// Start a new round
	async function startRound() {
		if (tracks.length === 0) return;

		// Use preloaded track if available, otherwise pick a new one
		let newTrack: GameTrack | null = null;
		
		if (nextTrack) {
			newTrack = nextTrack;
			nextTrack = null; // Clear the preloaded track
			console.log('Using preloaded track:', newTrack.name);
		} else {
			newTrack = pickUnusedTrack();
		}

		if (!newTrack) return;

		// Mark this track as used
		usedTracks.add(newTrack.id);
		
		currentTrack = newTrack;
		guessStatus = 'idle';
		guessInput = '';
		suggestions = [];
		showAnswer = false;
		canAdvance = false; // Reset advance state
		errorMessage = null;

		// Preload the next track while this one is playing
		preloadNextTrack();

		// Auto-play the new track
		if (playerState === 'ready' && deviceId) {
			await playFromStart();
		}
	}

	// Play current track from start
	async function playFromStart() {
		if (!currentTrack || !deviceId) return;

		try {
			isPlaying = true;
			errorMessage = null;

			// Prepare the request payload
			const payload = {
				uris: [currentTrack.uri],
				position_ms: 0
			};

			console.log('Starting playback for:', currentTrack.name);

			const response = await fetch(`/api/spotify/player/play?device_id=${deviceId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText);
			}

			console.log('Track started successfully:', currentTrack.name);
		} catch (error) {
			console.error('Play failed:', error);
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

		if (normalizedGuess === normalizedTitle) {
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
				const indexToSelect = hoveredSuggestionIndex !== null ? hoveredSuggestionIndex : selectedSuggestionIndex;
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
				selectedSuggestionIndex = selectedSuggestionIndex === 0 ? suggestions.length - 1 : selectedSuggestionIndex - 1;
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
		if (tracks.length > 0) {
			initializePlayer();
		}
		
		// Add global keydown listener
		document.addEventListener('keydown', handleGlobalKeydown);
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
			startRound();
		}
	});

	// Auto-focus input when a new round starts
	$effect(() => {
		if (currentTrack && !showAnswer && guessInputElement) {
			setTimeout(() => {
				guessInputElement?.focus();
			}, 100);
		}
	});
</script>

<div class="mx-auto w-full max-w-2xl space-y-6">
	<div class="rounded-lg border border-slate-700 bg-slate-800/60 p-6">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-xl font-semibold text-white">
				Guess the song by {artistName}
			</h3>
			
			<!-- Streak Counter -->
			<div class="flex items-center gap-2 rounded-lg bg-slate-700/60 px-3 py-1.5">
				{#if streak >= 3}
					<Flame class="h-4 w-4 text-orange-400" />
				{/if}
				<div class="text-sm font-medium text-gray-300">Streak:</div>
				<div class="text-lg font-bold {streak > 0 ? 'text-green-400' : 'text-gray-400'}">
					{streak}
				</div>
				{#if streak >= 5}
					<span class="text-xs font-medium text-orange-400">🔥</span>
				{/if}
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
					<Button onclick={initializePlayer} size="sm" variant="outline">Retry Connection</Button>
				</div>
			{:else if playerState === 'ready'}
				<div class="flex items-center gap-2 text-green-400">
					<CheckCircle class="h-4 w-4" />
					<span>Player connected</span>
					{#if isTransferring}
						<span class="text-gray-400">(transferring...)</span>
					{:else if isPreloading}
						<span class="text-blue-400">(preloading next...)</span>
					{/if}
				</div>
			{:else if playerState === 'error'}
				<div class="flex items-center gap-4 text-red-400">
					<div class="flex items-center gap-2">
						<AlertCircle class="h-4 w-4" />
						<span>Connection failed</span>
					</div>
					<Button onclick={initializePlayer} size="sm" variant="outline">Retry Connection</Button>
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
						{:else}
							<RotateCcw class="h-4 w-4" />
						{/if}
						Replay
					</Button>
				</div>

				<!-- Guess Input -->
				<div class="relative mb-4">
					<input
						bind:this={guessInputElement}
						bind:value={guessInput}
						placeholder="Enter your guess..."
						disabled={showAnswer}
						class="flex h-10 w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
						onkeydown={handleKeydown}
					/>

					<!-- Suggestions Dropdown -->
					{#if suggestions.length > 0 && !showAnswer}
						<div
							class="absolute top-full right-0 left-0 z-50 mt-1 max-h-32 overflow-y-auto rounded-md border border-slate-600 bg-slate-700 shadow-lg"
						>
							{#each suggestions as suggestion, index}
								<button
									class="w-full px-3 py-2 text-left text-sm text-white {
										hoveredSuggestionIndex === index || (hoveredSuggestionIndex === null && selectedSuggestionIndex === index)
											? 'bg-slate-600'
											: 'hover:bg-slate-600'
									}"
									onclick={() => selectSuggestion(suggestion)}
									onmouseenter={() => hoveredSuggestionIndex = index}
									onmouseleave={() => hoveredSuggestionIndex = null}
								>
									{suggestion.name}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Guess Status -->
				<div class="mb-4 flex items-center gap-4">
					{#if guessStatus === 'correct'}
						<div class="flex items-center gap-2 text-green-400">
							<CheckCircle class="h-5 w-5" />
							<span>Correct!</span>
						</div>
					{:else if guessStatus === 'incorrect'}
						<div class="flex items-center gap-2 text-red-400">
							<XCircle class="h-5 w-5" />
							<span>Incorrect!</span>
						</div>
					{/if}

					{#if !showAnswer && guessInput.trim()}
						<Button onclick={submitGuess} size="sm">Submit Guess</Button>
					{/if}
				</div>

				<!-- Show Answer -->
				{#if showAnswer}
					<div
						class="mb-4 rounded-md border {guessStatus === 'correct'
							? 'border-green-800 bg-green-900/20'
							: 'border-blue-800 bg-blue-900/20'} p-3"
					>
						<p class="font-medium {guessStatus === 'correct' ? 'text-green-400' : 'text-blue-400'}">
							"{currentTrack.name}" by {currentTrack.artistNames.join(', ')}
						</p>
					</div>
				{/if}

				<!-- Next Button -->
				{#if showAnswer}
					<Button 
						onclick={skipToNext} 
						class="w-full {canAdvance ? '' : 'opacity-50 cursor-not-allowed'}"
						disabled={!canAdvance}
					>
						Next Song {canAdvance ? '(Enter)' : ''}
					</Button>
				{/if}
			</div>
		{:else if playerState === 'ready'}
			<div class="py-8 text-center">
				<Button onclick={startRound} disabled={tracks.length === 0}>Start Guessing</Button>
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
