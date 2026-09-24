# Boule de Pain website

A complete, fast website for Boule de Pain. It keeps the look of the current
Wix site and uses the same photos and the same Instagram, Facebook, Yelp,
email and phone links.

## Preview it

Double-click `index.html`. Every page, the menu, the cart and the forms work
right away in your browser.

## Put it online

Upload this whole folder to any static web host. The easiest options:

- **Netlify:** go to app.netlify.com/drop and drag this folder onto the page.
- **Cloudflare Pages**, **Vercel** or **GitHub Pages** also work.

Then connect the domain bouledepain.com in your host's settings. The
`_redirects` and `vercel.json` files send old Wix links (like `/home` or
`/general-5`) to the matching new pages.

## Things to finish

1. **Video.** See `assets/video/ADD-VIDEO-HERE.txt`.
2. **Forms and orders.** Right now, forms open the visitor's email app with
   the message filled in, which works on any host. To have messages arrive
   automatically, create a free form at formspree.io, then set these values in
   `assets/js/site-config.js`:

   ```
   "forms": { "provider": "formspree", "endpoint": "https://formspree.io/f/YOUR-ID", ... }
   ```

   On Netlify you can use `"provider": "netlify"` instead. The forms are
   already set up for Netlify Forms.
3. **Images.** Photos load from the bakery's Wix media library. If you ever
   close the Wix account, download the images first and update the links.

## Chatbot

The chat button on every page is the Boule de Pain chatbot. It runs on
Cloudflare (the `boule-de-pain-chatbot` folder next to this one) and is
connected in `assets/js/site-config.js`:

```
"chatbot": { "workerUrl": "https://bouledepain-chatbot.bouledepain.workers.dev" }
```

It answers from this site's menu, hours, ordering rules and main pages.

- **Menu, prices, sold out, hours, closed days and the announcement** come
  straight from the admin panel: the bot knows about a publish within about a
  minute.
- **Page text:** once the site is online at bouledepain.com, the bot reads the
  pages directly (changes show within about 10 minutes). Until then it uses a
  saved copy of the site: after changing page text, double-click
  `Update chatbot.command` in the chatbot folder.
- **Another address:** if you put the site on another address first (like a
  Netlify, Vercel or GitHub Pages link), add that address to the bot's
  `ALLOWED_ORIGINS` setting (see the chatbot folder's `README.md`).
- **Hide the chat button:** set `workerUrl` to `""`.

## Admin panel

`admin.html` is the door to the admin panel
(https://bouledepain-admin.bouledepain.workers.dev/admin), where you change
prices, items, photos, what's sold out, hours, closed days, special hours, the
announcement bar, delivery rules, farmers markets and the Wholesale page
without touching any files.

- **Published changes show right away:** every page asks the panel for the
  latest published version when it opens (`assets/js/live-data.js`). If the
  panel can't be reached, the site uses its own files.
- **The files follow too:** a GitHub Action (`.github/workflows/bake.yml`,
  every 15 minutes) copies each publish into `assets/js/site-config.js` and
  `assets/js/menu-data.js` and commits them. You can also run it by hand in
  GitHub under **Actions → Copy admin panel changes into the files → Run
  workflow**, or on your computer with `node tools/bake.mjs`. Because GitHub
  adds these commits itself, pull (`git pull`) before you change files on your
  computer.
- **On your computer:** double-click `admin.html` and choose test mode
  (owner: `admin` / `1234`, staff: `staff` / `1234`). Changes save only in
  that browser and show on this copy of the site.
- **Preview links** (`?preview=…` on any page) show unpublished changes from
  the panel for 3 hours, with a bar at the top of the page.

## Accessibility

The blue button in the bottom-right corner opens the accessibility options
(text size, spacing, readable font, contrast, highlighted links, reading
guide, big cursor, stopped animations, read aloud). It's in
`assets/js/a11y.js` and the end of `styles.css`. The site itself is built and
tested for WCAG 2.1 AA; the panel is extra help, not a substitute, so keep
new pages using the same headings, labels and colors.

## Where to change things

| What | File |
| --- | --- |
| Menu, prices, sold out, photos, hours, closed days, special hours, announcement, delivery rules, markets, wholesale | the admin panel (its changes are copied into the two files below) |
| Phone numbers, email, address, social links, forms, gift card amounts | `assets/js/site-config.js` |
| The menu as a file (kept in step with the panel) | `assets/js/menu-data.js` |
| Page text and images | the `.html` files |
| Colors and fonts | `assets/css/styles.css` (top of the file) |
| Chatbot connection | `assets/js/site-config.js` (`chatbot` → `workerUrl`) |
| Admin panel connection | `assets/js/site-config.js` (`admin` → `url`) |
| Accessibility options | `assets/js/a11y.js`, end of `assets/css/styles.css` |

Hours, the cutoff time, delivery days and market days in the page text all
update from these files (and from the admin panel) when the page loads.

Closed days and special hours are set in the admin panel (**Hours & closed
days**). The open/closed sign, the contact page and the order dates follow
them.
