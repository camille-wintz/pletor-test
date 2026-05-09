# PictoShare — Project Structure

A collaborative image gallery: FastAPI backend, React frontend, SQLite storage, Docker-orchestrated. See [README.md](README.md) for the original exercise brief and [NOTES.md](NOTES.md) for the rationale behind recent changes.

## Top-level layout

- [backend/](backend/) — FastAPI service (Python 3.12)
- [frontend/](frontend/) — React 19 + Vite SPA (TypeScript)
- [docker-compose.yml](docker-compose.yml) — dev stack (hot reload, frontend on `:5173`, backend on `:8000`)
- [docker-compose.prod.yml](docker-compose.prod.yml) — prod stack (built bundle served by nginx on `:80`, 4-worker uvicorn)

Run dev: `docker compose up -d`. Run prod: `docker compose -f docker-compose.prod.yml up -d --build`.

## Backend

Single-process FastAPI app with async SQLAlchemy over SQLite (`test.db`). Files live on disk under `backend/uploads/` and are served by a `CachedStaticFiles` mount with long-lived cache headers.

- [backend/main.py](backend/main.py) — app entrypoint: model (`Image`), Pydantic schemas (`ImageRead`, `ImageVariants`), endpoints, startup migrations, and a 2000-image seed routine. Endpoints:
  - `GET /images/?limit=&offset=` — paginated list (default 20)
  - `POST /images/upload` — multipart upload; validates type/size, persists original + thumbnails
  - `GET /images/{id}`, `DELETE /images/{id}`, `POST /images/`
  - `maybe_fail()` injects a 15% 503 rate to simulate flaky networks.
- [backend/image_processing.py](backend/image_processing.py) — `generate_thumbs()` produces small (200px) and mid (300px) WebP variants via Pillow.
- [backend/scripts/backfill_thumbnails.py](backend/scripts/backfill_thumbnails.py) — idempotent migration that generates missing thumbnails for existing rows (handles both local and remote URLs, concurrent fetch).
- Image URLs are stored as relative paths (`/uploads/...`) so they work in both dev (Vite proxy) and prod (nginx).

## Frontend

React 19 + Vite + TanStack Query. No CSS framework — inline styles. The `Masonry` virtualizer is from `masonic`.

- [frontend/src/main.tsx](frontend/src/main.tsx) — wraps `<App>` in `QueryClientProvider`.
- [frontend/src/App.tsx](frontend/src/App.tsx) — top-level layout, holds delete state, renders `<UploadImage>` and `<Gallery>`.
- [frontend/src/api-types/image.ts](frontend/src/api-types/image.ts) — shared `Image` / `ImageVariant` types matching backend Pydantic models.
- [frontend/src/components/Gallery/](frontend/src/components/Gallery/)
  - [index.tsx](frontend/src/components/Gallery/index.tsx) — composes hooks and renders the `Masonry` grid.
  - [MasonryCard.tsx](frontend/src/components/Gallery/MasonryCard.tsx) — single tile; picks the smallest acceptable variant (`mid` → `small` → original) and renders with explicit `width`/`height` to prevent CLS.
  - [hooks/useImages.ts](frontend/src/components/Gallery/hooks/useImages.ts) — `useInfiniteQuery` against `/api/images/`, page size 20. Exposes `isCatchingUp` so the UI can replay pages up to a deep-link target.
  - [hooks/useGalleryScroll.ts](frontend/src/components/Gallery/hooks/useGalleryScroll.ts) — IntersectionObserver sentinel for infinite scroll, plus a debounced scroll listener that writes the topmost visible card's `(page, offset)` to the URL. Returns a `scrollToIndex` for restoring position on load.
  - [hooks/usePageOffsetUrl.ts](frontend/src/components/Gallery/hooks/usePageOffsetUrl.ts) — read/write `?page=&offset=` query params with `history.replaceState`.
- [frontend/src/components/UploadImage/](frontend/src/components/UploadImage/)
  - [index.tsx](frontend/src/components/UploadImage/index.tsx) — drag-and-drop file picker with preview.
  - [hooks/useUploadImage.ts](frontend/src/components/UploadImage/hooks/useUploadImage.ts) — `useMutation` POSTing multipart to `/api/images/upload`; invalidates the `imagesQueryKey` on success.
- [frontend/vite.config.js](frontend/vite.config.js) — proxies `/api` and `/uploads` to `http://backend:8000` in dev.
- [frontend/nginx.conf](frontend/nginx.conf) — prod reverse proxy: serves the built bundle, forwards `/api/` and `/uploads/` to the backend, caches `/assets/` for a year.
- [frontend/Dockerfile.prod](frontend/Dockerfile.prod) — multi-stage build: Node compiles, nginx serves.

## Data flow

1. Browser hits nginx (prod) or Vite (dev).
2. `/api/images/?limit=20&offset=N` returns rows with `variants.{small,mid}` URLs sized for the gallery.
3. `<MasonryCard>` renders the smallest fitting variant; original is only loaded if no variant exists.
4. On scroll, the sentinel triggers `fetchNextPage`; the URL is kept in sync with the topmost card. Reload restores via `scrollToIndex`.
5. Uploads POST to `/api/images/upload`; backend writes original + WebP thumbnails, then the gallery query is invalidated.

## Conventions

- Image URLs are always relative (`/uploads/...`) — never bake in a hostname.
- TS types for API payloads live under [frontend/src/api-types/](frontend/src/api-types/) and mirror the Pydantic models in [main.py](backend/main.py).
- Hooks are colocated with the component that owns them under `components/<Name>/hooks/`.
- Backend startup performs idempotent migrations (column adds, URL rewrites, seed-if-empty) — safe to restart.
