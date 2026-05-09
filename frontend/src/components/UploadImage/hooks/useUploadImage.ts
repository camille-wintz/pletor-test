import { useMutation, useQueryClient } from '@tanstack/react-query'
import { imagesQueryKey } from '../../Gallery/hooks/useImages'

const UPLOAD_URL = '/api/images/upload'

async function uploadImage(file: File): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to upload image')
  }
}

export function useUploadImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imagesQueryKey })
    },
  })
}
