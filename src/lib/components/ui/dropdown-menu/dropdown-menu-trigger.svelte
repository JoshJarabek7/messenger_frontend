<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import type { TriggerProps } from "./types";

	type $$Props = TriggerProps;
</script>

<DropdownMenuPrimitive.Trigger {...$$restProps}>
	<slot />
</DropdownMenuPrimitive.Trigger> 