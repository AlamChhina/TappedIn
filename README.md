````markdown
# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Artist Search & Guess the Song Game

This application includes a Spotify-powered artist search and song guessing game:

### How to use:

1. **Sign in**: Go to `/` and click "Sign in with Spotify" to authenticate with your Spotify account.

2. **Search for an Artist**: Once signed in, use the search bar below the welcome text to find an artist. The search provides real-time suggestions as you type.

3. **View Artist Tracks**: Select an artist from the dropdown to fetch all their primary tracks (albums + singles, deduplicated, over 30 seconds).

4. **Play the Guessing Game**: The "Guess the Song" component will appear below the track list. Wait for "Player connected" status.

5. **Start Guessing**:
   - Click "Play" to hear a song from the beginning using the Spotify Web Playback SDK
   - Type your guess in the input field (with real-time suggestions)
   - Press Enter or click "Submit Guess"
   - On correct guess (✅), click "Next" for another song
   - Wrong guesses (✗) allow you to keep trying

### Requirements:

- Spotify account (Premium recommended for full playback features)
- Active internet connection
- Modern web browser with JavaScript enabled

### Features:

- Real-time artist search with Spotify API
- Primary track filtering (artist must be first credit)
- Deduplication across releases
- Full track playback from beginning (not 30-second previews)
- Smart title matching with normalization
- Rate limiting and error handling
- Secure token management (server-side proxy)
````
