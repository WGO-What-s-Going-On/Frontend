import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Megaphone, Mic, SatelliteDish, Telescope } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Avatar } from '../../components/ui/Avatar'
import { NoticeBell } from '../../components/ui/NoticeBell'
import { ErrorState } from '../../components/ui/ErrorState'
import { RowSkeleton } from '../../components/ui/Skeleton'
import { useApp } from '../../context/AppContext'
import { getUserProfileImageUrl } from '../../api/profileImage'
import { SolidLock } from '../board/FeedItem'
import { PICK_SCORE, levelIndex, levelProgress, levelStats, levels, myRegion, rankRegions, regionRanks, scoreOf } from './levels'
import type { LevelStats } from './levels'
import type { RankingView } from '../../context/useServerSync'

// 칭호마다 하나씩: 소식통(확성기) · 리포터(마이크) · 특파원(현장 중계 안테나) · 천리안(멀리 보는 망원경)
const levelIcons = [Megaphone, Mic, SatelliteDish, Telescope]

function LevelEmblem({ index, size = 'small', locked = false }: { index: number; size?: 'small' | 'large'; locked?: boolean }) {
  // 잠긴 단계도 칭호 아이콘은 회색으로 보여주고, 잠김은 오른쪽 자물쇠로 표시한다
  const Icon = levelIcons[index]
  return <span className={`level-emblem ${size} ${locked ? 'locked' : ''}`} aria-hidden="true"><Icon size={size === 'large' ? 30 : 17} strokeWidth={2.2}/></span>
}

function BadgePanel({ stats }: { stats: LevelStats }) {
  const current = levelIndex(stats)
  const progress = levelProgress(stats)
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
    {/* 내 활동 기록: 칭호를 계산하는 숫자 그대로 (서버 연동 중에는 서버가 센 값). 화면이 길면 아래(작성 버튼 위)로 내려간다 */}
    <section className="level-stats" aria-label="내 활동 기록">
      <h4>내 활동 기록</h4>
      <dl>
        <div><dt>게시판 참여</dt><dd>{stats.participation}<small>회</small></dd></div>
        <div><dt>받은 '맞아요'</dt><dd>{stats.agreeReceived}<small>개</small></dd></div>
        <div><dt>대표 의견</dt><dd>{stats.picks}<small>회</small></dd></div>
      </dl>
    </section>
    {/* 활동 기록과 작성 버튼 사이 여백: 화면이 낮으면 이것부터 줄어든다 */}
    <div className="level-bottom-gap" aria-hidden="true"/>
  </>
}

// 랭킹 표: 1등은 맨 위 가운데, 2 · 3등은 그 아래 한 줄에 나란히 크게 보여 주고 4등부터는 목록
interface RankEntry { rank: number; userId?: number; name: string; picks: number; score: number; me: boolean }

// 랭킹 프로필 사진: 서버 연동 중이면 그 사람이 올린 사진, 나는 내 사진, 없으면 이름 첫 글자
function RankAvatar({ entry, size }: { entry: RankEntry; size: number }) {
  const { profileImageUrl } = useApp()
  const [photo, setPhoto] = useState<string | null>(null)
  useEffect(() => {
    if (entry.me || entry.userId === undefined) return
    let active = true
    getUserProfileImageUrl(entry.userId).then((url) => { if (active) setPhoto(url) })
    return () => { active = false }
  }, [entry.userId, entry.me])
  return <Avatar src={(entry.me ? profileImageUrl : photo) ?? undefined} name={entry.name} size={size}/>
}

function RankBoard({ entries }: { entries: RankEntry[] }) {
  const [first, second, third] = entries
  const rest = entries.slice(3)
  const podium = (entry: RankEntry | undefined, place: 1 | 2 | 3) => entry && <div className={`rank-podium-card place-${place} ${entry.me ? 'me' : ''}`}>
    <b className="rank-podium-place">{entry.rank}</b>
    <RankAvatar entry={entry} size={place === 1 ? 64 : 48}/>
    <strong>{entry.name}</strong>
    <span className="rank-score">{entry.score}점</span>
    <small>대표 의견 {entry.picks}회</small>
  </div>
  return <>
    {first && <div className="rank-podium">
      {podium(first, 1)}
      {second && <div className="rank-podium-row">{podium(second, 2)}{podium(third, 3)}</div>}
    </div>}
    {rest.length > 0 && <ol className="rank-list" start={4}>{rest.map((entry) => <li key={`${entry.rank}-${entry.name}`} className={entry.me ? 'me' : ''}>
      <b>{entry.rank}</b>
      <RankAvatar entry={entry} size={36}/>
      <span className="rank-name"><strong>{entry.name}</strong><small>대표 의견 {entry.picks}회</small></span>
      <span className="rank-score">{entry.score}점</span>
    </li>)}</ol>}
  </>
}

// 서버 연동 중: 내 행정동 랭킹 (서버가 위치로 동을 정한다)
function ServerRankPanel({ stats }: { stats: LevelStats }) {
  const { loadRanking } = useApp()
  const [ranking, setRanking] = useState<RankingView | null>(null)
  const [failed, setFailed] = useState(false)
  const load = () => { setFailed(false); loadRanking().then(setRanking).catch(() => setFailed(true)) }
  useEffect(load, [])
  const current = levelIndex(stats)
  const seer = current === levels.length - 1
  if (failed) return <ErrorState onRetry={load}/>
  if (!ranking) return <div className="rank-list">{[0, 1, 2].map((key) => <RowSkeleton key={key}/>)}</div>
  return <>
    <div className="ux-filter-row rank-regions"><div className="ux-category-filters"><button className="selected">{ranking.regionName}</button></div></div>
    <div className="rank-me">{seer && ranking.myRank
      ? <><strong>내 순위 {ranking.myRank}위</strong><span className="rank-score">{ranking.myScore}점</span></>
      : <><SolidLock size={20} label="잠김"/><span><strong>천리안이 되면 랭킹에 올라요</strong><small>현재 Lv.{current + 1} {levels[current].name}</small></span></>}</div>
    <RankBoard entries={ranking.items.map((entry) => ({ rank: entry.rank, userId: entry.userId, name: entry.name, picks: entry.picks, score: entry.score, me: Boolean(entry.me) }))}/>
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
    <RankBoard entries={entries.map((entry, index) => ({ rank: index + 1, name: entry.name, picks: entry.picks, score: entry.picks * PICK_SCORE, me: 'me' in entry }))}/>
  </>
}

// 하단 탭 '활동': 칭호(뱃지)와 지역 랭킹. 위 탭으로 나눠 본다
export function LevelScreen() {
  const { user, boards, comments, live, serverLevel } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'rank' ? 'rank' : 'badge'
  // 서버 연동 중이면 서버가 센 칭호 점수, 아니면 목업 글 · 댓글로 센다
  const stats = live && serverLevel ? serverLevel : levelStats(boards, comments, user.id)
  return <AppShell contentClassName="ux-board-screen level-screen">
    <header className="ux-board-header"><h1>활동</h1><NoticeBell/></header>
    <div className="level-tabs" role="tablist" aria-label="활동 보기">{([['badge', '칭호'], ['rank', '랭킹']] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? 'selected' : ''} onClick={() => setSearchParams(value === 'rank' ? { tab: 'rank' } : {}, { replace: true })}>{label}</button>)}</div>
    {tab === 'badge' ? <BadgePanel stats={stats}/> : live ? <ServerRankPanel stats={stats}/> : <RankPanel stats={stats}/>}
  </AppShell>
}
