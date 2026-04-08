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

// BUG 1 FIX: Accept a unique iframeId so each iframe tags its postMessages.
// Matching by ID is reliable across browsers even for null-origin sandboxed
// iframes where event.source comparisons can silently fail.
function makeHeightScript(iframeId) {
  const idLiteral = JSON.stringify(iframeId);
  return `(function(){
  var ID=${idLiteral};
  function postH(){
    var h=Math.max(
      document.documentElement?document.documentElement.scrollHeight:0,
      document.body?document.body.scrollHeight:0
    );
    if(h>0)parent.postMessage({type:'orbital-iframe-height',id:ID,height:h},'*');
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
}

// BUG 2 FIX: Linkify bare URLs in HTML email text nodes that aren't already
// inside <a> tags. Runs inside the iframe so it has full DOM access without
// needing allow-same-origin.
const LINKIFY_SCRIPT_BODY = `(function(){
  function linkify(el){
    var kids=Array.prototype.slice.call(el.childNodes);
    for(var i=0;i<kids.length;i++){
      var node=kids[i];
      if(node.nodeType===3){
        var txt=node.nodeValue;
        if(!/(https?:\\/\\/\\S+)/.test(txt))continue;
        var span=document.createElement('span');
        span.innerHTML=txt
          .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          .replace(/(https?:\\/\\/[^\\s<>"']+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#5B8EF8;text-decoration:underline">$1</a>');
        el.replaceChild(span,node);
      } else if(node.nodeType===1&&node.nodeName!=='A'&&node.nodeName!=='SCRIPT'&&node.nodeName!=='STYLE'){
        linkify(node);
      }
    }
  }
  if(document.readyState==='loading'){
    window.addEventListener('DOMContentLoaded',function(){if(document.body)linkify(document.body);});
  } else {
    if(document.body)linkify(document.body);
  }
})();`;

function buildSrcDoc(body, attachments, iframeId) {
  const resolvedHtml = resolveInlineAttachments(body, attachments);
  // Split </script> so the HTML parser doesn't close the script block early.
  const heightScript = `<script>${makeHeightScript(iframeId)}</scr` + `ipt>`;
  const linkifyScript = `<script>${LINKIFY_SCRIPT_BODY}</scr` + `ipt>`;

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
      /* BUG 3 FIX: !important on * ensures fixed-width email elements (tables,
         divs) cannot overflow the iframe's scrollable area. */
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
        overflow: hidden;
      }
      img {
        max-width: 100% !important;
        height: auto !important;
      }
      table {
        /* BUG 3 FIX: auto width + max-width prevents fixed-pixel-width tables
           from spilling out of the iframe. */
        width: auto !important;
        max-width: 100% !important;
        border-collapse: collapse;
      }
      td, th {
        max-width: 100% !important;
        word-break: break-word;
        overflow: hidden;
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
    ${heightScript}
    ${linkifyScript}
  </head>
  <body>
    <div class="orbital-email-root">${resolvedHtml}</div>
  </body>
</html>`;
}

export default function EmailBody({ body, attachments = {} }) {
  const html = isHtmlContent(body);
  const iframeRef = useRef(null);

  // BUG 1 FIX: stable unique ID for this EmailBody instance so height messages
  // from different iframes in the same thread are never mixed up.
  const iframeId = useRef(null);
  if (iframeId.current === null) {
    iframeId.current = `oi-${Math.random().toString(36).slice(2)}`;
  }

  const srcDoc = useMemo(
    () => buildSrcDoc(body, attachments, iframeId.current),
    [attachments, body],
  );

  // BUG 1 FIX: match height messages by the per-instance iframeId rather than
  // event.source, which is unreliable for null-origin sandboxed iframes in some
  // browsers (the contentWindow reference can appear non-identical).
  useEffect(() => {
    if (!html || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const id = iframeId.current;

    function handleMessage(event) {
      if (!event.data || event.data.type !== "orbital-iframe-height") return;
      if (event.data.id !== id) return;
      const h = Number(event.data.height);
      if (h > 0) iframe.style.height = `${h}px`;
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [html, srcDoc]);

  // BUG 2 FIX: plain-text emails linkify URLs via linkifyText().
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
    // BUG 3 FIX: w-full + overflow-hidden ensures the wrapper never grows wider
    // than its flex parent, and clips any content that escapes the iframe box.
    <div className="w-full overflow-hidden rounded-[18px] bg-white ring-1 ring-black/5">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        // allow-scripts: enables the postMessage height script and linkify script
        //   inside the iframe.
        // BUG 4 FIX: omitting allow-same-origin keeps the iframe in a null
        //   origin so external images load without the parent page's CSP or
        //   referrer policy interfering. The no-referrer meta tag is also
        //   removed from the srcDoc to avoid blocking images on servers that
        //   require a valid referrer.
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
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
