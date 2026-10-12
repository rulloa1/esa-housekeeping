# ESA Housekeeping — Design System

Design tokens and patterns for the Extended Stay America housekeeping tool.

## Brand

| Token | Value | Usage |
|-------|-------|-------|
| `esa-navy` | `#1B3A5F` | Primary brand, headers, active states |
| `esa-navy-dark` | `#132A45` | Gradient endpoints, dark accents |
| `esa-amber` | `#E8912D` | Accent, "due" status, guest notes |
| `esa-amber-light` | `#F5A84A` | Hover states, dark mode accent |

## Semantic Colors

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#F8FAFC` | Page background |
| `surface-raised` | `#FFFFFF` | Elevated surfaces (stats bar, nav) |
| `card` | `#FFFFFF` | Card backgrounds |
| `text` | `#0F172A` | Primary text |
| `text-secondary` | `#475569` | Supporting text |
| `muted` | `#64748B` | Tertiary text, icons |
| `success` | `#059669` | Done status, primary actions |
| `success-light` | `#10B981` | Success hover, dark mode |
| `declined` | `#94A3B8` | Declined/inactive status |
| `border` | `#E2E8F0` | Card borders, dividers |
| `border-light` | `#F1F5F9` | Subtle dividers |

### Dark Mode

| Token | Light Value | Dark Value |
|-------|-------------|------------|
| `esa-navy` | `#1B3A5F` | `#2563EB` |
| `surface` | `#F8FAFC` | `#0F172A` |
| `surface-raised` | `#FFFFFF` | `#1E293B` |
| `card` | `#FFFFFF` | `#1E293B` |
| `text` | `#0F172A` | `#F1F5F9` |
| `text-secondary` | `#475569` | `#CBD5E1` |
| `muted` | `#64748B` | `#94A3B8` |
| `border` | `#E2E8F0` | `#334155` |

## Typography

| Role | Family | Weight | Size |
|------|--------|--------|------|
| Display | Inter | 700 | 1.125rem |
| Body | Inter | 400–500 | 0.8125rem |
| Label | Inter | 600 | 0.6875rem |
| Meta | Inter | 500 | 0.8125rem |

**Letter spacing:** -0.01em for display, 0.04em for uppercase labels.

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 0.25rem (4px) | Icon gaps |
| `space-2` | 0.375rem (6px) | Tight grouping |
| `space-3` | 0.5rem (8px) | Nav item padding |
| `space-4` | 0.625rem (10px) | Card internal gaps |
| `space-5` | 0.75rem (12px) | Section gaps |
| `space-6` | 1rem (16px) | Card list gaps, page padding |
| `space-7` | 1.25rem (20px) | Card padding |
| `space-8` | 1.5rem (24px) | Stats bar gaps |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Buttons, inputs, small badges |
| `radius-md` | 10px | Action buttons, toasts |
| `radius-lg` | 14px | Cards |
| `radius-full` | 100px | Status badges (pill shape) |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(15, 23, 42, 0.04)` | Cards at rest |
| `shadow-md` | `0 4px 12px rgba(15, 23, 42, 0.08)` | Card hover, header |
| `shadow-lg` | `0 8px 24px rgba(15, 23, 42, 0.12)` | Expanded cards, toast |

Dark mode shadows use `rgba(0, 0, 0, 0.2–0.4)`.

## Motion

| Token | Value | Usage |
|-------|-------|-------|
| `transition-fast` | `0.15s cubic-bezier(0.4, 0, 0.2, 1)` | Hovers, press feedback |
| `transition-smooth` | `0.25s cubic-bezier(0.4, 0, 0.2, 1)` | Expand/collapse, chevrons |

Respect `prefers-reduced-motion` — collapse all durations to 0.01ms.

## Status System

| Status | Dot Color | Badge BG | Badge Text |
|--------|-----------|----------|------------|
| Due | `esa-amber` | `rgba(232,145,45,0.12)` | `#B5711F` |
| Done | `success` | `rgba(5,150,105,0.1)` | `#047857` |
| Declined | `declined` | `rgba(148,163,184,0.15)` | `muted` |
| Checkout | `esa-navy` | `rgba(27,58,95,0.1)` | `esa-navy` |

"Due" status includes a pulse animation ring (4px rgba halo).

## Component Patterns

### Card

- Background: `card`
- Border: 1px `border`
- Radius: `radius-lg`
- Shadow: `shadow-sm` → `shadow-md` on hover → `shadow-lg` expanded
- Internal padding: `space-7` horizontal, `space-6` vertical

### Action Button

| Variant | Background | Text | Border |
|---------|------------|------|--------|
| Primary | Gradient `success` → `#047857` | white | none |
| Secondary | `surface-raised` | `text` | 1px `border` |
| Flag | `rgba(220,38,38,0.08)` | `#DC2626` | 1px rgba |

All buttons: `radius-md`, padding `0.875rem 1.125rem`, weight 600.

### Toast

- Background: `text` (inverted)
- Text: `surface`
- Radius: `radius-lg`
- Shadow: `shadow-lg`
- Position: fixed, bottom 5.5rem, centered

### Bottom Nav

- Background: `surface-raised`
- Border-top: 1px `border`
- Active indicator: 3px bar, `esa-navy`, centered under icon
- Icon size: 22×22, stroke-width 1.75
- Label: 0.6875rem, weight 600

## Breakpoints

| Name | Value | Behavior |
|------|-------|----------|
| Mobile | < 600px | Single column, full-width cards |
| Tablet+ | ≥ 600px | Max-width 520px container, centered |

## Accessibility

- Minimum tap target: 44×44px
- Focus: 2px solid `esa-navy`, offset 2px
- Reduced motion: all animations/transitions disabled
- Color contrast: All text meets WCAG AA on respective backgrounds
