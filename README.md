# NekkidBear Stream Overlay

A **TechBear-powered stream bot and overlay system** for Joystick.tv featuring real-time event relay, chat integration, and platform connectivity.

---

## 🐻 What's This?

BorgaliciousDivaBot is a sassy, feature-rich stream bot that:

- **Monitors Joystick.tv chat** and responds to commands with personality
- **Relays events** to your OBS overlay via WebSocket (port 3333)
- **Integrates Spotify** to display currently playing tracks
- **Supports Lovense** device integration (optional)
- **Serves dad jokes** with cooldown to prevent chat spam
- **Automatically refreshes OAuth tokens** for uninterrupted uptime

---

## 📁 Project Structure

```
.
├── bot/                          # Node.js bot server
│   ├── package.json              # Dependencies & scripts
│   ├── src/
│   │   ├── index.js              # Main entry point
│   │   ├── events.js             # Chat command handler
│   │   ├── joystick.js           # Joystick.tv WebSocket client
│   │   ├── joystick-auth.js      # OAuth setup (one-time run)
│   │   ├── relay.js              # WebSocket server for overlay
│   │   ├── spotify.js            # Spotify integration
│   │   ├── spotify-auth.js       # Spotify OAuth setup
│   │   └── lovense.js            # Lovense device integration
│   └── .env                      # Environment variables (add your credentials)
│
└── overlay/                      # OBS overlay HTML/JS
    ├── background.html           # Fullscreen backdrop
    └── chrome.html               # Chat widget + extras
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** (comes with Node.js)
- Joystick.tv channel + developer app credentials
- (Optional) Spotify Premium account + app credentials
- (Optional) Lovense account + app credentials

### Installation

1. **Clone the repo:**
   ```bash
   git clone https://github.com/NekkidBear/NekkidBear-Stream-Overlay.git
   cd NekkidBear-Stream-Overlay/bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up your `.env` file:**
   ```bash
   cp .env.example .env  # (or create from scratch)
   ```

   Then add your credentials:
   ```env
   BOT_NAME=BorgaliciousDivaBot

   # Joystick.tv (REQUIRED)
   JOYSTICKTV_CLIENT_ID=your_client_id
   JOYSTICKTV_CLIENT_SECRET=your_client_secret
   JOYSTICKTV_ACCESS_TOKEN=your_access_token
   JOYSTICKTV_REFRESH_TOKEN=your_refresh_token

   # Spotify (optional)
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REFRESH_TOKEN=your_spotify_refresh_token

   # Lovense (optional)
   LOVENSE_ENABLED=false
   LOVENSE_API_TOKEN=your_lovense_token
   ```

### OAuth Setup

#### Joystick.tv Authorization (REQUIRED — do this first!)

Run this **once** to authorize the bot on your Joystick.tv channel:

```bash
node src/joystick-auth.js
```

This will:
1. Start a local server on `http://localhost:8888`
2. Open your browser to the Joystick authorization page
3. Ask you to authorize BorgaliciousDivaBot for your channel
4. Print your `JOYSTICKTV_ACCESS_TOKEN` and `JOYSTICKTV_REFRESH_TOKEN`
5. Paste these into your `.env` file

#### Spotify Setup (Optional)

If you want the `!song` command to work:

```bash
node src/spotify-auth.js
```

Follow the same pattern—it'll print your Spotify tokens to paste into `.env`.

---

## ▶️ Running the Bot

Once your `.env` is set up with Joystick credentials:

```bash
npm start
```

Or for development mode with verbose logging:

```bash
npm run dev
```

You should see:
```
[TechBear Bot] Relay server live on ws://localhost:3333
[TechBear Bot] Connected to Joystick.tv ✓
[Relay] Overlay connected. Total: 1
```

The bot is now **live and listening** for chat commands.

---

## 💬 Chat Commands

Type these in your Joystick.tv chat while the bot is running:

| Command | Response |
|---------|----------|
| `!dadjoke` | Fetches a random dad joke (30s cooldown) |
| `!song` | Shows currently playing Spotify track |
| `!borg` | **"We are TechBear. Resistance is futile, sugar."** |
| `!google [query]` | Returns a LMGTFY link for your search |
| `!discord` | Posts the Gymnarctos Studios Discord link |
| `!socials` | TechBear's social links & contact info |
| `!business` | Info on Gymnarctos Studios services |
| `!specs` | Stream setup & tech specs |
| `!lurk` | Announces you're going into lurk mode |
| `!unlurk` | Announces your return from lurk |
| `!hug` | Gets a fabulous TechBear hug 🐻💕 |
| `!commands` | Lists all available commands |

---

## 🔌 Overlay Integration

The bot runs a **WebSocket relay server** on `ws://localhost:3333` that sends events to your OBS overlay.

### Event Types

- **`chat`** — Chat messages (includes bot replies)
- **`dadjoke`** — Dad joke event with setup/punchline separation
- **`ticker_update`** — Live status ticker text
- **`connection`** — Overlay connected/disconnected

### Using in OBS

1. Open `overlay/chrome.html` in a browser window or OBS Browser Source
2. It automatically connects to `ws://localhost:3333`
3. Displays incoming chat and events in real-time

---

## 🛠️ Development

### Project Dependencies

- **ws** — WebSocket server for the relay
- **dotenv** — Environment variable loading
- **node-fetch** — HTTP requests (OAuth, API calls)

### Key Files

- [**index.js**](bot/src/index.js) — Initializes bot, connects to Joystick, starts relay
- [**events.js**](bot/src/events.js) — Chat command handler & responses
- [**joystick.js**](bot/src/joystick.js) — Joystick.tv WebSocket client
- [**relay.js**](bot/src/relay.js) — WebSocket server for overlay communication

### Adding a New Command

Edit [events.js](bot/src/events.js) in the `_handleCommands` switch statement:

```javascript
case '!mynewcommand':
  this._botSay(`Your response here, ${username}!`);
  break;
```

---

## ⚙️ Troubleshooting

### Port 3333 Already in Use

Another process is using the relay port. Either:

```bash
lsof -i :3333           # See what's using it
kill -9 <PID>           # Stop it
```

Or change `PORT` in [relay.js](bot/src/relay.js).

### Joystick Connection Failing

- Double-check `JOYSTICKTV_CLIENT_ID` and `JOYSTICKTV_CLIENT_SECRET` are set
- Re-run `node src/joystick-auth.js` to get fresh tokens
- Ensure your internet connection is stable

### Spotify Not Showing

- Run `node src/spotify-auth.js` to authorize
- Make sure Spotify is actively playing music on your account
- Check that `SPOTIFY_CLIENT_ID` and `SPOTIFY_REFRESH_TOKEN` are in `.env`

---

## 📝 Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `JOYSTICKTV_CLIENT_ID` | Yes | Joystick OAuth client ID |
| `JOYSTICKTV_CLIENT_SECRET` | Yes | Joystick OAuth secret |
| `JOYSTICKTV_ACCESS_TOKEN` | Yes | Joystick auth token (from joystick-auth.js) |
| `JOYSTICKTV_REFRESH_TOKEN` | Yes | Joystick refresh token (auto-renewed on connect) |
| `SPOTIFY_CLIENT_ID` | No | Spotify OAuth client ID |
| `SPOTIFY_CLIENT_SECRET` | No | Spotify OAuth secret |
| `SPOTIFY_REFRESH_TOKEN` | No | Spotify refresh token (from spotify-auth.js) |
| `LOVENSE_ENABLED` | No | Set to `true` to enable Lovense integration |
| `LOVENSE_API_TOKEN` | No | Lovense API token (if enabled) |
| `BOT_NAME` | No | Bot's name in chat (default: `BorgaliciousDivaBot`) |
| `NODE_ENV` | No | Set to `development` for verbose logs |

---

## 📚 Resources

- [Joystick.tv Developer Docs](https://joystick.tv/api/docs)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Node.js WebSocket Library (ws)](https://github.com/websockets/ws)

---

## 🎭 About TechBear

BorgaliciousDivaBot embodies the sassy, fabulous spirit of TechBear — a drag IT diva, printer fixer, and professional queen. Resistance is futile. We are TechBear. We contain multitudes. ✨🐻

**Gymnarctos Studios LLC** — Where tech meets fabulousness.

---

## 📄 License

MIT (or specify your license)

---

**Questions?** Check the source code comments or open an issue on GitHub!
