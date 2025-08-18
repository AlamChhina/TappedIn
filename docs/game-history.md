# Game History Component

## Overview
The Game History component tracks and displays the user's game sessions and performance across different modes and settings.

## Features

### Session Tracking
- **Session Definition**: A session groups together games played with the same:
  - Game mode (Classic or Zen)
  - Playback mode (Beginning or Random)
  - Artist/Album/Playlist selection

- **Session Creation**: A new session starts when any of these parameters change
- **Session Display**: Shows the most recent sessions first

### Score Tracking

#### Classic Mode
- Tracks the number of tries used for each guess (represented as colored dots: 🟢 for unused tries, 🔴 for used tries)
- Shows timing progression (1s → 2s → 4s → 7s → 11s)
- Records both correct and incorrect guesses

#### Zen Mode  
- Tracks correct vs incorrect guesses only
- No try count since full songs play

### Visual Elements

#### Session Summary
- Shows score as "correct/total" format (e.g., "6/10")
- Displays percentage score with color coding:
  - Green (≥80%): Excellent performance
  - Yellow (≥60%): Good performance  
  - Orange (≥40%): Fair performance
  - Red (<40%): Needs improvement

#### Session Details
- **Artwork Image**: Shows the album cover, artist photo, or playlist image for easy recognition
- Item name with appropriate layout (rounded for artists, square for albums/playlists)
- Mode indicators (🎯 Classic, 🎵 Zen)
- Playback mode (▶️ Beginning, 🔀 Random)
- Session timestamps showing "time ago" (no individual song timestamps)

#### Recent Guesses
- Shows last 3 guesses per session
- Check/X icons for correct/incorrect
- Song titles (with artist names for playlists)
- **Classic mode visualization**: Styled circular dots matching the game interface
  - Green dots (🟢): Unused tries
  - Red dots (🔴): Used tries
  - Same size and styling as the main game component

#### Special Indicators
- 🔥 "Perfect!" badge for 100% scores with 3+ songs
- Trophy icon in header

### Storage
- Uses localStorage for persistence across browser sessions
- Automatically saves after each guess
- Loads previous history on component mount

### Integration
- Appears below GuessTrack components in both Classic and Zen modes
- Updates in real-time as users play
- Shows even when no active game (if history exists)

## Technical Implementation

### Store Pattern
Uses Svelte stores (`gameHistory`) for state management with methods:
- `startSession()` - Begin new session
- `addGuess()` - Record a guess result  
- `endSession()` - Mark session complete
- `shouldStartNewSession()` - Check if new session needed

### Component Structure
```
ArtistSearch.svelte
├── GuessTrack.svelte (Zen mode)
├── GuessTrackClassic.svelte (Classic mode)  
└── GameHistory.svelte
```

### Data Flow
1. User selects artist/album/playlist → New session starts (with artwork image captured)
2. User makes guess → Guess recorded in current session
3. User changes mode/playback/selection → Previous session ends, new one starts
4. History component displays all sessions with artwork and styled try indicators
