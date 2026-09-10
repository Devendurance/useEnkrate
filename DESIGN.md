---
version: alpha
name: Enkrate
description: "Quiet-confidence automation for tokenized-stock execution with visible, user-defined guardrails."
colors:
  primary: "#0F1596"
  primaryDeep: "#060A4D"
  canvas: "#FFFFFF"
  surfaceSecondary: "#F7F6F2"
  accent: "#D4FF4D"
  accentPressed: "#B0E01A"
  ink: "#0A0A0A"
  inkPressed: "#000000"
  ink900: "#1A1A1A"
  ink700: "#4A4946"
  muted: "#9A9890"
  border: "#E7E5DF"
  borderDisabled: "#C7C5BE"
  linkHover: "#0B0F73"
  statusReject: "#C0392B"
  white: "#FFFFFF"
  statusPass: "#0F1596"
  statusWaiting: "#D4FF4D"
  statusInfo: "#0F1596"
typography:
  display-1:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "4.5rem"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  display-1-italic:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "4.5rem"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontVariation: '"ital" 1'
  display-2:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  heading-3:
    fontFamily: "General Sans, Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body-large:
    fontFamily: "General Sans, Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "General Sans, Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "General Sans, Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1
  caption:
    fontFamily: "Space Mono, 'Courier New', monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.04em"
rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  card: 16px
  feature: 20px
  highlight: 24px
  pill: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
  5xl: 128px
  6xl: 160px
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: 52px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: 52px
  button-primary-active:
    backgroundColor: "{colors.inkPressed}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: 52px
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: 52px
  button-secondary-hover:
    backgroundColor: "{colors.surfaceSecondary}"
    textColor: "{colors.linkHover}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: 52px
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: 52px
  button-accent-hover:
    backgroundColor: "{colors.accentPressed}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: 52px
  card-standard:
    backgroundColor: "{colors.surfaceSecondary}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: 24px
  card-feature:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.feature}"
    padding: 32px
  highlighted-container:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.highlight}"
    padding: "20px 24px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: 48px
  input-focus:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: 48px
  rule-card:
    backgroundColor: "{colors.surfaceSecondary}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: 24px
  guardrail-pass:
    backgroundColor: "{colors.statusPass}"
    textColor: "{colors.white}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  guardrail-waiting:
    backgroundColor: "{colors.statusWaiting}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  guardrail-rejected:
    backgroundColor: "{colors.statusReject}"
    textColor: "{colors.white}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  execution-receipt:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.feature}"
    padding: 32px
---

# Enkrate Design System

## Overview

Enkrate uses a **quiet-confidence** visual system for programmable execution with onchain guardrails. It keeps the supplied reference system's formal substrate—white canvas, saturated indigo, rare chartreuse, off-black chrome, editorial serif/sans typography, mono metadata, hairline rules, generous whitespace, and rounded card geometry—then replaces the reference meaning with Enkrate's own product logic: a user-defined rule moving through explicit checks before execution.

### Product high-risk moment

The critical moment is not the creation of a dashboard. It is the decision to **execute or reject a financial action**. The interface must make the conditions visible before the action, show the current state while waiting, and explain rejection in plain language. Decorative expression never outranks market-session status, oracle freshness, slippage, approved-token status, daily spend cap, or cancellation.

### Visual territory: Measured Motion

A controlled path moves through a small number of deliberate gates. The page remains stable and editorial; one line, marker, or field supplies movement. This creates a brand that feels precise and alive without looking like a trading casino, generic AI dashboard, or crypto terminal.

### Preserve / replace / reinterpret audit

| Layer | Retain from the supplied reference | Enkrate adaptation |
|---|---|---|
| Preserve | `#FFFFFF` canvas, indigo `#0F1596`, chartreuse `#D4FF4D`, off-black `#0A0A0A`, warm secondary surface `#F7F6F2` | These become the stable field, signal, and action hierarchy for Enkrate. |
| Preserve | `Fraunces` display, `General Sans` UI/body, `Space Mono` metadata | Editorial confidence carries the headline; functional sans carries decisions; mono marks machine state. |
| Preserve | 12-column grid, 4px spacing base, hairline navigation rule, single vertical logo divider | The layout behaves like a measured instrument rather than a crowded terminal. |
| Preserve | 6–8px functional corners, 16px standard cards, 20–24px feature/callout containers | Tight controls and softer proof surfaces separate action from explanation. |
| Replace | Reference-brand naming, generic poster/catalog meaning, and category-specific examples | Use Enkrate, Rules, Guard, Autopilot, Playbooks, Engine, Keeper, and Receipt. |
| Reinterpret | Blurred indigo field, lime focal moment, floating black cards, mono labels | The field becomes a condition map; lime becomes a guard attention point; cards become Rule Cards and Execution Receipts; labels become rule IDs and check states. |

### Ownable recurring asset: the Guarded Route

The Guarded Route is a thin indigo path with explicit gate marks and a final receipt block. It is not a generic progress bar or an abstract blockchain chain. It has a functional job:

- **Hero:** explains that a rule passes through conditions before it can run.
- **Rule builder:** previews the checks the user is about to configure.
- **Dashboard:** shows `Pass`, `Waiting`, or `Rejected` at each guard.
- **Receipt:** records which gates passed and why a rejected route stopped.
- **Share/demo surface:** makes the rejection path as visible as the successful execution.

Use the path sparingly. It must clarify sequence, not decorate empty space.

### Centered landscape landing hero

The landing hero is a centered, minimal composition. It does not use the Guarded Route directly:

- Place five small floating logo cards above the copy for the Coinbase tokenized stocks available on Base: `Meta`, `Google`, `Amazon`, `NVIDIA`, and `Apple`.
- Keep the approved Enkrate headline, one concise supporting sentence, and one primary `Create a rule` action centered in a readable measure of approximately `760px`.
- Use `HeroLandscape` as a full-width, pointer-events-none local looping video background. The supplied Enkrate video gives the hero a human, reflective relationship to control and autonomy while the meadow photograph remains available as its poster and reduced-motion fallback.
- Keep the artwork behind the content, with sufficient contrast for the headline, support copy, logo alt text, and CTA at every breakpoint. The artwork must not create horizontal scrolling.
- Let the landing shell's photo canvas run behind the desktop rail, transparent navbar, and hero. Keep the hero at least the height of the viewport below the header, with responsive spacing and smaller logo cards on narrow screens.
- The video and poster are decorative and must use `aria-hidden="true"`; the logo group remains semantic and is labelled `Coinbase tokenized stocks available on Base`.
- Use a subtle white-to-transparent wash over the upper sky to preserve readable black text without creating a boxed content panel. Keep the person, clouds, flowers, and meadow recognizable.
- Keep hero support copy in off-black rather than muted Ink 700 over the moving artwork. A restrained white text halo is allowed for contrast across changing video frames, but it must not become a boxed panel or obscure the landscape.
- The background video is muted, has no controls, loops inline, and remains behind the readability wash. Under `prefers-reduced-motion: reduce`, hide the video and show the static meadow poster with the same readable composition and no animated status meaning.

`HeroRulePassport` remains a reusable product illustration for other surfaces, but it is intentionally not rendered directly in the landing hero.

### State hierarchy

1. **Primary:** what the user is configuring or deciding now.
2. **Secondary:** amount, asset, cadence, trigger, next evaluation, and daily limit.
3. **Guard state:** Market session, Oracle freshness, Slippage, Spend cap, Approved token.
4. **Proof:** receipt, transaction link, timestamp, and failure reason.
5. **Metadata:** rule ID, network, last check, and resolver information.

### Core product rule

**Every screen should answer: what is the rule, what must be true, and what happens next?**

## Colors

### Primary palette

| Token | Hex | Role |
|---|---|---|
| Enkrate Indigo | `#0F1596` | Primary brand field, links, active route segments, and high-signal status surfaces. |
| Indigo Deep | `#060A4D` | Pressed/active depth, dark indigo field depth, and rare inverse emphasis. |
| Canvas White | `#FFFFFF` | Primary page background and normative light surface. |
| Off-Black | `#0A0A0A` | Primary text, nav chrome, primary buttons, and feature-card surface. |
| Ink 900 | `#1A1A1A` | High-emphasis text where softer contrast than off-black is useful. |
| Ink 700 | `#4A4946` | Labels, secondary text, and supporting explanations. |

### Accent and status palette

| Token | Hex | Role |
|---|---|---|
| Guard Lime | `#D4FF4D` | One focal guard, action, badge, or route marker per screen. Always paired with off-black text. |
| Guard Lime Pressed | `#B0E01A` | Pressed state for lime controls. |
| Link Hover | `#0B0F73` | Hover state for indigo interactions. |
| Reject Red | `#C0392B` | Rejection/error state, always paired with white text and explicit wording. |
| Border Hairline | `#E7E5DF` | Dividers, standard-card borders, and quiet structural separation. |
| Border Disabled | `#C7C5BE` | Disabled borders and inactive controls; never the only carrier of disabled meaning. |
| Muted | `#9A9890` | Placeholder and inactive metadata only; do not use for essential body text. |

### Semantic rules

- Use one saturated color moment per screen. Indigo and lime must not compete as equal-weight fields.
- Lime is a fill, not text. Put `#0A0A0A` on it.
- Do not communicate `Pass`, `Waiting`, or `Rejected` by colour alone. Pair colour with the written state and a recognisable icon or status marker.
- `Pass` uses indigo with white text; `Waiting` uses lime with off-black text; `Rejected` uses reject red with white text.
- Keep the primary page background white. Use `#F7F6F2` for cards and alternating sections, never for the core status message.
- Do not use gradients as a default. A soft indigo blur/grain field is an optional atmospheric layer behind hero content only.
- Keep state colours away from investment-performance implications. A green-like signal means a guard condition passed, not that an asset will appreciate.

### Accessibility

The normative text pairings are:

- Off-black on white or `#F7F6F2` for body and interface text.
- White on Enkrate Indigo or reject red for inverse status surfaces.
- Off-black on Guard Lime for accent controls and waiting status.
- Ink 700 on white or `#F7F6F2` for secondary text.

Do not use muted text for essential instructions, error explanations, prices, dates, or action labels. Maintain visible focus rings using Guard Lime at 60% opacity around the focused control, with a non-colour focus cue where required by the implementation.

## Typography

### Font families

- **Display:** `Fraunces`, with `Georgia`, `'Times New Roman'`, serif fallback. Use for hero statements and major section headings only.
- **UI/body:** `General Sans`, with `Inter`, `-apple-system`, `BlinkMacSystemFont`, sans-serif fallback. Use for all functional copy, navigation, forms, and explanations.
- **Technical/meta:** `Space Mono`, with `'Courier New'`, monospace fallback. Use for rule IDs, timestamps, network labels, transaction fragments, and compact state metadata.

### Type scale

| Role | Family | Size | Weight | Line height | Letter spacing | Use |
|---|---|---:|---:|---:|---:|---|
| Display 1 | Fraunces | 72px / 4.5rem | 400 | 1.05 | -0.02em | Hero headline; exactly one word may be italic. |
| Display 2 | Fraunces | 48px / 3rem | 400 | 1.1 | -0.01em | Section headings; italic used sparingly. |
| Heading 3 | General Sans | 24px / 1.5rem | 600 | 1.3 | -0.005em | Card and product-surface titles. |
| Body Large | General Sans | 18px / 1.125rem | 400 | 1.6 | 0 | Hero support and section introductions. |
| Body | General Sans | 16px / 1rem | 400 | 1.6 | 0 | Default copy and explanatory text. |
| Link/button | General Sans | 15–16px | 500 | 1.0–1.5 | 0 | Navigation, CTAs, and inline actions. |
| Input | General Sans | 15px | 400 | 1.4 | 0 | Form values and controls. |
| Caption/meta | Space Mono | 12px | 400 | 1.4 | 0.04em | Rule numbers, timestamps, tags, and network metadata. |

### Typography rules

- Set exactly one word in italic within a major editorial headline. Do not italicise every keyword.
- Keep Fraunces out of body copy, buttons, forms, and dense dashboard UI.
- Keep the Fraunces weight range narrow: regular and italic. General Sans carries the functional weight hierarchy.
- Use Space Mono for machine detail, not as a novelty headline font.
- Keep display line height tight and body line height generous.
- For financial values, use tabular numerals when the font implementation supports them. Do not make numbers decorative.
- The hero headline must state the product outcome or category within one read; typography cannot be used to hide ambiguity.

## Layout

### Spacing system

Use a 4px base unit:

`4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160px`

- `4–8px`: icon-to-label and status-marker spacing.
- `12–16px`: compact control padding and helper text gaps.
- `24px`: standard card padding.
- `32px`: related content groups.
- `48px`: sub-block separation.
- `64–96px`: major section separation.
- `128–160px`: desktop hero breathing room.

### Grid and container

- Maximum content width: `1280px`; hero visual may bleed toward `1440px` on very wide screens.
- Use a 12-column grid with `24px` gutters.
- Landing-page hero: centered editorial copy over the full-width landscape atmosphere, with five available-stock logo cards above it. The atmosphere begins at the top of the landing shell and continues behind the rail, navbar, and hero.
- Dashboard: use a stable primary column for active rules and a secondary column for guard state/receipts; do not turn every row into a separate card.
- Long-form explanations: single column, maximum readable measure around `720px`.

### Information hierarchy

For the product dashboard, place the next decision before historical data:

1. active rule and next evaluation;
2. guardrail status;
3. primary action or cancellation;
4. latest receipt;
5. history and technical detail.

The landing page can use generous whitespace, but the product surface must never hide the current status behind decorative motion or a collapsed panel.

### Whitespace philosophy

Use generous macro whitespace and efficient micro spacing. The page should feel calm because the hierarchy is clear, not because important information has been removed. Reserve loose composition for the hero atmosphere; keep execution details ruled, aligned, and easy to scan.

### Responsive breakpoints

| Breakpoint | Width | Behaviour |
|---|---:|---|
| Mobile | 0–599px | Single-column centered hero; compact logo cards stay in one readable row; Display 1 falls to approximately 40px; artwork remains behind the copy. |
| Tablet | 600–1023px | Centered hero gains breathing room; logo offsets become more editorial; secondary navigation condenses. |
| Desktop | 1024–1439px | Full-height landing landscape with centered copy and five floating logo cards; dashboard grids can show active rule beside guard status. |
| Wide | 1440px+ | Center the hero content in a readable measure while the landscape artwork fills the content field without moving essential copy. |

### Touch and input behaviour

- Minimum touch target: `40×40px`; recommended: `48×48px`.
- Keep at least `8px` between adjacent targets.
- Buttons and inputs retain their 44–48px height across breakpoints.
- The cancel action remains visible wherever a rule is active.
- Decorative route motion never blocks focus, scrolling, or status text.

## Elevation & Depth

Use depth as an information cue, not as decoration.

| Level | Treatment | Enkrate use |
|---|---|---|
| Flat | No shadow; hairline rule only | Navigation, base canvas, dividers, simple status rows. |
| Subtle | `0 1px 2px rgba(10,10,10,0.04)` | Rule Cards and resting inputs. |
| Base | `0 4px 12px rgba(10,10,10,0.08)` | Dropdowns, tooltips, and compact rule-builder overlays. |
| Medium | `0 12px 24px rgba(10,10,10,0.14)` | Popovers and hover-elevated proof surfaces. |
| High | `0 20px 40px rgba(10,10,10,0.25)` | Execution Receipt feature cards and modals. |
| Extra | `0 32px 64px rgba(15,21,150,0.25)` | Rare hero focal glow behind the indigo atmospheric field; never behind a critical error or price. |

A slight rotation may be used for a marketing hero receipt or presentation mockup. Never rotate a live Rule Card, a limit field, a rejection reason, or an execution control.

## Shapes

### Radius scale

| Radius | Use |
|---:|---|
| `0px` | Hairline dividers, table rules, nav edges. |
| `4px` | Compact tags and small status markers. |
| `6–8px` | Buttons, inputs, and icon buttons. |
| `16px` | Standard Rule Cards and ordinary containers. |
| `20–24px` | Execution Receipts, feature cards, and highlighted callouts. |
| `9999px` | Pills, avatar/logo badges, and compact filter chips only. |

### Shape language

Use frames, gates, route lines, checkpoints, receipt blocks, and measured rectangles. The distinctive mark may be an `E`/gate construction, but the UI should not fill the page with literal shield icons. Avoid candlesticks, upward arrows, generic sparkles, orbit lines, robot heads, infinity loops, stock-market towers, and Greek columns.

The Guarded Route should be drawn with a crisp line, a limited number of checkpoints, and a visible final state. It must be reproducible in static print, a dashboard, a monochrome favicon, and reduced-motion mode.

### Favicon

- Use an opaque white square canvas with the Enkrate mark rendered in black monochrome.
- Keep the mark centered with consistent padding and preserve enough contrast to remain recognizable at 16px and 32px.
- Do not use orange, photographic, or transparent treatments at favicon scale.

## Components

### Navigation

- Background: `#FFFFFF`.
- Text: `#0A0A0A`.
- Padding: `20px 48px` on desktop.
- Full-width bottom rule: `1px solid #0A0A0A`.
- One vertical `1px` divider immediately after the Enkrate mark.
- Suggested links: `Overview`, `Rules`, `Playbooks`, `Receipts`.
- Utility action: `Connect wallet` or `Open dashboard`, depending on state.
- On mobile, keep the divider and move the menu control to its right.

### Primary button

- Background `#0A0A0A`, white text, `0 24px` padding, `52px` height, and the `rounded.md` design token, which is 8px. This is the shared action geometry across the site.
- Hover shifts to Enkrate Indigo; active uses pressed off-black and a restrained `0.98` scale.
- Use for the single primary action: `Create a rule`, `Activate rule`, or `Run guarded execution`.
- Focus uses a visible `2px` indigo outline plus a `3px` Guard Lime ring at `60%` opacity with a `2px` offset.
- Disabled actions use a secondary-surface fill, disabled border, readable Ink 700 text, and a not-allowed cursor; disabled state is never communicated by opacity alone.

### Secondary button

- Transparent against the white canvas, off-black text and border, `0 24px` padding, `52px` height, and the `rounded.md` design token, which is 8px.
- Hover shifts border/text to Link Hover with a very light indigo tint.
- Use for `See how the guard works`, `View receipt`, or `Cancel rule` where cancellation is not destructive without confirmation.
- Secondary actions use the same focus and disabled contracts as primary actions.

### Accent control

- Guard Lime fill `#D4FF4D`, off-black text, `52px` height, and the `rounded.md` design token, which is 8px. It shares the same action geometry as primary and secondary actions.
- Use once per screen for a focal guard action, highlighted next step, or one attention marker.
- Never use lime as a page background or as text on white.

### Shared controls and landing frame

- `buttonClasses` is the shared contract for primary, secondary, and accent action buttons. Keep those variants consistent across navigation, wallet actions, and the rule builder.
- Icon-only controls use a separate `iconButtonClasses` contract with a recommended `48×48px` hit area, a `6px` radius, the shared focus ring, and a required accessible label. Selection cards remain separate controls with their `16px` radius and `24px` padding.
- On the landing route only, the desktop shell uses a `96px` transparent rail over the hero photograph. The rail divider and header bottom rule are removed for this opening canvas; the rail is hidden below the desktop breakpoint. Existing focus rings, active underlines, and hover states remain visible.
- The desktop rail mark sits inside a `92px` header-height flex wrapper and shares the navbar and wallet control's vertical centerline. Keep the existing horizontal rail and header placement unchanged.

### Landing landscape and stock-logo cards

- `HeroLandscape` uses the local `public/hero/enkrate.mp4` video mounted by the landing shell so it spans the rail, transparent navbar, and hero. The local `public/hero/hero-meadow.png` photograph is retained as the poster and reduced-motion fallback. Both layers are decorative, use `aria-hidden="true"`, and must remain `pointer-events-none`.
- Store supplied stock source images under `public/stock-logos/` with stable filenames. Render each logo in a fixed square wrapper with `overflow-hidden`, a subtle border/shadow, `object-fit: cover`, and centered positioning so the portrait source is cropped around its centered mark.
- The hero group contains six noninteractive visual cards: Base, Meta, Google, Amazon, NVIDIA, and Apple. The cards expose useful image labels and sit inside the labelled group `Base and tokenized stock brand examples shown on Base`.
- Keep all six cards visible without horizontal overflow from `320px` upward. Reduce card size and vertical offsets below `600px`; do not allow cards to overlap the headline.
- The visual group is not a claim that every displayed brand is currently tradable. Live rule controls continue to use only the verified assets in `src/lib/mainnet-config.ts`.
- Decorative landscape layers must not carry product state, eligibility, price, or execution meaning. Keep those messages in semantic text and existing eligibility surfaces. Landing sections below the opening canvas use solid canvas/surface backgrounds so the photograph does not continue behind product content.
- Use a centered `object-cover` crop that keeps the person visible below the sky-first content at desktop and mobile widths. Verify the hero in keyboard focus order, screen-reader order, monochrome, and reduced-motion mode. The decorative photo remains ignored by assistive technology while the logo names, headline, support copy, and CTA remain discoverable.
- Landing scroll uses Lenis with `autoRaf: false`, synchronized through the GSAP ticker. The document remains the scroll container: keyboard, wheel, touch, and anchor navigation must continue to work, and only the landing page's scrollbar chrome is hidden.
- Lenis dimensions must be resynchronized after initial layout, page load, viewport resize, and dynamic landing height changes. Observe the landing stack, main document, and footer so the smooth-scroll limit always matches the real document height.
- At desktop widths, the hero is a sticky opening sheet and the first canvas section rises over it with a restrained ScrollTrigger scrub. This stacking choreography is disabled below `1024px` and for reduced-motion users.
- Stock-logo cards may use a slow GSAP lift/scale/rotation on pointer hover. Animate compositor-friendly transforms only, keep the cards noninteractive unless they have an action, and remove the effect for reduced-motion users.
- Landing sections reveal once on scroll with an approximately `1.5s` opacity and vertical movement, using a soft `power2.out` ease and an approximately `32px` offset. The Guard section uses one dedicated sequence: intro, guard card, five checks at roughly `0.16s` stagger, rejection explanation, then waiting state. Motion must not change reading order or hide product meaning.
- A slim Base and tokenized-stock ticker may sit between the hero and first content sheet. Its duplicated visual track is decorative, has one semantic screen-reader description, moves right to left at a calm pace, and becomes static for reduced-motion users. On desktop, the ticker is an explicitly positioned layer above the first sheet's `-12vh` overlap so it remains visible during the cinematic handoff.
- The landing footer is the one full-width editorial exception to the desktop rail. It spans the rail and content columns, uses a narrow off-black surround around a large rounded canvas sheet, and ends with an integrated off-black legal bar. Keep the compact footer on dashboard routes.
- The landing footer uses truthful Enkrate content only: product statement, rule CTA, navigation, Base and Coinbase Tokenized Stocks context, eligibility, prototype status, and the Enkrate wordmark. Do not invent newsletter, contact, or social destinations.
- The landing footer uses the monochrome Enkrate wordmark on its light sheet, while the compact desktop rail uses the monochrome mark-only variant. Use off-black on light surfaces and white on dark surfaces. Do not introduce orange logo treatment into the UI.
- Supporting landing photography may use local tokenized-stock imagery inside an opaque editorial figure. Keep text outside the image, use responsive cropping, and provide informative alternative text when the image communicates product context.
- The hero, ticker, and first content sheet share a contained sticky opening stack. Later sections and the footer sit outside that containing block, so the sticky hero cannot remain behind them.
- Reveal motion must target inner content wrappers, Guard checks, or decorative tracks. Never fade or translate a section element that owns the opaque canvas or surface background, because the photo must not show through during a reveal. The ticker's opaque strip remains visible while only its inner track reveals.

### Landing motion and scroll accessibility

- Motion is enhancement, never the only way to understand the page. Keep the hero headline, logo names, support copy, and CTA in normal semantic order.
- Never apply `overflow: hidden` to the document to support smooth scrolling. Lenis must be destroyed and its ticker listener removed when the landing route unmounts.
- `prefers-reduced-motion: reduce` uses native scrolling, normal-flow hero/section layout, no sheet scrub, and static stock-logo cards.
- Enabled action buttons use a pointer cursor; disabled buttons retain a not-allowed cursor. Focus rings remain visible above all hover and scroll treatments.
- Rendered interface copy uses commas, colons, or separate sentences instead of em dashes. Internal documentation may use its own punctuation when it is not rendered into the interface.
- Eligibility dialogs must render outside page stacking contexts so they remain above sticky landing content, hero artwork, and navigation. Preserve Escape and backdrop dismissal without adding a focus trap unless explicitly required.

### Standard Rule Card

The Rule Card is the main active object, not a generic dashboard tile.

- Use the reference standard-card geometry: `#F7F6F2`, `24px` padding, `16px` radius, `1px #E7E5DF` border, subtle shadow.
- Show, in order: asset, amount, rule type, trigger/cadence, next evaluation, current state, daily cap, and cancel action.
- Use a mono label for rule ID and last evaluation; use General Sans for all decisions.
- Keep the active state visible as `Active — Monitoring`, not as an unexplained green dot.

### Guardrail Strip

The Guardrail Strip turns the high-risk execution moment into a readable sequence:

- Checks: `Market session`, `Oracle freshness`, `Slippage`, `Approved token`, `Spend cap`.
- Each check displays a written state: `Pass`, `Waiting`, or `Rejected`.
- Pair every state with an icon or text marker; colour is supplementary.
- On mobile, stack checks vertically in the order they are evaluated.
- A rejected check must expose the reason immediately, for example: `Execution rejected: oracle data is 21 minutes old.`

### Execution Receipt

Use the reference wide feature-card styling: off-black surface, white text, `32px` padding, `20px` radius, and high elevation.

Show:

1. `Executed within your rules` or `Execution rejected`;
2. rule ID and asset;
3. amount and timestamp;
4. checks passed or the exact failed condition;
5. transaction link when available;
6. cancellation or retry guidance when relevant.

The receipt is the product's proof surface. It should work as a dashboard record, a demo screenshot, and a shareable explanation without inventing performance claims.

### Rule builder

- Use a short, explicit step sequence: wallet/eligibility, recurring or conditional, approved token, amount and cadence/trigger, daily cap and slippage, guard preview, sign once.
- Use labels such as `What should happen?`, `When may it run?`, `What must be true?`, and `What is the daily limit?`.
- Keep helper copy below the field, not inside an ambiguous tooltip.
- The final preview must summarise the rule in plain language before signing.

### Inputs and states

- Input background `#FFFFFF`, text `#0A0A0A`, `14px 16px` padding, `48px` height, `8px` radius, `1px #C7C5BE` border.
- Focus: `2px #0F1596` border plus a `3px` Guard Lime focus ring at 60% opacity.
- Disabled state uses the secondary surface, a clear label, and an explanation; do not rely on low contrast alone.
- Error copy names the condition and recovery path. Avoid `Something went wrong` when the system can explain the reason.

### Status and empty states

- `Active — Monitoring`: the rule exists and is waiting for evaluation.
- `Waiting — Market closed`: the rule remains intact but cannot execute in the current session.
- `Rejected — Oracle stale`: the guard stopped the attempt and the user can inspect the data age.
- `Cancelled`: the rule will not be evaluated again unless recreated.
- Empty state: explain what a rule does and offer `Create a rule`; never fill the page with decorative charts.

## Do's and Don'ts

### Do

- Let one saturated colour carry the emotional weight of a screen.
- Use the Guarded Route as a repeatable product asset with a clear explanatory job.
- Make the rejection path as polished and legible as the successful execution.
- Preserve generous whitespace while keeping status and next actions visible.
- Use indigo for active route and brand signal; use lime for one deliberate guard moment.
- Use exact state language: `Pass`, `Waiting`, `Rejected`, `Active — Monitoring`, and `Cancelled`.
- Use real product UI, receipts, wallet states, and annotated condition diagrams as imagery.
- Support reduced motion: the route becomes static checkpoints with the same labels and sequence.

### Don't

- Do not use the visual system to imply guaranteed returns, risk-free investing, or perfect execution.
- Do not use lime text on white or let status colour stand without a written state.
- Do not use generic gradients, glassmorphism, neon trading-terminal effects, or glowing AI objects.
- Do not use shields, upward arrows, candlesticks, orbit lines, robot heads, infinity marks, or Greek columns as default symbols.
- Do not make every piece of content a rounded card; preserve flat canvas and ruled structure.
- Do not rotate live execution controls or hide limits inside a decorative mockup.
- Do not place Fraunces in forms, tables, buttons, or dense product status.
- Do not let blur, grain, or hero composition obscure price, eligibility, fee, cap, market-session, or rejection information.
- Do not describe the product as available to US residents; the eligibility boundary must remain visible wherever relevant.

### Implementation checklist

- Load `Fraunces`, `General Sans`, and `Space Mono` with the stated fallbacks.
- Implement the 4px spacing scale and radius tokens before composing screens.
- Build the Rule Card, Guardrail Strip, and Execution Receipt before decorative hero work.
- Test the design in monochrome, mobile width, keyboard focus, reduced motion, and a screen reader structure.
- Verify text/background contrast in the implementation, not only in the token file.
- Keep the product descriptor visible at first contact: `Programmable execution with onchain guardrails.`
