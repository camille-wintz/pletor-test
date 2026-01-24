import { useEffect, useRef, useState } from 'react'
import './App.css'

interface Image {
  id: string
  title: string
  url: string
  created_at: string
}

const API_URL = 'http://localhost:8000/images/'
const UPLOAD_URL = 'http://localhost:8000/images/upload'

function App() {
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchImages = () => {
    setLoading(true)
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch images')
        return res.json()
      })
      .then(setImages)
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchImages()
  }, [])

  useEffect(() => {
    if (showSuccess) {
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFile) {
      setError(new Error('Please select an image file'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to upload image')
      }
      clearSelectedFile()
      setShowSuccess(true)
      fetchImages()
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error('Upload failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    setDeleting(id)
    try {
      const res = await fetch(API_URL + id, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete image')
      fetchImages()
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error('Delete failed'))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ margin: '2rem auto', fontFamily: 'Inter, sans-serif', padding: '0 20px' }}>
      <h1 style={{ textAlign: 'center', fontSize: '3rem', fontWeight: 700, marginBottom: 40, letterSpacing: '-2px', color: '#222' }}>Image Gallery</h1>

      {/* Upload Form */}
      <div style={{ background: '#f8f9fa', padding: 24, borderRadius: 12, marginBottom: 40, maxWidth: 500, margin: '0 auto 40px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>Add New Image</h2>
        <form onSubmit={handleSubmit}>
          {/* Drop Zone */}
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
                <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 6, pointerEvents: 'none' }} />
                <p style={{ margin: '12px 0 0', fontSize: 13, color: '#333', pointerEvents: 'none' }}>{selectedFile?.name}</p>
              </div>
            ) : (
              <>
                <p style={{ margin: 0, color: '#666', fontSize: 14, pointerEvents: 'none' }}>
                  {isDragging ? 'Drop image here' : 'Drag & drop an image here, or click to select'}
                </p>
                <p style={{ margin: '4px 0 0', color: '#999', fontSize: 12, pointerEvents: 'none' }}>Supports: JPEG, PNG, GIF, WebP</p>
              </>
            )}
          </label>

          {preview && (
            <button
              type="button"
              onClick={clearSelectedFile}
              style={{ marginTop: 12, fontSize: 13, color: '#dc3545', cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, display: 'block' }}
            >
              Remove selected image
            </button>
          )}

          <button type="submit" disabled={submitting || !selectedFile} style={{ marginTop: 16, padding: '12px 24px', borderRadius: 6, background: (submitting || !selectedFile) ? '#ccc' : '#222', color: 'white', fontWeight: 600, border: 'none', cursor: (submitting || !selectedFile) ? 'not-allowed' : 'pointer', fontSize: 14, width: '100%' }}>
            {submitting ? 'Uploading...' : 'Upload Image'}
          </button>
        </form>
      </div>

      {/* Status Messages */}
      {showSuccess && <div style={{ background: '#d4edda', color: '#155724', padding: 12, borderRadius: 6, marginBottom: 20, textAlign: 'center' }}>Image added successfully!</div>}
      {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: 12, borderRadius: 6, marginBottom: 20, textAlign: 'center' }}>Error: {error.message}</div>}

      {/* Loading State */}
      {loading && <div style={{ textAlign: 'center', padding: 40 }}><p>Loading images...</p></div>}

      {/* Image Grid */}
      {!loading && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
        }}>
        {images.length === 0 && <p style={{ color: '#666' }}>No images found. Add one above!</p>}
        {images.map((img) => {
          // Intentionally inefficient: compute styles on every render
          const cardStyle = {
            width: 400,
            background: '#fff',
            borderRadius: 8,
            overflow: 'hidden' as const,
            boxShadow: `0 ${Math.random() * 0 + 1}px 3px rgba(0,0,0,0.1), 0 ${Math.random() * 0 + 2}px 8px rgba(0,0,0,0.08)`,
            position: 'relative' as const,
            // Intentionally heavy: force layout recalculation
            transform: `translateZ(0) rotate(${Math.random() * 0}deg)`,
          }
          return (
            <div key={img.id} style={cardStyle}>
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                disabled={deleting === img.id}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  minWidth: 22,
                  minHeight: 22,
                  padding: 0,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: 16,
                  lineHeight: '22px',
                  textAlign: 'center',
                  cursor: deleting === img.id ? 'not-allowed' : 'pointer',
                  opacity: deleting === img.id ? 0.5 : 1,
                }}
              >
                ×
              </button>
              <img
                src={img.url}
                alt={img.title}
                loading="eager"
                decoding="sync"
                style={{ width: 400, height: 300, objectFit: 'cover', display: 'block' }}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Error' }}
              />
              <div style={{ padding: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.title}</p>
              </div>
            </div>
          )
        })}
        </div>
      )}
    </div>
  )
}

export default App
