<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tabs from '$lib/components/ui/tabs';
	import { toast } from 'svelte-sonner';
	import { CheckCircle, XCircle, User, Camera } from 'lucide-svelte';
	import Cropper from 'svelte-easy-crop';
	import { user_api } from '$lib/api/user.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';
	import { file_api } from '$lib/api/file.svelte';
	import { user_store } from '$lib/stores/user.svelte';

	interface CropPixels {
		x: number;
		y: number;
		width: number;
		height: number;
	}

	let username = $state('');
	let displayName = $state('');
	let email = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let isUsernameAvailable = $state(true);
	let isChecking = $state(false);
	let imageInput: HTMLInputElement;
	let cropperOpen = $state(false);
	let selectedImage: File | null = null;
	let imagePreviewUrl = $state('');
	let crop = $state({ x: 0, y: 0 });
	let zoom = $state(1);
	let croppedImageBlob: Blob | null = null;
	let pendingAvatarUrl: string | null = null;
	let croppedPixels = $state<CropPixels | null>(null);

	async function handleImageSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			selectedImage = input.files[0];
			imagePreviewUrl = URL.createObjectURL(input.files[0]);
			cropperOpen = true;
			crop = { x: 0, y: 0 };
			zoom = 1;
		}
	}

	function onCropComplete({ detail }: { detail: { pixels: CropPixels } }) {
		croppedPixels = detail.pixels;
	}

	async function handleCropSave() {
		if (!selectedImage || !croppedPixels) return;

		try {
			isLoading = true;

			// Create a canvas to crop the image
			const img = new Image();
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			await new Promise((resolve) => {
				img.onload = resolve;
				img.src = imagePreviewUrl;
			});

			// Set canvas size to match our desired output size
			canvas.width = 256;
			canvas.height = 256;

			const { x, y, width, height } = croppedPixels;

			// Draw the cropped image
			if (ctx) {
				ctx.drawImage(img, x, y, width, height, 0, 0, canvas.width, canvas.height);
			}

			// Store the cropped image blob for later upload
			croppedImageBlob = await new Promise<Blob>((resolve) =>
				canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9)
			);

			// Create a temporary URL for preview
			pendingAvatarUrl = URL.createObjectURL(croppedImageBlob);
			imagePreviewUrl = pendingAvatarUrl;

			// Close the crop dialog
			cropperOpen = false;
			toast.success('Image cropped successfully');
		} catch (e) {
			console.error('Error cropping image:', e);
			toast.error('Failed to crop image');
		} finally {
			isLoading = false;
		}
	}

	async function handleSubmit() {
		if (!username.trim()) {
			error = 'Username is required';
			toast.error('Username is required');
			return;
		}

		const usernameExists = await user_api.doesUsernameExist(username);
		if (usernameExists) {
			error = 'This username is already taken';
			toast.error('This username is already taken');
			return;
		}

		const emailExists = await user_api.doesEmailExist(email);
		if (emailExists) {
			error = 'This email is already taken';
			toast.error('This email is already taken');
			return;
		}

		isLoading = true;
		error = null;

		try {
			let newAvatarUrl = undefined;
			let uploadedPicture = undefined;

			// Upload the cropped image if one exists
			if (croppedImageBlob) {
				try {
					const uploadToastId = toast.loading('Uploading profile picture...');
					const file = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' });
					uploadedPicture = await file_api.uploadFile(file);
					toast.dismiss(uploadToastId);
					toast.success('Profile picture uploaded successfully');
				} catch (e) {
					console.error('Error uploading avatar:', e);
					toast.error('Failed to upload profile picture');
					return;
				}
			}

			const updateToastId = toast.loading('Updating profile...');

			await user_api.updateUser({
				username: username.trim(),
				display_name: displayName.trim(),
				email: email.trim(),
				s3_key: uploadedPicture?.id
			});

			toast.dismiss(updateToastId);

			toast.success('Profile updated successfully');
			ui_store.toggleUserSettings();
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to update profile';
			toast.error(error);
		} finally {
			isLoading = false;
		}
	}
</script>

<Dialog.Root open={ui_store.getUserSettingsOpen()} onOpenChange={ui_store.toggleUserSettings}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>User Settings</Dialog.Title>
			<Dialog.Description>Update your profile information and settings.</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root value="profile" class="w-full">
			<Tabs.List>
				<Tabs.Trigger value="profile">Profile</Tabs.Trigger>
				<Tabs.Trigger value="account">Account</Tabs.Trigger>
			</Tabs.List>

			<form
				class="space-y-4 py-4"
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<Tabs.Content value="profile" class="space-y-4">
					<!-- Profile Picture Section -->
					<div class="flex flex-col items-center space-y-4">
						<div class="relative">
							<Avatar.Root class="h-24 w-24">
								<Avatar.Image src={imagePreviewUrl} alt={displayName || username} />
								<Avatar.Fallback>
									<User class="h-12 w-12" />
								</Avatar.Fallback>
							</Avatar.Root>
							<Button
								variant="outline"
								size="icon"
								class="absolute bottom-0 right-0 rounded-full"
								onclick={() => imageInput?.click()}
							>
								<Camera class="h-4 w-4" />
							</Button>
						</div>
						<input
							type="file"
							accept="image/*"
							class="hidden"
							bind:this={imageInput}
							onchange={handleImageSelect}
						/>
					</div>

					<div class="space-y-2">
						<Label for="displayName">Display Name</Label>
						<Input
							id="displayName"
							bind:value={displayName}
							placeholder="Enter display name"
							disabled={isLoading}
						/>
					</div>
				</Tabs.Content>

				<Tabs.Content value="account" class="space-y-4">
					<div class="space-y-2">
						<Label for="username">Username</Label>
						<div class="relative">
							<Input
								id="username"
								bind:value={username}
								placeholder="Enter username"
								disabled={isLoading}
								class="pr-8"
							/>
							{#if username !== user_store.getMe()?.username}
								<div class="absolute right-2 top-1/2 -translate-y-1/2">
									{#if isChecking}
										<div
											class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
										></div>
									{:else if isUsernameAvailable}
										<CheckCircle class="h-4 w-4 text-green-500" />
									{:else}
										<XCircle class="h-4 w-4 text-destructive" />
									{/if}
								</div>
							{/if}
						</div>
					</div>

					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							type="email"
							bind:value={email}
							placeholder="Enter email"
							disabled={isLoading}
						/>
					</div>
				</Tabs.Content>

				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}

				<Dialog.Footer>
					<Button
						type="submit"
						disabled={isLoading ||
							(!isUsernameAvailable && username !== user_store.getMe()?.username)}
					>
						{isLoading ? 'Saving...' : 'Save Changes'}
					</Button>
				</Dialog.Footer>
			</form>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>

{#if cropperOpen}
	<Dialog.Root open={cropperOpen} onOpenChange={(open) => (cropperOpen = open)}>
		<Dialog.Content class="sm:max-w-[600px]">
			<Dialog.Header>
				<Dialog.Title>Edit Profile Picture</Dialog.Title>
				<Dialog.Description>
					The area inside the circle will be your new profile picture.
				</Dialog.Description>
			</Dialog.Header>

			<div class="relative aspect-square w-full overflow-hidden">
				<Cropper
					image={imagePreviewUrl}
					bind:crop
					bind:zoom
					aspect={1}
					cropShape="round"
					showGrid={false}
					maxZoom={3}
					on:cropcomplete={onCropComplete}
				/>
			</div>

			<div class="mt-4 flex items-center justify-between">
				<Label>Zoom: {Math.round(zoom * 100)}%</Label>
				<input type="range" min="1" max="3" step="0.1" bind:value={zoom} class="w-64" />
			</div>

			<Dialog.Footer class="mt-4">
				<Button variant="outline" onclick={() => (cropperOpen = false)}>Cancel</Button>
				<Button onclick={handleCropSave} disabled={isLoading}>
					{isLoading ? 'Saving...' : 'Save'}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
