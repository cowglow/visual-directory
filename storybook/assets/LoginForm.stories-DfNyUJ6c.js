import{w as l,u as o,e as u}from"./index-Ch1O_M5-.js";import{L as d}from"./LoginForm-DvdBzIip.js";import"./jsx-runtime-D_zvdyIk.js";import"./index-D4lIrffr.js";import"./auth.selectors-CDuantmH.js";import"./react-redux-Dn6r42s_.js";import"./auth.slice-Crp1ho0G.js";import"./i18n.hook-BQeB9DON.js";import"./i18n.context-0e8a2VTa.js";import"./language-DDMpVKAi.js";import"./DialogWindow-CpJxsrHx.js";import"./PrivacyNotice-DsjIIEt9.js";import"./member.selectors-BEYMWI49.js";import"./organization.selectors-Deq9XIu6.js";const F={title:"ports/auth/LoginForm",component:d},e={},t={play:async({canvasElement:p})=>{const a=l(p);await o.type(a.getByLabelText("Email"),"member@example.com"),await o.click(a.getByRole("button",{name:"Send login link"})),await u(await a.findByRole("alert")).toBeInTheDocument()}};var n,r,i;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:"{}",...(i=(r=e.parameters)==null?void 0:r.docs)==null?void 0:i.source}}};var m,s,c;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Email"), "member@example.com");
    await userEvent.click(canvas.getByRole("button", {
      name: "Send login link"
    }));
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
  }
}`,...(c=(s=t.parameters)==null?void 0:s.docs)==null?void 0:c.source}}};const S=["Default","RequestFailed"];export{e as Default,t as RequestFailed,S as __namedExportsOrder,F as default};
