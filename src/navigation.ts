import type { Screen } from './types/domain'

export function screenFromPath(pathname: string): Screen {
  if (pathname === '/') return 'login'
  if (pathname === '/map') return 'home'
  if (pathname === '/boards') return 'board'
  if (pathname === '/search') return 'search'
  if (pathname === '/boards/new/category') return 'category'
  if (pathname === '/boards/new') return 'create'
  if (/^\/boards\/[^/]+\/edit$/.test(pathname)) return 'edit'
  if (/^\/boards\/[^/]+\/outside$/.test(pathname)) return 'outside'
  if (/^\/boards\/[^/]+$/.test(pathname)) return 'detail'
  if (pathname === '/my') return 'my'
  if (pathname === '/my/activity') return 'activity'
  if (pathname === '/my/edit') return 'profile-edit'
  if (pathname === '/my/settings') return 'settings'
  if (pathname === '/alerts') return 'alerts'
  if (pathname === '/admin') return 'admin'
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
    category: '/boards/new/category',
    create: '/boards/new',
    edit: `/boards/${encodedBoardId}/edit`,
    my: '/my',
    activity: '/my/activity',
    alerts: '/alerts',
    'profile-edit': '/my/edit',
    settings: '/my/settings',
    outside: `/boards/${encodedBoardId}/outside`,
    admin: '/admin',
  }
  return paths[screen]
}

export function boardIdFromPath(pathname: string) {
  const match = pathname.match(/^\/boards\/([^/]+)(?:\/(?:edit|outside))?$/)
  if (!match || match[1] === 'new') return undefined
  return decodeURIComponent(match[1])
}
