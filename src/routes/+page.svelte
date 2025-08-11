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
		content="Connect your Spotify account and test your music knowledge with daily song guessing challenges."
	/>
</svelte:head>

{#if !session.loggedIn}
	<!-- Pre-login state: Show sign-in card -->
	<main class="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
		<div class="w-full max-w-md">
			<Card class="border-slate-700 bg-slate-800/80 backdrop-blur-sm">
				<CardHeader class="text-center">
					<CardTitle class="text-xl text-white">Sign in to get started</CardTitle>
					<CardDescription class="text-gray-300">
						Connect your Spotify account. If you have Premium, you'll unlock full‑track snippets via
						the Web Playback SDK.
					</CardDescription>
				</CardHeader>

				<CardContent class="space-y-6">
					<!-- Features List -->
					<ul class="space-y-3 text-gray-200">
						<li class="flex items-start gap-3">
							<Play class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" aria-hidden="true" />
							<span class="text-sm">Play a short snippet and guess the title.</span>
						</li>
						<li class="flex items-start gap-3">
							<ListMusic class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" aria-hidden="true" />
							<span class="text-sm">Use your own playlists or favorite artists.</span>
						</li>
						<li class="flex items-start gap-3">
							<Headphones class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" aria-hidden="true" />
							<span class="text-sm">Premium unlocks full‑track snippets & seeking.</span>
						</li>
					</ul>

					<!-- CTA Button -->
					<Button
						onclick={handleSignIn}
						class="w-full px-6 py-3 font-medium text-white transition-all duration-200 hover:scale-[1.02] focus:scale-[1.02] focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-800"
						style="--spotify: #1DB954; background-color: var(--spotify); border-color: var(--spotify);"
					>
						<LogIn class="mr-2 h-5 w-5" aria-hidden="true" />
						Sign in with Spotify
					</Button>

					<!-- Privacy Note -->
					<p class="text-center text-xs leading-relaxed text-gray-400">
						We only use Spotify to fetch tracks you choose and to play snippets.
					</p>
				</CardContent>

				<CardFooter>
					<p class="w-full text-center text-xs leading-relaxed text-gray-500">
						By continuing you agree to connect your Spotify account for playback & library access.
					</p>
				</CardFooter>
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
