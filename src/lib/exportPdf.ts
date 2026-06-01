export function exportElementToPdf(elementId: string, title: string): void {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`[exportPdf] Element #${elementId} not found`);
    return;
  }

  const styleId = "__aegis_print_style__";
  document.getElementById(styleId)?.remove();

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @media print {
      /* Hide everything except the invoice content */
      body * { visibility: hidden !important; }
      #${elementId},
      #${elementId} * { visibility: visible !important; }

      #${elementId} {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        margin: 0 !important;
        padding: 16px !important;
        background: #ffffff !important;
        box-shadow: none !important;
        color: #111 !important;
      }

      /* Hide action buttons, back nav, and app sidebar logo */
      #invoice-actions,
      #invoice-back-nav,
      nav, aside, header, [class*="sidebar"],
      [class*="logo"], [class*="brand-logo"] {
        display: none !important;
      }

      /* QR code + Financial Summary on the same row */
      #invoice-qr-financial {
        display: flex !important;
        flex-direction: row !important;
        gap: 16px !important;
        align-items: flex-start !important;
      }
      #invoice-qr-card {
        flex: 0 0 192px !important;
        width: 192px !important;
      }
      #invoice-financial-card {
        flex: 1 1 auto !important;
      }

      @page {
        size: A4 portrait;
        margin: 12mm;
      }
    }
  `;
  document.head.appendChild(style);

  const originalTitle = document.title;
  document.title = title;
  window.print();
  document.title = originalTitle;
  style.remove();
}
