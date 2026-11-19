# token-meter

[简体中文](README.md) | **English**

A **non-invasive** status band for Claude Code and the Claude Desktop app (Code tab).
It uses Claude's official plugin ("mod") API — no patching of `app.asar`, no disabled Electron fuses, no re-signing.

It draws one line directly above the prompt box:

```
ctx 90.3k/1.0M (9%) │ ↑962.6k ↓2.8k │ last 53 tok/s · avg 53 │ 5h 3% · wk 20% │ turn US$0.042 · total US$1.23
```

| Field | Meaning |
|---|---|
| `ctx used/window (%)` | Live context window fill. Green < 50%, yellow 50–80%, red > 80% |
| `↑ ↓` | Cumulative input (incl. cache read/write) and output tokens for the session |
| `last N tok/s · avg N` | Output tokens ÷ model-request time of the last turn (tool time excluded; time-to-first-token included), and the session average |
| `5h / wk` | Rate-limit usage, shown only on subscription accounts |
| `turn / total US$` | Cost of the last turn and of the session (same ledger as `/cost`; on a subscription it is the API-price equivalent, not a charge). Hidden if the host keeps no cost ledger |

## Install (for humans and for AI agents)

Requires Claude Code / Claude Desktop with plugin support. Pick one.

**A. Shell (works for the Desktop app too, since it shares `~/.claude`):**

```bash
claude plugin marketplace add Jimmy2004/claude-token-meter
claude plugin install token-meter@token-meter-marketplace --scope user
```

**B. Terminal session prompt:**

```
/plugin install token-meter --marketplace Jimmy2004/claude-token-meter
```

**C. Desktop app UI:** click `+` next to the prompt box → Plugins → Add marketplace → `Jimmy2004/claude-token-meter` → Add plugin `token-meter`.

User scope means it loads automatically every time Claude starts and goes away when Claude quits. Start a **new session** (or run `/reload-plugins`) after installing. The band appears above the prompt; `last tok/s` and `turn` cost fill in after the first completed turn.

### Verify

```bash
claude plugin list | grep -A4 token-meter     # expect: Status: enabled
```

Then send one message: the band should show `last N tok/s`.

### Update / uninstall

```bash
claude plugin update token-meter@token-meter-marketplace
claude plugin uninstall token-meter@token-meter-marketplace
```

## Notes for AI agents

- Entry point: `hooks/register.tsx` (declared in `hooks/hooks.json`). State contract: `types/index.d.ts`.
- Hooks used: `turn.start`, `turn.step` (streaming; times each model request), `turn.complete`, and a `ui.render` hook on the `AbovePrompt` component. Data comes from `$.session.usage()` (context, rate limits, cost).
- To customize the displayed fields, edit the JSX at the bottom of `hooks/register.tsx`. If the shape of `Stats` changes, bump the atom's `shape` tag (`'stats-2'`) so old stored values are discarded.
- Validate / type-check: `claude plugin validate <folder>`; `tsc -p <folder> --noEmit` (the engine writes `.claude-plugin/types/` once the mod has loaded).
- `AbovePrompt` is drawn on the terminal and desktop surfaces only.
- No network access, no secrets, no files written outside Claude's own state.

## License

MIT
