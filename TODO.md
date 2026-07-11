# V1 执行顺序

> 依据 `PRD.md` 的 V1 切片。change 级 checklist；每个 change 的细粒度任务见各自 `tasks.md`。
> 依赖链为严格顺序：1 → 2 → 3 → 4。

```
  ┌──────────────────────┐
  │ 1. v1-manifest       │  地基：自我描述（agent 据此构造 plan）
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │ 2. v1-config-dry-run │  吃 plan.json + dry-run 预测碰撞（agent 交互在此）
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │ 3. v1-enhance-layer  │  L2 碰撞应用（结构 keep/replace、markdown append）
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │ 4. v1-atomic-pipeline│  temp→原子 move、--force 备份、post-steps、diff 摘要
  └──────────────────────┘
```

## Checklist

- [ ] **1. `v1-manifest`** — 导出机器可读 manifest（templates / categories / options / footprint / collisionKind / driver.known）
  - 依赖：无
  - 细节：`openspec/changes/v1-manifest/tasks.md`

- [ ] **2. `v1-config-and-dry-run`** — 接收 `--config plan.json`（+ positional dir、driver env 回退、placeholders 校验），`--dry-run` 返回 resolved plan + 预测碰撞
  - 依赖：1
  - 细节：`openspec/changes/v1-config-and-dry-run/tasks.md`

- [ ] **3. `v1-enhance-layer`** — `applyEnhancements`：默认上游赢；结构 keep/replace、markdown append；策略与 collisionKind 不匹配则抛错
  - 依赖：1（collisionKind）
  - 细节：`openspec/changes/v1-enhance-layer/tasks.md`

- [ ] **4. `v1-atomic-pipeline`** — temp dir 脚手架 → enhance → 原子 move；`--force` 走 `.bak-<ts>`；post-steps best-effort（F3）；回 raw diff 摘要（G1）；全程无 TTY
  - 依赖：2, 3
  - 细节：`openspec/changes/v1-atomic-pipeline/tasks.md`

## V1 验收门槛（全部完成后回看 `PRD.md`）

- [ ] `--config plan.json --dry-run` → 解析 plan + 预测碰撞
- [ ] agent 写回碰撞决策 → `--config plan.json` 原子落地 + diff 摘要
- [ ] `eslint` 类目对模板自带 eslint 演示 keep/replace；`agents-md` 演示 append
- [ ] `driver` 字段穿透（env 回退）
- [ ] 任一步失败 → target 不存在（原子）；`--force` → `.bak-<ts>`

## 范围外（V1 不做，见 `PRD.md` 里程碑路线）

- (I) 包装任何 `create-*`（M2）
- specify / Python / 混合运行时（M3）
- `spec-tracking`、`git` 类目（M2 起）
- registry/插件、saliency 提示（按需）
