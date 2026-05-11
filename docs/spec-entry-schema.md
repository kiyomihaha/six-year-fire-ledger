# Entry Schema Spec

## Goal

这份文档定义账本单条记录的 canonical schema。
后续的 sync、metrics、server 校验、restore、render 都必须基于这份定义，而不是各自猜测。

## Canonical type

```ts
type EntryType = "expense" | "income" | "saving";

type Entry = {
  id: string;
  type: EntryType;
  amount: number;
  category: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};
```

## Field requirements

### id
- required
- string
- must be unique within a ledger snapshot
- generated on create
- must remain stable for the life of the entry

### type
- required
- string
- allowed values only:
  - `expense`
  - `income`
  - `saving`

### amount
- required
- number
- must be finite
- must be greater than `0`
- must support up to 2 decimal places
- must satisfy: `0 < amount <= 9999999.99`

当前阶段不支持负数金额表达“撤销”或“退款”。
如果未来需要退款、冲正、取回存款，必须单独扩展业务模型，而不是偷偷塞进负数。

### category
- required
- string
- canonical format: `一级/二级`
- must contain exactly one `/`
- primary and secondary parts must both be non-empty after trim
- leading/trailing spaces are not allowed after normalization
- examples:
  - `餐饮/午餐`
  - `交通/地铁`
  - `FIRE/六年之约`
  - `餐饮/自定义夜宵`
- invalid examples:
  - `餐饮/`
  - `/午餐`
  - `餐饮/午餐/外卖`

如果 UI 允许自定义分类，也必须最终落成这个格式。

### note
- required field, but may be empty string
- string
- recommended max length: 100 characters
- never `null`

### createdAt
- required
- ISO8601 timestamp string with explicit timezone offset or `Z`
- must be parseable to a valid instant
- set once when entry is created
- immutable after creation

### updatedAt
- required
- ISO8601 timestamp string with explicit timezone offset or `Z`
- must be parseable to a valid instant
- initially equals `createdAt`
- must change whenever the entry is edited
- if the app has no edit feature yet, `updatedAt === createdAt` is expected for all entries
- sync comparison must compare the parsed instant, not raw string lexicographic order

非法但被宽松日期解析器勉强接受的时间字符串，不应视为合法 schema 数据。

## Timestamp semantics

### Clock trust
当前阶段使用客户端生成的时间戳。
因此：
- 时间戳可用于“同一用户设备链路里的大多数情况”比较
- 时间戳不是强一致分布式时钟
- 如果两个 entry 的 `updatedAt` 一样，不能单靠时间判断胜负

### Tie-break rule
如果后续 sync 比较遇到：
- same `id`
- same `updatedAt`
- but field content differs

则必须视为：
- `diverged`
- 不能自动认为本地或远端获胜

## Category semantics

### Primary category
- `category.split("/")[0]`

### Secondary category
- `category.split("/")[1]`
- if missing, the entry is invalid under the canonical schema

## Snapshot rules

一个合法的 ledger snapshot 必须满足：
- top-level `entries` is an array
- every entry conforms to the schema above
- no duplicate `id`

## Invalid data handling

### On client load
- malformed snapshot must not be trusted blindly
- invalid entries should not silently poison metrics

### On server backup
- invalid payload should be rejected explicitly
- “看起来差不多” 不够，必须满足 schema 才能写入快照

## Unknown fields

当前阶段允许 entry 对象带额外字段，但：
- core logic must ignore them unless explicitly adopted into the schema
- sync/validation must never require unknown fields
- sync equality / divergence comparison must compare canonical fields only:
  - `id`
  - `type`
  - `amount`
  - `category`
  - `note`
  - `createdAt`
  - `updatedAt`
- unknown fields alone must not cause `diverged`

## Versioning

当前阶段没有独立 schema version 字段。
如果未来 entry shape 发生破坏性变化，必须先引入 migration 或 schema version 机制，再调整存量数据读取逻辑。
