import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  pgEnum,
  date,
  boolean,
} from "drizzle-orm/pg-core";

export const phaseEnum = pgEnum("phase", ["bulk", "cut", "maintenance"]);
export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extra_active",
]);
export const mealTypeEnum = pgEnum("meal_type", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "shake",
]);
export const dayTypeEnum = pgEnum("day_type", ["work", "off", "cook"]);

// ── Users ────────────────────────────────────────────────────────────────────
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  name: text("name").notNull(),
  age: integer("age").notNull(),
  height_cm: real("height_cm").notNull(),
  current_weight_lbs: real("current_weight_lbs").notNull(),
  goal_weight_lbs: real("goal_weight_lbs").notNull(),
  gender: text("gender").notNull(), // 'male' | 'female'
  activity_level: activityLevelEnum("activity_level").notNull(),
  phase: phaseEnum("phase").notNull(),
  program_start_date: date("program_start_date").notNull(),
  onboarding_complete: boolean("onboarding_complete").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Recipes ──────────────────────────────────────────────────────────────────
export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  meal_type: mealTypeEnum("meal_type").notNull(),
  cuisine: text("cuisine").notNull(), // e.g. 'Mexican', 'Japanese', 'Mediterranean'
  calories: integer("calories").notNull(),
  protein_g: real("protein_g").notNull(),
  carbs_g: real("carbs_g").notNull(),
  fat_g: real("fat_g").notNull(),
  prep_time_min: integer("prep_time_min"),
  cook_time_min: integer("cook_time_min"),
  servings: integer("servings").default(1).notNull(),
  ingredients: jsonb("ingredients").notNull(), // [{ name, qty, unit }]
  instructions: text("instructions"),
  image_url: text("image_url"),
  tags: text("tags").array(), // ['bulk-friendly', 'high-protein', 'meal-prep', etc.]
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Meal Plans ───────────────────────────────────────────────────────────────
export const mealPlans = pgTable("meal_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  week_number: integer("week_number").notNull(),
  day_of_week: integer("day_of_week").notNull(), // 0=Sun … 6=Sat
  day_type: dayTypeEnum("day_type").notNull(),
  meal_slot: integer("meal_slot").notNull(), // 1–4
  recipe_id: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Grocery Lists ─────────────────────────────────────────────────────────────
export const groceryLists = pgTable("grocery_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  week_number: integer("week_number").notNull(),
  items: jsonb("items").notNull(), // [{ name, qty, unit, category, checked }]
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Training Plans ────────────────────────────────────────────────────────────
export const trainingPlans = pgTable("training_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  week_number: integer("week_number").notNull(),
  day_of_week: integer("day_of_week").notNull(),
  workout_name: text("workout_name").notNull(),
  is_rest_day: boolean("is_rest_day").default(false).notNull(),
  exercises: jsonb("exercises"), // [{ name, sets, reps, rest_sec, notes }]
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Progress Logs ─────────────────────────────────────────────────────────────
export const progressLogs = pgTable("progress_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  log_date: date("log_date").notNull(),
  weight_lbs: real("weight_lbs").notNull(),
  body_fat_pct: real("body_fat_pct"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Types ─────────────────────────────────────────────────────────────────────
export type Profile = typeof profiles.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type MealPlan = typeof mealPlans.$inferSelect;
export type GroceryList = typeof groceryLists.$inferSelect;
export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type ProgressLog = typeof progressLogs.$inferSelect;
