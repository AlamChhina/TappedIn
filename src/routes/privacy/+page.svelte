<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Mail, Shield, Database, Users, Clock, Lock, Eye, Trash2, Globe, UserCheck } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Privacy Policy - Tapped In</title>
	<meta name="description" content="Privacy Policy for Tapped In - Learn how we handle your Spotify data and protect your privacy." />
</svelte:head>

<div class="min-h-screen text-white" style="background-color: #121212;">
	<div class="mx-auto max-w-4xl px-4 py-8">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="mb-4 text-4xl font-bold" style="color: #1DB954;">Privacy Policy</h1>
		</div>

		<!-- What We Collect -->
		<div class="mb-8 rounded-lg p-6" style="background-color: #181818; border: 1px solid #282828;">
			<div class="flex items-center gap-3 mb-4">
				<Database class="h-6 w-6" style="color: #1DB954;" />
				<h2 class="text-2xl font-semibold">What Data We Collect</h2>
			</div>
			<div class="space-y-4 text-gray-300">
				<div>
					<h3 class="text-lg font-medium text-white mb-2">Spotify Data (via OAuth)</h3>
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr style="border-bottom: 1px solid #282828;">
									<th class="text-left py-2 px-3 font-medium text-white">Spotify Scope</th>
									<th class="text-left py-2 px-3 font-medium text-white">Data Collected</th>
									<th class="text-left py-2 px-3 font-medium text-white">How We Use It</th>
								</tr>
							</thead>
							<tbody>
								<tr style="border-bottom: 1px solid #282828;">
									<td class="py-2 px-3"><code class="text-xs bg-gray-800 px-2 py-1 rounded">user-read-private</code></td>
									<td class="py-2 px-3">Spotify ID, display name, profile image URL, subscription type</td>
									<td class="py-2 px-3">User authentication and profile display</td>
								</tr>
								<tr style="border-bottom: 1px solid #282828;">
									<td class="py-2 px-3"><code class="text-xs bg-gray-800 px-2 py-1 rounded">user-read-email</code></td>
									<td class="py-2 px-3">Email address</td>
									<td class="py-2 px-3">Account identification and support communications</td>
								</tr>
								<tr style="border-bottom: 1px solid #282828;">
									<td class="py-2 px-3"><code class="text-xs bg-gray-800 px-2 py-1 rounded">user-read-playback-state</code></td>
									<td class="py-2 px-3">Current track, artist, album info, playback device</td>
									<td class="py-2 px-3">Generate guessing game questions from current music</td>
								</tr>
								<tr style="border-bottom: 1px solid #282828;">
									<td class="py-2 px-3"><code class="text-xs bg-gray-800 px-2 py-1 rounded">user-modify-playback-state</code></td>
									<td class="py-2 px-3">Control over playback (play/pause/skip)</td>
									<td class="py-2 px-3">Provide music playback during game sessions</td>
								</tr>
								<tr>
									<td class="py-2 px-3"><code class="text-xs bg-gray-800 px-2 py-1 rounded">streaming</code></td>
									<td class="py-2 px-3">Access to Spotify Web Playback SDK</td>
									<td class="py-2 px-3">Stream music directly in the web browser for gameplay</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
				<div>
					<h3 class="text-lg font-medium text-white mb-2">Game Data</h3>
					<ul class="list-disc pl-6 space-y-1">
						<li>Game scores and performance statistics</li>
						<li>User guesses and game session timestamps</li>
						<li>Game history and progress tracking</li>
					</ul>
					<p class="mt-2 text-sm text-gray-400">
						<strong>Note:</strong> We do NOT store or download full track audio files. We only access metadata and use Spotify's web player for audio playback.
					</p>
				</div>
			</div>
		</div>

		<!-- How We Use Data -->
		<div class="mb-8 rounded-lg p-6" style="background-color: #181818; border: 1px solid #282828;">
			<div class="flex items-center gap-3 mb-4">
				<Users class="h-6 w-6" style="color: #1DB954;" />
				<h2 class="text-2xl font-semibold">How We Use Your Data</h2>
			</div>
			<ul class="space-y-3 text-gray-300">
				<li class="flex items-start gap-3">
					<UserCheck class="h-5 w-5 mt-0.5 flex-shrink-0" style="color: #1DB954;" />
					<span><strong>Authentication:</strong> Verify your identity and create your game session</span>
				</li>
				<li class="flex items-start gap-3">
					<Users class="h-5 w-5 mt-0.5 flex-shrink-0" style="color: #1DB954;" />
					<span><strong>Game Operations:</strong> Run the music guessing game using your Spotify music data</span>
				</li>
				<li class="flex items-start gap-3">
					<Database class="h-5 w-5 mt-0.5 flex-shrink-0" style="color: #1DB954;" />
					<span><strong>Game History:</strong> Track your scores, progress, and provide game statistics</span>
				</li>
			</ul>
		</div>

		<!-- Data Sharing -->
		<div class="mb-8 rounded-lg p-6" style="background-color: #181818; border: 1px solid #282828;">
			<div class="flex items-center gap-3 mb-4">
				<Eye class="h-6 w-6" style="color: #1DB954;" />
				<h2 class="text-2xl font-semibold">Data Sharing & Third Parties</h2>
			</div>
			<div class="space-y-4 text-gray-300">
				<div>
					<h3 class="text-lg font-medium text-white mb-2">Third Party Services</h3>
					<ul class="list-disc pl-6 space-y-1">
						<li><strong>Hosting Provider:</strong> For secure application hosting and data storage</li>
						<li><strong>Spotify Web API:</strong> For accessing your authorized music data</li>
					</ul>
				</div>
				<div class="p-4 rounded-lg" style="background-color: #0d4429">
					<p class="font-medium">We do NOT sell, rent, or share your personal data with advertisers or data brokers</p>
				</div>
			</div>
		</div>

		<!-- Data Retention -->
		<div class="mb-8 rounded-lg p-6" style="background-color: #181818; border: 1px solid #282828;">
			<div class="flex items-center gap-3 mb-4">
				<Clock class="h-6 w-6" style="color: #1DB954;" />
				<h2 class="text-2xl font-semibold">Data Retention</h2>
			</div>
			<div class="space-y-3 text-gray-300">
				<div class="flex items-start gap-3">
					<div class="w-2 h-2 rounded-full mt-2 flex-shrink-0" style="background-color: #1DB954;"></div>
					<span><strong>Access Tokens:</strong> Automatically expire after 1 hour (managed by Spotify)</span>
				</div>
				<div class="flex items-start gap-3">
					<div class="w-2 h-2 rounded-full mt-2 flex-shrink-0" style="background-color: #1DB954;"></div>
					<span><strong>Game History:</strong> Retained indefinitely unless you request deletion</span>
				</div>
			
			</div>
		</div>

		
	</div>
</div>
