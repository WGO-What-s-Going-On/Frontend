import { api, ApiError } from './client'

// 프로필 사진: 업로드 자리 발급 → 받은 주소(GCS)로 파일 직접 PUT → 완료 확인 → 보기 주소(GET URL) 다시 받기
// 서버는 JPG · PNG · WEBP, 2MB까지 받는다. 폰 사진은 대부분 더 커서 올리기 전에 긴 변 1080px JPG로 줄인다
// 업로드 · 보기 주소는 서명된 값이라 로그 · localStorage에 남기지 않는다 (Backend user-service PROFILE_IMAGE 계약)
const MAX_SIDE = 1080
const MAX_BYTES = 2 * 1024 * 1024

interface UploadSlot { uploadId: string; uploadUrl: string; method: 'PUT'; headers: Record<string, string>; expiresAt: string }
export interface ProfileImageUrl { profileImageKey: string | null; url: string | null; expiresAt: string | null }

async function sha256Base64(blob: Blob) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))
  let binary = ''
  digest.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

// 사진을 정사각형에 가깝게 쓰는 프로필용으로 줄인다 (비율은 그대로, 긴 변 1080px)
export async function shrinkImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file) } catch { throw new ApiError(400, 'IMAGE_UNREADABLE', '이 사진은 올릴 수 없어요. 다른 사진을 골라 주세요.') }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86))
  if (!blob || blob.size > MAX_BYTES) throw new ApiError(400, 'IMAGE_TOO_LARGE', '사진이 너무 커요. 다른 사진을 골라 주세요.')
  return blob
}

export const getMyProfileImage = () => api<ProfileImageUrl>('GET', '/api/v1/users/me/profile-image/url')

export async function uploadProfileImage(file: File): Promise<ProfileImageUrl> {
  const image = await shrinkImage(file)
  const slot = await api<UploadSlot>('POST', '/api/v1/users/me/profile-image/uploads', { body: { contentType: image.type, sizeBytes: image.size, checksum: await sha256Base64(image) } })
  // 서명 주소라 앱 인증 헤더 · 쿠키를 붙이지 않는다
  const response = await fetch(slot.uploadUrl, { method: slot.method, headers: slot.headers, body: image, credentials: 'omit' })
  if (!response.ok) throw new ApiError(response.status, 'PROFILE_UPLOAD_FAILED', '사진을 올리지 못했어요.')
  await api('POST', `/api/v1/users/me/profile-image/uploads/${encodeURIComponent(slot.uploadId)}/complete`)
  return getMyProfileImage()
}

export const removeProfileImage = () => api('PATCH', '/api/v1/users/me', { body: { profileImageKey: null } })

// 다른 사람 프로필 사진 보기 주소. 차단 · 탈퇴 · 비공개면 404 → 기본 아바타.
// 같은 사람을 여러 번 그려도 한 번만 받고, 만료 30초 전까지는 받아 둔 주소를 쓴다 (기기에 저장하지 않고 이번 실행 동안만)
const userPhotos = new Map<number, Promise<string | null> | { url: string | null; until: number }>()

export function getUserProfileImageUrl(userId: number): Promise<string | null> {
  const cached = userPhotos.get(userId)
  if (cached instanceof Promise) return cached
  if (cached && cached.until > Date.now()) return Promise.resolve(cached.url)
  const request = api<ProfileImageUrl>('GET', `/api/v1/users/${userId}/profile-image/url`)
    .then((image) => {
      userPhotos.set(userId, { url: image.url, until: image.expiresAt ? Date.parse(image.expiresAt) - 30_000 : Date.now() + 5 * 60_000 })
      return image.url
    })
    .catch(() => { userPhotos.set(userId, { url: null, until: Date.now() + 5 * 60_000 }); return null })
  userPhotos.set(userId, request)
  return request
}
