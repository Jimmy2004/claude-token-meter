export type Stats = {
  sessionIn: number
  sessionOut: number
  lastOut: number
  lastTps: number | null
  avgTps: number | null
  lastMs: number
  lastCost: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'token-meter': { stats: Shaped<Stats> }
  }
}
