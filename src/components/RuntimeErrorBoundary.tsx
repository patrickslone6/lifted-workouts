import React from 'react';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

export class RuntimeErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };
  private readonly childContent: React.ReactNode;

  constructor(props: Props) {
    super(props);
    this.childContent = props.children;
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Lifted runtime error:', error, info);
  }

  handleReload = () => window.location.reload();

  render() {
    if (!this.state.error) return this.childContent;
    return <div className="runtime-error-screen"><div className="runtime-error-card"><div className="runtime-error-mark">!</div><h1>Lifted hit an error</h1><p>The app recovered safely instead of leaving a blank screen. Refresh and try again.</p><pre>{this.state.error.message || 'Unknown runtime error'}</pre><button onClick={this.handleReload}>Reload Lifted</button></div></div>;
  }
}
