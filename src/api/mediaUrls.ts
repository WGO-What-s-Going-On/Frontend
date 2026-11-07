// 사진 주소 다시 쓰기.
// 서버는 글을 불러올 때마다 같은 사진에도 새 서명 주소(GCS, 5~15분 유효)를 만들어 준다.
// 주소가 바뀌면 폰이 같은 사진으로 알아보지 못해 처음부터 다시 받으므로(앱을 껐다 켜거나 나갔다 오면 사진이 늦게 뜨는 이유),
// 같은 사진(mediaId)은 아직 넉넉히 유효한 예전 주소를 그대로 쓴다. 만료 2분 전부터는 새 주소로 바꾼다
const KEY = 'wgo-media-urls'
const MARGIN_MS = 2 * 60 * 1000

type Entry = { url: string; until: number }
let cache: Record<string, Entry> | null = null
let saveQueued = false

function load() {
  if (cache) return cache
  cache = {}
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Entry>
    const now = Date.now()
    for (const [id, entry] of Object.entries(saved)) if (entry && typeof entry.url === 'string' && entry.until - now > MARGIN_MS) cache[id] = entry
  } catch { /* 처음부터 */ }
  return cache
}

function save() {
  if (saveQueued) return
  saveQueued = true
  queueMicrotask(() => {
    saveQueued = false
    try { localStorage.setItem(KEY, JSON.stringify(cache ?? {})) } catch { /* 저장 못 하면 이번 실행 동안만 */ }
  })
}

// 주소가 언제까지 유효한지: 응답의 expiresAt, 없으면 서명 주소의 X-Goog-Date + X-Goog-Expires
function validUntil(url: string, expiresAt?: string) {
  if (expiresAt) {
    const time = Date.parse(expiresAt)
    if (!Number.isNaN(time)) return time
  }
  try {
    const query = new URL(url).searchParams
    const date = query.get('X-Goog-Date')?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
    const seconds = Number(query.get('X-Goog-Expires'))
    if (date && seconds) return Date.UTC(+date[1], +date[2] - 1, +date[3], +date[4], +date[5], +date[6]) + seconds * 1000
  } catch { /* 서명 주소가 아님 */ }
  return 0
}

export function stableMediaUrl(media: { mediaId?: string; url: string; expiresAt?: string } | undefined) {
  if (!media) return undefined
  if (!media.mediaId) return media.url
  const entries = load()
  const now = Date.now()
  const kept = entries[media.mediaId]
  if (kept && kept.until - now > MARGIN_MS) return kept.url
  const until = validUntil(media.url, media.expiresAt)
  if (until - now > MARGIN_MS) {
    entries[media.mediaId] = { url: media.url, until }
    save()
  }
  return media.url
}
