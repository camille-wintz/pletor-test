# Image Gallery Exercise: Senior Frontend

## Business Context

You've joined **PictoShare**, a collaborative image gallery for creative
teams: marketing agencies, design studios, content creators. An earlier
contractor shipped an MVP; it works, but barely. Two pieces of user
feedback have become blockers for an upcoming client demo:

1. *"When I have lots of images, scrolling is janky and my fan spins up."*
2. *"Uploading a shoot means dragging files one at a time and praying nothing fails."*

Your job: make the gallery production-ready along the axes that matter
for a visual product: rendering performance, layout quality, and
upload resilience.

---

## Your Task (~1.5 hours)

The database is seeded with ~2000 images of mixed aspect ratios
(landscape, portrait, square) and varied file sizes. Work in priority
order. **We care more about your reasoning and tradeoffs than about
finishing everything.**

### 1. Make the gallery fast and smooth (required)

The current grid renders every image at full resolution on mount.
Bring it to production quality:

- Smooth scrolling at 2000+ images, including on a throttled "Slow 4G"
  connection (Chrome DevTools → Network → Slow 4G, CPU 4× slowdown).
- Handle **mixed aspect ratios** without layout shift. A justified-rows
  or masonry layout is expected: not a fixed-size grid.
- Scroll position should survive navigating away and back.
- Serve appropriately sized images. Loading a 4000px original into a
  300px card is not acceptable. You may add a backend thumbnail endpoint,
  a transform proxy, or anything equivalent: your call.

**Idel budget to hit:**
- LCP < 2.5s on Slow 4G
- INP < 200ms during scroll
- CLS = 0 after images load
- Memory stable after scrolling the full list (no unbounded growth)

### 2. Resilient batch upload (required)

Replace the single-file form with a batch uploader that a real user
would trust with 50 files from a shoot:

- Drag-and-drop multiple files at once.
- Concurrent upload queue
- Per-file progress, cancel individual, and retry on failure with
  backoff.
- The UI should stay responsive while uploads are in flight.
- Bonus: surviving a tab refresh mid-batch.

### 3. Notes (required, short)

Add a `NOTES.md` at the repo root covering:

- **What you measured.** Paste or screenshot a DevTools Performance or
  Lighthouse snapshot before/after.
- **Key tradeoffs.** Libraries you chose and why, and what you chose
  *not* to do.
- **What you'd do next** with another half day.

### Bonus (only if the above is solid)
- Layout-mode toggle (justified ↔ masonry) that preserves scroll
  position.
- Video upload + inline playback.
- One RTL or Playwright test covering the upload-to-gallery flow.

---

## Non-goals

Don't spend time on these unless they unblock the above:

- Auth, user management, or quotas.
- Backend rewrites beyond what's needed to serve thumbnails or
  support resumable uploads.
- Exhaustive test coverage

---

## What We're Evaluating

- **Rendering performance under load.** Can you identify the bottleneck,
  fix it, and prove the fix with numbers?
- **Layout quality.** How you handle variable aspect ratios, loading
  states, and avoid CLS.
- **Upload resilience.** How the UI behaves when the network misbehaves.
- **Architecture.** How you split `App.tsx`, where state lives, how the
  API surface is typed.
- **Judgement.** What you chose to skip, and how clearly you explain it.

If you use a virtualization or layout library, be ready to explain how
it handles variable heights and why that choice fits this product.

---

## Getting Started

```bash
docker compose up --build
```

- App: http://localhost:5173
- API docs: http://localhost:8000/docs

Both services hot-reload. Modify anything: frontend, backend, or both.
