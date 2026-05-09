"""Generate small + mid WebP thumbnails for existing rows missing them.
Handles both local uploads (read from disk) and remote URLs (HTTP fetch).
Idempotent — re-running only touches rows still missing thumbs.

Usage (from the backend/ directory):
    python scripts/backfill_thumbnails.py
"""
import asyncio
import sys
from pathlib import Path
from typing import Optional
from urllib.request import Request, urlopen

# Make the backend/ directory importable when run as `python scripts/backfill_thumbnails.py`.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from main import Image, SessionLocal, UPLOAD_DIR
from image_processing import (
    LOCAL_URL_PREFIX,
    ImageProcessingError,
    generate_thumbs,
)

CONCURRENT_FETCHES = 8
HTTP_TIMEOUT_SECONDS = 30


def _stem_for(row: Image) -> str:
    """Pick a stable filename stem for the thumb files."""
    if row.url and row.url.startswith(LOCAL_URL_PREFIX):
        return Path(row.url[len(LOCAL_URL_PREFIX):]).stem
    return f"remote_{row.id}"


def _read_local(url: str) -> Optional[bytes]:
    filename = url[len(LOCAL_URL_PREFIX):]
    path = UPLOAD_DIR / filename
    if not path.exists():
        return None
    return path.read_bytes()


def _fetch_remote(url: str) -> bytes:
    req = Request(url, headers={"User-Agent": "thumbnail-backfill/1.0"})
    with urlopen(req, timeout=HTTP_TIMEOUT_SECONDS) as resp:
        return resp.read()


async def _process_row(row: Image, sem: asyncio.Semaphore) -> tuple[Image, Optional[dict], Optional[str]]:
    """Fetch source bytes (local or remote) and generate thumbs.
    Returns (row, info_dict, error_message). Exactly one of info_dict or error_message is non-None."""
    async with sem:
        try:
            if not row.url:
                return row, None, "no url"
            if row.url.startswith(LOCAL_URL_PREFIX):
                source = await asyncio.to_thread(_read_local, row.url)
                if source is None:
                    return row, None, "missing local file"
            else:
                source = await asyncio.to_thread(_fetch_remote, row.url)
            stem = _stem_for(row)
            info = await asyncio.to_thread(generate_thumbs, stem, source, UPLOAD_DIR)
            return row, info, None
        except ImageProcessingError as e:
            return row, None, f"decode error: {e}"
        except Exception as e:
            return row, None, f"fetch error: {type(e).__name__}: {e}"


async def main() -> None:
    async with SessionLocal() as db:
        rows = (await db.execute(
            select(Image).where(Image.thumbnail_small_url.is_(None))
        )).scalars().all()
        print(f"Processing {len(rows)} rows missing thumbnails (concurrency={CONCURRENT_FETCHES}).")

        sem = asyncio.Semaphore(CONCURRENT_FETCHES)
        tasks = [asyncio.create_task(_process_row(row, sem)) for row in rows]

        ok = fail = 0
        for completed in asyncio.as_completed(tasks):
            row, info, err = await completed
            if err is not None:
                print(f"  skip ({err}): id={row.id}")
                fail += 1
                continue
            assert info is not None
            row.width = info["width"]
            row.height = info["height"]
            row.thumbnail_small_url = info["small_url"]
            row.thumbnail_mid_url = info["mid_url"]
            ok += 1
            if ok % 100 == 0:
                await db.commit()
                print(f"  progress: {ok + fail}/{len(rows)} (ok={ok} fail={fail})")
        await db.commit()
        print(f"Done. ok={ok} fail={fail}")


if __name__ == "__main__":
    asyncio.run(main())
