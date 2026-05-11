# CLAUDE.md

## Project summary

这是一个单用户、手机优先、离线优先的轻量记账应用。
核心价值不是复杂财务系统，而是低负担记账 + 长期 FIRE 目标的正反馈。

## Agent roles

- **Claude** 是默认主编码代理，也是唯一默认写手。
- **Codex** 用于架构批判、spec 审查、diff review 和对抗式 challenge。
- 除非用户明确要求，否则不要让 Codex 在这个仓库里做开放式 coding。

## Collaboration workflow

1. Claude 起草 spec、实现方案和代码改动。
2. Codex 在关键节点做独立审查。
3. Claude 负责吸收审查意见并落地最终改动。
4. 用户负责最终拍板。

## Codex review gates

默认只保留两个强制 gate：

1. **Spec gate**
   - `docs/spec-*.md` 和协作规则首次成形后
2. **Final gate**
   - 合并前的最终 diff review

以下 gate 是条件触发，而不是每次都强制：

3. **Data-safety gate**
   - 当改动涉及 sync / restore / backup / server 数据校验时触发
4. **Refactor gate**
   - 当准备对 `app.js` 做明显结构拆分时触发

## Change rules

涉及以下内容时，必须先更新对应 spec，再改代码：
- metrics 口径
- sync / backup / restore 语义
- service worker / offline 行为
- 用户会看到的关键数据含义

## Repo-specific constraints

- 这是一个小仓库，优先做小步、可验证的改动。
- 不要无理由引入重型框架或复杂构建体系。
- 对 sync/storage 的默认策略应优先保护数据安全，而不是自动覆盖。
- UI 文案必须和实际行为一致，特别是 restore、backup、目标进度与指标名称。

## Validation expectations

- 改动 sync / restore / storage / service worker 后，必须做手动验证。
- 只靠静态代码审查不够，需要实际跑 `node server.js` 并检查浏览器行为。
- 对前端/PWA 改动，需要检查在线、离线、缓存更新三个路径。

## Visibility

- 协作进度记录在 `docs/agent-worklog.md`。
- Claude 和 Codex 的当前职责与审查节点都应在该文件同步更新。
