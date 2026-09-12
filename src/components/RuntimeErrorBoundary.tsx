import React from 'react';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

export class RuntimeErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Lifted runtime error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#f7f7f5', color: '#171717' }}>
        <div style={{ maxWidth: 680, width: '100%', background: '#fff', border: '1px solid #ddd', borderRadius: 18, padding: 24, boxSizing: 'border-box' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>Lifted could not start</h1>
          <p style={{ margin: '0 0 16px', color: '#555' }}>The app hit a startup error. Refresh once after the fix deploys.</p>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: '#f1f1f1', padding: 14, borderRadius: 10, fontSize: 13 }}>{this.state.error.message}</pre>
        </div>
      </div>
    );
  }
}
