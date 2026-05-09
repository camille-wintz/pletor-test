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
      className={`flex flex-col items-center justify-center text-center cursor-pointer rounded-lg relative transition-all border-2 border-dashed ${
        compact ? 'p-3 min-h-15' : 'p-6 min-h-30'
      } ${
        isDragging ? 'border-primary bg-primary-soft' : 'border-border bg-surface'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <p
        className={`m-0 text-fg-subtle pointer-events-none ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        {isDragging
          ? 'Drop images here'
          : compact
            ? 'Drop more or click to add'
            : 'Drag & drop images here, or click to select'}
      </p>
      {!compact && (
        <p className="mt-1 text-xs text-fg-faint pointer-events-none">
          JPEG, PNG, GIF, WebP — up to 10MB each
        </p>
      )}
    </label>
  )
}

export default FilePicker
