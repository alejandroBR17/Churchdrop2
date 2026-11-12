import React,{useEffect,useRef,useState} from 'react';
import {imageLayout,imagePreviewUrl} from '../services/imagePreview';
export function ImagePreview({src,name,zoom,rotation}:{src:string;name:string;zoom:number;rotation:number}) {
  const viewport=useRef<HTMLDivElement>(null);
  const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
  const [size,setSize]=useState({width:0,height:0});
  const [natural,setNatural]=useState({width:0,height:0});
  const [fallback,setFallback]=useState(false);
  const [failed,setFailed]=useState(false);
  const [loading,setLoading]=useState(true);
  const source=fallback?src:imagePreviewUrl(src);
  const layout=imageLayout(natural.width,natural.height,size.width,size.height,rotation,zoom);
  useEffect(()=>{
    const node=viewport.current;if(!node)return;
    const resize=()=>setSize({width:node.clientWidth,height:node.clientHeight});resize();
    const observer=new ResizeObserver(resize);observer.observe(node);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const node=viewport.current;
    if(node&&layout){node.scrollLeft=(layout.canvasWidth-size.width)/2;node.scrollTop=(layout.canvasHeight-size.height)/2;}
  },[zoom,rotation,natural.width,natural.height,size.width,size.height]);
  return <div ref={viewport} tabIndex={0} role="region" aria-label="Prévia da imagem" className="relative h-full w-full min-h-0 overflow-auto overscroll-contain outline-none" style={{cursor:zoom>1?'grab':'default'}}
    onPointerDown={event=>{
      if(event.pointerType!=='mouse'||zoom<=1||event.button!==0)return;
      const node=event.currentTarget;drag.current={x:event.clientX,y:event.clientY,left:node.scrollLeft,top:node.scrollTop};node.setPointerCapture(event.pointerId);event.preventDefault();
    }}
    onPointerMove={event=>{const start=drag.current;if(!start)return;event.currentTarget.scrollLeft=start.left+start.x-event.clientX;event.currentTarget.scrollTop=start.top+start.y-event.clientY;}}
    onPointerUp={event=>{drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
    onPointerCancel={()=>{drag.current=null;}}>
    {loading&&!failed&&<p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">Carregando imagem…</p>}
    {failed?<p role="alert" className="flex h-full items-center justify-center p-6 text-center text-sm text-neutral-300">Não foi possível abrir a imagem. Tente baixar o arquivo ou abrir no Drive.</p>:<div className="relative" style={{width:layout?.canvasWidth??'100%',height:layout?.canvasHeight??'100%'}}>
      <img src={source} alt={name} draggable={false} decoding="async"
        onLoad={event=>{setNatural({width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight});setLoading(false);}}
        onError={()=>{if(!fallback&&source!==src){setFallback(true);}else{setFailed(true);setLoading(false);}}}
        className="absolute left-1/2 top-1/2 select-none"
        style={{width:layout?.width??'auto',height:layout?.height??'auto',maxWidth:'none',visibility:layout?'visible':'hidden',transform:`translate(-50%,-50%) rotate(${rotation}deg)`}}/>
    </div>}
  </div>;
}
