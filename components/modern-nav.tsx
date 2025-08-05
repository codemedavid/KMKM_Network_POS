"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "./auth-context-fixed" // Use the fixed auth context
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { HomeIcon, HistoryIcon, BarChartIcon, SettingsIcon, LogOutIcon } from "lucide-react"

export function ModernNav() {
  const { user, signOut, isLoading } = useAuth()
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Home", icon: HomeIcon, roles: ["admin", "cashier"] },
    { href: "/history", label: "History", icon: HistoryIcon, roles: ["admin", "cashier"] },
    { href: "/analytics", label: "Analytics", icon: BarChartIcon, roles: ["admin", "cashier"] },
    { href: "/admin", label: "Admin", icon: SettingsIcon, roles: ["admin"] },
  ]

  if (isLoading) {
    return (
      <nav className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link className="flex-shrink-0" href="/">
              <img src="/placeholder-logo.svg" width="32" height="32" alt="Logo" className="h-8 w-8" />
            </Link>
            <div className="flex items-center space-x-4">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link className="flex-shrink-0" href="/">
            <img src="/placeholder-logo.svg" width="32" height="32" alt="Logo" className="h-8 w-8" />
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {navItems.map((item) =>
                  item.roles.includes(user.role) ? (
                    <Link
                      key={item.href}
                      className={cn(
                        "text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1",
                        pathname === item.href && "bg-gray-100 text-gray-900",
                      )}
                      href={item.href}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ) : null,
                )}
                <Button onClick={signOut} variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <LogOutIcon className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default ModernNav
