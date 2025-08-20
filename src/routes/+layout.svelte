<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { Music, UserRound, LogOut, History } from 'lucide-svelte';
	import { page } from '$app/stores';

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

		<!-- Right side: Game Mode Navigation and User Avatar -->
		<div class="flex items-center gap-4">
			<!-- Game Mode Navigation (only show when logged in) -->
			{#if session.loggedIn}
				<nav class="flex items-center gap-2">
					<a
						href="/classic"
						class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 {$page.url.pathname === '/classic'
							? 'bg-primary text-primary-foreground hover:bg-primary/90'
							: 'hover:bg-accent hover:text-accent-foreground'}"
						style="{$page.url.pathname === '/classic'
							? 'background-color: #1DB954; color: black;'
							: 'background-color: transparent; color: #b3b3b3;'} transition: all 0.2s;"
					>
						Classic
					</a>
					<a
						href="/zen"
						class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 {$page.url.pathname === '/zen'
							? 'bg-primary text-primary-foreground hover:bg-primary/90'
							: 'hover:bg-accent hover:text-accent-foreground'}"
						style="{$page.url.pathname === '/zen'
							? 'background-color: #1DB954; color: black;'
							: 'background-color: transparent; color: #b3b3b3;'} transition: all 0.2s;"
					>
						Zen
					</a>
				</nav>
			{/if}

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
						onclick={() => window.location.href = '/history'}
					>
						<History class="mr-2 h-4 w-4" aria-hidden="true" />
						Game History
					</DropdownMenuItem>
					
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
	</div>
</header>

	<!-- Page Content -->
	{@render children?.()}
	
	<!-- Footer -->
	<footer class="p-4 text-center">
		<p class="text-xs text-gray-500">created by Alam Chhina</p>
	</footer>
</div>
