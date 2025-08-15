<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	type $$Props = DialogPrimitive.RootProps & {
		open?: boolean;
	};

	let { children, open = $bindable(false), ...restProps }: $$Props = $props();
</script>

<DialogPrimitive.Root bind:open {...restProps}>
	{@render children?.()}
</DialogPrimitive.Root>
