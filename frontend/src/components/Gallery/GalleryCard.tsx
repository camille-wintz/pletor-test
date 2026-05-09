import type { Image } from "../../api-types/image";
import fallbackImage from "../../assets/image-unavailable.svg";

export interface ImageItem extends Image {
  _pageIdx: number;
  _indexInPage: number;
}

interface CardProps {
  data: ImageItem;
  deleting: string | null;
  onDelete: (id: string) => void;
}

function GalleryCard({ data: img, deleting, onDelete }: CardProps) {
  const variant = img.variants?.mid ?? img.variants?.small;
  const displaySrc = variant?.url ?? img.url;
  const displayW = variant?.width ?? img.width ?? undefined;
  const displayH = variant?.height ?? img.height ?? undefined;
  const isDeleting = deleting === img.id;
  return (
    <div
      data-page={img._pageIdx}
      data-offset={img._indexInPage}
      className="bg-surface rounded-lg overflow-hidden relative shadow-card"
    >
      <button
        type="button"
        onClick={() => onDelete(img.id)}
        disabled={isDeleting}
        className={`absolute top-1.5 right-1.5 size-5.5 p-0 rounded-full border-none bg-overlay text-surface text-base leading-5.5 text-center ${
          isDeleting ? "cursor-not-allowed opacity-50" : "cursor-pointer opacity-100"
        }`}
      >
        ×
      </button>
      <img
        src={displaySrc}
        alt={img.title}
        width={displayW}
        height={displayH}
        loading="eager"
        decoding="sync"
        className="w-full h-auto block"
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          if (el.src.endsWith(fallbackImage)) return;
          el.src = fallbackImage;
        }}
      />
      <div className="p-2">
        <p className="m-0 text-xs font-medium text-fg whitespace-nowrap overflow-hidden text-ellipsis">
          {img.title}
        </p>
      </div>
    </div>
  );
}

export default GalleryCard;
