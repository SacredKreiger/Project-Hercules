import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const { data, error } = await supabase.auth.signUp({
    email: "berrios1129@gmail.com",
    password: "Jello12#",
  });

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  console.log("Account created:", data.user?.email);
  console.log("User ID:", data.user?.id);
}

main();
