<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { 
		Dialog, 
		DialogContent, 
		DialogHeader, 
		DialogTitle, 
		DialogDescription 
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Info } from 'lucide-svelte';

	type GameMode = 'classic' | 'zen';

	interface Props {
		mode: GameMode;
	}

	let { mode }: Props = $props();

	let showModal = $state(false);

	// Check if user has seen this modal before
	const storageKey = `gts-${mode}-mode-seen`;

	onMount(() => {
		if (browser) {
			const hasSeenModal = localStorage.getItem(storageKey);
			if (!hasSeenModal) {
				showModal = true;
				localStorage.setItem(storageKey, 'true');
			}
		}
	});

	const openInfoModal = () => {
		showModal = true;
	};

	const getModalContent = (mode: GameMode) => {
		if (mode === 'classic') {
			return {
				title: 'Classic Mode',
				description: 'Test your music knowledge with the ultimate challenge!',
				features: [
					'Hear just the first second of each song',
					'Quick-fire guessing action',
					'Challenge yourself to identify tracks instantly',
					'Track your accuracy and speed',
					'Perfect for music trivia enthusiasts'
				],
			};
		} else {
			return {
				title: 'Zen Mode',
				description: 'Relax and enjoy music while you guess at your own pace.',
				features: [
					'Full songs play from start to finish',
					'No time pressure - take your time',
					'Think and analyze the complete track',
					'Enjoy the full musical experience',
					'Perfect for discovering new music'
				],
			};
		}
	};

	const content = $derived(getModalContent(mode));
</script>

<!-- Info Button -->
<Button
	variant="ghost"
	size="sm"
	onclick={openInfoModal}
	class="ml-1 h-8 w-8 p-0 text-white flex items-center justify-center hover:text-gray-300 hover:bg-transparent cursor-pointer transition-colors"
	title="Game mode information"
>
	<Info size={16} />
</Button>

<!-- Modal -->
<Dialog bind:open={showModal}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>{content.title}</DialogTitle>
			<DialogDescription>{content.description}</DialogDescription>
		</DialogHeader>
		
		<div class="space-y-4">
			<div>
				<h4 class="mb-3 font-medium text-white">How it works:</h4>
				<ul class="space-y-2">
					{#each content.features as feature}
						<li class="text-sm text-gray-300">{feature}</li>
					{/each}
				</ul>
			</div>
		</div>
		
		<div class="flex justify-end">
			<Button onclick={() => showModal = false} class="bg-green-600 hover:bg-green-700">
				Got it!
			</Button>
		</div>
	</DialogContent>
</Dialog>
