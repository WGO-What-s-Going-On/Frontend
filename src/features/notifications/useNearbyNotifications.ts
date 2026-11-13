import { useEffect, useRef, useState } from 'react'
import { getNearbySubscription, removeNearbySubscription, saveNearbySubscription } from '../../api/notifications'
import { NearbySubscriptionSession, type NearbyLocation, type NearbyState } from './nearbySubscription'

// This purpose requires a fresh browser fix. Development fallback coordinates are never used.
function freshLocation(): Promise<NearbyLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Location unavailable')); return }
    navigator.geolocation.getCurrentPosition(({ coords, timestamp }) => {
      if (Date.now() - timestamp > 30_000) { reject(new Error('Fresh location required')); return }
      resolve({ latitude: coords.latitude, longitude: coords.longitude, capturedAt: new Date(timestamp).toISOString() })
    }, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 })
  })
}

export function useNearbyNotifications(userId: string | null, receiveNearby: boolean) {
  const [state, setState] = useState<NearbyState>({ subscription: null, busy: false, error: false })
  const session = useRef<NearbySubscriptionSession | null>(null)
  const receiving = useRef(receiveNearby)
  receiving.current = receiveNearby
  useEffect(() => {
    setState({ subscription: null, busy: false, error: false })
    if (!userId) return
    const current = new NearbySubscriptionSession({ get: getNearbySubscription, save: saveNearbySubscription, remove: removeNearbySubscription, locate: freshLocation, now: Date.now, changed: setState })
    session.current = current
    void current.start()
    const renew = () => { if (receiving.current && document.visibilityState === 'visible') void current.tick() }
    const timer = window.setInterval(renew, 60_000)
    document.addEventListener('visibilitychange', renew)
    return () => { current.dispose(); session.current = null; window.clearInterval(timer); document.removeEventListener('visibilitychange', renew) }
  }, [userId])
  return { ...state, enable: (consent: boolean) => session.current?.enable(consent), revoke: () => session.current?.revoke() }
}
