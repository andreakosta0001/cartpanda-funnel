# Modern Dashboard Architecture (Cartpanda)

**Goal**
Build a funnels + checkout admin that stays fast as it grows, supports parallel workstreams, and avoids rewrites while meeting WCAG accessibility standards.

# 1. Architecture

For this project, I intentionally kept the architecture simple, feature-scoped, and easy to reason about.

### Structure

- **FunnelBuilder.tsx**  
  Acts as the feature container. It owns the core state (nodes, edges, validation) and orchestrates interactions between the canvas and UI components.

- **`src/components/`**  
  Contains reusable, mostly presentational UI pieces such as:
  - `CanvasStage`
  - `NodeCard`
  - `Palette`
  - `AlertModal`  
    These components focus on rendering and user interaction, not business logic.

- **`utils.ts`**  
  Holds pure helper functions (ID generation for Upsell name, validation rules, auto-incremented titles). All logic here is deterministic and testable.

- **`data.ts`**  
  Defines constants and node templates (node types, defaults, labels).

- **`types.ts`**  
  Central place for shared TypeScript types used across the feature.

### Anti-spaghetti patterns

- **Container vs presentational separation**  
  Application state lives in `FunnelBuilder`. Child components are mostly stateless and receive everything through props.

- **Single source of truth**  
  Nodes and edges live in one state tree. The canvas and UI are derived from that state rather than managing their own copies.

- **Pure helpers**  
  Business rules and transformations live in `utils.ts`. Components only call these helpers instead of embedding logic inline.

- **No cross-component coupling**  
  Components don’t import each other’s internals. They communicate strictly through props and callbacks.

- **Clear boundaries**
  - `components/` → UI
  - `utils/` → logic
  - `data/` → constants/templates
  - `types/` → contracts

This structure keeps the feature easy to extend, easy to test, and avoids tight coupling as the project grows.

# 2. Design System

For this project, I built a **small custom UI layer** without using an external component library.  
This kept the bundle lightweight and allowed full control over visuals and interactions, which was appropriate for a focused, visual editor.

---

### How consistency is enforced

- **Design tokens**  
  CSS variables defined in `index.css` for colors, spacing, radii, and shadows. Components consume these tokens instead of hard-coded values.

- **Typography**  
  A single primary type scale with consistent font families across the app to avoid visual drift.

- **Spacing**  
  Reusable padding and margin values defined in CSS. Components rely on these shared values rather than inline, ad-hoc spacing.

- **Accessibility**
  - Semantic HTML elements (buttons, labels, headings)
  - Visible `:focus-visible` styles for keyboard navigation
  - ARIA labels where needed (e.g., connectors and modal dialogs)

This approach keeps the UI visually consistent, accessible, and easy to extend without introducing one-off styles.

# 3. Data Fetching + State 
### Query caching (server vs client state)

This project has no server-side data. All state is local and managed entirely on the client.

- Funnel state (nodes, edges)
- Canvas state (pan, zoom)
- UI state (selection, warnings)

State is stored in React and persisted to `localStorage` for save/load behavior.  
Because there is no remote data, a query-caching layer (e.g., TanStack Query) is unnecessary here.

### Loading, error, and empty states
- **Loading**  
  Not required, since no remote data is fetched.
- **Error**  
  Handled during funnel import. Invalid or malformed JSON triggers a visible error banner with feedback.
- **Empty**  
  The canvas always renders. An explicit “empty” state is not needed, though a placeholder could be added when no nodes exist.

### Filters, sorts, and pagination

These concepts don’t apply in the current scope (no tables or lists).

If added in the future, I’d:
- Keep filters and sorts in URL parameters for shareable and restorable state
- Choose client-side or server-side pagination based on dataset size

# 4. Performance

### Rendering and state performance

- **Bundle splitting**  
  Not necessary for this project due to its small size. The entire app ships as a single bundle, keeping the setup simple.

- **Virtualization**  
  Not needed given the expected small number of nodes. If the funnel grew significantly, I’d virtualize node rendering and only render nodes visible in the viewport.

- **Memoization**  
  `useMemo` is used for derived values (such as `nodeStatus` and computed canvas elements) to avoid unnecessary recalculation on each render.

- **Avoiding unnecessary re-renders**  
  Core state is localized in `FunnelBuilder`. Child components are mostly pure and receive data via props, allowing React to skip re-renders when inputs don’t change. The canvas renders directly from the single source of truth.

### Instrumentation

For this project, I’d focus on interaction performance rather than page-level metrics:

- FPS while dragging nodes (smoothness)
- Time to render after dropping a node
- Interaction latency between drag/zoom and visual updates

**Tooling:**
- Chrome Performance panel
- React DevTools Profiler
- `performance.mark()` / `performance.measure()` around key interactions


# 5. DX & Scaling
To keep multiple engineers aligned:

- A project template for new features (route, query, schema, tests, story).
- ESLint + Prettier + TypeScript strict mode.
- PR templates that require screenshots, performance impact, and accessibility notes.
- A decision log for architectural changes.
- Shared UI guidelines and quickstart recipes in Storybook.

This reduces one-off UI and makes best practices a default path.

# 6. Testing Strategy

Given the scope of this project, the testing approach is pragmatic and focused on protecting core behavior rather than maximizing test volume.

#### Unit tests
Unit tests are best suited for **pure logic** that doesn’t depend on the DOM:
- Helper functions in `utils.ts`  
  (ID generation, node title auto-incrementing, validation rules)
- Any data transformations or derived-state helpers
These tests are fast, stable, and give confidence that business rules won’t regress.

#### Integration tests
Integration tests focus on **user-visible behavior across components**, using the app as a user would:

- Creating nodes via the palette
- Dragging and repositioning nodes on the canvas
- Connecting nodes and enforcing funnel rules
- Exporting and importing funnel JSON
- Validation feedback (e.g. invalid connections, error banners)
These tests ensure that state, UI, and interactions work correctly together.

#### End-to-end (E2E) tests
Given the small scope, E2E coverage can remain minimal and targeted:
- Load the app
- Build a simple funnel
- Export and re-import it successfully

This protects the most critical flow without adding heavy maintenance overhead.

### Minimum testing required to move fast
To ship confidently while maintaining velocity, I’d require:
- Unit tests for all pure helpers and validation logic
- A small set of integration tests covering the main funnel-building flow
- At least one E2E test validating the full “create → export → import” path

This level of coverage catches the most likely regressions while keeping the test suite fast and developer-friendly.

# 7. Release & Quality
### Shipping fast but safe (project scope)

Given the scope of this project (a client-side visual editor with no backend), the release strategy focuses on **simplicity, confidence, and fast iteration**, rather than heavy deployment infrastructure.

- **Feature flags**  
  Not required at this scale. Changes are small, isolated, and easy to reason about.  
  If the project grew, new behaviors (e.g. validation rules, editor features) could be guarded behind simple boolean flags at the feature level.

- **Staged rollouts**  
  Not applicable for this demo project. For a production product, I’d stage releases via environment-based flags or percentage rollouts.

- **Error monitoring**  
  Errors are handled explicitly where they matter (e.g. invalid JSON imports).  
  For a production version, I’d add lightweight error monitoring (e.g. Sentry) to capture runtime errors and interaction failures.
### How I handle “ship fast but safe”

The core principle is **clear boundaries + small surface area for bugs**:

- A single source of truth (`FunnelBuilder.tsx`) for all feature state
- Pure helpers in `utils.ts` that are easy to test and reason about
- UI components that are mostly stateless and predictable
- Minimal abstractions to avoid accidental complexity

This makes changes low-risk and easy to validate, even without heavy process.

### Concrete choices (within this project)

- **State management**: React state only (no global store)
- **Persistence**: `localStorage` for save/load
- **Validation**: deterministic rules in pure helper functions
- **UI consistency**: shared components + CSS tokens
- **Testing focus**: logic + core interactions, not exhaustive coverage

These choices match the scope and avoid overengineering.

### Clear boundaries

The architecture enforces clear ownership:

- `FunnelBuilder.tsx` owns feature state and orchestration
- `components/` owns reusable UI
- `utils/` owns pure logic
- `data/` owns constants and templates
- `types/` owns shared contracts

This prevents accidental coupling and keeps the system easy to extend.

### Team scalability (if the project grew)

If this evolved into a team project, I’d add:

- Simple PR guidelines (screenshots, behavior changes, edge cases)
- A short architecture doc explaining patterns and boundaries
- Storybook for shared UI documentation
- Lightweight feature flags for risky changes

These additions scale quality without slowing teams down.

### Pragmatic tradeoffs (now vs later)

**Skipped for now (intentionally):**
- Feature flag framework
- Complex release pipelines
- Heavy monitoring and analytics
- Full design system tooling

**Added later if needed:**
- Error monitoring (Sentry)
- Feature flags for experimental editor behavior
- Storybook for shared UI
- More formal release process

This approach keeps development fast today while leaving clear paths to add safety and process as the product and team grow.