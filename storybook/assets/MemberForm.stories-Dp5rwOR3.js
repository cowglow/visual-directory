import{w as R,u as w}from"./index-Ch1O_M5-.js";import{M as L}from"./MemberForm-B1OHm2Si.js";import{s as C,a as s}from"./story-fixtures-CINZKkVm.js";import"./jsx-runtime-D_zvdyIk.js";import"./index-D4lIrffr.js";import"./auth.selectors-BAS4YwMG.js";import"./react-redux-Dn6r42s_.js";import"./windows.slice-RbXkW6ya.js";import"./i18n.hook-BsmFtX61.js";import"./i18n.context--q7l9OH1.js";import"./member.selectors-BQeLpn_d.js";import"./organization.selectors-Deq9XIu6.js";import"./member.slice-Dt6gKY0s.js";import"./request-id-CAY4q5cO.js";import"./member.factory-B4hz_Xkg.js";import"./DialogWindow-D4vo4ZsG.js";import"./ConfirmDialog-Dj3Rk_57.js";/* empty css              */const h={member:{items:s,filteredLimit:s.length,loading:!1,error:null},organization:{items:C,loading:!1,error:null}},T={title:"ports/forms/MemberForm",component:L,parameters:{reduxState:h}},e={args:{payload:null}},r={args:{payload:{coordinates:{lat:49.4521,lng:11.0767}}}},a={args:{payload:{memberId:"member-1"}}},o={args:{payload:{memberId:"member-2"}}},t={args:{payload:{memberId:"member-1"}},play:async({canvasElement:S})=>{const I=R(S);await w.click(I.getByRole("button",{name:"Remove"}))}};var n,m,c;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    payload: null
  }
}`,...(c=(m=e.parameters)==null?void 0:m.docs)==null?void 0:c.source}}};var i,p,d;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    payload: {
      coordinates: {
        lat: 49.4521,
        lng: 11.0767
      }
    }
  }
}`,...(d=(p=r.parameters)==null?void 0:p.docs)==null?void 0:d.source}}};var l,u,g;a.parameters={...a.parameters,docs:{...(l=a.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    payload: {
      memberId: "member-1"
    }
  }
}`,...(g=(u=a.parameters)==null?void 0:u.docs)==null?void 0:g.source}}};var b,y,v;o.parameters={...o.parameters,docs:{...(b=o.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    payload: {
      memberId: "member-2"
    }
  }
}`,...(v=(y=o.parameters)==null?void 0:y.docs)==null?void 0:v.source}}};var f,M,E;t.parameters={...t.parameters,docs:{...(f=t.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    payload: {
      memberId: "member-1"
    }
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Remove"
    }));
  }
}`,...(E=(M=t.parameters)==null?void 0:M.docs)==null?void 0:E.source}}};const U=["NoLocationSelected","AddMode","EditMode","EditModeLostContact","ConfirmRemove"];export{r as AddMode,t as ConfirmRemove,a as EditMode,o as EditModeLostContact,e as NoLocationSelected,U as __namedExportsOrder,T as default};
