"use client"

import { Button } from "@/components/ui/button"

import type React from "react"
import { Scan, User, HomeIcon, HistoryIcon, BarChartIcon, SettingsIcon, LogOutIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "./auth-context-fixed" // Use the fixed auth context

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  badge?: number
  roles?: string[]
}

export default function NeumorphicNav() {
  const { user, signOut, isLoading } = useAuth()
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { icon: HomeIcon, label: "Home", href: "/", roles: ["admin", "cashier"] },
    { icon: Scan, label: "Scanner", href: "/scanner", roles: ["admin", "cashier"] },
    { icon: HistoryIcon, label: "History", href: "/history", roles: ["admin", "cashier"] },
    { icon: BarChartIcon, label: "Analytics", href: "/analytics", roles: ["admin", "cashier"] },
    { icon: SettingsIcon, label: "Admin", href: "/admin", roles: ["admin"] },
    { icon: User, label: "Profile", href: "/profile", roles: ["admin", "cashier"] },
  ]

  if (isLoading) {
    return (
      <nav className="sticky top-0 z-50 w-full bg-gray-100 p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link className="flex-shrink-0" href="/">
            <img src="/placeholder-logo.svg" width="32" height="32" alt="Logo" className="h-8 w-8" />
          </Link>
          <div className="flex items-center space-x-4">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <>
      {/* Desktop Navigation - Top */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center shadow-neumorphic-inset">
                <Scan className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">GCash POS</h1>
                <p className="text-sm text-gray-500">Receipt Scanner</p>
              </div>
            </div>

            {/* Desktop Navigation Items */}
            <div className="flex items-center gap-2">
              {navItems.map((item) =>
                item.roles?.includes(user?.role || "") ? (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`relative px-6 py-3 rounded-2xl transition-all duration-200 ${
                        pathname === item.href
                          ? "bg-gray-100 shadow-neumorphic-inset text-blue-600"
                          : "bg-gray-100 shadow-neumorphic hover:shadow-neumorphic-hover text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.badge && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{item.badge}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ) : null,
              )}
              {user ? (
                <Button onClick={signOut} variant="ghost" size="sm" className="neumorphic-button">
                  <LogOutIcon className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              ) : (
                <Link href="/login">
                  <Button variant="default" size="sm" className="neumorphic-button">
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-100 border-t border-gray-200/50">
        <div className="px-4 py-2">
          <div className="flex items-center justify-around">
            {navItems.map((item) =>
              item.roles?.includes(user?.role || "") ? (
                <Link key={item.href} href={item.href} className="flex-1">
                  <div
                    className={`relative mx-1 py-3 px-2 rounded-2xl transition-all duration-200 ${
                      pathname === item.href
                        ? "bg-gray-100 shadow-neumorphic-inset"
                        : "bg-gray-100 shadow-neumorphic-subtle hover:shadow-neumorphic"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <item.icon className={`w-5 h-5 ${pathname === item.href ? "text-blue-600" : "text-gray-600"}`} />
                      <span
                        className={`text-xs font-medium ${pathname === item.href ? "text-blue-600" : "text-gray-600"}`}
                      >
                        {item.label}
                      </span>
                    </div>
                    {item.badge && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">{item.badge}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ) : null,
            )}
            {user ? (
              <Button onClick={signOut} variant="ghost" size="sm" className="neumorphic-button">
                <LogOutIcon className="h-4 w-4 mr-1" />
                Logout
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm" className="neumorphic-button">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="hidden md:block h-20" />
      <div className="md:hidden h-20" />
    </>
  )
}
