import { useUploadQueue } from "../../upload/UploadQueueContext";
import FilePicker from "../FilePicker";
import TaskRow from "./TaskRow";

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-white/40 animate-spin-slow"
      style={{
        width: size,
        height: size,
        borderTopColor: "var(--color-surface)",
      }}
    />
  );
}

function UploadStatus() {
  const {
    tasks,
    activeCount,
    panelExpanded,
    addFiles,
    cancelTask,
    retryTask,
    clearFinished,
    expandPanel,
    minimizePanel,
  } = useUploadQueue();

  if (tasks.length === 0) return null;

  const finishedCount = tasks.length - activeCount;
  const hasFinished = finishedCount > 0;

  return (
    <div
      role="region"
      aria-label="Upload status"
      className={`fixed right-5 bottom-5 max-w-[calc(100vw-40px)] bg-surface rounded-xl overflow-hidden font-sans z-1000 shadow-panel ${
        panelExpanded ? "w-90" : "w-auto"
      }`}
    >
      <button
        type="button"
        onClick={panelExpanded ? minimizePanel : expandPanel}
        aria-expanded={panelExpanded}
        aria-label={
          panelExpanded ? "Minimize upload status" : "Expand upload status"
        }
        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-fg-strong text-surface border-none cursor-pointer text-sm font-medium outline-none"
      >
        {activeCount > 0 ? (
          <Spinner />
        ) : (
          <span className="text-base">✓</span>
        )}
        <span className="flex-1 text-left">
          {activeCount > 0
            ? `${activeCount} uploading${finishedCount > 0 ? ` · ${finishedCount} done` : ""}`
            : `${finishedCount} finished`}
        </span>
        <span className="text-xs opacity-70">
          {panelExpanded ? "▾" : "▸"}
        </span>
      </button>

      {panelExpanded && (
        <div className="max-h-100 overflow-y-auto px-3.5 py-1">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onCancel={cancelTask}
              onRetry={retryTask}
            />
          ))}
          {hasFinished && (
            <div className="py-2 text-right">
              <button
                type="button"
                onClick={clearFinished}
                className="bg-transparent border-none text-fg-subtle text-xs cursor-pointer underline"
              >
                Clear finished
              </button>
            </div>
          )}
          <div className="pt-2 pb-3">
            <FilePicker compact onFiles={addFiles} />
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadStatus;
