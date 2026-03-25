# 构建与部署

## 部署目标

| 项目 | 值 |
|------|-----|
| 平台 | GitHub Pages |
| 仓库 | https://github.com/xyhlovezhforever/xyhlovezhforever.github.io |
| 线上地址 | https://xyhlovezhforever.github.io |
| 触发方式 | 推送到 `main` 分支自动部署 |

---

## 本地构建

```bash
# 安装依赖（必须加 --legacy-peer-deps）
npm install --legacy-peer-deps

# 构建生产版本
npm run build

# 构建产物在 dist/ 目录
# 构建时间约 3 秒
# 产物大小约 2~4 MB（含 Three.js）
```

构建命令等价于：

```bash
tsc -b && vite build
```

先进行 TypeScript 类型检查（有错误则中止），再由 Vite 打包。

---

## GitHub Actions 自动部署

### 工作流文件

位置：`.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]        # 推送到 main 时自动触发
  workflow_dispatch:        # 也支持手动触发

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true  # 新推送取消正在进行的部署

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm             # 缓存 node_modules，加速构建

      - run: npm install --legacy-peer-deps

      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist             # 上传 dist/ 目录作为 Pages 产物

  deploy:
    needs: build               # 等待 build job 完成
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### 部署流程

```
git push origin main
        │
        ▼
GitHub Actions 触发（约 10s 后开始）
        │
        ▼
build job
  ├── checkout 代码（~5s）
  ├── setup Node.js 20（~10s，含缓存）
  ├── npm install --legacy-peer-deps（~30s，有缓存约 5s）
  ├── npm run build（~15s）
  └── upload artifact（~5s）
        │
        ▼
deploy job
  └── deploy-pages（~10s）
        │
        ▼
线上更新完成（总计约 1~2 分钟）
```

---

## 首次部署完整步骤

### 步骤 1：准备 GitHub 仓库

确保仓库为 `<用户名>.github.io` 格式（用户名主页仓库）。

本项目仓库：`xyhlovezhforever/xyhlovezhforever.github.io`

### 步骤 2：启用 GitHub Pages

1. 打开仓库 → **Settings** → **Pages**
2. **Source** 下拉框选择 **GitHub Actions**
3. 点击 **Save**

> ⚠️ 如果 Source 选择的是 "Deploy from a branch"，Actions 部署将无法工作，必须选 "GitHub Actions"。

### 步骤 3：初始化并推送（已完成）

```bash
cd /path/to/three_game

# 初始化 git 仓库
git init

# 暂存所有文件
git add .

# 提交
git commit -m "init: 3D meditation game with Three.js, React, post-processing"

# 绑定远程仓库
git remote add origin https://github.com/xyhlovezhforever/xyhlovezhforever.github.io.git

# 推送到 main 分支
git push -u origin main
```

### 步骤 4：验证部署

1. 打开 https://github.com/xyhlovezhforever/xyhlovezhforever.github.io/actions
2. 找到最新的 workflow run，等待绿色 ✓ 标志
3. 访问 https://xyhlovezhforever.github.io 验证页面

---

## 后续更新部署

修改代码后，只需提交并推送：

```bash
git add .
git commit -m "feat: 描述你的改动"
git push
```

GitHub Actions 将自动触发，1~2 分钟后线上更新。

---

## Vite 配置说明

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // base 不设置，默认为 '/'
  // 因为仓库是 username.github.io（根路径），无需设置子路径
})
```

**重要：** 如果仓库是普通项目仓库（如 `my-project`），Pages 地址会是 `https://username.github.io/my-project`，此时需要设置：

```typescript
// 普通项目仓库需要设置 base
export default defineConfig({
  base: '/my-project/',
  plugins: [react()],
})
```

本项目是根路径仓库（`username.github.io`），**不需要**设置 `base`。

---

## 构建产物分析

```
dist/
├── index.html          # 入口 HTML
├── assets/
│   ├── index-[hash].js    # 主 JS bundle（含 Three.js）
│   └── index-[hash].css   # 样式
└── vite.svg
```

如需分析 bundle 大小，可安装 rollup-plugin-visualizer：

```bash
npm install --save-dev rollup-plugin-visualizer --legacy-peer-deps
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [react(), visualizer({ open: true })],
})
```

运行 `npm run build` 后会自动打开 bundle 分析页面。
