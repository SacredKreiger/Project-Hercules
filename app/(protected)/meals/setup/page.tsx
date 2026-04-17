import { redirect } from "next/navigation";

// Setup flow replaced by the Reconfigure sheet on /meals
export default function MealSetupPage() {
  redirect("/meals");
}
