import type { Board } from '../../types/domain'

// 목업 지도 세계. 1 단위 = 1m. 실제 지도 SDK로 바꾸면 이 좌표 대신 위경도를 쓴다.
export const WORLD_SIZE = 2000
// 내 위치 (강남역 사거리)
export const ME = { x: 1000, y: 1000 }
export const RADIUS = 150

export interface Point { x: number; y: number }

// 처음부터 있던 목업 게시판의 위치 (저장된 예전 데이터에는 좌표가 없어서 id로 찾는다)
const knownPositions: Record<string, Point> = {
  fire: { x: 1018, y: 985 },
  mask: { x: 942, y: 1052 },
  outage: { x: 1118, y: 922 },
}

function hash(text: string) {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
}

// 게시판 위치: 저장된 좌표 → 알려진 목업 좌표 → 내 위치 근처(id로 정해지는 고정 위치) 순서
export function boardPosition(board: Board): Point {
  if (board.position) return board.position
  if (knownPositions[board.id]) return knownPositions[board.id]
  const seed = hash(board.id)
  const angle = (seed % 360) * Math.PI / 180
  const distance = 20 + (seed % 50)
  return { x: ME.x + Math.cos(angle) * distance, y: ME.y + Math.sin(angle) * distance }
}

export function distanceFromMe(point: Point) {
  return Math.round(Math.hypot(point.x - ME.x, point.y - ME.y))
}

const zeroReactions = (curious: number, still: number, helpful: number, ended: number) => ({ '저도 궁금해요': curious, '지금도 그래요': still, '도움 됐어요': helpful, '이제 끝났어요': ended })

function seedBoard(input: Omit<Board, 'distance' | 'status'> & { position: Point }): Board {
  return { ...input, status: '실시간', distance: distanceFromMe(input.position) }
}

// 지도를 움직이면 보이는 주변 동네의 게시판 (150m 밖은 열람만 가능)
export const mapSeedBoards: Board[] = [
  seedBoard({ id: 'map-tree', authorId: 'user-27', authorName: '역삼출근러', category: '긴급 사고', title: '강남대로 가로수가 쓰러졌어요', body: '바람에 가로수가 넘어져서 인도 절반을 막고 있어요. 지나갈 때 조심하세요. 구청에 신고는 해 뒀어요.', createdAt: '6분 전', views: 74, imagePlaceholder: true, reactions: zeroReactions(8, 5, 2, 0), position: { x: 1074, y: 1062 } }),
  seedBoard({ id: 'map-umbrella', authorId: 'user-21', authorName: '퇴근길', category: '도움 요청', title: '우산 빌려주실 분 계신가요?', body: '역 출구 앞인데 비가 갑자기 와요. 잠깐만 빌려주시면 바로 돌려드릴게요.', createdAt: '5분 전', views: 41, reactions: zeroReactions(4, 6, 1, 0), position: { x: 1086, y: 1176 } }),
  seedBoard({ id: 'map-construction', authorId: 'user-22', authorName: '선릉로주민', category: '일상 불편', title: '선릉로 공사로 차선 통제 중이에요', body: '2차선이 막혀 있어서 버스가 많이 밀려요. 우회하세요.', createdAt: '12분 전', views: 96, reactions: zeroReactions(6, 19, 11, 0), position: { x: 1312, y: 1148 } }),
  seedBoard({ id: 'map-dog', authorId: 'user-23', authorName: '말티즈아빠', category: '도움 요청', title: '흰색 말티즈를 찾고 있어요', body: '논현로 쪽에서 산책 중에 놓쳤어요. 빨간 목줄을 하고 있어요.', createdAt: '20분 전', views: 133, reactions: zeroReactions(22, 9, 3, 0), position: { x: 706, y: 824 } }),
  seedBoard({ id: 'map-market', authorId: 'user-24', authorName: '역삼주민센터', category: '동네 소식', title: '이번 주말 역삼동 플리마켓 열려요', body: '토요일 11시부터 주민센터 앞마당에서 열려요. 판매 신청도 받아요.', createdAt: '1시간 전', views: 58, reactions: zeroReactions(9, 2, 14, 0), position: { x: 1262, y: 702 } }),
  seedBoard({ id: 'map-crash', authorId: 'user-25', authorName: '도곡동', category: '긴급 사고', title: '교차로 접촉사고, 우회하세요', body: '도곡로 사거리에서 차량 두 대가 부딪혔어요. 다친 사람은 없어 보여요.', createdAt: '8분 전', views: 112, reactions: zeroReactions(15, 21, 6, 1), position: { x: 628, y: 1296 } }),
  seedBoard({ id: 'map-gym', authorId: 'user-26', authorName: '운동하자', category: '동네 소식', title: '저녁에 같이 운동할 사람 구해요', body: '선릉역 근처 헬스장 다니시는 분 같이 루틴 짜요.', createdAt: '3시간 전', views: 27, reactions: zeroReactions(3, 1, 2, 0), position: { x: 1452, y: 1430 } }),
]
