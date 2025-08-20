export type GameTrack = {
	id: string;
	uri: string; // ensure populated (e.g., `spotify:track:${id}`)
	name: string;
	popularity: number;
	artistIds: string[];
	artistNames: string[];
	duration_ms: number; // Track duration in milliseconds
};

export type Artist = {
	id: string;
	name: string;
	images: { url: string; height: number; width: number }[];
};

export type Album = {
	id: string;
	name: string;
	images: { url: string; height: number; width: number }[];
	artist: string;
	total_tracks: number;
	release_date: string;
	album_type: string;
};

export type Playlist = {
	id: string;
	name: string;
	images: { url: string; height: number; width: number }[];
	owner: {
		id: string;
		display_name: string;
	};
	tracks: {
		total: number;
	};
	description?: string;
	isUserOwned?: boolean;
};

export type SearchResult = Artist | Album | Playlist;

export type SearchResultType = 'artist' | 'album' | 'playlist';

export type SpotifySDKToken = {
	access_token: string;
	expires_in: number;
};

export type PlayerState = 'idle' | 'connecting' | 'ready' | 'error';
export type GuessStatus = 'idle' | 'correct' | 'incorrect';

// History Types
export type GameMode = 'classic' | 'zen';
export type PlaybackMode = 'beginning' | 'random';

export type GuessResult = {
	id: string;
	songName: string;
	artistNames: string[];
	isCorrect: boolean;
	timestamp: Date;
	// Classic mode specific
	triesUsed?: number; // Number of tries for classic mode (0-3)
	maxTries?: number; // Max tries available (typically 4)
};

export type GameSession = {
	id: string;
	mode: GameMode;
	playbackMode: PlaybackMode;
	itemName: string; // Artist, album, or playlist name
	itemType: SearchResultType;
	itemId: string;
	itemImage?: string; // Add artwork URL
	startTime: Date;
	endTime?: Date;
	guesses: GuessResult[];
	highestStreak?: number; // Track the highest streak achieved in this session
};

export type SessionSummary = {
	correct: number;
	total: number;
	percentage: number;
};
