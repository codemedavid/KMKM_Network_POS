"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  user: { id: string; email: string; name: string; role: string } | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoading(true)
      if (session?.user) {
        // Fetch profile to get full_name and role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("user_id", session.user.id)
          .single()

        if (profileError) {
          console.error("Error fetching profile:", profileError.message)
          // Fallback to email and default role if profile fetch fails
          setUser({
            id: session.user.id,
            email: session.user.email || "unknown@example.com",
            name: session.user.email || "Unknown User",
            role: "cashier", // Default role if profile not found
          })
        } else {
          setUser({
            id: session.user.id,
            email: session.user.email || "unknown@example.com",
            name: profile.full_name || session.user.email || "Unknown User", // Prioritize full_name, then email
            role: profile.role || "cashier", // Default role if not set in profile
          })
        }
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    // Initial check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("user_id", session.user.id)
          .single()

        if (profileError) {
          console.error("Error fetching profile:", profileError.message)
          setUser({
            id: session.user.id,
            email: session.user.email || "unknown@example.com",
            name: session.user.email || "Unknown User",
            role: "cashier",
          })
        } else {
          setUser({
            id: session.user.id,
            email: session.user.email || "unknown@example.com",
            name: profile.full_name || session.user.email || "Unknown User",
            role: profile.role || "cashier",
          })
        }
      }
      setIsLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error signing out:", error.message)
    } else {
      setUser(null)
    }
    setIsLoading(false)
  }

  return <AuthContext.Provider value={{ user, isLoading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
