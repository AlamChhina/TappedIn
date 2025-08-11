/**
 * Pick a random element from an array
 */
export function pickRandom<T>(arr: T[]): T | null {
	if (!arr || arr.length === 0) return null;
	const randomIndex = Math.floor(Math.random() * arr.length);
	return arr[randomIndex];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffle<T>(arr: T[]): T[] {
	const shuffled = [...arr];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}
