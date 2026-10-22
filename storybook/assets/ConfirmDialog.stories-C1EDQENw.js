import{w as y,u as D,e as k,f as c}from"./index-Ch1O_M5-.js";import{C as B}from"./ConfirmDialog-D0f3zzfH.js";import"./jsx-runtime-D_zvdyIk.js";import"./i18n.hook-BlClNCeC.js";import"./index-D4lIrffr.js";import"./i18n.context-LpD-Y7pc.js";const H={title:"ports/dialogs/ConfirmDialog",component:B,args:{title:"Remove Member?",message:"Remove Anna Keller? This cannot be undone.",onConfirm:c(),onCancel:c()}},e={},a={args:{title:"Remove Organization?",message:"Delete the District organization? Members assigned to it will become unassigned.",confirmLabel:"Delete",cancelLabel:"Keep it"}},n={play:async({canvasElement:s,args:o})=>{const r=y(s);await D.click(r.getByRole("button",{name:"Delete"})),await k(o.onConfirm).toHaveBeenCalled()}},t={play:async({canvasElement:s,args:o})=>{const r=y(s);await D.click(r.getByRole("button",{name:"Cancel"})),await k(o.onCancel).toHaveBeenCalled()}};var i,l,m;e.parameters={...e.parameters,docs:{...(i=e.parameters)==null?void 0:i.docs,source:{originalSource:"{}",...(m=(l=e.parameters)==null?void 0:l.docs)==null?void 0:m.source}}};var p,d,g;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    title: "Remove Organization?",
    message: "Delete the District organization? Members assigned to it will become unassigned.",
    confirmLabel: "Delete",
    cancelLabel: "Keep it"
  }
}`,...(g=(d=a.parameters)==null?void 0:d.docs)==null?void 0:g.source}}};var u,C,v;n.parameters={...n.parameters,docs:{...(u=n.parameters)==null?void 0:u.docs,source:{originalSource:`{
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
}`,...(v=(C=n.parameters)==null?void 0:C.docs)==null?void 0:v.source}}};var b,f,w;t.parameters={...t.parameters,docs:{...(b=t.parameters)==null?void 0:b.docs,source:{originalSource:`{
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
}`,...(w=(f=t.parameters)==null?void 0:f.docs)==null?void 0:w.source}}};const S=["Default","CustomLabels","ConfirmClicked","CancelClicked"];export{t as CancelClicked,n as ConfirmClicked,a as CustomLabels,e as Default,S as __namedExportsOrder,H as default};
