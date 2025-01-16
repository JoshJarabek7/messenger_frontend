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
	import { onMount } from 'svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import { file_store } from '$lib/stores/file.svelte';
	import type { OnCropCompleteEvent } from 'svelte-easy-crop';

	import { buildFile, unbuildUser, buildUser } from '$lib/helpers.svelte';

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
	let isEmailAvailable = $state<boolean | null>(true);
	let isEmailValid = $state(true);
	let isCheckingEmail = $state(false);
	let emailCheckTimeout: number;

	async function handleImageSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			selectedImage = input.files[0];
			if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
				URL.revokeObjectURL(imagePreviewUrl);
			}
			imagePreviewUrl = URL.createObjectURL(input.files[0]);
			cropperOpen = true;
			crop = { x: 0, y: 0 };
			zoom = 1;
		}
	}

	function onCropComplete(event: OnCropCompleteEvent) {
		// Assuming the event has a 'pixels' property directly
		croppedPixels = event.pixels;
	}

	function closeCropperDialog() {
		cropperOpen = false;
		if (
			imagePreviewUrl &&
			imagePreviewUrl.startsWith('blob:') &&
			imagePreviewUrl !== pendingAvatarUrl
		) {
			URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl =
				pendingAvatarUrl ||
				URL.createObjectURL(
					file_store.getFile(user_store.getMe()?.s3_key || '')?.file_blob || new Blob()
				);
		}
		selectedImage = null;
		croppedPixels = null;
		zoom = 1;
		crop = { x: 0, y: 0 };
	}

	async function handleCropSave() {
		if (!selectedImage || !croppedPixels) return;

		try {
			isLoading = true;

			// Create a canvas to crop the image
			const img = new Image();
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
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
			croppedImageBlob = await new Promise<Blob>((resolve, reject) =>
				canvas.toBlob(
					(blob) => {
						if (blob) resolve(blob);
						else reject(new Error('Failed to create blob'));
					},
					'image/jpeg',
					0.9
				)
			);

			// Create a File object from the Blob
			const file = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' });

			// Upload the file
			const uploadedFile = await file_api.uploadFile(file);
			if (!uploadedFile) {
				throw new Error('Failed to upload avatar');
			}

			// Update user with the new file ID (not the URL)
			const currentUser = user_store.getMe();
			if (!currentUser) {
				throw new Error('Current user not found');
			}

			const updatedUser = await user_api.updateUser({
				username: currentUser.username,
				display_name: currentUser.display_name,
				email: currentUser.email,
				s3_key: uploadedFile.id
			});

			if (!updatedUser) {
				throw new Error('Failed to update user');
			}

			// // Update the local user store
			user_store.updateUser(currentUser.id, updatedUser);
			user_store.setMe(updatedUser);

			closeCropperDialog();
			toast.success('Profile picture updated successfully');
		} catch (error) {
			console.error('Error saving cropped image:', error);
			toast.error('Failed to update profile picture');
		} finally {
			isLoading = false;
		}
	}

	function validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	async function checkEmail() {
		if (!email.trim()) {
			isEmailAvailable = true;
			isEmailValid = true;
			return;
		}

		isEmailValid = validateEmail(email);
		if (!isEmailValid) {
			error = 'Please enter a valid email address';
			return;
		}

		try {
			isCheckingEmail = true;
			const exists = await user_api.doesEmailExist(email);
			isEmailAvailable = !exists;
			error = exists ? 'This email is already taken' : null;
		} catch (e) {
			console.error('Error checking email:', e);
			error = 'Failed to check email availability';
			isEmailAvailable = null;
		} finally {
			isCheckingEmail = false;
		}
	}

	function handleEmailInput() {
		if (emailCheckTimeout) {
			clearTimeout(emailCheckTimeout);
		}

		if (!email.trim()) {
			isEmailAvailable = true;
			isEmailValid = true;
			error = null;
			return;
		}

		isEmailValid = validateEmail(email);
		if (!isEmailValid) {
			error = 'Please enter a valid email address';
			return;
		}

		isCheckingEmail = true;
		emailCheckTimeout = setTimeout(checkEmail, 500) as unknown as number;
	}

	function validateDisplayName(name: string): boolean {
		const trimmed = name.trim();
		return trimmed.length > 0 && trimmed.length <= 50; // Adjust max length as needed
	}

	async function handleSubmit() {
		if (!username.trim()) {
			error = 'Username is required';
			toast.error('Username is required');
			return;
		}

		if (!validateDisplayName(displayName)) {
			error = 'Display name is required and must be between 1 and 50 characters';
			toast.error('Invalid display name');
			return;
		}

		if (!email.trim()) {
			error = 'Email is required';
			toast.error('Email is required');
			return;
		}

		if (!isEmailValid) {
			error = 'Please enter a valid email address';
			toast.error('Please enter a valid email address');
			return;
		}

		// Check if the username has changed before checking availability
		if (username !== user_store.getMe()?.username) {
			const usernameExists = await user_api.doesUsernameExist(username);
			if (usernameExists) {
				error = 'This username is already taken';
				toast.error('This username is already taken');
				return;
			}
		}

		// Check if the email has changed before checking availability
		if (email !== user_store.getMe()?.email) {
			const emailExists = await user_api.doesEmailExist(email);
			if (emailExists) {
				error = 'This email is already taken';
				toast.error('This email is already taken');
				return;
			}
		}

		isLoading = true;
		error = null;

		try {
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

			const userData = {
				username: username.trim(),
				display_name: displayName.trim(),
				email: email.trim(),
				s3_key: uploadedPicture?.id || user_store.getMe()?.s3_key
			};

			const updatedUser = await user_api.updateUser(userData);

			if (!updatedUser) {
				throw new Error('Failed to update user');
			}

			user_store.updateUser(user_store.getMe()?.id, updatedUser);

			toast.dismiss(updateToastId);
			toast.success('Profile updated successfully');
			ui_store.toggleUserSettings();
		} catch (e: unknown) {
			console.error('Update failed:', e);
			error = e instanceof Error ? e.message : 'Failed to update profile';
			toast.error(error);
		} finally {
			isLoading = false;
		}
	}

	onMount(async () => {
		username = user_store.getMe()?.username || '';
		displayName = user_store.getMe()?.display_name || '';
		email = user_store.getMe()?.email || '';

		// Build the file first if we have an s3_key
		const s3_key = user_store.getMe()?.s3_key;
		if (s3_key) {
			try {
				await buildFile(s3_key);
			} catch (error) {
				console.error('Error building avatar file:', error);
			}
		}

		// Now set the image preview URL
		imagePreviewUrl = URL.createObjectURL(
			file_store.getFile(user_store.getMe()?.s3_key || '')?.file_blob || new Blob()
		);
	});
</script>

<Dialog.Root
	open={ui_store.getUserSettingsOpen()}
	onOpenChange={(open) => {
		if (!open) {
			// Clean up when dialog closes
			cropperOpen = false;
			if (pendingAvatarUrl) {
				URL.revokeObjectURL(pendingAvatarUrl);
				pendingAvatarUrl = null;
			}
			if (
				imagePreviewUrl &&
				imagePreviewUrl !==
					URL.createObjectURL(
						file_store.getFile(user_store.getMe()?.s3_key || '')?.file_blob || new Blob()
					)
			) {
				URL.revokeObjectURL(imagePreviewUrl);
			}
			selectedImage = null;
			croppedImageBlob = null;
			error = null;
		}
		ui_store.toggleUserSettings();
	}}
>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>User Settings</Dialog.Title>
			<Dialog.Description>Update your profile information and settings.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-4">
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
			</div>

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
				<div class="relative">
					<Input
						id="email"
						type="email"
						bind:value={email}
						placeholder="Enter email"
						disabled={isLoading}
						class="pr-8"
						oninput={handleEmailInput}
					/>
					{#if email !== user_store.getMe()?.email}
						<div class="absolute right-2 top-1/2 -translate-y-1/2">
							{#if isCheckingEmail}
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
								></div>
							{:else if isEmailValid && isEmailAvailable}
								<CheckCircle class="h-4 w-4 text-green-500" />
							{:else}
								<XCircle class="h-4 w-4 text-destructive" />
							{/if}
						</div>
					{/if}
				</div>
			</div>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}

			<Dialog.Footer>
				<Button
					type="submit"
					onclick={handleSubmit}
					disabled={isLoading ||
						(!isUsernameAvailable && username !== user_store.getMe()?.username) ||
						(!isEmailAvailable && email !== user_store.getMe()?.email) ||
						!isEmailValid}
				>
					{isLoading ? 'Saving...' : 'Save Changes'}
				</Button>
			</Dialog.Footer>
		</div>
	</Dialog.Content>
</Dialog.Root>

{#if cropperOpen}
	<Dialog.Root
		open={cropperOpen}
		onOpenChange={() => {
			closeCropperDialog();
		}}
	>
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
					oncropcomplete={onCropComplete}
				/>
			</div>

			<div class="mt-4 flex items-center justify-between">
				<Label>Zoom: {Math.round(zoom * 100)}%</Label>
				<input type="range" min="1" max="3" step="0.1" bind:value={zoom} class="w-64" />
			</div>

			<Dialog.Footer class="mt-4">
				<Button variant="outline" onclick={() => closeCropperDialog()}>Cancel</Button>
				<Button onclick={() => handleCropSave()} disabled={isLoading}>
					{isLoading ? 'Saving...' : 'Save'}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
