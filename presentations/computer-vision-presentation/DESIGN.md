---
name: Cyber Perception
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3e4947'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#712edd'
  on-secondary: '#ffffff'
  secondary-container: '#8b4ef7'
  on-secondary-container: '#fffbff'
  tertiary: '#7f4025'
  on-tertiary: '#ffffff'
  tertiary-container: '#9c573a'
  on-tertiary-container: '#ffe5db'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#ebddff'
  secondary-fixed-dim: '#d3bbff'
  on-secondary-fixed: '#250059'
  on-secondary-fixed-variant: '#5b00c5'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb598'
  on-tertiary-fixed: '#370e00'
  on-tertiary-fixed-variant: '#72361b'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 80px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.25'
  body-lg:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.65'
  body-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1360px
  gutter: 32px
  section-padding: 80px
  base-font-size: 21px
  visual-height-min: 450px
  visual-height-max: 500px
---

# Design System - Cyber Perception (Projector Optimized)

This design system is optimized for high-visibility widescreen classroom projections, emphasizing clarity and structural balance in educational settings.

## Design Philosophy
The brand utilizes a high-contrast light mode palette to ensure maximum legibility when projected onto screens in various lighting conditions. By moving away from dark mode, the system provides a cleaner, more academic aesthetic that reduces visual fatigue in bright rooms.

## Sizing & Aspect
To prevent visual stretching and minimize dead space at the top and bottom of widescreen projections:
1. **Vertical Lengths**: Visual containers (like images, plots, and simulations) must have set heights (e.g., `450px` to `500px`) instead of flat aspect ratios to fill the vertical canvas consistently.
2. **Typography Scale**: Base HTML font size is set to `21px` to scale all typography, margins, and component paddings dynamically. This ensures that text remains legible from the back of the classroom.
3. **Container Limits**: Spacing is managed using `max-w-6xl` (1152px) or `max-w-7xl` (1312px) to keep content centered and balanced within the projection field.

## Typography Transition
The system transition from JetBrains Mono to **Public Sans** for labels and UI metadata emphasizes readability over a "coder" aesthetic, while maintaining **Geist** for primary text to ensure a modern, clean feel.
