import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    
    // Log to console in dev
    console.error('Error caught by boundary:', error, errorInfo);
    
    // In production, send to monitoring service (Sentry, etc.)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
      });
    }
    
    // Auto-reload after 1 second instead of showing error screen
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  render() {
    if (this.state.hasError) {
      // Afficher uniquement en développement, sinon recharger automatiquement
      if (import.meta.env.DEV) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
            <Card className="max-w-lg p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-red-900 mb-2">
                Erreur de développement
              </h1>
              
              {this.state.error && (
                <details className="text-left bg-red-50 p-4 rounded-lg mb-4 text-sm">
                  <summary className="cursor-pointer font-semibold text-red-800 mb-2">
                    Détails de l'erreur
                  </summary>
                  <pre className="text-xs overflow-auto text-red-900">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Retour à l'accueil
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Recharger
                </Button>
              </div>
            </Card>
          </div>
        );
      }
      
      // En production, afficher un loader minimal pendant le rechargement auto
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-stone-600">Chargement...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;