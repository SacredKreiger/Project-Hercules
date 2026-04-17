---
name: Project Hercules
description: Next.js fitness app — meal plans, training, grocery, progress tracking. Hosted at SacredKreiger/Project-Hercules on GitHub, not yet deployed.
type: project
---

## Stack
- Next.js 16 (App Router), React 19, TypeScript
- Supabase (auth + database), Drizzle ORM (schema/migrations)
- Tailwind v4, shadcn/ui, Recharts
- Deployed: **not yet** — pushed to GitHub only

## Repo
`SacredKreiger/Project-Hercules` — branch `main`

## Key architecture decisions
- Mobile nav: custom drum-scroll capsule (`DrumNav.tsx`) swipe-in from right edge — iOS Camera Control inspired
- Desktop nav: `Sidebar.tsx` — hidden on mobile
- No API routes — server-side mutations use **Next.js Server Actions** (`lib/actions/`)
- Recipe data lives in a **seed vault** (`db/seeds/recipes.ts`, 165 recipes across 12 cuisines × 4 meal types) — seeded once via `npm run seed:recipes`
- Plan generation pulls from the vault on-demand via Server Actions, filtered by user cuisine preferences and dietary restriction tags

## Database schema (`db/schema.ts`)
- `profiles` — user stats, phase (bulk/cut/maintenance), activity level, cuisine_preferences[], dietary_restrictions[]
- `recipes` — vault of 165 recipes with ingredients (JSONB), tags, macros
- `meal_plans` — week × day × meal_slot → recipe_id per user
- `training_plans` — week × day → workout with exercises (JSONB)
- `grocery_lists` — week → aggregated items (JSONB) with category + checked
- `progress_logs` — dated weight entries
- Direct Postgres connection (`DATABASE_URL`) does **not** work locally — DNS blocked. Supabase client (REST) works fine.

## Pages (all under `app/(protected)/`)
- `/dashboard` — macro rings, goal progress, today's meals + workout
- `/meals` — weekly meal plan; empty state links to `/meals/setup`
- `/meals/setup` — cuisine preference picker + dietary restrictions → generates meal plan → redirects to `/meals`
- `/grocery` — checklist by category, loaded client-side
- `/train` — weekly training split view
- `/progress` — weight log + Recharts trend line
- `/profile` — edit stats + phase, shows computed macro targets

## Meal plan setup flow (`/meals/setup`)
- User picks cuisines (required, at least one) from 12 options
- User picks dietary restrictions (optional): vegetarian, vegan, gluten-free, dairy-free, nut-free, halal
- Server Action (`lib/actions/meal-plan.ts → setupMealPlan`) saves to profile, filters vault, generates 28 entries (4 slots × 7 days), redirects to /meals

## Seed scripts (for CLI use)
```
npm run seed:recipes           # seed recipe vault (run once)
npm run seed:plans <user_id>   # meal + training + grocery in one shot
npm run seed:meals <user_id>
npm run seed:training <user_id>
npm run seed:grocery <user_id>
```

## Macros logic (`lib/macros.ts`)
- BMR via Mifflin-St Jeor, TDEE via activity multiplier
- Bulk: TDEE + 400 kcal | Cut: TDEE - 500 kcal | Maintenance: TDEE
- Protein: 1.0g/lb bulk, 1.2g/lb cut, 0.8g/lb maintenance

## Preference: build one system at a time
User explicitly wants to finish meal plan system before touching training plan or grocery list generation via UI.

**Why:** Avoids scope creep and confusion mid-build.
**How to apply:** Don't wire up training/grocery UI generation until user asks.
