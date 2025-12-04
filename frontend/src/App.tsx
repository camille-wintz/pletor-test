import { useEffect, useState } from 'react'
import './App.css'

// Define the Image type based on usage
interface Image {
  id: string
  title: string
  user: string
  url: string
  created_at: string
}

var API_URL = 'http://localhost:8000/images/'

function App() {
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [form, setForm] = useState({ title: '', user: '', url: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

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

  // Show success message for 3 seconds
  useEffect(() => {
    if (showSuccess) {
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    }
  }, [showSuccess])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to add image')
      setForm({ title: '', user: '', url: '' })
      setShowSuccess(true)
      fetchImages()
    } catch (err: any) {
      setError(err)
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
    } catch (err: any) {
      setError(err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '2rem auto', fontFamily: 'Inter, sans-serif', padding: '0 20px' }}>
      <h1 style={{ textAlign: 'center', fontSize: '3rem', fontWeight: 700, marginBottom: 40, letterSpacing: '-2px', color: '#222' }}>Image Gallery</h1>

      {/* Add Image Form */}
      <div style={{ background: '#f8f9fa', padding: 24, borderRadius: 12, marginBottom: 40 }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>Add New Image</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontWeight: 500, color: '#333', display: 'block', marginBottom: 4 }}>Title</label>
            <input name="title" value={form.title} onChange={handleChange} required style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', minWidth: 150, fontSize: 14 }} placeholder="Enter title" />
          </div>
          <div>
            <label style={{ fontWeight: 500, color: '#333', display: 'block', marginBottom: 4 }}>User</label>
            <input name="user" value={form.user} onChange={handleChange} required style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', minWidth: 150, fontSize: 14 }} placeholder="Your name" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontWeight: 500, color: '#333', display: 'block', marginBottom: 4 }}>Image URL</label>
            <input name="url" value={form.url} onChange={handleChange} required style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', width: '100%', fontSize: 14, boxSizing: 'border-box' }} placeholder="https://example.com/image.jpg" />
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '10px 24px', borderRadius: 6, background: submitting ? '#999' : '#222', color: 'white', fontWeight: 600, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14, height: 42 }}>
            {submitting ? 'Adding...' : 'Add Image'}
          </button>
        </form>
      </div>

      {/* Status Messages */}
      {showSuccess && <div style={{ background: '#d4edda', color: '#155724', padding: 12, borderRadius: 6, marginBottom: 20, textAlign: 'center' }}>Image added successfully!</div>}
      {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: 12, borderRadius: 6, marginBottom: 20, textAlign: 'center' }}>Error: {error.message}</div>}

      {/* Loading State */}
      {loading && <div style={{ textAlign: 'center', padding: 40 }}><p>Loading images...</p></div>}

      {/* Image Count */}
      {!loading && <p style={{ color: '#666', marginBottom: 20 }}>Showing {images.length} images</p>}

      {/* Image Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        alignItems: 'stretch',
      }}>
        {images.length === 0 && !loading && <p style={{ textAlign: 'center', gridColumn: '1/-1', color: '#666' }}>No images found. Add one above!</p>}
        {images.map((img) => (
          <div key={img.id} style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.1)', borderRadius: 12, background: '#fff', overflow: 'hidden', border: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', paddingTop: '66.67%', background: '#f0f0f0' }}>
              <img
                src={img.url}
                alt={img.title}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found' }}
              />
            </div>
            <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600, color: '#222' }}>{img.title}</h3>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: 14 }}>By <span style={{ color: '#0066cc', fontWeight: 500 }}>{img.user}</span></p>
              <p style={{ margin: '0 0 12px 0', color: '#999', fontSize: 12 }}>{new Date(img.created_at).toLocaleDateString()}</p>
              <div style={{ marginTop: 'auto' }}>
                <button
                  onClick={() => handleDelete(img.id)}
                  disabled={deleting === img.id}
                  style={{
                    background: deleting === img.id ? '#ccc' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    cursor: deleting === img.id ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    fontSize: 13,
                    width: '100%'
                  }}
                >
                  {deleting === img.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
