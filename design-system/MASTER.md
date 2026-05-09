# ???? UI/UX Pro Max Design System

## Product Context
- Product: Mobile-first personal finance ledger / offline-first APK
- Goal: Fast daily expense entry, calm FIRE-oriented progress feedback, clear month analysis
- Stack: Static HTML/CSS/JS inside Android WebView

## Design Direction
- Style: Editorial mobile finance, warm but disciplined, product-grade card hierarchy
- Avoid: Plain form layout, emoji icon UI, low-contrast beige-only theme, decorative clutter
- Visual anchor: Deep green "promise" header + warm paper cards + orange action states

## Color System
- Background: #F7EFE3 / #FBF5EC
- Primary: Deep green #1F6B55
- Primary dark: #163F35
- Accent: Sunrise orange #EE8A3A
- Data accent: Gold #F1B84E
- Text: #1F2D27
- Muted: #75695D
- Border: #EAD3B8

## Component Rules
- Home: Make the promise/progress card visually dominant, not just a stack of generic cards.
- Entry: Hide raw amount input visually; use a large amount display plus tap targets for speed.
- Categories: Use stable text badges instead of emojis; selected states must be high contrast.
- Analysis: Use at least one visual chart, not only numeric cards.
- Navigation: Floating rounded bottom nav with clear active state.

## Accessibility / Quality
- Tap targets >= 42px.
- Text contrast must be strong in light mode.
- Do not use color alone; selected controls also change border/background.
- No layout shift on hover/active states.
