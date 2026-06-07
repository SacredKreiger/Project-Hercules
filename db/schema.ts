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

// ── Users ────────────────────────────────────────────────────────────────────
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  height_cm: real("height_cm").notNull(),
  current_weight_lbs: real("current_weight_lbs").notNull(),
  goal_weight_lbs: real("goal_weight_lbs").notNull(),
  gender: text("gender").notNull(),
  activity_level: activityLevelEnum("activity_level").notNull(),
  phase: phaseEnum("phase").notNull(),
  program_start_date: date("program_start_date").notNull(),
  onboarding_complete: boolean("onboarding_complete").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Food Log ──────────────────────────────────────────────────────────────────
export const foodLog = pgTable("food_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  logged_date: date("logged_date").notNull(),
  meal_slot: text("meal_slot").notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  food_name: text("food_name").notNull(),
  brand_name: text("brand_name"),
  calories: real("calories").notNull(),
  protein_g: real("protein_g").notNull().default(0),
  carbs_g: real("carbs_g").notNull().default(0),
  fat_g: real("fat_g").notNull().default(0),
  fiber_g: real("fiber_g"),
  sodium_mg: real("sodium_mg"),
  serving_qty: real("serving_qty").notNull().default(1),
  serving_unit: text("serving_unit").notNull().default("serving"),
  serving_size_g: real("serving_size_g"),
  source: text("source").notNull().default("search"),
  barcode: text("barcode"),
  external_id: text("external_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Custom Foods & Recipes ────────────────────────────────────────────────────
export const customFoods = pgTable("custom_foods", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  food_name: text("food_name").notNull(),
  brand_name: text("brand_name"),
  calories: real("calories").notNull(),
  protein_g: real("protein_g").notNull().default(0),
  carbs_g: real("carbs_g").notNull().default(0),
  fat_g: real("fat_g").notNull().default(0),
  fiber_g: real("fiber_g"),
  serving_qty: real("serving_qty").notNull().default(1),
  serving_unit: text("serving_unit").notNull().default("serving"),
  serving_size_g: real("serving_size_g"),
  is_recipe: boolean("is_recipe").default(false),
  ingredients: jsonb("ingredients"), // RecipeIngredient[]
  barcode: text("barcode"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Training Plans ────────────────────────────────────────────────────────────
export const trainingPlans = pgTable("training_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  week_number: integer("week_number").notNull(),
  day_of_week: integer("day_of_week").notNull(),
  workout_name: text("workout_name").notNull(),
  is_rest_day: boolean("is_rest_day").default(false).notNull(),
  exercises: jsonb("exercises"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Progress Logs ─────────────────────────────────────────────────────────────
export const progressLogs = pgTable("progress_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  log_date: date("log_date").notNull(),
  weight_lbs: real("weight_lbs").notNull(),
  body_fat_pct: real("body_fat_pct"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Meal Plans ────────────────────────────────────────────────────────────────
export const mealPlans = pgTable("meal_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slots: jsonb("slots").notNull().default({}), // Record<MealSlot, FoodResult>
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Types ─────────────────────────────────────────────────────────────────────
export type Profile = typeof profiles.$inferSelect;
export type MealPlan = typeof mealPlans.$inferSelect;
export type FoodLog = typeof foodLog.$inferSelect;
export type CustomFood = typeof customFoods.$inferSelect;
export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type ProgressLog = typeof progressLogs.$inferSelect;
