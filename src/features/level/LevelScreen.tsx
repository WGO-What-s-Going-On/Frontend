import { useSearchParams } from 'react-router-dom'
import { Megaphone, Mic, SatelliteDish, Telescope } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Avatar } from '../../components/ui/Avatar'
import { NoticeBell } from '../../components/ui/NoticeBell'
import { useApp } from '../../context/AppContext'
import { SolidLock } from '../board/FeedItem'
import { PICK_SCORE, levelIndex, levelProgress, levelStats, levels, myRegion, rankRegions, regionRanks, scoreOf } from './levels'
import type { LevelStats } from './levels'

// 칭호마다 하나씩: 소식통(확성기) · 리포터(마이크) · 특파원(현장 중계 안테나) · 천리안(멀리 보는 망원경)
const levelIcons = [Megaphone, Mic, SatelliteDish, Telescope]

// 뱃지 (USR-F12): 칭호와 따로 모으는 활동 뱃지. 실제 획득 기준은 백엔드가 계산한다.
function earnedBadges({ posts, comments, likes, finished }: { posts: number; comments: number; likes: number; finished: number }) {
  return [
    { name: '첫 소식', hint: '게시판 1개 만들기', earned: posts >= 1 },
    { name: '해결사', hint: '내 게시판 1개 마무리', earned: finished >= 1 },
    { name: '탐정', hint: '댓글 하트 10개 받기', earned: likes >= 10 },
    { name: '단골 이웃', hint: '댓글 10개 쓰기', earned: comments >= 10 },
  ]
}

function LevelEmblem({ index, size = 'small', locked = false }: { index: number; size?: 'small' | 'large'; locked?: boolean }) {
  // 잠긴 단계도 칭호 아이콘은 회색으로 보여주고, 잠김은 오른쪽 자물쇠로 표시한다
  const Icon = levelIcons[index]
  return <span className={`level-emblem ${size} ${locked ? 'locked' : ''}`} aria-hidden="true"><Icon size={size === 'large' ? 30 : 17} strokeWidth={2.2}/></span>
}

function BadgePanel({ stats }: { stats: LevelStats }) {
  const { user, boards, comments } = useApp()
  const current = levelIndex(stats)
  const progress = levelProgress(stats)
  const myBoards = boards.filter((board) => board.authorId === user.id)
  const myComments = comments.filter((comment) => comment.authorId === user.id)
  const badges = earnedBadges({ posts: myBoards.length, comments: myComments.length, likes: myComments.reduce((sum, comment) => sum + (comment.likes ?? 0), 0), finished: myBoards.filter((board) => board.status === '종료됨').length })
  return <>
    <section className="level-hero">
      <div className="level-hero-head"><LevelEmblem index={current} size="large"/><div><small>Lv.{current + 1}</small><h2>{levels[current].name}</h2><p>{levels[current].tagline}</p></div></div>
      {progress ? <div className="level-progress">
        <div className="level-progress-head"><strong>{progress.next.name}까지 {progress.remaining}{progress.unit}</strong><span>{progress.current}/{progress.target}{progress.unit}</span></div>
        <div className="level-bar" role="progressbar" aria-valuemin={0} aria-valuemax={progress.target} aria-valuenow={progress.current} aria-label={`${progress.next.name}까지 진행`}><i style={{ width: `${progress.current / progress.target * 100}%` }}/></div>
        {progress.hint && <p>{progress.hint}</p>}
      </div> : <div className="level-progress"><div className="level-progress-head"><strong>대표 의견 점수 {scoreOf(stats)}점</strong></div><p>점수로 {myRegion} 랭킹에서 겨뤄요</p></div>}
    </section>
    <h4>칭호 단계</h4>
    <ol className="level-road">{levels.map((level, index) => {
      const state = index < current ? 'earned' : index === current ? 'current' : 'locked'
      return <li key={level.name} className={state}>
        <LevelEmblem index={index} locked={state === 'locked'}/>
        <span className="level-road-text"><strong>Lv.{index + 1} {level.name}</strong><small>{level.condition}</small></span>
        <em>{state === 'earned' ? '획득' : state === 'current' ? '현재' : <SolidLock size={16} label="잠김"/>}</em>
      </li>
    })}</ol>
    {/* 뱃지는 화면 아래쪽(작성 버튼 위)에 붙인다: 남는 세로 공간은 칭호 단계와 뱃지 사이로 */}
    <div className="level-badges">
      <h4>뱃지</h4>
      <ul className="badge-list">{badges.map((badge) => <li key={badge.name} className={badge.earned ? 'earned' : ''}><strong>{badge.name}</strong><small>{badge.earned ? '획득' : badge.hint}</small></li>)}</ul>
    </div>
  </>
}

function RankPanel({ stats }: { stats: LevelStats }) {
  const { user } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const region = rankRegions.find((item) => item === searchParams.get('region')) ?? myRegion
  const selectRegion = (next: string) => {
    const params = new URLSearchParams(searchParams)
    if (next === myRegion) params.delete('region')
    else params.set('region', next)
    setSearchParams(params, { replace: true })
  }
  const current = levelIndex(stats)
  const seer = current === levels.length - 1
  // 천리안이면 내 동네 랭킹에 나도 들어간다
  const entries = [...regionRanks[region], ...(seer && region === myRegion ? [{ name: user.nickname, picks: stats.picks, me: true }] : [])]
    .sort((a, b) => b.picks - a.picks)
  const myRank = entries.findIndex((entry) => 'me' in entry) + 1
  return <>
    <div className="ux-filter-row rank-regions"><div className="ux-category-filters">{rankRegions.map((item) => <button key={item} className={region === item ? 'selected' : ''} onClick={() => selectRegion(item)}>{item}</button>)}</div></div>
    {region === myRegion && <div className="rank-me">{seer
      ? <><strong>내 순위 {myRank}위</strong><span className="rank-score">{scoreOf(stats)}점</span></>
      : <><SolidLock size={20} label="잠김"/><span><strong>천리안이 되면 랭킹에 올라요</strong><small>현재 Lv.{current + 1} {levels[current].name}</small></span></>}</div>}
    <ol className="rank-list">{entries.map((entry, index) => <li key={entry.name} className={'me' in entry ? 'me' : ''}>
      <b className={index < 3 ? 'top' : ''}>{index + 1}</b>
      <Avatar name={entry.name} size={36}/>
      <span className="rank-name"><strong>{entry.name}</strong><small>대표 의견 {entry.picks}회</small></span>
      <span className="rank-score">{entry.picks * PICK_SCORE}점</span>
    </li>)}</ol>
  </>
}

// 하단 탭 '활동': 칭호(뱃지)와 지역 랭킹. 위 탭으로 나눠 본다
export function LevelScreen() {
  const { user, boards, comments } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'rank' ? 'rank' : 'badge'
  const stats = levelStats(boards, comments, user.id)
  return <AppShell contentClassName="ux-board-screen level-screen">
    <header className="ux-board-header"><h1>활동</h1><NoticeBell/></header>
    <div className="level-tabs" role="tablist" aria-label="활동 보기">{([['badge', '뱃지'], ['rank', '랭킹']] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? 'selected' : ''} onClick={() => setSearchParams(value === 'rank' ? { tab: 'rank' } : {}, { replace: true })}>{label}</button>)}</div>
    {tab === 'badge' ? <BadgePanel stats={stats}/> : <RankPanel stats={stats}/>}
  </AppShell>
}
