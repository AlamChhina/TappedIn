export const load = async ({ cookies }) => {
	const accessToken = cookies.get('sp_at');

	// If no access token, user is not signed in
	if (!accessToken) {
		return {
			session: { loggedIn: false },
			profile: null
		};
	}

	try {
		// Fetch user profile from Spotify
		const response = await fetch('https://api.spotify.com/v1/me', {
			headers: {
				'Authorization': `Bearer ${accessToken}`
			}
		});

		if (!response.ok) {
			// Token is invalid, treat as logged out
			return {
				session: { loggedIn: false },
				profile: null
			};
		}

		const spotifyProfile = await response.json();

		// Extract profile data
		const profile = {
			display_name: spotifyProfile.display_name || null,
			image_url: spotifyProfile.images && spotifyProfile.images.length > 0 
				? spotifyProfile.images[0].url 
				: null
		};

		return {
			session: { loggedIn: true },
			profile
		};
	} catch (error) {
		// Handle fetch failures gracefully
		console.error('Failed to fetch Spotify profile:', error);
		return {
			session: { loggedIn: false },
			profile: null
		};
	}
};
