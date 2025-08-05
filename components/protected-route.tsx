"use client"

import type React from "react"

import { useAuth } from "./auth-context-fixed" // Use the fixed auth context
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not logged in, redirect to login
        router.push("/login")
      } else if (!allowedRoles.includes(user.role)) {
        // Logged in but unauthorized role, redirect to home or an access denied page
        alert("You do not have permission to view this page.")
        router.push("/")
      }
    }
  }, [user, isLoading, allowedRoles, router])

  if (isLoading || !user || !allowedRoles.includes(user.role)) {
    // Optionally render a loading spinner or a message
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading or redirecting...</p>
      </div>
    )
  }

  return <>{children}</>
}
