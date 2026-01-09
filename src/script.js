/* eslint-disable no-unused-vars */
lucide.createIcons();

// Sanitize HTML input before interpreting it as a full HTML document.
// DOMPurify should be loaded in the page (for example via a <script> tag)
// and is expected to be available as the global DOMPurify object.
function sanitizeHtmlInput(input) {
  if (typeof DOMPurify !== "undefined" && input) {
    // Use DOMPurify to sanitize the whole document while preserving content.
    return DOMPurify.sanitize(input, { WHOLE_DOCUMENT: true });
  }
  // Fallback: return input unchanged if DOMPurify is not available.
  return input;
}

function setStatus(text) {
  document.getElementById("status-text").textContent = text;
}

function switchTab(tab) {
  const splitView = document.getElementById("view-split");
  const combineView = document.getElementById("view-combine");
  const splitTab = document.getElementById("tab-split");
  const combineTab = document.getElementById("tab-combine");

  if (
    (tab === "split" && splitTab.classList.contains("active")) ||
    (tab === "combine" && combineTab.classList.contains("active"))
  ) {
    return;
  }

  if (tab === "split") {
    splitView.classList.remove("hidden");
    combineView.classList.add("hidden");
    splitTab.classList.add("active");
    combineTab.classList.remove("active");
    setStatus("Mode: Splitter");
  } else {
    splitView.classList.add("hidden");
    combineView.classList.remove("hidden");
    splitTab.classList.remove("active");
    combineTab.classList.add("active");
    setStatus("Mode: Combiner");
  }
}

function processSplit() {
  const input = document.getElementById("split-input").value;
  if (!input.trim()) {
    showToast("Input Required", "Paste an HTML file to begin.", "error");
    return;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, "text/html");

    let cssContent = "";
    doc.querySelectorAll("style").forEach((tag) => {
      cssContent += tag.innerHTML.trim() + "\n\n";
      tag.remove();
    });

    let jsContent = "";
    doc.querySelectorAll("script").forEach((tag) => {
      if (!tag.hasAttribute("src") && tag.type !== "application/ld+json") {
        jsContent += tag.innerHTML.trim() + "\n\n";
        tag.remove();
      }
    });

    // AUTO-LINKING: Add links to the split files
    if (cssContent.trim()) {
      const linkTag = doc.createElement("link");
      linkTag.rel = "stylesheet";
      linkTag.href = "style.css";
      doc.head.appendChild(linkTag);
    }

    if (jsContent.trim()) {
      const scriptTag = doc.createElement("script");
      scriptTag.src = "script.js";
      doc.body.appendChild(scriptTag);
    }

    let htmlContent = doc.documentElement.outerHTML;
    if (!htmlContent.toLowerCase().startsWith("<!doctype")) {
      htmlContent = "<!DOCTYPE html>\n" + htmlContent;
    }

    document.getElementById("split-html-out").value = htmlContent;
    document.getElementById("split-css-out").value = cssContent.trim();
    document.getElementById("split-js-out").value = jsContent.trim();

    showToast("Success", "File split and auto-linked.");
    setStatus("Split complete");
  } catch (_e) {
    showToast("Error", "Invalid HTML document.", "error");
  }
}

function clearSplitInput() {
  document.getElementById("split-input").value = "";
  document.getElementById("split-html-out").value = "";
  document.getElementById("split-css-out").value = "";
  document.getElementById("split-js-out").value = "";
  setStatus("Workspace cleared");
  showToast("Cleared", "All fields reset.");
}

function processCombine() {
  const html = document.getElementById("combine-html-in").value || "";
  const css = document.getElementById("combine-css-in").value || "";
  const js = document.getElementById("combine-js-in").value || "";

  if (!html.trim()) {
    showToast("Missing HTML", "HTML body is required.", "error");
    return;
  }

  try {
    const parser = new DOMParser();
    const sanitizedHtml = sanitizeHtmlInput(html);
    const doc = parser.parseFromString(sanitizedHtml, "text/html");

    // CLEANUP: Remove auto-linked style.css and script.js before combining
    doc
      .querySelectorAll('link[href="style.css"], script[src="script.js"]')
      .forEach((el) => el.remove());

    if (css.trim()) {
      const styleTag = doc.createElement("style");
      styleTag.textContent = "\n" + css.trim() + "\n";
      doc.head.appendChild(styleTag);
    }

    if (js.trim()) {
      const scriptTag = doc.createElement("script");
      scriptTag.textContent = "\n" + js.trim() + "\n";
      doc.body.appendChild(scriptTag);
    }

    let finalHtml = doc.documentElement.outerHTML;
    if (!finalHtml.toLowerCase().startsWith("<!doctype")) {
      finalHtml = "<!DOCTYPE html>\n" + finalHtml;
    }

    document.getElementById("combine-out").value = finalHtml;
    showToast("Success", "Components combined.");
    setStatus("Combine complete");
  } catch (_e) {
    showToast("Error", "Failed to generate file.", "error");
  }
}

function downloadCombined() {
  const content = document.getElementById("combine-out").value;
  if (!content.trim()) return;
  const blob = new Blob([content], { type: "text/html" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "index.html";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  showToast("Download", "File saved as index.html");
}

async function copyToClipboard(elementId) {
  const el = document.getElementById(elementId);
  if (!el.value.trim()) return;
  try {
    await navigator.clipboard.writeText(el.value);
    showToast("Copied", "Content saved to clipboard.");
  } catch (_err) {
    el.select();
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
    showToast("Copied", "Content saved to clipboard.");
  }
}

async function pasteTo(elementId) {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById(elementId).value = text;
    setStatus("Pasted content");
  } catch (_err) {
    showToast("Security", "Press Ctrl+V to paste manually.", "error");
  }
}

function showToast(title, message, type = "success") {
  const toast = document.getElementById("toast");
  const titleEl = document.getElementById("toast-title");
  const msgEl = document.getElementById("toast-msg");

  titleEl.textContent = title;
  msgEl.textContent = message;

  if (type === "error") {
    toast.classList.replace("border-[#0078D7]", "border-red-600");
    titleEl.classList.add("text-red-400");
  } else {
    toast.classList.replace("border-red-600", "border-[#0078D7]");
    titleEl.classList.remove("text-red-400");
  }

  toast.style.transform = "translateX(0)";
  setTimeout(() => {
    toast.style.transform = "translateX(100%)";
  }, 2500);
}
