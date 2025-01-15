<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import type { Props } from './types';

	type $$Props = Props;

	export let open = false;
</script>

<DropdownMenuPrimitive.Root bind:open {...$$restProps}>
	<slot />
</DropdownMenuPrimitive.Root>
