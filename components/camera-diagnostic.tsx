"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CameraDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<any>({})

  useEffect(() => {
    const runDiagnostics = () => {
      const diag: any = {
        timestamp: new Date().toISOString(),
        environment: typeof window !== 'undefined' ? 'browser' : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
        protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        hasNavigator: typeof navigator !== 'undefined',
        hasMediaDevices: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
        hasGetUserMedia: typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia,
        isSecureContext: typeof window !== 'undefined' && window.isSecureContext,
        permissions: 'unknown'
      }

      // Check permissions if available
      if (typeof navigator !== 'undefined' && navigator.permissions) {
        navigator.permissions.query({ name: 'camera' as any }).then((result) => {
          setDiagnostics(prev => ({ ...prev, permissions: result.state }))
        }).catch(() => {
          setDiagnostics(prev => ({ ...prev, permissions: 'unavailable' }))
        })
      }

      setDiagnostics(diag)
    }

    runDiagnostics()
  }, [])

  const testCamera = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      alert('Camera API not available')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      alert('Camera access successful!')
      stream.getTracks().forEach(track => track.stop())
    } catch (error: any) {
      alert(`Camera error: ${error.name} - ${error.message}`)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Camera Diagnostic Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Environment:</strong> {diagnostics.environment}
          </div>
          <div>
            <strong>URL:</strong> {diagnostics.url}
          </div>
          <div>
            <strong>Protocol:</strong> {diagnostics.protocol}
          </div>
          <div>
            <strong>Hostname:</strong> {diagnostics.hostname}
          </div>
          <div>
            <strong>Secure Context:</strong> {diagnostics.isSecureContext ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Permissions:</strong> {diagnostics.permissions}
          </div>
          <div>
            <strong>Navigator:</strong> {diagnostics.hasNavigator ? 'Available' : 'Not Available'}
          </div>
          <div>
            <strong>MediaDevices:</strong> {diagnostics.hasMediaDevices ? 'Available' : 'Not Available'}
          </div>
          <div>
            <strong>getUserMedia:</strong> {diagnostics.hasGetUserMedia ? 'Available' : 'Not Available'}
          </div>
        </div>

        <div className="bg-gray-100 p-3 rounded text-xs">
          <strong>User Agent:</strong><br />
          {diagnostics.userAgent}
        </div>

        <div className="space-y-2">
          <Button onClick={testCamera} className="w-full">
            Test Camera Access
          </Button>
          
          <div className="text-xs text-gray-600">
            <strong>Expected for camera to work:</strong>
            <ul className="list-disc list-inside mt-1">
              <li>Protocol: https: (or http: on localhost)</li>
              <li>Secure Context: Yes</li>
              <li>Navigator: Available</li>
              <li>MediaDevices: Available</li>
              <li>getUserMedia: Available</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}