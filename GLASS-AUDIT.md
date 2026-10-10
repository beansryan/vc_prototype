# Liquid Glass audit — v16

The glass is a browser approximation of native materials. The previous standard backdrop filter included SVG displacement maps while the WebKit property used a different blur path. Those maps are removed. All glass surfaces use one local 12px blur with 140% saturation, a stronger light/dark tint and a static rim/shadow. Selected pills have a simple fill and no nested backdrop blur. Blur, saturation and shadow are not animated.

Header Back/Inbox glyphs use explicit contrasting colors instead of inheriting white band text over pale glass. Dark selected tabs/Scan use a lighter accent. Compact navigation labels are 12px; the large-text fixture uses 17px. Selected bottom tabs expose aria-current. Keyboard focus is visible. Unsupported blur, increased contrast, reduced transparency and forced colors have solid alternatives.

47 local-browser assertions passed: consistent computed blur, absence of SVG lens maps/nested pill blur, 44px minimum touch areas for audited controls, conservative tint contrast of at least 4.5:1, selected-pill alignment after one tap, selected-state semantics, solid fallback, Back contrast on navy and Scan returning to its originating tab. Contrast checks use conservative composited tint estimates over extreme backgrounds, not pixel-by-pixel contrast of every campaign asset. Physical Safari blur performance and OS accessibility preferences remain device acceptance checks.

## v19 Apple guidance review
Reviewed Apple's Materials HIG and WWDC25 Meet Liquid Glass session. Glass remains in the navigation/control layer, rather than spreading to content cards. The web approximation uses the regular variant's legibility principle, not the clear variant indiscriminately. Light tint is 0.66–0.60; dark tint is 0.76–0.72. A bounded 12px blur and 140% saturation remain static. The light shadow is reduced. Dark selected glyphs are white; contrast checks now use more conservative backing colours reflecting the new tint. High-contrast/reduced-transparency/unsupported-filter alternatives remain solid. Real Liquid Glass lensing, environmental luminosity adaptation and system appearance preferences are not implemented by CSS.

Sources: https://developer.apple.com/design/human-interface-guidelines/materials and https://developer.apple.com/videos/play/wwdc2025/219/ .
