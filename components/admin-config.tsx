"use client"

import type React from "react"

import { useState } from "react"
import { Save, TestTube, Eye, EyeOff, Copy, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import ModernNav from "./modern-nav"
import ProtectedRoute from "./protected-route"
import { useAuth } from "./auth-context-fixed"

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

function AdminConfigContent() {
  const [config, setConfig] = useState<AdminConfig>(defaultConfig)
  const [showPatterns, setShowPatterns] = useState(false)
  const [testText, setTestText] = useState(sampleTestData)
  const [testResults, setTestResults] = useState<any>(null)

  const { register } = useAuth() // Only need register here
  const [agentName, setAgentName] = useState("")
  const [agentEmail, setAgentEmail] = useState("")
  const [agentPassword, setAgentPassword] = useState("")
  const [addAgentError, setAddAgentError] = useState("")
  const [addAgentSuccess, setAddAgentSuccess] = useState("")
  const [showAgentPassword, setShowAgentPassword] = useState(false)

  // Agent earnings logic moved to AnalyticsDashboard

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
    setAddAgentError("")
    setAddAgentSuccess("")

    if (!agentName || !agentEmail || !agentPassword) {
      setAddAgentError("Please fill in all fields.")
      return
    }

    const success = await register(agentName, agentEmail, agentPassword, "cashier")
    if (success) {
      setAddAgentSuccess("Agent account added successfully! User will receive a confirmation email.")
      setAgentName("")
      setAgentEmail("")
      setAgentPassword("")
    } else {
      setAddAgentError("Failed to add agent. Email might already be in use or password too weak.")
    }
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
                    <Switch
                      checked={config.requiredFields.includes(field.key)}
                      onCheckedChange={() => toggleRequiredField(field.key)}
                    />
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
                      <Textarea
                        value={pattern}
                        onChange={(e) => updateExtractionRule(key, e.target.value)}
                        className="bg-white/50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl font-mono text-sm shadow-sm"
                        rows={2}
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
                <form onSubmit={handleAddAgent} className="space-y-4">
                  {addAgentError && (
                    <Badge variant="destructive" className="w-full justify-center py-2">
                      {addAgentError}
                    </Badge>
                  )}
                  {addAgentSuccess && (
                    <Badge className="w-full justify-center py-2 bg-emerald-500 text-white">{addAgentSuccess}</Badge>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="agent-name" className="text-sm font-medium text-gray-700">
                      Agent Name
                    </Label>
                    <Input
                      id="agent-name"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="h-12 bg-white/50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl shadow-sm"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent-email" className="text-sm font-medium text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="agent-email"
                      type="email"
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      className="h-12 bg-white/50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl shadow-sm"
                      placeholder="agent@gcashpos.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent-password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="agent-password"
                        type={showAgentPassword ? "text" : "password"}
                        value={agentPassword}
                        onChange={(e) => setAgentPassword(e.target.value)}
                        className="pr-10 h-12 bg-white/50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl shadow-sm"
                        placeholder="Set initial password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowAgentPassword(!showAgentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showAgentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Add Agent
                  </Button>
                </form>
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
                  <Textarea
                    id="test-text"
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="bg-white/50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl font-mono text-sm shadow-sm"
                    rows={6}
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

export default function AdminConfig() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminConfigContent />
    </ProtectedRoute>
  )
}
