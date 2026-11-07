// 開幕的場景插圖（扁平漸層 SVG），原樣移植自 prototypes/liver-red-demo-v3.html 的 PAINT。
// 之後會逐張換成生成的像素圖；同一場景只用一張底圖，時段由 o.tod 打光。
// paint(key, o) → SVG 字串。o：{ tod: 'night'|'dawn'|'day'|'dusk', bag, box, rain }
import { rng } from '../core/util.js';

let gid = 0;
const SKY={dawn:['#5b6aa0','#c99bb8','#f6c9a0'],day:['#7fb8e0','#b9dcef','#f3ead2'],dusk:['#3c3a78','#b06a8a','#f2a674'],night:['#0d0f2c','#22265a','#4e3f72']};
const lg=(id,st,x2=0,y2=1)=>`<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${st.map((c,i)=>`<stop offset="${(i/(st.length-1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const rg=(id,c,o=1)=>`<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
function stars(n,seed,h=150){const r=rng(seed);let s='';for(let i=0;i<n;i++)s+=`<circle cx="${(r()*640).toFixed(1)}" cy="${(r()*h).toFixed(1)}" r="${(r()*1.1+.3).toFixed(2)}" fill="#fff" opacity="${(r()*.6+.2).toFixed(2)}"/>`;return s;}
function rain(seed,n=70){const r=rng(seed);let s='<g opacity=".5" stroke="#c8d8f0" stroke-width="1">';for(let i=0;i<n;i++){const x=r()*660,y=r()*240,d=(r()*1.1).toFixed(2);s+=`<line class="drop" style="animation-delay:-${d}s" x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x-4).toFixed(0)}" y2="${(y+14).toFixed(0)}"/>`;}return s+'</g>';}
function person(x,y,c,s=1,bag){return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="-2" width="8" height="14" rx="3" fill="${c}"/><circle cx="0" cy="-7" r="4.2" fill="#e6c0a0"/><path d="M-4.2 -8a4.2 4.2 0 0 1 8.4 0z" fill="#2a2228"/><rect x="-3.5" y="11" width="3" height="9" fill="#3a3f5a"/><rect x=".5" y="11" width="3" height="9" fill="#3a3f5a"/>${bag?`<rect x="-9" y="-3" width="6" height="11" rx="2" fill="${bag}"/>`:''}</g>`;}
function svg(defs,body){return `<svg viewBox="0 0 640 260" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;}
const PAINT={
 room(o){const t=o.tod||'night',p='r'+gid++,sk=SKY[t],nt=t==='night';
  return svg(lg(p+'s',sk)+rg(p+'l','#ffd28a',.55)+lg(p+'w',nt?['#2a2638','#1d1a28']:['#e9dccb','#d8c8b4'])+rg(p+'m','#9ec0ff',.5),
  `<rect width="640" height="260" fill="url(#${p}w)"/>
  <rect x="330" y="34" width="250" height="150" rx="4" fill="url(#${p}s)"/>${nt?stars(30,7,90).replace(/cx="(\d+)/g,(m,a)=>`cx="${330+(+a%250)}`):''}
  <g fill="${nt?'#1a1834':'#9fb4c4'}">${[0,1,2,3,4,5,6,7].map(i=>`<rect x="${336+i*31}" y="${110-((i*37)%45)}" width="26" height="${80+((i*37)%45)}"/>`).join('')}</g>
  ${nt?[...Array(26)].map((_,i)=>`<rect class="fx" style="animation-delay:-${(i%7)*.4}s" x="${340+(i*47)%236}" y="${118+(i*29)%52}" width="3" height="3" fill="#ffd98a"/>`).join(''):''}
  <rect x="330" y="34" width="250" height="150" fill="none" stroke="${nt?'#3a3550':'#b8a690'}" stroke-width="8"/><rect x="451" y="34" width="8" height="150" fill="${nt?'#3a3550':'#b8a690'}"/>
  <rect x="0" y="200" width="640" height="60" fill="${nt?'#16131e':'#c9b59c'}"/>
  <rect x="40" y="150" width="210" height="10" fill="${nt?'#4a3f36':'#8a6a4a'}"/><rect x="50" y="160" width="8" height="60" fill="${nt?'#3a3028':'#6e5238'}"/><rect x="232" y="160" width="8" height="60" fill="${nt?'#3a3028':'#6e5238'}"/>
  <rect x="96" y="112" width="74" height="38" rx="3" fill="#20222c"/><rect x="100" y="116" width="66" height="30" fill="${nt?'#8ab4f0':'#cfe0f4'}"/>
  ${nt?`<circle cx="133" cy="131" r="70" fill="url(#${p}m)"/>`:''}
  <g fill="#30425e" opacity=".8"><rect x="104" y="121" width="44" height="3"/><rect x="104" y="127" width="54" height="2"/><rect x="104" y="132" width="40" height="2"/><rect x="104" y="137" width="50" height="2"/></g>
  <rect x="88" y="150" width="90" height="3" fill="#20222c"/>
  ${nt?`<circle cx="214" cy="118" r="80" fill="url(#${p}l)"/>`:''}<path d="M206 150v-30l-8-10h18l-8 10" fill="none" stroke="#c9b08a" stroke-width="3"/><path d="M196 110h20l-4-12h-12z" fill="#e8d4a8"/>
  <rect x="270" y="190" width="300" height="34" rx="4" fill="${nt?'#2f2c40':'#e8e0d0'}"/><rect x="270" y="180" width="70" height="20" rx="8" fill="${nt?'#3d3954':'#f6f0e4'}"/>
  ${o.bag?`<g><rect x="380" y="150" width="54" height="64" rx="10" fill="#7a4a2c"/><rect x="386" y="160" width="42" height="20" rx="4" fill="#8e5a36"/><rect x="392" y="140" width="30" height="14" rx="6" fill="none" stroke="#5a3420" stroke-width="4"/></g>`:''}
  ${o.box?`<g><rect x="470" y="168" width="60" height="38" fill="#c9a26a"/><rect x="470" y="168" width="60" height="8" fill="#b08a54"/><rect x="496" y="168" width="8" height="38" fill="#e8d8b8"/></g>`:''}`);},
 dinner(){const p='d'+gid++;
  return svg(lg(p+'w',['#4a3428','#2a1e1a'])+rg(p+'l','#ffcf88',.7)+lg(p+'s',SKY.dusk),
  `<rect width="640" height="260" fill="url(#${p}w)"/>
  <rect x="460" y="40" width="140" height="110" fill="url(#${p}s)"/><rect x="460" y="40" width="140" height="110" fill="none" stroke="#5a4236" stroke-width="6"/><rect x="527" y="40" width="6" height="110" fill="#5a4236"/>
  <circle cx="320" cy="70" r="200" fill="url(#${p}l)"/>
  <line x1="320" y1="0" x2="320" y2="52" stroke="#2a1e1a" stroke-width="2"/><path d="M296 70h48l-10-18h-28z" fill="#e8b860"/>
  <ellipse cx="320" cy="200" rx="200" ry="34" fill="#6a4630"/><ellipse cx="320" cy="194" rx="200" ry="30" fill="#8a5e3e"/>
  ${[[250,188],[320,182],[390,188]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="26" ry="9" fill="#f2ebe0"/><ellipse cx="${x}" cy="${y-2}" rx="18" ry="5" fill="#c86a3a"/>`).join('')}
  <g transform="translate(168 150) scale(2.4)"><rect x="-8" y="-4" width="16" height="22" rx="6" fill="#4a5a7a"/><circle cx="0" cy="-12" r="7" fill="#d8b090"/><path d="M-7 -13a7 7 0 0 1 14 0z" fill="#2a2228"/></g>
  <g transform="translate(472 150) scale(2.4)"><rect x="-8" y="-4" width="16" height="22" rx="6" fill="#8a4a5a"/><circle cx="0" cy="-12" r="7" fill="#d8b090"/><path d="M-7.5 -12a7.5 8 0 0 1 15 0v6h-3v-5h-9v5h-3z" fill="#3a2a2a"/></g>`);},
 airport(o){const t=o.tod||'day',p='a'+gid++;
  return svg(lg(p+'s',SKY[t])+lg(p+'g',['#cfd8e0','#9aa8b4'])+lg(p+'f',['#e8eef4','#b8c8d6']),
  `<rect width="640" height="260" fill="url(#${p}s)"/>${t==='night'?stars(40,3,110):''}
  <path d="M470 60l60-14 4 4-50 18z" fill="#f4f6fa"/><path d="M500 52l12-14h6l-6 16z" fill="#c8d2de"/>
  <path d="M0 130 Q320 70 640 130 V210 H0z" fill="url(#${p}f)"/>
  <g stroke="#9fb0c0" stroke-width="1.5" opacity=".7">${[...Array(15)].map((_,i)=>`<line x1="${20+i*43}" y1="${118-Math.sin((i/14)*Math.PI)*42}" x2="${20+i*43}" y2="210"/>`).join('')}<line x1="0" y1="170" x2="640" y2="170"/></g>
  <rect x="0" y="206" width="640" height="54" fill="url(#${p}g)"/>
  <rect x="250" y="150" width="140" height="30" fill="#1d2230"/><g fill="#f0c060" font-family="DotGothic16,monospace" font-size="9"><text x="258" y="162">BKK 10:05 ON TIME</text><text x="258" y="175">DMK 19:40 BOARDING</text></g>
  ${person(140,220,'#c86a4a',1.4,'#6a4a3a')}${person(186,224,'#4a6a9a',1.4)}${person(452,222,'#5a8a6a',1.4,'#8a5a3a')}${person(520,226,'#9a5a8a',1.4)}`);},
 plane(o){const t=o.tod||'day',p='p'+gid++;
  return svg(lg(p+'s',SKY[t])+lg(p+'c',['#3c3f4c','#262833'])+`<clipPath id="${p}k"><rect x="200" y="30" width="240" height="200" rx="80"/></clipPath><filter id="${p}b"><feGaussianBlur stdDeviation="6"/></filter>`,
  `<rect width="640" height="260" fill="url(#${p}c)"/>
  <g clip-path="url(#${p}k)"><rect x="200" y="30" width="240" height="200" fill="url(#${p}s)"/>${t==='night'?stars(30,11,200).replace(/cx="([\d.]+)"/g,(m,a)=>`cx="${200+(+a%240)}"`):''}
   <g filter="url(#${p}b)" fill="${t==='night'?'#3a3f6a':'#ffffff'}" opacity=".9"><ellipse cx="260" cy="200" rx="90" ry="26"/><ellipse cx="380" cy="190" rx="110" ry="30"/><ellipse cx="330" cy="220" rx="140" ry="24"/></g>
   <path d="M230 170 L440 120 L440 140 L250 182z" fill="${t==='night'?'#5a5f78':'#dfe4ea'}"/><path d="M420 124 l18 -26 h8 l-8 30z" fill="${t==='night'?'#4a4f68':'#c8cfd8'}"/>
  </g><rect x="200" y="30" width="240" height="200" rx="80" fill="none" stroke="#4a4d5c" stroke-width="14"/>`);},
 train(o){const t=o.tod||'day',p='t'+gid++;
  return svg(lg(p+'s',SKY[t])+lg(p+'m1',['#6f9a7a','#4f7a5e'])+lg(p+'m2',['#4a7258','#2f5240'])+`<filter id="${p}b"><feGaussianBlur stdDeviation="4"/></filter>`,
  `<rect width="640" height="260" fill="url(#${p}s)"/>
  <path d="M0 150 Q40 60 80 140 Q120 40 170 140 Q210 70 250 140 Q300 30 350 140 Q400 80 440 140 Q490 50 540 140 Q590 90 640 140 V260 H0z" fill="url(#${p}m1)" opacity=".75"/>
  <ellipse cx="320" cy="150" rx="360" ry="16" fill="#ffffff" opacity=".35" filter="url(#${p}b)"/>
  <path d="M0 190 Q60 120 120 185 Q180 110 240 185 Q330 130 420 185 Q500 120 580 185 Q610 160 640 180 V260 H0z" fill="url(#${p}m2)"/>
  <g fill="#9cc46a" opacity=".85">${[0,1,2,3,4,5].map(i=>`<path d="M${i*110} 222 l100 -6 l10 10 l-100 6z"/>`).join('')}</g>
  <rect x="0" y="0" width="640" height="18" fill="#2a2d38"/><rect x="0" y="232" width="640" height="28" fill="#2a2d38"/><rect x="0" y="0" width="18" height="260" fill="#2a2d38"/><rect x="622" y="0" width="18" height="260" fill="#2a2d38"/><rect x="314" y="0" width="12" height="260" fill="#2a2d38"/>`);},
 border(o){const t=o.tod||'day',p='b'+gid++;
  return svg(lg(p+'s',SKY[t])+lg(p+'m',['#7aa088','#5a8068']),
  `<rect width="640" height="260" fill="url(#${p}s)"/>
  <path d="M0 160 Q100 90 200 150 Q300 80 420 150 Q520 100 640 150 V260 H0z" fill="url(#${p}m)" opacity=".8"/>
  <rect x="190" y="130" width="260" height="80" fill="#efe6d6"/><path d="M170 132 L320 70 L470 132z" fill="#b8443a"/><path d="M220 100 L320 50 L420 100z" fill="#c8543a"/><path d="M300 56 L320 30 L340 56z" fill="#d8b46a"/>
  <g fill="#5a6a7a">${[0,1,2,3,4].map(i=>`<rect x="${206+i*48}" y="150" width="34" height="40"/>`).join('')}</g>
  <rect x="0" y="208" width="640" height="52" fill="#9a9488"/><rect x="80" y="196" width="160" height="6" fill="#e05a5a"/><rect x="80" y="196" width="20" height="6" fill="#fff"/><rect x="120" y="196" width="20" height="6" fill="#fff"/><rect x="160" y="196" width="20" height="6" fill="#fff"/><rect x="200" y="196" width="20" height="6" fill="#fff"/>
  ${person(300,220,'#c86a4a',1.3,'#6a4a3a')}${person(330,222,'#4a6a9a',1.3)}${person(520,222,'#3a5a3a',1.4)}`);},
 imm(){const p='i'+gid++;
  return svg(lg(p+'w',['#dfe6ec','#b8c4ce'])+lg(p+'f',['#a8b4be','#8a96a2']),
  `<rect width="640" height="260" fill="url(#${p}w)"/>
  <rect x="160" y="26" width="320" height="34" rx="4" fill="#1d3a6a"/><text x="320" y="42" text-anchor="middle" fill="#fff" font-family="Noto Sans Thai,sans-serif" font-size="12">ตรวจคนเข้าเมือง</text><text x="320" y="55" text-anchor="middle" fill="#cfe0f8" font-family="DotGothic16,monospace" font-size="11">IMMIGRATION</text>
  <rect x="0" y="190" width="640" height="70" fill="url(#${p}f)"/>
  ${[0,1,2,3,4].map(i=>`<g><rect x="${40+i*120}" y="110" width="84" height="82" fill="#f4f6f8"/><rect x="${40+i*120}" y="104" width="84" height="10" fill="#5a7aa8"/><rect x="${52+i*120}" y="124" width="60" height="30" fill="#c8dcf0" opacity=".7"/><text x="${82+i*120}" y="120" text-anchor="middle" font-size="8" fill="#fff" font-family="DotGothic16,monospace">${i+1}</text></g>`).join('')}
  <g stroke="#c8a040" stroke-width="2">${[0,1,2,3].map(i=>`<line x1="${110+i*120}" y1="214" x2="${160+i*120}" y2="214"/><circle cx="${110+i*120}" cy="214" r="3" fill="#c8a040"/>`).join('')}</g>
  ${person(205,226,'#8e3434',1.5,'#7a4a2c')}${person(240,228,'#4a6a9a',1.5)}${person(268,229,'#9a7a4a',1.5)}${person(470,226,'#5a8a6a',1.5,'#5a4a3a')}`);},
 curb(o){const t=o.tod||'night',p='c'+gid++,nt=t==='night';
  return svg(lg(p+'s',SKY[t])+lg(p+'g',['#3a3a46','#22222c'])+rg(p+'l','#ffd88a',.5),
  `<rect width="640" height="260" fill="url(#${p}s)"/>${nt?stars(40,5,90):''}
  <rect x="0" y="40" width="640" height="18" fill="${nt?'#2a2e40':'#c8d0da'}"/><g fill="${nt?'#3a3f58':'#dfe5ec'}">${[...Array(12)].map((_,i)=>`<rect x="${i*56}" y="58" width="10" height="120"/>`).join('')}</g>
  <rect x="0" y="176" width="640" height="84" fill="url(#${p}g)"/>
  ${[100,330,560].map(x=>`<circle cx="${x}" cy="70" r="60" fill="url(#${p}l)"/>`).join('')}
  <rect x="40" y="96" width="70" height="22" rx="3" fill="#f0c020"/><text x="75" y="112" text-anchor="middle" font-family="DotGothic16,monospace" font-size="13" fill="#222">TAXI</text>
  ${[[150,'#e86aa0'],[300,'#7ac04a'],[450,'#e86aa0']].map(([x,c])=>`<g><rect x="${x}" y="196" width="120" height="28" rx="8" fill="${c}"/><path d="M${x+22} 196 l14 -18 h46 l16 18z" fill="${c}"/><path d="M${x+40} 194 l8 -12 h32 l10 12z" fill="#cfe2f4" opacity=".8"/><circle cx="${x+26}" cy="226" r="9" fill="#151515"/><circle cx="${x+94}" cy="226" r="9" fill="#151515"/><rect x="${x+50}" y="172" width="24" height="7" rx="2" fill="#fff"/></g>`).join('')}
  <g fill="${nt?'#1a2a22':'#4a7a5a'}"><path d="M600 176 v-90"/><rect x="598" y="90" width="5" height="90"/><path d="M600 92 q-30 -4 -44 14 q22 -10 44 -10 q-20 4 -34 24 q20 -18 34 -20 q14 6 28 26 q-6 -20 -28 -30 q24 -2 40 10 q-16 -18 -40 -14z"/></g>
  ${person(80,206,'#8e3434',1.5,'#7a4a2c')}`);},
 ride(o){const t=o.tod||'dusk',p='e'+gid++;
  return svg(lg(p+'s',SKY[t])+lg(p+'b',['#55507a','#3a3658']),
  `<rect width="640" height="260" fill="url(#${p}s)"/>${t==='night'?stars(30,9,100):''}<circle cx="520" cy="140" r="34" fill="#ffd49a" opacity="${t==='dusk'?.85:0}"/>
  <g fill="url(#${p}b)" opacity=".85">${[...Array(16)].map((_,i)=>{const h=40+((i*53)%110);return `<rect x="${i*42}" y="${190-h}" width="${30+(i%3)*8}" height="${h+20}"/>`;}).join('')}</g>
  <g fill="#ffd98a">${[...Array(40)].map((_,i)=>`<rect class="fx" style="animation-delay:-${(i%9)*.3}s" x="${(i*61)%630}" y="${120+(i*37)%70}" width="3" height="3"/>`).join('')}</g>
  <rect x="0" y="192" width="640" height="10" fill="#c8ccd8"/>${[0,1,2,3,4,5,6].map(i=>`<rect x="${20+i*100}" y="202" width="14" height="58" fill="#a8acb8"/>`).join('')}
  <rect x="60" y="164" width="380" height="30" rx="10" fill="#e8ecf2"/><rect x="60" y="182" width="380" height="5" fill="#2a6ac8"/>${[0,1,2,3,4,5,6,7].map(i=>`<rect x="${78+i*44}" y="170" width="30" height="10" rx="2" fill="#2a3448"/>`).join('')}`);},
 khaosan(o){const t=o.tod||'night',p='k'+gid++,nt=t==='night'||t==='dusk',w=o.rain;
  const sign=(x,y,txt,c,wd)=>`<g><rect x="${x}" y="${y}" width="${wd}" height="18" rx="3" fill="${nt?'#1a1626':'#f4ede0'}" stroke="${c}" stroke-width="${nt?2:1.5}"/><text x="${x+wd/2}" y="${y+13}" text-anchor="middle" font-family="DotGothic16,monospace" font-size="11" fill="${c}" ${nt?`filter="url(#${p}gl)"`:''}>${txt}</text></g>`;
  return svg(lg(p+'s',w&&!nt?['#7d8798','#aab3c0','#d2d4d2']:SKY[t])+lg(p+'c',nt?['#f6e8c8','#b8a07a']:['#ffffff','#e6dccb'])+lg(p+'gd',['#f7dc8a','#c8902e'])+lg(p+'r',nt?['#1e1a2a','#0e0c14']:['#9a948c','#7a746c'])+lg(p+'h',nt?['#3a3050','#2a2440']:['#e8d4b8','#d4bc9a'])+rg(p+'gw','#ffcf7a',.35)+`<filter id="${p}gl" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${p}hz"><feGaussianBlur stdDeviation="3"/></filter>`,
  `<rect width="640" height="260" fill="url(#${p}s)"/>${nt?stars(60,21,120):''}
  ${w&&!nt?'':`<circle cx="${nt?110:520}" cy="46" r="${nt?14:20}" fill="${nt?'#f4ecd4':'#fff4d6'}" opacity=".9"/>`}
  <g opacity="${nt?.55:.5}" fill="${nt?'#2c2a50':'#b6c8c2'}" filter="url(#${p}hz)"><ellipse cx="80" cy="150" rx="110" ry="30"/><ellipse cx="560" cy="150" rx="120" ry="34"/></g>
  <g>
   <circle cx="320" cy="120" r="${nt?90:0}" fill="url(#${p}gw)"/>
   <rect x="262" y="140" width="116" height="16" fill="url(#${p}c)"/><rect x="272" y="128" width="96" height="14" fill="url(#${p}c)"/>
   <path d="M282 128 C282 86 358 86 358 128z" fill="url(#${p}c)"/>
   ${[0,1,2,3,4,5].map(i=>`<rect x="${306+i*1.6}" y="${84-i*7}" width="${28-i*3.2}" height="6" rx="2" fill="url(#${p}gd)"/>`).join('')}
   <path d="M314 44 L320 0 L326 44z" fill="url(#${p}gd)"/>
  </g>
  <rect x="0" y="146" width="640" height="76" fill="url(#${p}h)"/>
  <g fill="${nt?'#251f36':'#c9b392'}">${[0,1,2,3,4,5,6,7].map(i=>`<rect x="${i*80}" y="140" width="76" height="8"/>`).join('')}</g>
  <g fill="${nt?'#ffd98a':'#6a7a8c'}" opacity="${nt?.9:.6}">${[...Array(16)].map((_,i)=>`<rect ${nt?`class="fx" style="animation-delay:-${(i%6)*.5}s"`:''} x="${14+i*40}" y="156" width="14" height="12"/>`).join('')}</g>
  <path d="M0 136 Q80 150 160 136 Q240 150 320 136 Q400 150 480 136 Q560 150 640 136" fill="none" stroke="${nt?'#504868':'#8a7a68'}" stroke-width="1"/>
  ${[...Array(32)].map((_,i)=>{const x=i*20+10,y=136+Math.abs(Math.sin((x%160)/160*Math.PI))*12;return `<circle ${nt?`class="fx" style="animation-delay:-${(i%5)*.6}s"`:''} cx="${x}" cy="${y.toFixed(1)}" r="2.4" fill="${['#ffd270','#ff8a7a','#8ad0ff','#a8f08a'][i%4]}" ${nt?`filter="url(#${p}gl)"`:'opacity=".7"'}/>`;}).join('')}
  ${sign(20,176,'HOSTEL','#6ad0c0',64)}${sign(96,176,'PAD THAI','#ffb85a',76)}${sign(452,176,'BAR','#ff6a9a',44)}${sign(506,176,'MASSAGE','#c8a0ff',80)}
  <rect x="230" y="172" width="180" height="50" fill="${nt?'#f2f6f4':'#fbfbf8'}"/><rect x="230" y="172" width="180" height="12" fill="#2a9a8a"/><text x="320" y="182" text-anchor="middle" font-family="DotGothic16,monospace" font-size="10" fill="#fff">24H MART</text>
  <rect x="240" y="188" width="60" height="34" fill="${nt?'#fff3c8':'#d8e8f0'}"/><rect x="306" y="188" width="28" height="34" fill="${nt?'#fff8de':'#c8dce8'}"/><rect x="340" y="188" width="60" height="34" fill="${nt?'#fff3c8':'#d8e8f0'}"/>
  ${nt?`<rect x="230" y="222" width="180" height="30" fill="#fff0c0" opacity=".12"/>`:''}
  <rect x="0" y="222" width="640" height="38" fill="url(#${p}r)"/>
  ${nt?`<g opacity=".25"><rect x="24" y="226" width="60" height="3" fill="#6ad0c0"/><rect x="456" y="226" width="36" height="3" fill="#ff6a9a"/><rect x="250" y="228" width="140" height="4" fill="#fff3c8"/></g>`:''}
  <g><path d="M172 198 h54 l-27 -14z" fill="#d8544a"/><rect x="176" y="202" width="46" height="20" fill="#7a5a3a"/><rect x="197" y="198" width="3" height="6" fill="#555"/>${nt?`<circle cx="199" cy="196" r="16" fill="url(#${p}gw)"/>`:''}</g>
  <g transform="translate(470 214)"><rect x="0" y="0" width="60" height="18" rx="5" fill="#2a8a7a"/><path d="M4 0 l6 -16 h40 l6 16" fill="none" stroke="#1d6a5e" stroke-width="3"/><rect x="2" y="-18" width="56" height="5" rx="2" fill="#1d6a5e"/><circle cx="10" cy="20" r="6" fill="#151515"/><circle cx="52" cy="20" r="6" fill="#151515"/><circle cx="60" cy="8" r="2.5" fill="#ffe08a"/></g>
  ${person(140,224,'#e0905a',1.25,'#4a6a8a')}${person(158,226,'#4a8a6a',1.25)}${person(420,226,'#c8648a',1.25)}${person(588,224,'#e8e4dc',1.25,'#7a4a2c')}
  ${w?rain(31):''}`);},
 dorm(){const p='h'+gid++;
  return svg(lg(p+'w',['#2e2a3c','#201d2a'])+rg(p+'l','#ffcf88',.6),
  `<rect width="640" height="260" fill="url(#${p}w)"/>
  ${[60,270,480].map(x=>`<g><rect x="${x}" y="40" width="10" height="210" fill="#7a5a3a"/><rect x="${x+120}" y="40" width="10" height="210" fill="#7a5a3a"/><rect x="${x}" y="100" width="130" height="14" fill="#8a6a46"/><rect x="${x}" y="200" width="130" height="14" fill="#8a6a46"/><rect x="${x+10}" y="84" width="110" height="16" rx="4" fill="#e8e2d6"/><rect x="${x+10}" y="184" width="110" height="16" rx="4" fill="#e8e2d6"/><path d="M${x+10} 46 q20 30 0 54" fill="#5a3a6a" opacity=".85"/><path d="M${x+10} 146 q24 26 0 54" fill="#5a3a6a" opacity=".85"/><circle cx="${x+100}" cy="70" r="40" fill="url(#${p}l)"/><circle cx="${x+100}" cy="70" r="3" fill="#ffe0a0"/></g>`).join('')}
  <rect x="0" y="236" width="640" height="24" fill="#16131e"/>`);},
 river(o){const t=o.tod||'dusk',p='v'+gid++;
  return svg(lg(p+'s',SKY[t])+lg(p+'w',['#6a5a7a','#2a2440']),
  `<rect width="640" height="260" fill="url(#${p}s)"/><circle cx="460" cy="150" r="30" fill="#ffc890" opacity=".9"/>
  <path d="M0 158 H640" stroke="#3a2c48" stroke-width="6"/><g fill="#3a2c48">${[...Array(20)].map((_,i)=>`<rect x="${i*33}" y="${148-(i*7)%10}" width="18" height="${10+(i*7)%10}"/>`).join('')}</g>
  <rect x="0" y="160" width="640" height="100" fill="url(#${p}w)"/>${[0,1,2,3,4,5].map(i=>`<rect x="${380+i*12}" y="${170+i*14}" width="${80-i*10}" height="2" fill="#ffd0a0" opacity=".6"/>`).join('')}
  <g>${[...Array(10)].map((_,i)=>`<circle class="fx" style="animation-delay:-${i*.3}s" cx="${40+i*28}" cy="196" r="3" fill="#ffd270"/>`).join('')}</g>
  <rect x="0" y="218" width="300" height="42" fill="#2a2030"/>${person(150,226,'#8e3434',1.3,'#7a4a2c')}`);},
 dark(){const p='x'+gid++;return svg(rg(p+'l','#d8c8a0',.35),`<rect width="640" height="260" fill="#08070b"/><circle cx="320" cy="60" r="160" fill="url(#${p}l)"/><line x1="320" y1="0" x2="320" y2="50" stroke="#333" stroke-width="2"/><circle cx="320" cy="56" r="6" fill="#f0e0b0"/><rect x="250" y="190" width="140" height="10" fill="#1a171f"/>`);},
 title(){const p='z'+gid++;return svg(lg(p+'s',SKY.dusk)+lg(p+'g',['#f7dc8a','#c8902e']),
  `<rect width="640" height="260" fill="url(#${p}s)"/>${stars(30,2,80)}
  <g transform="translate(250 50) rotate(-8)"><rect width="140" height="190" rx="10" fill="#7a2a2c"/><rect x="6" y="6" width="128" height="178" rx="7" fill="none" stroke="#c8902e" stroke-opacity=".5"/><circle cx="70" cy="86" r="30" fill="none" stroke="url(#${p}g)" stroke-width="3"/><circle cx="70" cy="86" r="18" fill="none" stroke="url(#${p}g)" stroke-width="2"/><rect x="40" y="134" width="60" height="5" rx="2" fill="url(#${p}g)"/><rect x="48" y="146" width="44" height="4" rx="2" fill="url(#${p}g)" opacity=".7"/></g>
  <path d="M0 220 Q160 200 320 214 T640 206 V260H0z" fill="#2a2440"/>${person(120,228,'#e8e4dc',1.4,'#7a4a2c')}`);}
};
export const SCENES = Object.keys(PAINT);
export function paint(key, o = {}) { return (PAINT[key] || PAINT.dark)(o); }
