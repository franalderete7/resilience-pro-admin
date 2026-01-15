'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { logger } from '@/lib/logger'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] w-full items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-500/10 p-3 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">
              Algo salió mal
            </h2>
            
            <p className="text-zinc-400 mb-6">
              Ocurrió un error inesperado. Por favor, intenta recargar esta sección.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-zinc-950 border border-zinc-800 rounded-lg text-left">
                <p className="text-xs font-mono text-red-400 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                Recargar Página
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Simple Error Fallback Component
 * Can be used as a custom fallback for specific error boundaries
 */
export function ErrorFallback({ 
  error, 
  resetError 
}: { 
  error?: Error
  resetError?: () => void 
}) {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Error</h3>
        <p className="text-zinc-400 mb-4">
          {error?.message || 'Ocurrió un error inesperado'}
        </p>
        {resetError && (
          <Button onClick={resetError} size="sm">
            Reintentar
          </Button>
        )}
      </div>
    </div>
  )
}
