"use client"

import type React from "react"
import { Scan, Settings, BarChart3, History, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  badge?: number
}

const navItems: NavItem[] = [
  { icon: Scan, label: "Scanner", href: "/" },
  { icon: History, label: "History", href: "/history" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Settings, label: "Admin", href: "/admin" },
  { icon: User, label: "Profile", href: "/profile" },
]

export default function NeumorphicNav() {
  const pathname = usePathname()

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
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`relative px-6 py-3 rounded-2xl transition-all duration-200 ${
                        isActive
                          ? "bg-gray-100 shadow-neumorphic-inset text-blue-600"
                          : "bg-gray-100 shadow-neumorphic hover:shadow-neumorphic-hover text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.badge && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{item.badge}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-100 border-t border-gray-200/50">
        <div className="px-4 py-2">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link key={item.href} href={item.href} className="flex-1">
                  <div
                    className={`relative mx-1 py-3 px-2 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? "bg-gray-100 shadow-neumorphic-inset"
                        : "bg-gray-100 shadow-neumorphic-subtle hover:shadow-neumorphic"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-gray-600"}`} />
                      <span className={`text-xs font-medium ${isActive ? "text-blue-600" : "text-gray-600"}`}>
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
              )
            })}
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="hidden md:block h-20" />
      <div className="md:hidden h-20" />
    </>
  )
}
