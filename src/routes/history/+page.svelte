<script lang="ts">
	import { onMount } from 'svelte';
	import { gameHistory } from '$lib/stores/gameHistory';
	import GameHistory from '$lib/components/GameHistory.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	import type { GameSession } from '$lib/types';

	let history: GameSession[] = $state([]);

	onMount(() => {
		const unsubscribe = gameHistory.subscribe((value) => {
			console.log('History data loaded:', value);
			console.log('History length:', value.length);
			history = value;
		});

		// For debugging - check localStorage directly
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem('gts-game-history');
			console.log('Raw localStorage data:', stored);
		}

		return unsubscribe;
	});
</script>

<svelte:head>
	<title>Game History - Tapped In</title>
</svelte:head>

<div class="mx-auto min-h-screen max-w-4xl p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-4">
		<Button
			onclick={() => goto('/')}
			variant="ghost"
			size="sm"
			class="text-gray-300 "
		>
			<ChevronLeft class="h-4 w-4" />
			Back
		</Button>
		
		<h1 class="text-2xl font-bold text-white">Game History</h1>
	</div>

	<!-- Full History Display -->
	{#if history.length > 0}
		<GameHistory {history} currentSessionId={null} showAll={true} />
	{:else}
		<div class="py-12 text-center">
			
			<h2 class="mb-2 text-xl font-semibold text-white">No game history yet</h2>
			<p class="mb-6 text-gray-400">Start playing to see your game sessions here!</p>
			<Button onclick={() => goto('/')}>
				Start Playing
			</Button>
		</div>
	{/if}
</div>
