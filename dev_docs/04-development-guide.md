# 开发指南

## 环境要求

| 工具 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| 浏览器 | Chrome 100 / Firefox 110 | 最新版 Chrome |

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/xyhlovezhforever/xyhlovezhforever.github.io.git
cd xyhlovezhforever.github.io
```

### 2. 安装依赖

> **必须使用 `--legacy-peer-deps`**，因为 `@react-three/postprocessing` v2.x 的 peer dependency 声明与 React 18 存在版本号冲突（实际运行兼容，只是声明不匹配）。

```bash
npm install --legacy-peer-deps
```

### 3. 启动开发服务器

```bash
npm run dev
```

默认地址：http://localhost:5173

### 4. 构建生产版本

```bash
npm run build
```

构建产物输出至 `dist/` 目录，正常约 3 秒完成。

### 5. 本地预览构建产物

```bash
npm run preview
```

---

## 项目脚本说明

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器，HMR 热更新 |
| `npm run build` | TypeScript 类型检查 + Vite 打包 |
| `npm run preview` | 本地预览 dist 目录 |
| `npm run lint` | ESLint 代码检查 |

---

## TypeScript 严格模式规则

项目开启了完整 strict 模式，以下规则必须遵守：

### noUnusedLocals / noUnusedParameters

未使用的变量或参数会导致**编译失败**。解决方案：

```typescript
// ❌ 编译错误
Array.from({ length: 8 }, (_, i) => ({ x: i }))
//                              ^ i declared but never read

// ✅ 方案1：重命名为 _xxx 前缀
Array.from({ length: 8 }, (_, _i) => ({ x: 0 }))

// ✅ 方案2：直接用下划线
Array.from({ length: 8 }, (_, __) => ({ x: 0 }))

// ✅ 方案3：实际使用该变量
Array.from({ length: 8 }, (_, i) => ({ x: i * 2 }))
```

### 空 if 语句体

```typescript
// ❌ 编译错误 TS1313：空语句体 + 分号导致意外行为
if (condition) ;(someRef.material as Material).opacity = 0.5

// ✅ 正确：使用花括号
if (condition) {
  ;(someRef.material as Material).opacity = 0.5
}
```

### Three.js 类型断言

```typescript
// 访问 material 属性需要类型断言
const mat = (mesh.material as THREE.MeshBasicMaterial)
mat.opacity = 0.5

// 访问 geometry attributes
const positions = ref.current.geometry.attributes.position
;(positions.array as Float32Array)[i * 3] = x
```

---

## 编码规范

### 1. useFrame 中绝不 setState

```typescript
// ✅ 正确：直接操作 ref
useFrame((state, delta) => {
  if (!groupRef.current) return
  groupRef.current.rotation.y += delta * 0.3
})

// ❌ 错误：触发 React 重渲染循环
useFrame(() => {
  setAngle(a => a + 0.01) // 每帧 setState = 卡死
})
```

### 2. useMemo 缓存几何体和纹理

几何体、纹理、粒子数据**必须用 useMemo**，否则每次父组件渲染都会重新创建：

```typescript
const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), [])

const texture = useMemo(() => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  // ... 绘制
  return new THREE.CanvasTexture(canvas)
}, [])

const particleData = useMemo(() => {
  const positions = new Float32Array(COUNT * 3)
  // ... 初始化
  return { positions, velocities }
}, []) // 空依赖 = 只创建一次
```

### 3. 对象池模式（避免频繁创建/销毁）

```typescript
// 初始化池
const pool = useRef(
  Array.from({ length: MAX }, () => ({ active: false, progress: 0, x: 0, y: 0 }))
)

// 激活（"创建"）
const activate = (x: number, y: number) => {
  const slot = pool.current.find(p => !p.active)
  if (!slot) return
  slot.active = true
  slot.progress = 0
  slot.x = x
  slot.y = y
}

// useFrame 中更新
useFrame((_, delta) => {
  pool.current.forEach(p => {
    if (!p.active) return
    p.progress += delta
    if (p.progress > 1) p.active = false // "回收"
  })
})
```

### 4. 材质淡入淡出（traverse 模式）

```typescript
// 淡出一个 Group 下所有网格
group.traverse((child) => {
  const mesh = child as THREE.Mesh
  if (!mesh.isMesh) return
  const mat = mesh.material as THREE.MeshBasicMaterial
  // 用 _baseOpacity 记录原始 opacity
  if (mat._baseOpacity === undefined) mat._baseOpacity = mat.opacity
  mat.opacity = mat._baseOpacity * fadeMultiplier
})
```

> 注：`_baseOpacity` 是自定义属性，TypeScript 会报错，需要扩展 Material 类型或用 `as any` 转换。

### 5. Canvas 纹理生成模板

```typescript
const texture = useMemo(() => {
  const SIZE = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  // 径向渐变发光
  const gradient = ctx.createRadialGradient(SIZE/2, SIZE/2, 0, SIZE/2, SIZE/2, SIZE/2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.4, 'rgba(200,200,255,0.6)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, SIZE, SIZE)

  return new THREE.CanvasTexture(canvas)
}, [])
```

---

## 添加新组件

1. 在 `src/game/` 下创建新文件，如 `NewEffect.tsx`
2. 导出具名组件：`export function NewEffect({ calmLevel }: Props) { ... }`
3. 在 `GameScene.tsx` 中导入并添加到 `<Suspense>` 内部
4. 如需与 App 状态交互，在 `GameScene.tsx` 的 props 中新增回调或参数，并从 `App.tsx` 传入

### 组件模板

```typescript
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface NewEffectProps {
  calmLevel: number
}

export function NewEffect({ calmLevel }: NewEffectProps) {
  const groupRef = useRef<THREE.Group>(null)

  const geo = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), [])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.rotation.y += delta * 0.5
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.2
  })

  return (
    <group ref={groupRef} position={[0, 2, 0]}>
      <mesh geometry={geo}>
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#6d28d9"
          emissiveIntensity={0.2 + (calmLevel / 100) * 0.8}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}
```

---

## 性能优化建议

| 场景 | 建议 |
|------|------|
| 大量相同网格 | 使用 `instancedMesh` |
| 粒子系统 | `BufferGeometry` + `PointsMaterial`，避免单独 mesh |
| 静态几何 | 模块级声明（组件外），所有实例共享 |
| 后期处理 | `multisampling={0}` 禁用多重采样 |
| 设备像素比 | `dpr={[1, 1.5]}` 限制最高 1.5x |
| 材质数量 | 相同颜色/属性的材质尽量复用 |
| 阴影 | 仅主光源开启 `castShadow`，其余关闭 |
