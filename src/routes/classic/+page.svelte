<script lang="ts">
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Select } from '$lib/components/ui/select';
	import { LogIn } from 'lucide-svelte';
	import ArtistSearch from '$lib/components/ArtistSearch.svelte';
	import GameModeInfo from '$lib/components/GameModeInfo.svelte';

	let { data } = $props();

	const session = $derived(data.session);
	const profile = $derived(data.profile);

	// Playback mode state
	let playbackMode: 'beginning' | 'random' = $state('beginning');

	const playbackOptions = [
		{ value: 'beginning', label: 'Beginning' },
		{ value: 'random', label: 'Random' }
	];

	const handleSignIn = () => {
		window.location.href = '/login/spotify';
	};
</script>

<svelte:head>
	<title>Tapped In - Classic Mode</title>
	<meta
		name="description"
		content="Test your music knowledge with Classic mode - guess the song from just the first second!"
	/>
</svelte:head>

{#if !session.loggedIn}
	<!-- Pre-login state: Show sign-in card -->
	<main class="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
		<div class="w-full max-w-md">
			<Card class="border-none backdrop-blur-sm" style="background-color: #121212;">
				<CardHeader class="text-center">
					<CardTitle class="h2 text-xl text-white">Sign in With Spotify To Play</CardTitle>
					<CardDescription class="text-gray-300">Premium subscription required</CardDescription>
				</CardHeader>

				<CardContent class="space-y-6">
					<!-- CTA Button -->
					<Button
						onclick={handleSignIn}
						class="w-full font-medium text-black transition-all duration-200 hover:scale-[1.02] focus:scale-[1.02] focus:ring-0 focus:outline-none"
						style="--spotify: #1DB954; background-color: var(--spotify); border-color: var(--spotify);"
					>
						<img src="/spotify logo/Black.svg" alt="" class="mr-2 h-6 w-6" />
						Sign in with Spotify
					</Button>
				</CardContent>
			</Card>
		</div>
	</main>
{:else}
	<!-- Signed-in state: Show welcome message and artist search -->
	<main class="min-h-[calc(100vh-80px)] p-4">
		<div class="mx-auto mt-8 max-w-4xl space-y-8">
			<!-- Welcome Section -->
			<div class="text-center">
				<div class="flex items-center mx-auto w-full max-w-2xl justify-between">
					<div class="flex items-center">
						<h2 class="h2 text-2xl text-white">
							Classic Mode
						</h2>
						<GameModeInfo mode="classic" />
					</div>
					<!-- Playback Mode Select -->
					<div class="flex items-center gap-2">
						<span class="text-sm text-gray-400">Playback:</span>
						<Select
							bind:value={playbackMode}
							options={playbackOptions}
							placeholder="Select mode..."
							class="w-32"
						/>
					</div>
				</div>
			</div>

			<!-- Artist Search Component -->
			<ArtistSearch gameMode="classic" {playbackMode} />
		</div>
	</main>
{/if}
