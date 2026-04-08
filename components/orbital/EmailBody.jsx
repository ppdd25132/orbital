"use client";

import { useEffect, useMemo, useRef } from "react";
import { isHtmlContent } from "./helpers";

function resolveInlineAttachments(html, attachments = {}) {
  if (!html || !Object.keys(attachments).length) return html;

  const replaceCid = (value = "") => {
    const cid = value.replace(/^cid:/i, "").replace(/[<>]/g, "").trim();
    return attachments[cid] || attachments[value] || value;
  };

  return html
    .replace(/src=(["'])cid:([^"']+)\1/gi, (_, quote, cid) => {
      const resolved = replaceCid(`cid:${cid}`);
      return `src=${quote}${resolved}${quote}`;
    })
    .replace(/url\((["']?)cid:([^"')]+)\1\)/gi, (_, quote, cid) => {
      const resolved = replaceCid(`cid:${cid}`);
      return `url(${quote}${resolved}${quote})`;
    });
}

function buildSrcDoc(body, attachments) {
  const resolvedHtml = resolveInlineAttachments(body, attachments);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="color-scheme" content="light only" />
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; max-width: 100%; }
      html, body {
        margin: 0;
        padding: 0;
        background: #f8fafc !important;
        color: #111827 !important;
        overflow-x: hidden;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        word-break: break-word;
      }
      .orbital-email-root {
        padding: 12px 14px 10px;
        min-height: 1px;
      }
      img {
        max-width: 100% !important;
        height: auto !important;
      }
      table {
        width: auto !important;
        max-width: 100% !important;
        border-collapse: collapse;
      }
      pre, code {
        white-space: pre-wrap;
        word-break: break-word;
      }
      pre {
        overflow-x: auto;
      }
      blockquote {
        margin: 8px 0;
        border-left: 3px solid #cbd5e1;
        padding-left: 10px;
        color: #475569 !important;
      }
      .gmail_quote, .gmail_attr {
        color: #64748b !important;
      }
      @media (prefers-color-scheme: dark) {
        html, body {
          background: #f8fafc !important;
          color: #111827 !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="orbital-email-root">${resolvedHtml}</div>
  </body>
</html>`;
}

export default function EmailBody({ body, attachments = {} }) {
  const html = isHtmlContent(body);
  const iframeRef = useRef(null);
  const srcDoc = useMemo(() => buildSrcDoc(body, attachments), [attachments, body]);

  useEffect(() => {
    if (!html || !iframeRef.current) return undefined;

    const iframe = iframeRef.current;
    let resizeObserver;
    let mutationObserver;
    const timers = [];

    const updateHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        const nextHeight = Math.max(
          doc.documentElement?.scrollHeight || 0,
          doc.body?.scrollHeight || 0
        );
        iframe.style.height = `${Math.max(nextHeight, 40)}px`;
      } catch {}
    };

    const onLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        resizeObserver = new ResizeObserver(updateHeight);
        mutationObserver = new MutationObserver(updateHeight);

        resizeObserver.observe(doc.documentElement);
        mutationObserver.observe(doc.body, {
          childList: true,
          subtree: true,
          attributes: true,
        });

        doc.querySelectorAll("img").forEach((img) => {
          img.addEventListener("load", updateHeight);
          img.addEventListener("error", updateHeight);
        });

        doc.fonts?.ready?.then(updateHeight).catch(() => {});
      } catch {}

      updateHeight();
      timers.push(window.setTimeout(updateHeight, 80));
      timers.push(window.setTimeout(updateHeight, 400));
      timers.push(window.setTimeout(updateHeight, 1200));
    };

    iframe.addEventListener("load", onLoad);
    onLoad();

    return () => {
      iframe.removeEventListener("load", onLoad);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [html, srcDoc]);

  if (!html) {
    return (
      <div className="email-body" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {body}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] bg-white ring-1 ring-black/5">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{
          width: "100%",
          border: "none",
          display: "block",
          minHeight: "40px",
          background: "#f8fafc",
        }}
        title="Email content"
      />
    </div>
  );
}
