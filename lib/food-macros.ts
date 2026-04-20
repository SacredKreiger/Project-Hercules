/**
 * Food macro database — macros per 100 g of food (cooked/ready-to-eat form).
 * Sources: USDA FoodData Central.
 */

export type MacroPer100g = {
  protein: number; // g
  carbs: number;   // g
  fat: number;     // g
  kcal: number;
};

export type IngredientInfo = {
  macros: MacroPer100g;
  category: "protein" | "carb" | "fat" | "vegetable" | "other";
  /** Grams per 1 cup (overrides default 240 g) */
  cupGrams?: number;
  /** Grams per 1 tbsp */
  tbspGrams?: number;
  /** Grams per 1 tsp */
  tspGrams?: number;
  /** Grams per whole / piece / large / medium / small */
  pieceGrams?: number;
};

// ─── PROTEIN SOURCES ─────────────────────────────────────────────────────────
const PROTEINS: Record<string, IngredientInfo> = {
  "chicken breast":    { macros: { protein: 31.0, carbs: 0.0,  fat: 3.6,  kcal: 165 }, category: "protein", pieceGrams: 170 },
  "chicken thigh":     { macros: { protein: 26.0, carbs: 0.0,  fat: 11.5, kcal: 209 }, category: "protein", pieceGrams: 100 },
  "ground chicken":    { macros: { protein: 27.0, carbs: 0.0,  fat: 8.0,  kcal: 185 }, category: "protein" },
  "ground beef":       { macros: { protein: 26.0, carbs: 0.0,  fat: 15.0, kcal: 218 }, category: "protein" },
  "beef sirloin":      { macros: { protein: 28.0, carbs: 0.0,  fat: 9.0,  kcal: 193 }, category: "protein" },
  "steak":             { macros: { protein: 27.0, carbs: 0.0,  fat: 10.0, kcal: 205 }, category: "protein" },
  "beef":              { macros: { protein: 26.0, carbs: 0.0,  fat: 15.0, kcal: 218 }, category: "protein" },
  "ground turkey":     { macros: { protein: 27.0, carbs: 0.0,  fat: 10.5, kcal: 206 }, category: "protein" },
  "turkey breast":     { macros: { protein: 29.0, carbs: 0.0,  fat: 7.0,  kcal: 189 }, category: "protein" },
  "turkey":            { macros: { protein: 27.0, carbs: 0.0,  fat: 8.0,  kcal: 189 }, category: "protein" },
  "pork tenderloin":   { macros: { protein: 27.0, carbs: 0.0,  fat: 4.4,  kcal: 147 }, category: "protein" },
  "ground pork":       { macros: { protein: 22.0, carbs: 0.0,  fat: 15.0, kcal: 227 }, category: "protein" },
  "pork":              { macros: { protein: 25.0, carbs: 0.0,  fat: 10.0, kcal: 195 }, category: "protein" },
  "salmon":            { macros: { protein: 25.0, carbs: 0.0,  fat: 13.0, kcal: 208 }, category: "protein" },
  "tilapia":           { macros: { protein: 26.0, carbs: 0.0,  fat: 2.7,  kcal: 128 }, category: "protein" },
  "cod":               { macros: { protein: 23.0, carbs: 0.0,  fat: 0.9,  kcal: 105 }, category: "protein" },
  "tuna":              { macros: { protein: 30.0, carbs: 0.0,  fat: 1.0,  kcal: 128 }, category: "protein" },
  "shrimp":            { macros: { protein: 24.0, carbs: 0.0,  fat: 0.6,  kcal:  99 }, category: "protein" },
  "lamb":              { macros: { protein: 25.0, carbs: 0.0,  fat: 14.0, kcal: 242 }, category: "protein" },
  "tofu":              { macros: { protein:  8.0, carbs: 2.0,  fat: 4.5,  kcal:  76 }, category: "protein", cupGrams: 248 },
  "tempeh":            { macros: { protein: 19.0, carbs: 9.0,  fat: 11.0, kcal: 193 }, category: "protein" },
  "eggs":              { macros: { protein: 13.0, carbs: 1.0,  fat: 10.0, kcal: 143 }, category: "protein", pieceGrams: 50 },
  "egg":               { macros: { protein: 13.0, carbs: 1.0,  fat: 10.0, kcal: 143 }, category: "protein", pieceGrams: 50 },
  // Fish & seafood
  "sea bass":          { macros: { protein: 20.1, carbs: 0.0,  fat: 2.0,  kcal:  97 }, category: "protein", pieceGrams: 125 },
  "halibut":           { macros: { protein: 22.0, carbs: 0.0,  fat: 2.3,  kcal: 111 }, category: "protein", pieceGrams: 130 },
  "mahi":              { macros: { protein: 23.7, carbs: 0.0,  fat: 0.9,  kcal: 109 }, category: "protein", pieceGrams: 130 },
  "mackerel":          { macros: { protein: 19.0, carbs: 0.0,  fat: 14.0, kcal: 205 }, category: "protein" },
  "sardine":           { macros: { protein: 25.0, carbs: 0.0,  fat: 11.0, kcal: 208 }, category: "protein" },
  "crab":              { macros: { protein: 19.0, carbs: 0.0,  fat: 1.1,  kcal:  84 }, category: "protein" },
  "scallop":           { macros: { protein: 17.0, carbs: 3.2,  fat: 0.8,  kcal:  88 }, category: "protein" },
  // Red meat & game
  "goat":              { macros: { protein: 27.1, carbs: 0.0,  fat: 3.0,  kcal: 143 }, category: "protein" },
  "oxtail":            { macros: { protein: 30.9, carbs: 0.0,  fat: 13.9, kcal: 252 }, category: "protein" },
  "veal":              { macros: { protein: 26.0, carbs: 0.0,  fat: 8.0,  kcal: 175 }, category: "protein" },
  "bison":             { macros: { protein: 28.0, carbs: 0.0,  fat: 7.0,  kcal: 179 }, category: "protein" },
  // Cured / processed meats
  "chorizo":           { macros: { protein: 14.0, carbs: 1.0,  fat: 34.0, kcal: 373 }, category: "protein" },
  "prosciutto":        { macros: { protein: 26.0, carbs: 0.0,  fat: 14.0, kcal: 230 }, category: "protein" },
  "bacon":             { macros: { protein: 37.0, carbs: 1.5,  fat: 42.0, kcal: 541 }, category: "protein" },
  "sausage":           { macros: { protein: 14.0, carbs: 1.0,  fat: 27.0, kcal: 301 }, category: "protein" },
  // Dairy proteins
  "paneer":            { macros: { protein: 18.3, carbs: 3.6,  fat: 22.0, kcal: 281 }, category: "protein" },
  "cottage cheese":    { macros: { protein: 11.1, carbs: 3.4,  fat: 4.3,  kcal:  98 }, category: "protein", cupGrams: 226 },
  "ricotta":           { macros: { protein:  7.3, carbs: 3.0,  fat:  8.0, kcal: 174 }, category: "protein", cupGrams: 246 },
  "greek yogurt":      { macros: { protein: 10.0, carbs: 4.0,  fat: 0.4,  kcal:  59 }, category: "protein", cupGrams: 245 },
  // Plant proteins
  "falafel":           { macros: { protein:  5.4, carbs: 17.0, fat: 5.2,  kcal: 333 }, category: "protein", pieceGrams: 17 },
  "edamame beans":     { macros: { protein: 11.0, carbs: 8.0,  fat: 5.0,  kcal: 121 }, category: "protein", cupGrams: 155 },
  "seitan":            { macros: { protein: 25.0, carbs: 14.0, fat: 1.9,  kcal: 370 }, category: "protein" },
  "lentil":            { macros: { protein:  9.0, carbs: 20.0, fat: 0.4,  kcal: 116 }, category: "protein", cupGrams: 198 },
  "moong dal":         { macros: { protein:  7.0, carbs: 18.0, fat: 0.4,  kcal: 105 }, category: "protein", cupGrams: 198 },
  "dal":               { macros: { protein:  7.0, carbs: 18.0, fat: 0.4,  kcal: 105 }, category: "protein", cupGrams: 198 },
  // Protein powders
  "protein powder":    { macros: { protein: 75.0, carbs: 10.0, fat: 4.0,  kcal: 375 }, category: "protein", pieceGrams: 30 },
};

// ─── CARB SOURCES ─────────────────────────────────────────────────────────────
const CARBS: Record<string, IngredientInfo> = {
  "jasmine rice":      { macros: { protein: 2.7,  carbs: 28.0, fat: 0.3,  kcal: 130 }, category: "carb", cupGrams: 186 },
  "basmati rice":      { macros: { protein: 2.7,  carbs: 28.0, fat: 0.3,  kcal: 130 }, category: "carb", cupGrams: 186 },
  "white rice":        { macros: { protein: 2.7,  carbs: 28.0, fat: 0.3,  kcal: 130 }, category: "carb", cupGrams: 186 },
  "brown rice":        { macros: { protein: 2.6,  carbs: 23.0, fat: 0.9,  kcal: 111 }, category: "carb", cupGrams: 195 },
  "rice":              { macros: { protein: 2.7,  carbs: 28.0, fat: 0.3,  kcal: 130 }, category: "carb", cupGrams: 186 },
  "oats":              { macros: { protein: 2.5,  carbs: 12.0, fat: 1.5,  kcal:  71 }, category: "carb", cupGrams: 234 }, // cooked
  "pasta":             { macros: { protein: 5.0,  carbs: 25.0, fat: 1.1,  kcal: 131 }, category: "carb", cupGrams: 140 },
  "noodles":           { macros: { protein: 5.0,  carbs: 25.0, fat: 1.1,  kcal: 131 }, category: "carb", cupGrams: 140 },
  "spaghetti":         { macros: { protein: 5.0,  carbs: 25.0, fat: 1.1,  kcal: 131 }, category: "carb", cupGrams: 140 },
  "sweet potato":      { macros: { protein: 1.6,  carbs: 20.0, fat: 0.1,  kcal:  86 }, category: "carb", cupGrams: 200, pieceGrams: 130 },
  "potato":            { macros: { protein: 2.0,  carbs: 17.0, fat: 0.1,  kcal:  77 }, category: "carb", cupGrams: 150, pieceGrams: 213 },
  "quinoa":            { macros: { protein: 4.4,  carbs: 21.0, fat: 1.9,  kcal: 120 }, category: "carb", cupGrams: 185 },
  "couscous":          { macros: { protein: 3.8,  carbs: 23.0, fat: 0.2,  kcal: 112 }, category: "carb", cupGrams: 157 },
  "plantain":          { macros: { protein: 0.8,  carbs: 31.0, fat: 0.2,  kcal: 116 }, category: "carb", pieceGrams: 150 },
  "black beans":       { macros: { protein: 8.9,  carbs: 24.0, fat: 0.4,  kcal: 132 }, category: "carb", cupGrams: 172 },
  "pinto beans":       { macros: { protein: 9.0,  carbs: 22.0, fat: 0.4,  kcal: 127 }, category: "carb", cupGrams: 171 },
  "kidney beans":      { macros: { protein: 8.7,  carbs: 22.0, fat: 0.5,  kcal: 127 }, category: "carb", cupGrams: 177 },
  "chickpeas":         { macros: { protein: 9.0,  carbs: 27.0, fat: 2.6,  kcal: 164 }, category: "carb", cupGrams: 164 },
  "lentils":           { macros: { protein: 9.0,  carbs: 20.0, fat: 0.4,  kcal: 116 }, category: "carb", cupGrams: 198 },
  "corn tortilla":     { macros: { protein: 5.5,  carbs: 47.0, fat: 2.5,  kcal: 218 }, category: "carb", pieceGrams: 26 },
  "flour tortilla":    { macros: { protein: 8.5,  carbs: 50.0, fat: 7.5,  kcal: 302 }, category: "carb", pieceGrams: 45 },
  "tortilla":          { macros: { protein: 7.0,  carbs: 49.0, fat: 5.0,  kcal: 260 }, category: "carb", pieceGrams: 35 },
  "pita":              { macros: { protein: 9.0,  carbs: 55.0, fat: 1.0,  kcal: 275 }, category: "carb", pieceGrams: 57 },
  "naan":              { macros: { protein: 9.0,  carbs: 51.0, fat: 4.5,  kcal: 290 }, category: "carb", pieceGrams: 90 },
  "bread":             { macros: { protein: 9.0,  carbs: 49.0, fat: 3.2,  kcal: 265 }, category: "carb", pieceGrams: 28 },
  // Grains & noodle variants
  "vermicelli":        { macros: { protein: 5.0,  carbs: 25.0, fat: 0.8,  kcal: 130 }, category: "carb", cupGrams: 140 },
  "fideo":             { macros: { protein: 5.0,  carbs: 25.0, fat: 0.8,  kcal: 130 }, category: "carb", cupGrams: 140 },
  "ramen":             { macros: { protein: 5.0,  carbs: 26.0, fat: 1.2,  kcal: 138 }, category: "carb", cupGrams: 140 },
  "soba":              { macros: { protein: 5.6,  carbs: 24.0, fat: 0.1,  kcal: 113 }, category: "carb", cupGrams: 140 },
  "udon":              { macros: { protein: 3.0,  carbs: 21.0, fat: 0.4,  kcal:  97 }, category: "carb", cupGrams: 200 },
  "glass noodle":      { macros: { protein: 0.1,  carbs: 22.0, fat: 0.0,  kcal:  86 }, category: "carb", cupGrams: 140 },
  "rice noodle":       { macros: { protein: 1.8,  carbs: 23.0, fat: 0.1,  kcal: 103 }, category: "carb", cupGrams: 140 },
  "polenta":           { macros: { protein: 2.4,  carbs: 13.4, fat: 0.5,  kcal:  70 }, category: "carb", cupGrams: 240 }, // cooked
  "millet":            { macros: { protein: 3.5,  carbs: 23.7, fat: 1.0,  kcal: 119 }, category: "carb", cupGrams: 174 },
  "bulgur":            { macros: { protein: 3.1,  carbs: 19.0, fat: 0.2,  kcal:  83 }, category: "carb", cupGrams: 182 },
  "farro":             { macros: { protein: 5.0,  carbs: 26.0, fat: 0.5,  kcal: 125 }, category: "carb", cupGrams: 200 },
  "dumpling wrapper":  { macros: { protein: 7.0,  carbs: 47.0, fat: 0.5,  kcal: 222 }, category: "carb", pieceGrams: 10 },
  // Breads, rolls & wraps
  "roti":              { macros: { protein: 8.0,  carbs: 45.0, fat: 2.0,  kcal: 230 }, category: "carb", pieceGrams: 40 },
  "wrap":              { macros: { protein: 8.0,  carbs: 44.0, fat: 5.0,  kcal: 255 }, category: "carb", pieceGrams: 45 },
  "roll":              { macros: { protein: 8.0,  carbs: 48.0, fat: 4.0,  kcal: 265 }, category: "carb", pieceGrams: 55 },
  "baguette":          { macros: { protein: 9.0,  carbs: 55.0, fat: 1.0,  kcal: 270 }, category: "carb", pieceGrams: 50 },
  "ciabatta":          { macros: { protein: 8.0,  carbs: 50.0, fat: 2.0,  kcal: 249 }, category: "carb", pieceGrams: 55 },
  "pizza dough":       { macros: { protein: 9.0,  carbs: 49.0, fat: 1.5,  kcal: 250 }, category: "carb", pieceGrams: 150 },
  "tostada":           { macros: { protein: 5.5,  carbs: 47.0, fat: 2.5,  kcal: 218 }, category: "carb", pieceGrams: 12 },
  "crouton":           { macros: { protein: 8.0,  carbs: 52.0, fat: 7.0,  kcal: 307 }, category: "carb", cupGrams: 40 },
  // Legumes (additional)
  "cannellini":        { macros: { protein: 9.7,  carbs: 22.0, fat: 0.4,  kcal: 130 }, category: "carb", cupGrams: 180 },
  "black-eyed pea":    { macros: { protein: 7.7,  carbs: 20.0, fat: 0.5,  kcal: 116 }, category: "carb", cupGrams: 172 },
  "pigeon pea":        { macros: { protein: 7.2,  carbs: 23.0, fat: 0.4,  kcal: 121 }, category: "carb", cupGrams: 168 },
  "fava bean":         { macros: { protein: 7.6,  carbs: 18.0, fat: 0.4,  kcal: 110 }, category: "carb", cupGrams: 170 },
  "ackee":             { macros: { protein: 2.9,  carbs: 0.8,  fat: 15.2, kcal: 151 }, category: "carb", cupGrams: 150 },
  "refried beans":     { macros: { protein: 5.9,  carbs: 15.0, fat: 2.5,  kcal:  99 }, category: "carb", cupGrams: 240 },
  "grape leaves":      { macros: { protein: 5.0,  carbs: 18.0, fat: 3.0,  kcal: 120 }, category: "carb", pieceGrams: 15 },
  // Starchy vegetables
  "yam":               { macros: { protein: 1.5,  carbs: 28.0, fat: 0.1,  kcal: 118 }, category: "carb", cupGrams: 150 },
  "fufu":              { macros: { protein: 0.9,  carbs: 28.0, fat: 0.1,  kcal: 115 }, category: "carb", cupGrams: 150 },
  // Fruit carbs (significant macro contribution)
  "banana":            { macros: { protein: 1.1,  carbs: 23.0, fat: 0.3,  kcal:  89 }, category: "carb", pieceGrams: 118 },
  "apple":             { macros: { protein: 0.3,  carbs: 14.0, fat: 0.2,  kcal:  52 }, category: "carb", pieceGrams: 182 },
  "mango":             { macros: { protein: 0.8,  carbs: 15.0, fat: 0.4,  kcal:  60 }, category: "carb", cupGrams: 165, pieceGrams: 200 },
  "pineapple":         { macros: { protein: 0.5,  carbs: 13.0, fat: 0.1,  kcal:  50 }, category: "carb", cupGrams: 165 },
  "berries":           { macros: { protein: 0.7,  carbs: 14.0, fat: 0.3,  kcal:  57 }, category: "carb", cupGrams: 144 },
  "strawberr":         { macros: { protein: 0.7,  carbs: 7.7,  fat: 0.3,  kcal:  32 }, category: "carb", cupGrams: 152 },
  "blueberr":          { macros: { protein: 0.7,  carbs: 14.5, fat: 0.3,  kcal:  57 }, category: "carb", cupGrams: 148 },
  "dates":             { macros: { protein: 2.5,  carbs: 75.0, fat: 0.4,  kcal: 277 }, category: "carb", pieceGrams: 24 },
  "raisin":            { macros: { protein: 3.1,  carbs: 79.0, fat: 0.5,  kcal: 299 }, category: "carb", cupGrams: 145 },
  "orange juice":      { macros: { protein: 0.7,  carbs: 10.0, fat: 0.2,  kcal:  45 }, category: "carb", cupGrams: 248 },
  "coconut water":     { macros: { protein: 0.7,  carbs: 4.0,  fat: 0.2,  kcal:  19 }, category: "carb", cupGrams: 240 },
  // Dairy carbs
  "milk":              { macros: { protein: 3.3,  carbs: 4.8,  fat: 2.0,  kcal:  50 }, category: "carb", cupGrams: 244 },
  // Flour & sugars
  "flour":             { macros: { protein: 10.0, carbs: 76.0, fat: 1.0,  kcal: 364 }, category: "carb", tbspGrams: 8.0 },
  "brown sugar":       { macros: { protein: 0.0,  carbs: 97.0, fat: 0.0,  kcal: 380 }, category: "carb", tbspGrams: 13.8 },
  "sugar":             { macros: { protein: 0.0,  carbs: 100.0,fat: 0.0,  kcal: 387 }, category: "carb", tbspGrams: 12.5 },
  "granola":           { macros: { protein: 4.0,  carbs: 44.0, fat: 10.0, kcal: 471 }, category: "carb", cupGrams: 100 },
  // Prepared / packaged
  "hummus":            { macros: { protein: 5.0,  carbs: 12.0, fat: 9.0,  kcal: 177 }, category: "carb", tbspGrams: 15 },
  "tabbouleh":         { macros: { protein: 2.0,  carbs: 9.0,  fat: 3.0,  kcal:  71 }, category: "carb", cupGrams: 160 },
};

// ─── FAT SOURCES ─────────────────────────────────────────────────────────────
const FATS: Record<string, IngredientInfo> = {
  "olive oil":         { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 884 }, category: "fat", tbspGrams: 13.5, tspGrams: 4.5 },
  "vegetable oil":     { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 884 }, category: "fat", tbspGrams: 14.0, tspGrams: 4.7 },
  "canola oil":        { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 884 }, category: "fat", tbspGrams: 14.0, tspGrams: 4.7 },
  "sesame oil":        { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 884 }, category: "fat", tbspGrams: 13.6, tspGrams: 4.5 },
  "coconut oil":       { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 892 }, category: "fat", tbspGrams: 14.0, tspGrams: 4.7 },
  "palm oil":          { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 884 }, category: "fat", tbspGrams: 14.0, tspGrams: 4.7 },
  "neutral oil":       { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 884 }, category: "fat", tbspGrams: 14.0, tspGrams: 4.7 },
  "chili oil":         { macros: { protein: 0.0,  carbs: 1.0,  fat: 99.0,  kcal: 879 }, category: "fat", tbspGrams: 14.0, tspGrams: 4.7 },
  "butter":            { macros: { protein: 0.85, carbs: 0.06, fat: 81.0,  kcal: 717 }, category: "fat", tbspGrams: 14.2, tspGrams: 4.7 },
  "ghee":              { macros: { protein: 0.3,  carbs: 0.0,  fat: 99.5,  kcal: 876 }, category: "fat", tbspGrams: 13.0, tspGrams: 4.3 },
  "coconut milk":      { macros: { protein: 2.3,  carbs: 6.0,  fat: 24.0,  kcal: 230 }, category: "fat", cupGrams: 240 },
  "coconut cream":     { macros: { protein: 2.7,  carbs: 6.0,  fat: 34.0,  kcal: 330 }, category: "fat", cupGrams: 240 },
  "avocado":           { macros: { protein: 2.0,  carbs: 9.0,  fat: 15.0,  kcal: 160 }, category: "fat", pieceGrams: 150, cupGrams: 230 },
  "peanut butter":     { macros: { protein: 25.0, carbs: 20.0, fat: 50.0,  kcal: 588 }, category: "fat", tbspGrams: 16.0 },
  "almond butter":     { macros: { protein: 21.0, carbs: 19.0, fat: 55.0,  kcal: 614 }, category: "fat", tbspGrams: 16.0 },
  "cheddar cheese":    { macros: { protein: 25.0, carbs: 1.3,  fat: 33.0,  kcal: 403 }, category: "fat", cupGrams: 113 },
  "parmesan":          { macros: { protein: 36.0, carbs: 4.0,  fat: 26.0,  kcal: 431 }, category: "fat", tbspGrams: 5.0 },
  "pecorino":          { macros: { protein: 32.0, carbs: 0.5,  fat: 33.0,  kcal: 427 }, category: "fat", tbspGrams: 5.0 },
  "mozzarella":        { macros: { protein: 22.0, carbs: 2.2,  fat: 22.0,  kcal: 300 }, category: "fat", cupGrams: 113, pieceGrams: 50 },
  "feta":              { macros: { protein: 14.2, carbs: 4.1,  fat: 21.3,  kcal: 264 }, category: "fat", cupGrams: 113 },
  "goat cheese":       { macros: { protein: 21.6, carbs: 0.1,  fat: 29.8,  kcal: 364 }, category: "fat", cupGrams: 113 },
  "cheese":            { macros: { protein: 25.0, carbs: 2.0,  fat: 30.0,  kcal: 380 }, category: "fat", cupGrams: 113 },
  "heavy cream":       { macros: { protein: 2.0,  carbs: 3.0,  fat: 35.0,  kcal: 345 }, category: "fat", tbspGrams: 15.0 },
  "sour cream":        { macros: { protein: 2.5,  carbs: 4.0,  fat: 20.0,  kcal: 198 }, category: "fat", tbspGrams: 12.0 },
  "tahini":            { macros: { protein: 17.0, carbs: 21.0, fat: 54.0,  kcal: 595 }, category: "fat", tbspGrams: 15.0 },
  "labneh":            { macros: { protein: 9.0,  carbs: 4.0,  fat: 9.0,   kcal: 130 }, category: "fat", tbspGrams: 15.0 },
  // Nuts & seeds
  "almonds":           { macros: { protein: 21.0, carbs: 22.0, fat: 50.0,  kcal: 579 }, category: "fat", cupGrams: 143 },
  "cashews":           { macros: { protein: 15.0, carbs: 30.0, fat: 44.0,  kcal: 553 }, category: "fat", cupGrams: 130 },
  "walnuts":           { macros: { protein: 15.0, carbs: 14.0, fat: 65.0,  kcal: 654 }, category: "fat", cupGrams: 120 },
  "peanuts":           { macros: { protein: 26.0, carbs: 16.0, fat: 49.0,  kcal: 567 }, category: "fat", cupGrams: 146 },
  "pistachios":        { macros: { protein: 20.0, carbs: 28.0, fat: 45.0,  kcal: 560 }, category: "fat", cupGrams: 123 },
  "pine nuts":         { macros: { protein: 14.0, carbs: 13.0, fat: 68.0,  kcal: 673 }, category: "fat", tbspGrams: 9.0 },
  "sesame seeds":      { macros: { protein: 17.0, carbs: 23.0, fat: 50.0,  kcal: 573 }, category: "fat", tbspGrams: 9.0 },
  "chia seeds":        { macros: { protein: 17.0, carbs: 42.0, fat: 31.0,  kcal: 486 }, category: "fat", tbspGrams: 12.0 },
  "flaxseed":          { macros: { protein: 18.3, carbs: 28.9, fat: 42.2,  kcal: 534 }, category: "fat", tbspGrams: 10.0 },
  "hemp seeds":        { macros: { protein: 31.6, carbs: 8.7,  fat: 48.7,  kcal: 553 }, category: "fat", tbspGrams: 10.0 },
  "sunflower seeds":   { macros: { protein: 20.8, carbs: 20.0, fat: 51.5,  kcal: 584 }, category: "fat", tbspGrams: 9.0 },
  "coconut flakes":    { macros: { protein: 3.3,  carbs: 7.0,  fat: 33.5,  kcal: 354 }, category: "fat", cupGrams: 80 },
  "shredded coconut":  { macros: { protein: 3.3,  carbs: 7.0,  fat: 33.5,  kcal: 354 }, category: "fat", cupGrams: 80 },
  "egusi":             { macros: { protein: 30.0, carbs: 8.0,  fat: 50.0,  kcal: 601 }, category: "fat", cupGrams: 130 },
  // Condiment fats
  "mayonnaise":        { macros: { protein: 0.9,  carbs: 3.6,  fat: 74.9,  kcal: 680 }, category: "fat", tbspGrams: 14.0 },
  "japanese mayo":     { macros: { protein: 1.5,  carbs: 3.5,  fat: 33.0,  kcal: 315 }, category: "fat", tbspGrams: 14.0 },
  "caesar dressing":   { macros: { protein: 1.5,  carbs: 2.0,  fat: 28.0,  kcal: 290 }, category: "fat", tbspGrams: 15.0 },
};

// ─── VEGETABLES (kept at recipe ratio, not scaled to macro targets) ───────────
const VEGETABLES: Record<string, IngredientInfo> = {
  "broccoli":       { macros: { protein: 2.8, carbs: 7.0,  fat: 0.4, kcal: 34  }, category: "vegetable", cupGrams: 91 },
  "spinach":        { macros: { protein: 2.9, carbs: 3.6,  fat: 0.4, kcal: 23  }, category: "vegetable", cupGrams: 30 },
  "kale":           { macros: { protein: 4.3, carbs: 9.0,  fat: 0.9, kcal: 49  }, category: "vegetable", cupGrams: 67 },
  "cabbage":        { macros: { protein: 1.3, carbs: 6.0,  fat: 0.1, kcal: 25  }, category: "vegetable", cupGrams: 89 },
  "bell pepper":    { macros: { protein: 1.0, carbs: 6.0,  fat: 0.3, kcal: 31  }, category: "vegetable", pieceGrams: 120 },
  "onion":          { macros: { protein: 1.1, carbs: 9.3,  fat: 0.1, kcal: 40  }, category: "vegetable", cupGrams: 160, pieceGrams: 110 },
  "tomato":         { macros: { protein: 0.9, carbs: 3.9,  fat: 0.2, kcal: 18  }, category: "vegetable", pieceGrams: 123, cupGrams: 180 },
  "garlic":         { macros: { protein: 6.4, carbs: 33.0, fat: 0.5, kcal: 149 }, category: "vegetable", tspGrams: 3.0, pieceGrams: 4 },
  "mushroom":       { macros: { protein: 3.1, carbs: 3.3,  fat: 0.3, kcal: 22  }, category: "vegetable", cupGrams: 70 },
  "zucchini":       { macros: { protein: 1.2, carbs: 3.1,  fat: 0.3, kcal: 17  }, category: "vegetable", cupGrams: 124 },
  "cucumber":       { macros: { protein: 0.7, carbs: 3.6,  fat: 0.1, kcal: 15  }, category: "vegetable", cupGrams: 119 },
  "carrot":         { macros: { protein: 0.9, carbs: 10.0, fat: 0.2, kcal: 41  }, category: "vegetable", cupGrams: 128, pieceGrams: 61 },
  "celery":         { macros: { protein: 0.7, carbs: 3.0,  fat: 0.2, kcal: 16  }, category: "vegetable", cupGrams: 101 },
  "lettuce":        { macros: { protein: 1.4, carbs: 2.9,  fat: 0.2, kcal: 17  }, category: "vegetable", cupGrams: 57 },
  "corn":           { macros: { protein: 3.3, carbs: 19.0, fat: 1.4, kcal: 86  }, category: "vegetable", cupGrams: 154 },
  "edamame":        { macros: { protein: 11.0, carbs: 8.0, fat: 5.0, kcal: 121 }, category: "vegetable", cupGrams: 155 },
  "bok choy":       { macros: { protein: 1.5, carbs: 2.2,  fat: 0.2, kcal: 13  }, category: "vegetable", cupGrams: 70 },
  "green beans":    { macros: { protein: 1.8, carbs: 7.9,  fat: 0.1, kcal: 35  }, category: "vegetable", cupGrams: 110 },
  // Additional vegetables
  "asparagus":      { macros: { protein: 2.2, carbs: 3.9,  fat: 0.1, kcal: 20  }, category: "vegetable", cupGrams: 134 },
  "bean sprouts":   { macros: { protein: 2.5, carbs: 4.0,  fat: 0.1, kcal: 30  }, category: "vegetable", cupGrams: 104 },
  "snap peas":      { macros: { protein: 2.6, carbs: 7.6,  fat: 0.2, kcal: 42  }, category: "vegetable", cupGrams: 98 },
  "peas":           { macros: { protein: 5.4, carbs: 14.0, fat: 0.4, kcal: 81  }, category: "vegetable", cupGrams: 145 },
  "okra":           { macros: { protein: 1.9, carbs: 7.5,  fat: 0.2, kcal: 33  }, category: "vegetable", cupGrams: 100 },
  "eggplant":       { macros: { protein: 1.0, carbs: 6.0,  fat: 0.2, kcal: 25  }, category: "vegetable", cupGrams: 99 },
  "cauliflower":    { macros: { protein: 1.9, carbs: 5.0,  fat: 0.3, kcal: 25  }, category: "vegetable", cupGrams: 107 },
  "arugula":        { macros: { protein: 2.6, carbs: 3.7,  fat: 0.7, kcal: 25  }, category: "vegetable", cupGrams: 20 },
  "scallion":       { macros: { protein: 1.8, carbs: 7.3,  fat: 0.2, kcal: 32  }, category: "vegetable", cupGrams: 100 },
  "green onion":    { macros: { protein: 1.8, carbs: 7.3,  fat: 0.2, kcal: 32  }, category: "vegetable", cupGrams: 100 },
  "leek":           { macros: { protein: 1.5, carbs: 14.2, fat: 0.3, kcal: 61  }, category: "vegetable", cupGrams: 89 },
  "shallot":        { macros: { protein: 2.5, carbs: 17.0, fat: 0.1, kcal: 72  }, category: "vegetable", pieceGrams: 30 },
  "jalapeño":       { macros: { protein: 0.9, carbs: 5.9,  fat: 0.4, kcal: 29  }, category: "vegetable", pieceGrams: 14 },
  "scotch bonnet":  { macros: { protein: 1.9, carbs: 8.8,  fat: 0.4, kcal: 40  }, category: "vegetable", pieceGrams: 8 },
  "green chili":    { macros: { protein: 2.0, carbs: 9.5,  fat: 0.2, kcal: 40  }, category: "vegetable", pieceGrams: 10 },
  "ginger":         { macros: { protein: 1.8, carbs: 18.0, fat: 0.8, kcal: 80  }, category: "vegetable", tbspGrams: 6.0, tspGrams: 2.0 },
  "daikon":         { macros: { protein: 0.6, carbs: 4.1,  fat: 0.1, kcal: 18  }, category: "vegetable", cupGrams: 116 },
  "radish":         { macros: { protein: 0.7, carbs: 3.4,  fat: 0.1, kcal: 16  }, category: "vegetable", cupGrams: 116 },
  "beet":           { macros: { protein: 1.7, carbs: 10.0, fat: 0.2, kcal: 44  }, category: "vegetable", cupGrams: 136 },
  "fennel":         { macros: { protein: 1.2, carbs: 7.3,  fat: 0.2, kcal: 31  }, category: "vegetable", cupGrams: 87 },
  "artichoke":      { macros: { protein: 3.3, carbs: 11.4, fat: 0.2, kcal: 53  }, category: "vegetable", pieceGrams: 120 },
  "olives":         { macros: { protein: 0.8, carbs: 6.0,  fat: 10.0, kcal: 116 }, category: "vegetable", pieceGrams: 4 },
  "capers":         { macros: { protein: 2.4, carbs: 5.0,  fat: 0.9, kcal: 23  }, category: "vegetable", tbspGrams: 9.0 },
  "sun-dried tomato": { macros: { protein: 5.1, carbs: 55.8, fat: 0.9, kcal: 258 }, category: "vegetable", tbspGrams: 4.0 },
  "roasted red pepper": { macros: { protein: 1.0, carbs: 6.3, fat: 0.3, kcal: 31 }, category: "vegetable", cupGrams: 150 },
  "kimchi":         { macros: { protein: 1.1, carbs: 3.6,  fat: 0.5, kcal: 15  }, category: "vegetable", cupGrams: 150 },
  "nopales":        { macros: { protein: 1.3, carbs: 3.3,  fat: 0.1, kcal: 16  }, category: "vegetable", cupGrams: 150 },
  "green papaya":   { macros: { protein: 0.5, carbs: 9.0,  fat: 0.1, kcal: 39  }, category: "vegetable", cupGrams: 113 },
  "seaweed":        { macros: { protein: 1.7, carbs: 9.1,  fat: 0.6, kcal: 45  }, category: "vegetable", tbspGrams: 2.0 },
  "wakame":         { macros: { protein: 3.0, carbs: 9.1,  fat: 0.6, kcal: 45  }, category: "vegetable", tbspGrams: 2.0 },
  "nori":           { macros: { protein: 5.8, carbs: 36.8, fat: 0.3, kcal: 35  }, category: "vegetable", pieceGrams: 2.5 },
  "coleslaw":       { macros: { protein: 1.0, carbs: 6.0,  fat: 0.1, kcal: 25  }, category: "vegetable", cupGrams: 70 },
};

// ─── OTHER (seasonings, sauces — small quantities, not scaled) ───────────────
const OTHER: Record<string, IngredientInfo> = {
  "soy sauce":      { macros: { protein: 5.0,  carbs: 5.0,  fat: 0.1, kcal: 53  }, category: "other", tbspGrams: 16 },
  "tamari":         { macros: { protein: 5.0,  carbs: 5.0,  fat: 0.1, kcal: 53  }, category: "other", tbspGrams: 16 },
  "fish sauce":     { macros: { protein: 5.0,  carbs: 3.0,  fat: 0.0, kcal: 35  }, category: "other", tbspGrams: 18 },
  "oyster sauce":   { macros: { protein: 2.0,  carbs: 9.0,  fat: 0.5, kcal: 51  }, category: "other", tbspGrams: 18 },
  "hoisin sauce":   { macros: { protein: 1.5,  carbs: 28.0, fat: 1.5, kcal: 220 }, category: "other", tbspGrams: 16 },
  "hot sauce":      { macros: { protein: 0.5,  carbs: 1.0,  fat: 0.0, kcal: 11  }, category: "other", tbspGrams: 16 },
  "sriracha":       { macros: { protein: 1.2,  carbs: 8.0,  fat: 1.5, kcal: 43  }, category: "other", tbspGrams: 17 },
  "gochujang":      { macros: { protein: 1.7,  carbs: 18.0, fat: 1.2, kcal: 99  }, category: "other", tbspGrams: 22 },
  "doubanjiang":    { macros: { protein: 3.0,  carbs: 8.0,  fat: 3.0, kcal: 70  }, category: "other", tbspGrams: 18 },
  "ssamjang":       { macros: { protein: 4.0,  carbs: 10.0, fat: 3.5, kcal: 80  }, category: "other", tbspGrams: 18 },
  "miso":           { macros: { protein: 11.7, carbs: 26.5, fat: 3.5, kcal: 199 }, category: "other", tbspGrams: 17 },
  "wasabi":         { macros: { protein: 4.8,  carbs: 46.9, fat: 0.6, kcal: 109 }, category: "other", tspGrams: 4.0 },
  "salsa":          { macros: { protein: 1.0,  carbs: 4.0,  fat: 0.2, kcal: 36  }, category: "other", tbspGrams: 16, cupGrams: 240 },
  "pico de gallo":  { macros: { protein: 0.9,  carbs: 3.6,  fat: 0.2, kcal: 18  }, category: "other", tbspGrams: 16, cupGrams: 240 },
  "marinara":       { macros: { protein: 1.5,  carbs: 9.0,  fat: 1.5, kcal: 57  }, category: "other", cupGrams: 245 },
  "pizza sauce":    { macros: { protein: 1.5,  carbs: 9.0,  fat: 1.2, kcal: 52  }, category: "other", tbspGrams: 16 },
  "bbq sauce":      { macros: { protein: 0.5,  carbs: 18.0, fat: 0.5, kcal: 79  }, category: "other", tbspGrams: 15 },
  "tzatziki":       { macros: { protein: 3.0,  carbs: 3.0,  fat: 4.0, kcal: 60  }, category: "other", tbspGrams: 15 },
  "mint chutney":   { macros: { protein: 1.0,  carbs: 8.0,  fat: 0.5, kcal: 40  }, category: "other", tbspGrams: 15 },
  "mango chutney":  { macros: { protein: 0.3,  carbs: 41.0, fat: 0.2, kcal: 167 }, category: "other", tbspGrams: 15 },
  "basil pesto":    { macros: { protein: 4.8,  carbs: 3.7,  fat: 22.7, kcal: 240 }, category: "other", tbspGrams: 15 },
  "yogurt":         { macros: { protein: 10.0, carbs: 4.0,  fat: 0.4, kcal: 59  }, category: "other", cupGrams: 245 },
  "honey":          { macros: { protein: 0.3,  carbs: 82.0, fat: 0.0, kcal: 304 }, category: "other", tbspGrams: 21 },
  "maple syrup":    { macros: { protein: 0.0,  carbs: 67.0, fat: 0.1, kcal: 260 }, category: "other", tbspGrams: 20 },
  "mirin":          { macros: { protein: 0.1,  carbs: 30.0, fat: 0.0, kcal: 121 }, category: "other", tbspGrams: 17 },
  "sake":           { macros: { protein: 0.5,  carbs: 5.0,  fat: 0.0, kcal: 134 }, category: "other", tbspGrams: 15 },
  "rice vinegar":   { macros: { protein: 0.0,  carbs: 0.0,  fat: 0.0, kcal: 11  }, category: "other", tbspGrams: 15 },
  "balsamic":       { macros: { protein: 0.5,  carbs: 17.0, fat: 0.0, kcal: 88  }, category: "other", tbspGrams: 16 },
  "tomato paste":   { macros: { protein: 3.8,  carbs: 18.0, fat: 0.4, kcal: 82  }, category: "other", tbspGrams: 16 },
  "crushed tomato": { macros: { protein: 1.5,  carbs: 7.0,  fat: 0.3, kcal: 32  }, category: "other", cupGrams: 245 },
  "broth":          { macros: { protein: 1.0,  carbs: 0.5,  fat: 0.3, kcal: 12  }, category: "other", cupGrams: 240 },
  "dashi":          { macros: { protein: 0.5,  carbs: 0.3,  fat: 0.1, kcal: 5   }, category: "other", cupGrams: 240 },
  "stock":          { macros: { protein: 1.0,  carbs: 0.5,  fat: 0.3, kcal: 12  }, category: "other", cupGrams: 240 },
  "tamarind":       { macros: { protein: 2.0,  carbs: 57.0, fat: 0.6, kcal: 239 }, category: "other", tbspGrams: 18 },
  "preserved lemon":{ macros: { protein: 0.5,  carbs: 3.0,  fat: 0.2, kcal: 15  }, category: "other", tbspGrams: 15 },
  "dijon mustard":  { macros: { protein: 3.7,  carbs: 5.8,  fat: 4.0, kcal: 66  }, category: "other", tbspGrams: 15 },
  "mustard":        { macros: { protein: 3.7,  carbs: 5.8,  fat: 4.0, kcal: 66  }, category: "other", tbspGrams: 15 },
  // Seasonings & spice blends (small quantities — mainly logged to avoid null lookups)
  "curry powder":   { macros: { protein: 12.7, carbs: 58.2, fat: 14.0, kcal: 325 }, category: "other", tspGrams: 2.5 },
  "garam masala":   { macros: { protein: 12.7, carbs: 50.0, fat: 15.0, kcal: 379 }, category: "other", tspGrams: 2.5 },
  "cumin":          { macros: { protein: 17.8, carbs: 44.2, fat: 22.3, kcal: 375 }, category: "other", tspGrams: 2.1 },
  "paprika":        { macros: { protein: 14.1, carbs: 54.0, fat: 12.9, kcal: 289 }, category: "other", tspGrams: 2.3 },
  "turmeric":       { macros: { protein: 9.7,  carbs: 67.1, fat: 3.3,  kcal: 354 }, category: "other", tspGrams: 2.5 },
  "cinnamon":       { macros: { protein: 4.0,  carbs: 80.6, fat: 1.2,  kcal: 247 }, category: "other", tspGrams: 2.6 },
  "oregano":        { macros: { protein: 11.0, carbs: 64.4, fat: 4.3,  kcal: 265 }, category: "other", tspGrams: 1.0 },
  "thyme":          { macros: { protein: 9.1,  carbs: 63.9, fat: 7.4,  kcal: 101 }, category: "other", tspGrams: 1.0 },
  "rosemary":       { macros: { protein: 4.9,  carbs: 64.1, fat: 5.9,  kcal: 131 }, category: "other", tspGrams: 1.0 },
  "allspice":       { macros: { protein: 6.1,  carbs: 72.1, fat: 8.7,  kcal: 263 }, category: "other", tspGrams: 1.9 },
  "nutmeg":         { macros: { protein: 5.8,  carbs: 49.3, fat: 36.3, kcal: 525 }, category: "other", tspGrams: 2.2 },
  "sumac":          { macros: { protein: 3.4,  carbs: 36.4, fat: 7.4,  kcal: 220 }, category: "other", tspGrams: 3.0 },
  "za'atar":        { macros: { protein: 9.5,  carbs: 35.6, fat: 13.5, kcal: 270 }, category: "other", tspGrams: 3.0 },
  "ras el hanout":  { macros: { protein: 10.0, carbs: 50.0, fat: 12.0, kcal: 330 }, category: "other", tspGrams: 2.5 },
  "shawarma spice": { macros: { protein: 12.0, carbs: 48.0, fat: 14.0, kcal: 360 }, category: "other", tspGrams: 2.5 },
  "jerk seasoning": { macros: { protein: 8.0,  carbs: 50.0, fat: 5.0,  kcal: 280 }, category: "other", tspGrams: 3.0 },
  "tandoori masala":{ macros: { protein: 12.0, carbs: 48.0, fat: 14.0, kcal: 360 }, category: "other", tspGrams: 2.5 },
  "biryani masala": { macros: { protein: 12.0, carbs: 48.0, fat: 14.0, kcal: 360 }, category: "other", tspGrams: 2.5 },
  "chaat masala":   { macros: { protein: 10.0, carbs: 50.0, fat: 10.0, kcal: 330 }, category: "other", tspGrams: 2.5 },
  "italian seasoning": { macros: { protein: 10.0, carbs: 60.0, fat: 5.0, kcal: 265 }, category: "other", tspGrams: 1.0 },
  "tajin":          { macros: { protein: 0.0,  carbs: 5.0,  fat: 0.0,  kcal: 20  }, category: "other", tspGrams: 2.0 },
  "green curry paste": { macros: { protein: 3.0, carbs: 12.0, fat: 4.0, kcal: 95 }, category: "other", tbspGrams: 16 },
  "massaman curry paste": { macros: { protein: 3.0, carbs: 12.0, fat: 5.0, kcal: 100 }, category: "other", tbspGrams: 16 },
  "adobo":          { macros: { protein: 1.5,  carbs: 3.0,  fat: 2.0,  kcal: 35  }, category: "other", tbspGrams: 15 },
  "lemon juice":    { macros: { protein: 0.4,  carbs: 6.9,  fat: 0.2,  kcal: 22  }, category: "other", tbspGrams: 15 },
  "lime juice":     { macros: { protein: 0.3,  carbs: 7.1,  fat: 0.1,  kcal: 25  }, category: "other", tbspGrams: 15 },
  "vinegar":        { macros: { protein: 0.0,  carbs: 0.9,  fat: 0.0,  kcal: 3   }, category: "other", tbspGrams: 15 },
  "pickled":        { macros: { protein: 0.3,  carbs: 2.0,  fat: 0.1,  kcal: 10  }, category: "other", tbspGrams: 15 },
  "vanilla extract":{ macros: { protein: 0.1,  carbs: 13.0, fat: 0.1,  kcal: 288 }, category: "other", tspGrams: 4.2 },
  "baking powder":  { macros: { protein: 0.0,  carbs: 28.0, fat: 0.0,  kcal: 53  }, category: "other", tspGrams: 4.0 },
  "salt":           { macros: { protein: 0.0,  carbs: 0.0,  fat: 0.0,  kcal: 0   }, category: "other", tspGrams: 6.0 },
  "pepper":         { macros: { protein: 10.0, carbs: 64.0, fat: 3.3,  kcal: 255 }, category: "other", tspGrams: 2.1 },
  // Fresh herbs (negligible macros but avoids null lookup)
  "cilantro":       { macros: { protein: 2.1,  carbs: 3.7,  fat: 0.5,  kcal: 23  }, category: "other", cupGrams: 16 },
  "parsley":        { macros: { protein: 3.0,  carbs: 6.3,  fat: 0.8,  kcal: 36  }, category: "other", cupGrams: 16 },
  "basil":          { macros: { protein: 3.2,  carbs: 2.7,  fat: 0.6,  kcal: 23  }, category: "other", cupGrams: 24 },
  "mint":           { macros: { protein: 3.3,  carbs: 8.5,  fat: 0.7,  kcal: 44  }, category: "other", cupGrams: 24 },
  "dill":           { macros: { protein: 3.5,  carbs: 7.0,  fat: 1.1,  kcal: 43  }, category: "other", cupGrams: 8 },
  "thai basil":     { macros: { protein: 3.2,  carbs: 2.7,  fat: 0.6,  kcal: 23  }, category: "other", cupGrams: 24 },
  "chives":         { macros: { protein: 3.3,  carbs: 4.4,  fat: 0.7,  kcal: 30  }, category: "other", tbspGrams: 3 },
  "sage":           { macros: { protein: 3.7,  carbs: 60.7, fat: 12.7, kcal: 315 }, category: "other", tspGrams: 0.7 },
  // Chili & hot spices
  "cayenne":        { macros: { protein: 12.0, carbs: 57.0, fat: 17.3, kcal: 318 }, category: "other", tspGrams: 2.7 },
  "chili flakes":   { macros: { protein: 12.0, carbs: 57.0, fat: 17.3, kcal: 318 }, category: "other", tspGrams: 2.7 },
  "red chili":      { macros: { protein: 12.0, carbs: 57.0, fat: 17.3, kcal: 318 }, category: "other", tspGrams: 2.7 },
  "ancho chile":    { macros: { protein: 12.0, carbs: 57.0, fat: 17.3, kcal: 318 }, category: "other", tspGrams: 2.7 },
  "ancho chili":    { macros: { protein: 12.0, carbs: 57.0, fat: 17.3, kcal: 318 }, category: "other", tspGrams: 2.7 },
  "guajillo":       { macros: { protein: 12.0, carbs: 55.0, fat: 15.0, kcal: 305 }, category: "other", tspGrams: 2.7 },
  "gochugaru":      { macros: { protein: 10.0, carbs: 55.0, fat: 15.0, kcal: 288 }, category: "other", tspGrams: 2.5 },
  "bird chili":     { macros: { protein: 12.0, carbs: 57.0, fat: 17.3, kcal: 318 }, category: "other", tspGrams: 2.0 },
  "kashmiri":       { macros: { protein: 14.0, carbs: 54.0, fat: 12.9, kcal: 289 }, category: "other", tspGrams: 2.3 },
  "chana masala":   { macros: { protein: 12.0, carbs: 50.0, fat: 12.0, kcal: 350 }, category: "other", tspGrams: 2.5 },
  "coriander":      { macros: { protein: 12.4, carbs: 54.9, fat: 17.8, kcal: 298 }, category: "other", tspGrams: 2.0 },
  "curry leaves":   { macros: { protein: 6.1,  carbs: 18.7, fat: 1.0,  kcal: 108 }, category: "other", tspGrams: 0.5 },
  // Fruits (whole, used as garnish/component)
  "lemon":          { macros: { protein: 1.1,  carbs: 9.3,  fat: 0.3,  kcal: 29  }, category: "other", pieceGrams: 58 },
  "lime":           { macros: { protein: 0.7,  carbs: 11.0, fat: 0.2,  kcal: 30  }, category: "other", pieceGrams: 44 },
  "cantaloupe":     { macros: { protein: 0.8,  carbs: 8.2,  fat: 0.2,  kcal: 34  }, category: "other", cupGrams: 160 },
  // Saffron & aromatic seasonings
  "saffron":        { macros: { protein: 11.4, carbs: 65.4, fat: 5.8,  kcal: 310 }, category: "other", tspGrams: 0.7 },
  "bouillon":       { macros: { protein: 8.0,  carbs: 16.0, fat: 10.0, kcal: 199 }, category: "other", pieceGrams: 4 },
  // Mexican dairy
  "crema":          { macros: { protein: 2.0,  carbs: 4.0,  fat: 22.0, kcal: 220 }, category: "other", tbspGrams: 12 },
  // Alcohol (cooking)
  "red wine":       { macros: { protein: 0.1,  carbs: 2.6,  fat: 0.0,  kcal: 85  }, category: "other", tbspGrams: 15 },
  "white wine":     { macros: { protein: 0.1,  carbs: 1.4,  fat: 0.0,  kcal: 82  }, category: "other", tbspGrams: 15 },
  "rum":            { macros: { protein: 0.0,  carbs: 0.0,  fat: 0.0,  kcal: 231 }, category: "other", tspGrams: 4.2 },
  // Starchy / frying ingredients
  "cornstarch":     { macros: { protein: 0.3,  carbs: 91.3, fat: 0.1,  kcal: 381 }, category: "other", tbspGrams: 8.0 },
  "breadcrumbs":    { macros: { protein: 12.0, carbs: 72.0, fat: 5.0,  kcal: 395 }, category: "other", cupGrams: 108 },
  "panko":          { macros: { protein: 12.0, carbs: 72.0, fat: 5.0,  kcal: 395 }, category: "other", cupGrams: 108 },
  // Fermented / pickled (not covered above)
  "dill pickle":    { macros: { protein: 0.4,  carbs: 2.3,  fat: 0.2,  kcal: 11  }, category: "other", pieceGrams: 65 },
  // Frozen / prepared
  "gyoza":          { macros: { protein: 6.0,  carbs: 22.0, fat: 5.0,  kcal: 159 }, category: "other", pieceGrams: 20 },
  // Generic chicken (for "shredded cooked chicken" etc.)
  "chicken":        { macros: { protein: 27.0, carbs: 0.0,  fat: 8.0,  kcal: 185 }, category: "protein" },
  // Generic oil (catches "oil", "oil for frying", etc.)
  "oil":            { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 884 }, category: "fat", tbspGrams: 14.0, tspGrams: 4.7 },
  // Water & ice (zero macros — avoids null lookup)
  "water":          { macros: { protein: 0.0,  carbs: 0.0,  fat: 0.0,  kcal: 0   }, category: "other", cupGrams: 240 },
  "ice":            { macros: { protein: 0.0,  carbs: 0.0,  fat: 0.0,  kcal: 0   }, category: "other", cupGrams: 240 },
  // Pap / fermented corn porridge (West African)
  "pap":            { macros: { protein: 1.0,  carbs: 18.0, fat: 0.5,  kcal: 79  }, category: "other", cupGrams: 240 },
  "ogi":            { macros: { protein: 1.0,  carbs: 18.0, fat: 0.5,  kcal: 79  }, category: "other", cupGrams: 240 },
  "poha":           { macros: { protein: 2.0,  carbs: 77.0, fat: 0.5,  kcal: 321 }, category: "other", cupGrams: 100 },
};

// ─── COMBINED DATABASE (sorted longest-first for greedy keyword match) ────────
const RAW_DATABASE: Record<string, IngredientInfo> = {
  ...PROTEINS, ...CARBS, ...FATS, ...VEGETABLES, ...OTHER,
};

const SORTED_KEYS = Object.keys(RAW_DATABASE).sort((a, b) => b.length - a.length);

export function lookupIngredient(name: string): IngredientInfo | null {
  const lower = name.toLowerCase();
  for (const key of SORTED_KEYS) {
    if (lower.includes(key)) return RAW_DATABASE[key];
  }
  return null;
}

/** Convert a qty+unit pair to grams using the ingredient's unit overrides. */
export function toGrams(qty: number, unit: string, info: IngredientInfo): number {
  const u = unit.toLowerCase().trim();
  // Weight units — always exact
  if (u === "g" || u === "gram" || u === "grams") return qty;
  if (u === "kg") return qty * 1000;
  if (u === "oz" || u === "ounce" || u === "ounces") return qty * 28.3495;
  if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") return qty * 453.592;
  // Volume units
  if (u === "cup" || u === "cups") return qty * (info.cupGrams ?? 240);
  if (u === "tbsp" || u === "tablespoon" || u === "tablespoons") return qty * (info.tbspGrams ?? 14.79);
  if (u === "tsp" || u === "teaspoon" || u === "teaspoons") return qty * (info.tspGrams ?? 4.93);
  if (u === "ml") return qty;
  // Count units
  if (["whole", "piece", "pieces", "large", "medium", "small", "fillet", "fillets", "slice", "slices"].includes(u)) {
    return qty * (info.pieceGrams ?? 100);
  }
  // Unknown — return original qty, assume grams
  return qty;
}

/** Format grams to a precise display string (1 decimal).
 *  Protein sources show oz + g. Small fat sources show tbsp + g. */
export function formatGrams(grams: number, category: IngredientInfo["category"]): string {
  const precise = Math.round(grams * 10) / 10;   // 1 decimal
  if (category === "protein" && grams >= 28) {
    const oz = grams / 28.3495;
    return `${oz.toFixed(1)} oz (${precise} g)`;
  }
  if (category === "fat" && grams < 30) {
    const tbsp = grams / 14.79;
    if (tbsp < 8) return `${tbsp.toFixed(1)} tbsp (${precise} g)`;
  }
  return `${precise} g`;
}
