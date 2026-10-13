import { useApp } from '../../context/AppContext'

// 게시글 표시 방식 선택 (USR-F08): 닉네임 또는 익명
export function AuthorToggle({ anonymous, onChange }: { anonymous: boolean; onChange: (anonymous: boolean) => void }) {
  const { user } = useApp()
  return <div className="author-toggle" role="radiogroup" aria-label="작성자 표시">
    <button role="radio" aria-checked={!anonymous} className={!anonymous ? 'selected' : ''} onClick={() => onChange(false)}>{user.nickname}</button>
    <button role="radio" aria-checked={anonymous} className={anonymous ? 'selected' : ''} onClick={() => onChange(true)}>익명</button>
  </div>
}
