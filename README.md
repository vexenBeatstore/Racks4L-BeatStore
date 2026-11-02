# Racks4L Beats — Beatstore starter

Dark premium BeatStore: black/graphite interface, white typography and icy cyan accents. Includes React/Vite frontend, Cloudflare Worker API, D1 schema, custom player, catalog, license cards, cart, account login/register, order creation, admin-only beat creation and order confirmation.

## Requirements
- Node.js 20+
- Cloudflare account with Workers + D1
- Supabase project and Storage bucket
- Telegram bot (optional for Telegram sign-in/delivery)

## Run locally
```bash
npm install
npm run dev
```
Frontend uses `VITE_API_URL` for API base. Create `.env.local`:
```
VITE_API_URL=http://localhost:8787
```
Run Worker locally after setup:
```bash
npx wrangler d1 create racks4l-beats
# update database_id in wrangler.toml
npx wrangler d1 execute racks4l-beats --local --file=./schema.sql
npx wrangler dev
```

## Deploy
1. Set your D1 database ID in `wrangler.toml`.
2. Apply schema: `npx wrangler d1 execute racks4l-beats --remote --file=./schema.sql`.
3. Set Worker secrets:
   - `wrangler secret put JWT_SECRET` (random long secret)
   - `wrangler secret put TELEGRAM_BOT_TOKEN` (bot token)
   - `wrangler secret put SUPABASE_SERVICE_ROLE_KEY` (Supabase service role; never put in frontend)
4. Configure vars `SITE_URL`, `SUPABASE_URL`, `SUPABASE_BUCKET`, `TELEGRAM_BOT_USERNAME`.
5. Deploy API: `npx wrangler deploy`.
6. Build frontend `npm run build`, deploy `dist/` using Cloudflare Pages. Add `VITE_API_URL` to Pages environment variables pointing to Worker origin.
7. Add first admin account by changing role in D1:
```sql
UPDATE users SET role='admin' WHERE login='YOUR_LOGIN';
```
Do this only for your intended administrator.

## Storage and media
Beat rows hold preview and licensed media URLs. Upload media to the configured Supabase Storage bucket and paste URLs into admin beat record. The included API uses server-side D1 fields and does not expose the Supabase service key. For a production release, implement signed URLs/private bucket delivery and Telegram Bot API delivery in the order-confirmation endpoint. The public frontend must never receive Supabase service-role credentials.

## Telegram login
Worker validates Telegram Login Widget payload against `TELEGRAM_BOT_TOKEN` with the official data-check algorithm and one-day auth freshness. Configure Telegram widget with the bot username. UI currently provides login/password and a placeholder note for adding the Telegram widget callback; do not consider Telegram auth UI enabled until the widget is mounted and posts payload to `/api/auth/telegram`.

## Important implementation notes
- Order checkout currently creates pending orders. Admin confirmation marks order paid; it does not yet automatically send Telegram messages or create signed/private downloads. Add delivery workflow and payment provider integration before accepting real payments.
- Payment provider is intentionally not configured because credentials and chosen provider are not provided.
- Demo beat cards are shown if API has no active beats. Demo cards are not purchasable via API until real beat records exist.
- Keep secrets in Cloudflare Worker secrets, not GitHub.
