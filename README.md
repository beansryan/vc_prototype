# ValueClub app prototype (iPhone 17)

A clickable web version of the ValueClub app design. Add it to an iPhone Home Screen and it opens full screen like a native app.

This is a prototype. Nothing connects to real systems. Accounts are stored only on the device.

## Put it on GitHub Pages

1. Create a new repository on GitHub, for example `valueclub-prototype`. It can be private if your plan allows private Pages.
2. Upload everything in this folder to the root of the repository: `index.html`, `app.js`, `assets/`, `icons/`, and the rest. Include the empty `.nojekyll` file.
3. In the repository, open **Settings > Pages**.
4. Under **Build and deployment**, set Source to **Deploy from a branch**, choose `main` and `/ (root)`, then **Save**.
5. After a minute the site is live at `https://<your-github-name>.github.io/valueclub-prototype/`.

To update it later, upload the changed files again. After uploading an update, fully close and reopen the app. The first load can still use the previous offline scripts while the new worker installs; reopen once more after installation. Updates do not force a reload during an active session. For this status-bar update, remove the existing Home Screen icon and add the site again.

## Install on an iPhone

1. Open the GitHub Pages link in **Safari**.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open ValueClub from the Home Screen. It runs full screen with no browser bars.

On a computer, the same link shows the app inside an iPhone 17 frame.

## What works

- **First open:** launch screen, loading skeleton, then the iPhone Duo message.
- **Browse as a guest:** home, rewards, deals and stores.
- **Sign up:** any name, an 8-digit mobile number and a password of at least 8 characters. Any 6 digits work as the code.
- **Log in:** any email or mobile number with any password. A new login opens as a 12-month member.
- **Log in with a code:** any 6 digits work.
- **Scan at checkout:** scanning completes on its own after a few seconds.
- **Motion:**
  - Pages slide in and out like iOS.
  - Swipe from the left edge to go back.
  - Tab bar (iOS 26/27 Liquid Glass): the selection pill stretches and slides between tabs, and the icon bounces.
  - Press and drag along the tab bar to move the glass lens and pick a tab.
  - The tab bar stays full size while you scroll, as in iOS 27.
  - Segmented controls slide.
  - Swipe left or right across a page with tabs (My protection / Extended warranty, All vouchers / My vouchers, Active / Done, savings periods) to switch tabs. Swiping from the very left edge still goes back.
  - Sheets and messages animate in and out, and toasts pop up.
  - Scan slides up, the scan line sweeps, and the success card rises in.
  - The scratch card peels off and coins burst out.
  - Buttons dim when pressed.
- **Saved progress:** tier, name, check-ins, claimed vouchers and settings stay saved after the app closes.
- **Links:**
  - Every website link opens https://online.challenger.sg.
  - Store directions open Apple Maps.
  - Call buttons open the phone dialler.
  - Email opens Mail.
  - Share opens the iPhone share sheet.

## Hidden gestures

- Tap the **ValueClub logo** 5 times quickly to reset. The app clears everything and starts again from the first open.
- Tap the **ValueClub logo** 3 times quickly to open the **dev menu**. From there you can:
  - switch tier (Guest, Free, 3-month, 12-month)
  - set the 3-month plan state and renewals
  - toggle birthday added
  - change the home banners and Coming up rows
  - set check-in, spin, spend reward, streak saver, featured game and campaign states
  - choose an inbox state and show any in-app message
  - change appearance and text size
  - restart or reset the app

## Notes

- Built for iPhone 17 portrait only.
- Light and dark mode follow the phone setting.
- Works offline after the first open.
- Uses Preact (MIT licence, see `PREACT-LICENSE`).
