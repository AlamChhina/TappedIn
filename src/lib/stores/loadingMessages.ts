import { writable } from 'svelte/store';

export type ItemType = 'artist' | 'album' | 'playlist';

// Messages that rotate while fetching tracks
const LOADING_MESSAGES = [
	'Fetching tracks...',
	'Scanning artist discography...',
	'Processing album tracks...',
	'Loading song catalog...',
	'Building track library...',
	'Curating the best tracks...',
];

// Additional context-aware messages based on the type and size hints
const ARTIST_MESSAGES = [
	'Scanning albums and singles...',
	'This artist has a lot of music - hang tight!',
	'Processing discography...',
	'Loading songs from all eras...',
];

const LARGE_COLLECTION_MESSAGES = [
	'This is a big collection - please be patient!',
	'This might take a moment for such a large collection...',
];

const PLAYLIST_MESSAGES = [
	'Loading playlist tracks...',
	'Gathering playlist songs...',
];

const ALBUM_MESSAGES = [
	'Loading album tracks...',
	'Getting songs from this album...',
];

interface LoadingState {
	isLoading: boolean;
	currentMessage: string;
	messageIndex: number;
	itemName: string;
	itemType: ItemType;
	isLargeCollection: boolean;
}

const initialState: LoadingState = {
	isLoading: false,
	currentMessage: '',
	messageIndex: 0,
	itemName: '',
	itemType: 'artist',
	isLargeCollection: false
};

// Create the store
function createLoadingStore() {
	const { subscribe, set, update } = writable<LoadingState>(initialState);
	let rotationInterval: ReturnType<typeof setInterval> | null = null;
	let messagePool: string[] = [];

	const clearRotation = () => {
		if (rotationInterval) {
			clearInterval(rotationInterval);
			rotationInterval = null;
		}
	};

	const updateToNextMessage = () => {
		update(state => {
			if (!state.isLoading) return state;
			const nextIndex = (state.messageIndex + 1) % messagePool.length;
			return {
				...state,
				currentMessage: messagePool[nextIndex],
				messageIndex: nextIndex
			};
		});
	};

	const updateToFirstMessage = () => {
		update(state => {
			if (!state.isLoading) return state;
			return {
				...state,
				currentMessage: messagePool[0],
				messageIndex: 0
			};
		});
	};

	const buildMessagePool = (itemType: ItemType, isLargeCollection: boolean) => {
		let pool = [...LOADING_MESSAGES];
		
		if (itemType === 'artist') {
			pool.push(...ARTIST_MESSAGES);
		} else if (itemType === 'playlist') {
			pool.push(...PLAYLIST_MESSAGES);
		} else if (itemType === 'album') {
			pool.push(...ALBUM_MESSAGES);
		}
		
		if (isLargeCollection) {
			pool.push(...LARGE_COLLECTION_MESSAGES);
		}

		return pool.sort(() => Math.random() - 0.5);
	};

	return {
		subscribe,
		
		startLoading(itemName: string, itemType: ItemType, isLargeCollection = false) {
			clearRotation();
			messagePool = buildMessagePool(itemType, isLargeCollection);

			const initialMessage = `Fetching tracks from ${itemName}...`;
			set({
				isLoading: true,
				currentMessage: initialMessage,
				messageIndex: 0,
				itemName,
				itemType,
				isLargeCollection
			});

			// Start rotation after 4 seconds
			setTimeout(() => {
				updateToFirstMessage();
				rotationInterval = setInterval(updateToNextMessage, 5000);
			}, 4000);
		},

		stopLoading() {
			clearRotation();
			set(initialState);
		},

		setMessage(message: string) {
			update(state => ({
				...state,
				currentMessage: message
			}));
		}
	};
}

export const loadingMessages = createLoadingStore();
