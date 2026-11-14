# Shops

Shop profiles and onboarding: the 5-step wizard (details, map pin, hours, photos, verification documents), the public shop page, share link and QR poster.

- Actions: `createShop`, `updateShop`, `submitForVerification`, `setAcceptingToday`
- Tables: `shops`, `shop_members`, `shop_categories`, `media`, `slug_redirects`
- Revalidate the shop's page tag on every change; a renamed slug writes `slug_redirects`.
