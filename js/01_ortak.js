/* Ortak yardımcılar: dönem, sayı, tarih. Tarayıcıda global, Node'da module.exports. */
(function(g){
const pad=n=>String(n).padStart(2,'0');
const U=s=>String(s??'').toLocaleUpperCase('tr-TR');
/* Türkçe veya JS biçimindeki sayıyı sayıya çevirir: 1.234,56 | "1234.56" | 1234.56 */
function parseNum(v){if(typeof v==='number')return v;if(v==null)return null;let s=String(v).trim().replace(/\s/g,'');if(!s)return null;
 if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');else if((s.match(/\./g)||[]).length>1)s=s.replace(/\./g,'');
 const n=Number(s);return Number.isFinite(n)?n:null}
const fmtTR=n=>n==null?'':n.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
/* Tarih: Date | "gg.aa.yyyy" | "yyyy-aa-gg" → "gg.aa.yyyy" */
function normTarih(v){if(v==null||v==='')return'';if(v instanceof Date)return pad(v.getUTCDate())+'.'+pad(v.getUTCMonth()+1)+'.'+v.getUTCFullYear();
 const s=String(v).trim();let m=/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/.exec(s);if(m)return pad(+m[1])+'.'+pad(+m[2])+'.'+m[3];
 m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);return m?m[3]+'.'+m[2]+'.'+m[1]:s}
const donemOfTarih=t=>{const m=/^\d{2}\.(\d{2})\.(\d{4})$/.exec(normTarih(t));return m?m[1]+'.'+m[2]:null};
function normDonem(v){if(v==null)return'';if(v instanceof Date)return pad(v.getUTCMonth()+1)+'.'+v.getUTCFullYear();
 const m=/^(\d{1,2})\s*[.\/]\s*(\d{4})$/.exec(String(v).trim());return m?pad(+m[1])+'.'+m[2]:String(v).trim()}
const prevDonem=d=>{let[m,y]=d.split('.').map(Number);m--;if(!m){m=12;y--}return pad(m)+'.'+y};
const donemKey=d=>d.slice(3)+d.slice(0,2);
const donemSort=a=>[...a].sort((x,y)=>donemKey(x)<donemKey(y)?-1:1);
const yilOf=d=>d.slice(3);
/* Defter satırının anahtarı: Yevmiye/Kebir → "Yevmiye 07.2026" (başlangıç = bitiş = tek ay), Envanter → "Envanter 2026"; diğerleri null */
function defterAnahtar(r){const n=U(r.nevi||''),bas=normDonem(r.bas),bit=normDonem(r.bit);
 if(/ENVANTER/.test(n))return bas?'Envanter '+bas.slice(3):null;
 const t=/YEVM/.test(n)?'Yevmiye':/KEB[İI]R/.test(n)?'Kebir':null;return t&&bas&&bas===bit?`${t} ${bas}`:null}
const api={defterAnahtar,pad,U,parseNum,fmtTR,normTarih,donemOfTarih,normDonem,prevDonem,donemKey,donemSort,yilOf};
if(typeof module!=='undefined')module.exports=api;else Object.assign(g,{KD:api});
})(typeof window!=='undefined'?window:globalThis);
