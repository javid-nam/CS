var scene,camera,renderer,gunGroup,models={};
var health=100,kills=0,score=0,started=false,wave=1;
var yaw=0,pitch=0,keys={},enemies=[],tracers=[];
var aiming=false,cur='ak',lastShot=0,colliders=[],mouseDown=false;
var guns={
 ak:{name:'AK-47',dmg:34,mag:30,reserve:180,ammo:30,rate:120,zoom:55,auto:true},
 m4:{name:'M4A1',dmg:28,mag:30,reserve:180,ammo:30,rate:100,zoom:55,auto:true},
 awp:{name:'AWP',dmg:150,mag:5,reserve:30,ammo:5,rate:1150,zoom:22,auto:false},
 deagle:{name:'Deagle',dmg:55,mag:7,reserve:49,ammo:7,rate:350,zoom:60,auto:false}
};
var hasBomb=false,bombPlanted=false,planting=0,bombObj=null,siteA,siteB,explodeTimer=40,plantPos=null;
var muzzleFlash,actx=null;
function brickTex(){var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d');g.fillStyle='#d8b981';g.fillRect(0,0,256,256);g.fillStyle='rgba(0,0,0,.15)';for(var y=0;y<8;y++)for(var x=0;x<4;x++)g.strokeRect(x*64+(y%2)*32,y*32,64,32);for(var i=0;i<800;i++){g.fillStyle='rgba(120,90,50,.25)';g.fillRect(Math.random()*256,Math.random()*256,3,3);}var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,1);return t;}
function groundTex(){var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d');g.fillStyle='#c9a86e';g.fillRect(0,0,256,256);for(var i=0;i<2000;i++){g.fillStyle='rgba('+(130+Math.random()*70|0)+','+(95+Math.random()*45|0)+',55,.5)';g.fillRect(Math.random()*256,Math.random()*256,2,2);}var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(20,20);return t;}
var wallTex;
function init(){
scene=new THREE.Scene();
scene.background=new THREE.Color(0x87b5e0);scene.fog=new THREE.Fog(0xd8c39a,20,120);
camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,300);
renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xfff6e0,0x6b5a3e,0.85));
var sun=new THREE.DirectionalLight(0xfff2d9,1.15);sun.position.set(35,50,20);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=45;sun.shadow.camera.bottom=-45;
scene.add(sun);
wallTex=brickTex();
var ground=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({map:groundTex(),roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
buildMap();
gunGroup=new THREE.Group();camera.add(gunGroup);scene.add(camera);
models.ak=buildGun(0x181818,0x7a3f14,false);models.m4=buildGun(0x222a33,0x222a33,false);
models.awp=buildGun(0x1a1a1a,0x3f5a36,true);models.deagle=buildPistol();
for(var k in models){models[k].visible=(k==='ak');gunGroup.add(models[k]);}
gunGroup.position.set(0.32,-0.32,-0.6);
muzzleFlash=new THREE.PointLight(0xffcc44,0,10);scene.add(muzzleFlash);
camera.position.set(0,1.7,26);camera.rotation.order='YXZ';
siteA={x:-21,z:-21};siteB={x:21,z:-19};
addRing(siteA,0x22c55e);addRing(siteB,0x3b82f6);
bombObj=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.35,0.3),new THREE.MeshStandardMaterial({color:0x16a34a,emissive:0x052e16}));
bombObj.position.set(0,0.4,0);bombObj.castShadow=true;scene.add(bombObj);
spawnWave(5);
bind();updateHUD();animate();
}
function box(x,z,w,h,d,mat){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,h/2,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);colliders.push({x:x,z:z,w:w,d:d});return m;}
function buildMap(){
var W=new THREE.MeshStandardMaterial({map:wallTex,roughness:.9});
var C=new THREE.MeshStandardMaterial({color:0x8b5a2b,roughness:.9});
var D=new THREE.MeshStandardMaterial({color:0xa08050,roughness:.9});
box(0,-30,64,7,2,W);box(0,30,64,7,2,W);box(-30,0,2,7,64,W);box(30,0,2,7,64,W);
box(-6,-8,2,5,10,D);box(6,-8,2,5,10,D);box(0,-11,10,1.4,3,D);
box(-18,5,8,2.6,2.6,C);box(-18,7.5,3,1.3,3,C);
box(18,-15,4,2.2,4,C);box(22.5,-15,3,1.6,3,C);box(20,-19,2,3.2,2,C);
box(-15,-18,6,3.2,1.6,W);box(-22,-5,3,3,3,C);box(-24,-5,2,1.5,2,C);
box(8,18,6,2.2,2,C);box(-8,12,5,2.2,2,C);box(0,5,2,2.6,6,C);
box(12,0,3,2,3,C);box(-12,-2,3,2,3,C);
}
function addRing(s,color){var m=new THREE.Mesh(new THREE.RingGeometry(3,5.5,28),new THREE.MeshBasicMaterial({color:color,side:THREE.DoubleSide,transparent:true,opacity:.75}));m.rotation.x=-Math.PI/2;m.position.set(s.x,0.06,s.z);scene.add(m);}
function buildGun(metalC,woodC,sniper){var g=new THREE.Group();var metal=new THREE.MeshStandardMaterial({color:metalC,roughness:.35,metalness:.75});var wood=new THREE.MeshStandardMaterial({color:woodC,roughness:.75});function p(w,h,l,x,y,z,mat){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),mat||(y<-0.04?wood:metal));m.position.set(x,y,z);g.add(m);return m;}p(0.07,0.12,0.75,0,0,-0.1);p(0.045,0.045,0.5,0,0.02,-0.65,metal);p(0.06,0.05,0.1,0,0.02,-0.88,metal);p(0.06,0.1,0.25,0,-0.03,0.22,wood);p(0.055,0.16,0.08,0,-0.12,-0.05,wood);p(0.05,0.15,0.12,0,-0.07,-0.42,wood);if(sniper){p(0.07,0.09,0.32,0,0.13,-0.1,metal);p(0.02,0.06,0.02,0,0.07,-0.1,metal);}else{p(0.03,0.07,0.05,0,0.09,-0.15,metal);p(0.025,0.05,0.04,0,0.08,-0.45,metal);}return g;}
function buildPistol(){var g=new THREE.Group();var m=new THREE.MeshStandardMaterial({color:0x3a3a3a,roughness:.3,metalness:.8});function p(w,h,l,x,y,z){var mm=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),m);mm.position.set(x,y,z);g.add(mm);}p(0.06,0.09,0.32,0,0,-0.1);p(0.05,0.16,0.07,0,-0.1,0.02);return g;}
function makeHuman(){var cols=[0xb91c1c,0x7f1d1d,0x5b21b6,0x0f766e];var color=cols[Math.random()*cols.length|0];
var g=new THREE.Group();var skin=new THREE.MeshStandardMaterial({color:0xe8b98a,roughness:.8});var cloth=new THREE.MeshStandardMaterial({color:color,roughness:.85});var pants=new THREE.MeshStandardMaterial({color:0x1f2937,roughness:.9});var vest=new THREE.MeshStandardMaterial({color:0x111111,roughness:.9});
function part(w,h,d,mat,x,y){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,0);m.castShadow=true;g.add(m);return m;}
part(0.45,0.5,0.45,skin,0,2.05);part(0.2,0.18,0.06,vest,0,2.05,0.24);
part(0.8,1,0.45,cloth,0,1.3);part(0.6,0.5,0.5,vest,0,1.35);
var aL=part(0.22,0.85,0.22,cloth,-0.55,1.3);var aR=part(0.22,0.85,0.22,cloth,0.55,1.3);
var lL=part(0.28,0.8,0.28,pants,-0.2,0.4);var lR=part(0.28,0.8,0.28,pants,0.2,0.4);
var gun=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.14,0.9),new THREE.MeshStandardMaterial({color:0x111111,roughness:.4,metalness:.6}));
gun.position.set(0.55,1.4,-0.5);g.add(gun);
var tip=new THREE.Object3D();tip.position.set(0.55,1.45,-1.0);g.add(tip);
var hpBar=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.1),new THREE.MeshBasicMaterial({color:0x22c55e,side:THREE.DoubleSide}));
hpBar.position.set(0,2.55,0);g.add(hpBar);
g.userData={armL:aL,armR:aR,legL:lL,legR:lR,gun:gun,tip:tip,hpBar:hpBar,hp:100,maxHp:100,phase:Math.random()*6,cool:1+Math.random()*2,strafe:Math.random()<0.5?-1:1,strafeT:0,state:'patrol',burst:0};
return g;}
function spawnWave(n){for(var i=0;i<n;i++){var e=makeHuman();var x=(Math.random()-0.5)*48,z=(Math.random()-0.5)*48;if(Math.hypot(x,z-26)<14)z-=18;e.position.set(x,0,z);scene.add(e);enemies.push(e);}updateCount();}
function updateCount(){document.getElementById('enemyCount').textContent='تروریست زنده: '+enemies.length+' | موج '+wave;}
function hasLOS(a,b){for(var i=1;i<12;i++){var x=a.x+(b.x-a.x)*i/12,z=a.z+(b.z-a.z)*i/12;for(var j=0;j<colliders.length;j++){var c=colliders[j];if(Math.abs(x-c.x)<c.w/2&&Math.abs(z-c.z)<c.d/2)return false;}}return true;}
function enemyShoot(e){
var from=new THREE.Vector3();e.userData.tip.getWorldPosition(from);
var to=camera.position.clone();
var geo=new THREE.BufferGeometry().setFromPoints([from,to]);
var line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xff3333,transparent:true,opacity:.9}));
scene.add(line);tracers.push({m:line,t:0.12});
var flash=new THREE.PointLight(0xffaa00,2,6);flash.position.copy(from);scene.add(flash);
setTimeout(function(){scene.remove(flash);},80);
enemySound();
var dist=from.distanceTo(to);
if(dist<38){var acc=dist<10?0.55:dist<20?0.32:0.15;if(Math.random()<acc){health-=5+Math.random()*8;updateHUD();var dv=document.getElementById('damage');dv.style.opacity=1;setTimeout(function(){dv.style.opacity=0;},220);if(health<=0)die();}}
}
var eActx=null;
function enemySound(){try{eActx=eActx||new(window.AudioContext||window.webkitAudioContext)();var o=eActx.createOscillator(),g=eActx.createGain();o.connect(g);g.connect(eActx.destination);o.type='sawtooth';o.frequency.setValueAtTime(400,eActx.currentTime);o.frequency.exponentialRampToValueAtTime(60,eActx.currentTime+0.18);g.gain.setValueAtTime(0.08,eActx.currentTime);g.gain.exponentialRampToValueAtTime(0.01,eActx.currentTime+0.18);o.start();o.stop(eActx.currentTime+0.2);}catch(e){}}
function bind(){
document.getElementById('startBtn').addEventListener('click',startGame);
document.addEventListener('keydown',function(e){keys[e.code]=true;if(e.code==='Digit1')switchGun('ak');if(e.code==='Digit2')switchGun('m4');if(e.code==='Digit3')switchGun('awp');if(e.code==='Digit4')switchGun('deagle');if(e.code==='KeyR')reload();});
document.addEventListener('keyup',function(e){keys[e.code]=false;});
document.addEventListener('mousemove',function(e){if(!started)return;var s=aiming?0.0009:0.0023;yaw-=(e.movementX||0)*s;pitch-=(e.movementY||0)*s;pitch=Math.max(-1.4,Math.min(1.4,pitch));camera.rotation.set(pitch,yaw,0);});
document.addEventListener('mousedown',function(e){if(!started)return;if(e.button===2){aiming=true;return;}if(e.button===0){mouseDown=true;fire();}});
document.addEventListener('mouseup',function(e){if(e.button===2)aiming=false;if(e.button===0)mouseDown=false;});
document.addEventListener('contextmenu',function(e){e.preventDefault();});
}
function startGame(){started=true;document.getElementById('menu').style.display='none';document.getElementById('hud').style.display='block';try{renderer.domElement.requestPointerLock();}catch(err){}}
function switchGun(w){cur=w;for(var k in models)models[k].visible=(k===w);document.getElementById('gunName').textContent=guns[w].name;['ak','m4','awp','deagle'].forEach(function(id){document.getElementById('slot-'+id).classList.toggle('active',id===w);});updateHUD();}
function gunSound(kind){try{actx=actx||new(window.AudioContext||window.webkitAudioContext)();var o=actx.createOscillator(),g=actx.createGain();o.connect(g);g.connect(actx.destination);var f=kind==='awp'?150:kind==='deagle'?300:kind==='m4'?650:750;o.frequency.setValueAtTime(f,actx.currentTime);o.frequency.exponentialRampToValueAtTime(70,actx.currentTime+0.15);g.gain.setValueAtTime(0.22,actx.currentTime);g.gain.exponentialRampToValueAtTime(0.01,actx.currentTime+0.15);o.start();o.stop(actx.currentTime+0.16);}catch(e){}}
function fire(){if(!started)return;var G=guns[cur],now=performance.now();if(now-lastShot<G.rate)return;if(G.ammo<=0){reload();return;}lastShot=now;G.ammo--;updateHUD();gunGroup.position.z=-0.45;setTimeout(function(){gunGroup.position.z=-0.6;},70);muzzleFlash.intensity=3;muzzleFlash.position.copy(camera.position);setTimeout(function(){muzzleFlash.intensity=0;},60);gunSound(cur);
var ray=new THREE.Raycaster();ray.setFromCamera({x:(Math.random()-0.5)*0.01,y:(Math.random()-0.5)*0.01},camera);
var hits=ray.intersectObjects(enemies,true);
if(hits.length&&hits[0].distance<120){var root=hits[0].object;while(root.parent!==scene)root=root.parent;var isHead=hits[0].point.y-root.position.y>1.8;root.userData.hp-=G.dmg*(isHead?2:1);var pct=Math.max(0,root.userData.hp/root.userData.maxHp);root.userData.hpBar.scale.x=pct;root.userData.hpBar.material.color.setHex(pct>0.5?0x22c55e:pct>0.25?0xf59e0b:0xef4444);var h=document.getElementById('hitmarker');h.style.opacity=1;setTimeout(function(){h.style.opacity=0;},120);if(root.userData.hp<=0)killEnemy(root,isHead);}}
function addFeed(t){var kf=document.getElementById('killfeed');var d=document.createElement('div');d.className='kill';d.textContent=t;kf.insertBefore(d,kf.firstChild);setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d);},3500);}
function killEnemy(e,head){scene.remove(e);enemies=enemies.filter(function(x){return x!==e;});kills++;score+=head?150:100;updateHUD();updateCount();addFeed((head?'💥 HEADSHOT! ':'☠️ ')+guns[cur].name+' +'+(head?150:100));if(enemies.length===0){wave++;document.getElementById('wave').textContent=wave;score+=300;addFeed('🌊 موج '+wave+' شروع شد!');setTimeout(function(){spawnWave(4+wave);},2000);}else setTimeout(spawnEnemySingle,3000);}
function spawnEnemySingle(){if(!started)return;var e=makeHuman();e.position.set((Math.random()-0.5)*48,0,-25+Math.random()*8);scene.add(e);enemies.push(e);updateCount();}
function reload(){var G=guns[cur];if(G.reserve<=0||G.ammo===G.mag)return;var t=Math.min(G.mag-G.ammo,G.reserve);G.ammo+=t;G.reserve-=t;updateHUD();}
function updateHUD(){var G=guns[cur];document.getElementById('health').textContent=Math.max(0,Math.round(health));document.getElementById('ammo').textContent=G.ammo;document.getElementById('reserve').textContent=G.reserve;document.getElementById('kills').textContent=kills;document.getElementById('score').textContent=score;}
function die(){document.getElementById('dead').style.display='flex';document.getElementById('finalKills').textContent=kills;document.getElementById('finalWave').textContent=wave;started=false;try{document.exitPointerLock();}catch(e){}}
function col(nx,nz){for(var i=0;i<colliders.length;i++){var c=colliders[i];if(Math.abs(nx-c.x)<c.w/2+0.5&&Math.abs(nz-c.z)<c.d/2+0.5)return true;}if(Math.abs(nx)>29||Math.abs(nz)>29)return true;return false;}
function nearSite(){return Math.hypot(camera.position.x-siteA.x,camera.position.z-siteA.z)<7||Math.hypot(camera.position.x-siteB.x,camera.position.z-siteB.z)<7;}
var last=performance.now();
function animate(){requestAnimationFrame(animate);var now=performance.now(),dt=Math.min((now-last)/1000,0.05);last=now;
for(var ti=tracers.length-1;ti>=0;ti--){tracers[ti].t-=dt;if(tracers[ti].t<=0){scene.remove(tracers[ti].m);tracers.splice(ti,1);}}
if(started){var G=guns[cur];var tf=aiming?G.zoom:75;camera.fov+=(tf-camera.fov)*0.18;camera.updateProjectionMatrix();
var tx=aiming?0:0.32,ty=aiming?-0.22:-0.32;gunGroup.position.x+=(tx-gunGroup.position.x)*0.2;gunGroup.position.y+=(ty-gunGroup.position.y)*0.2;
gunGroup.position.y+=Math.sin(now*0.012)*0.0006;
if(mouseDown&&G.auto)fire();
var sp=(keys['ShiftLeft']?7.5:4.6)*dt*3;var fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=-fz,rz=fx;
var nx=camera.position.x,nz=camera.position.z;
if(keys['KeyW']){nx+=fx*sp;nz+=fz*sp;}if(keys['KeyS']){nx-=fx*sp;nz-=fz*sp;}
if(keys['KeyA']){nx-=rx*sp;nz-=rz*sp;}if(keys['KeyD']){nx+=rx*sp;nz+=rz*sp;}
if(!col(nx,camera.position.z))camera.position.x=nx;if(!col(camera.position.x,nz))camera.position.z=nz;
camera.position.y=1.7+Math.sin(now*0.011)*0.035;
if(bombObj&&!hasBomb&&!bombPlanted){bombObj.rotation.y+=dt*2;if(camera.position.distanceTo(bombObj.position)<2.5){hasBomb=true;scene.remove(bombObj);document.getElementById('bombStatus').textContent='بمب داری! برو A یا B';addFeed('💣 بمب رو برداشتی!');}}
if(hasBomb&&!bombPlanted&&nearSite()&&keys['KeyE']){planting+=dt;document.getElementById('plantBar').style.display='block';document.getElementById('plantFill').style.width=(planting/3*100)+'%';if(planting>=3){bombPlanted=true;hasBomb=false;plantPos=camera.position.clone();document.getElementById('plantBar').style.display='none';document.getElementById('bombStatus').textContent='بمب کاشته شد! دفاع کن';document.getElementById('timer').style.display='block';addFeed('💣 بمب کاشته شد! 40 ثانیه دفاع کن!');score+=200;updateHUD();}}else{planting=0;document.getElementById('plantBar').style.display='none';}
if(bombPlanted){explodeTimer-=dt;document.getElementById('timer').textContent='BOMB '+Math.max(0,explodeTimer).toFixed(0);if(explodeTimer<=0){document.getElementById('win').style.display='flex';document.getElementById('winScore').textContent=score+500;started=false;}}
for(var i=0;i<enemies.length;i++){(function(e){
var dx=camera.position.x-e.position.x,dz=camera.position.z-e.position.z;var dist=Math.sqrt(dx*dx+dz*dz);
var tgt=(bombPlanted&&plantPos)?plantPos:camera.position;
var vx=tgt.x-e.position.x,vz=tgt.z-e.position.z;var vl=Math.sqrt(vx*vx+vz*vz)||1;vx/=vl;vz/=vl;
var eye={x:e.position.x,z:e.position.z};
var seeP=hasLOS(eye,{x:camera.position.x,z:camera.position.z})&&dist<40;
var u=e.userData;
if(u.hp<30){vx=-vx;vz=-vz;u.state='retreat';}
else if(seeP&&dist<22){u.state='attack';}
else{u.state='chase';}
var speed=u.state==='retreat'?3.2:u.state==='attack'?1.4:2.6;
if(u.state==='attack'){
u.strafeT-=dt;if(u.strafeT<=0){u.strafe=Math.random()<0.5?-1:1;u.strafeT=1+Math.random();}
var sx=-vz*u.strafe,sz=vx*u.strafe;
var ex=e.position.x+sx*dt*speed,ez=e.position.z+sz*dt*speed;
if(!col(ex,ez)){e.position.x=ex;e.position.z=ez;}
e.lookAt(camera.position.x,0,camera.position.z);
u.cool-=dt;
if(u.cool<=0&&seeP){if(u.burst<=0)u.burst=3+Math.random()*3|0;enemyShoot(e);u.burst--;u.cool=u.burst>0?0.18+Math.random()*0.15:1.2+Math.random()*1.5;}
u.phase+=dt*3;
}else{
var ex2=e.position.x+vx*dt*speed,ez2=e.position.z+vz*dt*speed;
if(!col(ex2,ez2)){e.position.x=ex2;e.position.z=ez2;}else{e.position.x-=vx*dt*speed;e.position.z+=vz*dt*speed*0.5;}
e.lookAt(tgt.x,0,tgt.z);
u.phase+=dt*8;
}
var s=Math.sin(u.phase)*0.5;
u.legL.rotation.x=s;u.legR.rotation.x=-s;u.armL.rotation.x=-s*0.6;u.armR.rotation.x=-0.9;
u.hpBar.lookAt(camera.position);
})(enemies[i]);}
}
renderer.render(scene,camera);}
window.onload=init;