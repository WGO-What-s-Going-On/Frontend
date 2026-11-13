export interface NearbySubscription {
  featureEnabled: boolean
  enabled: boolean
  locationConsent: boolean
  expiresAt: string | null
  radiusM: number
}
export interface NearbyLocation { latitude: number; longitude: number; capturedAt: string }
export interface NearbyState { subscription: NearbySubscription | null; busy: boolean; error: boolean }
interface Dependencies {
  get: () => Promise<NearbySubscription>
  save: (location: NearbyLocation) => Promise<NearbySubscription>
  remove: () => Promise<void>
  locate: () => Promise<NearbyLocation>
  now: () => number
  changed: (state: NearbyState) => void
}

// Server consent is authoritative. A category preference or ordinary Map location never creates consent.
export class NearbySubscriptionSession {
  private deps: Dependencies
  private state: NearbyState = { subscription: null, busy: false, error: false }
  private wanted = false
  private epoch = 0
  private disposed = false
  private pending: Promise<unknown> = Promise.resolve()
  constructor(deps: Dependencies) { this.deps = deps }
  private publish(change: Partial<NearbyState>) {
    this.state = { ...this.state, ...change }
    if (!this.disposed) this.deps.changed(this.state)
  }
  async start() {
    const epoch = this.epoch
    try {
      const subscription = await this.deps.get()
      if (this.disposed || epoch !== this.epoch) return
      const current = subscription.enabled && subscription.locationConsent && Date.parse(subscription.expiresAt ?? '') > this.deps.now()
      this.wanted = subscription.featureEnabled && current
      this.publish({ subscription: subscription.enabled && !current ? { ...subscription, enabled: false, locationConsent: false, expiresAt: null } : subscription, error: false })
    } catch { this.publish({ error: true }) }
  }
  async enable(locationConsent: boolean) {
    if (!locationConsent || this.disposed || !this.state.subscription?.featureEnabled || this.state.busy) return
    this.wanted = true
    await this.saveLocation(++this.epoch)
  }
  async tick() {
    const subscription = this.state.subscription
    if (this.disposed || !this.wanted || !subscription?.enabled || this.state.busy) return
    const remaining = Date.parse(subscription.expiresAt ?? '') - this.deps.now()
    if (!(remaining > 0)) {
      this.wanted = false
      this.publish({ subscription: { ...subscription, enabled: false, locationConsent: false, expiresAt: null } })
      return
    }
    if (remaining <= 300_000) await this.saveLocation(this.epoch, Date.parse(subscription.expiresAt!))
  }
  private canSave(epoch: number, deadline: number) {
    if (this.disposed || !this.wanted || epoch !== this.epoch) return false
    if (this.deps.now() < deadline) return true
    this.wanted = false
    if (this.state.subscription) this.publish({ subscription: { ...this.state.subscription, enabled: false, locationConsent: false, expiresAt: null } })
    return false
  }
  private async saveLocation(epoch: number, deadline = Infinity) {
    this.publish({ busy: true, error: false })
    try {
      const location = await this.deps.locate()
      if (!this.canSave(epoch, deadline)) return
      // Serializing save and revoke ensures a late PUT cannot resurrect withdrawn consent.
      const task = this.pending.catch(() => undefined).then(() => {
        if (!this.canSave(epoch, deadline)) return null
        return this.deps.save(location)
      })
      this.pending = task
      const subscription = await task
      if (subscription && !this.disposed && epoch === this.epoch) this.publish({ subscription })
    } catch {
      if (epoch === this.epoch) this.publish({ error: true })
    } finally {
      if (epoch === this.epoch) this.publish({ busy: false })
    }
  }
  async revoke() {
    this.wanted = false
    const epoch = ++this.epoch
    this.publish({ busy: true, error: false })
    const task = this.pending.catch(() => undefined).then(() => this.deps.remove())
    this.pending = task
    try {
      await task
      if (epoch === this.epoch && this.state.subscription) this.publish({ subscription: { ...this.state.subscription, enabled: false, locationConsent: false, expiresAt: null } })
    } catch { this.publish({ error: true }); throw new Error('Nearby consent withdrawal failed') }
    finally { if (epoch === this.epoch) this.publish({ busy: false }) }
  }
  dispose() { this.disposed = true; this.wanted = false; this.epoch++ }
}
