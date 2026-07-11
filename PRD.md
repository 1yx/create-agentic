# create-agentic — PRD

## 论点（一句话）

把脚手架的交互移到 agent：agent 在对话里帮不懂的用户解配置 → 写成 plan → CLI 非交互、原子地执行；复用外部 `create-*` 做生成，再叠一层冲突感知的 agentic 增强。

## 决策链（根 → 叶，每节点 = 锁定决策 + 为什么）

| # | 决策 | 锁定值 | 为什么（一句话） |
|---|------|--------|------------------|
| 1 | 架构 | **B**：瘦非交互 CLI + 机器可读 manifest，外部 agent（pi/Claude/Cursor）驱动 | 不自造 LLM（A），MCP（C）留作扩展；最小 diff 于现有代码 |
| 2 | 复用模型 | **I**：spawn 外部 `create-*` 进程，统一 flag 翻译成各家原生非交互 flag | 用户明选；税是每工具一个永久追上游的 adapter |
| 3 | 覆盖 | **a**：精选 2–3，以「验证过有稳定非交互模式」为硬门槛；首批 create-vite | 起步 create-vite ✅；svelte/CRA 暂排除 |
| 4 | 增强碰撞 | **L2**：结构化配置 keep/replace，markdown/gitignore append；**默认上游赢、只补缺失，碰撞才升级** | eslint merge 是 AST 陷阱；append 够 AGENTS.md |
| 5 | 增强模型 | **M2**：分类 × 每类单选（含 none）；类目 = spec-tracking / agents-md / git / eslint | specify 用例要求「一类多选项」；schema 前向兼容 |
| 6a | 混合运行时 | 接受（OpenSpec=Node/npx，specify=Python/uv）；prereq 写进 manifest，agent 检测并叙述 | 限 Node-only 会砍 specify；容器化过度工程 |
| 6b | 驱动 agent | **升格顶层输入**；specify 的 `--integration` 默认对齐它 | specify 自带 agent 集成（含 pi），须协同非撞车 |
| 7 | agent→CLI 契约 | **C2**：单个 JSON config（plan.json）+ positional dir + `--dry-run`；身份走 config 字段（env 回退） | 15+ 嵌套字段，flags 会 churn；dry-run 返回解析 plan + 预测碰撞 |
| 8 | 叙述 | **G1**：adapter 只带 flag 翻译 + 碰撞足迹；叙述归 LLM，不手写 | driver 是 LLM，手写描述是替它干它更擅长的活 |
| 9a | 执行完整性 | scaffold+enhance 在 temp dir、碰撞按 config 策略确定性处理（**运行时不暂停，ask 只在 dry-run**）、成功才原子移到 target；post-steps（install/git/specify）best-effort 原地留 + 报告；`--force` 走 `.bak-<ts>` | 数据/状态完整性不 lazy；交互与执行彻底分离 |
| 9b | 版本 | 每 adapter 声明并调用**固定版本范围**（如 `create-next-app@^15`），config 可覆盖 | float latest 必坏 |
| 10 | MVP | **V1**：mode-B 契约叠在**现有 bundled 模板**上，**不碰 (I)** | 先证 Novel（mode B），再补 Understood（I） |

## mode B 的两份工件

### manifest（静态，随 create-agentic 发布，agent 读它知道该问什么）— V1 形态

```jsonc
{
  "version": 1,
  "driver": { "known": ["pi", "claude", "cursor", "copilot"] },
  "templates": [                       // V1: 自家 bundled
    { "name": "typescript", "source": "bundled" },
    { "name": "obsidian-plugin", "source": "bundled" }
  ],
  "categories": [
    { "name": "eslint", "options": [
        { "id": "none" },
        { "id": "agentic-baseline", "footprint": ["eslint.config.*"], "collisionKind": "structured" },
        { "id": "keep-upstream" }
    ]},
    { "name": "agents-md", "options": [
        { "id": "none" },
        { "id": "agentic", "footprint": ["AGENTS.md"], "collisionKind": "markdown-appendable" }
    ]}
    // spec-tracking、git → M2 起加；specify 选项届时带 prereq:["uv"] + 子参数 integration
  ]
  // M2 起 tools[] 带 pinnedVersion + flagTranslation + footprint
}
```

### plan.json（动态，agent 解出的选择，交 CLI）

```jsonc
{
  "driver": "pi",                       // 6b；省略时回退 env CREATE_AGENTIC_DRIVER
  "target": "./my-app",                 // positional
  "force": false,                       // true → swap 时 .bak-<ts>
  "template": "typescript",             // V1 bundled；M2 起可换 { "tool": "create-vite", "args": { ... } }
  "enhancements": {
    "eslint":    { "option": "agentic-baseline", "onCollision": "replace" },  // 结构化: keep|replace
    "agents-md": { "option": "agentic",          "onCollision": "append" }    // markdown: append
  },
  "post": { "install": true, "git": true }      // F3 best-effort
}
// --dry-run 不是字段，是模式：吃同样 config，不碰盘，回 { resolvedPlan, predictedCollisions }
```

> `footprint` 喂碰撞检测（确定性）；`collisionKind` 决定 L2 动作菜单；叙述字段**没有**（G1，LLM 现场写）。

## V1 done 标准

- [ ] `--config plan.json --dry-run` → 解析 plan + 预测碰撞
- [ ] agent 写回碰撞决策 → `--config plan.json` 原子落地 + 回 diff 摘要
- [ ] `eslint` 类目对模板自带 eslint 演示 keep/replace；`agents-md` 演示 append
- [ ] `driver` 字段穿透（env 回退）
- [ ] 任一步失败 → target 不存在（原子）；`--force` → `.bak-<ts>`

## 里程碑路线（skipped → 何时加）

- **M2**：包 create-vite（证 I）+ 加 `git` / `spec-tracking`（仅 openspec）类目；manifest 增 `tools[].pinnedVersion / flagTranslation / footprint`；typescript bundled 模板届时可由 vite 包装取代。
- **M3**：create-next-app + specify（证混合运行时、多类目、spec-tracking 双选项）；CI 测真 spawn；specify 的 pi 集成细节落地。
- **按需**：registry/插件（M3 → 开放）、saliency 提示（G1.5，仅当某工具 LLM 叙述不达标）。

## 遗留尾巴（非决策，建时再处理）

- CI 对真 spawn 的测试策略（M2 起）。
- specify `--integration pi` 的具体产物（M3）。
- typescript bundled 模板在 vite 包装落地后是否退役。
