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
