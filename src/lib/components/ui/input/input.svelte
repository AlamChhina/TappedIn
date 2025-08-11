<!-- Simple Input component with Tailwind styling -->
<script lang="ts">
	import { cn } from '$lib/utils';

	type InputProps = {
		value?: string;
		placeholder?: string;
		class?: string;
		disabled?: boolean;
		type?: 'text' | 'email' | 'password' | 'search';
		onInput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
		onKeydown?: (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => void;
		onFocus?: (event: FocusEvent & { currentTarget: HTMLInputElement }) => void;
		onBlur?: (event: FocusEvent & { currentTarget: HTMLInputElement }) => void;
		ref?: HTMLInputElement | null;
	};

	let {
		value = $bindable(''),
		placeholder = '',
		class: className = '',
		disabled = false,
		type = 'text',
		onInput,
		onKeydown,
		onFocus,
		onBlur,
		ref = $bindable(null),
		...restProps
	}: InputProps = $props();
</script>

<input
	bind:this={ref}
	bind:value
	{type}
	{placeholder}
	{disabled}
	class={cn(
		'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300',
		className
	)}
	oninput={onInput}
	onkeydown={onKeydown}
	onfocus={onFocus}
	onblur={onBlur}
	{...restProps}
/>
