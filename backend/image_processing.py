from io import BytesIO
from pathlib import Path

from PIL import Image as PILImage, ImageOps, UnidentifiedImageError

THUMB_WIDTHS = {"small": 200, "mid": 300}
LOCAL_URL_PREFIX = "/uploads/"


class ImageProcessingError(Exception):
    pass


def generate_thumbs(stem: str, source_bytes: bytes, upload_dir: Path) -> dict:
    """Generate small + mid WebP thumbnails. Returns dict with width, height,
    small_url, mid_url. Writes two files to upload_dir."""
    try:
        with PILImage.open(BytesIO(source_bytes)) as raw:
            oriented = ImageOps.exif_transpose(raw)
            orig_w, orig_h = oriented.size
            urls = {}
            for label, target_w in THUMB_WIDTHS.items():
                if oriented.width <= target_w:
                    thumb = oriented
                else:
                    h = round(oriented.height * target_w / oriented.width)
                    thumb = oriented.resize((target_w, h), PILImage.LANCZOS)
                out_path = upload_dir / f"{stem}_{label}.webp"
                thumb.save(out_path, format="WEBP", quality=85)
                urls[f"{label}_url"] = f"{LOCAL_URL_PREFIX}{stem}_{label}.webp"
            return {"width": orig_w, "height": orig_h, **urls}
    except (UnidentifiedImageError, PILImage.DecompressionBombError) as e:
        raise ImageProcessingError(str(e))
