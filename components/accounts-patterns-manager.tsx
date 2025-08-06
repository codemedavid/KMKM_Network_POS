"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, CreditCard, Settings, TestTube } from "lucide-react"
import { useAuth } from "./auth-context-fixed"
import ProtectedRoute from "./protected-route"
import {
  getPaymentAccounts,
  getExtractionPatterns,
  savePaymentAccount,
  saveExtractionPattern,
  deletePaymentAccount,
  deleteExtractionPattern,
  type PaymentAccount,
  type ExtractionPattern
} from "@/actions/accounts"

interface AccountFormData {
  account_type: string
  account_name: string
  account_number: string
  account_holder_name: string
  is_active: boolean
  is_primary: boolean
}

interface PatternFormData {
  pattern_name: string
  account_type: string
  provider_name: string
  amount_pattern: string
  reference_pattern: string
  date_pattern: string
  sender_pattern: string
  receiver_pattern: string
  phone_pattern: string
  account_number_pattern: string
  bank_name_pattern: string
  description: string
  is_active: boolean
  priority: number
}

const defaultAccountForm: AccountFormData = {
  account_type: 'gcash',
  account_name: '',
  account_number: '',
  account_holder_name: '',
  is_active: true,
  is_primary: false
}

const defaultPatternForm: PatternFormData = {
  pattern_name: '',
  account_type: 'gcash',
  provider_name: '',
  amount_pattern: '(?:Amount|Total Amount Sent)\\s*[£₱]?\\s*([0-9,]+\\.?[0-9]*)',
  reference_pattern: '(?:Ref No\\.|Reference|Transaction)\\s*([0-9]+)',
  date_pattern: '([A-Za-z]{3}\\s+[0-9]{1,2},\\s+[0-9]{4}\\s+[0-9]{1,2}:[0-9]{2}\\s*[AP]M)',
  sender_pattern: '(?:From|Sender|Sent by)[:\\s]*([A-Za-z\\s]+)',
  receiver_pattern: '(?:To|Receiver|Received by)[:\\s]*([A-Za-z\\s]+)',
  phone_pattern: '(\\+63\\s*[0-9]{3}\\s*[0-9]{3}\\s*[0-9]{4}|09[0-9]{9})',
  account_number_pattern: '',
  bank_name_pattern: '',
  description: '',
  is_active: true,
  priority: 100
}

const accountTypes = [
  { value: 'gcash', label: 'GCash' },
  { value: 'paymaya', label: 'PayMaya' },
  { value: 'grabpay', label: 'GrabPay' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'other', label: 'Other' }
]

function AccountsPatternsContent() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<PaymentAccount[]>([])
  const [patterns, setPatterns] = useState<ExtractionPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Account form state
  const [accountForm, setAccountForm] = useState<AccountFormData>(defaultAccountForm)
  const [editingAccount, setEditingAccount] = useState<string | null>(null)
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  
  // Pattern form state
  const [patternForm, setPatternForm] = useState<PatternFormData>(defaultPatternForm)
  const [editingPattern, setEditingPattern] = useState<string | null>(null)
  const [patternDialogOpen, setPatternDialogOpen] = useState(false)

  const [activeTab, setActiveTab] = useState<'accounts' | 'patterns'>('accounts')

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadData()
    } else if (user && user.role !== 'admin') {
      setError('Access denied. Admin role required.')
    }
  }, [user])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Loading data for user:", user?.id, user?.role)
      
      const [accountsResult, patternsResult] = await Promise.all([
        getPaymentAccounts(),
        getExtractionPatterns()
      ])

      console.log("Accounts result:", accountsResult)
      console.log("Patterns result:", patternsResult)

      if (accountsResult.error) {
        setError('Failed to load accounts: ' + accountsResult.error)
      } else {
        setAccounts(accountsResult.accounts || [])
      }

      if (patternsResult.error) {
        setError('Failed to load patterns: ' + patternsResult.error)
      } else {
        setPatterns(patternsResult.patterns || [])
      }
    } catch (err: any) {
      console.error("Error loading data:", err)
      setError('Failed to load data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.role])

  const handleSaveAccount = async () => {
    if (!user || user.role !== 'admin') {
      setError('Access denied. Admin role required.')
      return
    }

    try {
      console.log("Saving account for user:", user?.id, user?.role)
      console.log("Account form data:", accountForm)
      
      const result = await savePaymentAccount(accountForm, editingAccount || undefined, user?.id)
      
      console.log("Save account result:", result)
      
      if (result.error) {
        setError('Failed to save account: ' + result.error)
        return
      }

      setAccountDialogOpen(false)
      setAccountForm(defaultAccountForm)
      setEditingAccount(null)
      await loadData()
    } catch (err: any) {
      console.error("Error saving account:", err)
      setError('Failed to save account: ' + err.message)
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return

    try {
      const result = await deletePaymentAccount(accountId)
      
      if (result.error) {
        setError('Failed to delete account: ' + result.error)
        return
      }

      await loadData()
    } catch (err: any) {
      setError('Failed to delete account: ' + err.message)
    }
  }

  const handleSavePattern = async () => {
    if (!user || user.role !== 'admin') {
      setError('Access denied. Admin role required.')
      return
    }

    try {
      const result = await saveExtractionPattern(patternForm, editingPattern || undefined, user?.id)
      
      if (result.error) {
        setError('Failed to save pattern: ' + result.error)
        return
      }

      setPatternDialogOpen(false)
      setPatternForm(defaultPatternForm)
      setEditingPattern(null)
      await loadData()
    } catch (err: any) {
      setError('Failed to save pattern: ' + err.message)
    }
  }

  const handleDeletePattern = async (patternId: string) => {
    if (!confirm('Are you sure you want to delete this pattern?')) return

    try {
      const result = await deleteExtractionPattern(patternId)
      
      if (result.error) {
        setError('Failed to delete pattern: ' + result.error)
        return
      }

      await loadData()
    } catch (err: any) {
      setError('Failed to delete pattern: ' + err.message)
    }
  }

  const openAccountDialog = (account?: PaymentAccount) => {
    if (account) {
      setAccountForm({
        account_type: account.account_type,
        account_name: account.account_name,
        account_number: account.account_number,
        account_holder_name: account.account_holder_name,
        is_active: account.is_active,
        is_primary: account.is_primary
      })
      setEditingAccount(account.id)
    } else {
      setAccountForm(defaultAccountForm)
      setEditingAccount(null)
    }
    setAccountDialogOpen(true)
  }

  const openPatternDialog = (pattern?: ExtractionPattern) => {
    if (pattern) {
      setPatternForm({
        pattern_name: pattern.pattern_name,
        account_type: pattern.account_type,
        provider_name: pattern.provider_name || '',
        amount_pattern: pattern.amount_pattern,
        reference_pattern: pattern.reference_pattern,
        date_pattern: pattern.date_pattern,
        sender_pattern: pattern.sender_pattern || '',
        receiver_pattern: pattern.receiver_pattern || '',
        phone_pattern: pattern.phone_pattern || '',
        account_number_pattern: pattern.account_number_pattern || '',
        bank_name_pattern: pattern.bank_name_pattern || '',
        description: pattern.description || '',
        is_active: pattern.is_active,
        priority: pattern.priority
      })
      setEditingPattern(pattern.id)
    } else {
      setPatternForm(defaultPatternForm)
      setEditingPattern(null)
    }
    setPatternDialogOpen(true)
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
              Accounts & Patterns Management
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Manage payment accounts and customize OCR extraction patterns
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setActiveTab('accounts')}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  activeTab === 'accounts'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="h-4 w-4 inline mr-2" />
                Payment Accounts
              </button>
              <button
                onClick={() => setActiveTab('patterns')}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  activeTab === 'patterns'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Extraction Patterns
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Payment Accounts Tab */}
              {activeTab === 'accounts' && (
                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Payment Accounts
                      </CardTitle>
                      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
                        <DialogTrigger asChild>
                          <Button onClick={() => openAccountDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Account
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>
                              {editingAccount ? 'Edit Account' : 'Add New Account'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label htmlFor="account_type">Account Type</Label>
                              <select
                                id="account_type"
                                value={accountForm.account_type}
                                onChange={(e) => setAccountForm(prev => ({ ...prev, account_type: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {accountTypes.map(type => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="account_name">Account Name</Label>
                              <Input
                                id="account_name"
                                value={accountForm.account_name}
                                onChange={(e) => setAccountForm(prev => ({ ...prev, account_name: e.target.value }))}
                                placeholder="e.g., Business GCash"
                              />
                            </div>
                            <div>
                              <Label htmlFor="account_number">Account Number</Label>
                              <Input
                                id="account_number"
                                value={accountForm.account_number}
                                onChange={(e) => setAccountForm(prev => ({ ...prev, account_number: e.target.value }))}
                                placeholder="e.g., +63 915 642 9591"
                              />
                            </div>
                            <div>
                              <Label htmlFor="account_holder_name">Account Holder Name</Label>
                              <Input
                                id="account_holder_name"
                                value={accountForm.account_holder_name}
                                onChange={(e) => setAccountForm(prev => ({ ...prev, account_holder_name: e.target.value }))}
                                placeholder="e.g., Business Name"
                              />
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="is_active"
                                  checked={accountForm.is_active}
                                  onCheckedChange={(checked) => setAccountForm(prev => ({ ...prev, is_active: checked }))}
                                />
                                <Label htmlFor="is_active">Active</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="is_primary"
                                  checked={accountForm.is_primary}
                                  onCheckedChange={(checked) => setAccountForm(prev => ({ ...prev, is_primary: checked }))}
                                />
                                <Label htmlFor="is_primary">Primary</Label>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                              <Button onClick={handleSaveAccount} className="flex-1">
                                {editingAccount ? 'Update' : 'Create'}
                              </Button>
                              <Button variant="outline" onClick={() => setAccountDialogOpen(false)} className="flex-1">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {accounts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No payment accounts configured yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Account Name</TableHead>
                              <TableHead>Account Number</TableHead>
                              <TableHead>Holder Name</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accounts.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">
                                    {account.account_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {account.account_name}
                                  {account.is_primary && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      PRIMARY
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="font-mono">{account.account_number}</TableCell>
                                <TableCell>{account.account_holder_name}</TableCell>
                                <TableCell>
                                  <Badge variant={account.is_active ? "default" : "secondary"}>
                                    {account.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openAccountDialog(account)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteAccount(account.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Extraction Patterns Tab */}
              {activeTab === 'patterns' && (
                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Extraction Patterns
                      </CardTitle>
                      <Dialog open={patternDialogOpen} onOpenChange={setPatternDialogOpen}>
                        <DialogTrigger asChild>
                          <Button onClick={() => openPatternDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Pattern
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              {editingPattern ? 'Edit Pattern' : 'Add New Pattern'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="pattern_name">Pattern Name</Label>
                                <Input
                                  id="pattern_name"
                                  value={patternForm.pattern_name}
                                  onChange={(e) => setPatternForm(prev => ({ ...prev, pattern_name: e.target.value }))}
                                  placeholder="e.g., GCash Standard"
                                />
                              </div>
                              <div>
                                <Label htmlFor="pattern_account_type">Account Type</Label>
                                <select
                                  id="pattern_account_type"
                                  value={patternForm.account_type}
                                  onChange={(e) => setPatternForm(prev => ({ ...prev, account_type: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {accountTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="provider_name">Provider Name (Optional)</Label>
                                <Input
                                  id="provider_name"
                                  value={patternForm.provider_name}
                                  onChange={(e) => setPatternForm(prev => ({ ...prev, provider_name: e.target.value }))}
                                  placeholder="e.g., GCash, BPI"
                                />
                              </div>
                              <div>
                                <Label htmlFor="priority">Priority (Lower = Higher Priority)</Label>
                                <Input
                                  id="priority"
                                  type="number"
                                  value={patternForm.priority}
                                  onChange={(e) => setPatternForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 100 }))}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                value={patternForm.description}
                                onChange={(e) => setPatternForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe when this pattern should be used"
                                rows={2}
                              />
                            </div>

                            <div className="space-y-3">
                              <h4 className="font-medium text-gray-900">Regex Patterns</h4>
                              <div className="grid gap-3">
                                <div>
                                  <Label htmlFor="amount_pattern">Amount Pattern *</Label>
                                  <Input
                                    id="amount_pattern"
                                    value={patternForm.amount_pattern}
                                    onChange={(e) => setPatternForm(prev => ({ ...prev, amount_pattern: e.target.value }))}
                                    className="font-mono text-sm"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="reference_pattern">Reference Pattern *</Label>
                                  <Input
                                    id="reference_pattern"
                                    value={patternForm.reference_pattern}
                                    onChange={(e) => setPatternForm(prev => ({ ...prev, reference_pattern: e.target.value }))}
                                    className="font-mono text-sm"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="date_pattern">Date Pattern *</Label>
                                  <Input
                                    id="date_pattern"
                                    value={patternForm.date_pattern}
                                    onChange={(e) => setPatternForm(prev => ({ ...prev, date_pattern: e.target.value }))}
                                    className="font-mono text-sm"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor="sender_pattern">Sender Pattern</Label>
                                    <Input
                                      id="sender_pattern"
                                      value={patternForm.sender_pattern}
                                      onChange={(e) => setPatternForm(prev => ({ ...prev, sender_pattern: e.target.value }))}
                                      className="font-mono text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="receiver_pattern">Receiver Pattern</Label>
                                    <Input
                                      id="receiver_pattern"
                                      value={patternForm.receiver_pattern}
                                      onChange={(e) => setPatternForm(prev => ({ ...prev, receiver_pattern: e.target.value }))}
                                      className="font-mono text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor="phone_pattern">Phone Pattern</Label>
                                    <Input
                                      id="phone_pattern"
                                      value={patternForm.phone_pattern}
                                      onChange={(e) => setPatternForm(prev => ({ ...prev, phone_pattern: e.target.value }))}
                                      className="font-mono text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="account_number_pattern">Account Number Pattern</Label>
                                    <Input
                                      id="account_number_pattern"
                                      value={patternForm.account_number_pattern}
                                      onChange={(e) => setPatternForm(prev => ({ ...prev, account_number_pattern: e.target.value }))}
                                      className="font-mono text-sm"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="bank_name_pattern">Bank Name Pattern</Label>
                                  <Input
                                    id="bank_name_pattern"
                                    value={patternForm.bank_name_pattern}
                                    onChange={(e) => setPatternForm(prev => ({ ...prev, bank_name_pattern: e.target.value }))}
                                    className="font-mono text-sm"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Switch
                                id="pattern_is_active"
                                checked={patternForm.is_active}
                                onCheckedChange={(checked) => setPatternForm(prev => ({ ...prev, is_active: checked }))}
                              />
                              <Label htmlFor="pattern_is_active">Active</Label>
                            </div>

                            <div className="flex gap-2 pt-4">
                              <Button onClick={handleSavePattern} className="flex-1">
                                {editingPattern ? 'Update' : 'Create'}
                              </Button>
                              <Button variant="outline" onClick={() => setPatternDialogOpen(false)} className="flex-1">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {patterns.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No extraction patterns configured yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Priority</TableHead>
                              <TableHead>Pattern Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Provider</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {patterns.map((pattern) => (
                              <TableRow key={pattern.id}>
                                <TableCell>
                                  <Badge variant="outline">
                                    {pattern.priority}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{pattern.pattern_name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">
                                    {pattern.account_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>{pattern.provider_name || '—'}</TableCell>
                                <TableCell>
                                  <Badge variant={pattern.is_active ? "default" : "secondary"}>
                                    {pattern.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openPatternDialog(pattern)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeletePattern(pattern.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default function AccountsPatternsManager() {
  return <AccountsPatternsContent />
}