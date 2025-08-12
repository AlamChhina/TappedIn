export type GameTrack = {
	id: string;
	uri: string; // ensure populated (e.g., `spotify:track:${id}`)
	name: string;
	popularity: number;
	artistIds: string[];
	artistNames: string[];
};

export type Artist = {
	id: string;
	name: string;
	images: { url: string; height: number; width: number }[];
};

export type SpotifySDKToken = {
	access_token: string;
	expires_in: number;
};

export type PlayerState = 'idle' | 'connecting' | 'ready' | 'error';
export type GuessStatus = 'idle' | 'correct' | 'incorrect';
