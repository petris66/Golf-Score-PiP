const $=s=>document.querySelector(s);let data=null,blobUrl=null,directNeedsPrepare=false;
function norm(raw){const scores=raw.scores;if(!Array.isArray(scores)||scores.length<1||scores.length>18)throw Error('scores pitää olla 1–18 tuloksen lista.');return{player:String(raw.player||raw.name||'Pelaaja'),course:String(raw.course||raw.courseName||'Kenttä'),tee:String(raw.tee||'–'),startTime:String(raw.startTime||raw.start||'–'),scores:scores.map(v=>(v==='-'||v==='–')?'–':String(v))}}
function total(a){return a.reduce((s,v)=>{const n=Number(v);return s+(Number.isFinite(n)&&n>0?n:0)},0)}
function render(){const f=total(data.scores.slice(0,9)),b=total(data.scores.slice(9,18));$('#player').textContent=data.player;$('#meta').textContent=`${data.course} · ${data.tee} tii · ${data.startTime}`;$('#scores').innerHTML=data.scores.map((v,i)=>`<div class="score"><small>${i+1}</small><b>${v}</b></div>`).join('');$('#totals').textContent=`Etu ${f} · Taka ${b} · Yhteensä ${f+b}`;$('#card').hidden=false}
function draw(c){const x=c.getContext('2d'),W=c.width,H=c.height;x.fillStyle='#103f1d';x.fillRect(0,0,W,H);x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.font='700 34px Arial';x.fillText(data.player,W/2,31);x.font='600 25px Arial';x.fillText(`${data.course}  ·  ${data.tee} tii  ·  ${data.startTime}`,W/2,68);const cw=W/9,ys=[142,290];[data.scores.slice(0,9),data.scores.slice(9,18)].forEach((ss,g)=>ss.forEach((v,i)=>{const xx=cw*(i+.5);x.fillStyle='rgba(255,255,255,.18)';x.beginPath();x.roundRect(i*cw+4,ys[g]-40,cw-8,112,10);x.fill();x.fillStyle='rgba(255,255,255,.82)';x.font='500 22px Arial';x.fillText(String(g*9+i+1),xx,ys[g]-14);x.fillStyle='#fff';x.font='700 44px Arial';x.fillText(String(v),xx,ys[g]+31)}));const f=total(data.scores.slice(0,9)),b=total(data.scores.slice(9,18));x.fillStyle='#fff';x.font='700 32px Arial';x.fillText(`Etu ${f}   ·   Taka ${b}   ·   Yhteensä ${f+b}`,W/2,H-22)}
async function makeVideo(){if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw Error('Selain ei tue PiP-videon muodostamista.');const c=document.createElement('canvas');c.width=900;c.height=420;draw(c);const stream=c.captureStream(2),types=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp8','video/webm'],mt=types.find(t=>MediaRecorder.isTypeSupported?.(t))||'',r=new MediaRecorder(stream,mt?{mimeType:mt,videoBitsPerSecond:1200000}:undefined),chunks=[];r.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};const done=new Promise((res,rej)=>{r.onerror=e=>rej(e.error||Error('Videon luonti epäonnistui.'));r.onstop=()=>res(new Blob(chunks,{type:r.mimeType||mt||'video/mp4'}))});r.start();for(let i=0;i<5;i++){draw(c);await new Promise(q=>setTimeout(q,120))}r.stop();const blob=await done;stream.getTracks().forEach(t=>t.stop());return blob}
async function prepare(){const btn=$('#pip');btn.disabled=true;btn.textContent='Valmistellaan PiP…';$('#status').textContent='Muodostetaan PiP-kuvaa…';try{const blob=await makeVideo();if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(blob);const v=$('#video');v.src=blobUrl;v.load();await new Promise((resolve,reject)=>{if(v.readyState>=1){resolve();return}const ok=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(Error('PiP-video ei latautunut.'))},cleanup=()=>{v.removeEventListener('loadedmetadata',ok);v.removeEventListener('error',bad)};v.addEventListener('loadedmetadata',ok,{once:true});v.addEventListener('error',bad,{once:true})});btn.disabled=false;btn.textContent='Avaa tulokset PiP';$('#status').textContent='Valmis. Avaa PiP ja siirry sen jälkeen eBirdieen.'}catch(e){btn.textContent='PiP ei valmistunut';$('#status').textContent='PiP-videon valmistelu ei onnistunut: '+e.message}}
$('#file').addEventListener('change',async e=>{try{const f=e.target.files?.[0];if(!f)return;data=norm(JSON.parse(await f.text()));render();await prepare()}catch(err){$('#card').hidden=true;$('#status').textContent='Tiedoston avaaminen epäonnistui: '+err.message}});
$('#pip').addEventListener('click',async()=>{if(directNeedsPrepare){directNeedsPrepare=false;await prepare();return}const v=$('#video');try{v.currentTime=0;const playPromise=v.play();if(typeof v.webkitSupportsPresentationMode==='function'&&v.webkitSupportsPresentationMode('picture-in-picture')&&typeof v.webkitSetPresentationMode==='function'){v.webkitSetPresentationMode('picture-in-picture');playPromise?.catch(()=>{});return}if(document.pictureInPictureEnabled&&v.requestPictureInPicture){const pipPromise=v.requestPictureInPicture();playPromise?.catch(()=>{});pipPromise?.catch(e=>$('#status').textContent='PiP:n avaaminen ei onnistunut: '+e.message);return}throw Error('PiP ei ole käytettävissä.')}catch(e){$('#status').textContent='PiP:n avaaminen ei onnistunut: '+e.message}});

function decodeTransferHash(){
  try{
    const m=location.hash.match(/^#data=([A-Za-z0-9_-]+)$/);
    if(!m)return false;
    let b64=m[1].replace(/-/g,'+').replace(/_/g,'/');
    while(b64.length%4)b64+='=';
    const binary=atob(b64),bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
    data=norm(JSON.parse(new TextDecoder().decode(bytes)));
    render();
    directNeedsPrepare=true;
    const btn=$('#pip');
    btn.disabled=false;
    btn.textContent='Valmistele PiP';
    $('#status').textContent='Kierros vastaanotettu. Valmistele PiP Safarissa.';
    return true;
  }catch(err){
    $('#card').hidden=true;
    $('#status').textContent='Suoran kierrossiirron avaaminen epäonnistui: '+err.message;
    return false;
  }
}
decodeTransferHash();
