<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { Music, UserRound, LogOut } from 'lucide-svelte';

	let { children, data } = $props();

	let session = $derived(data.session);
	let profile = $derived(data.profile);

	const handleSignOut = async () => {
		try {
			const response = await fetch('/api/signout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				// Redirect to home page (or let the server redirect handle it)
				window.location.href = '/';
			}
		} catch (error) {
			console.error('Sign out failed:', error);
			// Fallback: force reload to clear client state
			window.location.href = '/';
		}
	};
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen" style="background-color: #121212;">
	<!-- Top Header Bar -->
	<header class="flex items-center justify-between border-b p-4" style="border-color: #282828;">
		<!-- App Title -->
		<div class="flex items-center">
			
			<h1 class="app-title text-xl text-white">Tapped In</h1>
			<div class="p-2">
				<img src="/logo.svg" alt="Logo" class="h-8 w-8" />
			</div>
		</div>

		<!-- User Avatar (if signed in) -->
		{#if session.loggedIn && profile}
			<DropdownMenu>
				<DropdownMenuTrigger
					class="flex cursor-pointer items-center gap-3 rounded-lg p-2 focus:outline-none"
				>
					<Avatar class="h-8 w-8">
						{#if profile.image_url}
							<AvatarImage src={profile.image_url} alt={profile.display_name || 'User profile'} />
						{/if}
						<AvatarFallback style="background-color: #282828; color: #b3b3b3;">
							<UserRound class="h-4 w-4" aria-hidden="true" />
						</AvatarFallback>
					</Avatar>
					{#if profile.display_name}
						<span class="hidden text-sm text-gray-300 sm:block">{profile.display_name}</span>
					{/if}
				</DropdownMenuTrigger>

				<DropdownMenuContent
					style="border-color: #282828; background-color: #181818; color: white;"
				>
					<DropdownMenuItem
						class="cursor-pointer focus:text-gray-300"
						style="background-color: transparent; hover:background-color: #282828; focus:background-color: #282828;"
						onclick={handleSignOut}
					>
						<LogOut class="mr-2 h-4 w-4" aria-hidden="true" />
						Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		{/if}
	</header>

	<!-- Page Content -->
	{@render children?.()}
</div>
