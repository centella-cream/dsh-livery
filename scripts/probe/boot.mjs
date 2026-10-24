/**
 * Boot and stop an isolated `dsh --profile web` instance.
 *
 * Mechanics (verified in docs/research/web-profile-runbook.md):
 *  - readiness = the single `dsh web: http://127.0.0.1:<port>/?token=<hex>` line
 *  - the token is only good for one `GET /` (303 + signed cookie), so the
 *    printed URL is handed to Playwright verbatim
 *  - SIGTERM is a graceful shutdown (exit 0); afterwards the port must refuse
 *    connections
 */

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertIsolatedHome, isPortClosed, oneLine, redact, sleep, tail, waitPortClosed } from './util.mjs'

const READY_PATTERN = /^dsh web: (\S+)(?:\s+\(LAN:.*\))?$/m

export class BootError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'BootError'
    this.details = details
  }
}

/** Boot the isolated web profile and wait for its authenticated URL. */
export async function bootWeb({
  bin = 'dsh',
  home,
  port = 0,
  timeoutMs = 120_000,
  logPath,
  extraArgs = [],
  extraEnv = {},
} = {}) {
  const isolated = assertIsolatedHome(home)
  if (logPath) await mkdir(path.dirname(logPath), { recursive: true })
  const args = ['--profile', 'web', '--no-open', '--port', String(port), ...extraArgs]
  const startedAt = Date.now()
  const stdout = []
  const stderr = []
  const logLines = []

  const child = spawn(bin, args, {
    env: { ...process.env, DSH_HOME: isolated, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let logWriter = null
  if (logPath) {
    const { createWriteStream } = await import('node:fs')
    logWriter = createWriteStream(logPath, { flags: 'w' })
  }
  const writeLog = (text) => {
    logLines.push(text)
    logWriter?.write(text)
  }

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString('utf8')
    stdout.push(text)
    writeLog(text)
  })
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString('utf8')
    stderr.push(text)
    writeLog(`[stderr] ${text}`)
  })

  let exited = null
  const exitPromise = new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      exited = { code, signal, at: Date.now() }
      resolve(exited)
    })
    child.on('error', (error) => {
      exited = { code: null, signal: null, error: String(error), at: Date.now() }
      resolve(exited)
    })
  })

  const describeFailure = async (reason) => {
    logWriter?.end()
    if (!exited) {
      child.kill('SIGTERM')
      await Promise.race([exitPromise, sleep(5_000)])
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    }
    throw new BootError(reason, {
      logPath,
      tail: tail(redact(stdout.join('') + stderr.join('')), 40),
      exit: exited,
      durationMs: Date.now() - startedAt,
    })
  }

  const deadline = Date.now() + timeoutMs
  let match = null
  while (Date.now() < deadline) {
    const text = stdout.join('')
    match = text.match(READY_PATTERN)
    if (match) break
    if (exited) await describeFailure(`dsh exited before printing a ready URL (exit=${exited.code} signal=${exited.signal})`)
    await sleep(100)
  }
  if (!match) await describeFailure(`timed out after ${timeoutMs}ms waiting for the "dsh web:" ready line`)

  const url = match[1]
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    await describeFailure(`printed ready URL is not parseable: ${oneLine(url)}`)
  }
  const token = parsed.searchParams.get('token') ?? ''
  const portNumber = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80))
  const readyAt = Date.now()
  const readyMs = readyAt - startedAt
  logWriter?.write(`\n[harness] ready in ${readyMs}ms: ${redact(url)}\n`)

  return {
    child,
    pid: child.pid,
    args,
    url,
    baseUrl: parsed.origin,
    token,
    port: portNumber,
    readyMs,
    startedAt: new Date(startedAt).toISOString(),
    readyAt: new Date(readyAt).toISOString(),
    logPath,
    stdout: () => redact(stdout.join('')),
    stderr: () => redact(stderr.join('')),
    logText: () => redact(logLines.join('')),
    exitPromise,
    get exited() {
      return exited
    },
  }
}

/** Graceful SIGTERM shutdown with a hard SIGKILL fallback; then prove the port closed. */
export async function stopWeb(handle, { timeoutMs = 15_000 } = {}) {
  const started = Date.now()
  if (!handle?.child) return { stopped: false, detail: 'no boot handle' }
  const child = handle.child
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
  const race = await Promise.race([handle.exitPromise, sleep(timeoutMs).then(() => 'timeout')])
  let killed = false
  if (race === 'timeout' && child.exitCode === null && child.signalCode === null) {
    killed = true
    child.kill('SIGKILL')
    await Promise.race([handle.exitPromise, sleep(5_000)])
  }
  const shutdownMs = Date.now() - started
  const portCheck = await waitPortClosed(handle.port, { timeoutMs: 8_000 })
  return {
    stopped: portCheck.closed,
    exitCode: child.exitCode ?? handle.exited?.code ?? null,
    signal: child.signalCode ?? handle.exited?.signal ?? null,
    shutdownMs,
    forceKilled: killed,
    port: handle.port,
    portClosed: portCheck.closed,
    portClosedWaitedMs: portCheck.waitedMs,
    logPath: handle.logPath,
    logTail: tail(handle.logText(), 30),
  }
}

/** One-shot assertion helper: is the advertised port refusing connections now? */
export async function assertPortClosed(port) {
  return { closed: await isPortClosed(port) }
}

export { READY_PATTERN }
