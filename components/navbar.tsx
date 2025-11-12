"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Sun, Moon, Search, Menu, X } from "lucide-react";
import { useTheme } from "@/lib/ui/theme";
import { useSearch } from "@/lib/ui/search-context";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User as AppUser } from "@/lib/types";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Only show search on leaderboard page
  const isLeaderboardPage = pathname === '/leaderboard';

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

  const { theme, toggleTheme } = useTheme();
  const { query, setQuery, open, setOpen } = useSearch();

  // Close search on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = () => setOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open, setOpen]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close mobile drawer on route/path change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
            <motion.span
              className="text-2xl font-bold text-gray-900 dark:text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🐐 Goatscan
            </motion.span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isActive 
                      ? "text-gray-900 dark:text-white" 
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Search - only on leaderboard */}
            {isLeaderboardPage && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                  }}
                  className="h-9 w-9 flex items-center justify-center rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
                  title="Search"
                >
                  <Search className="h-4 w-4" />
                </button>
                {open && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 z-50"
                  >
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search @username or wallet..."
                      className="w-full h-9 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-3 text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                    />
                    {query && (
                      <button
                        onClick={() => setQuery('')}
                        className="mt-2 h-9 w-full text-sm rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* User Account */}
            {loading ? (
              <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={
                    userProfile?.x_username
                      ? `/profile/${userProfile.x_username}`
                      : "/signup"
                  }
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/80"
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
                  className="h-8 px-2 sm:px-3 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline-block ml-2">Log Out</span>
                </Button>
              </div>
            ) : (
              <Link
                href="/signup"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Sign Up
              </Link>
            )}
          </div>

          {/* Mobile Right Side - Search Icon (Leaderboard only) + Hamburger Menu */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Search Icon - only on leaderboard */}
            {isLeaderboardPage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(!open);
                }}
                className="h-9 w-9 flex items-center justify-center rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
                title="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
            
            {/* Mobile Menu Button */}
            <button
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              onClick={(e) => {
                e.stopPropagation();
                setMobileOpen(!mobileOpen);
              }}
              className="h-9 w-9 flex items-center justify-center rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Search Input - appears below navbar when open on leaderboard */}
      {isLeaderboardPage && open && (
        <div className="md:hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <div className="container mx-auto">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search @username or wallet..."
              className="w-full h-11 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-4 text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="mt-2 h-9 w-full text-sm rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className={cn(
            "md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40",
            open && isLeaderboardPage ? "top-[9rem]" : "top-16"
          )}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-drawer"
            className={cn(
              "md:hidden fixed inset-x-0 bottom-0 z-50 overflow-y-auto",
              open && isLeaderboardPage ? "top-[9rem]" : "top-16"
            )}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-xl">
              <div className="container mx-auto px-4 py-4">
                {/* Navigation Links */}
                <div className="space-y-1 mb-4">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "block px-4 py-3 text-base font-medium rounded-md transition-colors",
                          isActive
                            ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800"
                            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>


                {/* Theme Toggle */}
                <div className="mb-4">
                  <button
                    onClick={toggleTheme}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="h-4 w-4" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>

                {/* User Account */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                  {loading ? (
                    <div className="h-11 w-full animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
                  ) : user ? (
                    <div className="flex items-center gap-2">
                      <Link
                        href={
                          userProfile?.x_username
                            ? `/profile/${userProfile.x_username}`
                            : "/signup"
                        }
                        onClick={() => setMobileOpen(false)}
                        className="flex-1 h-11 flex items-center justify-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <UserIcon className="h-4 w-4" />
                        <span>{displayName?.startsWith("@") ? displayName : "Profile"}</span>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMobileOpen(false);
                          handleLogout();
                        }}
                        className="h-11 px-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Link
                      href="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="w-full h-11 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Sign Up
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

