<script>
	const connect = () => (location.href = '/login/spotify');
</script>

<h1>Guess the Song (dev)</h1>
<button onclick={() => {
    console.log("clicked");
    connect();
}}>Connect Spotify</button>
