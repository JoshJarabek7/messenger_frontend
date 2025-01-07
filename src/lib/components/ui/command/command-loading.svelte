<script lang="ts">
    import { Command as CommandPrimitive } from "bits-ui";
    import { cn } from "$lib/utils";

    let className: string | undefined = undefined;
    export { className as class };
</script>

<CommandPrimitive.Loading
    class={cn("py-6 text-center text-sm", className)}
    {...$$restProps}
>
    <slot>Loading...</slot>
</CommandPrimitive.Loading> 