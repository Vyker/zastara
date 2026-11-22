# ZASTARA — jewellery e-commerce site

Mobile-first luxury stacking-jewellery storefront. Originated from a Google AI
Studio (Stitch) export; rebuilt as a clean, editable static site for GitHub
Pages.

## Pages

| File | Page |
|---|---|
| `index.html` | Home (hero campaign, stack-studio teaser) |
| `collection.html` | Collection catalogue (filters, grid/list views) |
| `piece.html` | Product detail (views, sizes, accordions) |
| `stack-studio.html` | Ring Stack Studio (interactive) |
| `ear-studio.html` | Ear-piercing stack studio |
| `bag.html` | Shopping bag (live cart) |
| `checkout.html` | Checkout (mock) |
| `confirmation.html` | Order confirmation |
| `account.html` | Client account / saved stacks |

## How it works

- **No build required to view** — `site/` is plain HTML/CSS/JS, deploy as-is.
- **Tailwind CSS v3** is compiled (not the Play CDN). Source config:
  `tailwind.config.js` (design tokens merged from the Stitch export),
  input `input.css`. Rebuild after editing classes:
  ```bash
  npm install
  npm run build
  ```
- **Fonts/icons** load from Google Fonts CDN (EB Garamond, Inter, Material Symbols).
- **Cart** is a front-end demo: state in `localStorage` (`zastara_cart_v1`),
  15% stack discount auto-applies at 3+ pieces, checkout is mocked and issues
  a fake order number on `confirmation.html`. No payments.
- **Images**: all AI-generated product photography is self-hosted in
  `site/assets/img/`.
- Shared behaviour lives in `site/assets/js/site.js` (nav wiring via
  `data-path`, cart, toast, CTA mapping).

## Deploy

Repo root content = `site/` (deployed at repo root for Pages) or use
`site/` as folder source. Pages settings: branch `main`, folder `/` (this
repo's root IS the site).
