<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Check } from 'lucide-svelte';

	interface SelectItemProps {
		value: string;
		label?: string;
		disabled?: boolean;
		selected?: boolean;
		class?: string;
		children?: any;
		onclick?: () => void;
	}

	let {
		value,
		label,
		disabled = false,
		selected = false,
		class: className,
		children,
		onclick
	}: SelectItemProps = $props();
</script>

<button
	class={cn(
		'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-700 focus:bg-gray-700 focus:outline-none',
		disabled && 'pointer-events-none opacity-50',
		className
	)}
	{disabled}
	{onclick}
>
	<Check class="mr-2 h-4 w-4 {selected ? 'opacity-100' : 'opacity-0'}" />
	{#if children}
		{@render children()}
	{:else if label}
		{label}
	{:else}
		{value}
	{/if}
</button>
