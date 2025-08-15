<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { ChevronDown, Check } from 'lucide-svelte';

	interface SelectOption {
		value: string;
		label: string;
	}

	interface SelectProps {
		value?: string;
		onValueChange?: (value: string) => void;
		disabled?: boolean;
		placeholder?: string;
		options: SelectOption[];
		class?: string;
	}

	let {
		value = $bindable(),
		onValueChange,
		disabled = false,
		placeholder = 'Select an option...',
		options = [],
		class: className
	}: SelectProps = $props();

	let isOpen = $state(false);
	let selectedOption = $derived(options.find(opt => opt.value === value));

	function toggleOpen() {
		if (!disabled) {
			isOpen = !isOpen;
		}
	}

	function selectOption(option: SelectOption) {
		value = option.value;
		onValueChange?.(option.value);
		isOpen = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false;
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		const selectElement = document.querySelector('[data-select-root]');
		if (selectElement && !selectElement.contains(target)) {
			isOpen = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', handleKeydown);
		} else {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class="relative" data-select-root>
	<!-- Trigger -->
	<button
		onclick={toggleOpen}
		class={cn(
			'flex h-9 w-full items-center justify-between rounded-md border border-spotify-gray bg-spotify-dark-gray px-3 py-2 text-sm text-white placeholder:text-spotify-light-gray hover:bg-spotify-gray focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
			isOpen && 'border-spotify-green',
			className
		)}
		aria-label="Open select"
		{disabled}
	>
		<span class="truncate">
			{selectedOption?.label || placeholder}
		</span>
		<ChevronDown class="h-4 w-4 opacity-50" />
	</button>

	<!-- Menu -->
	{#if isOpen}
		<div
			class="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-spotify-gray bg-spotify-dark-gray p-1 text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
			style="top: 100%; left: 0; margin-top: 4px;"
		>
			{#each options as option}
				<button
					onclick={() => selectOption(option)}
					class="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-spotify-gray focus:bg-spotify-gray focus:outline-none"
				>
					<Check class="mr-2 h-4 w-4 text-spotify-green {value === option.value ? 'opacity-100' : 'opacity-0'}" />
					{option.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
