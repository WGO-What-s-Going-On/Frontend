// 개인정보가 들어 있을 수 있는 글을 올리기 전에 알려준다 (MOD-F05).
// 실제 탐지는 백엔드(MOD-F04)가 하고, 여기서는 흔한 패턴만 미리 걸러 사용자에게 한 번 더 확인받는다.
const patterns: { label: string; pattern: RegExp }[] = [
  { label: '전화번호', pattern: /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/ },
  { label: '주민등록번호', pattern: /\d{6}[-\s]?[1-4]\d{6}/ },
  { label: '차량번호', pattern: /\d{2,3}\s?[가-힣]\s?\d{4}/ },
  { label: '상세 주소', pattern: /\d+\s?동\s?\d+\s?호|[가-힣]+(?:로|길)\s?\d+(?:-\d+)?/ },
]

export function findPersonalInfo(text: string) {
  return patterns.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
}
