# Design Reference (Figma Make) – Implementation Notes

Use the following Figma Make mocks as the canonical visual reference during UI implementation:

- https://www.figma.com/make/L7OK0ifZLX8cug66zTG9u2/Implement-Colorful-Mockup?t=88B8yHhSgNx8yXTy-1

## Goals
- Align UI, layout, motion, and visual hierarchy to the mocks.
- Implement using the repository’s existing stack and conventions.
- Avoid introducing new UI frameworks or ad‑hoc styles.

## Implement with the existing stack
- Next.js App Router (src/app)
- Tailwind CSS and existing theme tokens (tailwind.config.ts / globals.css)
- Shadcn/Radix UI primitives for components (button, card, dialog, tabs, dropdown, toast, etc.)
- Framer Motion for purposeful animations only

## Pages represented in the mocks
- Home (colorful hero, feature cards)
- Login (split gradient panel)
- Student Dashboard (KPIs, recent content, insights)
- Upload (drag & drop with progress)
- Authenticated Layout Shell (sidebar + header)

Note: Teacher dashboards exist in the mocks, but teacher workflows may be deferred per MVP scope. Focus first on student flows and shared/auth shells.

## Component guidance
- Buttons: Use Shadcn Button variants. Match mock colors with Tailwind utilities and theme tokens.
- Cards/Glass effect: Use a Card base with border, bg-slate-900/40, backdrop-blur, and subtle shadows to achieve glassmorphism.
- Badges/Status chips: Use Badge with brand-tinted backgrounds and clear text contrast.
- Progress bars: Use a simple gradient track for progress; rely on accessible labels for screen readers.
- Icons: Use lucide-react as in the repo; size via Tailwind classes.

## Motion & accessibility
- Use small entrance animations (opacity/y) for sections; avoid constant motion.
- Respect reduced motion (prefers-reduced-motion) where practical.
- Maintain color contrast >= WCAG AA; test dark backgrounds with brand accents.
- Keyboard focus states must remain visible on all interactive elements.

## Responsive behavior
- Use grid/flex from the mocks, but ensure breakpoints follow the project’s Tailwind defaults.
- Collapse multi-column layouts to single-column on small screens.
- Keep paddings/margins consistent with the project’s spacing scale.

## Do & Don’t
- Do reuse existing tokens, utilities, and Shadcn components.
- Do keep the layout shells (sidebar/header) single-sourced and shared.
- Don’t copy React Router patterns; adapt routes to Next.js App Router.
- Don’t introduce new third-party UI kits.

## Implementation checklist
- [ ] Map each mocked screen to a route under src/app (public, auth, student, shared).
- [ ] Compose screens from Shadcn primitives + Tailwind, matching mock spacing/typography.
- [ ] Implement skeleton/loading states for data sections.
- [ ] Add framer-motion only where it communicates hierarchy or state changes.
- [ ] Verify contrast and keyboard navigability across all new UI.

## Reference
- Product SRS: docs/requirements/refreshed-requirments.md
- Technical plan: docs/requirements/refresh-technical-details.md
- Design mock (Figma Make): https://www.figma.com/make/L7OK0ifZLX8cug66zTG9u2/Implement-Colorful-Mockup?t=88B8yHhSgNx8yXTy-1
