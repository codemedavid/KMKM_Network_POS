"use client"

import type React from "react"
import { Scan, Settings, BarChart3, History, User, LogOut, CreditCard } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "./auth-context-fixed"
import { Button } from "@/components/ui/button"

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  badge?: number
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { icon: Scan, label: "Scanner", href: "/" },
  { icon: History, label: "History", href: "/history" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: CreditCard, label: "Accounts", href: "/accounts", adminOnly: true },
  { icon: Settings, label: "Admin", href: "/admin", adminOnly: true },
]

export default function ModernNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && user?.role !== "admin") {
      return false
    }
    return true
  })

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <>
      {/* Desktop Navigation - Top */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Scan className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">KMKM Network</h1>
                <p className="text-sm text-gray-500">Receipt Scanner and POS </p>
              </div>
            </div>

            {/* Desktop Navigation Items */}
            <div className="flex items-center gap-1">
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`relative px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                        isActive
                          ? "bg-blue-50 text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </div>
                      {item.badge && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-xs text-white font-bold">{item.badge}</span>
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                      )}
                    </div>
                  </Link>
                )
              })}

              {/* User Info & Logout */}
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="border-gray-300 hover:border-gray-400 shadow-sm bg-transparent"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200/50">
        <div className="px-2 py-2">
          <div className="flex items-center justify-around">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link key={item.href} href={item.href} className="flex-1">
                  <div
                    className={`relative mx-1 py-2.5 px-2 rounded-2xl transition-all duration-200 ${
                      isActive ? "bg-blue-50 scale-105" : "hover:bg-gray-50 active:scale-95"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`p-1.5 rounded-xl transition-colors duration-200 ${
                          isActive ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" : "text-gray-600"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-xs font-medium transition-colors duration-200 ${
                          isActive ? "text-blue-600" : "text-gray-600"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    {item.badge && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xs text-white font-bold">{item.badge}</span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}

            {/* Mobile Logout Button */}
            <div className="flex-1">
              <div className="mx-1 py-2.5 px-2 rounded-2xl">
                <button
                  onClick={handleLogout}
                  className="flex flex-col items-center gap-1 w-full hover:bg-gray-50 active:scale-95 p-1.5 rounded-xl transition-all duration-200"
                >
                  <div className="p-1.5 rounded-xl text-gray-600">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-600">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="hidden md:block h-20" />
      <div className="md:hidden h-20" />
    </>
  )
}
