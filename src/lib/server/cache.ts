import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { SimplifiedTrack } from './spotify.js';

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
	ttl?: number; // Default TTL in milliseconds
	maxSize?: number; // Max number of entries in memory cache
	persistToDisk?: boolean; // Whether to persist cache to disk
	cacheDir?: string; // Directory to store cache files
}

const DEFAULT_OPTIONS: Required<CacheOptions> = {
	ttl: 24 * 60 * 60 * 1000, // 24 hours
	maxSize: 1000, // Max 1000 entries in memory
	persistToDisk: true,
	cacheDir: '.cache/spotify'
};

/**
 * Simple LRU cache with optional disk persistence for Spotify API responses.
 * Designed to cache artist tracks, playlist tracks, and API responses to improve
 * performance and reduce rate limiting.
 */
export class SpotifyCache {
	private readonly memoryCache = new Map<string, CacheEntry<any>>();
	private readonly accessOrder = new Map<string, number>(); // Track access order for LRU
	private readonly options: Required<CacheOptions>;
	private accessCounter = 0;

	constructor(options: CacheOptions = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	/**
	 * Generate a cache key for artist tracks
	 */
	private getArtistTracksKey(artistId: string): string {
		return `artist:${artistId}:tracks`;
	}

	/**
	 * Generate a cache key for playlist tracks
	 */
	private getPlaylistTracksKey(playlistId: string): string {
		return `playlist:${playlistId}:tracks`;
	}

	/**
	 * Generate a cache key for API responses (albums, track batches, etc.)
	 */
	private getApiResponseKey(endpoint: string, params: Record<string, string> = {}): string {
		const paramString = Object.keys(params)
			.sort((a, b) => a.localeCompare(b))
			.map((key) => `${key}=${params[key]}`)
			.join('&');
		return `api:${endpoint}:${paramString}`;
	}

	/**
	 * Get cache file path for a key
	 */
	private getCacheFilePath(key: string): string {
		const safeKey = key.replace(/[^a-zA-Z0-9:_-]/g, '_');
		return join(this.options.cacheDir, `${safeKey}.json`);
	}

	/**
	 * Check if a cache entry is valid (not expired)
	 */
	private isValid<T>(entry: CacheEntry<T>): boolean {
		return Date.now() - entry.timestamp < entry.ttl;
	}

	/**
	 * Evict least recently used entries if cache is full
	 */
	private evictLRU(): void {
		if (this.memoryCache.size < this.options.maxSize) return;

		let oldestKey = '';
		let oldestAccess = Infinity;

		for (const [key, accessTime] of this.accessOrder) {
			if (accessTime < oldestAccess) {
				oldestAccess = accessTime;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.memoryCache.delete(oldestKey);
			this.accessOrder.delete(oldestKey);
		}
	}

	/**
	 * Update access order for LRU tracking
	 */
	private updateAccessOrder(key: string): void {
		this.accessOrder.set(key, ++this.accessCounter);
	}

	/**
	 * Load cache entry from disk
	 */
	private async loadFromDisk<T>(key: string): Promise<CacheEntry<T> | null> {
		if (!this.options.persistToDisk) return null;

		try {
			const filePath = this.getCacheFilePath(key);
			if (!existsSync(filePath)) return null;

			const content = await readFile(filePath, 'utf-8');
			const entry: CacheEntry<T> = JSON.parse(content);

			if (!this.isValid(entry)) {
				// Entry expired, remove from disk
				// We don't await this to avoid blocking
				this.deleteFromDisk(key).catch(() => {
					// Ignore errors in cleanup
				});
				return null;
			}

			return entry;
		} catch {
			return null;
		}
	}

	/**
	 * Save cache entry to disk
	 */
	private async saveToDisk<T>(key: string, entry: CacheEntry<T>): Promise<void> {
		if (!this.options.persistToDisk) return;

		try {
			// Ensure cache directory exists
			if (!existsSync(this.options.cacheDir)) {
				await mkdir(this.options.cacheDir, { recursive: true });
			}

			const filePath = this.getCacheFilePath(key);
			await writeFile(filePath, JSON.stringify(entry), 'utf-8');
		} catch (error) {
			console.warn(`Failed to save cache entry to disk: ${error}`);
			// Continue without disk caching
		}
	}

	/**
	 * Delete cache entry from disk
	 */
	private async deleteFromDisk(key: string): Promise<void> {
		if (!this.options.persistToDisk) return;

		try {
			const filePath = this.getCacheFilePath(key);
			if (existsSync(filePath)) {
				const { unlink } = await import('fs/promises');
				await unlink(filePath);
			}
		} catch {
			// Ignore errors in cleanup
		}
	}

	/**
	 * Get value from cache
	 */
	async get<T>(key: string): Promise<T | null> {
		// Try memory cache first
		let entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

		if (entry && this.isValid(entry)) {
			this.updateAccessOrder(key);
			return entry.data;
		}

		// Try disk cache
		const diskEntry = await this.loadFromDisk<T>(key);
		if (diskEntry && this.isValid(diskEntry)) {
			// Load back into memory cache
			this.evictLRU();
			this.memoryCache.set(key, diskEntry);
			this.updateAccessOrder(key);
			return diskEntry.data;
		}

		return null;
	}

	/**
	 * Set value in cache
	 */
	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		const entry: CacheEntry<T> = {
			data: value,
			timestamp: Date.now(),
			ttl: ttl ?? this.options.ttl
		};

		// Save to memory cache
		this.evictLRU();
		this.memoryCache.set(key, entry);
		this.updateAccessOrder(key);

		// Save to disk cache (don't await to avoid blocking)
		this.saveToDisk(key, entry).catch(() => {
			// Ignore errors in disk save
		});
	}

	/**
	 * Delete value from cache
	 */
	async delete(key: string): Promise<void> {
		this.memoryCache.delete(key);
		this.accessOrder.delete(key);
		await this.deleteFromDisk(key);
	}

	/**
	 * Clear all cache entries
	 */
	async clear(): Promise<void> {
		this.memoryCache.clear();
		this.accessOrder.clear();
		this.accessCounter = 0;

		if (this.options.persistToDisk) {
			try {
				if (existsSync(this.options.cacheDir)) {
					const { readdir, unlink } = await import('fs/promises');
					const files = await readdir(this.options.cacheDir);
					await Promise.all(
						files
							.filter((file) => file.endsWith('.json'))
							.map((file) => unlink(join(this.options.cacheDir, file)))
					);
				}
			} catch (error) {
				console.warn(`Failed to clear disk cache: ${error}`);
			}
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		memoryEntries: number;
		maxSize: number;
		hitRate?: number;
	} {
		return {
			memoryEntries: this.memoryCache.size,
			maxSize: this.options.maxSize
		};
	}

	// Convenience methods for common cache operations

	/**
	 * Cache artist tracks
	 */
	async cacheArtistTracks(artistId: string, tracks: SimplifiedTrack[]): Promise<void> {
		const key = this.getArtistTracksKey(artistId);
		await this.set(key, tracks);
	}

	/**
	 * Invalidate cached artist tracks (useful when we know an artist has new releases)
	 */
	async invalidateArtistTracks(artistId: string): Promise<void> {
		const key = this.getArtistTracksKey(artistId);
		await this.delete(key);
		
		// Also invalidate related API cache entries
		await this.delete(this.getApiResponseKey('artist-albums', { artistId }));
	}

	/**
	 * Invalidate cached playlist tracks
	 */
	async invalidatePlaylistTracks(playlistId: string): Promise<void> {
		const key = this.getPlaylistTracksKey(playlistId);
		await this.delete(key);
	}

	/**
	 * Get cached artist tracks
	 */
	async getCachedArtistTracks(artistId: string): Promise<SimplifiedTrack[] | null> {
		const key = this.getArtistTracksKey(artistId);
		return this.get<SimplifiedTrack[]>(key);
	}

	/**
	 * Cache playlist tracks
	 */
	async cachePlaylistTracks(playlistId: string, tracks: any[]): Promise<void> {
		const key = this.getPlaylistTracksKey(playlistId);
		await this.set(key, tracks);
	}

	/**
	 * Get cached playlist tracks
	 */
	async getCachedPlaylistTracks(playlistId: string): Promise<any[] | null> {
		const key = this.getPlaylistTracksKey(playlistId);
		return this.get<any[]>(key);
	}

	/**
	 * Cache API response
	 */
	async cacheApiResponse<T>(
		endpoint: string,
		params: Record<string, string>,
		data: T,
		ttl?: number
	): Promise<void> {
		const key = this.getApiResponseKey(endpoint, params);
		await this.set(key, data, ttl);
	}

	/**
	 * Get cached API response
	 */
	async getCachedApiResponse<T>(
		endpoint: string,
		params: Record<string, string> = {}
	): Promise<T | null> {
		const key = this.getApiResponseKey(endpoint, params);
		return this.get<T>(key);
	}
}

// Create a global cache instance
const cache = new SpotifyCache({
	ttl: 24 * 60 * 60 * 1000, // 24 hours for tracks
	maxSize: 500, // Keep 500 entries in memory
	persistToDisk: true,
	cacheDir: '.cache/spotify'
});

export { cache };
