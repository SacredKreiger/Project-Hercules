"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, ShoppingCart, Dumbbell, TrendingUp, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/grocery", label: "Grocery", icon: ShoppingCart },
  { href: "/train", label: "Train", icon: Dumbbell },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    /* Desktop only — mobile nav is handled by DrumNav */
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 glass border-r border-border flex-col z-40">
      <div className="p-6 border-b border-border">
        <h1 className="text-lg font-bold tracking-[0.15em]">HERCULES</h1>
        <p className="text-xs text-muted-foreground mt-1">Your Fitness Command Center</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all",
              pathname === href
                ? "glass-active text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground rounded-2xl"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
