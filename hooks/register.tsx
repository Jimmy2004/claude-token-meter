import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Stats } from '../types'

const EMPTY: Stats = { sessionIn: 0, sessionOut: 0, lastOut: 0, lastTps: null, avgTps: null, lastMs: 0, lastCost: null }
const stats = atom({ plugin: 'token-meter', key: 'stats' } as const, EMPTY, { shape: 'stats-2' })

const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`

export const register: Register = on => {
  // per-turn accumulators (reset on reload; harmless)
  let turnOut = 0
  let turnMs = 0
  let outSum = 0
  let msSum = 0
  let costStart = 0

  on('turn.start', async ($, e, next) => {
    costStart = (await $.session.usage()).cost?.usd ?? 0
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const t0 = await $.clock.now()
    const r = yield* next(e)
    const dt = (await $.clock.now()) - t0
    const out = r?.usage?.output_tokens ?? 0
    if (out > 0) {
      turnOut += out
      turnMs += dt
      const u = r?.usage
      await update($, stats, s => ({
        ...s,
        sessionIn:
          s.sessionIn + (u?.input_tokens ?? 0) + (u?.cache_creation_input_tokens ?? 0) + (u?.cache_read_input_tokens ?? 0),
        sessionOut: s.sessionOut + out,
      }))
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const costNow = (await $.session.usage()).cost?.usd
    const turnCost = costNow === undefined ? null : Math.max(0, costNow - costStart)
    if (!e.agentId && turnMs > 0) {
      outSum += turnOut
      msSum += turnMs
      const tps = turnOut / (turnMs / 1000)
      await update($, stats, s => ({
        ...s,
        lastOut: turnOut,
        lastMs: turnMs,
        lastCost: turnCost,
        lastTps: tps,
        avgTps: outSum / (msSum / 1000),
      }))
    }
    turnOut = 0
    turnMs = 0
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const s = await read($, stats)
    const u = await $.session.usage()
    const c = u.context
    const pct = c.percent ?? (c.tokens !== undefined && c.window ? (c.tokens / c.window) * 100 : undefined)
    const color = pct === undefined ? undefined : pct > 80 ? 'red' : pct > 50 ? 'yellow' : 'green'
    const usd = (n: number) => `US$${n < 1 ? n.toFixed(3) : n.toFixed(2)}`
    const rl = u.rateLimits
      .map(r => `${r.kind.replace('five_hour', '5h').replace('seven_day', 'wk')} ${Math.round(r.percentUsed)}%`)
      .join(' · ')

    return (
      <Box>
        <Text color={color}>
          ctx {c.tokens !== undefined ? fmt(c.tokens) : '?'}/{fmt(c.window)}
          {pct !== undefined ? ` (${pct.toFixed(0)}%)` : ''}
        </Text>
        <Text dimColor>
          {' │ '}↑{fmt(s.sessionIn)} ↓{fmt(s.sessionOut)}
          {' │ '}last {s.lastTps === null ? '—' : `${s.lastTps.toFixed(0)} tok/s`}
          {s.avgTps === null ? '' : ` · avg ${s.avgTps.toFixed(0)}`}
          {rl ? ` │ ${rl}` : ''}
          {u.cost ? ` │ turn ${s.lastCost === null ? '—' : usd(s.lastCost)} · total ${usd(u.cost.usd)}` : ''}        </Text>
      </Box>
    )
  })
}
