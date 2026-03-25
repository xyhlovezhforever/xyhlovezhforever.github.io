# 架构设计

## 总体架构

```
┌─────────────────────────────────────────────────────┐
│                      App.tsx                        │
│  全局状态 (useState)                                 │
│  score / calmLevel / raining / lanterns / combo...  │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │  StartScreen  │  │  HUD         │                 │
│  │  (入场动画)   │  │  (分数/平静值)│                 │
│  └──────────────┘  └──────────────┘                 │
│                                                     │
│  ┌────────────────────────────────────────────┐     │
│  │              GameScene.tsx                 │     │
│  │  <Canvas> Three.js 渲染上下文              │     │
│  │                                            │     │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐  │     │
│  │  │  Sky    │ │FloatIsld │ │Anxiety    │  │     │
│  │  │  极光   │ │  浮岛    │ │Bubbles    │  │     │
│  │  └─────────┘ └──────────┘ └───────────┘  │     │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐  │     │
│  │  │ZenGarden│ │Fireflies │ │MeditStons │  │     │
│  │  └─────────┘ └──────────┘ └───────────┘  │     │
│  │  ┌──────────┐ ┌─────────┐ ┌───────────┐  │     │
│  │  │WishLantrn│ │WindChime│ │FloatWords │  │     │
│  │  └──────────┘ └─────────┘ └───────────┘  │     │
│  │  ┌──────────┐ ┌─────────┐ ┌───────────┐  │     │
│  │  │RainSystem│ │SpiritOrb│ │MagicRune  │  │     │
│  │  └──────────┘ └─────────┘ └───────────┘  │     │
│  │                                            │     │
│  │  EffectComposer (Bloom + Vignette + CA)   │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  BreathingOverlay (CSS canvas RAF)                  │
│  LanternInput (表单弹窗)                            │
│  ShockwaveRings (CSS overlay)                       │
└─────────────────────────────────────────────────────┘
```

---

## 状态流向

所有游戏状态集中在 `App.tsx`，通过 props 向下传递，通过回调函数向上通知。

```
App.tsx (状态源)
  │
  ├── calmLevel ──────────────► GameScene → 所有 3D 组件
  │                          ► HUD (进度条)
  │                          ► SpiritOrbs (可见数量)
  │                          ► MagicRuneCircle (透明度)
  │                          ► Fireflies (激活数量)
  │                          ► ZenGarden (花瓣飘落)
  │                          ► Sky (星座淡出)
  │
  ├── raining ──────────────► GameScene → RainSystem, Sky, VolumetricLight
  │                          ► HUD (雨天按钮状态)
  │                          ► App 雨天暗化遮罩
  │
  ├── lanterns ─────────────► GameScene → WishLanterns
  │
  ├── onBubblePopped ◄──────── AnxietyBubbles (用户点击)
  │   → score += 10*combo
  │   → calmLevel += 3~13
  │   → shockwave CSS ring
  │
  ├── onStoneCollected ◄────── MeditationStones (悬停完成)
  │   → wisdomMessage 显示
  │   → calmLevel += 8
  │
  ├── onChime ◄──────────────── WindChimes (点击或自动)
  │   → calmLevel += 1
  │   → playChime(noteIndex)
  │
  └── onBreathingComplete ◄──── BreathingOverlay
      → calmLevel += 20
      → score += 50
```

---

## 渲染管线

```
Three.js WebGL Renderer
        │
        ├── Scene Graph
        │     └── 所有 3D mesh/points/group
        │
        └── EffectComposer (后期处理)
              ├── Bloom
              │     intensity = 0.4 + (calmLevel/100) * 0.6
              │     threshold = raining ? 0.55 : 0.45
              ├── Vignette
              │     darkness = raining ? 0.7 : 0.45
              └── ChromaticAberration
                    offset = Vector2(0.0005, 0.0005)
```

**关键配置：**
- `gl={{ alpha: false }}` — 必须设为 false，否则 EffectComposer 无法工作
- `gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}` — 电影级色调映射
- `dpr={[1, 1.5]}` — 像素比自适应（高清屏最高 1.5x）
- `multisampling={0}` on EffectComposer — 禁用 MSAA，与后期处理兼容

---

## 动画系统

所有动画遵循 **「useFrame + ref 直接变更」** 模式，绝不在 useFrame 中调用 setState：

```typescript
// ✅ 正确：直接修改 Three.js 对象属性
useFrame((state, delta) => {
  if (!meshRef.current) return
  meshRef.current.rotation.y += delta * 0.5
  ;(meshRef.current.material as THREE.MeshBasicMaterial).opacity =
    Math.sin(state.clock.elapsedTime) * 0.5 + 0.5
})

// ❌ 错误：在 useFrame 中 setState 会导致每帧重新渲染
useFrame(() => {
  setRotation(r => r + 0.01) // 不可这样做
})
```

### 动画时间基准

| 用途 | 方式 |
|------|------|
| 绝对时间（循环动画） | `state.clock.elapsedTime` |
| 帧增量（速度一致性） | `delta` 参数（60fps → ~0.016，30fps → ~0.033）|
| 物理步进 | `delta` 乘以速度，保证帧率无关 |

---

## 音效系统

`SoundSystem.tsx` 使用 **Web Audio API**，无需任何外部音频文件：

```
Web Audio API
  ├── AudioContext（用户首次交互后创建）
  ├── playPop(combo) — OscillatorNode，频率随连击升高
  ├── playCollect()  — 双音叠加，收集音效
  ├── playBreathIn() — 低频正弦，呼吸引导
  └── playChime(noteIndex) — 五声音阶，指数衰减
```

全部音效为程序化合成，无需加载任何 `.mp3` / `.ogg` 文件。
