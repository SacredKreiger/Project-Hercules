import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile?.onboarding_complete) redirect("/onboarding");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      {/* Desktop: offset for sidebar. Mobile: offset for top bar + bottom nav */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 pb-24 md:pb-0 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
