"use client";

import { useRef, useEffect, useState } from "react";

export function GuideIframe({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "guide-resize" && typeof e.data.height === "number") {
        setHeight(e.data.height);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const srcDoc = `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700;900&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
</head><body>
${html}
<script>
function send(){
  var h=document.documentElement.scrollHeight;
  parent.postMessage({type:'guide-resize',height:h},'*');
  document.documentElement.style.overflow='hidden';
}
window.addEventListener('load',function(){
  send();
  document.fonts.ready.then(function(){send()});
  new ResizeObserver(function(){send()}).observe(document.body);
});
</script>
</body></html>`;

  return (
    <iframe
      ref={ref}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      className="w-full rounded-md border-0"
      style={{ height: height + "px", overflow: "hidden" }}
      scrolling="no"
      title="근무 가이드"
    />
  );
}
