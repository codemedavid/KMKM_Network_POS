"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, TestTube, Eye, EyeOff, Copy, UserPlus } from "lucide-react"
import ModernNav from "./modern-nav"
import ProtectedRoute from "./protected-route"
import { useAuth } from "./auth-context-fixed"
import { updateProfile, deleteProfile } from "@/actions/profile"
import { supabase } from "@/lib/supabase" // Client-side Supabase client for real-time updates

interface AdminConfig {
  targetGCashNumber: string
  targetGCashName: string
  requiredFields: string[]
  extractionRules: {
    amountPattern: string
    referencePattern: string
    datePattern: string
    senderPattern: string
    receiverPattern: string
    phonePattern: string
  }
  serviceCommissionRate: number
  tipCommissionRate: number
}

interface Profile {
  id: string
  full_name: string | null
  role: string
  email?: string // Added email for display
}

interface AdminConfigProps {
  initialProfiles: Profile[]
  initialReceipts: any[] // Receipts are not directly used here, but passed from page
}

const defaultConfig: AdminConfig = {
  targetGCashNumber: "+63 915 642 9591",
  targetGCashName: "Your Business Name",
  requiredFields: ["amount", "referenceNumber", "dateTime"],
  extractionRules: {
    amountPattern: "(?:Total Amount Sent|Amount)\\s*[£₱]?\\s*([0-9,]+\\.?[0-9]*)",
    referencePattern: "(?:Ref No\\.|Reference|Transaction)\\s*([0-9]+)",
    datePattern: "([A-Za-z]{3}\\s+[0-9]{1,2},\\s+[0-9]{4}\\s+[0-9]{1,2}:[0-9]{2}\\s*[AP]M)",
    senderPattern: "(?:From|Sender|Sent by)[:\\s]*([A-Za-z\\s]+)",
    receiverPattern: "(?:To|Receiver|Received by)[:\\s]*([A-Za-z\\s]+)",
    phonePattern: "(\\+63\\s*[0-9]{3}\\s*[0-9]{3}\\s*[0-9]{4}|09[0-9]{9})",
  },
  serviceCommissionRate: 20,
  tipCommissionRate: 50,
}

const availableFields = [
  { key: "amount", label: "Amount", description: "Transaction amount" },
  { key: "referenceNumber", label: "Ref No.", description: "GCash transaction reference" },
  { key: "dateTime", label: "Date & Time", description: "Transaction timestamp" },
  { key: "senderName", label: "Sender Name", description: "Customer name" },
  { key: "receiverName", label: "Receiver Name", description: "Business name" },
]

const sampleTestData = `RE.«<E V. +63 915 642 9591 Sent via GCash Amount 2,080.00 Total Amount Sent £2080.00 Ref No. 8031350663152 Aug 5, 2025 12:33 AM`

function AdminConfigContent({ initialProfiles }: AdminConfigProps) {
  const [config, setConfig] = useState<AdminConfig>(defaultConfig)
  const [showPatterns, setShowPatterns] = useState(false)
  const [testText, setTestText] = useState(sampleTestData)
  const [testResults, setTestResults] = useState<any>(null)
  const { user: currentUser, isLoading: userLoading } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [newAgentName, setNewAgentName] = useState("")
  const [newAgentEmail, setNewAgentEmail] = useState("")
  const [newAgentPassword, setNewAgentPassword] = useState("")
  const [newAgentRole, setNewAgentRole] = useState("cashier") // Default role
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    const { data, error } = await supabase.from("profiles").select("user_id, full_name, role")
    if (error) {
      console.error("Error fetching profiles:", error.message)
      setError("Failed to fetch profiles.")
    } else {
      // Fetch emails from auth.users for better name fallback
      const userIds = data.map((p) => p.user_id)
      const { data: authUsersData, error: authUsersError } = await supabase
        .from("users", { schema: "auth" })
        .select("id, email")
        .in("id", userIds)

      const authUserEmailsMap = new Map<string, string>()
      authUsersData?.forEach((user) => {
        if (user.id && user.email) {
          authUserEmailsMap.set(user.id, user.email)
        }
      })

      const mappedProfiles: Profile[] = data.map((p) => ({
        id: p.user_id,
        full_name: p.full_name,
        role: p.role,
        email: authUserEmailsMap.get(p.user_id),
      }))
      setProfiles(mappedProfiles)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfiles()

    // Set up real-time listener for profiles table
    const channel = supabase
      .channel("profiles_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
        console.log("Change received!", payload)
        fetchProfiles() // Re-fetch profiles on any change
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchProfiles])

  const updateConfig = (updates: Partial<AdminConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }

  const updateExtractionRule = (field: string, pattern: string) => {
    setConfig((prev) => ({
      ...prev,
      extractionRules: {
        ...prev.extractionRules,
        [field]: pattern,
      },
    }))
  }

  const toggleRequiredField = (field: string) => {
    setConfig((prev) => ({
      ...prev,
      requiredFields: prev.requiredFields.includes(field)
        ? prev.requiredFields.filter((f) => f !== field)
        : [...prev.requiredFields, field],
    }))
  }

  const testPatterns = () => {
    const results: any = {}

    Object.entries(config.extractionRules).forEach(([key, pattern]) => {
      try {
        const regex = new RegExp(pattern, "i")
        const match = testText.match(regex)
        results[key] = {
          found: !!match,
          value: match ? match[1] : null,
          fullMatch: match ? match[0] : null,
        }
      } catch (error) {
        results[key] = {
          found: false,
          error: "Invalid regex pattern",
        }
      }
    })

    setTestResults(results)
  }

  const saveConfig = () => {
    localStorage.setItem("gcash-pos-admin-config", JSON.stringify(config))
    alert("Configuration saved successfully!")
  }

  const loadSampleData = () => {
    setTestText(sampleTestData)
  }

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (!newAgentEmail || !newAgentPassword) {
      setError("Email and password are required.")
      setLoading(false)
      return
    }

    try {
      // 1. Create user in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newAgentEmail,
        password: newAgentPassword,
        email_confirm: true, // Automatically confirm email for admin-created users
        user_metadata: { full_name: newAgentName, role: newAgentRole }, // Pass full_name and role
      })

      if (authError) {
        setError(`Error creating user: ${authError.message}`)
        setLoading(false)
        return
      }

      // The 'handle_new_user' trigger should automatically create the profile in public.profiles
      // with the full_name and role from user_metadata.
      setSuccess(`Agent "${newAgentName || newAgentEmail}" added successfully!`)
      setNewAgentName("")
      setNewAgentEmail("")
      setNewAgentPassword("")
      setNewAgentRole("cashier") // Reset to default
      fetchProfiles() // Re-fetch to show the new agent
    } catch (err: any) {
      console.error("Unexpected error adding agent:", err.message)
      setError("An unexpected error occurred while adding the agent.")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (currentUser?.id === userId) {
      alert("You cannot change your own role.")
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    const { success, error } = await updateProfile(userId, { role: newRole })
    if (error) {
      setError(`Failed to update role: ${error}`)
    } else {
      setSuccess("Agent role updated successfully!")
      fetchProfiles() // Re-fetch to show updated role
    }
    setLoading(false)
  }

  const handleDeleteAgent = async (userId: string, agentName: string) => {
    if (currentUser?.id === userId) {
      alert("You cannot delete your own account.")
      return
    }
    if (!confirm(`Are you sure you want to delete agent "${agentName}"? This action cannot be undone.`)) {
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    const { success, error } = await deleteProfile(userId)
    if (error) {
      setError(`Failed to delete agent: ${error}`)
    } else {
      setSuccess("Agent deleted successfully!")
      fetchProfiles() // Re-fetch to show updated list
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <ModernNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
            Admin Configuration
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Configure OCR extraction rules, commission settings, and manage agents
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Target GCash Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gcash-number" className="text-sm font-medium text-gray-700">
                    GCash Number
                  </Label>
                  <Input
                    id="gcash-number"
                    value={config.targetGCashNumber}
                    onChange={(e) => updateConfig({ targetGCashNumber: e.target.value })}
                    className="h-12 bg-white/50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl shadow-sm"
                    placeholder="+63 915 642 9591"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gcash-name" className="text-sm font-medium text-gray-700">
                    Account Name
                  </Label>
                  <Input
                    id="gcash-name"
                    value={config.targetGCashName}
                    onChange={(e) => updateConfig({ targetGCashName: e.target.value })}
                    className="h-12 bg-white/50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl shadow-sm"
                    placeholder="Your Business Name"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Required Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableFields.map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200/50 shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{field.label}</div>
                      <div className="text-sm text-gray-600">{field.description}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRequiredField(field.key)}
                      className="border-gray-300 hover:border-gray-400 shadow-sm"
                    >
                      {config.requiredFields.includes(field.key) ? "Remove" : "Add"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Agent Commission Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service-commission" className="text-sm font-medium text-gray-700">
                    Service Price Commission Rate (%)
                  </Label>
                  <Input
                    id="service-commission"
                    type="number"
                    step="0.01"
                    value={config.serviceCommissionRate}
                    onChange={(e) => updateConfig({ serviceCommissionRate: Number.parseFloat(e.target.value) })}
                    className="h-12 bg-white/50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl shadow-sm"
                    placeholder="20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tip-commission" className="text-sm font-medium text-gray-700">
                    Tip Commission Rate (%)
                  </Label>
                  <Input
                    id="tip-commission"
                    type="number"
                    step="0.01"
                    value={config.tipCommissionRate}
                    onChange={(e) => updateConfig({ tipCommissionRate: Number.parseFloat(e.target.value) })}
                    className="h-12 bg-white/50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl shadow-sm"
                    placeholder="50"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">Extraction Patterns</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPatterns(!showPatterns)}
                    className="border-gray-300 hover:border-gray-400 shadow-sm"
                  >
                    {showPatterns ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPatterns ? "Hide" : "Show"} Patterns
                  </Button>
                </div>
              </CardHeader>
              {showPatterns && (
                <CardContent className="space-y-4">
                  {Object.entries(config.extractionRules).map(([key, pattern]) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 capitalize">
                        {key.replace(/([A-Z])/g, " $1").toLowerCase()} Pattern
                      </Label>
                      <Input
                        value={pattern}
                        onChange={(e) => updateExtractionRule(key, e.target.value)}
                        className="bg-white/50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl font-mono text-sm shadow-sm"
                        placeholder="Enter regex pattern here"
                      />
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            {/* Add New Agent */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Add New Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAgent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newAgentName">Full Name (Optional)</Label>
                    <Input
                      id="newAgentName"
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      placeholder="John Doe"
                      className="neumorphic-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newAgentEmail">Email</Label>
                    <Input
                      id="newAgentEmail"
                      type="email"
                      value={newAgentEmail}
                      onChange={(e) => setNewAgentEmail(e.target.value)}
                      placeholder="agent@example.com"
                      required
                      className="neumorphic-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newAgentPassword">Password</Label>
                    <Input
                      id="newAgentPassword"
                      type="password"
                      value={newAgentPassword}
                      onChange={(e) => setNewAgentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="neumorphic-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newAgentRole">Role</Label>
                    <Select value={newAgentRole} onValueChange={setNewAgentRole}>
                      <SelectTrigger id="newAgentRole" className="neumorphic-input">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cashier">Cashier</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={loading} className="neumorphic-button">
                      {loading ? "Adding Agent..." : "Add Agent"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Manage Agents */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Manage Agents</CardTitle>
              </CardHeader>
              <CardContent>
                {loading && profiles.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">Loading agents...</div>
                ) : profiles.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No agents found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell className="font-medium">
                              {profile.full_name || profile.email || `Agent ${profile.id.substring(0, 4)}`}
                            </TableCell>
                            <TableCell>{profile.email || "N/A"}</TableCell>
                            <TableCell>
                              <Select
                                value={profile.role}
                                onValueChange={(newRole) => handleUpdateRole(profile.id, newRole)}
                                disabled={currentUser?.id === profile.id || loading}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cashier">Cashier</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDeleteAgent(
                                    profile.id,
                                    profile.full_name || profile.email || `Agent ${profile.id.substring(0, 4)}`,
                                  )
                                }
                                disabled={currentUser?.id === profile.id || loading}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pattern Testing */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TestTube className="w-5 h-5" />
                    Pattern Testing
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSampleData}
                    className="border-gray-300 hover:border-gray-400 shadow-sm bg-transparent"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Load Sample
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-text" className="text-sm font-medium text-gray-700">
                    Sample Receipt Text
                  </Label>
                  <Input
                    id="test-text"
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="bg-white/50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl font-mono text-sm shadow-sm"
                    placeholder="Paste sample receipt text here to test extraction patterns..."
                  />
                </div>
                <Button
                  onClick={testPatterns}
                  disabled={!testText.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Patterns
                </Button>
              </CardContent>
            </Card>

            {testResults && (
              <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Test Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(testResults).map(([key, result]: [string, any]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded-xl border border-gray-200/50 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                        </span>
                        <Badge variant={result.found ? "default" : "secondary"} className="shadow-sm">
                          {result.found ? "✓ Found" : "✗ Not Found"}
                        </Badge>
                      </div>
                      {result.found && (
                        <div className="text-sm space-y-1">
                          <div className="bg-emerald-50 p-2 rounded border border-emerald-200 shadow-sm">
                            <strong className="text-emerald-800">Extracted:</strong>{" "}
                            <span className="font-mono text-emerald-900">{result.value}</span>
                          </div>
                          <div className="text-gray-600 text-xs">
                            <strong>Full match:</strong> <span className="font-mono">{result.fullMatch}</span>
                          </div>
                        </div>
                      )}
                      {result.error && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200 shadow-sm">
                          <strong>Error:</strong> {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            onClick={saveConfig}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminConfig({ initialProfiles }: AdminConfigProps) {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminConfigContent initialProfiles={initialProfiles} />
    </ProtectedRoute>
  )
}
