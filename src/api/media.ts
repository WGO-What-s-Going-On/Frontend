import { api, ApiError } from './client'

// 사진 올리기: 업로드 자리 발급 → 받은 주소(GCS)로 파일 직접 PUT → 완료 확인 → 글 · 댓글 작성 때 mediaId 전달
// 업로드 주소 · 헤더는 서명된 값이라 로그에 남기지 않는다
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

interface UploadSlot {
  mediaId: string
  status: 'PENDING' | 'READY' | 'ATTACHED' | 'DELETING'
  upload: { method: 'PUT'; url: string; expiresAt: string; headers: Record<string, string> }
}

// 서버가 받는 사진인지 먼저 확인 (안 되는 파일은 업로드 자리를 만들지 않는다)
export function imageProblem(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return 'JPG · PNG · WEBP · GIF 사진만 올릴 수 있어요.'
  if (file.size > MAX_IMAGE_BYTES) return '사진은 10MB까지 올릴 수 있어요.'
  return null
}

async function sha256Base64(file: File) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))
  let binary = ''
  digest.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

export async function uploadImage(file: File): Promise<string> {
  const problem = imageProblem(file)
  if (problem) throw new ApiError(400, 'MEDIA_INVALID', problem)
  const slot = await api<UploadSlot>('POST', '/api/v1/posts/media/uploads', { body: { contentType: file.type, sizeBytes: file.size, checksum: await sha256Base64(file) } })
  try {
    // 서명 주소라 앱 인증 헤더 · 쿠키를 붙이지 않는다
    const response = await fetch(slot.upload.url, { method: slot.upload.method, headers: slot.upload.headers, body: file })
    if (!response.ok) throw new ApiError(response.status, 'MEDIA_UPLOAD_FAILED', '사진을 올리지 못했어요.')
    await api('POST', `/api/v1/posts/media/uploads/${encodeURIComponent(slot.mediaId)}/complete`)
    return slot.mediaId
  } catch (error) {
    // 실패한 업로드 자리는 정리한다 (다시 시도하면 새 자리를 받는다)
    api('DELETE', `/api/v1/posts/media/uploads/${encodeURIComponent(slot.mediaId)}`).catch(() => undefined)
    if (error instanceof TypeError) console.warn('[API] 사진 업로드 실패: 저장소 CORS 확인 필요')
    throw error instanceof ApiError ? error : new ApiError(0, 'MEDIA_UPLOAD_FAILED', '사진을 올리지 못했어요.')
  }
}
