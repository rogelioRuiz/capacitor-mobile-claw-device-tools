#!/usr/bin/env node
/**
 * capacitor-mobile-claw-device-tools iOS Simulator E2E Test Suite
 *
 * Approach: HTTP server on localhost:8099.
 *   - iOS Simulator shares the Mac's loopback, so fetch('http://127.0.0.1:8099') works
 *   - index.html POSTs results to /__device_tools_result and /__device_tools_done
 *   - HTTP server also serves /__echo as a target for http_request tests
 *
 * Sections:
 *   1  Simulator Setup   (4 tests)
 *   2  HTTP Handshake    (1 test)
 *   3  Tier 1 Results    (25 tests)
 *   4  Tier 2 Results    (7 tests — pass/skip/fail)
 */

import { execSync } from 'child_process'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Config ───────────────────────────────────────────────────────────────────
const BUNDLE_ID    = 'io.t6x.devicetools.test'
const RUNNER_PORT  = 8099
const TOTAL_TESTS  = 32
const TIMEOUT_MS   = 180_000

// ─── Test runner state ────────────────────────────────────────────────────────
let passedTests = 0, failedTests = 0, skippedTests = 0
const testResults = []

function logSection(title) { console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`) }
function pass(name, detail) {
  passedTests++
  testResults.push({ name, status: 'PASS' })
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, error) {
  failedTests++
  testResults.push({ name, status: 'FAIL', error })
  console.log(`  ❌ ${name} — ${error}`)
}
function skip(name, reason) {
  skippedTests++
  testResults.push({ name, status: 'SKIP', error: reason })
  console.log(`  ⊘  ${name} — ${reason}`)
}

// ─── simctl helpers ──────────────────────────────────────────────────────────
function simctl(args, opts = {}) {
  return execSync(`xcrun simctl ${args}`, { encoding: 'utf8', timeout: 30000, ...opts }).trim()
}

function getBootedUDID() {
  const json = simctl('list devices booted -j')
  const data = JSON.parse(json)
  for (const devices of Object.values(data.devices)) {
    for (const d of devices) {
      if (d.state === 'Booted') return d.udid
    }
  }
  return null
}

// ─── HTTP result collector + echo endpoint ────────────────────────────────────
function startResultServer() {
  const received = new Map()

  const serverReady = new Promise((resolveServer, rejectServer) => {
    const allDonePromise = new Promise((resolveDone, rejectDone) => {

      const server = http.createServer((req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.writeHead(204)
          res.end()
          return
        }

        // /__echo — test target for http_request tests
        if (req.url === '/__echo') {
          res.setHeader('Content-Type', 'application/json')
          res.writeHead(200)
          res.end(JSON.stringify({ echo: true, message: 'device-tools-e2e' }))
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const payload = JSON.parse(body)
            if (req.url === '/__device_tools_result') {
              received.set(payload.id, payload)
              console.log(`  [app] ${payload.id}: ${payload.status}${payload.detail ? ' — ' + payload.detail : ''}${payload.error ? ' — ' + payload.error : ''}`)
              res.writeHead(200)
              res.end('ok')
            } else if (req.url === '/__device_tools_done') {
              res.writeHead(200)
              res.end('ok')
              server.close()
              resolveDone({ results: received, summary: payload })
            } else {
              res.writeHead(404)
              res.end()
            }
          } catch (e) {
            res.writeHead(400)
            res.end()
          }
        })
      })

      server.listen(RUNNER_PORT, '0.0.0.0', () => {
        resolveServer({ server, allDonePromise })
      })

      server.on('error', rejectServer)

      setTimeout(() => {
        server.close()
        rejectDone(new Error(`Timeout after ${TIMEOUT_MS / 1000}s — ${received.size}/${TOTAL_TESTS} results received`))
      }, TIMEOUT_MS)
    })
  })

  return serverReady
}

// ─── Test name maps ──────────────────────────────────────────────────────────
const TIER1_IDS = [
  'clipboard_write', 'clipboard_read',
  'device_get_info', 'device_get_id', 'device_get_battery', 'device_get_language',
  'network_status', 'app_get_info', 'app_get_state',
  'haptics_impact', 'haptics_notification', 'haptics_vibrate',
  'keep_awake', 'allow_sleep',
  'secure_storage_set', 'secure_storage_get', 'secure_storage_remove', 'secure_storage_gone',
  'preferences_set', 'preferences_get', 'preferences_remove',
  'http_request_get', 'http_request_post', 'ping_localhost',
  'tts_get_languages',
]

const TIER2_IDS = [
  'geolocation', 'speech_available', 'speech_languages',
  'barcode_supported', 'nfc_supported', 'biometric_available', 'health_available',
]

const TEST_NAMES = {
  clipboard_write:     'clipboard_write — write text to clipboard',
  clipboard_read:      'clipboard_read — read text back',
  device_get_info:     'device_get_info — platform, model, OS',
  device_get_id:       'device_get_id — unique identifier',
  device_get_battery:  'device_get_battery — level & charging',
  device_get_language: 'device_get_language — language code',
  network_status:      'network_status — connected & type',
  app_get_info:        'app_get_info — app id & version',
  app_get_state:       'app_get_state — isActive',
  haptics_impact:      'haptics_impact — medium impact',
  haptics_notification:'haptics_notification — success',
  haptics_vibrate:     'haptics_vibrate — 100ms',
  keep_awake:          'screen_keep_awake — prevent sleep',
  allow_sleep:         'screen_allow_sleep — allow sleep',
  secure_storage_set:  'secure_storage — set value',
  secure_storage_get:  'secure_storage — get value back',
  secure_storage_remove:'secure_storage — remove key',
  secure_storage_gone: 'secure_storage — verify removed',
  preferences_set:     'preferences — set value',
  preferences_get:     'preferences — get value back',
  preferences_remove:  'preferences — remove key',
  http_request_get:    'http_request — GET /__echo',
  http_request_post:   'http_request — POST /__echo',
  ping_localhost:      'ping — 127.0.0.1 reachable',
  tts_get_languages:   'tts_get_languages — list languages',
  geolocation:         'geolocation — get current position',
  speech_available:    'speech — is_available',
  speech_languages:    'speech — get_languages',
  barcode_supported:   'barcode — is_supported',
  nfc_supported:       'nfc — is_supported',
  biometric_available: 'biometric — check_biometry',
  health_available:    'health — is_available',
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n🔵 capacitor-mobile-claw-device-tools iOS Simulator E2E Test Suite\n')

  // ─── Section 1: Simulator Setup ────────────────────────────────────────────
  logSection('1 — Simulator Setup')

  // 1.1 Find booted simulator
  let udid
  try {
    udid = getBootedUDID()
    if (!udid) throw new Error('No booted simulator found')
    pass('1.1 Booted simulator found', `UDID ${udid}`)
  } catch (err) {
    fail('1.1 Booted simulator found', err.message)
    console.error('\nFatal: no booted simulator.\n')
    process.exit(1)
  }

  // 1.2 Sync web assets into Xcode project
  try {
    console.log('  → Running cap sync ios...')
    const nodePath = execSync('which node', { encoding: 'utf8' }).trim()
    const npmPath  = execSync('which npm',  { encoding: 'utf8' }).trim()
    const npxPath  = path.join(path.dirname(npmPath), 'npx')
    execSync(`${npxPath} cap sync ios`, {
      cwd: __dirname,
      encoding: 'utf8',
      timeout: 120_000,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PATH: `${path.dirname(nodePath)}:${process.env.PATH}` }
    })
    pass('1.2 cap sync ios succeeded')
  } catch (err) {
    fail('1.2 cap sync ios succeeded', (err.stderr || err.message).slice(0, 120))
    // non-fatal — continue with existing assets
  }

  // 1.3 Build for simulator
  try {
    console.log('  → Building (xcodebuild)...')
    // Use -workspace if it exists (CocoaPods), otherwise -project (SPM)
    const iosAppDir = path.join(__dirname, 'ios/App')
    const useWorkspace = fs.existsSync(path.join(iosAppDir, 'App.xcworkspace'))
    const buildTarget = useWorkspace
      ? '-workspace App.xcworkspace'
      : '-project App.xcodeproj'
    execSync(
      `xcodebuild ${buildTarget} -scheme App -sdk iphonesimulator ` +
      `-destination "platform=iOS Simulator,id=${udid}" -configuration Debug build`,
      { cwd: iosAppDir, encoding: 'utf8', timeout: 240_000,
        stdio: ['ignore', 'pipe', 'pipe'] }
    )
    pass('1.3 xcodebuild succeeded')
  } catch (err) {
    const lines = (err.stderr || err.stdout || err.message).split('\n')
    const errorLines = lines.filter(l => l.includes('error:')).slice(0, 3).join(' | ')
    fail('1.3 xcodebuild succeeded', errorLines || 'build failed')
    process.exit(1)
  }

  // 1.4 Install app
  let appPath
  try {
    // Find newest App.app by modification time (multiple DerivedData dirs may exist)
    const ddOut = execSync(
      `find ~/Library/Developer/Xcode/DerivedData -name "App.app" -path "*/Debug-iphonesimulator/*" -not -path "*PlugIns*" -maxdepth 5 2>/dev/null | xargs ls -td 2>/dev/null | head -1`,
      { encoding: 'utf8', shell: true }
    ).trim()
    appPath = ddOut
    if (!appPath) throw new Error('App.app not found in DerivedData')

    simctl(`install ${udid} "${appPath}"`)
    try { simctl(`terminate ${udid} ${BUNDLE_ID}`) } catch {}
    pass('1.4 App installed')
  } catch (err) {
    fail('1.4 App installed', err.message)
    process.exit(1)
  }

  // ─── Section 2: HTTP Handshake ────────────────────────────────────────────
  logSection('2 — HTTP Handshake')

  console.log(`  → HTTP result server listening on :${RUNNER_PORT} (includes /__echo endpoint)...`)

  const { allDonePromise } = await startResultServer()

  // Launch app now that the server is ready
  try {
    simctl(`launch ${udid} ${BUNDLE_ID}`)
    console.log(`  → App launched. Waiting for test results (up to ${TIMEOUT_MS / 1000}s)...\n`)
  } catch (err) {
    fail('2.0 App launch', err.message)
    process.exit(1)
  }

  let captureResult
  try {
    captureResult = await allDonePromise
    pass('2.1 All test results received via HTTP', `${captureResult.results.size}/${TOTAL_TESTS} results`)
  } catch (err) {
    fail('2.1 All test results received via HTTP', err.message)
    printSummary()
    process.exit(1)
  }

  // ─── Section 3: Tier 1 Results ────────────────────────────────────────────
  logSection('3 — Tier 1 Results (must all pass)')

  let num = 1
  for (const id of TIER1_IDS) {
    const name = `3.${num++} ${TEST_NAMES[id] || id}`
    const r = captureResult.results.get(id)
    if (!r) {
      fail(name, 'no result received (test did not run)')
    } else if (r.status === 'pass') {
      pass(name, r.detail || '')
    } else {
      fail(name, r.error || 'failed')
    }
  }

  // ─── Section 4: Tier 2 Results ────────────────────────────────────────────
  logSection('4 — Tier 2 Results (skip is OK)')

  num = 1
  for (const id of TIER2_IDS) {
    const name = `4.${num++} ${TEST_NAMES[id] || id}`
    const r = captureResult.results.get(id)
    if (!r) {
      skip(name, 'no result received')
    } else if (r.status === 'pass') {
      pass(name, r.detail || '')
    } else if (r.status === 'skip') {
      skip(name, r.error || 'skipped')
    } else {
      fail(name, r.error || 'failed')
    }
  }

  printSummary()
  const tier1Failed = TIER1_IDS.some(id => {
    const r = captureResult.results.get(id)
    return !r || r.status !== 'pass'
  })
  process.exit(tier1Failed ? 1 : 0)
}

function printSummary() {
  const total = passedTests + failedTests + skippedTests
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  Results: ${passedTests} passed, ${failedTests} failed, ${skippedTests} skipped (${total} total)`)
  if (failedTests > 0) {
    console.log('\n  Failed tests:')
    testResults.filter(r => r.status === 'FAIL').forEach(r => console.log(`    ❌ ${r.name} — ${r.error}`))
  }
  if (skippedTests > 0) {
    console.log('\n  Skipped tests:')
    testResults.filter(r => r.status === 'SKIP').forEach(r => console.log(`    ⊘  ${r.name} — ${r.error}`))
  }
  if (failedTests === 0) {
    console.log('  ✅ ALL TIER 1 PASS')
  }
  console.log(`${'═'.repeat(60)}\n`)
}

main().catch(err => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
