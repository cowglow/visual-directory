import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as m}from"./index-D4lIrffr.js";import{u as C,a as p,g as _,b as q}from"./auth.selectors-CpYfVHzn.js";import{v as G,r as h}from"./auth.slice-DWOf4T91.js";import{L as O}from"./LoginForm-BMzWYwxE.js";import{u as F}from"./i18n.hook-CJ9GCP3E.js";import"./redux-toolkit.modern-Ca_JRSPk.js";import"./language-DDMpVKAi.js";import"./Panel-u1hN-JgS.js";import"./PrivacyNotice-BStJyTwV.js";import"./member.selectors-DmgxrCnt.js";import"./organization.selectors-Deq9XIu6.js";import"./i18n.context-Cj7E5RG-.js";function R({children:E}){const s=C(),{t:c}=F(),t=p(_),U=p(q),i=m.useRef(!1);return m.useEffect(()=>{if(i.current)return;i.current=!0;const u=new URLSearchParams(window.location.search),l=u.get("token");if(l){u.delete("token");const d=u.toString();window.history.replaceState({},"",window.location.pathname+(d?`?${d}`:"")),s(G({token:l}))}else s(h())},[]),t==="idle"||t==="loading"?e.jsx("p",{children:c.auth.loading}):t==="offline"?e.jsxs("div",{style:{maxWidth:"320px",margin:"10vh auto",padding:"0 20px",textAlign:"center"},children:[e.jsx("h2",{children:c.auth.cantConnect}),e.jsx("p",{style:{color:"var(--text-muted)"},children:U}),e.jsx("button",{type:"button",className:"btn btn-default",onClick:()=>s(h()),children:c.common.retry})]}):t!=="authenticated"?e.jsx(O,{}):e.jsx(e.Fragment,{children:E})}R.__docgenInfo={description:"",methods:[],displayName:"AuthGate"};const Q={title:"ports/auth/AuthGate",component:R,args:{children:e.jsx("div",{style:{padding:"1rem"},children:"Protected app content"})}},r={parameters:{reduxState:{auth:{status:"loading",account:null,error:null}}}},a={parameters:{reduxState:{auth:{status:"unauthenticated",account:null,error:null}}}},n={parameters:{reduxState:{auth:{status:"offline",account:null,error:"Unable to reach the server. Check your connection and try again."}}}},o={parameters:{reduxState:{auth:{status:"authenticated",account:{id:"account-1",email:"leader@example.com",role:"leader"},error:null}}}};var f,x,g;r.parameters={...r.parameters,docs:{...(f=r.parameters)==null?void 0:f.docs,source:{originalSource:`{
  parameters: {
    reduxState: {
      auth: {
        status: "loading",
        account: null,
        error: null
      }
    }
  }
}`,...(g=(x=r.parameters)==null?void 0:x.docs)==null?void 0:g.source}}};var S,y,j;a.parameters={...a.parameters,docs:{...(S=a.parameters)==null?void 0:S.docs,source:{originalSource:`{
  parameters: {
    reduxState: {
      auth: {
        status: "unauthenticated",
        account: null,
        error: null
      }
    }
  }
}`,...(j=(y=a.parameters)==null?void 0:y.docs)==null?void 0:j.source}}};var v,A,b;n.parameters={...n.parameters,docs:{...(v=n.parameters)==null?void 0:v.docs,source:{originalSource:`{
  parameters: {
    reduxState: {
      auth: {
        status: "offline",
        account: null,
        error: "Unable to reach the server. Check your connection and try again."
      }
    }
  }
}`,...(b=(A=n.parameters)==null?void 0:A.docs)==null?void 0:b.source}}};var k,w,L;o.parameters={...o.parameters,docs:{...(k=o.parameters)==null?void 0:k.docs,source:{originalSource:`{
  parameters: {
    reduxState: {
      auth: {
        status: "authenticated",
        account: {
          id: "account-1",
          email: "leader@example.com",
          role: "leader"
        },
        error: null
      }
    }
  }
}`,...(L=(w=o.parameters)==null?void 0:w.docs)==null?void 0:L.source}}};const V=["Loading","Unauthenticated","Offline","Authenticated"];export{o as Authenticated,r as Loading,n as Offline,a as Unauthenticated,V as __namedExportsOrder,Q as default};
