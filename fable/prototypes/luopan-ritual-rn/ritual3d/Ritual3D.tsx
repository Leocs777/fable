// 真 3D 罗盘仪式 —— 纯 three.js + expo-gl 命令式（不用 React Three Fiber，避开 R3F×React19 不兼容）。
// 罗盘 = 有厚度的金属圆盘（顶面贴 compass.png）；铜钱 = 薄圆柱（两面贴 coin.png）。
// 铜钱：阻尼弹簧真下落回弹 + 空中翻滚 + 落定归位平躺；每 6 秒循环重落，便于反复观察。
// 相机/光照/材质/弹簧参数都标了「可调」，设备上边看边改。
import * as THREE from "three";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer, loadAsync } from "expo-three";

const TWO_PI = Math.PI * 2;

type CoinState = {
  mesh: THREE.Mesh;
  v: number; // 竖直速度
  y: number; // 当前高度
  t: number; // 计时（负 = 还没开始下落，用于错峰）
  spec: { x: number; z: number; delay: number; rotY: number };
};

const DROP_FROM = 3.0; // 铜钱起始高度，可调
const REST_Y = 0.16; // 落定高度（在盘顶面之上，避免穿模），可调
const CYCLE = 6; // 循环重落周期（秒）

// 三枚错落：落点 + 错峰 + 各自不同的平面朝向角（rotY），落定姿态就不一样
const SPECS = [
  { x: -0.62, z: 0.14, delay: 0, rotY: 0.5 },
  { x: 0.58, z: -0.18, delay: 0.28, rotY: 2.3 },
  { x: 0.02, z: 0.55, delay: 0.14, rotY: 4.2 },
];

async function onContextCreate(gl: ExpoWebGLRenderingContext): Promise<void> {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;

  const renderer = new Renderer({ gl });
  renderer.setSize(width, height);
  renderer.setClearColor(0x0b0d10, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0d10, 0.05); // 减淡，避免发灰；可调

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 3.4, 5.0); // 拉远，盘不再溢出；可调
  camera.lookAt(0, 0, 0);

  // 光照（整体提亮 + 提对比）
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const goldLight = new THREE.PointLight(0xffe2b0, 2.6); // 金色主光，加强
  goldLight.position.set(1.5, 5, 3);
  scene.add(goldLight);
  const keyDir = new THREE.DirectionalLight(0xffffff, 0.7); // 方向光提对比/高光
  keyDir.position.set(-2, 4, 2);
  scene.add(keyDir);
  const jadeLight = new THREE.PointLight(0x3a8a7c, 0.7); // 玉绿补光
  jadeLight.position.set(-3, 1.5, -2);
  scene.add(jadeLight);

  // 纹理
  const compassTex = (await loadAsync(require("../assets/compass.png"))) as THREE.Texture;
  const coinTex = (await loadAsync(require("../assets/coin.png"))) as THREE.Texture;

  // 罗盘：缩小半径，降低 roughness 让金属更亮（提对比）。材质槽 [侧面, 顶面, 底面]
  const compassGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.16, 64);
  const compass = new THREE.Mesh(compassGeo, [
    new THREE.MeshStandardMaterial({ color: 0x4a3d2a, metalness: 0.8, roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ map: compassTex, metalness: 0.35, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ color: 0x2a2118, metalness: 0.8, roughness: 0.4 }),
  ]);
  scene.add(compass);

  // 铜钱：薄圆柱，两端面贴铜钱图（三枚共享几何与材质）
  const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 40);
  const coinMats = [
    new THREE.MeshStandardMaterial({ color: 0x9a7a45, metalness: 0.9, roughness: 0.35 }),
    new THREE.MeshStandardMaterial({ map: coinTex, metalness: 0.55, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ map: coinTex, metalness: 0.55, roughness: 0.4 }),
  ];
  const coins: CoinState[] = SPECS.map((spec) => {
    const mesh = new THREE.Mesh(coinGeo, coinMats);
    mesh.rotation.y = spec.rotY; // 各自不同的平面朝向
    mesh.position.set(spec.x, DROP_FROM, spec.z);
    scene.add(mesh);
    return { mesh, v: 0, y: DROP_FROM, t: -spec.delay, spec };
  });

  const resetCoins = () => {
    for (const c of coins) {
      c.y = DROP_FROM;
      c.v = 0;
      c.t = -c.spec.delay;
      c.mesh.rotation.x = 0; // 平躺
    }
  };

  let last = Date.now();
  let cycle = 0;
  const render = () => {
    requestAnimationFrame(render);
    const now = Date.now();
    const dt = Math.min((now - last) / 1000, 0.04); // 防掉帧导致弹簧积分爆掉
    last = now;

    compass.rotation.y += dt * 0.45; // 盘自转，明显一些

    cycle += dt;
    if (cycle > CYCLE) {
      cycle = 0;
      resetCoins();
    }

    for (const c of coins) {
      c.t += dt;
      if (c.t < 0) continue;
      // 阻尼弹簧落到盘面：a = -k(y-rest) - damp·v。k 弹性、damp 阻尼，可调
      const k = 70;
      const damp = 7;
      const a = -k * (c.y - REST_Y) - damp * c.v;
      c.v += a * dt;
      c.y += c.v * dt;
      c.mesh.position.y = c.y;

      const settling = Math.abs(c.v) < 0.25 && c.y - REST_Y < 0.06;
      if (!settling) {
        c.mesh.rotation.x += dt * 7 * (0.3 + Math.abs(c.v)); // 空中翻滚（两面都有图）
      } else {
        // 落定：把翻滚角归到最近的整圈（平躺、端面朝上），避免立着插进盘里
        const target = Math.round(c.mesh.rotation.x / TWO_PI) * TWO_PI;
        c.mesh.rotation.x += (target - c.mesh.rotation.x) * Math.min(1, dt * 8);
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
