import type { UploadTask } from '../../upload/types'

interface TaskRowProps {
  task: UploadTask
  onCancel: (id: string) => void
  onRetry: (id: string) => void
}

const STATUS_LABEL: Record<UploadTask['status'], string> = {
  queued: 'Queued',
  uploading: 'Uploading',
  retrying: 'Retrying…',
  success: 'Done',
  error: 'Failed',
  cancelled: 'Cancelled',
}

const STATUS_COLOR: Record<UploadTask['status'], string> = {
  queued: '#888',
  uploading: '#0066cc',
  retrying: '#d97706',
  success: '#198754',
  error: '#dc3545',
  cancelled: '#888',
}

function TaskRow({ task, onCancel, onRetry }: TaskRowProps) {
  const fillPct = Math.round(task.progress * 100)
  const isActive = task.status === 'queued' || task.status === 'uploading' || task.status === 'retrying'
  const canRetry = task.status === 'error' && task.file !== null

  return (
    <div
      style={{
        padding: '8px 4px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          title={task.name}
          style={{
            fontSize: 13,
            color: '#222',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {task.name}
        </span>
        <span
          style={{
            fontSize: 11,
            color: STATUS_COLOR[task.status],
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {STATUS_LABEL[task.status]}
          {task.status === 'uploading' && ` ${fillPct}%`}
        </span>
        {isActive && (
          <button
            type="button"
            onClick={() => onCancel(task.id)}
            aria-label={`Cancel ${task.name}`}
            style={{
              flexShrink: 0,
              width: 20,
              height: 20,
              padding: 0,
              border: 'none',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.08)',
              color: '#444',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: '20px',
            }}
          >
            ×
          </button>
        )}
        {canRetry && (
          <button
            type="button"
            onClick={() => onRetry(task.id)}
            style={{
              flexShrink: 0,
              padding: '2px 8px',
              border: '1px solid #dc3545',
              borderRadius: 4,
              background: '#fff',
              color: '#dc3545',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        )}
      </div>

      <div
        style={{
          height: 4,
          width: '100%',
          background: '#eee',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${task.status === 'success' ? 100 : task.status === 'cancelled' || task.status === 'error' ? 0 : fillPct}%`,
            background: STATUS_COLOR[task.status],
            transition: 'width 120ms linear',
          }}
        />
      </div>

      {task.status === 'error' && task.errorMessage && (
        <span style={{ fontSize: 11, color: '#dc3545' }}>{task.errorMessage}</span>
      )}
    </div>
  )
}

export default TaskRow
