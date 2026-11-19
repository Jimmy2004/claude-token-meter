# token-meter

**简体中文** | [English](README.en.md)

一个**非侵入式**的状态栏，适用于 Claude Code 和 Claude 桌面版（Code 标签页）。
它使用 Claude 官方的插件（"mod"）API —— 不修改 `app.asar`，不关闭 Electron fuses，也不需要重新签名。

它会在输入框正上方显示一行信息：

```
ctx 90.3k/1.0M (9%) │ ↑962.6k ↓2.8k │ last 53 tok/s · avg 53 │ 5h 3% · wk 20% │ turn US$0.042 · total US$1.23
```

| 字段 | 含义 |
|---|---|
| `ctx 已用/窗口 (%)` | 实时上下文窗口占用。< 50% 绿色，50–80% 黄色，> 80% 红色 |
| `↑ ↓` | 本会话累计的输入 token（含缓存读/写）和输出 token |
| `last N tok/s · avg N` | 上一轮的输出 token ÷ 模型请求耗时（不含工具执行时间，含首 token 延迟），以及整个会话的平均值 |
| `5h / wk` | 速率限制用量，仅订阅账户显示 |
| `turn / total US$` | 上一轮和整个会话的费用（与 `/cost` 使用同一账本；订阅账户显示的是按 API 价格折算的等价金额，并非实际扣费）。若宿主未记录费用则隐藏 |

## 安装（适用于人类和 AI agent）

需要支持插件的 Claude Code / Claude 桌面版。任选一种方式。

**A. 命令行（同样适用于桌面版，因为它们共用 `~/.claude`）：**

```bash
claude plugin marketplace add Jimmy2004/claude-token-meter
claude plugin install token-meter@token-meter-marketplace --scope user
```

**B. 在终端会话中输入：**

```
/plugin install token-meter --marketplace Jimmy2004/claude-token-meter
```

**C. 桌面版界面：** 点击输入框旁的 `+` → Plugins → Add marketplace → 输入 `Jimmy2004/claude-token-meter` → 添加插件 `token-meter`。

用户范围（user scope）意味着每次启动 Claude 时自动加载，退出 Claude 时随之卸载。安装后请开启一个**新会话**（或运行 `/reload-plugins`）。状态栏会出现在输入框上方；`last tok/s` 和 `turn` 费用会在第一轮对话完成后显示。

### 验证

```bash
claude plugin list | grep -A4 token-meter     # 预期输出：Status: enabled
```

然后发送一条消息：状态栏应显示 `last N tok/s`。

### 更新 / 卸载

```bash
claude plugin update token-meter@token-meter-marketplace
claude plugin uninstall token-meter@token-meter-marketplace
```

## 给 AI agent 的说明

- 入口文件：`hooks/register.tsx`（在 `hooks/hooks.json` 中声明）。状态约定：`types/index.d.ts`。
- 使用的 hook：`turn.start`、`turn.step`（流式；为每次模型请求计时）、`turn.complete`，以及挂在 `AbovePrompt` 组件上的 `ui.render` hook。数据来自 `$.session.usage()`（上下文、速率限制、费用）。
- 如需自定义显示字段，修改 `hooks/register.tsx` 底部的 JSX。如果 `Stats` 的结构发生变化，请更新 atom 的 `shape` 标签（`'stats-2'`），以丢弃旧的存储值。
- 校验 / 类型检查：`claude plugin validate <folder>`；`tsc -p <folder> --noEmit`（mod 加载后引擎会写入 `.claude-plugin/types/`）。
- `AbovePrompt` 仅在终端和桌面端界面中绘制。
- 无网络访问，不涉及任何密钥，不会在 Claude 自身状态目录之外写入文件。

## 许可证

MIT
