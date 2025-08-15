<script lang="ts">
	import { cn } from '$lib/utils.js';

	type $$Props = {
		class?: string;
		children?: import('svelte').Snippet;
	};

	let { class: className, children }: $$Props = $props();
</script>

<h3 class={cn("text-lg font-semibold leading-none tracking-tight text-white", className)}>
	{@render children?.()}
</h3>
