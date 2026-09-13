import{j as g}from"./jsx-runtime-D_zvdyIk.js";import{w as B,e as s,u as c}from"./index-Ch1O_M5-.js";import{D as y}from"./DesktopWindow-BOB8PN0N.js";import"./index-D4lIrffr.js";import"./styled-components.browser.esm-Ca49Gx22.js";import"./i18n.hook-CuqIiMBs.js";import"./i18n.context-CTpcRd1d.js";const k={title:"ports/windows/DesktopWindow",component:y,args:{title:"Map",onClose:()=>{},children:g.jsx("p",{children:"Window content goes here."})}},a={},t={play:async({canvasElement:n})=>{const r=B(n);await s(r.getByText("Map")).toBeInTheDocument()}},o={play:async({canvasElement:n})=>{const e=B(n).getByRole("button",{name:"Resize"});await s(e).toHaveAttribute("aria-pressed","false"),await c.click(e),await s(e).toHaveAttribute("aria-pressed","true"),await c.click(e),await s(e).toHaveAttribute("aria-pressed","false")}};var i,p,m;a.parameters={...a.parameters,docs:{...(i=a.parameters)==null?void 0:i.docs,source:{originalSource:"{}",...(m=(p=a.parameters)==null?void 0:p.docs)==null?void 0:m.source}}};var l,u,d;t.parameters={...t.parameters,docs:{...(l=t.parameters)==null?void 0:l.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Map")).toBeInTheDocument();
  }
}`,...(d=(u=t.parameters)==null?void 0:u.docs)==null?void 0:d.source}}};var w,x,v;o.parameters={...o.parameters,docs:{...(w=o.parameters)==null?void 0:w.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const zoomBox = canvas.getByRole("button", {
      name: "Resize"
    });
    await expect(zoomBox).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(zoomBox);
    await expect(zoomBox).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(zoomBox);
    await expect(zoomBox).toHaveAttribute("aria-pressed", "false");
  }
}`,...(v=(x=o.parameters)==null?void 0:x.docs)==null?void 0:v.source}}};const A=["Default","TitleIsShown","ZoomBoxTogglesExpanded"];export{a as Default,t as TitleIsShown,o as ZoomBoxTogglesExpanded,A as __namedExportsOrder,k as default};
