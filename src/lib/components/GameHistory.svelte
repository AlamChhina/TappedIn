<script lang="ts">
	import { 
		Trophy, 
		Target, 
		Calendar, 
		Music, 
		Album, 
		ListMusic, 
		CheckCircle, 
		XCircle,
		Clock,
		Flame,
		User,
		Play,
		Shuffle,
		ChevronDown,
		ChevronUp,
		History
	} from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import type { GameSession, SessionSummary, GameMode, PlaybackMode, SearchResultType } from '$lib/types';

	// Props
	interface Props {
		history: GameSession[];
		currentSessionId?: string | null;
		showAll?: boolean;
	}

	let { history, currentSessionId, showAll = false }: Props = $props();

	// Debug logging
	$effect(() => {
		console.log('GameHistory - Received history:', history);
		console.log('GameHistory - History length:', history.length);
		console.log('GameHistory - showAll:', showAll);
		console.log('GameHistory - displaySessions:', displaySessions);
		console.log('GameHistory - displaySessions length:', displaySessions.length);
	});

	// State for expanded sessions
	let expandedSessions = $state<Set<string>>(new Set());

	// Helper functions
	function getSessionSummary(session: GameSession): SessionSummary {
		const correct = session.guesses.filter(g => g.isCorrect).length;
		const total = session.guesses.length;
		const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

		return { correct, total, percentage };
	}

	function getTypeIcon(type: SearchResultType) {
		switch (type) {
			case 'artist':
				return Music;
			case 'album':
				return Album;
			case 'playlist':
				return ListMusic;
		}
	}

	function getModeIcon(mode: GameMode) {
		return mode === 'classic' ? Target : Music;
	}

	function getPlaybackIcon(playbackMode: PlaybackMode) {
		return playbackMode === 'beginning' ? Play : Shuffle;
	}

	function formatTimeAgo(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		
		return date.toLocaleDateString();
	}

	function getClassicDisplay(triesUsed?: number, maxTries?: number): { used: number; total: number } | null {
		if (triesUsed === undefined || maxTries === undefined) return null;
		return { used: triesUsed, total: maxTries };
	}

	function getScoreColor(percentage: number): string {
		if (percentage >= 80) return 'text-green-400';
		if (percentage >= 60) return 'text-yellow-400';
		if (percentage >= 40) return 'text-orange-400';
		return 'text-red-400';
	}

	// Filter out sessions with no guesses for cleaner display
	const sessionsWithGuesses = $derived(() => {
		const filtered = history.filter(session => session.guesses.length > 0);
		return showAll ? filtered : filtered.slice(0, 10);
	});

	// Computed value for filtered sessions
	const displaySessions = $derived(sessionsWithGuesses());

	// Helper functions for accordion
	function toggleSession(sessionId: string) {
		const newExpanded = new Set(expandedSessions);
		if (newExpanded.has(sessionId)) {
			newExpanded.delete(sessionId);
		} else {
			newExpanded.add(sessionId);
		}
		expandedSessions = newExpanded;
	}

	function isSessionExpanded(sessionId: string): boolean {
		return expandedSessions.has(sessionId);
	}

	function isCurrentSession(sessionId: string): boolean {
		return currentSessionId === sessionId;
	}

	function shouldShowGuesses(session: GameSession): boolean {
		return isCurrentSession(session.id) || isSessionExpanded(session.id);
	}
</script>

<!-- Debug Section (remove in production)
<div class="mb-4 p-2 border border-yellow-500 text-yellow-400 text-xs">
	<div>Total history items: {history.length}</div>
	<div>Sessions with guesses: {displaySessions.length}</div>
	<div>Show all: {showAll}</div>
</div> -->

{#if displaySessions.length > 0}
	<div class="mx-auto w-full max-w-2xl space-y-4 mt-12">
		<div 
			class="rounded-lg border p-4"
			style="border-color: #282828; background-color: rgba(18, 18, 18, 0.6);"
		>
			<div class="mb-4 flex items-center gap-2">
				<Trophy class="h-5 w-5 text-yellow-400" />
				<h3 class="text-lg font-semibold text-white">Game History</h3>
			</div>

			<div class="space-y-4">
				{#each displaySessions as session, index (session.id)}
					{@const summary = getSessionSummary(session)}
					{@const TypeIcon = getTypeIcon(session.itemType)}
					{@const ModeIcon = getModeIcon(session.mode)}
					{@const PlaybackIcon = getPlaybackIcon(session.playbackMode)}
					
					<div 
						class="rounded-lg border p-4 space-y-3"
						style="border-color: #404040; background-color: rgba(24, 24, 24, 0.8);"
					>
						<!-- Session Header -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<!-- Item Image -->
								{#if session.itemImage}
									<img
										src={session.itemImage}
										alt={session.itemName}
										class="h-10 w-10 border-2 object-cover {session.itemType === 'artist'
											? 'rounded-full'
											: 'rounded-sm'}"
										style="border-color: #282828;"
									/>
								{:else}
									<div
										class="flex h-10 w-10 items-center justify-center border-2 {session.itemType === 'artist'
											? 'rounded-full'
											: 'rounded-sm'}"
										style="background-color: #282828; border-color: #181818;"
									>
										<TypeIcon class="h-5 w-5 text-gray-400" />
									</div>
								{/if}

								<div class="flex items-center gap-3">
									<span class="font-medium text-white">{session.itemName}</span>
									
									<div class="flex items-center gap-2 text-xs">
										<div class="flex items-center gap-1 text-gray-400">
											<ModeIcon class="h-3 w-3" />
											<span class="capitalize">{session.mode}</span>
										</div>
										<div class="text-gray-600">•</div>
										<div class="flex items-center gap-1 text-gray-400">
											<PlaybackIcon class="h-3 w-3" />
											<span class="capitalize">{session.playbackMode}</span>
										</div>
									</div>
								</div>
							</div>

							<div class="text-xs text-gray-400">
								{formatTimeAgo(session.startTime)}
							</div>
						</div>

						<!-- Score Summary -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<div class="flex items-center gap-2">
									<span class="text-sm text-gray-300">Score:</span>
									<span class="font-bold {getScoreColor(summary.percentage)}">
										{summary.correct}/{summary.total}
									</span>
									<span class="text-xs text-gray-400">({summary.percentage}%)</span>
								</div>
								
								{#if summary.percentage === 100 && summary.total >= 3}
									<div class="flex items-center gap-1">
										<Flame class="h-4 w-4 text-orange-400" />
										<span class="text-xs font-medium text-orange-400">Perfect!</span>
									</div>
								{/if}
							</div>

							<div class="flex items-center gap-3">
								<div class="text-xs text-gray-400">
									{session.guesses.length} song{session.guesses.length !== 1 ? 's' : ''}
								</div>

								<!-- Accordion button for past sessions -->
								{#if !isCurrentSession(session.id)}
									<button
										class="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
										onclick={() => toggleSession(session.id)}
									>
										{#if isSessionExpanded(session.id)}
											<ChevronUp class="h-3 w-3" />
											<span>Hide</span>
										{:else}
											<ChevronDown class="h-3 w-3" />
											<span>Show</span>
										{/if}
									</button>
								{/if}
							</div>
						</div>

						<!-- Guesses Display -->
						{#if shouldShowGuesses(session)}
							<div class="space-y-2">
								{#each session.guesses.slice().reverse() as guess}
									{@const classicData = getClassicDisplay(guess.triesUsed, guess.maxTries)}
									<div class="flex items-center justify-between text-xs">
										<div class="flex items-center gap-2 flex-1 min-w-0">
											{#if guess.isCorrect}
												<CheckCircle class="h-3 w-3 text-green-400 flex-shrink-0" />
											{:else}
												<XCircle class="h-3 w-3 text-red-400 flex-shrink-0" />
											{/if}
											
											<span class="font-medium text-white truncate">
												{guess.songName}
											</span>
											
											{#if session.itemType === 'playlist' && guess.artistNames.length > 0}
												<span class="text-gray-400 truncate">
													by {guess.artistNames.join(', ')}
												</span>
											{/if}
										</div>

										<!-- Classic Mode Tries Display -->
										{#if session.mode === 'classic' && classicData}
											<div class="flex items-center gap-1 flex-shrink-0">
												{#each Array(classicData.total) as _, index}
													<div
														class="h-2 w-2 rounded-full border {index < classicData.used
															? 'bg-red-500 border-red-500'
															: guess.isCorrect 
																? 'bg-green-500 border-green-500'
																: 'bg-gray-600 border-gray-600 opacity-60'}"
													></div>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Show Full History Button -->
			{#if !showAll && history.filter(session => session.guesses.length > 0).length > 10}
				<div class="mt-6 text-center">
					<Button 
						onclick={() => goto('/history')}
						class="flex items-center gap-2 cursor-pointer"
					>
						<History class="h-4 w-4" />
						Show Full History ({history.filter(session => session.guesses.length > 0).length} sessions)
					</Button>
				</div>
			{/if}

			{#if displaySessions.length > 10 && !showAll}
				<div class="mt-4 text-center text-xs text-gray-400">
					Showing latest 10 of {history.filter(session => session.guesses.length > 0).length} sessions
				</div>
			{/if}
		</div>
	</div>
{/if}
