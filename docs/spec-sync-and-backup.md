# Sync and Backup Spec

## Goal

本项目的 sync 不是实时多端协同，而是：
**浏览器本地账本 + 电脑上的备份快照**。

这份文档定义 backup、restore、auto-backup、状态文案和覆盖边界。
如果代码行为与本文冲突，必须先改本文，再改代码。

## Normative references

- entry 结构必须服从 `docs/spec-entry-schema.md`
- metrics 口径必须服从 `docs/spec-metrics.md`

## Product model

- **Local ledger**: 保存在当前浏览器的 `localStorage`
- **Computer snapshot**: 保存在运行 `server.js` 的电脑上的 `ledger-data.json`

本地账本是日常使用主副本。
电脑快照是备份副本，不是实时协作数据库。

当前阶段本地 `localStorage` 的 canonical 形状是：

```ts
type LocalLedgerState = {
  entries: Entry[];
};
```

Rules:
- 本地主状态只要求 `entries`
- `backedUpAt` 不是本地主状态 contract 的一部分
- restore 覆盖本地时，只需要写入 canonical local state
- 如需在未来缓存更多 sync 元数据，必须先扩展 schema/spec

## Canonical snapshot shape

```ts
type LedgerSnapshot = {
  entries: Entry[];
  backedUpAt: string | null;
};
```

Rules:
- `entries` 必须是数组
- 每个 entry 都必须满足 `docs/spec-entry-schema.md`
- snapshot 内不允许重复 `id`
- `backedUpAt` 表示这份电脑快照最后一次被服务端成功写入的时间
- `backedUpAt` 由服务端生成，不由客户端决定

## API contract

### GET /api/sync

返回当前电脑快照。

Success response:

```json
{
  "entries": [],
  "backedUpAt": "ISO timestamp or null"
}
```

Rules:
- 如果电脑上还没有备份，返回空快照
- 空快照的 canonical 形式是：

```json
{
  "entries": [],
  "backedUpAt": null
}
```

### POST /api/backup

使用客户端发送的账本 entries 覆盖电脑快照。

Request:

```json
{
  "entries": []
}
```

Success response:

```json
{
  "entries": [],
  "backedUpAt": "ISO timestamp"
}
```

Rules:
- 服务端必须先校验 payload，再决定是否写盘
- 非法 payload 必须显式拒绝，不能“尽量修一修再写进去”
- 当前阶段不要求请求体携带 `backedUpAt`

### Error response contract

当请求不满足 contract 时：
- 返回 4xx
- 返回 JSON
- 至少包含可读的 `error` 字段

Example:

```json
{
  "error": "invalid snapshot payload"
}
```

## Restore semantics

restore 是**浏览器侧动作**，不是服务端动作。

Definition:
- restore = 浏览器先读取 `GET /api/sync`
- 再用返回的电脑快照覆盖当前本地账本

Therefore:
- restore 不是 merge
- restore 不是双向同步
- restore 不是服务端上的独立“恢复接口”

如果本地存在电脑快照中没有的记录，restore 前必须明确提示“本地独有数据会被覆盖”。

## Comparison model

本项目当前阶段的 sync 本质上是：
**比较两份 snapshot，然后决定是否允许 backup、是否允许 restore、以及显示什么状态。**

比较单位是 entry `id`。
共享 `id` 的 entry 比较优先看 `updatedAt`。

Special rule:
- same `id`
- same `updatedAt`
- but field content differs

则结果必须视为 `diverged`，不能自动判定任一方胜出。

## Sync state categories

代码后续必须显式区分以下状态，而不是只返回布尔值。

### State priority

当多个描述看起来都“像是成立”时，判定优先级必须固定为：
1. `local-invalid`
2. `remote-unavailable`
3. `remote-invalid`
4. `both-empty`
5. `local-empty`
6. `remote-empty`
7. `identical`
8. `diverged`
9. `local-ahead`
10. `remote-ahead`

实现必须按这个顺序判定，保证状态互斥且结果稳定。

### `both-empty`
- local entries 为空
- remote entries 为空

### `local-empty`
- local entries 为空
- remote entries 非空
- 一旦命中，不再继续归类为 `remote-ahead`

### `remote-empty`
- remote entries 为空
- local entries 非空
- 一旦命中，不再继续归类为 `local-ahead`

### `identical`
- local 和 remote 的 canonical entry 集合完全一致
- 对每个相同 `id`，canonical fields 内容也一致

### `diverged`
只要出现以下任一情况，就属于 `diverged`：
- local 和 remote 各自都有对方没有的 entry
- 某些共享 `id` 是 local 更新更晚，另一些共享 `id` 是 remote 更新更晚
- same `id` + same `updatedAt` + canonical field content differs
- 无法安全归类为 `identical` / `local-ahead` / `remote-ahead`

### `local-ahead`
满足以下全部条件：
- remote 中的每条 entry，在 local 中都能找到同 `id`
- 对共享 `id`，local 不比 remote 更旧
- 至少存在一条 local 独有 entry，或至少存在一条 local 更新更晚的共享 entry
- remote 不存在 local 没有的 entry
- 已排除 `local-empty` / `remote-empty` / `identical` / `diverged`

### `remote-ahead`
与 `local-ahead` 对称：
- local 中的每条 entry，在 remote 中都能找到同 `id`
- 对共享 `id`，remote 不比 local 更旧
- 至少存在一条 remote 独有 entry，或至少存在一条 remote 更新更晚的共享 entry
- local 不存在 remote 没有的 entry
- 已排除 `local-empty` / `remote-empty` / `identical` / `diverged`

### `remote-unavailable`
- 网络失败
- fetch 超时
- DNS/连接失败
- 服务端返回非 2xx，导致本次无法拿到可用快照

### `remote-invalid`
- 请求成功返回 2xx
- 但响应 payload 不满足 snapshot contract

### `local-invalid`
- 本地 `localStorage` 数据无法通过 snapshot / entry 校验

Comparison rule:
- entry equality / difference 只比较 canonical fields
- unknown fields 不参与 `identical` / `diverged` / ahead-state 判定
- `updatedAt` 比较基于解析后的时间点，而不是原始字符串

## Backup rules

### Manual backup

手动“备份到电脑”只允许在以下状态直接执行：
- `remote-empty`
- `local-ahead`
- `identical`

手动 backup 在以下状态必须默认拒绝，不得静默覆盖：
- `remote-ahead`
- `diverged`
- `remote-unavailable`
- `remote-invalid`
- `local-invalid`

当前阶段没有“强制覆盖远端”的产品能力。
如果状态不安全，应用应解释原因，而不是偷偷写入。

### Auto-backup

auto-backup 只允许在以下状态执行：
- `remote-empty`
- `local-ahead`

auto-backup 不应在以下状态执行：
- `both-empty`
- `identical`
- `local-empty`
- `remote-ahead`
- `diverged`
- `remote-unavailable`
- `remote-invalid`
- `local-invalid`

## Restore rules

### Restore allowed without destructive warning
- `local-empty`
- `remote-ahead`

### Restore requires destructive warning and explicit confirmation
- `local-ahead`
- `diverged`

Warning principle:
- 只要 restore 会丢失本地独有 entry，或会用远端旧版本覆盖本地更新版本，就必须先确认

### Restore should be blocked
- `remote-empty`
- `both-empty`
- `remote-unavailable`
- `remote-invalid`
- `local-invalid`

Blocked restore 应显示可理解原因，例如：
- 电脑上还没有备份
- 当前无法连接电脑端服务
- 电脑快照格式异常，不能安全恢复
- 本地数据异常，需先处理本地数据问题

## Validation rules

### Client side
- 读取 local snapshot 时必须做基本校验
- 读取 remote snapshot 时必须做基本校验
- 非法 entry 不能静默进入 metrics 和 render 主路径

### Server side
- `POST /api/backup` 必须校验 `entries`
- snapshot 中若有重复 `id`，应视为非法 payload 并拒绝
- 不允许把同 `id` 的多条记录“自动挑一条最像正确的”写进去
- 不允许把缺字段、错类型、非法时间戳的 entry 写入快照

## User-facing status expectations

状态文案至少要让用户分清三件事：
1. 现在是网络/服务异常，还是数据冲突
2. 应用有没有自动改动任何一侧数据
3. 下一步更安全的动作是什么

禁止使用会误导用户的数据安全文案，例如：
- 在 `diverged` 时显示“已自动同步”
- 在 `remote-unavailable` 时显示“远端为空”
- 在 `remote-invalid` 时显示“恢复成功”

## Manual verification matrix

至少覆盖以下场景：
- empty local + empty remote
- local has entries + remote empty
- local empty + remote has entries
- local ahead
- remote ahead
- diverged with unique entries on both sides
- same id + same timestamp + different content
- malformed backup payload
- restore that would overwrite local-only data
- warm service worker cache + online sync request

## Non-goals

当前阶段不做：
- 多设备实时同步
- CRDT
- 复杂冲突合并
- 历史版本回滚系统
- 用户账号体系
- 强制覆盖远端的高级冲突处理界面
