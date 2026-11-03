import * as THREE from './vendor/three.module.js';
import { HDRLoader } from './vendor/HDRLoader.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
const HDR_BASE='https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/';
const HDR_NAME=new URLSearchParams(location.search).get('hdr')||'glasshouse_interior';
/** Hendido: ranura de bisagra en tapas delantera y trasera, cerca del lomo. */
function addHinge(book,{offset=.0075,width=.0055,depth=.0007}={}){
 book.traverse(o=>{
  if(!o.isMesh||!/^Tapa (delantera|trasera)$/.test(o.name))return;
  const p=o.geometry.parameters,front=o.name==='Tapa delantera',outer=front?1:-1;
  const g=new THREE.BoxGeometry(p.width,p.height,p.depth,360,1,1),pos=g.attributes.position;
  const cx=-p.width/2+offset;
  for(let i=0;i<pos.count;i++){
   const z=pos.getZ(i);if(Math.abs(z-outer*p.depth/2)>1e-7)continue;
   const t=(pos.getX(i)-cx)/(width/2);if(Math.abs(t)>=1)continue;
   pos.setZ(i,z-outer*depth*(.5+.5*Math.cos(Math.PI*t)));
  }
  g.computeVertexNormals();o.geometry.dispose();o.geometry=g;
  if(front){const mats=Array.isArray(o.material)?o.material:[o.material],m=mats[4];if(m&&m.map){m.map=m.map.clone();m.map.offset.x=-(offset+width/2)/2/p.width*.62;m.map.wrapS=THREE.ClampToEdgeWrapping;m.map.needsUpdate=true;}}
 });
}
/** Código de barras EAN-13 en la esquina inferior derecha de la contraportada. */
function ean13(code){
 const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
 const R=L.map(s=>[...s].map(c=>c==='1'?'0':'1').join(''));
 const G=R.map(s=>[...s].reverse().join(''));
 const P=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
 const d=[...code].map(Number);let s='101';
 for(let i=1;i<7;i++)s+=(P[d[0]][i-1]==='L'?L:G)[d[i]];
 s+='01010';for(let i=7;i<13;i++)s+=R[d[i]];return s+'101';
}
function addBarcode(book,{num='978840900000',fromRight=.0175,fromBottom=.011,w=.031}={}){
 const sum=[...num].reduce((a,c,i)=>a+Number(c)*(i%2?3:1),0),code=num+((10-sum%10)%10);
 book.traverse(o=>{
  if(!o.isMesh||o.name!=='Tapa trasera')return;
  const mats=Array.isArray(o.material)?o.material:[o.material],m=mats[5];if(!m||!m.map||!m.map.image)return;
  const img=m.map.image,W=img.width,H=img.height,ppm=W/o.geometry.parameters.width;
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(img,0,0,W,H);
  const bits=ean13(code),bw=w*ppm,mod=bw/(bits.length+18),bh=bw*.62,pad=mod*9;
  const bx=W-fromRight*ppm-bw,by=H-fromBottom*ppm-bh;
  x.fillStyle='#fff';x.fillRect(bx,by,bw,bh);x.fillStyle='#111';
  const fs=mod*9,top=by+mod*4,barH=bh-mod*4-fs*1.1;
  for(let i=0;i<bits.length;i++)if(bits[i]==='1'){const guard=i<3||(i>=45&&i<50)||i>=92;x.fillRect(bx+pad+i*mod,top,mod+.5,barH+(guard?fs*.55:0));}
  x.font=fs+'px monospace';x.textBaseline='top';x.textAlign='center';const ty=top+barH+fs*.08;
  x.fillText(code[0],bx+pad-mod*4,ty);
  for(let i=0;i<6;i++)x.fillText(code[1+i],bx+pad+(3+i*7+3.5)*mod,ty);
  for(let i=0;i<6;i++)x.fillText(code[7+i],bx+pad+(50+i*7+3.5)*mod,ty);
  const t=new THREE.CanvasTexture(c);t.colorSpace=m.map.colorSpace;t.flipY=m.map.flipY;t.wrapS=m.map.wrapS;t.wrapT=m.map.wrapT;
  m.map=t;m.needsUpdate=true;
 });
}
/** Mount a transparent book. Returns pause(), play(), setAngle(radians), dispose(). */
export async function mountBook(container, {modelUrl=new URL('./cover.glb',import.meta.url), secondsPerTurn=12, easing=.22}={}) {
 if(!(secondsPerTurn>0))throw new Error('secondsPerTurn debe ser mayor que 0');
 easing=Math.max(0,Math.min(.8,easing));
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(32,1,.01,10);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});let disposed=false;
 renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 const canvas=renderer.domElement;canvas.style.cssText='display:block;width:100%;height:100%;background:transparent';
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Libro NO FUNCIONA, vista tridimensional giratoria');container.append(canvas);
 const hemi=new THREE.HemisphereLight(0xffffff,0xf0e6e8,1.8);scene.add(hemi);
 if(HDR_NAME!=='none')(async()=>{for(const wait of [0,500,1500,3000]){await new Promise(r=>setTimeout(r,wait));if(disposed)throw 0;try{return await new HDRLoader().setCrossOrigin('anonymous').loadAsync(HDR_BASE+HDR_NAME+'_1k.hdr');}catch(e){console.warn('HDR intento fallido',e?.type,e?.target?.status);}}throw new Error('HDR no disponible');})().then(hdr=>{if(disposed){hdr.dispose();return;}const pm=new THREE.PMREMGenerator(renderer);const env=pm.fromEquirectangular(hdr).texture;hdr.dispose();pm.dispose();scene.environment=env;scene.environmentIntensity=1.1;scene.environmentRotation.y=1.2;hemi.intensity=.5;key.intensity=1.1;fill.intensity=.4;}).catch(e=>console.warn('HDR no disponible, se usa iluminación base',e));
 const key=new THREE.DirectionalLight(0xffffff,1.5);key.position.set(-2,3,4);scene.add(key);
 const fill=new THREE.DirectionalLight(0xffffff,1.2);fill.position.set(2,1,-3);scene.add(fill);
 let book;try{book=(await new GLTFLoader().loadAsync(String(modelUrl))).scene;}catch(e){renderer.dispose();canvas.remove();throw e;}
 const pivot=new THREE.Group();pivot.rotation.z=-.025;scene.add(pivot);pivot.add(book);
 book.traverse(o=>{if(o.isMesh)for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());});
 const mq=matchMedia('(prefers-reduced-motion: reduce)');let playing=!mq.matches,phase=0,last=null,manualAngle=null;
 function resize(){const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);camera.aspect=w/h;const vf=THREE.MathUtils.degToRad(32);const dist=Math.max(.108/Math.tan(vf/2),.071/(Math.tan(vf/2)*camera.aspect))*1.55;camera.position.set(0,.018,dist);camera.lookAt(0,0,0);camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
 const ro=new ResizeObserver(resize);ro.observe(container);resize();
 const initial=.4;
 function render(ms){if(disposed)return;const dt=last===null?0:Math.min((ms-last)/1000,.1);last=ms;if(playing&&!document.hidden)phase+=dt/secondsPerTurn*Math.PI*2;book.rotation.y=manualAngle??(initial+phase-easing/2*Math.sin(2*phase));renderer.render(scene,camera);}
 renderer.setAnimationLoop(render);
 function motion(){playing=!mq.matches;}mq.addEventListener('change',motion);
 return {scene,book,renderer,envReady:()=>!!scene.environment,prepare(pr){renderer.setAnimationLoop(null);renderer.setPixelRatio(pr);resize();},frame(p){const ph=p*Math.PI*2;book.rotation.y=initial+ph-easing/2*Math.sin(2*ph);renderer.render(scene,camera);return canvas;},pause(){playing=false;},play(){if(manualAngle!==null){phase=manualAngle-initial;manualAngle=null;}playing=true;last=null;},setAngle(radians){playing=false;manualAngle=radians;book.rotation.y=radians;renderer.render(scene,camera);},dispose(){disposed=true;renderer.setAnimationLoop(null);ro.disconnect();mq.removeEventListener('change',motion);const gs=new Set(),ms=new Set(),ts=new Set();book.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());renderer.dispose();canvas.remove();}};
}
