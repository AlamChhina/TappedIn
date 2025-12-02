# TappedIn 🎧

TappedIn is a Spotify-powered, mobile-friendly music guessing game.  
You connect your Spotify Premium account, search for an artist, and try to guess the track while it plays through the Spotify Web Playback SDK.

<video src="static/docs/tappedin-demo.mp4" controls width="600">
  Your browser does not support the video tag.
</video>

---

## Features

- 🔍 **Artist search** – real-time artist search backed by the Spotify Web API  
- 🎵 **Full-track playback** – plays full tracks from the beginning using the Spotify Web Playback SDK (not just 30s previews)  
- 🎯 **Primary track filtering** – only includes tracks where the artist is the first credited artist and longer than 30 seconds  
- 🧹 **Smart deduplication** – merges duplicates across albums/singles so songs don’t repeat  
- ✅ **Premium-only access** – wiring of Spotify OAuth to restrict gameplay to Spotify Premium accounts  
- 🧠 **Robust guess matching** – normalized title matching so small differences in punctuation/case don’t break answers  
- 🛡️ **Rate-limit aware** – avoids hitting Spotify’s rate limits with batched and cached calls  

---

## Access & Spotify Developer Mode

TappedIn uses a **Spotify Developer application**, and Spotify limits apps in development mode to a small set of test users.

To run this project yourself, you should:

1. Create your own app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add your local redirect URI (e.g. `http://localhost:5173/callback`) to the app settings.
3. Copy your app's **Client ID** and **Client Secret** into the `.env` file.
4. Add the email address of your Spotify account under **Users and Access** for that app.

Requirements:

- A **Spotify Premium** account (for Web Playback SDK support)
- Your own Spotify Developer app with your account added as a test user

> If you're specifically evaluating this project and would prefer to use my dev app instead, contact me and I may be able to add your Spotify email to my test user list.


## How to Play

1. **Sign in**

   - Start the app (see “Running locally” below).
   - Go to `/` and click **“Sign in with Spotify”**.
   - Complete the Spotify OAuth flow (Premium account required).

2. **Search for an artist**

   - Use the search bar on the main page.
   - Start typing an artist name; suggestions appear in real time.
   - Select an artist to fetch their primary tracks (deduplicated, >30s).

3. **Start the guessing game**

   - After selecting an artist, the Guess the Song component appears below the track list.
   - Wait until you see something like **“Player connected”** (Spotify Web Playback SDK ready).

4. **Guess the track**

   - Click **Play** to start the song from the beginning.
   - Type your guess in the input field (auto-suggestions help you complete the title).
   - Press **Enter** or click **Submit Guess**.
   - On a correct guess ✅, click **Next** to move to another track.
   - On a wrong guess ✗, keep trying until you get it or skip.

---

## Tech Stack

- **Frontend:** Svelte 5 / SvelteKit, TypeScript, Tailwind CSS, shadcn/ui  
- **Auth & APIs:** Spotify OAuth, Spotify Web API, Spotify Web Playback SDK  
- **Backend / Data:** Node.js (SvelteKit server routes), SQLite (if you’re persisting anything server-side)  
- **Tooling:** Vite / SvelteKit dev server, pnpm/npm  

*(Adjust this section to match your exact implementation.)*

---

## Running Locally

### Prerequisites

- Node.js (18+ recommended)  
- pnpm or npm  
- **Spotify Premium** account  
- A Spotify Developer application with:
  - Redirect URI set to your local dev URL (e.g. `http://localhost:5173/callback`)

### Environment variables

Create a `.env` file in the project root (names may differ based on your code; adjust as needed):

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
APP_BASE_URL=http://localhost:5173
```

### Install & run

```bash
# install dependencies
pnpm install    # or: npm install

# run dev server
pnpm dev        # or: npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser and sign in with Spotify.

---

## Notes

- TappedIn is a personal / educational project and is **not affiliated with or endorsed by Spotify**.  
- Because of Spotify’s developer policies, only whitelisted users can access the app in its current form.

