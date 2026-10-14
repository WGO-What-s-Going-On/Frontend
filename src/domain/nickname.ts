// 닉네임 규칙 (USR-F05). 실제 중복·금칙어 확인은 백엔드가 하고, 목업에서는 이미 쓰이는 이름과 예시 금칙어로 확인한다.
const bannedWords = ['관리자', '운영자', '공식']

// 글자 규칙만 확인 (입력하는 동안 바로 보여줄 오류)
export function nicknameFormatError(nickname: string) {
  if (!nickname) return ''
  if (nickname.length < 2) return '2자 이상 입력해 주세요.'
  if (!/^[가-힣a-zA-Z0-9]+$/.test(nickname)) return '한글, 영문, 숫자만 쓸 수 있어요.'
  if (bannedWords.some((word) => nickname.includes(word))) return '사용할 수 없는 단어가 들어 있어요.'
  return ''
}

// 중복까지 확인
export function nicknameError(nickname: string, taken: Set<string>) {
  return nicknameFormatError(nickname) || (taken.has(nickname) ? '이미 사용 중인 닉네임이에요.' : '')
}
