export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-94NKHRK9ZZ";

export type AnalyticsParameter = string | number | boolean | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, parameters: Record<string, AnalyticsParameter> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  const gtag = window.gtag ?? ((...args: unknown[]) => window.dataLayer?.push(args));
  gtag("event", name, parameters);
}

export function trackPageView(path: string, title: string, menuName?: string) {
  if (typeof window === "undefined") return;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  trackEvent("page_view", {
    page_path: normalizedPath,
    page_location: `${window.location.origin}${normalizedPath}`,
    page_title: title,
    menu_name: menuName,
  });
}

export function rememberLoginMethod(method: "google" | "kakao") {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("dm_pending_login_method", method);
  } catch {
    // Analytics must never block the login flow.
  }
  trackEvent("login_start", { method });
}

export function consumeLoginMethod() {
  if (typeof window === "undefined") return "";
  try {
    const method = window.sessionStorage.getItem("dm_pending_login_method") ?? "";
    if (method) window.sessionStorage.removeItem("dm_pending_login_method");
    return method;
  } catch {
    return "";
  }
}
