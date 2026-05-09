import { useMemo } from "react";
import { useImages } from "./hooks/useImages";
import { usePageOffsetUrl } from "./hooks/usePageOffsetUrl";
import { useGalleryScroll } from "./hooks/useGalleryScroll";
import { useColumnCount } from "./hooks/useColumnCount";
import GalleryCard, { type ImageItem } from "./GalleryCard";

const GUTTER = 12;
const TARGET_COL_WIDTH = 220;

interface GalleryProps {
  deleting: string | null;
  onDelete: (id: string) => void;
}

function Gallery({ deleting, onDelete }: GalleryProps) {
  const { initial, setPosition } = usePageOffsetUrl();
  const initialPage = initial?.page ?? 0;
  const { ref: columnsRef, count: columnCount } = useColumnCount(
    TARGET_COL_WIDTH,
    GUTTER,
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isCatchingUp,
    error,
  } = useImages(initialPage);

  const items = useMemo<ImageItem[]>(() => {
    const allPages = data?.pages ?? [];
    return allPages.flatMap((page, pageIdx) =>
      page.map((img, indexInPage) => ({
        ...img,
        _pageIdx: pageIdx,
        _indexInPage: indexInPage,
      })),
    );
  }, [data?.pages]);

  // Deterministic column assignment by overall index — adding new items at the
  // end never reflows existing items into different columns.
  const columns = useMemo(() => {
    const cols: ImageItem[][] = Array.from({ length: columnCount }, () => []);
    items.forEach((item, i) => {
      cols[i % columnCount].push(item);
    });
    return cols;
  }, [items, columnCount]);

  const { sentinelRef } = useGalleryScroll({
    isCatchingUp,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    setPosition,
    initial,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p>Loading images...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "#f8d7da",
          color: "#721c24",
          padding: 12,
          borderRadius: 6,
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        Error: {error.message}
      </div>
    );
  }

  return (
    <>
      {items.length === 0 && (
        <p style={{ color: "#666" }}>No images found. Add one above!</p>
      )}
      {items.length > 0 && (
        <div
          ref={columnsRef}
          style={{
            display: "flex",
            gap: GUTTER,
            alignItems: "flex-start",
          }}
        >
          {columns.map((col, colIdx) => (
            <div
              key={colIdx}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: GUTTER,
              }}
            >
              {col.map((img) => (
                <GalleryCard
                  key={img.id}
                  data={img}
                  deleting={deleting}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />

      {(isFetchingNextPage || isCatchingUp) && (
        <div style={{ textAlign: "center", padding: 20, color: "#666" }}>
          <p>Loading more...</p>
        </div>
      )}
    </>
  );
}

export default Gallery;
