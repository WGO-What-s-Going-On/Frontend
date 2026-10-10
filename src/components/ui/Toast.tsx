// 화면 하단에 잠깐 떠서 결과를 알려주는 안내. 스크린리더도 읽도록 role="status"
export function Toast({ message }: { message: string }) {
  if (!message) return null
  return <div className="toast" role="status">{message}</div>
}
