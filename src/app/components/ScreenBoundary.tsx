// A screen that fails to load (e.g. its chunk can't be fetched offline before the service worker took over)
// shows a short message and a retry instead of blanking the whole app.
import { Component, type ReactNode } from 'react';

type Props = { message: string; retry: string; children: ReactNode };

export class ScreenBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main id="main" role="alert" style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
        <p style={{ margin: 0 }}>{this.props.message}</p>
        <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: '0 16px', borderRadius: 999 }}>{this.props.retry}</button>
      </main>
    );
  }
}
