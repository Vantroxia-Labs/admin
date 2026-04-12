/**
 * Prints a specific DOM element using the browser's native print/Save-as-PDF,
 * while preserving every applied style exactly as it appears on screen.
 *
 * Technique: inject a <style> that hides everything EXCEPT the target element,
 * then call window.print(). All Tailwind classes, CSS variables, and chart SVGs
 * are already resolved in the live DOM so the output is pixel-accurate.
 */
export function exportElementToPdf(elementId: string, title: string): void {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`[exportPdf] Element #${elementId} not found`);
    return;
  }

  const styleId = "__aegis_print_style__";
  // Remove any leftover style from a previous call
  document.getElementById(styleId)?.remove();

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @media print {
      /* Hide every visible node … */
      body * { visibility: hidden !important; }
      /* … but show our element and everything inside it */
      #${elementId},
      #${elementId} * { visibility: visible !important; }
      /* Position the element flush to the page origin */
      #${elementId} {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        margin: 0 !important;
        padding: 16px !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
    }
  `;
  document.head.appendChild(style);

  // Set document title so the browser uses it as the default file name
  const originalTitle = document.title;
  document.title = title;

  window.print();

  // Restore after the print dialog closes (it's synchronous on most browsers)
  document.title = originalTitle;
  style.remove();
}
