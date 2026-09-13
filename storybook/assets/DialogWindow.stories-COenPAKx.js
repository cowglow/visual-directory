import{j as p}from"./jsx-runtime-D_zvdyIk.js";import{w as d,u,e as g,f as C}from"./index-Ch1O_M5-.js";import{D as v}from"./DialogWindow-FuLhGxvs.js";import"./i18n.hook-CuqIiMBs.js";import"./index-D4lIrffr.js";import"./i18n.context-CTpcRd1d.js";const h={title:"ports/dialogs/DialogWindow",component:v,args:{title:"Add Member",onClose:C(),children:p.jsx("p",{children:"Dialog content goes here."})}},e={},a={play:async({canvasElement:l,args:i})=>{const m=d(l);await u.click(m.getByRole("button",{name:"Close"})),await g(i.onClose).toHaveBeenCalled()}};var o,s,t;e.parameters={...e.parameters,docs:{...(o=e.parameters)==null?void 0:o.docs,source:{originalSource:"{}",...(t=(s=e.parameters)==null?void 0:s.docs)==null?void 0:t.source}}};var n,r,c;a.parameters={...a.parameters,docs:{...(n=a.parameters)==null?void 0:n.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Close"
    }));
    await expect(args.onClose).toHaveBeenCalled();
  }
}`,...(c=(r=a.parameters)==null?void 0:r.docs)==null?void 0:c.source}}};const k=["Default","CloseClicked"];export{a as CloseClicked,e as Default,k as __namedExportsOrder,h as default};
