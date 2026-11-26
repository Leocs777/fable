# Fable Divination Motion Production Brief

This is the production motion brief for the three non-Liuyao divination methods in Fable:

- 梅花易数 (`meihua`)
- 奇门遁甲 (`qimen`)
- 大六壬 (`liuren` / app API key: `daliuren`)

The target deliverable is in-app motion, not a marketing video. The primary source format should be `.riv` with Rive state machines. `.json` / `.lottie` is acceptable when the same states, triggers, and segment behavior are preserved.

## Product Goal

The motion should make users feel that they are entering a disciplined, interpretable traditional system:

- A question is formed.
- A method is selected.
- A chart is generated through a clear ritual process.
- The result emerges from structured reasoning, not from random visual magic.

The tone is advanced, restrained, real, and app-native.

## Visual Direction

Use:

- ink black
- deep teal
- jade
- muted dark gold linework
- subtle particles
- luopan rings
- hexagrams
- Jiugong grid
- earthly branches
- scroll / parchment texture
- ripples
- precise charting lines

Avoid:

- cheap fantasy game effects
- horror, ghosts, religious ritual, blood red, aggressive smoke
- magic explosions
- heavy neon
- illegible Chinese text
- baked-in UI copy inside the animation file when native text can render it

Chinese copy should be rendered natively in the app where possible. If text must exist inside Rive, use large, high-contrast vector text and test on a 390px-wide mobile viewport.

## File Package

Required production package from design:

- `fable_meihua.riv`
- `fable_qimen.riv`
- `fable_liuren.riv`
- Figma source file with editable vector layers
- MP4/GIF previews for review only
- Layer naming matching this document
- Export notes listing Rive version, artboard dimensions, and file size

Recommended canvas:

- Card idle artboard: `720x480`
- Full loading artboard: `1080x1920`
- Result header artboard: `720x180`
- Error artboard: can share full loading artboard

Performance target:

- 60fps
- `.riv` target size: under `250KB` per method if possible
- hard ceiling: `500KB` per method
- no raster video
- raster texture only when it is low-resolution, compressed, and visually necessary

## Unified Rive State Machine

Each `.riv` should contain one state machine:

```text
StateMachine: DivinationMotion
```

States:

- `idle`
- `pressed`
- `entering`
- `generating_start`
- `generating_loop`
- `generating_complete`
- `result_header`
- `error`
- `retry`

Inputs:

- Trigger: `{method}_idle`
- Trigger: `{method}_pressed`
- Trigger: `{method}_entering`
- Trigger: `{method}_generating_start`
- Trigger: `{method}_generating_loop`
- Trigger: `{method}_generating_complete`
- Trigger: `{method}_result_header`
- Trigger: `{method}_error`
- Trigger: `{method}_retry`
- Boolean: `is_loading`
- Boolean: `has_result`
- Boolean: `has_error`
- Number: `progress`

Playback rules:

- `idle` loops forever.
- `pressed` plays once, then routes to `entering` or `idle`.
- `generating_start` plays once.
- `generating_loop` loops naturally until the API resolves.
- `generating_complete` plays once, then holds on a stable final frame.
- `result_header` loops very subtly.
- `error` loops softly without alarming visuals.
- `retry` plays once, then routes back to `generating_start`.

App timing rules:

- Minimum loading display: `1500ms`.
- If API returns before `1500ms`, keep `generating_loop` until the minimum duration completes.
- If API takes longer, continue `generating_loop`.
- After API success, play `generating_complete`.
- Current app behavior: `generating_complete` plays once, then the app reveals the result automatically.

## Trigger Names

### 梅花易数

- `meihua_idle`
- `meihua_pressed`
- `meihua_entering`
- `meihua_generating_start`
- `meihua_generating_loop`
- `meihua_generating_complete`
- `meihua_result_header`
- `meihua_error`
- `meihua_retry`

### 奇门遁甲

- `qimen_idle`
- `qimen_pressed`
- `qimen_entering`
- `qimen_generating_start`
- `qimen_generating_loop`
- `qimen_generating_complete`
- `qimen_result_header`
- `qimen_error`
- `qimen_retry`

### 大六壬

Use `liuren` for animation trigger names. The app API key is currently `daliuren`.

- `liuren_idle`
- `liuren_pressed`
- `liuren_entering`
- `liuren_generating_start`
- `liuren_generating_loop`
- `liuren_generating_complete`
- `liuren_result_header`
- `liuren_error`
- `liuren_retry`

## 梅花易数

Experience keywords:

- natural
- light
- inspiration
- external omen
- image-taking

Core feeling:

> A single thought creates an external omen, and the omen condenses into a hexagram.

### A. Home Card Idle Loop

Duration: `2.8s`, infinite loop.

Visual:

- One plum petal drifts down with slight left/right sway.
- The petal touches water and creates a very light Bagua ripple.
- Background has visible water, not black negative space.
- Motion is soft and low contrast; the card should not steal attention from the page.

Physics:

- Petal starts slow, accelerates slightly, eases into water.
- On impact, petal has a tiny rebound before settling.
- Ripple expansion uses ease-out, not linear scale.

Figma/Rive layers:

- `meihua_bg_water_surface`
- `meihua_branch_soft_shadow`
- `meihua_petal_primary`
- `meihua_petal_secondary`
- `meihua_ripple_outer`
- `meihua_ripple_inner`
- `meihua_bagua_ripple`
- `meihua_gold_dust_subtle`

### B. Entry Transition

Duration: `700ms`.

Visual:

- Card center brightens softly.
- Plum petals move outward from center.
- Water ripple expands to fill the card.
- Faint Bagua marks appear at the edge.
- Transition hands off to input page.

Curve:

- `easeOutCubic` for ripple.
- `easeInOutSine` for petal drift.

### C. Loading

Suggested total if uninterrupted: `3.5s`, split into start / loop / complete.

Start: `0-700ms`

- User question condenses into a central point of jade-gold light.
- Native text: `一念起象`.

Loop: `700ms+`, loopable section `1800-2800ms`

- Petals fall one at a time.
- Water ripples expand.
- Small numbers emerge from ripple rings, then resolve into Bagua hints.
- Six yao lines generate from bottom to top.
- One moving line glows.
- Keep water and particles subtly moving during loop.

Complete: `900-1200ms`

- Ben Gua duplicates into Bian Gua.
- A muted gold stream connects them.
- Native text: `起卦完成`.
- Hexagram group shrinks toward result header position.

Copy:

- `一念起象`
- `取象中…`
- `本卦`
- `变卦`
- `起卦完成`

### D. Result Header

Duration: infinite subtle loop.

Visual:

- Small `本卦 → 变卦`.
- Water ripple breathes lightly.
- Moving yao glows once every `2.4s`.

### E. Error

Visual:

- Ripple fails to fully close, then gently reforms.
- No red flash.
- Native copy: `推演未完成，请重新尝试`.

## 奇门遁甲

Experience keywords:

- precision
- strategy
- Jiugong
- direction
- time
- layout

Core feeling:

> Time and direction unfold into a nine-palace decision map.

### A. Home Card Idle Loop

Duration: `3.2s`, infinite loop.

Visual:

- Jiugong grid emits a faint sequential pulse.
- Luopan ring rotates `4-8deg`, then eases back.
- Eight gate characters are visible but calm.

Characters:

- `开`
- `休`
- `生`
- `伤`
- `杜`
- `景`
- `死`
- `惊`

Layer names:

- `qimen_bg_luopan_texture`
- `qimen_jiugong_grid`
- `qimen_palace_glow_01` ... `qimen_palace_glow_09`
- `qimen_ring_tianpan`
- `qimen_ring_dipan`
- `qimen_gate_kai`
- `qimen_gate_xiu`
- `qimen_gate_sheng`
- `qimen_gate_shang`
- `qimen_gate_du`
- `qimen_gate_jing`
- `qimen_gate_si`
- `qimen_gate_jing2`

### B. Entry Transition

Duration: `800ms`.

Visual:

- Jiugong expands from card center like a map.
- Luopan ring aligns with a small settling rebound.
- Grid lines draw into the input page.

### C. Loading

Suggested total: `4s`, split into start / loop / complete.

Start: `0-800ms`

- A circular time seal lands in the center.
- Native text: `时间定局`.

Loop: `800ms+`, loopable section `1800-3200ms`

- 3x3 grid draws from center outward.
- Luopan rings unfold.
- Eight gates rotate slowly around the grid.
- Tianpan rotates gently; Dipan stays stable.
- Labels fall into palaces one by one.
- Palaces light sequentially to show `排局中`.

Complete: `900-1200ms`

- One direction or palace locks.
- Luopan stops with slight physical rebound.
- Native text: `奇门局已成`.
- Jiugong shrinks into result header.

Copy:

- `时间定局`
- `九宫展开`
- `八门落宫`
- `方位取势`
- `奇门局已成`

### D. Result Header

Visual:

- Small Jiugong chart.
- Key palace breathes softly.
- Luopan outer ring rotates extremely slowly, under `1deg/sec`.

### E. Error

Visual:

- Lines fade and redraw toward center.
- Native copy: `推演未完成，请重新尝试`.

## 大六壬

Experience keywords:

- inference
- causality
- clues
- human affairs
- four lessons and three transmissions

Core feeling:

> The divination time creates the lesson, the four lessons become evidence, and the three transmissions form a causal chain.

### A. Home Card Idle Loop

Duration: `3.6s`, infinite loop.

Visual:

- Twelve earthly branches appear in a ring.
- Three causal lines light in sequence.
- The feeling should be like a refined ancient reasoning board, not a generic loading line.

Earthly branches:

- `子`
- `丑`
- `寅`
- `卯`
- `辰`
- `巳`
- `午`
- `未`
- `申`
- `酉`
- `戌`
- `亥`

Layer names:

- `liuren_bg_parchment`
- `liuren_branch_ring`
- `liuren_branch_zi`
- `liuren_branch_chou`
- `liuren_branch_yin`
- `liuren_branch_mao`
- `liuren_branch_chen`
- `liuren_branch_si`
- `liuren_branch_wu`
- `liuren_branch_wei`
- `liuren_branch_shen`
- `liuren_branch_you`
- `liuren_branch_xu`
- `liuren_branch_hai`
- `liuren_four_lessons_cards`
- `liuren_transmission_line_chu`
- `liuren_transmission_line_zhong`
- `liuren_transmission_line_mo`

### B. Entry Transition

Duration: `850ms`.

Visual:

- Earthly branch disc expands from the card.
- A scroll-like surface opens.
- Three gold lines guide the user into the question page.

### C. Loading

Suggested total: `4.5s`, split into start / loop / complete.

Start: `0-900ms`

- A circular divination-time seal lands in the center.
- Native text: `占时起课`.

Loop: `900ms+`, loopable section `2100-3600ms`

- Twelve branches appear around the circle in order.
- Outer ring remains fixed.
- Inner ring rotates subtly.
- Four cards flip open with slight perspective and a small hold.
- Three transmissions light in sequence: `初传 → 中传 → 末传`.
- Lines should feel like causal reasoning, not a progress bar.

Complete: `1000-1300ms`

- Four cards and three lines converge toward center.
- Center point glows softly.
- Native text: `三传已明`.
- Causal line shrinks into result header.

Copy:

- `占时起课`
- `十二支定位`
- `四课成象`
- `初传`
- `中传`
- `末传`
- `三传已明`

### D. Result Header

Visual:

- Small `初传 → 中传 → 末传` causal line.
- Gold line has a very subtle flow.
- No distracting movement near result text.

### E. Error

Visual:

- Causal lines separate softly, then converge back.
- Native copy: `推演未完成，请重新尝试`.

## Error State

Unified error copy:

```text
推演未完成，请重新尝试
```

Retry transition:

- Error linework fades to `40%`.
- Retry tap triggers `retry`.
- `retry` reconnects the lines or resets the seal.
- Then route back to `generating_start`.

Do not use:

- warning red as dominant color
- broken glass
- skulls
- horror imagery
- loud vibration visuals

## Native App Integration Notes

Recommended React Native flow:

1. User taps method card.
2. App fires `{method}_pressed`.
3. Route transition fires `{method}_entering`.
4. User submits question.
5. App fires `{method}_generating_start`.
6. After start segment completes, Rive moves to `{method}_generating_loop`.
7. App waits for both:
   - API response
   - minimum display time
8. On success, app fires `{method}_generating_complete`.
9. App waits for the completion segment to finish.
10. App navigates/reveals result and fires `{method}_result_header`.
11. On failure, app fires `{method}_error`.

Keep all long Chinese copy native in React Native. Rive should own visual symbols and motion, not paragraphs or buttons.

## Review Checklist

Before accepting files:

- Idle loop is seamless.
- Loading loop can run for 30 seconds without visible popping.
- Complete segment has a clear final hold.
- Chinese symbols are readable on a 390px-wide iPhone viewport.
- File size is within mobile budget.
- Motion does not obscure app text or controls.
- Result header motion is barely perceptible.
- Error state feels calm and retryable.
- No asset looks like an AI video crop or marketing trailer.
- No cheap fantasy game effects.
