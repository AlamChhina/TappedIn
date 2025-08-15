<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface SelectTriggerProps {
		class?: string;
		children?: any;
		disabled?: boolean;
	}

	let {
		class: className,
		children,
		disabled = false,
		...restProps
	}: SelectTriggerProps = $props();
</script>

<button
	class={cn(
		'flex h-9 w-full items-center justify-between rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{disabled}
	{...restProps}
>
	{@render children?.()}
</button>
