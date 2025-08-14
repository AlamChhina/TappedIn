# Album Deduplication Utility

This module provides utilities to deduplicate Spotify albums that are often returned as multiple versions (clean/explicit) of the same release.

## Problem

Spotify often returns **two identical albums** for the same release: a **clean/edited** and a **normal/explicit** version. They have the **same title**, **same artists**, **same year**, and **same total_tracks**. This creates a poor user experience when browsing search results.

## Solution

The `albumDeduplication` utility identifies and collapses these duplicate albums, preferring the **explicit/normal** variant while keeping legitimate different editions (Deluxe, Remaster, etc.) separate.

## Features

- ✅ **Smart Grouping**: Groups albums by identity (name + artists + year + track count + type)
- ✅ **Explicit Preference**: Fetches full album data to count explicit tracks and prefer explicit versions
- ✅ **Edition Awareness**: Keeps "Deluxe/Expanded/Remaster/Anniversary/Live" editions separate
- ✅ **Market-Aware**: Prefers albums available in the user's market when tie-breaking
- ✅ **Efficient Batching**: Only makes API requests for duplicate groups, batches up to 20 IDs per call
- ✅ **Rate Limiting**: Handles Spotify API rate limits gracefully
- ✅ **Fast Path**: Optional fast deduplication without API calls

## API Reference

### Main Functions

#### `collapseExactDuplicatesPreferExplicit(token, albums, opts?)`

The primary function that makes API calls to determine the best version of duplicate albums.

```typescript
const dedupedAlbums = await collapseExactDuplicatesPreferExplicit(
  accessToken, 
  albums, 
  { market: 'US' }
);
```

**Parameters:**
- `token: string` - Spotify access token
- `albums: SpotifyAlbumObjectSimplified[]` - Array of albums from Spotify search
- `opts?: { market?: string }` - Optional market code for availability preference

**Returns:** `Promise<SpotifyAlbumObjectSimplified[]>` - Deduplicated albums

#### `collapseExactDuplicatesFast(albums, opts?)`

Fast deduplication without API calls. Doesn't guarantee explicit preference but is useful for quick deduplication.

```typescript
const dedupedAlbums = collapseExactDuplicatesFast(albums, { market: 'US' });
```

**Parameters:**
- `albums: SpotifyAlbumObjectSimplified[]` - Array of albums from Spotify search  
- `opts?: { market?: string }` - Optional market code for availability preference

**Returns:** `SpotifyAlbumObjectSimplified[]` - Deduplicated albums

### Helper Functions for Internal Album Type

#### `collapseAlbumDuplicatesPreferExplicit(token, albums, opts?)`
#### `collapseAlbumDuplicatesFast(albums, opts?)`

These work with the internal `Album` type from `$lib/types` for convenience.

## Integration Example

### In Search API Route

```typescript
// src/routes/api/spotify/search/+server.ts
import { collapseExactDuplicatesPreferExplicit } from '$lib/utils/albumDeduplication';

export const GET: RequestHandler = async ({ url, cookies }) => {
  // ... existing search logic ...
  
  // After getting search results
  const rawAlbums = data.albums?.items || [];
  
  // Deduplicate albums, preferring explicit versions
  const dedupedAlbums = await collapseExactDuplicatesPreferExplicit(
    accessToken, 
    rawAlbums, 
    { market: userMarket }
  );
  
  // ... process dedupedAlbums for response ...
};
```

### In Svelte Component

```svelte
<script lang="ts">
  import { collapseExactDuplicatesPreferExplicit } from '$lib';
  
  async function searchAlbums(query: string) {
    const response = await fetch(\`/api/spotify/search?q=\${query}\`);
    const albums = await response.json();
    
    // Albums are already deduplicated by the API route
    return albums;
  }
</script>
```

## Algorithm

1. **Group by Identity**: Albums are grouped using a key that combines:
   - Normalized name (lowercase, trimmed)
   - Sorted artist IDs
   - Release year
   - Total tracks
   - Album type

2. **Fetch Full Details**: For groups with duplicates, fetch full album objects via `/v1/albums?ids=...` (batched, max 20 per call)

3. **Score by Explicitness**: Count `tracks.items[].explicit === true` for each album

4. **Apply Tie-breakers**:
   - Highest explicit track count
   - Available in target market
   - Newer release date  
   - Lexicographic ID (stable fallback)

## Examples of What Gets Deduplicated

### ✅ Will Be Deduplicated
- "Album Title" (Clean) + "Album Title" (Explicit) → Keeps Explicit
- Same artist, year, track count, different content rating

### ❌ Will NOT Be Deduplicated  
- "Album Title" + "Album Title (Deluxe Edition)" → Different track counts
- "Album Title" + "Album Title (Remastered)" → Different names
- Different artists with same album name
- Different release years

## Testing

```bash
# Run the album deduplication tests
npx vitest run src/lib/utils/albumDeduplication.test.ts
```

The test suite covers:
- Basic deduplication logic
- API batching and rate limiting
- Edge cases and error handling
- Explicit preference scoring
- Market availability preferences

## Performance Considerations

- **API Calls**: Only made for albums that have duplicates
- **Batching**: Up to 20 album IDs per API call
- **Rate Limiting**: Built-in handling with retry logic
- **Fast Path**: Use `collapseExactDuplicatesFast` when API calls aren't feasible
- **Fallback**: Graceful degradation if API calls fail
