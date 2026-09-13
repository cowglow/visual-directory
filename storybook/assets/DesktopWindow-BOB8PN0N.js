import{j as n}from"./jsx-runtime-D_zvdyIk.js";import{r as o}from"./index-D4lIrffr.js";import{d as h}from"./styled-components.browser.esm-Ca49Gx22.js";import{u as Y}from"./i18n.hook-CuqIiMBs.js";const p=8,c=40,M=240,S=160,B=100,V=h("div")`
  position: absolute;
  margin: 0;
  display: flex;
  flex-direction: column;
`,$=h("div")`
  touch-action: none;
`,A=h("div")`
  min-height: 0;
`,F=h("div")`
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  touch-action: none;
  background: linear-gradient(
    135deg,
    transparent 0,
    transparent 38%,
    #000 38%,
    #000 46%,
    transparent 46%,
    transparent 60%,
    #000 60%,
    #000 68%,
    transparent 68%,
    transparent 82%,
    #000 82%,
    #000 90%,
    transparent 90%
  );
`;function U({x:m,y:g},d){const f=Math.max(0,window.innerWidth-d.width),u=Math.max(c,window.innerHeight-d.height);return{x:Math.min(Math.max(m,0),f),y:Math.min(Math.max(g,c),u)}}function O({title:m,onClose:g,initialPosition:d={x:24,y:24},width:f="min(900px, 90vw)",height:u="min(640px, 80vh)",padded:z=!1,z:y=B,onFocus:v,children:D}){const{t:P}=Y(),[r,b]=o.useState(d),[a,C]=o.useState(!1),[s,R]=o.useState(null),x=o.useRef(null),l=o.useRef(null),T=o.useRef({width:0,height:0}),w=o.useRef(null),I=e=>{var i;if(a||e.target instanceof HTMLButtonElement)return;const t=(i=x.current)==null?void 0:i.getBoundingClientRect();T.current=t?{width:t.width,height:t.height}:{width:0,height:0},l.current={x:e.clientX-r.x,y:e.clientY-r.y},e.currentTarget.setPointerCapture(e.pointerId)},N=e=>{l.current&&b(U({x:e.clientX-l.current.x,y:e.clientY-l.current.y},T.current))},E=e=>{l.current=null,e.currentTarget.releasePointerCapture(e.pointerId)},j=e=>{var i;e.stopPropagation();const t=(i=x.current)==null?void 0:i.getBoundingClientRect();w.current={pointerX:e.clientX,pointerY:e.clientY,size:t?{width:t.width,height:t.height}:{width:M,height:S}},e.currentTarget.setPointerCapture(e.pointerId)},H=e=>{const t=w.current;if(!t)return;const i=window.innerWidth-r.x,_=window.innerHeight-r.y;R({width:Math.min(i,Math.max(M,t.size.width+(e.clientX-t.pointerX))),height:Math.min(_,Math.max(S,t.size.height+(e.clientY-t.pointerY)))})},k=e=>{w.current=null,e.currentTarget.releasePointerCapture(e.pointerId)},q=u==="auto"&&!s,W=a?{zIndex:y,top:c,left:p,width:`calc(100vw - ${p*2}px)`,height:`calc(100vh - ${c+p}px)`}:{zIndex:y,top:r.y,left:r.x,width:s?`${s.width}px`:f,...q?{maxHeight:`calc(100vh - ${c+p*2}px)`}:{height:s?`${s.height}px`:u}},X=z?{flex:"0 1 auto",overflow:"auto",padding:"1rem"}:{flex:1,display:"flex",overflow:"hidden"};return n.jsxs(V,{ref:x,className:"window",style:W,onPointerDownCapture:v,children:[n.jsxs($,{className:"title-bar",style:{cursor:a?"default":"grab"},onPointerDown:I,onPointerMove:N,onPointerUp:E,children:[n.jsx("button",{"aria-label":P.common.close,className:"close",onClick:g}),n.jsx("h1",{className:"title",children:m}),n.jsx("button",{"aria-label":P.common.resize,"aria-pressed":a,className:"resize",onClick:()=>C(e=>!e)})]}),n.jsx("div",{className:"separator"}),n.jsx(A,{style:X,children:D}),!a&&n.jsx(F,{onPointerDown:j,onPointerMove:H,onPointerUp:k})]})}O.__docgenInfo={description:"",methods:[],displayName:"DesktopWindow",props:{title:{required:!0,tsType:{name:"string"},description:""},onClose:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},initialPosition:{required:!1,tsType:{name:"WindowPosition"},description:"",defaultValue:{value:"{ x: 24, y: 24 }",computed:!1}},width:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:'"min(900px, 90vw)"',computed:!1}},height:{required:!1,tsType:{name:"string"},description:'A CSS length, or "auto" to size to the content (capped to the desktop).',defaultValue:{value:'"min(640px, 80vh)"',computed:!1}},padded:{required:!1,tsType:{name:"boolean"},description:"Pad the content area and let it scroll — for forms and text, not the map.",defaultValue:{value:"false",computed:!1}},z:{required:!1,tsType:{name:"number"},description:"Stacking order among the floating windows; defaults to the base layer.",defaultValue:{value:"100",computed:!1}},onFocus:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Called on any pointer-down inside the window — cycle it to the front."}}};export{O as D};
