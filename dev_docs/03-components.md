# 组件详细说明

## GameScene.tsx

场景总入口，包含 Three.js `<Canvas>` 及所有 3D 子组件。

**内联组件（仅在此文件使用）：**

| 组件 | 说明 |
|------|------|
| `VolumetricLight` | 5 根体积光锥，从上方照射，雨天减弱 |
| `GroundMist` | 120 个粒子组成的地面薄雾，慢速环绕漂移 |
| `CameraBreath` | FOV 轻微呼吸震荡（±0.6°），模拟生命感 |
| `AtmosphericClouds` | 8 朵远景大气云，半透明慢速漂移 |
| `SpiritOrbs` | 8 颗神灵光球，随 calmLevel 逐渐显现，圆弧飞行 |
| `MagicRuneCircle` | 3 圈同心符文环，calmLevel>70 时显现，绕轴旋转 |

**Canvas 配置：**
```typescript
<Canvas
  camera={{ position: [0, 3.5, 11], fov: 52 }}
  gl={{
    antialias: true,
    alpha: false,                           // 必须 false
    powerPreference: 'high-performance',
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.1,
  }}
  dpr={[1, 1.5]}
>
```

---

## Sky.tsx

**功能：** 星空背景、极光动画、星座图案、流星、月亮

| 元素 | 实现方式 |
|------|---------|
| 900 颗星 | `BufferGeometry` + `PointsMaterial`，Canvas 纹理（辐射渐变）|
| 3 条极光 | `PlaneGeometry` + `MeshBasicMaterial`，正弦波动 opacity/scaleY |
| 星座 | 8 个线框图案，calmLevel 越高越淡 |
| 2 颗流星 | 每 8~15 秒触发，沿斜线飞过 |
| 月亮 | 球体 + 月晕光圈（TorusGeometry），缓慢自转 |
| 月亮光环 | `TorusGeometry(3.0, 0.5, 6, 32)` |
| 极光3 | 独立 cyan 色，Z 轴也参与震荡 |

---

## FloatingIsland.tsx

**功能：** 浮岛主体，包含多层精细元素

| 元素 | 说明 |
|------|------|
| 岛体 | FBM 噪声位移的球体，分层岩石纹理 |
| 樱花树 | 程序化树干 + 粒子花朵云 |
| 樱花飘落 | 独立飘落花瓣粒子系统 |
| 水晶柱 | 5 根发光 MeshStandardMaterial 水晶 |
| 池塘涟漪 | 4 圈 Torus 环，交替扩散 |
| 瀑布 | Points 粒子，带重力加速 |
| 鸟居 | 程序化红色木质结构 |
| 石灯笼 | 带内光点的六面柱体 |
| 竹子 | 5 根竹节分段圆柱 |

---

## AnxietyBubbles.tsx

**功能：** 可点击消除的焦虑气泡

| 参数 | 值 |
|------|-----|
| 最大气泡数 | MAX_BUBBLES = 18 |
| 最大爆炸效果数 | MAX_BURSTS = 8 |
| 气泡类型 | 普通（白）、连锁（蓝）、黄金（金，3倍分数）|
| 气泡材质 | Canvas 纹理（文字 + 渐变球形）|
| 爆炸效果 | 8 个射线粒子 + 中心闪光 |

**对象池模式：**
```typescript
// 不增删数组，只切换 active 状态
bubblePool[i].active = false  // "回收"
bubblePool[i] = { ...newBubble, active: true }  // "重用"
```

---

## ParticleField.tsx

**功能：** 环绕场景的三层粒子场

| 层 | 数量 | 描述 |
|-----|------|------|
| 轨道层 | 380 | 椭圆轨道，倾角随机 |
| 内层 | 40 | 小范围快速漂移 |
| 螺旋层 | 60 | 螺旋上升/下降 |

---

## ZenGarden.tsx

**功能：** 禅意花园，花卉、蝴蝶、飘落花瓣

| 元素 | 说明 |
|------|------|
| 10 种花型 | 不同颜色、高度、瓣数的程序花朵 |
| 3 只蝴蝶 | 8 字形飞行轨迹，翅膀扇动 |
| 飘落花瓣 | calmLevel>60 时激活，螺旋下落 |

---

## Fireflies.tsx

**功能：** 萤火虫系统，随平静值增多

| 参数 | 值 |
|------|-----|
| 最大萤火虫数 | MAX_FIREFLIES = 25 |
| 可见数量 | `floor((calmLevel/100) * MAX_FIREFLIES)` |
| 飞行路径 | Lissajous 曲线（3D 李萨如图形）|
| 轨迹长度 | TRAIL_LEN = 6 |
| 发光效果 | `Math.pow(blink, 3)` 的非线性脉冲 |

---

## MeditationStones.tsx

**功能：** 8 块冥想石，悬停 2 秒后收集获得智慧语录

| 元素 | 说明 |
|------|------|
| 悬停进度 | useFrame 累积 hover 时间，达到阈值触发 |
| 符文纹理 | Canvas 绘制中文符文 |
| 收集爆炸 | 多圈扩散光环 |
| 语录内容 | 8 条不同中文智慧语 |

---

## WishLanterns.tsx

**功能：** 心愿天灯，物理模拟上升

| 参数 | 说明 |
|------|------|
| 灯笼结构 | 六棱柱体 + 上下盖 + 4 根悬线 + 暖光点光源 |
| 火焰 | `Math.sin(t*3.1) + Math.sin(t*7.3) + Math.sin(t*11.7)` 三频叠加闪烁 |
| 火星粒子 | EMBER_COUNT=20，带速度+重力的物理 |
| 烟雾轨迹 | TRAIL_COUNT=40，跟随灯笼位置淡出 |
| 上升逻辑 | Y 轴速度 0.008/frame，左右漂移 sin 波 |
| 淡出 | 高度>20 时 traverse 所有材质降低 opacity |

---

## WindChimes.tsx

**功能：** 5 音风铃，可点击或随风自动敲响

| 参数 | 说明 |
|------|------|
| 音符数量 | 5（蓝、紫、粉、绿、黄）|
| 涟漪环数 | WAVE_COUNT = 3（每次敲击）|
| 涟漪延迟 | 每环 0.15s 错开 |
| 管体发光 | 敲击时 emissiveIntensity 升至 0.75 |
| 光晕网格 | 敲击时显示半透明圆柱体覆盖管体 |
| 自动敲响 | 每 3.5~12.5s 随机触发一音 |

---

## FloatingWords.tsx

**功能：** 12 条漂浮心灵语录，墨迹笔触风格

| 参数 | 说明 |
|------|------|
| 语录数量 | 12 条中文心灵语句 |
| 纹理风格 | 三层叠加：底层发光晕、中层半透明、顶层清晰文字 + 墨水晕染 |
| 光环粒子 | HALO_COUNT=6，环绕每个语录轨道飞行 |
| 残影拖尾 | 双重残影（0.35s、0.7s 延迟），透明度 25%、12% |
| 淡入 | 每个词语按 index*2.5s 错开淡入 |

---

## RainSystem.tsx

**功能：** 完整雨天系统

| 元素 | 参数 |
|------|------|
| 雨滴 | RAIN_COUNT=600，倾斜线段，带风向漂移 |
| 地面涟漪 | RIPPLE_COUNT=24，Torus 环，雨滴落点激活 |
| 溅水粒子 | SPLASH_COUNT=60，落地速度+重力弹射 |
| 低空雾层 | 1 个大平面，透明蓝灰雾 |
| 闪电 | 每 8~18s 随机触发，Line 几何体折线 + 高亮帧 |
| 云层 | 5 朵深色风暴云 |

---

## SoundSystem.tsx

**功能：** Web Audio API 程序化音效，无外部音频文件

```typescript
// 五声音阶（宫商角徵羽）
const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00]

playPop(combo)     // 气泡爆破音，频率随 combo 升高
playCollect()      // 收集音（双音叠加）
playBreathIn()     // 呼吸引导低频正弦
playChime(index)   // 风铃音符，指数衰减
```

**AudioContext 延迟创建：** 浏览器要求用户交互后才能创建 AudioContext，`started` 为 true 时初始化。

---

## HUD.tsx

**功能：** 游戏内叠加 UI

| 元素 | 说明 |
|------|------|
| 分数 | 动画数字滚动，每次加分时弹跳 |
| 平静值进度条 | Spring 弹性动画，渐变色填充 |
| 连击显示 | 大字闪现，2s 后淡出 |
| 智慧语录弹窗 | 底部滑入，4s 后淡出 |
| 操作提示 | 呼吸/雨天/天灯三按钮 |

---

## BreathingOverlay.tsx

**功能：** 呼吸引导练习弹窗

| 参数 | 说明 |
|------|------|
| 动画方式 | `requestAnimationFrame` + HTML Canvas 绘制 |
| 粒子数量 | 28 颗轨道粒子，带历史轨迹拖尾 |
| 呼吸节奏 | 吸气 4s → 屏息 2s → 呼气 6s |
| 阶段颜色 | 吸气=蓝色，屏息=紫色，呼气=绿色 |
| 完成奖励 | 3 轮完成后触发 `onComplete` 回调 |

---

## StartScreen.tsx

**功能：** 进入游戏的开场界面

- 3D 场景预览背景（`<Canvas>` 迷你场景）
- 飘浮粒子动画
- 「进入禅境」按钮，点击后 0.6s 淡出过渡
