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
	class="h-8 w-8 p-0 text-white flex items-center justify-center hover:text-gray-300 hover:bg-transparent cursor-pointer transition-colors"
	title="Game mode information"
>
	<Info size={16} />
</Button>

<!-- Modal -->
<Dialog bind:open={showModal}>
    <DialogContent class="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
            <DialogTitle>{content.title}</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4">
            {#each content.features as feature}
                <div class="flex items-center gap-4">
                    <div class="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                        <feature.icon size={16} class="text-white" />
                    </div>
                    <p class="text-sm text-gray-300">{feature.text}</p>
                </div>
            {/each}
        </div>
        
        <!-- Spotify Device Notice -->
        <div class="bg-green-900/30 border border-green-600/50 rounded-lg p-3">
            <div class="flex items-center gap-3">
                    <img src="/spotify logo/Green.svg" alt="Spotify" class="w-8 h-8" />
            
                <p class="text-sm text-green-200">
                    <strong>Important:</strong> Keep Spotify open on a device (web player, app, or phone) to enable music playback.
                </p>
            </div>
        </div>
        
        <div class="flex justify-end">
            <Button onclick={() => showModal = false} class="bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-0">
                Got it
            </Button>
        </div>
    </DialogContent>
</Dialog>
