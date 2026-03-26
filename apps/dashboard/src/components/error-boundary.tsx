import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { ErrorAlert } from '@/components/error-alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <ErrorAlert
          error={this.state.error}
          reset={() => this.setState({ hasError: false, error: null })}
        />
      )
    }
    return this.props.children
  }
}
