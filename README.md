# Ghostroll 🌀

> Daily 3D marble speedrun platformer built with **deterministic WebAssembly physics**, asynchronous ghost racing, and server-side replay validation.

## Highlights

- **Bit-Level Deterministic Physics**: Uses `@dimforge/rapier3d-deterministic-compat` with a fixed 60 Hz timestep and integer-quantized inputs.
- **Trigonometry-Free Gravity Math**: All gravitational vector calculations avoid `Math.sin` / `Math.cos` to circumvent cross-engine float divergences across V8, SpiderMonkey, and JavaScriptCore.
- **Pure Simulation Package**: `packages/sim` contains 0 DOM/Three.js dependencies and can run headlessly in Node.js, Web workers, and server validation queues.
- **Asynchronous Ghost Racing**: Ghost trajectories are recorded at 20 Hz, interpolated with binary search lerping, and saved locally to challenge personal records.
- **Real-Time Determinism Telemetry**: FNV-1a state hashes computed over ball float states in real-time.

## Architecture

```
ghostroll/
├── packages/
│   ├── sim/         # Pure TS deterministic physics engine (Rapier WASM)
│   └── shared/      # Types, Zod validation schemas, replay RLE codec
└── apps/
    └── web/         # React Three Fiber + Drei + React HUD + Vite
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Run Vitest determinism & golden replay suite
pnpm test

# Build all packages
pnpm build

# Launch web dev server
pnpm dev
```

## Controls

- **Desktop**: Arrow keys or `WASD` / `ZQSD` to tilt the board. Press `R` to restart.
- **Mobile / Touch**: On-screen virtual joystick.
