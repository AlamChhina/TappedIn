<script lang="ts">
	import { Loader2, Music } from 'lucide-svelte';
	import { loadingMessages } from '$lib/stores/loadingMessages';

	// Props
	interface Props {
		showIndicator?: boolean;
		className?: string;
	}

	let { showIndicator = true, className = '' }: Props = $props();
</script>

{#if $loadingMessages.isLoading}
	<div class="flex flex-col items-center justify-center gap-3 p-8 text-gray-400 {className}">
		{#if showIndicator}
			<!-- Animated loader with music note -->
			<div class="relative">
				<Loader2 class="h-8 w-8 animate-spin text-spotify-green" />
				<Music class="absolute inset-0 h-4 w-4 m-auto text-white" />
			</div>
		{/if}
		
		<div class="text-center">
			<div class="text-lg font-medium text-white animate-pulse">
				{$loadingMessages.currentMessage}
			</div>
			
			{#if $loadingMessages.isLargeCollection}
				<div class="mt-2 text-sm text-gray-400">
					Large collections may take longer to process
				</div>
			{/if}
			
			<!-- Progress dots animation -->
			<div class="mt-3 flex items-center justify-center gap-1">
				<div class="h-2 w-2 bg-spotify-green rounded-full animate-bounce" style="animation-delay: 0ms"></div>
				<div class="h-2 w-2 bg-spotify-green rounded-full animate-bounce" style="animation-delay: 150ms"></div>
				<div class="h-2 w-2 bg-spotify-green rounded-full animate-bounce" style="animation-delay: 300ms"></div>
			</div>
		</div>
	</div>
{/if}
