# ValueClub v17

- White background added to the Zenbook S14 image tile.
- iPhone Duo is always the first hero and links directly to its 512GB Star White product page.
- Replaced the old printer and Acer hero banners with live square Instax Pal 2 and Huawei Watch GT 7 Pro creatives from online.challenger.sg. No F1 campaign.
- Each of the six laptop cards opens its matching product page. Campaign cards and See all open their matching collections; membership, privacy and warranty actions have explicit destinations.
- Removed the rule that sent any message mentioning challenger.sg to the homepage.
- Banner swipe dots update without rendering the page. Native horizontal scrolling and snapping remain; indicator movement uses transforms.
- iPhone promotion pop-up uses a small slide and fade instead of scaling its image, text and shadow. The shade and card animate separately, with temporary layer hints cleared after animation. Likely promotion images decode while idle.
- Retains v16 back animation, detail scroll restoration, tab state retention, gesture guards and navy header animation. Tap the selected tab to return to its root; tap again to scroll to top.

Validation: 138 browser assertions passed (60 normal navigation, 60 reduced motion, 18 shopping/promotion). All 16 checked product/collection destinations returned valid content. JavaScript syntax and ZIP integrity checked. Preview frame intervals averaged about 8.3 ms during the promotion test; these are desktop measurements, not a physical iPhone guarantee. Physical Safari/PWA testing remains necessary to confirm device frame rate.

Live banner sources were read from Challenger's homepage on 11 October 2026. Their destinations and image provenance are included in SHOP-LINKS.json. External store availability, prices and campaigns can change; existing prototype product prices remain illustrative.
