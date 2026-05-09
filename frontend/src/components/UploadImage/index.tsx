import { useEffect, useRef, useState } from 'react'
import { useUploadImage } from './hooks/useUploadImage'

function UploadImage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { mutate, isPending: submitting, error } = useUploadImage()

  useEffect(() => {
    if (showSuccess) {
      const t = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(t)
    }
  }, [showSuccess])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFile) return
    mutate(selectedFile, {
      onSuccess: () => {
        clearSelectedFile()
        setShowSuccess(true)
      },
    })
  }

  return (
    <>
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
          Add New Image
        </h2>
        <form onSubmit={handleSubmit}>
          <label
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              border: isDragging ? '2px dashed #0066cc' : '2px dashed #ccc',
              borderRadius: 8,
              padding: 24,
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? '#e6f0ff' : '#fff',
              transition: 'all 0.2s ease',
              minHeight: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileInputChange}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            {preview ? (
              <div>
                <img
                  src={preview}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 180,
                    borderRadius: 6,
                    pointerEvents: 'none',
                  }}
                />
                <p
                  style={{
                    margin: '12px 0 0',
                    fontSize: 13,
                    color: '#333',
                    pointerEvents: 'none',
                  }}
                >
                  {selectedFile?.name}
                </p>
              </div>
            ) : (
              <>
                <p
                  style={{
                    margin: 0,
                    color: '#666',
                    fontSize: 14,
                    pointerEvents: 'none',
                  }}
                >
                  {isDragging
                    ? 'Drop image here'
                    : 'Drag & drop an image here, or click to select'}
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    color: '#999',
                    fontSize: 12,
                    pointerEvents: 'none',
                  }}
                >
                  Supports: JPEG, PNG, GIF, WebP
                </p>
              </>
            )}
          </label>

          {preview && (
            <button
              type="button"
              onClick={clearSelectedFile}
              style={{
                marginTop: 12,
                fontSize: 13,
                color: '#dc3545',
                cursor: 'pointer',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                padding: 0,
                display: 'block',
              }}
            >
              Remove selected image
            </button>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedFile}
            style={{
              marginTop: 16,
              padding: '12px 24px',
              borderRadius: 6,
              background: submitting || !selectedFile ? '#ccc' : '#222',
              color: 'white',
              fontWeight: 600,
              border: 'none',
              cursor: submitting || !selectedFile ? 'not-allowed' : 'pointer',
              fontSize: 14,
              width: '100%',
            }}
          >
            {submitting ? 'Uploading...' : 'Upload Image'}
          </button>
        </form>
      </div>

      {showSuccess && (
        <div
          style={{
            background: '#d4edda',
            color: '#155724',
            padding: 12,
            borderRadius: 6,
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          Image added successfully!
        </div>
      )}
      {error && (
        <div
          style={{
            background: '#f8d7da',
            color: '#721c24',
            padding: 12,
            borderRadius: 6,
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          Error: {error.message}
        </div>
      )}
    </>
  )
}

export default UploadImage
