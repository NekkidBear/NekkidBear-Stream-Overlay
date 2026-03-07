// spotify.js
// Handles the slim bottom bar showing the current track and progress.

let spotifyVisible = false;

export function updateSpotify(data) {
  const bar      = document.getElementById('spotify-bar');
  const titleEl  = document.getElementById('spotify-title');
  const artistEl = document.getElementById('spotify-artist');
  const artEl    = document.getElementById('spotify-art');
  const progBar  = document.getElementById('spotify-progress-bar');

  if (!data.playing) {
    bar.classList.remove('visible');
    spotifyVisible = false;
    return;
  }

  titleEl.textContent  = data.title  || '—';
  artistEl.textContent = data.artist || '';

  if (data.art) {
    artEl.src          = data.art;
    artEl.style.display = 'block';
  } else {
    artEl.style.display = 'none';
  }

  if (data.duration && data.progress !== undefined) {
    const pct = Math.min(100, (data.progress / data.duration) * 100);
    progBar.style.width = pct + '%';
  }

  if (!spotifyVisible) {
    bar.classList.add('visible');
    spotifyVisible = true;
  }
}
