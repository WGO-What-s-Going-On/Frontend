import test from 'node:test'
import assert from 'node:assert/strict'
import { NearbySubscriptionSession } from '../src/features/notifications/nearbySubscription.ts'

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
function fixture({ enabled = false, featureEnabled = true } = {}) {
  let now = Date.parse('2026-11-13T00:00:00Z'), state
  const calls = []
  let subscription = { featureEnabled, enabled, locationConsent: enabled, expiresAt: enabled ? new Date(now + 900_000).toISOString() : null, radiusM: 150 }
  const deps = {
    get: async () => subscription,
    locate: async () => { calls.push('locate'); return { latitude: 0, longitude: 0, capturedAt: new Date(now).toISOString() } },
    save: async location => { calls.push(['save', location.capturedAt]); subscription = { ...subscription, enabled: true, locationConsent: true, expiresAt: new Date(now + 900_000).toISOString() }; return subscription },
    remove: async () => { calls.push('remove') }, now: () => now, changed: next => { state = next },
  }
  const session = new NearbySubscriptionSession(deps)
  return { session, deps, calls, time: ms => { now += ms }, state: () => state }
}

test('default nearby preference cannot create a location subscription or permission prompt', async () => {
  const f = fixture()
  await f.session.start()
  await f.session.tick()
  await f.session.enable(false)
  assert.deepEqual(f.calls, [])
  assert.equal(f.state().subscription.enabled, false)
})
test('disabled server feature cannot subscribe even with a checked consent box', async () => {
  const f = fixture({ featureEnabled: false })
  await f.session.start(); await f.session.enable(true)
  assert.deepEqual(f.calls, [])
})
test('explicit consent saves a fresh fix, then renews at ten minutes with a new capture', async () => {
  const f = fixture()
  await f.session.start(); await f.session.enable(true)
  f.time(540_000); await f.session.tick()
  assert.equal(f.calls.length, 2)
  f.time(60_000); await f.session.tick()
  assert.deepEqual(f.calls, ['locate', ['save', '2026-11-13T00:00:00.000Z'], 'locate', ['save', '2026-11-13T00:10:00.000Z']])
})
test('an expired subscription requires new consent instead of silently resubscribing', async () => {
  const f = fixture({ enabled: true })
  await f.session.start(); f.time(900_000); await f.session.tick(); await f.session.tick()
  assert.deepEqual(f.calls, [])
  assert.equal(f.state().subscription.enabled, false)
})
test('withdrawal while GPS is pending prevents a late save', async () => {
  const f = fixture(), gps = deferred()
  f.deps.locate = () => gps.promise
  await f.session.start()
  const enabling = f.session.enable(true)
  await f.session.revoke()
  gps.resolve({ latitude: 0, longitude: 0, capturedAt: '2026-11-13T00:00:00Z' })
  await enabling
  assert.deepEqual(f.calls, ['remove'])
  assert.equal(f.state().subscription.enabled, false)
})
test('withdrawal waits for an in-flight PUT and deletes after it completes', async () => {
  const f = fixture(), saving = deferred(), started = deferred()
  f.deps.save = async () => { f.calls.push('save-start'); started.resolve(); const result = await saving.promise; f.calls.push('save-end'); return result }
  await f.session.start()
  const enabling = f.session.enable(true)
  await started.promise
  const revoking = f.session.revoke()
  assert.equal(f.calls.includes('remove'), false)
  saving.resolve({ featureEnabled: true, enabled: true, locationConsent: true, expiresAt: '2026-11-13T00:15:00Z', radiusM: 150 })
  await Promise.all([enabling, revoking])
  assert.deepEqual(f.calls, ['locate', 'save-start', 'save-end', 'remove'])
  assert.equal(f.state().subscription.enabled, false)
})
test('location failure cannot mark consent saved and allows an explicit retry', async () => {
  const f = fixture(), locate = f.deps.locate
  f.deps.locate = async () => { throw new Error('permission denied') }
  await f.session.start(); await f.session.enable(true)
  assert.equal(f.state().subscription.enabled, false)
  assert.equal(f.state().error, true)
  assert.equal(f.state().busy, false)
  f.deps.locate = locate
  await f.session.enable(true)
  assert.equal(f.state().subscription.enabled, true)
})
test('ending a logged-in session prevents pending GPS from uploading for a new account', async () => {
  const f = fixture(), gps = deferred()
  f.deps.locate = () => gps.promise
  await f.session.start()
  const enabling = f.session.enable(true)
  f.session.dispose()
  gps.resolve({ latitude: 0, longitude: 0, capturedAt: '2026-11-13T00:00:00Z' })
  await enabling
  assert.deepEqual(f.calls, [])
})
