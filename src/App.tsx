import { useApp } from './context/AppContext'
import { LoginScreen } from './features/auth/AuthScreens'
import { LocationPermissionScreen, NicknameScreen, TermsScreen } from './features/auth/OnboardingScreens'
import { MapScreen } from './features/map/MapScreens'
import { BoardListScreen, SearchScreen, BoardDetailScreen, EditBoardScreen } from './features/board/BoardScreens'
import { NotificationScreen } from './features/notifications/NotificationScreen'
import { ProfileScreen, ActivityScreen, ProfileEditScreen, NotificationSettingsScreen } from './features/profile/ProfileScreens'
import type { Screen } from './types/domain'

const screens: Record<Screen, React.ComponentType> = {
  login: LoginScreen,
  home: MapScreen,
  board: BoardListScreen,
  search: SearchScreen,
  detail: BoardDetailScreen,
  edit: EditBoardScreen,
  my: ProfileScreen,
  activity: ActivityScreen,
  alerts: NotificationScreen,
  'profile-edit': ProfileEditScreen,
  'notification-settings': NotificationSettingsScreen,
  // 150m 밖 게시판도 같은 상세 화면을 쓰고, 화면 안에서 읽기 전용으로 바뀐다
  outside: BoardDetailScreen,
  terms: TermsScreen,
  nickname: NicknameScreen,
  'location-permission': LocationPermissionScreen,
}

export default function App() {
  const { screen } = useApp()
  const CurrentScreen = screens[screen]
  return <div className="app-bg"><CurrentScreen/></div>
}
