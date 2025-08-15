<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface SelectContentProps {
		class?: string;
		children?: any;
	}

	let {
		class: className,
		children,
		...restProps
	}: SelectContentProps = $props();
</script>

<div
	class={cn(
		'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-600 bg-gray-800 p-1 text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
		className
	)}
	style="top: 100%; left: 0; margin-top: 4px;"
	{...restProps}
>
	{@render children?.()}
</div>
