# ValueClub v19

- Warranty (My protection / Extended warranty) and Rewards (All vouchers / My vouchers) now have sliding content and a moving selection pill. The header and bottom navigation stay in place.
- Swipe within section content to change sections. Content follows the finger; cancelled gestures settle back. Vertical scrolling, the left-edge Back gesture and nested horizontal scrolling retain priority.
- Each section remembers its own scroll, including after opening a detail page and returning. Rapid taps settle without orphaned transition layers.
- Added tab semantics, selected state, panel labelling and arrow-key navigation. Reduced-motion mode switches sections immediately.
- Tapping the active bottom tab from a detail page now slides back to its root, including from deeper pages. A subsequent tap scrolls the root to the top. Switching to another bottom tab remains immediate and restores that tab's state.
- Glass navigation has a lighter tint and softer shadow. Dark selected icons use white to retain contrast. Solid alternatives for accessibility and unsupported blur remain available. Content cards remain ordinary surfaces.
- Removed the expired iPad extended-warranty purchase action and stale Home reminder; its sample purchase window ended on 10 October.

Apple guidance checked: Liquid Glass belongs primarily in floating navigation and controls. Regular material balances translucency and legibility; clear material has restricted use cases. This CSS prototype approximates that appearance and does not reproduce native optical rendering or automatic system adaptation.

Sources:
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/videos/play/wwdc2025/219/
- https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass

Validation is recorded in TEST-RESULTS.json. It covers normal/reduced motion, section selection and cancellation, edge Back, nested scrolling, rapid taps, independent scroll restoration, keyboard navigation, glass contrast and responsive page layouts. Physical iPhone FPS and VoiceOver experience still require device validation.

The UX pass also extends the scroll-stop tap guard to the new section scrollers, while keeping section tabs responsive on the first tap during momentum scrolling. Nested horizontal scrollers retain their gestures.

Validation outcome: 908/908 browser assertions passed — 673 responsive layout, 47 glass, 60 normal navigation, 60 reduced navigation, 22 section gestures, 22 reduced section gestures, and 24 shopping/promotion/flicker checks. Syntax and ZIP integrity checks passed.
