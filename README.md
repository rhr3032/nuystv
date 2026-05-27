# NUYsTV

NUYsTV is a browser-based IPTV style player built with plain HTML, CSS, and JavaScript. It loads channels from two local M3U playlists, shows a large preview area on top, and organizes channels into horizontal rows with a full-channel library view.

## Features

- Large hero preview player with next, previous, and play or pause controls
- Two playlist rows with horizontal scrolling and drag-to-scroll on desktop
- View All Channels modal for the full combined library or a single playlist
- Search by channel name or group
- Responsive layout for mobile and desktop
- Theme toggle for dark and light modes
- HLS playback powered by `hls.js`

## Files

- `index.html` - main page structure
- `styles.css` - all UI styling and responsive behavior
- `app.js` - playlist loading, rendering, and player logic
- `aynaott.m3u` - first playlist source
- `Sports-138.m3u` - second playlist source

## How It Works

The app reads both M3U files from the workspace, parses the channels, and renders them into two horizontal rails. Selecting a channel loads the stream into the preview player. The View All Channels button opens a full library overlay that shows every channel in grid form.

## Run Locally

Because the playlists are loaded with `fetch`, open the project through a local web server instead of opening `index.html` directly from disk.

Example options:

```bash
python -m http.server 8000
```

or

```bash
npx serve
```

Then open the local URL in your browser.

## Controls

- `Theme` switches between light and dark mode
- `View All Channels` opens the full channel library
- `Previous`, `Play / Pause`, and `Next` control the preview player
- The channel rows can be scrolled horizontally with the mouse, trackpad, or row arrows

## Notes

- The app depends on the `hls.js` CDN for HLS playback.
- If a playlist does not load, verify that the local server can access the `.m3u` files in the project folder.
