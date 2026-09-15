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

It answers from this site's menu (`menu-data.js`), hours and ordering rules
(`site-config.js`) and main pages.

- **Once the site is online** at bouledepain.com, the bot reads it directly,
  so its answers follow your changes within about 10 minutes.
- **Until then** (and when you open the files on your computer), it uses a
  saved copy of the site. After changing the menu, hours or pages,
  double-click `Update chatbot.command` in the chatbot folder.
- **Another address:** if you put the site on another address first (like a
  Netlify, Vercel or GitHub Pages link), add that address to the bot's
  `ALLOWED_ORIGINS` setting (see the chatbot folder's `README.md`).
- **Hide the chat button:** set `workerUrl` to `""`.

## Where to change things

| What | File |
| --- | --- |
| Hours, phone numbers, email, delivery rules, holiday closures | `assets/js/site-config.js` |
| Menu items, prices, sizes, extras, photos, advance notice | `assets/js/menu-data.js` |
| Page text and images | the `.html` files |
| Colors and fonts | `assets/css/styles.css` (top of the file) |
| Chatbot connection | `assets/js/site-config.js` (`chatbot` → `workerUrl`) |

Hours also appear as plain text in each page's header, so update the `.html`
files too if they change.

To add a holiday closure, add the date to `closedDates`, like
`"closedDates": ["2026-12-25"]`. The open/closed sign and the order dates will
follow it.
