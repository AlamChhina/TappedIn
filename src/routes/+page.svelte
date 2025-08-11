<script>
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Play, ListMusic, Headphones, LogIn } from 'lucide-svelte';

	export let data;

	$: session = data.session;
	$: profile = data.profile;

	const handleSignIn = () => {
		window.location.href = '/login/spotify';
	};
</script>

<svelte:head>
	<title>Guess the Song - A Daily Music Game</title>
	<meta name="description" content="Connect your Spotify account and test your music knowledge with daily song guessing challenges." />
</svelte:head>

{#if !session.loggedIn}
	<!-- Pre-login state: Show sign-in card -->
	<main class="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
		<div class="w-full max-w-md">
			<Card class="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
				<CardHeader class="text-center">
					<CardTitle class="text-xl text-white">Sign in to get started</CardTitle>
					<CardDescription class="text-gray-300">
						Connect your Spotify account. If you have Premium, you'll unlock full‑track snippets via the Web Playback SDK.
					</CardDescription>
				</CardHeader>
				
				<CardContent class="space-y-6">
					<!-- Features List -->
					<ul class="space-y-3 text-gray-200">
						<li class="flex items-start gap-3">
							<Play class="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
							<span class="text-sm">Play a short snippet and guess the title.</span>
						</li>
						<li class="flex items-start gap-3">
							<ListMusic class="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
							<span class="text-sm">Use your own playlists or favorite artists.</span>
						</li>
						<li class="flex items-start gap-3">
							<Headphones class="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
							<span class="text-sm">Premium unlocks full‑track snippets & seeking.</span>
						</li>
					</ul>

					<!-- CTA Button -->
					<Button 
						onclick={handleSignIn}
						class="w-full text-white font-medium py-3 px-6 transition-all duration-200 hover:scale-[1.02] focus:scale-[1.02] focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-800"
						style="--spotify: #1DB954; background-color: var(--spotify); border-color: var(--spotify);"
					>
						<LogIn class="h-5 w-5 mr-2" aria-hidden="true" />
						Sign in with Spotify
					</Button>

					<!-- Privacy Note -->
					<p class="text-xs text-gray-400 text-center leading-relaxed">
						We only use Spotify to fetch tracks you choose and to play snippets.
					</p>
				</CardContent>

				<CardFooter>
					<p class="text-xs text-gray-500 text-center w-full leading-relaxed">
						By continuing you agree to connect your Spotify account for playback & library access.
					</p>
				</CardFooter>
			</Card>
		</div>
	</main>
{:else}
	<!-- Signed-in state: Hide pre-login card, show placeholder -->
	<main class="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
		<div class="text-center">
			<h2 class="text-2xl font-bold text-white mb-2">Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}!</h2>
			<p class="text-gray-400">You're signed in and ready to play.</p>
			<p class="text-sm text-gray-500 mt-2">Game interface coming soon...</p>
		</div>
	</main>
{/if}
