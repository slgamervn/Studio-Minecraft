# Bedrock Coder Studio

A lightweight, browser-based toolkit for creating, inspecting, and editing Minecraft Bedrock add-on files.

**[Open Studio](https://slgamervn.github.io/Studio-Minecraft/)** · **[Source Code](https://github.com/slgamervn/Studio-Minecraft)**

## Features

- **Unicode & JSON Tools** — Encode/decode Unicode escapes, format, minify, highlight, and repair common JSON formatting issues.
- **BrArchive** — Open, create, edit, and export `.brarchive` files using the project's 256-byte header format.
- **Pack Explorer** — Browse `.mcpack`, `.mcaddon`, and `.zip` archives; preview textures; inspect manifests; edit, rename, add, or remove supported files; and export changes.
- **Manifest Generator** — Create Minecraft Bedrock manifests with configurable format versions, engine versions, modules, scripts, and dependencies.
- **Add-on Validator** — Run available checks on pack files and manifest data.
- **Language Editor & Templates** — Work with language files and common pack templates.
- **Coder Tools** — Generate starter structures, `contents.json`, and reusable snippets.
- **Personalization** — Multiple interface languages, light/dark themes, and settings.

## Getting Started

### Use online

Open **[Bedrock Coder Studio](https://slgamervn.github.io/Studio-Minecraft/)** in a modern browser.

### Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.
3. For the best experience, use a local web server if browser file restrictions affect functionality.

Some libraries are loaded from a CDN, so an internet connection may be required for those features.

## Compatibility

Designed for Minecraft Bedrock add-on workflows, including Behavior Packs and Resource Packs. Supported file types and validation coverage depend on the tool and the selected file format.

## Contributing

Bug reports, feature requests, and improvements are welcome. Please open a [GitHub Issue](https://github.com/slgamervn/Studio-Minecraft/issues) with clear reproduction steps or a description of the proposed change.

## Author

**snowgem** · [GitHub](https://github.com/slgamervn)

---

*Bedrock Coder Studio is an independent community tool and is not affiliated with or endorsed by Mojang or Microsoft.*

## Studio AI (separate backend)

The Studio interface remains hosted on GitHub Pages. Online AI requests use a separate Node.js backend in `backend/`, configured for Render. The app's **Cấu hình AI trực tuyến** panel stores the backend URL in that browser's local storage; no API key belongs in the frontend.

### Deploy the backend to Render

1. Open [Render](https://render.com/) and sign in.
2. Choose **New → Blueprint** and connect the `slgamervn/Studio-Minecraft` GitHub repository.
3. Render reads the repository's `render.yaml`. Check that the service root directory is `backend`, build command is `npm install`, start command is `npm start`, and health check path is `/health`.
4. When prompted, set the secret `OPENAI_API_KEY` in Render's environment settings. Create/manage the key in your own OpenAI API account; do not commit it to GitHub or paste it into Studio's URL field. The optional `OPENAI_MODEL` defaults to `gpt-4.1-mini`.
5. Wait for the Render deployment to finish. Open `https://YOUR-SERVICE.onrender.com/health`; a healthy service returns JSON with `"ok": true`.
6. Open the [Studio website](https://slgamervn.github.io/Studio-Minecraft/), open **Studio AI → Cấu hình AI trực tuyến**, enter your Render service URL (without `/api/ai`), tap **Lưu URL**, then **Kiểm tra kết nối**.
7. Ask a question not covered by the local answers to test the online mode.

### Configuration and security

- `ALLOWED_ORIGIN` is set to `https://slgamervn.github.io` by default; keep it restricted to the exact website origin.
- The backend accepts POST requests at `/api/ai`, caps question length at 1,200 characters, and applies a basic per-process request limit.
- The rate limit is not a complete abuse-prevention system; public deployments may need stronger rate limiting/authentication and usage monitoring.
- API calls may incur charges. Set usage limits/alerts in your API account and monitor requests.
- Render free services may sleep after inactivity, so the first request can be slow. Availability and free-plan details can change.
- GitHub Pages remains static and does not run the backend. The online endpoint must be deployed separately.
- The backend code has been added to the repository, but a live Render deployment cannot be created or verified from this commit alone.
