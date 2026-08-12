"use client";

import { useEffect } from "react";
import { trackPageView } from "../lib/analytics";

export function AnalyticsPageTracker() {
  useEffect(() => {
    const path = window.location.pathname === "/" ? "/app/explore" : window.location.pathname;
    const title = window.location.pathname === "/" ? "지원사업 전체보기 | 당모" : document.title;
    const menuName = window.location.pathname === "/" ? "지원사업 탐색" : undefined;
    trackPageView(path, title, menuName);
  }, []);

  return null;
}
