import random
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Integer, String, func, inspect, select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from image_processing import (
    LOCAL_URL_PREFIX,
    THUMB_WIDTHS,
    ImageProcessingError,
    generate_thumbs,
)

# Configuration
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
FAILURE_RATE = 0.15  # 15% random failure rate to simulate real-world conditions

DATABASE_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

class Image(Base):
    __tablename__ = "images"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    title = Column(String, nullable=False)
    user = Column(String, nullable=False)
    url = Column(String, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    thumbnail_small_url = Column(String, nullable=True)
    thumbnail_mid_url = Column(String, nullable=True)

class ImageCreate(BaseModel):
    title: str
    user: str
    url: str

class ImageVariant(BaseModel):
    url: str
    width: int
    height: int

class ImageVariants(BaseModel):
    small: Optional[ImageVariant] = None
    mid: Optional[ImageVariant] = None

class ImageRead(BaseModel):
    id: int
    created_at: datetime
    title: str
    user: str
    url: str
    width: Optional[int] = None
    height: Optional[int] = None
    variants: ImageVariants = ImageVariants()
    class Config:
        orm_mode = True


URL_DIM_RE = re.compile(r"w=(\d+)&h=(\d+)")


def _variant(orig_w: int, orig_h: int, target_w: int, url: str) -> ImageVariant:
    if orig_w <= target_w:
        return ImageVariant(url=url, width=orig_w, height=orig_h)
    h = round(orig_h * target_w / orig_w)
    return ImageVariant(url=url, width=target_w, height=h)


def to_read(img: Image) -> ImageRead:
    variants = ImageVariants()
    if img.width and img.height:
        if img.thumbnail_small_url:
            variants.small = _variant(img.width, img.height, THUMB_WIDTHS["small"], img.thumbnail_small_url)
        if img.thumbnail_mid_url:
            variants.mid = _variant(img.width, img.height, THUMB_WIDTHS["mid"], img.thumbnail_mid_url)
    return ImageRead(
        id=img.id,
        created_at=img.created_at,
        title=img.title,
        user=img.user,
        url=img.url,
        width=img.width,
        height=img.height,
        variants=variants,
    )


def _unlink_if_local(url: Optional[str]) -> None:
    if not url or not url.startswith(LOCAL_URL_PREFIX):
        return
    filename = url[len(LOCAL_URL_PREFIX):]
    try:
        (UPLOAD_DIR / filename).unlink()
    except FileNotFoundError:
        pass

async def get_db():
    async with SessionLocal() as db:
        yield db

app = FastAPI()


class CachedStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers["cache-control"] = "public, max-age=31536000, immutable"
        return response


# Serve uploaded files (content-addressed by UUID, so safe to cache long-term)
app.mount("/uploads", CachedStaticFiles(directory="uploads"), name="uploads")

# Add this after creating the FastAPI app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # or ["*"] for all origins (not recommended for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def maybe_fail():
    """Simulate random failures that happen in production"""
    if random.random() < FAILURE_RATE:
        raise HTTPException(status_code=503, detail="Service temporarily unavailable. Please try again.")

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def add_missing_columns(sync_conn):
            cols = {c["name"] for c in inspect(sync_conn).get_columns("images")}
            for name, sql_type in [
                ("width", "INTEGER"),
                ("height", "INTEGER"),
                ("thumbnail_small_url", "VARCHAR"),
                ("thumbnail_mid_url", "VARCHAR"),
            ]:
                if name not in cols:
                    sync_conn.execute(text(f"ALTER TABLE images ADD COLUMN {name} {sql_type}"))
        await conn.run_sync(add_missing_columns)

    # Backfill width/height from URL for null rows (idempotent)
    async with SessionLocal() as db:
        rows = (await db.execute(
            select(Image).where(Image.width.is_(None))
        )).scalars().all()
        for row in rows:
            m = URL_DIM_RE.search(row.url or "")
            if m:
                row.width, row.height = int(m.group(1)), int(m.group(2))
        if rows:
            await db.commit()

    # Migrate any rows still holding the old absolute "http://localhost:8000/uploads/"
    # URL format to relative "/uploads/" — relative URLs work in both dev (via vite
    # proxy) and prod (via nginx), and don't bake the dev hostname into stored data.
    async with SessionLocal() as db:
        OLD_PREFIX = "http://localhost:8000/uploads/"
        for col in (Image.url, Image.thumbnail_small_url, Image.thumbnail_mid_url):
            stale = (await db.execute(
                select(Image).where(col.like(f"{OLD_PREFIX}%"))
            )).scalars().all()
            for row in stale:
                current = getattr(row, col.key)
                setattr(row, col.key, "/uploads/" + current[len(OLD_PREFIX):])
        await db.commit()

    # Insert fake data if table is empty
    async with SessionLocal() as db:
        result = await db.execute(select(Image))
        images = result.scalars().all()
        if not images:
            # Large dataset to test performance handling - intentionally causes jank!
            users = ["alice", "bob", "charlie", "diana", "eve", "frank", "grace", "henry", "ivy", "jack"]

            # Unsplash photo IDs for various categories and aspect ratios
            photo_data = [
                # Landscapes (wide)
                ("Sunset Beach", "photo-1506744038136-46273834b3fb"),
                ("Mountain Lake", "photo-1465101046530-73398c7f28ca"),
                ("Forest Path", "photo-1441974231531-c6227db76b6e"),
                ("Ocean Waves", "photo-1505142468610-359e7d316be0"),
                ("Desert Dunes", "photo-1509316785289-025f5b846b35"),
                ("Autumn Forest", "photo-1507003211169-0a1dd7228f2d"),
                ("Snowy Mountains", "photo-1483921020237-2ff51e8e4b22"),
                ("Tropical Beach", "photo-1507525428034-b723cf961d3e"),
                ("Northern Lights", "photo-1531366936337-7c912a4589a7"),
                ("Misty Valley", "photo-1470071459604-3b5ec3a7fe05"),
                # Nature close-ups (various)
                ("Cherry Blossoms", "photo-1522383225653-ed111181a951"),
                ("Autumn Leaves", "photo-1507003211169-0a1dd7228f2d"),
                ("Water Droplets", "photo-1518837695005-2083093ee35b"),
                ("Butterfly Wings", "photo-1452570053594-1b985d6ea890"),
                ("Flower Macro", "photo-1490750967868-88aa4486c946"),
                ("Fern Details", "photo-1459411552884-841db9b3cc2a"),
                ("Moss Texture", "photo-1518882605630-8ed5c74e7534"),
                ("Pine Needles", "photo-1542273917363-3b1817f69a2d"),
                ("Ice Crystals", "photo-1517483000871-1dbf64a6e1c6"),
                ("Dewdrops", "photo-1495616811223-4d98c6e9c869"),
                # Urban/Architecture (tall/portrait)
                ("City Skyline", "photo-1477959858617-67f85cf4f1df"),
                ("Modern Building", "photo-1486325212027-8081e485255e"),
                ("Street Art", "photo-1499781350541-7783f6c6a0c8"),
                ("Neon Signs", "photo-1514525253161-7a46d19cd819"),
                ("Old Town", "photo-1480714378408-67cf0d13bc1b"),
                ("Bridge View", "photo-1449824913935-59a10b8d2000"),
                ("Subway Station", "photo-1474487548417-781cb71495f3"),
                ("Rooftop View", "photo-1514565131-fce0801e5785"),
                ("Window Reflections", "photo-1486406146926-c627a92ad1ab"),
                ("Stairway", "photo-1494522855154-9297ac14b55f"),
                # People/Portraits (square-ish)
                ("Street Portrait", "photo-1507003211169-0a1dd7228f2d"),
                ("Coffee Shop", "photo-1495474472287-4d71bcdd2085"),
                ("Market Scene", "photo-1488459716781-31db52582fe9"),
                ("Festival Crowd", "photo-1429962714451-bb934ecdc4ec"),
                ("Musician", "photo-1493225457124-a3eb161ffa5f"),
                ("Chef Cooking", "photo-1556909114-f6e7ad7d3136"),
                ("Artist Studio", "photo-1460661419201-fd4cecdf8a8b"),
                ("Bookstore", "photo-1521587760476-6c12a4b040da"),
                ("Cafe Interior", "photo-1501339847302-ac426a4a7cbb"),
                ("Workshop", "photo-1452860606245-08befc0ff44b"),
                # Animals
                ("Lion Portrait", "photo-1546182990-dffeafbe841d"),
                ("Elephant Walk", "photo-1557050543-4d5f4e07ef46"),
                ("Bird in Flight", "photo-1444464666168-49d633b86797"),
                ("Underwater Fish", "photo-1544551763-46a013bb70d5"),
                ("Fox in Snow", "photo-1474511320723-9a56873571b7"),
                ("Owl Eyes", "photo-1543549790-8b5f4a028cfb"),
                ("Horse Running", "photo-1553284965-83fd3e82fa5a"),
                ("Penguin Colony", "photo-1551986782-d0169b3f8fa7"),
                ("Deer Forest", "photo-1484406566174-9da000fda645"),
                ("Cat Portrait", "photo-1514888286974-6c03e2ca1dba"),
                # Food (square)
                ("Breakfast Spread", "photo-1504674900247-0877df9cc836"),
                ("Fresh Salad", "photo-1512621776951-a57141f2eefd"),
                ("Coffee Art", "photo-1495474472287-4d71bcdd2085"),
                ("Sushi Platter", "photo-1579871494447-9811cf80d66c"),
                ("Pizza Close-up", "photo-1565299624946-b28f40a0ae38"),
                ("Fruit Bowl", "photo-1490474418585-ba9bad8fd0ea"),
                ("Pasta Dish", "photo-1473093295043-cdd812d0e601"),
                ("Chocolate Dessert", "photo-1551024506-0bccd828d307"),
                ("Ice Cream", "photo-1497034825429-c343d7c6a68f"),
                ("Wine Glass", "photo-1510812431401-41d2bd2722f3"),
                # Abstract/Textures
                ("Paint Splatter", "photo-1541701494587-cb58502866ab"),
                ("Geometric Pattern", "photo-1509909756405-be0199881695"),
                ("Smoke Wisps", "photo-1518837695005-2083093ee35b"),
                ("Light Trails", "photo-1507400492013-162706c8c05e"),
                ("Color Gradient", "photo-1557682250-33bd709cbe85"),
                ("Marble Texture", "photo-1558618666-fcd25c85cd64"),
                ("Wood Grain", "photo-1558618047-f4b511e9a1f4"),
                ("Metal Surface", "photo-1504970717470-e7e5294e8bd0"),
                ("Fabric Folds", "photo-1528459801416-a9e53bbf4e17"),
                ("Glass Reflections", "photo-1509114397022-ed747cca3f65"),
                # Technology
                ("Laptop Setup", "photo-1496181133206-80ce9b88a853"),
                ("Code Screen", "photo-1461749280684-dccba630e2f6"),
                ("Circuit Board", "photo-1518770660439-4636190af475"),
                ("VR Headset", "photo-1592478411213-6153e4ebc07d"),
                ("Drone Shot", "photo-1473968512647-3e447244af8f"),
                ("Camera Gear", "photo-1516035069371-29a1b244cc32"),
                ("Gaming Setup", "photo-1593305841991-05c297ba4575"),
                ("Smart Watch", "photo-1579586337278-3befd40fd17a"),
                ("Headphones", "photo-1505740420928-5e560c06d30e"),
                ("Phone Screen", "photo-1512941937669-90a1b58e7e9c"),
                # Travel
                ("Eiffel Tower", "photo-1502602898657-3e91760cbb34"),
                ("Tokyo Street", "photo-1540959733332-eab4deabeeaf"),
                ("Venice Canal", "photo-1523906834658-6e24ef2386f9"),
                ("Santorini", "photo-1570077188670-e3a8d69ac5ff"),
                ("Machu Picchu", "photo-1526392060635-9d6019884377"),
                ("Grand Canyon", "photo-1474044159687-1ee9f3a51722"),
                ("Great Wall", "photo-1508804185872-d7badad00f7d"),
                ("Safari Sunset", "photo-1516426122078-c23e76319801"),
                ("Maldives", "photo-1514282401047-d79a71a590e8"),
                ("Swiss Alps", "photo-1531366936337-7c912a4589a7"),
            ]

            fake_images = []
            # Different aspect ratios to test gallery layout handling
            aspect_ratios = [
                ("w=2400&h=1350", "landscape"),  # 16:9 landscape
                ("w=1350&h=2400", "portrait"),   # 9:16 portrait
                ("w=2000&h=2000", "square"),     # 1:1 square
                ("w=2400&h=1600", "wide"),       # 3:2 landscape
                ("w=1600&h=2400", "tall"),       # 2:3 portrait
                ("w=2400&h=1000", "ultrawide"),  # 21:9 ultrawide
                ("w=1000&h=2400", "ultratall"),  # 9:21 tall
            ]
            for i in range(2000):  # Create 2000 images for noticeable performance issues
                title, photo_id = photo_data[i % len(photo_data)]
                user = users[i % len(users)]
                # Cycle through different aspect ratios
                aspect_params, _ = aspect_ratios[i % len(aspect_ratios)]
                url = f"https://images.unsplash.com/{photo_id}?{aspect_params}&fit=crop&q=100"
                m = URL_DIM_RE.search(aspect_params)
                w, h = (int(m.group(1)), int(m.group(2))) if m else (None, None)
                fake_images.append(Image(title=f"{title} #{i+1}", user=user, url=url, width=w, height=h))

            db.add_all(fake_images)
            await db.commit()

@app.get("/", response_model=dict)
def read_root():
    return {"Hello": "World"}

@app.post("/images/", response_model=ImageRead)
async def create_image(image: ImageCreate, db: AsyncSession = Depends(get_db)):
    maybe_fail()
    db_image = Image(**image.dict())
    db.add(db_image)
    await db.commit()
    await db.refresh(db_image)
    return to_read(db_image)

@app.post("/images/upload", response_model=ImageRead)
async def upload_image(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    user: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    maybe_fail()

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed. Use: {', '.join(allowed_types)}")

    # Validate file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    # Save original with unique name
    ext = Path(file.filename).suffix if file.filename else ".jpg"
    stem = uuid.uuid4().hex
    filename = f"{stem}{ext}"
    file_path = UPLOAD_DIR / filename

    with open(file_path, "wb") as f:
        f.write(contents)

    # Generate thumbnails + extract dimensions
    try:
        info = generate_thumbs(stem, contents, UPLOAD_DIR)
    except ImageProcessingError:
        raise HTTPException(status_code=400, detail="Could not process image")

    # Auto-generate title from filename if not provided
    if not title:
        original_name = Path(file.filename).stem if file.filename else "Untitled"
        # Clean up the filename: replace underscores/dashes with spaces, title case
        title = original_name.replace("_", " ").replace("-", " ").title()

    # Create database record
    url = f"{LOCAL_URL_PREFIX}{filename}"
    db_image = Image(
        title=title,
        user=user or "Anonymous",
        url=url,
        width=info["width"],
        height=info["height"],
        thumbnail_small_url=info["small_url"],
        thumbnail_mid_url=info["mid_url"],
    )
    db.add(db_image)
    await db.commit()
    await db.refresh(db_image)
    return to_read(db_image)

@app.get("/images/", response_model=List[ImageRead])
async def list_images(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Image).order_by(Image.created_at.desc()).limit(limit).offset(offset)
    )
    images = result.scalars().all()
    return [to_read(img) for img in images]

@app.get("/images/{image_id}", response_model=ImageRead)
async def get_image(image_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Image).where(Image.id == image_id))
    image = result.scalar_one_or_none()
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    return to_read(image)

@app.delete("/images/{image_id}", status_code=204)
async def delete_image(image_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Image).where(Image.id == image_id))
    image = result.scalar_one_or_none()
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    _unlink_if_local(image.url)
    _unlink_if_local(image.thumbnail_small_url)
    _unlink_if_local(image.thumbnail_mid_url)
    await db.delete(image)
    await db.commit()
    return None
