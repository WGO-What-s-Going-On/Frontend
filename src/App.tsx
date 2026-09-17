import { useApp } from './context/AppContext'
import { LoginScreen } from './features/auth/AuthScreens'
import { MapScreen, OutsideRangeScreen } from './features/map/MapScreens'
import { BoardListScreen, SearchScreen, BoardDetailScreen, CategoryScreen, CreateBoardScreen, EditBoardScreen } from './features/board/BoardScreens'
import { NotificationScreen } from './features/notifications/NotificationScreen'
import { ProfileScreen, ActivityScreen, ProfileEditScreen, SettingsScreen } from './features/profile/ProfileScreens'
import { AdminScreen } from './features/admin/AdminScreen'
import type { Screen } from './types/domain'

const screens: Record<Screen, React.ComponentType> = {
  login: LoginScreen,
  home: MapScreen,
  board: BoardListScreen,
  search: SearchScreen,
  detail: BoardDetailScreen,
  category: CategoryScreen,
  create: CreateBoardScreen,
  edit: EditBoardScreen,
  my: ProfileScreen,
  activity: ActivityScreen,
  alerts: NotificationScreen,
  'profile-edit': ProfileEditScreen,
  settings: SettingsScreen,
  outside: OutsideRangeScreen,
  admin: AdminScreen,
}

export default function App() {
  const { screen } = useApp()
  const CurrentScreen = screens[screen]
  return <div className="app-bg"><CurrentScreen/></div>
}
