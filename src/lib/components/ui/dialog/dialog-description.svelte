<script lang="ts">
	import { cn } from '$lib/utils.js';

	type $$Props = {
		class?: string;
		children?: import('svelte').Snippet;
	};

	let { class: className, children }: $$Props = $props();
</script>

<p class={cn("text-sm text-gray-400", className)}>
	{@render children?.()}
</p>
