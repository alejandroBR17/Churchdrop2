export interface PairLink {mode:'approve'|'join';id:string;token:string;}
type Bootstrap=Window&{__univerTakePairing?:()=>PairLink|null};
const initial=(window as Bootstrap).__univerTakePairing?.()||null;
delete (window as Bootstrap).__univerTakePairing;
export function initialPairLink(){return initial;}
export interface PairState {id?:string;url?:string;approvalToken?:string;status?:string;expiresAt?:number;label?:string;remember?:boolean;success?:boolean;remembered?:boolean;}

export function pairLinkFromHash():PairLink|null {
  const match=/^#(pair|join)=([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(window.location.hash);
  if(!match)return null;
  history.replaceState(history.state,'',location.pathname+location.search);
  return {mode:match[1]==='pair'?'approve':'join',id:match[2],token:match[3]};
}
