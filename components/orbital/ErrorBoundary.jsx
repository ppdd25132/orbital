"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

export default class PanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Orbital error:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      const {
        title = "Something went wrong",
        description = "An unexpected error occurred.",
        actionLabel = "Try again",
      } = this.props;

      return (
        <div className="flex h-full flex-col items-center justify-center bg-[#0c0d10] px-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-[#1c1418]">
            <AlertCircle size={22} className="text-red-400" />
          </div>
          <p className="mb-1 text-[15px] font-semibold text-[#e2e4e9]">{title}</p>
          <p className="mb-5 text-[12px] text-[#5c6270]">{description}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="rounded-xl bg-[#5B8EF8] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a7def]"
          >
            {actionLabel}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
