<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { goto } from "$app/navigation";
    import { auth } from "$lib/stores/auth.svelte";

    let state = $state({
        email: "",
        password: "",
        error: "",
        isLoading: false
    });

    async function handleLogin(event: SubmitEvent) {
        event.preventDefault();
        if (state.isLoading) return;
        
        state.error = "";
        state.isLoading = true;
        
        try {
            await auth.login(state.email, state.password);
            goto("/dashboard");
        } catch (e) {
            state.error = e instanceof Error ? e.message : "An error occurred during login";
        } finally {
            state.isLoading = false;
        }
    }
</script>

<div class="flex items-center justify-center min-h-screen">
    <Card.Root class="w-[350px]">
        <Card.Header>
            <Card.Title>Login</Card.Title>
            <Card.Description>
                Enter your credentials to access your account
            </Card.Description>
        </Card.Header>
        <Card.Content>
            <form onsubmit={handleLogin} class="space-y-4">
                <div class="space-y-2">
                    <Input
                        type="email"
                        placeholder="Email"
                        bind:value={state.email}
                        required
                        disabled={state.isLoading}
                    />
                </div>
                <div class="space-y-2">
                    <Input
                        type="password"
                        placeholder="Password"
                        bind:value={state.password}
                        required
                        disabled={state.isLoading}
                    />
                </div>
                {#if state.error}
                    <p class="text-red-500 text-sm">{state.error}</p>
                {/if}
                <Button type="submit" class="w-full" disabled={state.isLoading}>
                    {state.isLoading ? "Logging in..." : "Login"}
                </Button>
            </form>
        </Card.Content>
        <Card.Footer class="flex justify-center">
            <p class="text-sm text-gray-500">
                Don't have an account? 
                <a href="/register" class="text-blue-500 hover:underline">Register</a>
            </p>
        </Card.Footer>
    </Card.Root>
</div>
