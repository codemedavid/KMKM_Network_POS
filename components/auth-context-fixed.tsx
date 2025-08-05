"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: { id: string; email: string; name: string; role: string } | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const mapSupabaseUser = useCallback(async (supabaseUser: User | null) => {
    if (!supabaseUser) {
      return null
    }

    // Fetch profile to get full_name and role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("user_id", supabaseUser.id)
      .single()

    if (profileError) {
      console.error("Error fetching profile:", profileError.message)
      // Fallback to email and default role if profile fetch fails
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || "unknown@example.com",
        name: supabaseUser.email || "Unknown User",
        role: "cashier", // Default role if profile not found
      }
    }

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || "unknown@example.com",
      name: profile.full_name || supabaseUser.email || "Unknown User", // Prioritize full_name, then email
      role: profile.role || "cashier", // Default role if not set in profile
    }
  }, [])

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoading(true)
      if (session?.user) {
        const mappedUser = await mapSupabaseUser(session.user)
        setUser(mappedUser)
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    // Initial check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const mappedUser = await mapSupabaseUser(session.user)
        setUser(mappedUser)
      }
      setIsLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [mapSupabaseUser])

  const signOut = useCallback(async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error signing out:", error.message)
    } else {
      setUser(null)
    }
    setIsLoading(false)
  }, [])

  return <AuthContext.Provider value={{ user, isLoading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
