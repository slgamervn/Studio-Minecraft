# Bedrock Coder Studio

A lightweight, browser-based toolkit for creating, inspecting, and editing Minecraft Bedrock add-on files.

**[Open Studio](https://slgamervn.github.io/Studio-Minecraft/)** · **[Source Code](https://github.com/slgamervn/Studio-Minecraft)**

## Tool coverage and current limits

| Tool | Main checks / behavior |
|---|---|
| Unicode Escape | Encode/decode Unicode escape sequences |
| UUID Generator | Generate identifiers for pack manifests |
| BrArchive | Open/create supported archive structures; format support follows the referenced community format |
| Pack Explorer | Inspect and edit pack files, structure, manifest, and JSON |
| Add-on Validator | Static manifest and compatibility checks; not an in-game test |
| Manifest Generator | Generate V2/V3 manifest shapes; verify against the target Bedrock version |
| Lang Editor | Convert and edit .lang text and JSON representations |
| Pack Skeleton | Generate starter pack layouts |
| Script API Helper | Show API references and snippets; API availability depends on the target version |
| Compatibility panel | Show documented release notes, source links, and known/unknown version mappings |

## Bedrock Wiki-informed validation

The compatibility panel links to the Bedrock Wiki guides used to inform the editor's checks and workflow notes. Current coverage includes:

- Add-on architecture: behavior packs vs resource packs and how they communicate.
- Project setup and manifest structure.
- Script API setup, module dependencies, Script API 2.0 world-load timing, and core server scripting patterns.
- Entity client/server file separation and block definitions.
- Custom command setup.
- Manifest checks for module UUIDs, script entry points, duplicate dependencies, dependency version types, and V2/V3 version-field shape.

These checks are advisory static analysis. They do not replace Microsoft Learn's version-specific reference, Minecraft Content Log, or in-game testing. Bedrock Wiki pages can target different game versions, so features must be verified against the user's target Bedrock release.

Primary references:
- https://wiki.bedrock.dev/guide/addons
- https://wiki.bedrock.dev/guide/project-setup
- https://wiki.bedrock.dev/scripting/scripting-intro
- https://wiki.bedrock.dev/scripting/api-modules
- https://wiki.bedrock.dev/scripting/script-server
- https://wiki.bedrock.dev/guide/custom-entity
- https://wiki.bedrock.dev/blocks/blocks-intro
- https://wiki.bedrock.dev/scripting/custom-commands

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


### Multiple AI providers

Studio AI can route requests to OpenAI, Google Gemini, Groq, OpenRouter, Together AI, or Mistral AI. Choose a provider in the Studio AI settings. The backend only uses a provider when its API key is configured in Render; provider keys must never be put in the frontend or committed to GitHub.

Configure any providers you want to use in Render → your service → Environment:

| Provider | Required secret | Optional model variable | Default model |
| --- | --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` | `gpt-4.1-mini` |
| Google Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` | `gemini-2.5-flash` |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` | `openai/gpt-4o-mini` |
| Together AI | `TOGETHER_API_KEY` | `TOGETHER_MODEL` | `meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| Mistral AI | `MISTRAL_API_KEY` | `MISTRAL_MODEL` | `mistral-small-latest` |

Add only the keys for providers you intend to use, then redeploy the Render service. Each provider may require its own account, enabled API access, billing or credits, and model availability. A healthy `/health` endpoint confirms the server is running, not that every provider key is valid.
