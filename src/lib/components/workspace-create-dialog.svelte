<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import { workspace } from "$lib/stores/workspace.svelte";
    import { goto } from "$app/navigation";

    export let open = false;

    let name = "";
    let description = "";
    let isLoading = false;
    let error: string | null = null;

    function handleOpenChange(isOpen: boolean) {
        open = isOpen;
        if (!isOpen) {
            // Reset form state when dialog closes
            name = "";
            description = "";
            error = null;
        }
    }

    async function handleSubmit() {
        if (!name.trim()) {
            error = "Workspace name is required";
            return;
        }

        isLoading = true;
        error = null;

        try {
            const response = await fetch('http://localhost:8000/api/workspaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || undefined
                }),
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to create workspace');
            }

            const newWorkspace = await response.json();
            await workspace.setActiveWorkspace(newWorkspace.id);
            handleOpenChange(false);
            goto(`/dashboard/workspace/${newWorkspace.id}`);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to create workspace';
        } finally {
            isLoading = false;
        }
    }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title>Create New Workspace</Dialog.Title>
            <Dialog.Description>
                Create a new workspace to collaborate with your team.
            </Dialog.Description>
        </Dialog.Header>

        <form class="space-y-4" on:submit|preventDefault={handleSubmit}>
            <div class="space-y-2">
                <Label for="name">Workspace Name</Label>
                <Input
                    id="name"
                    bind:value={name}
                    placeholder="Enter workspace name"
                    disabled={isLoading}
                />
            </div>

            <div class="space-y-2">
                <Label for="description">Description (Optional)</Label>
                <Textarea
                    id="description"
                    bind:value={description}
                    placeholder="Enter workspace description"
                    disabled={isLoading}
                />
            </div>

            {#if error}
                <p class="text-sm text-destructive">{error}</p>
            {/if}

            <Dialog.Footer>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Workspace"}
                </Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root> 