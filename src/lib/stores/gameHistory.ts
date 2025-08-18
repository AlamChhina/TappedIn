import { writable } from 'svelte/store';
import type { GameSession, GuessResult, GameMode, PlaybackMode, SearchResultType, SessionSummary } from '$lib/types';
import { browser } from '$app/environment';

// Storage key for persistence
const STORAGE_KEY = 'gts-game-history';

// Create the writable store
function createGameHistoryStore() {
	// Initialize with empty array or load from localStorage
	const initialHistory = browser ? loadHistoryFromStorage() : [];
	const { subscribe, set, update } = writable<GameSession[]>(initialHistory);

	return {
		subscribe,
		
		// Start a new session
		startSession: (
			mode: GameMode,
			playbackMode: PlaybackMode,
			itemName: string,
			itemType: SearchResultType,
			itemId: string,
			itemImage?: string
		) => {
			const newSession: GameSession = {
				id: generateSessionId(),
				mode,
				playbackMode,
				itemName,
				itemType,
				itemId,
				itemImage,
				startTime: new Date(),
				guesses: []
			};

			update(history => {
				const updatedHistory = [newSession, ...history];
				saveHistoryToStorage(updatedHistory);
				return updatedHistory;
			});

			return newSession.id;
		},

		// Add a guess to the current session
		addGuess: (
			sessionId: string,
			songName: string,
			artistNames: string[],
			isCorrect: boolean,
			triesUsed?: number,
			maxTries?: number
		) => {
			const guess: GuessResult = {
				id: generateGuessId(),
				songName,
				artistNames,
				isCorrect,
				timestamp: new Date(),
				triesUsed,
				maxTries
			};

			update(history => {
				const updatedHistory = history.map(session => {
					if (session.id === sessionId) {
						return {
							...session,
							guesses: [...session.guesses, guess]
						};
					}
					return session;
				});
				saveHistoryToStorage(updatedHistory);
				return updatedHistory;
			});
		},

		// End a session
		endSession: (sessionId: string) => {
			update(history => {
				const updatedHistory = history.map(session => {
					if (session.id === sessionId) {
						return {
							...session,
							endTime: new Date()
						};
					}
					return session;
				});
				saveHistoryToStorage(updatedHistory);
				return updatedHistory;
			});
		},

		// Check if current context should start a new session
		shouldStartNewSession: (
			currentSessionId: string | null,
			mode: GameMode,
			playbackMode: PlaybackMode,
			itemId: string,
			history: GameSession[]
		): boolean => {
			if (!currentSessionId) return true;

			const currentSession = history.find(s => s.id === currentSessionId);
			if (!currentSession) return true;

			// Start new session if any key parameter changed
			return (
				currentSession.mode !== mode ||
				currentSession.playbackMode !== playbackMode ||
				currentSession.itemId !== itemId
			);
		},

		// Get summary for a session
		getSessionSummary: (session: GameSession): SessionSummary => {
			const correct = session.guesses.filter(g => g.isCorrect).length;
			const total = session.guesses.length;
			const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

			return { correct, total, percentage };
		},

		// Clear all history
		clear: () => {
			set([]);
			if (browser) {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	};
}

// Helper functions
function generateSessionId(): string {
	return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function generateGuessId(): string {
	return `guess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function loadHistoryFromStorage(): GameSession[] {
	try {
		console.log('Loading history from storage...');
		const stored = localStorage.getItem(STORAGE_KEY);
		console.log('Stored data:', stored);
		if (!stored) {
			console.log('No stored data found');
			return [];
		}

		const parsed = JSON.parse(stored);
		console.log('Parsed data:', parsed);
		// Convert date strings back to Date objects
		const result = parsed.map((session: any) => ({
			...session,
			startTime: new Date(session.startTime),
			endTime: session.endTime ? new Date(session.endTime) : undefined,
			guesses: session.guesses.map((guess: any) => ({
				...guess,
				timestamp: new Date(guess.timestamp)
			}))
		}));
		console.log('Converted result:', result);
		return result;
	} catch (error) {
		console.error('Failed to load history from storage:', error);
		return [];
	}
}

function saveHistoryToStorage(history: GameSession[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
	} catch (error) {
		console.error('Failed to save history to storage:', error);
	}
}

// Create and export the store
export const gameHistory = createGameHistoryStore();
