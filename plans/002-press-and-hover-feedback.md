# 002 — Fix press feedback and hover transitions on the public pages

> [!IMPORTANT]
> **DONE — executed. Do not run again.**
>
> Step 3 was a no-op in `marketing-page.module.css`: all three `:hover` rules
> there change `text-decoration` only, which is safe on touch, so per the step's
> own instruction nothing was wrapped. The one hover that did change more than
> colour was `.footerSocial` in `landing.module.css`, and it is now gated on
> `(hover: hover)`. Tokens are spelled `--dur-press` / `--dur-fast`, not
> `--duration-*` — see README.
>
> The Problem section below describes the state before this plan ran. See
> [README.md](README.md) for the verification status of the whole set.

- **Status**: DONE
- **Commit**: 9e2004b
- **Severity**: HIGH
- **Category**: Physicality & origin; Performance
- **Estimated scope**: 3 files, ~25 lines

## Problem

**A. Press feedback has no transition, so it snaps.**

```css
/* src/features/landing/landing.module.css:37 — current */
.page button:active,
.page a:active {
    transform: scale(.97)
}
```

`transform` changes with no `transition` property, so the element teleports to
97% on press and teleports back on release. Press feedback is the most frequently
seen animation on the page, and a jump is exactly what a physical button does
not do. It also applies to every `<a>` inside `.page`, which means the four nav
text links and every inline prose link shrink when tapped — text is not
pressable furniture and should not deform.

**B. The primary button's hover does nothing, because `filter` is not in its
transition list.**

```tsx
/* src/components/ui/button.tsx — current, base class string */
transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150
/* src/components/ui/button.tsx — current, marketing variant */
"bg-[image:var(--marketing-action)] text-white shadow-sm shadow-marketing-ink/15 hover:brightness-[1.12]"
```

`brightness()` is a `filter`, and `filter` is absent from the transition
property list, so the hover state applies instantly with no ramp. The
`marketingOutline` variant transitions correctly (`background-color` is listed),
so the two buttons in the same CTA row behave differently on hover.

**C. Hover motion is not gated to devices that hover.** Tapping on iOS applies
`:hover` on first tap. The repo already knows this — `src/app/globals.css` defines
a custom `hover` variant gated on `(hover: hover)` for Tailwind — but the CSS
modules' bare `:hover` rules are ungated.

## Target

```css
/* target — src/features/landing/landing.module.css, replacing lines 37-40 */
.page button:active {
    transform: scale(.97)
}

.page button {
    transition: transform var(--duration-press) var(--ease-out)
}
```

```tsx
/* target — src/components/ui/button.tsx base class, filter added */
transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] duration-150
```

Values are fixed: press scale **0.97**, press duration **160ms**
(`--duration-press`), curve **`--ease-out`**. Do not substitute other numbers.

## Repo conventions to follow

- Motion tokens `--duration-press` and `--ease-out` are added by plan 001 in
  `src/app/globals.css`. **This plan depends on 001** — if those tokens are not in
  `globals.css`, stop and execute 001 first.
- `src/app/globals.css` already defines the gated hover variant; read the
  `@custom-variant hover` block near the top of that file to see the reasoning
  before touching any `:hover` rule.
- The app's Button is `src/components/ui/button.tsx`, a cva component. Add to the
  existing class strings; do not restructure the variant table.

## Steps

1. In `src/features/landing/landing.module.css`, replace the rule at lines 37-40
   with the two rules from **Target**: keep `:active` scaling on `button` only,
   drop `a` from it entirely, and add the `transition` on `.page button`. Add a
   comment saying links are not pressable surfaces, so they get colour feedback
   rather than deformation.

2. In `src/components/ui/button.tsx`, append `,filter` inside the
   `transition-[…]` bracket list in the base cva string. Change nothing else in
   that string.

3. In `src/features/marketing/marketing-page.module.css`, wrap the two hover
   rules that change more than colour in a hover-capable guard. Find
   `.cardLink:hover` and `.inlineLink` / `.footNote a:hover` and leave pure
   `text-decoration`/`color` hovers alone (they are safe on touch); only wrap any
   rule whose hover changes `transform`, `box-shadow` or `background`. If no such
   rule exists in that file, skip this step and note it — do not invent one.

4. In `src/features/landing/landing.module.css`, find `.waitlistForm` and confirm
   the input has a visible focus treatment. It currently sets `outline: none` on
   the input with no replacement. Add:

   ```css
   .waitlistForm:focus-within {
       border-color: var(--flow);
       box-shadow: 0 12px 35px rgba(9, 31, 55, .08), 0 0 0 3px rgba(0, 184, 148, .18);
       transition: box-shadow var(--duration-hover) var(--ease-out), border-color var(--duration-hover) var(--ease-out)
   }
   ```

   placed directly after the existing `.waitlistForm` rule.

## Boundaries

- Do NOT remove `active:scale-[0.98]` from the Button's base class; the CSS module
  rule and the Tailwind one both land on the same element and agree closely
  enough. Only the CSS module rule gains the transition.
- Do NOT change any colour, radius, padding or font.
- Do NOT touch app-shell components (`src/components/sidebar.tsx`,
  `src/features/dashboard/**`).
- Do NOT add dependencies.

## Verification

- **Mechanical**: `pnpm typecheck`, `pnpm lint`, `pnpm build` all clean.
- **Feel check**: `pnpm dev`, then on `/waitlist`:
  - Press and hold the *Join waitlist* button: it should sink smoothly over about
    a sixth of a second and rise back the same way, with no snap at either end.
  - Hover *Join waitlist* then *Log in* in the same row: both should brighten at
    the same rate. Before this plan, the gradient one changed instantly.
  - Tap a nav link on a phone (or DevTools device mode with touch): the label
    must not shrink.
  - Tab into the waitlist email field: a visible ring appears (it currently has
    `outline: none` and nothing else).
  - DevTools → Animations at 10%: the press ramp is visible, not a single frame.
- **Done when**: `grep -n "page a:active" src/features/landing/landing.module.css`
  returns nothing and `grep -o "transform,filter" src/components/ui/button.tsx`
  matches.
