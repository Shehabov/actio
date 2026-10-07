# Card taxonomy

Moved verbatim from `actio-design-system/SKILL.md` on 2026-10-07. Read it when the surface
carries an issue card, a panel card, an alert row or any other card.

An issue is an object and takes a card. A queue is a list and takes rows. Forty issues
rendered as cards cannot be scanned.

| Card | Use | Anatomy |
|---|---|---|
| **Issue card** | One issue, in detail | Title H3, status pill inline-end, meta line in Small, body, actions block-end, identifier in Plex Mono at the block-end inline-end corner |
| **Panel card** | A chart, a list, a grouped readout | Header row: title H3 inline-start, one action inline-end as a text button with a chevron. Hairline beneath the header. Body padded 24. |
| **Alert row** | Something needs attention | **Left accent rule 3px at radius 0**, the panel surface as its ground, Ink 150 hairline between rows where alerts stack. Never a tinted fill, and never Ink 50, which is the page itself. Icon, message, then one text action. |
| **Metric tile** | A reading | A panel one step up, 48 padding, no border, no shadow. See above. |

Rules that hold for all of them:

- 12px radius, no shadow. Only overlays lift.
- Surface by the Smoothness §1 split: a card lifts off the page with the tint step, white on
  the Ink 50 page, not with an outline. Ink 150 hairlines stay between repeated records and
  as an internal divider, such as the rule under a panel card's header. Settled in `BRAND.md`
  v1.5 §1.1: a panel lifts by a tint step, never by an outline.
- 24px padding. 16px on mobile.
- **A card never contains another card.** Group inside a card with a hairline and space.
- Every issue card carries its identifier, Plex Mono, block-end inline-end. It is how
  support conversations locate an item.
