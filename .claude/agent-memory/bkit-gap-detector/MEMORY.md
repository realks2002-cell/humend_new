# Gap Detector Memory

## Project Context
- HumendHR: staffing platform (Next.js 16 + Supabase + Capacitor)
- DB references: `clients` table (not `workplaces`), `members` table (not direct auth.users)
- Automation: Vercel Cron (not pg_cron/Edge Functions) -- verified pattern in vercel.json

## Analysis History
- **location-tracking** v1.0 (2026-03-04): Match Rate 82%. 7 MISSING gaps identified.
- **location-tracking** v2.0 (2026-03-04): Match Rate 95%. All 7 gaps RESOLVED. Polling 1min->3min, FCM calls added (arrival, noshow stages 1-2, noshow confirm, shift cancel), 2hr auto-stop timer added. Phase 5 nav confirmed. See `docs/03-analysis/location-tracking.analysis.md`

## Key Patterns
- Server Actions in `src/app/**/actions.ts`
- Native API bridge in `src/lib/native-api/` (fetch-based, not server actions)
- Push notifications via `src/lib/push/` + `fcm.ts`
- Types defined in `src/types/`
- Capacitor plugins in `src/lib/capacitor/`
