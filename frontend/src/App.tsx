import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Gallery from "./components/Gallery";
import UploadImage from "./components/UploadImage";
import UploadStatus from "./components/UploadStatus";
import { imagesQueryKey } from "./components/Gallery/hooks/useImages";
import { UploadQueueProvider } from "./upload/UploadQueueContext";

const API_URL = "/api/images/";

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
    <UploadQueueProvider>
      <div className="mx-auto my-8 px-5 font-sans max-w-336">
        <h1 className="text-center text-5xl font-bold mb-10 tracking-[-2px] text-fg-strong">
          Image Gallery
        </h1>

        <UploadImage />

        {error && (
          <div className="bg-danger-soft text-danger-strong p-3 rounded-md mb-5 text-center">
            Error: {error.message}
          </div>
        )}

        <Gallery deleting={deleting} onDelete={handleDelete} />
      </div>
      <UploadStatus />
    </UploadQueueProvider>
  );
}

export default App;
