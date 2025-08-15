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
	import { Info, Play, List, Headphones } from 'lucide-svelte';

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
					{
						icon: Play,
						text: 'Hear just the first second of each song and guess quickly.'
					},
					{
						icon: List,
						text: 'Quick-fire rounds to test your instant recognition skills.'
					},
					{
						icon: Headphones,
						text: 'Challenge yourself to identify tracks from brief snippets.'
					}
				],
			};
		} else {
			return {
				title: 'Zen Mode',
				description: 'Relax and enjoy music while you guess at your own pace.',
				features: [
					{
						icon: Play,
						text: 'Full songs play from start to finish with no time pressure.'
					},
					{
						icon: List,
						text: 'Take your time to think and analyze the complete track.'
					},
					{
						icon: Headphones,
						text: 'Enjoy the full musical experience while discovering new music.'
					}
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
			{#each content.features as feature}
				<div class="flex items-start gap-4">
					<div class="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
						<svelte:component this={feature.icon} size={16} class="text-white" />
					</div>
					<p class="text-sm text-gray-300 pt-1">{feature.text}</p>
				</div>
			{/each}
		</div>
		
		<div class="flex justify-end">
			<Button onclick={() => showModal = false} class="bg-green-600 hover:bg-green-700">
				Got it
			</Button>
		</div>
	</DialogContent>
</Dialog>
