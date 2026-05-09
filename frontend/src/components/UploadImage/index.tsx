import { useUploadQueue } from "../../upload/UploadQueueContext";
import FilePicker from "../FilePicker";

function UploadImage() {
  const { tasks, activeCount, panelExpanded, addFiles, expandPanel } =
    useUploadQueue();

  const totalCount = tasks.length;
  const showPanelControls = totalCount > 0;
  const showExpandButton = showPanelControls && !panelExpanded;

  return (
    <div className="bg-surface-alt p-6 rounded-xl mb-10 max-w-125 mx-auto">
      <h2 className="mt-0 mb-4 text-lg font-semibold">Add new images</h2>

      <FilePicker onFiles={addFiles} />

      {showPanelControls && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[13px] text-fg-muted">
            {activeCount > 0
              ? `${activeCount} ${activeCount === 1 ? "file" : "files"} uploading`
              : `${totalCount} ${totalCount === 1 ? "upload" : "uploads"} finished`}
          </span>
          {showExpandButton && (
            <button
              type="button"
              onClick={expandPanel}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-surface text-fg cursor-pointer"
            >
              Show details
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadImage;
