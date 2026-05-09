import { useRef, useState } from 'react'
import { ACCEPTED_MIME_TYPES } from '../../upload/constants'

const ACCEPT_ATTR = ACCEPTED_MIME_TYPES.join(',')

interface FilePickerProps {
  onFiles: (files: File[]) => void
  compact?: boolean
}

function FilePicker({ onFiles, compact = false }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const files: File[] = []
    for (let i = 0; i < fileList.length; i++) {
      files.push(fileList[i])
    }
    onFiles(files)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <label
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setIsDragging(false)
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        cursor: 'pointer',
        border: isDragging ? '2px dashed #0066cc' : '2px dashed #ccc',
        borderRadius: 8,
        background: isDragging ? '#e6f0ff' : '#fff',
        padding: compact ? 12 : 24,
        minHeight: compact ? 60 : 120,
        position: 'relative',
        transition: 'all 0.15s ease',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
        }}
      />
      <p
        style={{
          margin: 0,
          color: '#666',
          fontSize: compact ? 12 : 14,
          pointerEvents: 'none',
        }}
      >
        {isDragging
          ? 'Drop images here'
          : compact
            ? 'Drop more or click to add'
            : 'Drag & drop images here, or click to select'}
      </p>
      {!compact && (
        <p
          style={{
            margin: '4px 0 0',
            color: '#999',
            fontSize: 12,
            pointerEvents: 'none',
          }}
        >
          JPEG, PNG, GIF, WebP — up to 10MB each
        </p>
      )}
    </label>
  )
}

export default FilePicker
