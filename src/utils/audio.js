// audio.js — Background music management.

const outdoorMusic = new Audio('assets/audio/music/242932_Overworld_Theme.mp3');
outdoorMusic.loop = true;
outdoorMusic.volume = 0.5;

let currentTrack = null;

function playTrack(track) {
  if (currentTrack === track) return;
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
  }
  currentTrack = track;
  if (track) track.play().catch(() => {});
}

export function stopMusic() {
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
    currentTrack = null;
  }
}

// Plays the appropriate track (or silence) for the given difficulty level.
// Difficulty 1–2: outdoor overworld theme.
// Difficulty 3+:  no music (castle interior, etc.).
export function updateMusicForDifficulty(diff) {
  if (diff <= 2) {
    playTrack(outdoorMusic);
  } else {
    stopMusic();
  }
}
