# DeepInspect — Orbital Command Center Design System

## Brand Identity
- **Product**: DeepInspect — AI-powered infrastructure intelligence platform
- **Aesthetic**: Dark glassmorphism command center — military-grade intelligence dashboard
- **Mood**: Precision, authority, futuristic operational clarity

## Color Palette

### Base
- **Void (Background)**: `#06060a` — near-black with blue undertone
- **Void Light**: `#0c0e16` — elevated surface
- **Void Lighter**: `#12141e` — tertiary surface

### Accents
- **Cyan (Primary)**: `#00e5ff` — operational/scanning/interactive states
- **Cyan Dim**: `#00b8d4` — secondary cyan
- **Gold (Intelligence)**: `#d4af37` — analysis/intel/premium states

### Severity Scale
- **Critical**: `#ff1744` — red, pulsing glow for immediate danger
- **High**: `#ff6d00` — orange, elevated concern
- **Medium**: `#ffab00` — amber, monitor status
- **OK**: `#00e676` — green, healthy state

### Glass Surfaces
- **Glass Default**: `rgba(12, 14, 22, 0.85)` with `backdrop-blur: 12px`
- **Glass Heavy**: `rgba(6, 6, 10, 0.92)` with `backdrop-blur: 20px`
- **Glass Border**: `rgba(255, 255, 255, 0.06)` — 1px border
- **Glass Border Hover**: `rgba(255, 255, 255, 0.12)` — hover state

### Text
- **Primary**: `#ffffff` — white
- **Muted**: `rgba(255, 255, 255, 0.6)` — secondary text
- **Dim**: `rgba(255, 255, 255, 0.4)` — tertiary/labels

## Typography

### Font Families
- **Display & Body**: `Outfit` (Google Fonts) — weights 300-700
- **Data & Labels**: `JetBrains Mono` (Google Fonts) — weights 400, 500, 700

### Scale
- **2xs**: 0.625rem / 10px — micro labels
- **xs**: 0.75rem / 12px — metadata, captions
- **sm**: 0.875rem / 14px — body text
- **base**: 1rem / 16px — primary content
- **lg**: 1.125rem / 18px — section headers
- **xl+**: Rarely used — this is a data-dense dashboard

### Label Pattern
- Uppercase, letter-spacing `0.05em`, `JetBrains Mono` bold, `dim` color
- Example: `ROAD CLASS`, `RISK TIER`, `CONDITION SUMMARY`

## Spacing & Layout

### Panel Structure
- Full-height sidebar: `w-96` (384px) right-aligned
- Collapsible stats panel: left-aligned, animated width
- Map fills remaining center space
- Header: fixed top, full width

### Spacing Scale
- Tight: `4px` (gap-1) — inline elements
- Default: `8-12px` (p-2, p-3) — card padding
- Comfortable: `16-20px` (p-4, p-5) — section padding
- Generous: `24px` (p-6) — modal/empty state padding

### Border Radius
- Glass panels: `12px`
- Buttons: `8px` (rounded-lg)
- Badges: `6px` (rounded-md)
- Pills: `9999px` (rounded-full)

## Component Patterns

### Glass Panel
```css
background: rgba(12, 14, 22, 0.85);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.06);
border-radius: 12px;
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
```

### Glass Button (Accent)
```css
background: rgba(0, 229, 255, 0.1);
border: 1px solid rgba(0, 229, 255, 0.3);
color: #00e5ff;
font-family: 'JetBrains Mono';
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.05em;
```

### Severity Glow Badge
- Background: severity color at 12% opacity
- Border: severity color at 30% opacity
- Text: severity color at full
- CRITICAL gets `animation: riskGlow 2s ease-in-out infinite`

### Map Markers
- Unanalyzed: cyan dot with subtle outer glow
- Analyzed: severity-colored circle with radial gradient + glow ring
- Selected: bright cyan ring + scale up

## Animations

### Transitions
- Panel slide: `0.3s ease [0.25, 0.46, 0.45, 0.94]`
- List stagger: `0.05s` delay between items
- Modal scale-in: `0.3s` with spring physics
- Fade: `0.4s ease-out`

### Ambient
- Scan line: cyan gradient sweeping vertically (2.5s loop)
- Risk glow: pulsing opacity + subtle scale on CRITICAL badges
- Breathe: slow opacity cycle for loading states (3s)
- Shimmer: gradient slide for skeleton loaders (2s)

## Background Treatment
- **Topographic contour lines**: 9 radial gradients creating subtle terrain map effect
- **Film grain**: SVG `feTurbulence` overlay at very low opacity
- **Vignette**: radial gradient darkening edges

## Icons
- **Library**: Lucide React (tree-shakeable)
- **Style**: 1px stroke, sized to context (w-3 to w-6)
- **Colors**: inherit from text color, accent for interactive

## Framework
- React 18 + Vite 5 + Tailwind CSS 3
- Framer Motion for animations
- Recharts for data visualization
- Zustand for state management
- Leaflet for maps (CartoDB dark_matter tiles)
