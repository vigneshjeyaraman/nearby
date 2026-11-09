# Nearby 📡

**Connect with the people around you.**

Nearby is an app built on one simple idea: **let people connect with the people physically near them.** Not followers, not friends-of-friends, not strangers on the other side of the world — the people in the same café, campus, concert, train, neighbourhood or city block as you, right now.

Open the app, and you're in a live conversation with everyone within about 3 km. No sign-up, no profile, no friend requests.

## The Idea 💡

We are surrounded by people every day, yet most of our online conversations happen with people far away. Nearby flips that around:

- **Proximity first** — who you can talk to is decided by where you are, not who you already know.
- **Instant and anonymous** — you get a random callsign (e.g. `NEON-42`) and can start talking immediately.
- **Ephemeral** — conversations live in the moment; messages disappear after an hour.
- **Local by nature** — ask what's happening nearby, find people at the same event, share a tip about the area, or just say hi.

## Features ✨

- 🌍 **Location-based chat** — talk with everyone within ~3 km of you
- 🛰️ **Radar view** — see roughly how far away and in which direction other people are
- 🗺️ **Custom location** — pick a spot on a map instead of using your device's GPS
- 🕶️ **Anonymous callsigns** — a generated name you can change any time
- ⏳ **Auto-expiring messages** — messages older than one hour are hidden
- 🧹 **Delete your thread** — remove your own messages whenever you like
- 🛡️ **Content filtering and reputation** — basic protection against spam and abuse

## How It Works ⚙️

1. The app asks for your location (or you choose one on the map).
2. Your position is mapped to a set of nearby location buckets, so you see messages from people around you without sharing your exact coordinates in the chat.
3. Messages are stored in a Firebase Realtime Database and refreshed automatically.
4. Only messages within range and less than an hour old are shown.

## Running Locally 🛠️

The app is plain HTML, CSS and JavaScript — no build step.

```bash
git clone https://github.com/vigneshjeyaraman/nearby.git
cd nearby
python3 -m http.server 8000
# open http://localhost:8000
```

Location access in the browser requires `localhost` or HTTPS.

### Files 📁

- **`index.html`** — app layout
- **`app.js`** — app logic (location, chat, radar, moderation)
- **`styles.css`** — styling

## License and Commercial Use 📄

© 2025 Vignesh Jeyaraman. The concept, design and code of Nearby were created by Vignesh Jeyaraman.

This project is released under the **[PolyForm Noncommercial License 1.0.0](LICENSE)**:

- ✅ You may view, study and use the code for **personal, educational, research and other non-commercial purposes**.
- ❌ **Any commercial use** — including building a product, service or business on this code or a derivative of it — **requires a separate written license**.

**If you want to commercialize Nearby or something built from it, please contact me first:** [LinkedIn](https://www.linkedin.com/in/vignesh94/)

## Contributing 🤝

Ideas, bug reports and pull requests are welcome. By submitting a contribution you agree that it can be included in this project under the same license terms.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Open a pull request
