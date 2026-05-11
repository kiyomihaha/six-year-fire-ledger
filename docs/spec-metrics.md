# Metrics Spec

## Goal

这份文档定义首页和目标页展示的关键指标含义，避免 UI 文案和计算公式漂移。
如果代码行为与本文冲突，必须先改本文，再改代码。

## Normative references

- entry 结构必须服从 `docs/spec-entry-schema.md`
- sync 行为必须服从 `docs/spec-sync-and-backup.md`

## Entry semantics

当前项目只有三类 canonical entry：

- `expense`: 支出
- `income`: 收入
- `saving`: 存入长期目标的金额

Semantic rules:
- `income` 表示新增收入
- `expense` 表示消费支出
- `saving` 表示从可支配资金中转入长期目标的金额
- `saving` 不是新增收入
- `saving` 不能同时被解释为“目标进度增加”和“本月结余增加”

## Time scope rules

除非特别说明，所有“今日 / 本月 / 今年”指标都基于 entry 的 `createdAt`。
当前阶段使用客户端本地时间解释日期边界。

Definitions:
- 今日 = 当前设备本地自然日
- 本月 = 当前设备本地自然月
- 今年 = 当前设备本地自然年

## Core goal metrics

### Saved amount

**已存入目标总额**。

Definition:
- 所有 `saving` entry 的 `amount` 总和

### Goal progress percent

Definition:
- `savedAmount / VISION_AMOUNT`

Display rule:
- UI 展示值必须 clamp 到 `0% ~ 100%`

### Remaining target amount

Definition:
- `VISION_AMOUNT - savedAmount`

Display rule:
- UI 展示值必须 clamp 到不小于 `0`

### Days left

Definition:
- 从当前时刻到目标结束时刻的剩余天数

Display rule:
- UI 展示值至少为 `1`
- 不允许显示 `0 天` 或负数天

### Daily target pace

Definition:
- `max((VISION_AMOUNT - savedAmount) / daysLeft, 0)`

Meaning:
- 如果要按期达成目标，从今天起平均每天还需要补多少目标金额

Copy rule:
- 这是目标节奏指标，不是消费预算指标
- 不得使用 `日均可花`、`还能花`、`预算富余` 这类文案

## Monthly metrics

### Monthly balance

Canonical definition:

> **本月净留存 = 本月收入 - 本月支出 - 本月存入目标金额**

Formula:
- `thisMonthIncome - thisMonthExpense - thisMonthSaving`

Meaning:
- 这是本月现金流结果
- `saving` 已经进入目标进度，因此在本月结余里必须作为流出处理

Copy rule:
- 如果 UI 继续显示“本月结余”，它必须对应这个公式
- 如果代码不使用这个公式，就不能继续叫“本月结余” 

## Analysis metrics

### 今日消费
- 今天所有 `expense` 金额之和

### 本月消费
- 当前自然月所有 `expense` 金额之和

### 今年消费
- 当前自然年所有 `expense` 金额之和

### 本月日均消费
- `本月消费 / 当月已过天数`

Display rule:
- 分母使用当前自然日日期数字，例如当月 10 号时分母是 `10`
- 至少按 `1` 处理，避免除以 `0`

### 主要花在
- 当前自然月里，一级分类消费总额最高的分类
- 并显示该分类本月消费总额

### 本月最大一笔
- 当前自然月里金额最大的单条 `expense`
- 默认显示二级分类和金额

### 最高频消费
- 当前自然月里出现次数最多的一级消费分类
- 并显示出现次数

## Category rules for metrics

- 一级分类 = `category.split("/")[0]`
- 二级分类 = `category.split("/")[1]`
- 若 entry 的 `category` 不满足 canonical schema，则该 entry 属于非法数据，不应进入正常指标计算

## Copy alignment rules

1. 如果公式表达的是目标节奏，就不要用“可花”“预算富余”这类词。
2. 如果指标是本月口径，就不要混入历史全量数据。
3. 如果 `saving` 参与目标进度，就必须明确它在“结余”中的含义。
4. UI 名称必须先服从业务定义，再服从文案好听程度。
5. 不允许同一指标在不同页面使用不同业务语义。

## Manual verification matrix

至少覆盖以下场景：
- 只有 `expense` 的月份
- `income + expense` 的月份
- 只有 `saving` 的月份
- `income + expense + saving` 的混合月份
- 跨月份历史数据
- 已达成目标后 `progress / remaining / daily pace` 的展示
