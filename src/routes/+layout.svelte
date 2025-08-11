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

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
	<!-- Top Header Bar -->
	<header class="flex items-center justify-between border-b border-slate-700/50 p-4">
		<!-- App Title -->
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 p-2">
				<Music class="h-5 w-5 text-white" aria-hidden="true" />
			</div>
			<h1 class="text-xl font-bold text-white">Guess the Song</h1>
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
						<AvatarFallback class="bg-slate-700 text-slate-300">
							<UserRound class="h-4 w-4" aria-hidden="true" />
						</AvatarFallback>
					</Avatar>
					{#if profile.display_name}
						<span class="hidden text-sm text-gray-300 sm:block">{profile.display_name}</span>
					{/if}
				</DropdownMenuTrigger>

				<DropdownMenuContent class="border-slate-700 bg-slate-800 text-white">
					<DropdownMenuItem
						class="cursor-pointer hover:bg-slate-700/30 hover:text-gray-300 focus:bg-slate-700/30 focus:text-gray-300"
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
