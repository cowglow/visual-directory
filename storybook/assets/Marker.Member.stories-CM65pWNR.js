import{M as b}from"./Marker.Member-DgyE3tZW.js";import{a as t}from"./story-fixtures-CINZKkVm.js";import"./jsx-runtime-D_zvdyIk.js";import"./index-D4lIrffr.js";import"./i18n.hook-BQeB9DON.js";import"./i18n.context-0e8a2VTa.js";import"./map-DtzlE08Z.js";import"./iframe-BpHKb-oY.js";import"./marker-Bl-krfRR.js";import"./index-DsJinFGm.js";import"./auth.selectors-CDuantmH.js";import"./react-redux-Dn6r42s_.js";import"./windows.slice-RbXkW6ya.js";import"./member.slice-Dt6gKY0s.js";import"./member.selectors-BEYMWI49.js";import"./request-id-CAY4q5cO.js";import"./selection.slice-CJNz-S_B.js";import"./is-mobile-device-BipaQPfZ.js";const l={auth:{status:"authenticated",account:{id:"account-1",email:"leader@example.com",role:"leader"},error:null}},S={auth:{status:"authenticated",account:{id:"account-2",email:"member@example.com",role:"member"},error:null}},z={title:"ports/markers/Marker.Member",component:b,parameters:{map:!0}},e={args:{member:t[0]},parameters:{reduxState:l}},r={args:{member:t[1]},parameters:{reduxState:l}},a={args:{member:t[0]},parameters:{reduxState:S}};var m,s,o;e.parameters={...e.parameters,docs:{...(m=e.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    member: sampleMembers[0]
  },
  parameters: {
    reduxState: leaderState
  }
}`,...(o=(s=e.parameters)==null?void 0:s.docs)==null?void 0:o.source}}};var p,n,c;r.parameters={...r.parameters,docs:{...(p=r.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    member: sampleMembers[1]
  },
  parameters: {
    reduxState: leaderState
  }
}`,...(c=(n=r.parameters)==null?void 0:n.docs)==null?void 0:c.source}}};var d,i,u;a.parameters={...a.parameters,docs:{...(d=a.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    member: sampleMembers[0]
  },
  parameters: {
    reduxState: memberState
  }
}`,...(u=(i=a.parameters)==null?void 0:i.docs)==null?void 0:u.source}}};const B=["ActiveAsLeader","LostContactAsLeader","ReadOnlyAsMember"];export{e as ActiveAsLeader,r as LostContactAsLeader,a as ReadOnlyAsMember,B as __namedExportsOrder,z as default};
