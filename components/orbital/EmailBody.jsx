"use client";

import { useEffect, useMemo, useRef } from "react";
import { isHtmlContent, linkifyText } from "./helpers";

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

// Bug 2 fix: linkify bare URLs that appear as plain text inside HTML email
// content (between > and <). Skips attribute values since those are inside
// the tag delimiters and never appear in ">text<" matches.
function linkifyHtmlContent(html) {
  return html.replace(/>([^<]+)</g, (match, text) => {
    if (!/(https?:\/\/|www\.)/i.test(text)) return match;
    const linked = text.replace(
      /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/g,
      (url) => {
        const href = url.startsWith("www.") ? `https://${url}` : url;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color:#0969da">${url}</a>`;
      }
    );
    return `>${linked}<`;
  });
}

// Bug 1 fix: use a per-instance nonce embedded in the srcdoc so the parent
// can route height messages to the correct iframe without relying on
// event.source (which is unreliable for null-origin sandboxed iframes when
// multiple iframes exist simultaneously in a multi-message thread).
const HEIGHT_SCRIPT_TEMPLATE = `(function(){
  var nonce='__NONCE__';
  function postH(){
    var h=Math.max(
      document.documentElement?document.documentElement.scrollHeight:0,
      document.body?document.body.scrollHeight:0
    );
    if(h>0)parent.postMessage({type:'orbital-iframe-height',height:h,nonce:nonce},'*');
  }
  if(document.readyState==='loading'){
    window.addEventListener('load',postH);
  } else {
    postH();
  }
  if(window.ResizeObserver){
    new ResizeObserver(postH).observe(document.documentElement);
  }
  document.querySelectorAll('img').forEach(function(img){
    if(!img.complete)img.addEventListener('load',postH);
    img.addEventListener('error',postH);
  });
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(postH);
  setTimeout(postH,100);
  setTimeout(postH,500);
  setTimeout(postH,1500);
})();`;

let _nonceCounter = 0;
function generateNonce() {
  return `n${++_nonceCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildSrcDoc(body, attachments, nonce) {
  let resolvedHtml = resolveInlineAttachments(body, attachments);
  // Bug 2 fix: linkify bare URLs in HTML text nodes
  resolvedHtml = linkifyHtmlContent(resolvedHtml);

  const scriptBody = HEIGHT_SCRIPT_TEMPLATE.replace("__NONCE__", nonce);
  // Split </script> so the HTML parser doesn't close the script block early.
  const scriptTag = `<script>${scriptBody}</scr` + `ipt>`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <style>
      :root { color-scheme: light; }
      html, body {
        margin: 0;
        padding: 0;
        background: #f8fafc !important;
        color: #111827 !important;
        overflow-x: hidden;
        max-width: 100%;
      }
      /* Bug 3 fix: !important overrides inline width/max-width on email tables
         and other elements that hardcode pixel widths. */
      * { box-sizing: border-box; max-width: 100% !important; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        word-break: break-word;
      }
      .orbital-email-root {
        padding: 12px 14px 10px;
        min-height: 1px;
        overflow-x: hidden;
      }
      img {
        max-width: 100% !important;
        height: auto !important;
      }
      /* Bug 4 fix: hide images whose CID was not resolved instead of showing
         a broken-image icon. */
      img[src^="cid:"] { display: none !important; }
      table {
        width: auto !important;
        max-width: 100% !important;
        border-collapse: collapse;
      }
      pre, code {
        white-space: pre-wrap;
        word-break: break-word;
      }
      pre { overflow-x: auto; }
      blockquote {
        margin: 8px 0;
        border-left: 3px solid #cbd5e1;
        padding-left: 10px;
        color: #475569 !important;
      }
      .gmail_quote, .gmail_attr { color: #64748b !important; }
      @media (prefers-color-scheme: dark) {
        html, body {
          background: #f8fafc !important;
          color: #111827 !important;
        }
      }
    </style>
    ${scriptTag}
  </head>
  <body>
    <div class="orbital-email-root">${resolvedHtml}</div>
  </body>
</html>`;
}

export default function EmailBody({ body, attachments = {} }) {
  const html = isHtmlContent(body);
  const iframeRef = useRef(null);
  // Stable nonce per component instance — never changes across re-renders.
  const nonceRef = useRef(null);
  if (nonceRef.current === null) nonceRef.current = generateNonce();
  const nonce = nonceRef.current;

  const srcDoc = useMemo(
    () => buildSrcDoc(body, attachments, nonce),
    [attachments, body, nonce]
  );

  // Bug 1 fix: use nonce to match height messages to this specific iframe
  // instead of event.source, which can be null/unreliable for null-origin
  // sandboxed iframes when several iframes are mounted simultaneously.
  useEffect(() => {
    if (!html || !iframeRef.current) return;
    const iframe = iframeRef.current;

    function handleMessage(event) {
      if (!event.data || event.data.type !== "orbital-iframe-height") return;
      if (event.data.nonce !== nonce) return;
      const h = Number(event.data.height);
      if (h > 0) iframe.style.height = `${h}px`;
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [html, nonce]);

  // Plain-text emails: render with URL linkification.
  if (!html) {
    return (
      <div
        className="email-body"
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        dangerouslySetInnerHTML={{ __html: linkifyText(body) }}
      />
    );
  }

  return (
    // Bug 3 fix: overflow-hidden clips any content that escapes the iframe bounds.
    <div className="overflow-hidden rounded-[18px] bg-white ring-1 ring-black/5">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        // allow-scripts: enables the postMessage height script inside the iframe.
        // No allow-same-origin: iframe runs in null origin so it cannot inherit
        // parent CSP, and external images load without cross-origin restrictions.
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        style={{
          width: "100%",
          maxWidth: "100%",
          border: "none",
          display: "block",
          minHeight: "40px",
          background: "#f8fafc",
          overflowX: "hidden",
        }}
        title="Email content"
      />
    </div>
  );
}
