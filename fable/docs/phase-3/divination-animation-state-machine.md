# Phase 3 Divination Animation State Machine

This spec covers the three non-Liuyao question methods:

- `meihua` - 梅花易数
- `qimen` - 奇门遁甲
- `daliuren` - 大六壬

The app currently uses React Native/Reanimated directly. Rive is intentionally paused for this phase; future `.riv` files can still consume the same states and trigger names if the team reintroduces that runtime.

## Runtime States

| State | Meaning | Looping | Exit |
|---|---|---:|---|
| `idle` | Home card / method stage is visible and tappable. | Yes, slow idle loop. | `method_card_pressed` or `method_entry_start` |
| `pressed` | Short tactile response after touching a method card. | No. | `method_entry_start` |
| `entering` | Method entry transition. | No. | `generation_start` |
| `generating_start` | One-shot start segment after submitting a question. | No. | `generating_loop` |
| `generating_loop` | Full loading state while waiting for the API and minimum display time. | Yes. | `generating_complete` or `error` |
| `generating_complete` | Final completion segment. | No. | Result page reveal |
| `result_header` | Result page header micro-animation. | Yes, very subtle. | Page exit |
| `error` | Gentle failed state. | Optional soft pulse. | Retry or dismiss |

Timing requirements implemented in code:

- Minimum loading display time: `1500ms`.
- Completion segment animation: `900ms`, then the app reveals the result automatically.
- If the API returns faster than `1500ms`, the app keeps `generating_loop` until the minimum duration completes.
- If the API takes longer, `generating_loop` loops until the response resolves.

## JSON-Friendly Events

Use these names as animation trigger events and analytics-safe identifiers:

```json
[
  "method_card_idle",
  "method_card_pressed",
  "method_entry_start",
  "generation_start",
  "generation_loop",
  "generation_complete",
  "generation_error",
  "result_header_reveal",
  "empty_state_idle"
]
```

The shared TypeScript source is `app/src/lib/divinationAnimation.ts`.

## Method Timelines

### 梅花易数

- `idle`: Plum blossom slowly falls into a ripple.
- `generating_start`: Glowing point and "一念起象" setup.
- `generating_loop`: Plum blossom -> ripple -> Bagua -> hexagram -> changing line.
- `generating_complete`: Ben Gua changes into Bian Gua, then shrinks into the result header.
- Suggested result header: compact blossom + ripple + text "本卦变卦已定".

Suggested Lottie/Rive layers:

- `bg_smoke`
- `glow_point`
- `plum_blossom_group`
- `water_ripple_ring_01`
- `water_ripple_ring_02`
- `bagua_ring`
- `hexagram_ben_gua`
- `hexagram_bian_gua`
- `moving_line_highlight`
- `result_header_morph`

### 奇门遁甲

- `idle`: Nine-palace grid pulses; compass ring rotates slightly.
- `generating_start`: Time seal drops into center.
- `generating_loop`: Jiugong grid -> eight gates rotate -> labels fall into palaces.
- `generating_complete`: Selected direction glows and the grid locks into final chart.
- Suggested result header: compact Jiugong grid + "九宫盘面已锁定".

Suggested Lottie/Rive layers:

- `bg_smoke`
- `time_seal`
- `compass_ring_outer`
- `compass_ring_inner`
- `jiugong_grid`
- `eight_gates_group`
- `palace_label_group`
- `selected_direction_glow`
- `chart_lock_flash`
- `result_header_morph`

### 大六壬

- `idle`: Twelve branches ring appears; three causal lines pulse.
- `generating_start`:占时印记落入中心.
- `generating_loop`: Twelve earthly branches circle -> four cards flip -> three transmissions unfold.
- `generating_complete`: Causal lines converge and become the result header.
- Suggested result header: compact branch ring + "因果线已收束".

Suggested Lottie/Rive layers:

- `bg_smoke`
- `time_seal`
- `branch_ring`
- `branch_label_group`
- `four_lessons_cards`
- `card_flip_01`
- `card_flip_02`
- `card_flip_03`
- `card_flip_04`
- `three_transmissions_group`
- `causal_line_group`
- `result_header_morph`

## Error State

Do not use scary or negative visuals.

Required text:

```text
推演未完成，请重新尝试
```

Required controls:

- `重新尝试`
- `返回修改`

Visual direction:

- Dim gold/jade glow.
- Soft fade or low-amplitude pulse.
- No red alert flashes, skulls, broken symbols, or aggressive shaking.

## React Native Notes

- Current implementation: `app/src/components/divination/DivinationMotion.tsx` and `app/src/components/divination/MethodRitualStage.tsx`.
- Timing constants: `DIVINATION_MIN_GENERATING_MS`, `DIVINATION_COMPLETION_MS`.
- Use native `Text` for labels; do not bake Chinese text into Lottie/Rive frames.
- If future Rive/Lottie assets are reintroduced, keep files under roughly `80-150KB` per method if possible.
- Prefer vector paths; avoid raster video and dense particle systems.
- The app uses dark UI by default, so exported assets should assume transparent/dark-safe backgrounds.
- Current production path is native React Native/Reanimated components under `app/src/components/divination/`.
- If Rive comes back later, use one state machine named `DivinationMotion` with boolean/trigger inputs matching the event names above.

## Flutter Notes

- Mirror the same state enum and event names.
- Use `AnimationController` minimum duration gating around the API future.
- Keep text native in Flutter widgets; animation files should expose empty label slots or marker positions.
- For Lottie, use frame markers: `idle_loop`, `generation_intro`, `generation_loop`, `generation_complete`, `error_soft`.
- For Rive, use method-prefixed state machine triggers such as `meihua_generating_start`, `meihua_generating_loop`, and `meihua_generating_complete`.
