# 项目概览

## 简介

这是一款基于 Three.js + React 构建的 3D 冥想互动游戏，运行于浏览器中。玩家通过点击焦虑气泡、收集冥想石、敲击风铃、释放天灯、进行呼吸练习等方式提升「平静值」，场景随之产生动态变化——星空璀璨、萤火虫出现、神灵光球浮现、魔法阵显现。

**线上地址：** https://xyhlovezhforever.github.io

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| UI 框架 | React | ^18.3.1 |
| 语言 | TypeScript | ~5.6.2 |
| 构建工具 | Vite | ^5.4.10 |
| 3D 渲染 | Three.js | ^0.183.2 |
| React 3D 绑定 | @react-three/fiber | ^8.18.0 |
| 3D 辅助组件库 | @react-three/drei | ^9.122.0 |
| 后期处理 | @react-three/postprocessing | ^2.19.1 |
| 后期处理核心 | postprocessing | ^6.39.0 |

> **版本兼容性关键：**
> - `@react-three/fiber` v8 要求 `@react-three/postprocessing` v2.x（v3.x 仅支持 fiber v9+）
> - `@react-three/postprocessing` v2.19.1 是兼容 Three.js 0.183 + fiber v8 的最高稳定版本

---

## 目录结构

```
three_game/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 自动部署
├── dev_docs/                   # 开发文档（本目录）
├── public/
│   └── vite.svg
├── src/
│   ├── App.tsx                 # 根组件，全局状态管理
│   ├── App.css                 # 全局样式
│   ├── main.tsx                # React 入口
│   ├── index.css               # 基础 CSS reset
│   └── game/                   # 所有游戏组件
│       ├── GameScene.tsx       # Three.js Canvas 场景总入口
│       ├── StartScreen.tsx     # 开始界面
│       ├── HUD.tsx             # 游戏内 UI（分数、平静值等）
│       ├── BreathingOverlay.tsx# 呼吸练习弹窗
│       ├── SoundSystem.tsx     # Web Audio API 音效系统
│       ├── Sky.tsx             # 天空（星星、极光、月亮）
│       ├── FloatingIsland.tsx  # 浮岛主体场景
│       ├── AnxietyBubbles.tsx  # 焦虑气泡（可点击消除）
│       ├── ParticleField.tsx   # 粒子场（三层轨道）
│       ├── ZenGarden.tsx       # 禅意花园（花、蝴蝶、花瓣）
│       ├── Fireflies.tsx       # 萤火虫（随平静值增多）
│       ├── MeditationStones.tsx# 冥想石（悬停收集）
│       ├── WishLanterns.tsx    # 心愿天灯（物理模拟上升）
│       ├── WindChimes.tsx      # 风铃（可敲击，涟漪音效）
│       ├── FloatingWords.tsx   # 漂浮心灵语录
│       ├── RainSystem.tsx      # 雨天系统（雨滴、涟漪、闪电）
│       ├── Achievements.tsx    # 成就系统
│       └── AffirmationJournal.tsx # 心情日志
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
└── tsconfig.node.json
```

---

## 游戏玩法

| 操作 | 方式 | 效果 |
|------|------|------|
| 消除焦虑气泡 | 鼠标点击气泡 | +平静值 3~13，连击加成 |
| 收集冥想石 | 悬停石头 2 秒 | +平静值 8，显示智慧语录 |
| 敲击风铃 | 点击金属管 | +平静值 1，播放音符 |
| 释放天灯 | 按 `L` 键 | +平静值 5，天灯飘向天空 |
| 呼吸练习 | 按 `空格` 键 | +平静值 20，奖励 50 分 |
| 切换降雨 | 按 `R` 键 | 场景切换雨天/晴天 |

### 平静值里程碑

| 平静值 | 解锁效果 |
|--------|---------|
| 0–59 | 基础场景 |
| 60+ | 屏幕边缘绿色光晕脉冲，禅意花园飘落花瓣 |
| 70+ | 地面魔法阵显现（三圈旋转符文） |
| 1–100 | 神灵光球逐渐浮现（8 颗，随平静值解锁） |
