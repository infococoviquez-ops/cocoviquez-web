import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// A render error used to leave a completely blank page - there was no
// ErrorBoundary and no global handler, so React simply mounted nothing.
//
// That is undiagnosable on a phone: the admin panel is opened from phones, and
// mobile browsers have no console to open. "It's blank on my phone but fine on
// the computer" gave nothing to work with. Everything below exists so the actual
// error is shown on screen, where it can be read or screenshotted from any
// device.

const FAILURE_HTML = (detail: string) => `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0D1721;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:520px;width:100%;background:#111C28;border:2px solid rgba(242,127,87,.4);border-radius:20px;padding:28px;color:#fff;">
      <p style="margin:0 0 6px;color:#F27F57;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">Coco Víquez</p>
      <h1 style="margin:0 0 14px;font-size:20px;font-weight:800;">La página no pudo cargar</h1>
      <p style="margin:0 0 18px;color:rgba(255,255,255,.75);font-size:15px;line-height:1.5;">
        Probá recargar. Si vuelve a pasar, sacale una captura a este mensaje y envialo — el detalle de abajo dice exactamente qué falló.
      </p>
      <pre style="margin:0 0 18px;padding:14px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#ffb4a2;font-size:12px;line-height:1.45;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;">${detail}</pre>
      <button onclick="location.reload()" style="width:100%;padding:14px;background:#F27F57;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;">
        Recargar
      </button>
    </div>
  </div>
`;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] as string));
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    // The message alone is rarely enough to locate the cause; the first frames of
    // the stack usually are.
    const stack = (error.stack || '').split('\n').slice(0, 4).join('\n');
    return escapeHtml(`${error.name}: ${error.message}\n\n${stack}`.trim());
  }
  return escapeHtml(String(error));
}

// Only takes over when nothing has rendered, so an unrelated late error can never
// replace a page the visitor is already using.
function showFailureIfBlank(detail: string): void {
  const root = document.getElementById('root');
  if (!root || root.childElementCount > 0) return;
  root.innerHTML = FAILURE_HTML(detail);
}

window.addEventListener('error', event => {
  showFailureIfBlank(describe(event.error ?? event.message));
});

window.addEventListener('unhandledrejection', event => {
  showFailureIfBlank(describe(event.reason));
});

interface BoundaryProps {
  children: ReactNode;
}

interface BoundaryState {
  detail: string | null;
}

class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  // Declared explicitly because @types/react is not a dependency of this project,
  // so React's own class-component types are unavailable here. `declare` emits no
  // code - it only tells TypeScript these inherited members exist.
  declare props: BoundaryProps;
  declare state: BoundaryState;

  constructor(props: BoundaryProps) {
    super(props);
    this.state = { detail: null };
  }

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { detail: describe(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Fallo al renderizar la aplicación:', error, info.componentStack);
  }

  render() {
    if (this.state.detail === null) return this.props.children;
    return <div dangerouslySetInnerHTML={{ __html: FAILURE_HTML(this.state.detail) }} />;
  }
}

const container = document.getElementById('root');

if (!container) {
  // Nothing to mount into: report it in the page itself rather than failing mute.
  document.body.innerHTML = FAILURE_HTML('No se encontró el elemento #root en la página.');
} else {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
