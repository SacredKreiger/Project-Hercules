import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import DrumNav from "@/components/DrumNav";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile?.onboarding_complete) redirect("/onboarding");

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <DrumNav />
      {/* main scrolls internally — gives h-full a real height context for the dashboard */}
      <main className="flex-1 md:ml-64 p-4 md:p-6 pb-safe overflow-y-auto h-full">
        {children}
      </main>
    </div>
  );
}
