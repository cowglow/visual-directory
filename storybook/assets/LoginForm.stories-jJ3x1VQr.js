import{w as l,u as o,e as u}from"./index-Ch1O_M5-.js";import{L as d}from"./LoginForm-BMRNcCrn.js";import"./jsx-runtime-D_zvdyIk.js";import"./index-D4lIrffr.js";import"./auth.selectors-BAS4YwMG.js";import"./react-redux-Dn6r42s_.js";import"./auth.slice-Crp1ho0G.js";import"./i18n.hook-BsmFtX61.js";import"./i18n.context--q7l9OH1.js";import"./language-DDMpVKAi.js";import"./DialogWindow-D4vo4ZsG.js";import"./PrivacyNotice-CvbatEyP.js";const k={title:"ports/auth/LoginForm",component:d},e={},a={play:async({canvasElement:p})=>{const t=l(p);await o.type(t.getByLabelText("Email"),"member@example.com"),await o.click(t.getByRole("button",{name:"Send login link"})),await u(await t.findByRole("alert")).toBeInTheDocument()}};var n,r,s;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:"{}",...(s=(r=e.parameters)==null?void 0:r.docs)==null?void 0:s.source}}};var i,m,c;a.parameters={...a.parameters,docs:{...(i=a.parameters)==null?void 0:i.docs,source:{originalSource:`{
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
}`,...(c=(m=a.parameters)==null?void 0:m.docs)==null?void 0:c.source}}};const D=["Default","RequestFailed"];export{e as Default,a as RequestFailed,D as __namedExportsOrder,k as default};
