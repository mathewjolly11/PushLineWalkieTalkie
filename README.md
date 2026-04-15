# WalkieTalkie

A small browser-based project.

## Quick start

1. Open `index.html` in your browser.
2. Edit `styles.css` and `app.js` to customize behavior and styling.

## Project structure

- `index.html` - Entry point.
- `styles.css` - Styles.
- `app.js` - Client-side logic.

## Contributing

See `CONTRIBUTING.md` for guidelines.

## License

MIT. See `LICENSE`.
# Pushline

Pushline is a same-network, push-to-talk web app. Create a room, share the code, and talk in real time with people on the same Wi-Fi or hotspot. It uses Supabase Realtime for signaling and presence, plus WebRTC audio for live voice.

## Features
- Push-to-talk voice button with live level meter
- Same-network rooms with quick room codes
- Public and private room support
- Email/password auth (Supabase)
- Public room list for signed-in users

## Tech Stack
- HTML, CSS, JavaScript
- Supabase (Auth + Realtime)
- WebRTC audio
- SweetAlert2 for UI dialogs

## Project Structure
- index.html - UI layout
- styles.css - Styling
- app.js - App logic, Supabase, and WebRTC

## Setup
1. Copy config.sample.js to config.js and add your Supabase URL + anon key.
2. Open index.html in a modern browser.
3. Allow microphone access when prompted.

## Supabase Setup
This app expects a Supabase project with:
- Auth enabled (email/password)
- Realtime enabled
- A rooms table (for room metadata)

Suggested rooms table fields:
- id (uuid, primary key)
- code (text)
- name (text)
- is_public (boolean)
- created_by (uuid)

You can create the table and policies with the SQL in supabase/schema.sql.

## Open Source Checklist
1. Do not commit config.js or any .env files.
2. Verify no real Supabase keys or URLs appear in the repo.
3. Share config.sample.js so contributors can set up their own config.
4. Keep database setup steps in supabase/schema.sql and this README.

## Usage
1. Sign up or sign in.
2. Create a room or join one by code.
3. Hold the talk button to speak.

## Credits
Created by Mathew Jolly.
