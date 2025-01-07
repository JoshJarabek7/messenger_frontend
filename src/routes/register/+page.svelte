<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { auth } from "$lib/stores/auth.svelte";

    let state = $state({
        email: "",
        password: "",
        confirmPassword: "",
        username: "",
        displayName: "",
        error: "",
        isLoading: false
    });

    async function handleRegister() {
        state.error = "";
        state.isLoading = true;

        if (state.password !== state.confirmPassword) {
            state.error = "Passwords do not match";
            state.isLoading = false;
            return;
        }

        try {
            await auth.register({
                email: state.email,
                username: state.username,
                password: state.password,
                display_name: state.displayName || ""
            });
            console.log("Registration successful");
            goto("/dashboard");
        } catch (e) {
            state.error = e instanceof Error ? e.message : "An error occurred during registration";
        } finally {
            state.isLoading = false;
        }
    }
</script>

<div class="flex items-center justify-center min-h-screen">
    <Card.Root class="w-[350px]">
        <Card.Header>
            <Card.Title>Register</Card.Title>
            <Card.Description>
                Create a new account to get started
            </Card.Description>
        </Card.Header>
        <Card.Content>
            <form onsubmit={handleRegister} class="space-y-4">
                <div class="space-y-2">
                    <Input
                        type="text"
                        placeholder="Username"
                        bind:value={state.username}
                        required
                        disabled={state.isLoading}
                    />
                </div>
                <div class="space-y-2">
                    <Input
                        type="text"
                        placeholder="Display Name (optional)"
                        bind:value={state.displayName}
                        disabled={state.isLoading}
                    />
                </div>
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
                <div class="space-y-2">
                    <Input
                        type="password"
                        placeholder="Confirm Password"
                        bind:value={state.confirmPassword}
                        required
                        disabled={state.isLoading}
                    />
                </div>
                {#if state.error}
                    <p class="text-red-500 text-sm">{state.error}</p>
                {/if}
                <Button type="submit" class="w-full" disabled={state.isLoading}>
                    {state.isLoading ? "Creating account..." : "Register"}
                </Button>
            </form>
        </Card.Content>
        <Card.Footer class="flex justify-center">
            <p class="text-sm text-gray-500">
                Already have an account? 
                <a href="/" class="text-blue-500 hover:underline">Login</a>
            </p>
        </Card.Footer>
    </Card.Root>
</div> 