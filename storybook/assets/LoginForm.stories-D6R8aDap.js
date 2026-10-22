import{w as l,u as o,e as u}from"./index-Ch1O_M5-.js";import{L as d}from"./LoginForm-BMzWYwxE.js";import"./jsx-runtime-D_zvdyIk.js";import"./index-D4lIrffr.js";import"./auth.selectors-CpYfVHzn.js";import"./redux-toolkit.modern-Ca_JRSPk.js";import"./auth.slice-DWOf4T91.js";import"./i18n.hook-CJ9GCP3E.js";import"./i18n.context-Cj7E5RG-.js";import"./language-DDMpVKAi.js";import"./Panel-u1hN-JgS.js";import"./PrivacyNotice-BStJyTwV.js";import"./member.selectors-DmgxrCnt.js";import"./organization.selectors-Deq9XIu6.js";const F={title:"ports/auth/LoginForm",component:d},e={},t={play:async({canvasElement:p})=>{const a=l(p);await o.type(a.getByLabelText("Email"),"member@example.com"),await o.click(a.getByRole("button",{name:"Send login link"})),await u(await a.findByRole("alert")).toBeInTheDocument()}};var n,r,i;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:"{}",...(i=(r=e.parameters)==null?void 0:r.docs)==null?void 0:i.source}}};var m,s,c;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
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
