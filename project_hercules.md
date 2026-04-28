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
- Plan generation pulls from the vault via Server Actions, filtered by cuisine preferences + dietary restriction tags
- `run-seed.ts` now uses Supabase client (REST) instead of direct postgres — direct DB connection is DNS-blocked locally

## Database schema (`db/schema.ts`)
- `profiles` — user stats, phase, activity level, cuisine_preferences[], dietary_restrictions[], training_program (JSONB — stores the full training program config)
- `recipes` — vault of 165 recipes with ingredients (JSONB), tags, macros (protein_g, carbs_g, fat_g)
- `meal_plans` — week × day × meal_slot → recipe_id per user (generates 4 weeks at once; grocery uses week_number=0)
- `training_plans` — week × day → workout with exercises (JSONB)
- `grocery_lists` — aggregated items (JSONB) with category, checked, **cost**; stored at week_number=0 (not per-week)
- `progress_logs` — dated weight entries

## Pages (all under `app/(protected)/`)
- `/dashboard` — macro rings (planned vs target using CAL_SPLIT), goal progress, today's meals + today's training from profile.training_program
- `/meals` — full 4-week meal plan view via `MealPlanView` component; setup/reconfigure via `ReconfigureSheet` (sheet on the page, not a separate route)
- `/meals/setup` — redirects to `/meals` (setup flow moved into ReconfigureSheet)
- `/grocery` — cost-tracking checklist with store picker (Walmart/Target/Sam's Club/Costco), collapsible categories, progress bar
- `/train` — full workout logging: ExerciseCard with set-by-set weight/reps input, suggested weights, set completion dots
- `/progress` — weight log + Recharts trend line
- `/profile` — edit stats + phase, shows computed macro targets

## Meal plan generation (`lib/actions/meal-plan.ts`)
- Supports **3, 4, or 5 meals per day** (MEAL_CONFIG)
- Supports **prep styles**: daily, batch_weekly, batch_biweekly
- Generates **4 weeks** at once (TOTAL_WEEKS = 4); deletes entire user plan before regenerating
- Recipe picker uses **weighted macro score**: protein 40%, calories 35%, fat 15%, carbs 10%; picks randomly from top 3 for variety
- Rest days get 0.85× calorie multiplier
- Week-over-week variety: seeds each week's exclusion list with previous week's picks
- Also imports and calls `generateGroceryList` from `lib/actions/grocery-list.ts`
- CAL_SPLIT values live in `lib/meal-scaling.ts` (shared with dashboard)

## Meal plan UI (`/meals` + `MealPlanView` + `ReconfigureSheet`)
- Loads all 4 weeks at once; user can tab between weeks
- Reconfigure sheet (not a separate page) lets user change cuisines/restrictions/meals-per-day/prep style and regenerate

## Grocery page (`/grocery`)
- Items have a `cost` field
- Store picker: Walmart (1.0×), Target (1.1×), Sam's Club (0.8×), Costco (0.75×) — applies multiplier to costs
- Store preference persisted to localStorage (`hc-store-pref`)
- Collapsible category sections with emoji icons
- Grocery list stored at week_number=0 (not tied to a specific week)

## Training page (`/train`)
- Full interactive workout logger (ExerciseCard)
- Set-by-set weight + reps input, completion checkboxes
- Suggested weights from `lib/training-utils.ts → getSuggested`
- Exercise info (unit type: weight_reps vs distance_time) from `lib/exercises.ts`
- Training program stored in `profile.training_program` (JSONB), accessed via `lib/program.ts`
- Progress updated after workout via `lib/actions/training.ts → updateProgressAfterWorkout`

## Key lib files
- `lib/macros.ts` — BMR/TDEE/macro calculations
- `lib/meal-scaling.ts` — CAL_SPLIT per meals-per-day config (shared across dashboard + meal plan)
- `lib/exercises.ts` — exercise metadata (name, unit type, muscle groups)
- `lib/templates.ts` — training program templates (ExerciseConfig type)
- `lib/program.ts` — AnyProgram type, getActiveDayInfo, isV2 helpers
- `lib/training-utils.ts` — getSuggested (weight suggestions)
- `lib/food-macros.ts` / `lib/macro-solver.ts` / `lib/portion-calc.ts` — nutrition calculation utilities

## Seed scripts (CLI)
```
npm run seed:recipes           # seed recipe vault (run once, uses Supabase REST now)
npm run seed:plans <user_id>   # meal + training + grocery in one shot
npm run seed:meals <user_id>
npm run seed:training <user_id>
npm run seed:grocery <user_id>
```

## Macros logic (`lib/macros.ts`)
- BMR via Mifflin-St Jeor, TDEE via activity multiplier
- Bulk: TDEE + 400 kcal | Cut: TDEE − 500 kcal | Maintenance: TDEE
- Protein: 1.0g/lb bulk, 1.2g/lb cut, 0.8g/lb maintenance

## Build order preference
User wants to build one system at a time — don't wire up the next system's UI until explicitly asked.
