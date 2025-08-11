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
	<header class="flex items-center justify-between p-4 border-b border-slate-700/50">
		<!-- App Title -->
		<div class="flex items-center gap-3">
			<div class="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
				<Music class="h-5 w-5 text-white" aria-hidden="true" />
			</div>
			<h1 class="text-xl font-bold text-white">Guess the Song</h1>
		</div>

		<!-- User Avatar (if signed in) -->
		{#if session.loggedIn && profile}
			<DropdownMenu>
				<DropdownMenuTrigger class="flex items-center gap-3 focus:outline-none rounded-lg p-2 cursor-pointer">
					<Avatar class="h-8 w-8">
						{#if profile.image_url}
							<AvatarImage 
								src={profile.image_url} 
								alt={profile.display_name || 'User profile'} 
							/>
						{/if}
						<AvatarFallback class="bg-slate-700 text-slate-300">
							<UserRound class="h-4 w-4" aria-hidden="true" />
						</AvatarFallback>
					</Avatar>
					{#if profile.display_name}
						<span class="text-sm text-gray-300 hidden sm:block">{profile.display_name}</span>
					{/if}
				</DropdownMenuTrigger>
				
				<DropdownMenuContent class="bg-slate-800 border-slate-700 text-white">
					<DropdownMenuItem 
						class="focus:bg-slate-700/30 hover:bg-slate-700/30 focus:text-gray-300 hover:text-gray-300 cursor-pointer"
						onclick={handleSignOut}
					>
						<LogOut class="h-4 w-4 mr-2" aria-hidden="true" />
						Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		{/if}
	</header>

	<!-- Page Content -->
	{@render children?.()}
</div>
