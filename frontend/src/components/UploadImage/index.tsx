import { useUploadQueue } from '../../upload/UploadQueueContext'
import FilePicker from '../FilePicker'

function UploadImage() {
  const { tasks, activeCount, panelExpanded, addFiles, expandPanel } = useUploadQueue()

  const totalCount = tasks.length
  const showPanelControls = totalCount > 0
  const showExpandButton = showPanelControls && !panelExpanded

  return (
    <div
      style={{
        background: '#f8f9fa',
        padding: 24,
        borderRadius: 12,
        marginBottom: 40,
        maxWidth: 500,
        margin: '0 auto 40px',
      }}
    >
      <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
        Add New Images
      </h2>

      <FilePicker onFiles={addFiles} />

      {showPanelControls && (
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, color: '#444' }}>
            {activeCount > 0
              ? `${activeCount} ${activeCount === 1 ? 'file' : 'files'} uploading`
              : `${totalCount} ${totalCount === 1 ? 'upload' : 'uploads'} finished`}
          </span>
          {showExpandButton && (
            <button
              type="button"
              onClick={expandPanel}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid #ccc',
                background: '#fff',
                color: '#333',
                cursor: 'pointer',
              }}
            >
              Show details
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default UploadImage
