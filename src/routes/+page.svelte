<script>
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Play, ListMusic, Headphones, LogIn } from 'lucide-svelte';
	import ArtistSearch from '$lib/components/ArtistSearch.svelte';

	export let data;

	$: session = data.session;
	$: profile = data.profile;

	const handleSignIn = () => {
		window.location.href = '/login/spotify';
	};
</script>

<svelte:head>
	<title>Guess the Song - A Daily Music Game</title>
	<meta
		name="description"
		content="Connect your Spotify account and test your music knowledge with song guessing challenges."
	/>
</svelte:head>

{#if !session.loggedIn}
	<!-- Pre-login state: Show sign-in card -->
	<main class="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
		<div class="w-full max-w-md">
			<Card class="border-slate-700 bg-slate-800/80 backdrop-blur-sm">
				<CardHeader class="text-center">
					<CardTitle class="text-xl text-white">Sign in With Spotify To Play</CardTitle>
					<CardDescription class="text-gray-300">
						Premium subscription required
					</CardDescription>
				</CardHeader>

				<CardContent class="space-y-6">
				

					<!-- CTA Button -->
					<Button
						onclick={handleSignIn}
						class="w-full px-6 font-medium text-white transition-all duration-200 hover:scale-[1.02] focus:scale-[1.02] focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-800"
						style="--spotify: #1DB954; background-color: var(--spotify); border-color: var(--spotify);"
					>
						<LogIn class="mr-2 h-5 w-5" aria-hidden="true" />
						Sign in with Spotify
					</Button>

			
				</CardContent>

				
			</Card>
		</div>
	</main>
{:else}
	<!-- Signed-in state: Show welcome message and artist search -->
	<main class="min-h-[calc(100vh-80px)] p-4">
		<div class="mx-auto max-w-4xl space-y-8">
			<!-- Welcome Section -->
			<div class="text-center">
				<h2 class="mb-2 text-2xl font-bold text-white">
					Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}!
				</h2>
				<p class="text-gray-400">You're signed in and ready to explore music.</p>
			</div>

			<!-- Artist Search Component -->
			<ArtistSearch />
		</div>
	</main>
{/if}
