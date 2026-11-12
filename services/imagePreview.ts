/** Upgrade only known Google thumbnail sizing; other image URLs stay untouched. */
export function imagePreviewUrl(value:string):string {
  try {
    const url=new URL(value);
    if(url.protocol==='https:' && (url.hostname==='googleusercontent.com'||url.hostname.endsWith('.googleusercontent.com'))) {
      url.pathname=url.pathname.replace(/=(?:s\d+(?:-[\w-]+)*|w\d+(?:-h\d+)?(?:-[\w-]+)*)$/,'=s2048');
      return url.href;
    }
  } catch { /* The original source may be an in-memory/local image. */ }
  return value;
}
export function imageLayout(width:number,height:number,viewportWidth:number,viewportHeight:number,rotation=0,zoom=1) {
  if([width,height,viewportWidth,viewportHeight,zoom].some(value=>!Number.isFinite(value)||value<=0))return null;
  const sideways=Math.abs(rotation%180)===90;
  const rotatedWidth=sideways?height:width,rotatedHeight=sideways?width:height;
  const fit=Math.min(viewportWidth/rotatedWidth,viewportHeight/rotatedHeight);
  return {width:width*fit*zoom,height:height*fit*zoom,
    canvasWidth:Math.max(viewportWidth,rotatedWidth*fit*zoom),canvasHeight:Math.max(viewportHeight,rotatedHeight*fit*zoom)};
}
