# Loading Messages

This document describes the rotating loading messages system implemented to provide a better user experience while fetching tracks from Spotify.

## Overview

The loading messages system displays rotating, contextual messages while tracks are being fetched from the Spotify API. This helps keep users engaged and informed during potentially long loading times, especially for artists with large discographies or playlists with many tracks.

## Features

### Rotating Messages
- Messages rotate every 3 seconds after an initial 2-second delay
- Messages are randomized each time to provide variety
- Initial message always shows "Fetching tracks from [item name]..."

### Contextual Messages
The system provides different message pools based on the type of content being loaded:

#### General Messages
- "Fetching tracks..."
- "Gathering musical gems..."
- "Curating the best tracks..."
- "Almost ready to play..."
- And more...

#### Artist-Specific Messages
- "Exploring the artist's entire catalog..."
- "Scanning albums and singles..."
- "Processing discography..."
- "Filtering out duplicates and remixes..."

#### Playlist Messages
- "Loading playlist tracks..."
- "Processing playlist contents..."
- "Loading curated tracks..."

#### Album Messages
- "Loading album tracks..."
- "Processing album contents..."
- "Getting songs from this album..."

#### Large Collection Messages
For collections detected as being large (e.g., >100 tracks in playlist, popular artists, compilation albums):
- "This is a big collection - please be patient!"
- "Large catalogs take a bit longer to process..."
- "Worth the wait for this extensive catalog!"

## Implementation

### Store (`src/lib/stores/loadingMessages.ts`)
The loading messages are managed by a Svelte store that:
- Maintains the current loading state
- Handles message rotation with intervals
- Provides methods to start/stop loading
- Supports custom messages

### Usage
```typescript
import { loadingMessages } from '$lib/stores/loadingMessages';

// Start loading with contextual information
loadingMessages.startLoading('Artist Name', 'artist', true); // isLargeCollection

// Stop loading when done
loadingMessages.stopLoading();

// Set custom message
loadingMessages.setMessage('Custom loading message...');
```

### Component (`src/lib/components/LoadingMessages.svelte`)
A reusable loading component that displays:
- Animated spinner with music note
- Current loading message
- Additional context for large collections
- Bouncing dots animation

## Benefits

1. **Better UX**: Users aren't left staring at a static loading spinner
2. **Transparency**: Messages explain what's happening behind the scenes
3. **Context-Aware**: Different messages for different types of content
4. **Engagement**: Rotating messages keep the interface feeling active
5. **Expectation Setting**: Special messages for large collections prepare users for longer waits

## Performance Considerations

- Messages are pre-defined and lightweight
- Intervals are cleaned up properly to prevent memory leaks
- Store automatically handles cleanup on component destruction
- Minimal DOM updates with Svelte reactivity

## Future Enhancements

Possible improvements could include:
- Server-sent events for real progress updates
- Artist-specific messages for well-known artists
- Estimated time remaining based on collection size
- Sound effects or music while loading (with user preference)
