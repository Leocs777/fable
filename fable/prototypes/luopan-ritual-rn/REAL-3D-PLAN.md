# 真 3D 罗盘仪式 —— 升级方案（React Three Fiber）

当前 `ritual/` 是 **2.5D（reanimated transform）** 版：用平面图片做旋转/缩放/落体。它的天花板就到这里——给不了真厚度、真翻转、真回弹、真体积，还会有伪 3D 的遮挡问题（铜钱"嵌进盘里看不见下半"就是平面图片在伪 3D 里被遮）。

要做到"高级冥想 App + 古占卜仪式"那种质感（罗盘有厚度光影、转动时相机拉近的真"变大"、铜钱真翻滚真回弹、雾气、辉光），正路是**真 3D**。好消息：**这条路在 Expo Go 里就能跑**，因为 `expo-gl`（提供 WebGL 上下文）是 Expo Go 内置原生模块，`three` 是纯 JS，`@react-three/fiber` 在其上做声明式封装。**不需要 development build。**

> 为什么这部分留给你在本机做、而不是在受限环境替你搭完：3D 的相机、光照、材质、动画手感**必须边看画面边调**。我可以把骨架和逻辑给到位、远程帮你改代码，但"好不好看"得你在设备上看着定。

---

## 1. 依赖

```bash
npx expo install expo-gl
npm i three @react-three/fiber expo-three --legacy-peer-deps
npm i -D @types/three --legacy-peer-deps
# 辉光（可选，做金光 bloom）：
npm i postprocessing @react-three/postprocessing --legacy-peer-deps
```

- 本项目是 React 19，`@react-three/fiber` 8.x 的 peer 写的是 React 18，所以加 `--legacy-peer-deps`；运行没问题。想避开告警可改用 R3F 9.x。
- `expo-three` 提供 RN 环境下的纹理加载（`loadAsync` / `TextureLoader`），因为浏览器版 `THREE.TextureLoader` 在 RN 里不能直接 `require` 图片。

---

## 2. 场景结构

```
<Canvas>                       // @react-three/fiber/native，挂在 expo-gl 上
  <fog />                      // 暗色雾，营造纵深
  <ambientLight />             // 底光
  <pointLight />（金色）        // 主光；落地时强度脉冲 = 金光
  <Compass />                  // 扁圆柱几何 + compass.png 贴顶面（有厚度、真旋转）
  <Coin x3 />                  // 薄圆柱几何 + coin.png 贴正反面（真下落/翻滚/回弹）
  <Particles />               // 真粒子（InstancedMesh 或 points）
  <EffectComposer><Bloom /></EffectComposer>  // 辉光后期（可选）
</Canvas>
```

各诉求 → 真 3D 怎么满足：

| 你的诉求 | 真 3D 做法 |
|---|---|
| 罗盘有立体感、不是平面 | `CylinderGeometry(r, r, 厚度, 64)`，顶面贴罗盘纹理；侧面给暗铜色金属材质（`meshStandardMaterial` + metalness/roughness）。光照一打就有厚度和金属反光。 |
| 转动时逐渐变大 | 起卦阶段相机 `position.z` 缓动拉近，或盘 `scale` 缓动放大；配合 `rotation.y` 加速→减速。 |
| 铜钱自然掉落 + 回弹 | `position.y` 用阻尼弹簧积分（见下），真物理回弹，不是 interpolate 凑的。 |
| 铜钱有体积、不消失/不嵌入 | 真圆柱几何 + 深度缓冲，怎么翻都不会塌成线或被盘遮（深度测试自动处理）。 |
| 翻滚立体 | `rotation.x`/`rotation.z` 真转，正反面各一张贴图（`attach="material-1"`/`material-2"` 给圆柱两端面）。 |
| 雾气 | `<fog args={[color, near, far]} />` 一行；或体积感更强用半透明 sprite 粒子。 |
| 金光辉光 | 落地瞬间 `pointLight.intensity` 脉冲 + `<Bloom>` 后期，真发光扩散。 |

---

## 3. 关键骨架

### Canvas + 场景

```tsx
import { Canvas, useFrame, useLoader } from "@react-three/fiber/native";
import * as THREE from "three";
import { useRef } from "react";

export function Ritual3D() {
  return (
    <Canvas
      gl={{ antialias: true }}
      camera={{ position: [0, 2.6, 4.2], fov: 45 }}
      onCreated={(state) => {
        state.scene.fog = new THREE.FogExp2(0x0b0d10, 0.12); // 暗色雾
      }}
    >
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 4, 2]} color={0xffd9a0} intensity={1.2} />
      <Compass />
      <Coins />
    </Canvas>
  );
}
```

### 罗盘（有厚度，转动 + 起卦拉近）

```tsx
function Compass() {
  const ref = useRef<THREE.Mesh>(null!);
  // expo-three 加载本地纹理：const tex = await loadAsync(require("../assets/compass.png"))
  const tex = useTexture(require("../assets/compass.png")); // 用 expo-three 包一层
  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 0.25; // idle 缓转；起卦时把这个值做成加速→减速曲线
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2.1, 0, 0]}>
      <cylinderGeometry args={[1.6, 1.6, 0.16, 64]} />
      {/* 顶面贴罗盘图，侧/底给暗铜金属 */}
      <meshStandardMaterial attach="material-0" color={0x3a2f22} metalness={0.8} roughness={0.35} />
      <meshStandardMaterial attach="material-1" map={tex} metalness={0.5} roughness={0.4} />
      <meshStandardMaterial attach="material-2" color={0x2a2118} metalness={0.8} roughness={0.4} />
    </mesh>
  );
}
```

> `cylinderGeometry` 的材质槽：`material-0` 侧面、`material-1` 顶面、`material-2` 底面。罗盘图贴 `material-1`。

### 铜钱（真下落 + 阻尼弹簧回弹 + 翻滚）

```tsx
function Coin({ delay, landX, landZ }: { delay: number; landX: number; landZ: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const tex = useTexture(require("../assets/coin.png"));
  const v = useRef(0);          // 速度
  const y = useRef(3.2);        // 初始高度
  const t = useRef(-delay);     // 错峰
  useFrame((_, dt) => {
    t.current += dt;
    if (t.current < 0) return;
    // 阻尼弹簧落到 0.1（盘面高度）：a = -k*(y-rest) - c*v，真回弹
    const rest = 0.1, k = 90, c = 9;
    const a = -k * (y.current - rest) - c * v.current;
    v.current += a * dt;
    y.current += v.current * dt;
    ref.current.position.set(landX, y.current, landZ);
    ref.current.rotation.x += dt * 6 * Math.max(0, v.current); // 越快翻越快，落定渐停
  });
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[0.32, 0.32, 0.04, 48]} />
      <meshStandardMaterial color={0xb08d57} metalness={0.9} roughness={0.35} />
      {/* 正反面贴 coin.png：给两个端面材质 map=tex */}
    </mesh>
  );
}
```

阻尼弹簧（`k` 弹性、`c` 阻尼）就是真回弹——落地过冲再收敛，比 interpolate 自然。三枚给不同 `delay`/`landX`/`landZ` 即错落散落。

### 纹理加载辅助（expo-three）

```tsx
import { loadAsync } from "expo-three";
// useTexture：包一个 suspense 资源，或在 onCreated 里 await loadAsync(require(...))
```

---

## 4. 在本机怎么推进

1. 装依赖（上面第 1 节）。
2. 新建 `ritual3d/Ritual3D.tsx`，照第 3 节骨架搭起来。
3. `npx expo start -c`，Expo Go 扫码看。
4. **边看边调**：相机距离/fov、光照颜色强度、罗盘厚度/金属感、铜钱弹簧 `k`/`c`、翻滚速度、雾浓度、bloom 强度。
5. 卡住或要加逻辑（起卦节奏编排、落地金光脉冲、粒子、把 `result` 接 `/api/divine`）时把现象/诉求发我，我帮你改代码。

3D 模型可选升级：想要更精致的罗盘（真浮雕、刻字），可以让 3D 设计师出一个 `.glb` 模型，用 `useGLTF`（`@react-three/drei/native`）加载，替换掉 `cylinderGeometry` 那块，其它不变。
