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

function MasonryCard({ data: img, deleting, onDelete }: CardProps) {
  const variant = img.variants?.mid ?? img.variants?.small;
  const displaySrc = variant?.url ?? img.url;
  const displayW = variant?.width ?? img.width ?? undefined;
  const displayH = variant?.height ?? img.height ?? undefined;
  return (
    <div
      data-page={img._pageIdx}
      data-offset={img._indexInPage}
      style={{
        background: "#fff",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.08)",
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={() => onDelete(img.id)}
        disabled={deleting === img.id}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          minWidth: 22,
          minHeight: 22,
          padding: 0,
          borderRadius: "50%",
          border: "none",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          fontSize: 16,
          lineHeight: "22px",
          textAlign: "center",
          cursor: deleting === img.id ? "not-allowed" : "pointer",
          opacity: deleting === img.id ? 0.5 : 1,
        }}
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
        style={{ width: "100%", height: "auto", display: "block" }}
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          if (el.src.endsWith(fallbackImage)) return;
          el.src = fallbackImage;
        }}
      />
      <div style={{ padding: 8 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 500,
            color: "#333",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {img.title}
        </p>
      </div>
    </div>
  );
}

export default MasonryCard;
