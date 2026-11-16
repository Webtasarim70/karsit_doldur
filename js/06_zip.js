/* Küçük ZIP yazıcı (sıkıştırmasız/"store"); .xlsx zaten sıkıştırılmıştır. zip([{name,data:Uint8Array}]) → Uint8Array */
(function(g){
const CT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t.push(c>>>0)}return t})();
const crc=d=>{let c=-1;for(let i=0;i<d.length;i++)c=CT[(c^d[i])&255]^(c>>>8);return(c^-1)>>>0};
function zip(files){const en=new TextEncoder(),P=[],C=[];let off=0;
 for(const{name,data}of files){const nb=en.encode(name),c=crc(data),l=new Uint8Array(30+nb.length),v=new DataView(l.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,c,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,nb.length,true);l.set(nb,30);P.push(l,data);
  const h=new Uint8Array(46+nb.length),w=new DataView(h.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,0x21,true);w.setUint32(16,c,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,nb.length,true);w.setUint32(42,off,true);h.set(nb,46);C.push(h);off+=l.length+data.length}
 const cs=C.reduce((a,b)=>a+b.length,0),z=new Uint8Array(22),e=new DataView(z.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,C.length,true);e.setUint16(10,C.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
 const all=[...P,...C,z],out=new Uint8Array(all.reduce((a,b)=>a+b.length,0));let o=0;all.forEach(b=>{out.set(b,o);o+=b.length});return out}
if(typeof module!=='undefined')module.exports={zip};else g.zip=zip;
})(typeof window!=='undefined'?window:globalThis);
