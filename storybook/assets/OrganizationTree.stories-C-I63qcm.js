import{O as c}from"./OrganizationTree-DSKuuWX2.js";import{s as u,a as n}from"./story-fixtures-CINZKkVm.js";import"./jsx-runtime-D_zvdyIk.js";import"./index-D4lIrffr.js";import"./auth.selectors-BAS4YwMG.js";import"./react-redux-Dn6r42s_.js";import"./windows.slice-RbXkW6ya.js";import"./selection.slice-CJNz-S_B.js";import"./is-mobile-device-BipaQPfZ.js";import"./i18n.hook-CuqIiMBs.js";import"./i18n.context-CTpcRd1d.js";import"./organization.selectors-Deq9XIu6.js";import"./member.selectors-BQeLpn_d.js";import"./DesktopWindow-BOB8PN0N.js";import"./styled-components.browser.esm-Ca49Gx22.js";const H={title:"ports/organization-tree/OrganizationTree",component:c},e={parameters:{reduxState:{member:{items:n,filteredLimit:n.length,loading:!1,error:null},organization:{items:u,loading:!1,error:null}}}},f=[{id:"org-region-1",name:"Central Region",type:"Region",members:[]},{id:"org-hq-1",name:"Northeast Headquarters",type:"Headquarter",members:[]},...u,{id:"org-district-2",name:"Empty District",type:"District",members:[]}],r={parameters:{reduxState:{member:{items:n,filteredLimit:n.length,loading:!1,error:null},organization:{items:f,loading:!1,error:null}}}},a={parameters:{reduxState:{member:{items:[],filteredLimit:0,loading:!1,error:null},organization:{items:[],loading:!1,error:null}}}};var t,i,o;e.parameters={...e.parameters,docs:{...(t=e.parameters)==null?void 0:t.docs,source:{originalSource:`{
  parameters: {
    reduxState: {
      member: {
        items: sampleMembers,
        filteredLimit: sampleMembers.length,
        loading: false,
        error: null
      },
      organization: {
        items: sampleOrganizations,
        loading: false,
        error: null
      }
    }
  }
}`,...(o=(i=e.parameters)==null?void 0:i.docs)==null?void 0:o.source}}};var s,m,l;r.parameters={...r.parameters,docs:{...(s=r.parameters)==null?void 0:s.docs,source:{originalSource:`{
  parameters: {
    reduxState: {
      member: {
        items: sampleMembers,
        filteredLimit: sampleMembers.length,
        loading: false,
        error: null
      },
      organization: {
        items: allTypesOrganizations,
        loading: false,
        error: null
      }
    }
  }
}`,...(l=(m=r.parameters)==null?void 0:m.docs)==null?void 0:l.source}}};var p,d,g;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:`{
  parameters: {
    reduxState: {
      member: {
        items: [],
        filteredLimit: 0,
        loading: false,
        error: null
      },
      organization: {
        items: [],
        loading: false,
        error: null
      }
    }
  }
}`,...(g=(d=a.parameters)==null?void 0:d.docs)==null?void 0:g.source}}};const R=["Default","AllOrganizationTypes","NoOrganizations"];export{r as AllOrganizationTypes,e as Default,a as NoOrganizations,R as __namedExportsOrder,H as default};
