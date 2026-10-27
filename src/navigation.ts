import type { Screen } from './types/domain'

export function screenFromPath(pathname: string): Screen {
  if (pathname === '/') return 'login'
  if (pathname === '/map') return 'home'
  if (pathname === '/boards') return 'board'
  if (pathname === '/search') return 'search'
  // 예전 작성 화면 주소는 게시판으로 보낸다 (작성은 빠른 작성 시트에서)
  if (pathname === '/boards/new' || pathname.startsWith('/boards/new/')) return 'board'
  if (/^\/boards\/[^/]+\/edit$/.test(pathname)) return 'edit'
  if (/^\/boards\/[^/]+\/outside$/.test(pathname)) return 'outside'
  if (/^\/boards\/[^/]+$/.test(pathname)) return 'detail'
  if (pathname === '/my') return 'my'
  if (pathname === '/my/activity') return 'activity'
  if (pathname === '/my/edit') return 'profile-edit'
  if (pathname === '/my/notifications') return 'notification-settings'
  // 예전 계정 관리 주소는 마이로 (로그아웃·탈퇴는 마이에 있다)
  if (pathname === '/my/account') return 'my'
  if (pathname === '/my/app-settings' || pathname === '/my/settings') return 'my'
  if (pathname === '/alerts') return 'alerts'
  // 예전 피드 탭 주소는 게시판으로 (피드는 게시판의 보기 방식 중 하나)
  if (pathname === '/feed') return 'board'
  if (pathname === '/signup/terms') return 'terms'
  if (pathname === '/signup/nickname') return 'nickname'
  if (pathname === '/permission/location') return 'location-permission'
  return 'login'
}

export function pathForScreen(screen: Screen, boardId?: string) {
  const encodedBoardId = encodeURIComponent(boardId || 'fire')
  const paths: Record<Screen, string> = {
    login: '/',
    home: '/map',
    board: '/boards',
    search: '/search',
    detail: `/boards/${encodedBoardId}`,
    edit: `/boards/${encodedBoardId}/edit`,
    my: '/my',
    activity: '/my/activity',
    alerts: '/alerts',
    'profile-edit': '/my/edit',
    'notification-settings': '/my/notifications',
    outside: `/boards/${encodedBoardId}/outside`,
    terms: '/signup/terms',
    nickname: '/signup/nickname',
    'location-permission': '/permission/location',
  }
  return paths[screen]
}

export function boardIdFromPath(pathname: string) {
  const match = pathname.match(/^\/boards\/([^/]+)(?:\/(?:edit|outside))?$/)
  if (!match || match[1] === 'new') return undefined
  return decodeURIComponent(match[1])
}
