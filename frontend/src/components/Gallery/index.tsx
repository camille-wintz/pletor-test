import { useCallback, useMemo } from "react";
import { Masonry } from "masonic";
import { useImages } from "./hooks/useImages";
import { usePageOffsetUrl } from "./hooks/usePageOffsetUrl";
import { useGalleryScroll } from "./hooks/useGalleryScroll";
import MasonryCard, { type ImageItem } from "./MasonryCard";

interface GalleryProps {
  deleting: string | null;
  onDelete: (id: string) => void;
}

function Gallery({ deleting, onDelete }: GalleryProps) {
  const { initial, setPosition } = usePageOffsetUrl();
  const initialPage = initial?.page ?? 0;

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

  const { sentinelRef, scrollToIndex } = useGalleryScroll({
    isCatchingUp,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    setPosition,
    initial,
    pages: data?.pages,
    itemsLength: items.length,
  });

  const renderCard = useCallback(
    (props: { data: ImageItem; width: number; index: number }) => (
      <MasonryCard data={props.data} deleting={deleting} onDelete={onDelete} />
    ),
    [deleting, onDelete],
  );

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
        <Masonry
          items={items}
          columnWidth={220}
          columnGutter={12}
          itemKey={(item) => String(item.id)}
          render={renderCard}
          scrollToIndex={scrollToIndex}
        />
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
