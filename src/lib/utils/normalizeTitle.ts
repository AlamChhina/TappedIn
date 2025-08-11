/**
 * Normalize a song title for comparison by:
 * - Converting to lowercase
 * - Removing diacritics
 * - Removing bracketed content (...) and [...]
 * - Removing punctuation
 * - Stripping common suffixes (remaster, deluxe, live, radio edit, year tags)
 * - Collapsing whitespace
 */
export function normalizeTitle(title: string): string {
	if (!title) return '';

	let normalized = title
		// Convert to lowercase
		.toLowerCase()
		// Unicode normalize and remove diacritics
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		// Remove bracketed content like (feat. Artist) or [Remastered]
		.replace(/\([^)]*\)/g, '')
		.replace(/\[[^\]]*\]/g, '')
		// Remove punctuation except spaces and hyphens temporarily
		.replace(/[^\w\s-]/g, '')
		// Remove common suffixes
		.replace(
			/\s*-\s*(remaster|remastered|deluxe|live|radio\s*edit|explicit|clean)\s*(version|edition)?\s*$/g,
			''
		)
		// Remove year tags like "- 2023" or "(2023)"
		.replace(/\s*-?\s*\d{4}\s*$/g, '')
		// Remove remaining hyphens and collapse whitespace
		.replace(/-/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	return normalized;
}
