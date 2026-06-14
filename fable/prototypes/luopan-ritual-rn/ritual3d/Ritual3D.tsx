// 真 3D 罗盘仪式 —— 纯 three.js + expo-gl 命令式版（不用 React Three Fiber）。
// 原因：R3F 8 的 JSX 类型与运行时都不兼容 React 19（Expo SDK 54 = React 19），
// R3F 9 的 RN 支持又不稳。直接用 three + expo-gl 的 GLView，与 React 版本完全解耦，最稳。
// 罗盘 = 有厚度的金属圆盘（顶面贴 compass.png）；铜钱 = 薄圆柱（两面贴 coin.png），
// 阻尼弹簧做真下落回弹；点光源 + 雾营造氛围。
// 看不到画面，只能保证编译 + 打包通过；相机/光照/材质/弹簧参数都标了「可调」，设备上边看边改。
import * as THREE from "three";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer, loadAsync } from "expo-three";

type CoinState = {
  mesh: THREE.Mesh;
  v: number; // 竖直速度
  y: number; // 当前高度
  t: number; // 计时（负 = 还没开始下落，用于错峰）
  x: number;
  z: number;
};

async function onContextCreate(gl: ExpoWebGLRenderingContext): Promise<void> {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;

  const renderer = new Renderer({ gl });
  renderer.setSize(width, height);
  renderer.setClearColor(0x0b0d10, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0d10, 0.14); // 暗色雾，可调浓度

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 3, 3.4); // 可调：相机角度/距离；起卦时拉近 = 真“变大”
  camera.lookAt(0, 0, 0);

  // 光照
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const goldLight = new THREE.PointLight(0xffd9a0, 1.4); // 金色主光
  goldLight.position.set(0, 5, 2);
  scene.add(goldLight);
  const jadeLight = new THREE.PointLight(0x2f6f64, 0.5); // 玉绿补光，呼应主题色
  jadeLight.position.set(-3, 2, -2);
  scene.add(jadeLight);

  // 纹理（expo-three 在 RN 里把本地图片加载成 three 纹理）
  const compassTex = (await loadAsync(require("../assets/compass.png"))) as THREE.Texture;
  const coinTex = (await loadAsync(require("../assets/coin.png"))) as THREE.Texture;

  // 罗盘：金属圆盘，CylinderGeometry 材质槽顺序为 [侧面, 顶面, 底面]
  const compassGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.18, 64); // 半径/厚度可调
  const compass = new THREE.Mesh(compassGeo, [
    new THREE.MeshStandardMaterial({ color: 0x3a2f22, metalness: 0.85, roughness: 0.35 }),
    new THREE.MeshStandardMaterial({ map: compassTex, metalness: 0.4, roughness: 0.45 }),
    new THREE.MeshStandardMaterial({ color: 0x2a2118, metalness: 0.85, roughness: 0.4 }),
  ]);
  scene.add(compass);

  // 铜钱：薄圆柱，两端面贴铜钱图（三枚共享几何与材质）
  const coinGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.05, 40);
  const coinMats = [
    new THREE.MeshStandardMaterial({ color: 0x8a6d3b, metalness: 0.9, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ map: coinTex, metalness: 0.6, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ map: coinTex, metalness: 0.6, roughness: 0.4 }),
  ];
  const specs = [
    { x: -0.55, z: 0.2, delay: 0 },
    { x: 0.5, z: -0.15, delay: 0.25 },
    { x: 0.05, z: 0.55, delay: 0.12 },
  ];
  const coins: CoinState[] = specs.map((s) => {
    const mesh = new THREE.Mesh(coinGeo, coinMats);
    mesh.position.set(s.x, 4, s.z); // 初始高度可调
    scene.add(mesh);
    return { mesh, v: 0, y: 4, t: -s.delay, x: s.x, z: s.z };
  });

  let last = Date.now();
  const render = () => {
    requestAnimationFrame(render);
    const now = Date.now();
    const dt = Math.min((now - last) / 1000, 0.04); // 防掉帧导致弹簧积分爆掉
    last = now;

    compass.rotation.y += dt * 0.3; // idle 缓转；起卦时可做成加速→减速

    for (const c of coins) {
      c.t += dt;
      if (c.t >= 0) {
        // 阻尼弹簧落到盘面：a = -k(y-rest) - c·v。k 弹性、damp 阻尼，可调
        const rest = 0.18;
        const k = 80;
        const damp = 8;
        const a = -k * (c.y - rest) - damp * c.v;
        c.v += a * dt;
        c.y += c.v * dt;
        c.mesh.position.y = c.y;
        c.mesh.rotation.x += dt * 5 * Math.max(0.15, Math.abs(c.v)); // 翻滚随速度，落定渐停
      }
    }

    renderer.render(scene, camera);
    gl.endFrameEXP(); // expo-gl：提交本帧，必须调
  };
  render();
}

export function Ritual3D() {
  return <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />;
}
