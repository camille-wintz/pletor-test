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
  queued: 'var(--color-fg-status)',
  uploading: 'var(--color-primary)',
  retrying: 'var(--color-warning)',
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  cancelled: 'var(--color-fg-status)',
}

function TaskRow({ task, onCancel, onRetry }: TaskRowProps) {
  const fillPct = Math.round(task.progress * 100)
  const isActive = task.status === 'queued' || task.status === 'uploading' || task.status === 'retrying'
  const canRetry = task.status === 'error' && task.file !== null

  return (
    <div className="px-1 py-2 flex flex-col gap-1 border-b border-border-row">
      <div className="flex items-center gap-2">
        <span
          title={task.name}
          className="text-[13px] text-fg-strong flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        >
          {task.name}
        </span>
        <span
          className="text-[11px] font-medium shrink-0"
          style={{ color: STATUS_COLOR[task.status] }}
        >
          {STATUS_LABEL[task.status]}
          {task.status === 'uploading' && ` ${fillPct}%`}
        </span>
        {isActive && (
          <button
            type="button"
            onClick={() => onCancel(task.id)}
            aria-label={`Cancel ${task.name}`}
            className="shrink-0 size-5 p-0 border-none rounded-full bg-overlay-soft text-fg-muted cursor-pointer text-sm leading-5"
          >
            ×
          </button>
        )}
        {canRetry && (
          <button
            type="button"
            onClick={() => onRetry(task.id)}
            className="shrink-0 px-2 py-0.5 border border-danger rounded bg-surface text-danger cursor-pointer text-[11px] font-medium"
          >
            Retry
          </button>
        )}
      </div>

      <div className="h-1 w-full bg-border-subtle rounded-sm overflow-hidden">
        <div
          className="h-full transition-[width] duration-120 ease-linear"
          style={{
            width: `${task.status === 'success' ? 100 : task.status === 'cancelled' || task.status === 'error' ? 0 : fillPct}%`,
            background: STATUS_COLOR[task.status],
          }}
        />
      </div>

      {task.status === 'error' && task.errorMessage && (
        <span className="text-[11px] text-danger">{task.errorMessage}</span>
      )}
    </div>
  )
}

export default TaskRow
