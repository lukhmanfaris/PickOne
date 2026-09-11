import React from "react";

interface Props { children: React.ReactNode }
interface State { error: Error | null }

/**
 * Catches render errors and shows what went wrong.
 *
 * Without this, a single thrown error in any component unmounts the whole app
 * and leaves a blank white page with the reason buried in the console. That is
 * a bad experience for a designer debugging their own deployment, and worse if
 * it happens in front of reviewers mid-session.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="fixed inset-0 z-[100] bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 overflow-auto">
        <div className="max-w-lg w-full">
          <h1 className="text-xl font-bold mb-2">Something broke</h1>
          <p className="text-sm text-neutral-400 mb-4">
            The app hit an error while rendering. The details below are what to
            share when asking for help.
          </p>
          <pre className="text-xs bg-neutral-900 border border-neutral-800 rounded-xl p-4 overflow-auto whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2 rounded-full bg-[#007AFF] text-white text-sm font-semibold hover:bg-[#005bb5] transition"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
