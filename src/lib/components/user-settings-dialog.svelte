<script lang="ts">
	import { onDestroy } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tabs from '$lib/components/ui/tabs';
	import { toast } from 'svelte-sonner';
	import { FileAPI } from '$lib/api/files';
	import { auth } from '$lib/stores/auth.svelte';
	import { createEventDispatcher } from 'svelte';
	import { CheckCircle, XCircle, User, Camera } from 'phosphor-svelte';
	import Cropper from 'svelte-easy-crop';
	import { users } from '$lib/stores/users.svelte';
	import { messages } from '$lib/stores/messages.svelte';
	import { conversations } from '$lib/stores/conversations.svelte';
	import { API_BASE_URL } from '$lib/config.ts';

	const dispatch = createEventDispatcher();
	let { open = $bindable(false), onOpenChange } = $props<{
		open?: boolean;
		onOpenChange?: (value: boolean) => void;
	}>();

	let username = $state('');
	let displayName = $state('');
	let email = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let isUsernameAvailable = $state(true);
	let isChecking = $state(false);
	let checkTimeout: number;
	let imageInput: HTMLInputElement;
	let cropperOpen = $state(false);
	let selectedImage: File | null = null;
	let imagePreviewUrl = $state('');
	let crop = $state({ x: 0, y: 0 });
	let zoom = $state(1);
	let croppedImageBlob: Blob | null = null;
	let pendingAvatarUrl: string | null = null;
	let croppedPixels = $state<{ x: number; y: number; width: number; height: number } | null>(null);

	// Update form values when auth store changes
	$effect(() => {
		if ($auth.user) {
			username = $auth.user.username;
			displayName = $auth.user.display_name || '';
			email = $auth.user.email;
			imagePreviewUrl = $auth.user.avatar_url || '';
		}
	});

	$effect(() => {
		if (username && username !== $auth.user?.username) {
			clearTimeout(checkTimeout);
			isChecking = true;
			error = null;

			checkTimeout = setTimeout(async () => {
				try {
					const response = await fetch(
						`${API_BASE_URL}/users/username-exists/${encodeURIComponent(username)}`,
						{
							credentials: 'include'
						}
					);
					if (!response.ok) throw new Error('Failed to check username');
					const data = await response.json();
					isUsernameAvailable = !data.exists;
				} catch (e) {
					console.error('Error checking username:', e);
				} finally {
					isChecking = false;
				}
			}, 300) as unknown as number;
		} else {
			isUsernameAvailable = true;
		}
	});

	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		onOpenChange?.(isOpen);
		if (!isOpen) {
			// Reset form state when dialog closes
			if ($auth.user) {
				username = $auth.user.username;
				displayName = $auth.user.display_name || '';
				email = $auth.user.email;
				imagePreviewUrl = $auth.user.avatar_url || '';
			}
			error = null;
			isUsernameAvailable = true;
			cropperOpen = false;
			selectedImage = null;
			if (pendingAvatarUrl) {
				URL.revokeObjectURL(pendingAvatarUrl);
				pendingAvatarUrl = null;
			}
			croppedImageBlob = null;
		}
	}

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

	async function handleCropComplete(
		event: CustomEvent<{ pixels: { x: number; y: number; width: number; height: number } }>
	) {
		croppedPixels = event.detail.pixels;
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

		if (!isUsernameAvailable && username !== $auth.user?.username) {
			error = 'This username is already taken';
			toast.error('This username is already taken');
			return;
		}

		isLoading = true;
		error = null;

		try {
			let newAvatarUrl = undefined;

			// Upload the cropped image if one exists
			if (croppedImageBlob) {
				try {
					const uploadToastId = toast.loading('Uploading profile picture...');

					// Get upload URL
					const uploadDetails = await FileAPI.getUploadUrl(
						selectedImage?.name || 'avatar.jpg',
						'image/jpeg'
					);

					// Upload to S3
					const formData = new FormData();
					Object.entries(uploadDetails.upload_data.fields).forEach(([key, value]) => {
						formData.append(key, value);
					});
					formData.append('file', croppedImageBlob);

					const uploadResponse = await fetch(uploadDetails.upload_data.url, {
						method: 'POST',
						body: formData
					});

					if (!uploadResponse.ok) {
						toast.dismiss(uploadToastId);
						throw new Error('Failed to upload image');
					}

					// Confirm upload and get file details
					const fileAttachment = await FileAPI.confirmUpload(
						uploadDetails.metadata.file_id,
						croppedImageBlob.size
					);
					newAvatarUrl = fileAttachment.download_url;
					toast.dismiss(uploadToastId);
					toast.success('Profile picture uploaded successfully');
				} catch (e) {
					console.error('Error uploading avatar:', e);
					toast.error('Failed to upload profile picture');
					return;
				}
			}

			const updateToastId = toast.loading('Updating profile...');
			// Update user profile
			const response = await fetch(`${API_BASE_URL}/users/me`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: username.trim(),
					display_name: displayName.trim() || null,
					email: email.trim(),
					...(newAvatarUrl && { avatar_url: newAvatarUrl })
				}),
				credentials: 'include'
			});

			if (!response.ok) {
				toast.dismiss(updateToastId);
				const data = await response.json();
				throw new Error(data.detail || 'Failed to update profile');
			}

			const updatedUser = await response.json();

			// Update all stores with the new user data
			auth.updateUser(updatedUser);
			users.updateUser(updatedUser);
			messages.updateUserInMessages(updatedUser);
			conversations.updateUserInConversations(updatedUser);

			// Close dialog and show success message
			handleOpenChange(false);
			toast.dismiss(updateToastId);
			toast.success('Profile updated successfully');

			// Clean up
			if (pendingAvatarUrl) {
				URL.revokeObjectURL(pendingAvatarUrl);
				pendingAvatarUrl = null;
			}
			croppedImageBlob = null;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to update profile';
			toast.error(error);
		} finally {
			isLoading = false;
		}
	}

	onDestroy(() => {
		if (pendingAvatarUrl) {
			URL.revokeObjectURL(pendingAvatarUrl);
		}
	});
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
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
							{#if username !== $auth.user?.username}
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
						disabled={isLoading || (!isUsernameAvailable && username !== $auth.user?.username)}
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
					on:cropcomplete={handleCropComplete}
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
