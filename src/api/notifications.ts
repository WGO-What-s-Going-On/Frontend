import { api } from './client'

export interface NotificationResponse {
  notificationId: string
  type: string
  title: string
  body: string
  targetType?: string
  targetId: string | null
  actionPath?: string
  count?: number
  isRead: boolean
  createdAt: string
}
export interface NotificationSettingsResponse { nearby: boolean; replies: boolean; reactions: boolean; lifecycle: boolean }

export const getNotifications = (cursor?: string) => api<{ items: NotificationResponse[]; nextCursor?: string | null }>('GET', '/api/v1/notifications', { query: { limit: 20, cursor } })
export const getUnreadCount = () => api<{ count: number }>('GET', '/api/v1/notifications/unread-count')
export const markNotificationRead = (notificationId: string) => api<unknown>('PATCH', `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`)
export const deleteNotification = (notificationId: string) => api<void>('DELETE', `/api/v1/notifications/${encodeURIComponent(notificationId)}`)
// 전체 읽음: 요청당 100개씩, nextCursor가 없을 때까지 반복
export async function markAllNotificationsRead() {
  let cursor: string | undefined
  do {
    const page = await api<{ processed: number; nextCursor: string | null }>('PATCH', '/api/v1/notifications/read-all', { query: { cursor } })
    cursor = page.nextCursor ?? undefined
  } while (cursor)
}
export const getNotificationSettings = () => api<NotificationSettingsResponse>('GET', '/api/v1/notifications/settings')
export const updateNotificationSettings = (settings: Partial<NotificationSettingsResponse>) => api<NotificationSettingsResponse>('PATCH', '/api/v1/notifications/settings', { body: settings })
export const getBoardNotification = (postId: string) => api<{ postId: string; enabled: boolean }>('GET', `/api/v1/notifications/boards/${encodeURIComponent(postId)}`)
export const setBoardNotification = (postId: string, enabled: boolean) => api<{ postId: string; enabled: boolean }>('PUT', `/api/v1/notifications/boards/${encodeURIComponent(postId)}`, { body: { enabled } })
