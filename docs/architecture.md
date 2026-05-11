# Architecture

## Current shape

这个仓库目前是一个非常轻量的原型架构。

### Files

- `index.html`
  - 单页应用的 DOM 结构和主要文案
- `styles.css`
  - 页面样式
- `app.js`
  - 前端主控制器
  - 同时承担状态管理、事件绑定、渲染、指标计算、sync 客户端逻辑
- `server.js`
  - Node 静态文件服务
  - 提供 `GET /api/sync` 与 `POST /api/backup`
  - 负责写入 `ledger-data.json`
- `sw.js`
  - service worker
  - 提供离线缓存能力
- `README.md`
  - 运行方式与基本说明

## Runtime model

### Browser side

浏览器端是主使用环境。
主要职责：
- 保存本地账本
- 渲染 UI
- 计算统计指标
- 调用电脑上的 Node 服务
- 执行 backup / restore 决策

### Server side

`server.js` 不是后端业务系统，只是一个很小的本地辅助服务。
主要职责：
- 提供静态页面
- 暴露 `GET /api/sync` 和 `POST /api/backup`
- 维护电脑上的快照文件

注意：
- restore 不是服务端 API 能力
- restore 是浏览器读取 `/api/sync` 后覆盖本地数据的客户端行为

### Offline layer

`sw.js` 提供 app shell 缓存。
它的职责应该是：
- 让页面在离线时还能打开
- 不缓存会影响数据正确性的 `/api/*` 请求

## Current coupling issues

### 1. `app.js` 过于集中

`app.js` 当前同时处理：
- data model
- localStorage
- sync 决策
- render
- DOM 事件
- service worker 注册

这让任何行为变更都很容易跨多个责任层。

### 2. UI copy 和行为强耦合

很多业务定义目前直接体现在页面文案里。
如果代码语义变化而文案不改，用户就会被误导。

### 3. Sync contract 主要埋在代码里

backup / restore / auto-backup 的语义现在主要从 `app.js` 和 `server.js` 推断，不够显式。

### 4. Service worker 影响数据请求

如果缓存策略太宽，会影响 `/api/sync` 这类数据请求，导致 stale data 问题。

## Intended near-term architecture

近期不引入重型框架，先做轻量责任分离。
第一目标不是“搭漂亮目录”，而是把高风险语义从代码里抬到 spec，并把关键逻辑变得可验证。

更现实的路径是：
1. 先补 spec
2. 先修语义和同步安全
3. 再抽纯函数
4. 必要时再拆文件

如果后续需要拆分，优先顺序应是：
- 先抽 metrics / sync comparison 这类纯函数
- 再抽 localStorage 和 fetch 辅助函数
- 最后才考虑 DOM wiring 与模块边界

## Refactor principles

1. 先确定行为，再移动代码。
2. 优先抽纯函数，再拆文件。
3. 对这个仓库，最小有用重构比漂亮分层更重要。
4. 任何 sync / storage / offline 改动都必须手动验证。
