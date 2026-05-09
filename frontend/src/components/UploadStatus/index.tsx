import { useUploadQueue } from '../../upload/UploadQueueContext'
import FilePicker from '../FilePicker'
import TaskRow from './TaskRow'

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2px solid rgba(255,255,255,0.4)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'upload-spin 0.8s linear infinite',
      }}
    />
  )
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
  } = useUploadQueue()

  if (tasks.length === 0) return null

  const finishedCount = tasks.length - activeCount
  const hasFinished = finishedCount > 0

  return (
    <div
      role="region"
      aria-label="Upload status"
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        width: panelExpanded ? 360 : 'auto',
        maxWidth: 'calc(100vw - 40px)',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        zIndex: 1000,
      }}
    >
      <button
        type="button"
        onClick={panelExpanded ? minimizePanel : expandPanel}
        aria-expanded={panelExpanded}
        aria-label={panelExpanded ? 'Minimize upload status' : 'Expand upload status'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '10px 14px',
          background: '#222',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {activeCount > 0 ? <Spinner /> : <span style={{ fontSize: 16 }}>✓</span>}
        <span style={{ flex: 1, textAlign: 'left' }}>
          {activeCount > 0
            ? `${activeCount} uploading${finishedCount > 0 ? ` · ${finishedCount} done` : ''}`
            : `${finishedCount} finished`}
        </span>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {panelExpanded ? '▾' : '▸'}
        </span>
      </button>

      {panelExpanded && (
        <div
          style={{
            maxHeight: 400,
            overflowY: 'auto',
            padding: '4px 14px',
          }}
        >
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onCancel={cancelTask}
              onRetry={retryTask}
            />
          ))}
          {hasFinished && (
            <div style={{ padding: '8px 0', textAlign: 'right' }}>
              <button
                type="button"
                onClick={clearFinished}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear finished
              </button>
            </div>
          )}
          <div style={{ padding: '8px 0 12px' }}>
            <FilePicker compact onFiles={addFiles} />
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadStatus
