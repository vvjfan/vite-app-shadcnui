# AGENTS.md

本文件是本仓库的代理操作手册，适用于 Codex、GitHub Copilot、OpenCode 等编码代理。开始修改前先阅读本文件；用户当次指令优先于本文件；更靠近目标文件的 `AGENTS.md` 优先。

## 快速命令

在仓库根目录使用 **pnpm**（当前 Node 22.21 + pnpm 10）：

| 目的             | 命令                                   | 说明                                            |
| ---------------- | -------------------------------------- | ----------------------------------------------- |
| 安装依赖         | `pnpm install`                         | 只用 pnpm，不要生成 npm/yarn 锁文件             |
| 开发             | `pnpm dev`                             | Vite 开发服务器，默认 5173，以终端输出为准      |
| 类型检查         | `pnpm typecheck`                       | `tsc -b`，检查 `src/` 与 `vite.config.ts`       |
| 测试（单次）     | `pnpm test`                            | `vitest run`，交付前使用                        |
| 测试（监听）     | `pnpm test:watch`                      | `vitest`，本地开发时使用                        |
| 运行指定测试     | `pnpm exec vitest run <file>`          | 只运行某个测试文件                              |
| Lint             | `pnpm lint`                            | ESLint flat config，忽略 `dist/`                |
| 格式化改动文件   | `pnpm exec prettier --write <file...>` | 推荐，只处理本次改动                            |
| 全量格式化       | `pnpm format`                          | 会改写所有 TS/TSX，仓库存在未格式化旧文件，慎用 |
| 构建             | `pnpm build`                           | `tsc -b && vite build`，输出 `dist/`            |
| 预览构建         | `pnpm preview`                         | 本地预览 `dist/`                                |
| 添加 shadcn 组件 | `pnpm exec shadcn add <name>`          | 使用项目内固定 CLI 4.22.1                       |
| 添加 ReUI 组件   | `pnpm exec shadcn add @reui/<name>`    | 注册表已配置在 `components.json`                |

> 注意：`pnpm test` 只做转译和运行，不做类型检查；类型检查由 `pnpm typecheck`（`tsc -b`）或 `pnpm build` 负责。

提交/交付前至少运行：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

`pnpm build` 已包含 `tsc -b`（与 `pnpm typecheck` 相同），最后的 build 主要用于验证 Vite 产物。测试使用 Vitest 5：`pnpm test` 单次运行，`pnpm test:watch` 监听改动。不要声称未实际运行的测试通过。

## 技术栈

- React 19.3 + TypeScript ~6.0 + Vite 8
- pnpm 10，Node 22.12+（当前 Node 22.21；Vitest 5 与 `cn` 的要求）
- Tailwind CSS v4，CSS-first：没有 `tailwind.config.*`，不要新增
- shadcn CLI 4.22.1：`style: base-mira`、`baseColor: mist`、`rsc: false`
- 基础组件使用 Base UI (`@base-ui/react`)，变体使用 `class-variance-authority`
- 图标使用 Phosphor (`@phosphor-icons/react`)，与 `components.json` 的 `iconLibrary` 一致
- 字体使用 `@fontsource-variable/inter`；中文回退链在 `src/index.css`
- 类名合并使用 `cn` 包（`clsx` + `tailwind-merge` 的替代品），不要再引入这两个包
- 动画使用 `tw-animate-css`
- 测试使用 Vitest 5.0.5；默认 Node 环境，当前**没有** DOM 环境或 Testing Library

## 目录结构

```text
src/
├── main.tsx                   # 入口：StrictMode + ThemeProvider
├── App.tsx                    # 当前示例页，可替换为实际页面
├── index.css                  # Tailwind v4 入口、设计 token、基础样式
├── components/
│   ├── ui/                    # shadcn/ui 组件
│   ├── reui/                  # ReUI 注册表组件
│   └── theme-provider.tsx     # light/dark/system 主题，按 d 键切换
├── lib/utils.ts               # `cn` 的兼容再导出
└── assets/                    # 静态资源
components.json                # shadcn/ReUI 配置与路径别名
vite.config.ts                 # React、Tailwind 插件、@ 别名
tsconfig*.json                 # 项目引用与严格类型配置
eslint.config.js               # ESLint flat config
.prettierrc                    # 格式规则（含 Tailwind 类名排序）
```

- `@/*` 映射到 `src/*`，跨目录导入一律用 `@/...`。
- `src/components/ui/` 放 shadcn/ui 组件，`src/components/reui/` 放 ReUI 组件；不要混放。
- 新增 shadcn/ReUI 组件优先用 CLI，不要从文档整段复制；生成后检查是否符合本项目风格。CLI 可能同时修改 `src/index.css` 或新增依赖，执行后检查 diff；默认跳过已存在文件，确认后再用 `--overwrite`。
- `src/lib/utils.ts` 只做 `export { cn } from "cn"` 兼容；现有组件直接从 `"cn"` 导入 `cn`，新组件保持一致。

## 代码与样式约定

- TypeScript 严格模式，开启 `noUnusedLocals`、`noUnusedParameters`、`verbatimModuleSyntax`、`erasableSyntaxOnly`。不要使用 `enum`、`namespace`、构造函数参数属性等非可擦除语法；类型导入用 `import type`。
- 不要用 `any`、`@ts-ignore`、`@ts-expect-error` 或关闭 ESLint 规则来绕过检查。
- 使用函数组件和命名导出；除入口外不要随意增加默认导出。
- 文件名用 kebab-case（如 `theme-provider.tsx`），组件名用 PascalCase，变体名用 camelCase（如 `buttonVariants`）。
- 组件 props 用 `React.ComponentProps<"tag">` 扩展原生属性；`className` 通过 `cn` 合并且放在最后；交互组件保留 `data-slot`。
- 多态/组合组件使用 Base UI 的 `useRender` + `mergeProps`（参考 `src/components/reui/badge.tsx`）。
- 样式优先使用语义 token：`bg-background`、`text-foreground`、`text-muted-foreground`、`border-border`、`bg-primary`、`text-destructive` 等；状态色使用已有的 `success` / `info` / `warning` / `invert` 系列。不要在组件里硬编码 hex/rgb/oklch 颜色。
- Tailwind v4 的 token 定义在 `src/index.css`：`@theme inline` 负责映射，`:root` 与 `.dark` 负责取值。新增颜色/圆角/字体时三处同步，不要新增 `tailwind.config.*`。
- 深色模式是 class-based：`<html>` 上的 `light`/`dark` 由 `ThemeProvider` 管理；保留 `src/index.css` 的 `@custom-variant dark` 和 `dark:` 写法。
- 保持现有中文字体回退链（PingFang SC、Microsoft YaHei、Noto Sans CJK SC 等）；不要为了“简化”删除中文字体。
- 格式：2 空格、双引号、无分号、80 列、ES5 尾逗号、LF；Prettier 会按 Tailwind 规则排序类名。只格式化本次改动文件，避免全仓库重排。
- `src/index.css` 是手工维护的，CSS 不在 `pnpm format` 的 glob 内；改动时只动相关行，不要整文件重排。

新组件写法示例：

```tsx
import { cn } from "cn"

type NoticeProps = React.ComponentProps<"div"> & {
  tone?: "info" | "warning"
}

export function Notice({ className, tone = "info", ...props }: NoticeProps) {
  return (
    <div
      data-slot="notice"
      className={cn(
        "rounded-md border border-border bg-background p-3 text-sm",
        tone === "warning" && "bg-warning/10 text-warning-foreground",
        className
      )}
      {...props}
    />
  )
}
```

## 主题与可访问性

- `ThemeProvider` 支持 `light` / `dark` / `system`，把结果写到 `<html>` 的 class，并持久化到 `localStorage` 的 `theme` 键；在非输入框区域按 `d` 切换。改主题逻辑时保持这些行为。
- 使用原生语义元素和 Base UI 原语；交互元素要有可见的 `focus-visible` 样式、可访问名称和键盘操作。
- 不要用 `div` + `onClick` 替代按钮；不要移除 `disabled`、`aria-*` 或 `data-slot` 等现有可访问性/样式钩子。
- UI 文案可以是中文；保持中文标点和排版一致。

## 测试

- 测试文件与被测代码同目录，命名 `*.test.ts` / `*.test.tsx`；当前示例：`src/components/reui/badge.test.tsx`。
- 显式从 `vitest` 导入 `describe`、`expect`、`it`，不要依赖 `vitest/globals`。
- 默认是 Node 环境。纯逻辑测试直接导入函数；组件渲染测试优先用 `react-dom/server` 的 `renderToStaticMarkup`，无需 DOM。
- 断言行为或公开契约（渲染内容、`data-slot`、变体 class、可访问属性），避免脆弱快照和实现细节。
- 需要交互、DOM、Testing Library 或 jsdom/happy-dom 时，**先询问用户**，不要擅自新增依赖或测试环境。
- 测试必须确定性：不依赖网络、真实时间、随机数或外部状态。
- 只跑单个文件时用 `pnpm exec vitest run <file>`。

## 验证与完成标准

完成任务前：

1. `pnpm test` 通过；新增/修改的测试必须实际运行。
2. `pnpm typecheck` 通过（或 `pnpm build` 通过）。
3. `pnpm lint` 通过。
4. 只对改动文件运行 Prettier，确保格式正确。
5. 涉及 UI 时运行 `pnpm dev`，在浏览器中检查：
   - 浅色/深色主题（按 `d` 切换）都正常；
   - 窄屏和桌面宽度下布局不溢出；
   - 交互元素可用键盘聚焦和操作；
   - 浏览器控制台无新增错误/警告；
   - 中文文案和字体回退正常。
6. 最终回复说明：改了哪些文件、运行了哪些命令、结果如何、哪些内容未验证。

当前测试用 `react-dom/server` 覆盖渲染结果，不覆盖客户端交互；涉及交互的改动仍需手动验证。不要删除/跳过测试来让检查通过。

## Git 工作流

- 提交信息使用 Conventional Commits，英文、祈使句，例如 `feat: add badge variants`、`fix: correct dark mode toggle`、`docs: update agent guide`。
- 一个提交只做一件逻辑上的事；不要把格式化与行为改动混在一起。
- 除非用户明确要求，不要 `git commit`、`git push`、创建 PR 或修改远程。
- 不要改写历史、`git rebase` 用户已有提交或 `git push --force`。
- 改动前先看 `git status` / `git diff`，不要覆盖或回滚用户未提交的改动。
- `pnpm-lock.yaml` 只在依赖变化时随 `pnpm install` 更新；不要手工编辑。

## 边界

### ✅ 总是

- 先读相关文件和现有实现，再动手；保持改动最小、聚焦。
- 使用 pnpm 和现有脚本；新增代码遵循上面的目录、导入、样式和命名约定。
- 完成前运行测试、类型检查、Lint；UI 改动在浏览器中验证浅色/深色。
- 发现重复犯的错误时，补充本文件或对应子目录的 `AGENTS.md`。

### ⚠️ 先询问

- 新增/删除依赖、修改 `package.json` 脚本或 `pnpm-lock.yaml`。
- 修改构建、类型、Lint、格式化、shadcn、Tailwind 配置。
- 大规模调整 `src/index.css` 的设计 token 或全局样式。
- 重命名/移动/删除组件，或改变已有组件的导出/props API。
- 引入新的测试环境/依赖（jsdom、happy-dom、Testing Library 等）、CI、部署配置或新的 UI/图标/主题库。
- 提交、推送、创建 PR，或执行任何可能丢失工作的 Git 操作。

### 🚫 从不

- 提交密钥、token、`.env` 或任何凭据。
- 编辑 `node_modules/`、`dist/`、`pnpm-lock.yaml`（手工）或生成产物。
- 新增 `tailwind.config.*`，或绕过 Tailwind v4 的 CSS-first 配置。
- 使用 npm/yarn、生成第二份锁文件，或混用包管理器。
- 用 `any`、`@ts-ignore`、关闭规则等方式让检查“通过”。
- 批量格式化无关文件，或为了通过全局检查而改写用户未要求的内容。
- 改写 Git 历史、强制推送或删除用户分支/工作区。

## 维护

- 本文件应保持短小、具体、可执行；新增规则前先确认它解决的是重复出现的真实问题。
- 当命令、目录结构、技术栈或验证方式变化时同步更新本文件。
- 当测试环境、CI 或验证命令变化时，同步更新“快速命令”“测试”和“验证与完成标准”。
