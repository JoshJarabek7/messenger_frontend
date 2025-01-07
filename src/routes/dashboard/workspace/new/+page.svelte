<script lang="ts">
    import { goto } from "$app/navigation";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import { workspace } from "$lib/stores/workspace.svelte";

    let name = "";
    let description = "";
    let isLoading = false;
    let error: string | null = null;

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
            goto(`/dashboard/workspace/${newWorkspace.id}`);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to create workspace';
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="container max-w-2xl mx-auto py-8 px-4">
    <div class="space-y-6">
        <div class="space-y-2">
            <h1 class="text-2xl font-bold tracking-tight">Create New Workspace</h1>
            <p class="text-muted-foreground">
                Create a new workspace to collaborate with your team.
            </p>
        </div>

        <form class="space-y-4" onsubmit|preventDefault={handleSubmit}>
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

            <Button type="submit" disabled={isLoading} class="w-full">
                {isLoading ? "Creating..." : "Create Workspace"}
            </Button>
        </form>
    </div>
</div> 