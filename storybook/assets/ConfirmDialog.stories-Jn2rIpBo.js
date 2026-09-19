import{j as i}from"./jsx-runtime-D_zvdyIk.js";import{w as y,u as x,e as E,f as c}from"./index-Ch1O_M5-.js";import{C as k}from"./ConfirmDialog-DVh3Osl2.js";import{D as B}from"./DialogWindow-CpJxsrHx.js";import"./i18n.hook-BQeB9DON.js";import"./index-D4lIrffr.js";import"./i18n.context-0e8a2VTa.js";/* empty css              */const M={title:"ports/dialogs/ConfirmDialog",component:k,decorators:[e=>i.jsx(B,{title:"Confirmation Dialog",onClose:c(),children:i.jsx(e,{})})],args:{message:"Remove Anna Keller? This cannot be undone.",onConfirm:c(),onCancel:c()}},a={},n={args:{message:"Delete the District organization? Members assigned to it will become unassigned.",confirmLabel:"Delete",cancelLabel:"Keep it"}},s={play:async({canvasElement:e,args:o})=>{const r=y(e);await x.click(r.getByRole("button",{name:"Delete"})),await E(o.onConfirm).toHaveBeenCalled()}},t={play:async({canvasElement:e,args:o})=>{const r=y(e);await x.click(r.getByRole("button",{name:"Cancel"})),await E(o.onCancel).toHaveBeenCalled()}};var l,m,p;a.parameters={...a.parameters,docs:{...(l=a.parameters)==null?void 0:l.docs,source:{originalSource:"{}",...(p=(m=a.parameters)==null?void 0:m.docs)==null?void 0:p.source}}};var d,g,u;n.parameters={...n.parameters,docs:{...(d=n.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    message: "Delete the District organization? Members assigned to it will become unassigned.",
    confirmLabel: "Delete",
    cancelLabel: "Keep it"
  }
}`,...(u=(g=n.parameters)==null?void 0:g.docs)==null?void 0:u.source}}};var C,f,v;s.parameters={...s.parameters,docs:{...(C=s.parameters)==null?void 0:C.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Delete"
    }));
    await expect(args.onConfirm).toHaveBeenCalled();
  }
}`,...(v=(f=s.parameters)==null?void 0:f.docs)==null?void 0:v.source}}};var b,w,D;t.parameters={...t.parameters,docs:{...(b=t.parameters)==null?void 0:b.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Cancel"
    }));
    await expect(args.onCancel).toHaveBeenCalled();
  }
}`,...(D=(w=t.parameters)==null?void 0:w.docs)==null?void 0:D.source}}};const _=["Default","CustomLabels","ConfirmClicked","CancelClicked"];export{t as CancelClicked,s as ConfirmClicked,n as CustomLabels,a as Default,_ as __namedExportsOrder,M as default};
