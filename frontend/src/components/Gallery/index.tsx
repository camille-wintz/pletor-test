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
      <div className="text-center p-10">
        <p>Loading images...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-soft text-danger-strong p-3 rounded-md mb-5 text-center">
        Error: {error.message}
      </div>
    );
  }

  return (
    <>
      {items.length === 0 && (
        <p className="text-fg-subtle">No images found. Add one above!</p>
      )}
      {items.length > 0 && (
        <div
          ref={columnsRef}
          className="flex items-start"
          style={{ gap: GUTTER }}
        >
          {columns.map((col, colIdx) => (
            <div
              key={colIdx}
              className="flex flex-col flex-1 min-w-0"
              style={{ gap: GUTTER }}
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

      <div ref={sentinelRef} className="h-px" />

      {(isFetchingNextPage || isCatchingUp) && (
        <div className="text-center p-5 text-fg-subtle">
          <p>Loading more...</p>
        </div>
      )}
    </>
  );
}

export default Gallery;
