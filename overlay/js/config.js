// Configuration constants for the overlay.  Update values to match your
// local setup.  This file is a module so it can be shared by the other
// pieces of the overlay.
export const CONFIG = {
  relayUrl:       'ws://localhost:3333',
  obsWsUrl:       'ws://localhost:4455',
  obsWsPassword:  '',

  chatMax:        22,
  eventDuration:  5500,   // ms the alert overlay stays visible

  // ── TTS ────────────────────────────────────────────────────
  ttsVoiceName:   'Zoe',
  ttsRate:        0.88,
  ttsPitch:       0.95,
  ttsVolume:      1.0,
  readChat:       true,
  chatTtsMaxLen:  120,

  // ── Joystick milestone iframe ───────────────────────────────
  // Paste your Joystick tip-goal/milestone overlay URL here.
  // Find it at joystick.tv/scenes → Tip Goal or Milestones → Copy URL.
  // Leave empty to show the frame label only.
  milestonesUrl:  '',

  colorCycleMs:   5000,
};
