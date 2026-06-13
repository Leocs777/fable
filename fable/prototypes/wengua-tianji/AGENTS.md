# Prototype Instructions

Run the local server yourself and open the preview in the in-app browser. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Durable prototype feedback:
- Casting animation should become a full ritual moment: after tapping, the Tianji tray enlarges and takes more screen space, then three coins dynamically fall onto it.
- During casting, the tray/compass base must be coinless; coins should be an independent layer that drops from high above, stays visually above the tray, rebounds a few times, and only appears after the throw begins.
- Result actions must be functional in the prototype; "查看深度报告" should open a visible deep-report surface instead of behaving like a static CTA.
- The deep-report upsell should continue into a basic Phase 1 paywall with subscription and single-report choices, even when purchases are only simulated.
- Simulated payment success should reveal an unlocked report state with extra interpretation and a follow-up question interaction, not just a success note.
- History and data-deletion controls should be interactive in the prototype: saved records can open a detail summary, and delete-all moves the drawer into an empty state.
- Privacy consent must be visible and interactive in the prototype, with first-run consent plus a persistent top-level entry for reviewing sensitive-data notes.
- BaZi MVP should start as an input-to-result prototype with birth date/time/place, time-certainty controls, four pillars, five-element balance, theme cards, and explicit low-confidence copy when birth time is unknown.
- Feng Shui Lite should remain manual-input only in Phase 1, with room type, direction, door/window/bed/desk hints, a simple floor-map visualization, and at least five actionable adjustment suggestions.
