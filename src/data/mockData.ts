import type { Board, Comment, Notice, User } from '../types/domain'

export const initialUser: User = {
  id: 'me',
  nickname: '이현정',
  age: 24,
  bio: '현장 인증 활동 회원 · 안전 가이드 준수',
}

export const initialBoards: Board[] = [
  {
    id: 'fire', authorId: 'user-1', authorName: '익명탐정', category: '긴급 사고',
    title: '동네에 불 났어! 어디 대피해야 돼?', body: '강남역 4번 출구 앞에서 연기가 보여요. 주변 분들은 우회해주세요.',
    distance: 24, createdAt: '2분 전', status: '실시간', views: 142,
    reactions: { '저도 궁금해요': 18, '지금도 그래요': 32, '도움 됐어요': 12, '이제 끝났어요': 3 },
  },
  {
    id: 'mask', authorId: 'me', authorName: '이현정', category: '동네 소식',
    title: '마스크 나눔 오후 3시 집 앞에서 해요!', body: '남는 보건용 마스크를 경비실 앞에 두고 갑니다.',
    distance: 80, createdAt: '15분 전', status: '실시간', views: 67,
    reactions: { '저도 궁금해요': 7, '지금도 그래요': 14, '도움 됐어요': 21, '이제 끝났어요': 2 },
  },
  {
    id: 'outage', authorId: 'user-2', authorName: '현장지킴이', category: '일상 불편',
    title: '정전이야! 1시간 넘는데 복구 될까?', body: '혹시 아파트 전체 정전인가요? 상황 공유 부탁드려요.',
    distance: 140, createdAt: '30분 전', status: '실시간', views: 88,
    reactions: { '저도 궁금해요': 12, '지금도 그래요': 23, '도움 됐어요': 8, '이제 끝났어요': 1 },
  },
]

export const initialComments: Comment[] = [
  {
    id: 'comment-1', boardId: 'fire', authorId: 'user-3', authorName: '익명탐정',
    body: '오늘 GV 이벤트가 있어서 줄이 생긴 것 같아요.', createdAt: '2분 전', verified: false,
    reactions: { '도움돼요': 12, '맞아요': 5, '정보가 달라요': 1 },
  },
  {
    id: 'comment-2', boardId: 'fire', authorId: 'user-4', authorName: '현장확인자',
    body: '맞아요. 직원분이 7시 입장이라고 안내했어요.', createdAt: '방금 전', verified: true,
    reactions: { '도움돼요': 4, '맞아요': 18, '정보가 달라요': 0 },
  },
  {
    id: 'outage-comment-1', boardId: 'outage', authorId: 'user-5', authorName: '101동 주민',
    body: '101동부터 104동까지 모두 정전된 것 같아요.', createdAt: '28분 전', verified: true,
    reactions: { '도움돼요': 9, '맞아요': 14, '정보가 달라요': 0 }, imageUrl: '/mock/outage-building.svg',
  },
  {
    id: 'outage-comment-2', boardId: 'outage', authorId: 'user-6', authorName: '현장지킴이',
    body: '관리사무소에서 복구 업체가 이동 중이라고 안내했습니다.', createdAt: '24분 전', verified: true,
    reactions: { '도움돼요': 18, '맞아요': 7, '정보가 달라요': 0 },
  },
  {
    id: 'outage-comment-3', boardId: 'outage', authorId: 'user-7', authorName: '상가 이용자',
    body: '맞은편 상가도 일부 조명이 꺼져 있습니다.', createdAt: '20분 전', verified: false,
    reactions: { '도움돼요': 6, '맞아요': 3, '정보가 달라요': 1 }, imageUrl: '/mock/outage-street.svg',
  },
  {
    id: 'outage-comment-4', boardId: 'outage', authorId: 'user-8', authorName: '103동 주민',
    body: '엘리베이터는 운행이 중단돼서 계단을 이용하고 있어요.', createdAt: '15분 전', verified: true,
    reactions: { '도움돼요': 12, '맞아요': 8, '정보가 달라요': 0 },
  },
  {
    id: 'outage-comment-5', boardId: 'outage', authorId: 'user-9', authorName: '동네주민',
    body: '방금 관리사무소 방송으로 30분 내 복구 예정이라고 들었습니다.', createdAt: '8분 전', verified: false,
    reactions: { '도움돼요': 15, '맞아요': 4, '정보가 달라요': 2 },
  },
  {
    id: 'outage-comment-6', boardId: 'outage', authorId: 'user-10', authorName: '현장확인자',
    body: '현재 일부 동부터 조명이 다시 들어오고 있습니다.', createdAt: '3분 전', verified: true,
    reactions: { '도움돼요': 21, '맞아요': 11, '정보가 달라요': 0 },
  },
]

export const initialNotices: Notice[] = [
  { id: 'notice-1', type: 'nearby', text: '내 주변 150m 이내에 새 게시판이 생성되었어요.', createdAt: '3분 전', read: false, boardId: 'fire' },
  { id: 'notice-2', type: 'reply', text: '회원님의 댓글에 답글이 달렸어요.', createdAt: '15분 전', read: false, boardId: 'fire' },
  { id: 'notice-3', type: 'reaction', text: '회원님의 댓글에 공감 3개가 달렸어요.', createdAt: '1시간 전', read: true, boardId: 'mask' },
  { id: 'notice-4', type: 'lifecycle', text: '정전 신고 게시판이 곧 종료됩니다.', createdAt: '2일 전', read: true, boardId: 'outage' },
]
