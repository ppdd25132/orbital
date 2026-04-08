"use client";
import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        // SW registration failures are non-fatal — app still works
        console.warn("Service worker registration failed:", err);
      });
  }, []);

  return null;
}
