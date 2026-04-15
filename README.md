# Pushline Walkie Talkie

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

**[Live Demo](https://pushlinewalkietalkie.vercel.app/)**

Pushline is a same-network, push-to-talk web app. Create a room, share the code, and talk in real time with people on the same Wi-Fi or hotspot. It uses Supabase Realtime for signaling and presence, plus WebRTC audio for live voice.

## ✨ Features

- Push-to-talk voice button with live level meter
- Same-network rooms with quick room codes
- Public and private room support
- Email/password auth (Supabase)
- Public room list for signed-in users

## 🛠️ Tech Stack

- HTML, CSS, JavaScript
- [Supabase](https://supabase.io/) (Auth + Realtime)
- WebRTC audio
- [SweetAlert2](https://sweetalert2.github.io/) for UI dialogs

## 🚀 Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/PushLineWalkieTalkie.git
    ```
2.  **Set up your Supabase config:**
    -   Copy `config.sample.js` to `config.js`.
    -   Add your Supabase URL and anon key to `config.js`.
3.  **Set up the Supabase database:**
    -   This app expects a Supabase project with Auth and Realtime enabled.
    -   You can create the required `rooms` table and policies using the SQL in `supabase/schema.sql`.
4.  **Run the app:**
    -   Open `index.html` in a modern browser.
    -   Allow microphone access when prompted.

## 🎤 Usage

1.  Sign up or sign in.
2.  Create a room or join one by code.
3.  Hold the talk button to speak.

## ❤️ Contributing

This is an open-source project, and contributions are welcome! Whether it's fixing a bug, adding a feature, or improving documentation, your help is appreciated.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Credits

Created by Mathew Jolly.
