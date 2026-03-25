# 常见问题与解决方案

## 构建错误

### TS6133: 变量声明但未使用

**错误信息：**
```
error TS6133: 'i' is declared but its value is never read.
```

**原因：** TypeScript strict 模式开启了 `noUnusedLocals`，未使用的变量导致编译失败。

**解决：**
```typescript
// 将未使用的参数名改为 _xxx 前缀
Array.from({ length: 8 }, (_, _i) => ({ ... }))
//                              ^^
```

---

### TS1313: 空语句体 if

**错误信息：**
```
error TS1313: Expression body of arrow function does not declare a type...
```
或
```
error: Empty statement body is probably not what you intended.
```

**原因：**
```typescript
if (condition) ;(something.property) = value
// 等价于：
if (condition) {}
;(something.property) = value  // 分号被解析为语句终止
```

**解决：**
```typescript
if (condition) {
  ;(something.property) = value
}
```

---

### TS2739: 缺少必需属性

**错误信息：**
```
error TS2739: Type ... is missing the following properties: radialModulation, modulationOffset
```

**原因：** `@react-three/postprocessing` v2.19.1 的 `ChromaticAberration` 要求显式传入这两个 props。

**解决：**
```tsx
<ChromaticAberration
  offset={new THREE.Vector2(0.0005, 0.0005)}
  radialModulation={false}
  modulationOffset={0}
  blendFunction={BlendFunction.NORMAL}
/>
```

---

## 运行时错误

### Cannot read properties of undefined (reading 'length')

**错误信息（浏览器控制台）：**
```
TypeError: Cannot read properties of undefined (reading 'length')
    at EffectComposer.js
```

**原因：** `@react-three/postprocessing` 版本与 `@react-three/fiber` 不兼容：
- v3.x 要求 fiber v9+，而项目使用 fiber v8.18

**解决（已修复）：**
```bash
npm install @react-three/postprocessing@2.19.1 --legacy-peer-deps
```

**版本对应关系：**

| @react-three/fiber | @react-three/postprocessing |
|-------------------|-----------------------------|
| v8.x | v2.x（最高 v2.19.x）|
| v9.x | v3.x |

---

### WebGLMultipleRenderTargets 构建错误

**错误信息：**
```
error: WebGLMultipleRenderTargets is not exported from 'three'
```

**原因：** Three.js 0.140+ 移除了该 API，`@react-three/postprocessing` v2.16.x 以下的版本依赖此 API。

**解决：** 使用 v2.16.2 以上版本，或直接使用经过验证的 v2.19.1：
```bash
npm install @react-three/postprocessing@2.19.1 --legacy-peer-deps
```

---

### sRGBEncoding is not defined

**错误信息：**
```
ReferenceError: sRGBEncoding is not defined
```

**原因：** Three.js r152 移除了 `sRGBEncoding`，改为 `SRGBColorSpace`。`@react-three/postprocessing` v2.15.x 以下使用了旧 API。

**解决：** 同上，升级到 v2.19.1。

---

### 后期处理效果不显示 / 画面全黑

**原因：** Canvas 的 `alpha: true`（默认值）与 `EffectComposer` 不兼容。

**解决：**
```tsx
<Canvas
  gl={{
    alpha: false,   // 必须设为 false
    // ...
  }}
>
```

---

## npm 安装问题

### peer dependency 警告/错误

**错误信息：**
```
npm error ERESOLVE unable to resolve dependency tree
```

**原因：** `@react-three/postprocessing` v2.x 的 peerDependency 声明为 `react@^17`，但项目使用 React 18（实际兼容，只是声明问题）。

**解决：** 始终使用 `--legacy-peer-deps`：
```bash
npm install --legacy-peer-deps
```

在 CI/CD（GitHub Actions）中也必须使用：
```yaml
- run: npm install --legacy-peer-deps
```

---

## 开发环境问题

### 浏览器无声音

**原因：** Web Audio API 要求用户与页面有交互后才能创建 AudioContext（浏览器安全策略）。

**正常行为：** 点击「进入禅境」按钮后，`started` 变为 true，`useSoundSystem(started)` 才会创建 AudioContext，此后所有音效正常播放。

---

### OrbitControls 失效 / 无法旋转视角

**可能原因：** `enableDamping={true}` 需要在 `useFrame` 中调用 `controls.update()`，但 `OrbitControls` 来自 `@react-three/drei` 时已内置处理。

**检查：**
```tsx
<OrbitControls
  enableDamping       // 必须同时开启
  dampingFactor={0.05}
  // @react-three/drei 的 OrbitControls 已自动调用 update()
/>
```

---

### Windows 开发时路径问题

Windows 上使用 Git Bash 运行命令时，路径格式使用正斜杠：

```bash
# 正确
cd d:/opencode/three_game

# 避免（某些工具下可能出问题）
cd d:\opencode\three_game
```

---

## 性能问题

### 帧率低 / 卡顿

**排查顺序：**

1. 检查 `dpr` 是否过高 → 改为 `dpr={[1, 1.5]}`（已设置）
2. 检查粒子数量 → RainSystem 的 RAIN_COUNT=600 在低端设备可能较重
3. 关闭后期处理对比 → 暂时注释 `<EffectComposer>` 确认是否瓶颈
4. Chrome DevTools → Performance → 找到耗时最长的 JS 函数

**低端设备适配：**
```typescript
// 可根据设备性能动态调整
const isMobile = /mobile/i.test(navigator.userAgent)
const RAIN_COUNT = isMobile ? 200 : 600
const MAX_FIREFLIES = isMobile ? 10 : 25
```

---

## GitHub Pages 部署问题

### Actions 报错：Resource not accessible by integration

**解决：**
1. 仓库 Settings → Actions → General
2. Workflow permissions → 选 **Read and write permissions**
3. 勾选 **Allow GitHub Actions to create and approve pull requests**

### 页面 404

**可能原因：**
1. GitHub Pages Source 未设置为 GitHub Actions → 重新在 Settings → Pages 中选择
2. 工作流未成功运行 → 检查 Actions tab 是否有失败记录
3. 路由问题 → 本项目是 SPA，直接访问根路径 `/` 正常，不支持直接访问子路径（如 `/game`）

### 更新后线上未变化

**可能原因：** 浏览器缓存。解决：强制刷新 `Ctrl+Shift+R`（Windows）或 `Cmd+Shift+R`（Mac）。

Vite 打包会为 JS/CSS 文件加 content hash（如 `index-abc123.js`），正常情况下浏览器会自动获取新文件。
