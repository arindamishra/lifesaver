# MOMENTUM

MOMENTUM is a static, browser-only PWA for mood-aware productivity planning. It stores onboarding, daily mood, task data, generated quotes, and plan state in `localStorage`, then uses Gemini to generate personal coaching moments.

## Run locally

Open `index.html` directly, or serve the folder with any static server:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Files

- `index.html` contains the app shell and screen containers.
- `style.css` contains the design system, mood themes, animations, and responsive layout.
- `ai.js` contains the Gemini key, system prompt, reusable API calls, and AI prompt builders.
- `tasks.js` contains task storage and formatting helpers.
- `mood.js` contains mood/session storage and theme application.
- `onboarding.js` contains the four-screen onboarding flow.
- `app.js` wires routing, dashboard behavior, task editing, quotes, and plan rendering.
- `manifest.json` and `service-worker.js` make the app installable when served over HTTP.

## Deployment

Deploy as a static site. Vercel needs no build command and can serve the repository root.
