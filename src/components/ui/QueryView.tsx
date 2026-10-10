import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'

// 서버 데이터를 보여줄 때 로딩 → 에러 → 빈 상태 → 내용 순서로 알맞은 화면을 고른다.
// React Query의 useQuery 결과(isPending, isError, data, refetch)를 그대로 넘기면 된다.
export function QueryView<T>({ isPending, isError, data, refetch, isEmpty, loading, empty, children }: {
  isPending: boolean
  isError: boolean
  data: T | undefined
  refetch?: () => void
  isEmpty?: (data: T) => boolean
  loading: ReactNode
  empty: string | ReactNode
  children: (data: T) => ReactNode
}) {
  if (isPending) return <div aria-busy="true">{loading}</div>
  if (isError || data === undefined) return <ErrorState onRetry={refetch}/>
  const emptyCheck = isEmpty ?? ((value: T) => Array.isArray(value) && value.length === 0)
  if (emptyCheck(data)) return typeof empty === 'string' ? <EmptyState title={empty}/> : <>{empty}</>
  return <>{children(data)}</>
}
