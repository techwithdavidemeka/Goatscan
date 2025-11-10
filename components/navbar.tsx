"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User as AppUser } from "@/lib/types";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { href: "/home", label: "Home" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch user profile when user is authenticated
    if (user) {
      getUserProfile(user.id).then((profile) => {
        setUserProfile(profile);
      });
    } else {
      setUserProfile(null);
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    router.push("/");
  };

  // Get display name: X username from profile, metadata, or wallet address
  const getDisplayName = () => {
    if (!user) return null;

    // Priority 1: Get X username from user profile (database)
    if (userProfile?.x_username) {
      return `@${userProfile.x_username.replace("@", "")}`;
    }

    // Priority 2: Get X username from user metadata (OAuth)
    const xUsername =
      user.user_metadata?.user_name ||
      user.user_metadata?.preferred_username ||
      user.user_metadata?.full_name?.split(" ")[0]?.replace("@", "");

    if (xUsername) {
      return `@${xUsername.replace("@", "")}`;
    }

    // Priority 3: Fall back to wallet address from profile
    if (userProfile?.wallet_address) {
      const address = userProfile.wallet_address;
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }

    // Priority 4: Fall back to user email if available
    if (user.email) {
      return user.email.split("@")[0];
    }

    return "User";
  };

  const displayName = getDisplayName();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <motion.span
            className="text-2xl font-bold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🐐 Goatscan
          </motion.span>
        </Link>
        <div className="flex items-center space-x-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href={
                  userProfile?.x_username
                    ? `/profile/${userProfile.x_username}`
                    : "/signup"
                }
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
              >
                <UserIcon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline-block truncate max-w-[120px]">
                  {displayName}
                </span>
                <span className="sm:hidden">
                  {displayName?.startsWith("@") ? displayName.slice(0, 8) : "Profile"}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 px-2 sm:px-3"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline-block ml-2">Log Out</span>
              </Button>
            </div>
          ) : (
            <Link
              href="/signup"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign Up
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

