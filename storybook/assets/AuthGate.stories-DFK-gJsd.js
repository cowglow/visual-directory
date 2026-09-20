import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as m}from"./index-D4lIrffr.js";import{u as C,a as p,b as _,c as q}from"./auth.selectors-CDuantmH.js";import{v as G,r as h}from"./auth.slice-Crp1ho0G.js";import{L as N}from"./LoginForm-CIRI3y-I.js";import{u as O}from"./i18n.hook-BQeB9DON.js";import"./react-redux-Dn6r42s_.js";import"./language-DDMpVKAi.js";import"./DialogWindow-ClYdqpo5.js";import"./PrivacyNotice-DsjIIEt9.js";import"./member.selectors-BEYMWI49.js";import"./organization.selectors-Deq9XIu6.js";import"./i18n.context-0e8a2VTa.js";function R({children:E}){const s=C(),{t:c}=O(),t=p(_),U=p(q),i=m.useRef(!1);return m.useEffect(()=>{if(i.current)return;i.current=!0;const u=new URLSearchParams(window.location.search),d=u.get("token");if(d){u.delete("token");const l=u.toString();window.history.replaceState({},"",window.location.pathname+(l?`?${l}`:"")),s(G({token:d}))}else s(h())},[]),t==="idle"||t==="loading"?e.jsx("p",{children:c.auth.loading}):t==="offline"?e.jsxs("div",{className:"standard-dialog",style:{maxWidth:"320px",margin:"10vh auto"},children:[e.jsx("h2",{children:c.auth.cantConnect}),e.jsx("p",{children:U}),e.jsx("button",{type:"button",className:"btn",onClick:()=>s(h()),children:c.common.retry})]}):t!=="authenticated"?e.jsx(N,{}):e.jsx(e.Fragment,{children:E})}R.__docgenInfo={description:"",methods:[],displayName:"AuthGate"};const Q={title:"ports/auth/AuthGate",component:R,args:{children:e.jsx("div",{style:{padding:"1rem"},children:"Protected app content"})}},r={parameters:{reduxState:{auth:{status:"loading",account:null,error:null}}}},a={parameters:{reduxState:{auth:{status:"unauthenticated",account:null,error:null}}}},n={parameters:{reduxState:{auth:{status:"offline",account:null,error:"Unable to reach the server. Check your connection and try again."}}}},o={parameters:{reduxState:{auth:{status:"authenticated",account:{id:"account-1",email:"leader@example.com",role:"leader"},error:null}}}};var f,x,g;r.parameters={...r.parameters,docs:{...(f=r.parameters)==null?void 0:f.docs,source:{originalSource:`{
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
}`,...(j=(y=a.parameters)==null?void 0:y.docs)==null?void 0:j.source}}};var k,v,w;n.parameters={...n.parameters,docs:{...(k=n.parameters)==null?void 0:k.docs,source:{originalSource:`{
  parameters: {
    reduxState: {
      auth: {
        status: "offline",
        account: null,
        error: "Unable to reach the server. Check your connection and try again."
      }
    }
  }
}`,...(w=(v=n.parameters)==null?void 0:v.docs)==null?void 0:w.source}}};var A,b,L;o.parameters={...o.parameters,docs:{...(A=o.parameters)==null?void 0:A.docs,source:{originalSource:`{
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
}`,...(L=(b=o.parameters)==null?void 0:b.docs)==null?void 0:L.source}}};const V=["Loading","Unauthenticated","Offline","Authenticated"];export{o as Authenticated,r as Loading,n as Offline,a as Unauthenticated,V as __namedExportsOrder,Q as default};
