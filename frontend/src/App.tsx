import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import "./App.css";
import Gallery from "./components/Gallery";
import UploadImage from "./components/UploadImage";
import { imagesQueryKey } from "./components/Gallery/hooks/useImages";

const API_URL = "http://localhost:8000/images/";

function App() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setError(null);
    setDeleting(id);
    try {
      const res = await fetch(API_URL + id, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete image");
      queryClient.invalidateQueries({ queryKey: imagesQueryKey });
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error("Delete failed"));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div
      style={{
        margin: "2rem auto",
        fontFamily: "Inter, sans-serif",
        padding: "0 20px",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          fontSize: "3rem",
          fontWeight: 700,
          marginBottom: 40,
          letterSpacing: "-2px",
          color: "#222",
        }}
      >
        Image Gallery
      </h1>

      <UploadImage />

      {error && (
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
      )}

      <Gallery deleting={deleting} onDelete={handleDelete} />
    </div>
  );
}

export default App;
