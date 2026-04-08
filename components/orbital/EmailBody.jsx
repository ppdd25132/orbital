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

// Pure JS code injected into every HTML email iframe. It reports scrollHeight
// via postMessage so the parent can size the iframe without allow-same-origin.
// The closing </script> is split across a concatenation in buildSrcDoc to
// prevent the HTML parser from closing the script block prematurely.
const HEIGHT_SCRIPT_BODY = `(function(){
  function postH(){
    var h=Math.max(
      document.documentElement?document.documentElement.scrollHeight:0,
      document.body?document.body.scrollHeight:0
    );
    if(h>0)parent.postMessage({type:'orbital-iframe-height',height:h},'*');
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

function buildSrcDoc(body, attachments) {
  const resolvedHtml = resolveInlineAttachments(body, attachments);
  // Split </script> so the HTML parser doesn't close the script block early.
  const scriptTag = `<script>${HEIGHT_SCRIPT_BODY}</scr` + `ipt>`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="referrer" content="no-referrer" />
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
      * { box-sizing: border-box; max-width: 100%; }
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
  const srcDoc = useMemo(() => buildSrcDoc(body, attachments), [attachments, body]);

  // Bug 1 fix: postMessage-based auto-height instead of direct contentDocument
  // access. With multiple iframes rendering simultaneously the load event can
  // fire before React's useEffect attaches the listener, so the ResizeObserver
  // approach inside the iframe + postMessage is far more reliable.
  useEffect(() => {
    if (!html || !iframeRef.current) return;
    const iframe = iframeRef.current;

    function handleMessage(event) {
      if (event.source !== iframe.contentWindow) return;
      if (!event.data || event.data.type !== "orbital-iframe-height") return;
      const h = Number(event.data.height);
      if (h > 0) iframe.style.height = `${h}px`;
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [html, srcDoc]);

  // Bug 2 fix: plain-text emails now linkify URLs via linkifyText().
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
        // Bug 1 fix: allow-scripts enables the postMessage height script inside
        //   the iframe.
        // Bug 4 fix: omitting allow-same-origin puts the iframe in a null origin
        //   so external images (e.g. Anthropic logo) load without inheriting the
        //   parent page's security context or referrer restrictions.
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        style={{
          width: "100%",
          maxWidth: "100%",   // Bug 3: prevent growing wider than container
          border: "none",
          display: "block",
          minHeight: "40px",
          background: "#f8fafc",
          overflowX: "hidden", // Bug 3: belt-and-suspenders on the element
        }}
        title="Email content"
      />
    </div>
  );
}
