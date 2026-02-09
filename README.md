# Cartpanda Funnel Builder (Frontend Test)

**Overview**
Visual-only upsell funnel builder with a draggable palette, canvas with pan, node connections, edge deletion, zoom, and localStorage persistence. Built with React + TypeScript and an HTML Canvas layer for grid + arrows.

**Submission**
Demo URL: `TBD`
GitHub repo: `TBD`

**Features**
- Drag node types from the palette into the canvas
- Pan + zoom the canvas for an infinite-ish workspace
- Connect nodes via handles (arrows drawn on canvas)
- Edge deletion by clicking a connection line
- Auto-incrementing Upsell/Downsell labels (fills gaps)
- LocalStorage persistence with JSON import/export

**Local Setup**
1. `npm install`
2. `npm start`
3. Open the URL printed by Parcel (default `http://localhost:1234`)

**Architecture Decisions**
- Canvas is used for the grid + edges while nodes remain HTML for accessibility and easy hit targets.
- Funnel state (nodes, edges, pan, zoom) is centralized in `FunnelBuilder.tsx`.
- Canvas rendering is derived from state to avoid desync between visuals and data.
- Helper logic (IDs, titles, validation rules) lives in `utils.ts`.
- Parcel is used for bundling to keep the stack React-only without Vite.

**Tradeoffs / Improvements Next**
- No minimap or snap-to-grid yet to keep the MVP tight.
- Edge selection could be more explicit (e.g., hover highlight + delete key).
- Multi-select and keyboard shortcuts (duplicate, align) would improve power-user flow.

**Accessibility Notes**
- Interactive controls are real buttons with focus-visible styles.
- Nodes remain DOM elements to support screen readers (rather than pure canvas).

**Dashboard Architecture Answer**
- See `docs/dashboard-architecture.md`
