"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase" // Import Supabase client
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "cashier"
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (name: string, email: string, password: string, role: "admin" | "cashier") => Promise<boolean>
  isLoading: boolean
  // Removed 'users' from AuthContextType as it will be fetched in specific components (e.g., AnalyticsDashboard)
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Helper to map Supabase user to our internal User type
  const mapSupabaseUser = (sbUser: SupabaseUser | null): User | null => {
    if (!sbUser) return null
    // IMPORTANT: Read role from user_metadata as set during signUp
    const role = (sbUser.user_metadata?.role || "cashier") as "admin" | "cashier"
    return {
      id: sbUser.id,
      name: sbUser.user_metadata?.full_name || sbUser.email || "User",
      email: sbUser.email!,
      role,
    }
  }

  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null

    if (supabase && supabase.auth) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        setIsLoading(true)
        if (session?.user) {
          const currentUser = mapSupabaseUser(session.user)
          setUser(currentUser)
        } else {
          setUser(null)
        }
        setIsLoading(false)
      })
      authSubscription = subscription
    } else {
      console.warn("Supabase client or auth module not available during AuthProvider useEffect setup.")
    }

    const getInitialSession = async () => {
      setIsLoading(true)
      if (supabase && supabase.auth) {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()
        if (session?.user) {
          const currentUser = mapSupabaseUser(session.user)
          setUser(currentUser)
        } else {
          setUser(null)
        }
      } else {
        console.warn("Supabase client or auth module not available during initial session fetch.")
      }
      setIsLoading(false)
    }

    getInitialSession()

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, []) // Empty dependency array means this effect runs once on mount and cleanup on unmount.

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    if (!supabase || !supabase.auth) {
      console.error("Supabase client or auth module not available for login.")
      setIsLoading(false)
      return false
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setIsLoading(false)
    if (error) {
      console.error("Login error:", error.message)
      return false
    }
    return !!data.user
  }

  const logout = async () => {
    setIsLoading(true)
    if (!supabase || !supabase.auth) {
      console.error("Supabase client or auth module not available for logout.")
      setIsLoading(false)
      return false
    }
    const { error } = await supabase.auth.signOut()
    setIsLoading(false)
    if (error) {
      console.error("Logout error:", error.message)
      return false
    }
    return true
  }

  const register = async (
    name: string,
    email: string,
    password: string,
    role: "admin" | "cashier",
  ): Promise<boolean> => {
    setIsLoading(true)
    if (!supabase || !supabase.auth) {
      console.error("Supabase client or auth module not available for registration.")
      setIsLoading(false)
      return false
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role: role }, // Store name and role in user_metadata
      },
    })
    setIsLoading(false)
    if (error) {
      console.error("Registration error:", error.message)
      return false
    }
    if (data.user) {
      // No need to update 'users' state here, as it's removed from AuthContext
      return true
    }
    return false
  }

  return <AuthContext.Provider value={{ user, login, logout, register, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
