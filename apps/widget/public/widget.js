(function () {
  // Prevent duplicate initialization
  if (window.__ECHO_WIDGET_INITIALIZED__) return;
  window.__ECHO_WIDGET_INITIALIZED__ = true;

  // Retrieve script configurations
  const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const orgId = scriptTag?.getAttribute("data-org-id") || "default";
  const primaryColor = scriptTag?.getAttribute("data-color") || "blue";
  const theme = scriptTag?.getAttribute("data-theme") || "dark";
  const logoUrl = scriptTag?.getAttribute("data-logo") || "";
  const host = window.location.origin; // Same-host fallback

  // Determine widget target embed URL
  const widgetUrl = `${host}/embed?orgId=${encodeURIComponent(orgId)}&color=${encodeURIComponent(primaryColor)}&theme=${encodeURIComponent(theme)}&logo=${encodeURIComponent(logoUrl)}`;

  // Create floating iframe wrapper
  const container = document.createElement("div");
  container.id = "echo-widget-container";
  container.style.position = "fixed";
  container.style.bottom = "20px";
  container.style.right = "20px";
  container.style.width = "84px";
  container.style.height = "84px";
  container.style.zIndex = "9999999";
  container.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
  container.style.overflow = "hidden";
  container.style.borderRadius = "24px";
  container.style.boxShadow = "none";

  // Create iframe element
  const iframe = document.createElement("iframe");
  iframe.src = widgetUrl;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.style.background = "transparent";
  iframe.style.colorScheme = theme;
  iframe.setAttribute("scrolling", "no");

  container.appendChild(iframe);
  document.body.appendChild(container);

  // Responsive breakpoints detection
  const isMobile = () => window.innerWidth < 640;

  // Listen to height/width state postMessages from the inner widget frame
  window.addEventListener("message", function (event) {
    // Basic verification: accept same host messages
    if (event.origin !== window.location.origin) return;

    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "widget:state") {
      const state = data.state; // 'closed', 'minimized', 'opened'

      if (state === "opened") {
        if (isMobile()) {
          container.style.bottom = "0";
          container.style.right = "0";
          container.style.width = "100%";
          container.style.height = "100%";
          container.style.borderRadius = "0";
        } else {
          container.style.bottom = "20px";
          container.style.right = "20px";
          container.style.width = "380px";
          container.style.height = "620px";
          container.style.borderRadius = "24px";
          container.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.25)";
        }
      } else if (state === "minimized") {
        container.style.bottom = "20px";
        container.style.right = "20px";
        container.style.width = "320px";
        container.style.height = "64px";
        container.style.borderRadius = "16px";
        container.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.15)";
      } else {
        // 'closed' state - shows only floating action button
        container.style.bottom = "20px";
        container.style.right = "20px";
        container.style.width = "84px";
        container.style.height = "84px";
        container.style.borderRadius = "24px";
        container.style.boxShadow = "none";
      }
    }
  });

  // Handle window resizing dynamically for mobile
  window.addEventListener("resize", function () {
    // If the widget is open, adjust dimensions to fit mobile viewport dynamically
    if (container.style.height === "100%") {
      if (!isMobile()) {
        container.style.bottom = "20px";
        container.style.right = "20px";
        container.style.width = "380px";
        container.style.height = "620px";
        container.style.borderRadius = "24px";
      }
    }
  });
})();
