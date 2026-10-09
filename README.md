# Ghostroll 🌀

> Daily 3D marble speedrun platformer built with **deterministic WebAssembly physics**, asynchronous ghost racing, and **authoritative server-side replay validation**.

## Highlights

- **Bit-Level Deterministic Physics**: Uses `@dimforge/rapier3d-deterministic-compat` with a fixed 60 Hz timestep and integer-quantized inputs.
- **Trigonometry-Free Gravity Math**: All gravitational vector calculations avoid `Math.sin` / `Math.cos` to circumvent cross-engine float divergences across V8, SpiderMonkey, and JavaScriptCore.
- **Authoritative Server Validation**: `POST /api/runs` accepts the player's inputs and re-simulates the full run on the server in headless WASM. Replays with tampered hashes or hacked times are rejected with HTTP 422.
- **Global Asynchronous Ghost Racing**: The server records verified runs, extracts 20 Hz trajectory samples, and serves them to players via `GET /api/levels/:id/leaderboard` to race against top ghosts in real-time.
- **Zero-Friction Anonymous Auth**: Players are automatically provisioned with secure signed guest tokens and custom gamer tags without requiring registration.
- **CI / Cross-Engine Verification**: Playwright suite asserts bit-exact hash parity across Chromium (V8) and Firefox (SpiderMonkey).

## Architecture

```
ghostroll/
├── packages/
│   ├── sim/         # Pure TS deterministic physics engine (Rapier WASM)
│   └── shared/      # Types, Zod validation schemas, replay RLE codec
└── apps/
    ├── server/      # Fastify API + Drizzle ORM + replay verification engine
    └── web/         # React Three Fiber + Drei + React HUD + Vite
```

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Run unit & replay verification tests (Vitest)
pnpm test

# 3. Build all packages
pnpm build

# 4. Start backend API server (port 3001)
pnpm dev:server

# 5. Start web frontend (port 5173 with automatic API proxy)
pnpm dev

# 6. Run cross-browser Playwright test
pnpm test:e2e
```

## API Endpoints

- `GET /health` — Health check endpoint.
- `GET /api/me` — Retrieves or provisions anonymous guest profile with signed HTTP-only cookie.
- `POST /api/runs` — Submits replay inputs for deterministic server-side re-simulation and leaderboard recording.
- `GET /api/levels/:levelId/leaderboard` — Fetches top verified players, ranks, times, and ghost trajectories.

## Controls

- **Desktop**: Arrow keys or `WASD` / `ZQSD` to tilt the board. Press `R` to restart.
- **Mobile / Touch**: On-screen virtual joystick.
