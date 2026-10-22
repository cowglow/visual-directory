import{O as c}from"./OrganizationTree-CmkEMPak.js";import{s as u,a as n}from"./story-fixtures-CINZKkVm.js";import"./jsx-runtime-D_zvdyIk.js";import"./index-D4lIrffr.js";import"./auth.selectors-CpYfVHzn.js";import"./redux-toolkit.modern-Ca_JRSPk.js";import"./windows.slice-tqPi5hlj.js";import"./selection.slice-DLRicAGB.js";import"./selection.selectors-dzruBmhK.js";import"./i18n.hook-CJ9GCP3E.js";import"./i18n.context-Cj7E5RG-.js";import"./organization.selectors-C2QX0BLb.js";import"./member.selectors-xU41z2R0.js";import"./Panel-DjjQ0ep3.js";const E={title:"ports/organization-tree/OrganizationTree",component:c},e={parameters:{reduxState:{member:{items:n,filteredLimit:n.length,loading:!1,error:null},organization:{items:u,loading:!1,error:null}}}},f=[{id:"org-region-1",name:"Central Region",type:"Region",members:[]},{id:"org-hq-1",name:"Northeast Headquarters",type:"Headquarter",members:[]},...u,{id:"org-district-2",name:"Empty District",type:"District",members:[]}],r={parameters:{reduxState:{member:{items:n,filteredLimit:n.length,loading:!1,error:null},organization:{items:f,loading:!1,error:null}}}},a={parameters:{reduxState:{member:{items:[],filteredLimit:0,loading:!1,error:null},organization:{items:[],loading:!1,error:null}}}};var t,i,o;e.parameters={...e.parameters,docs:{...(t=e.parameters)==null?void 0:t.docs,source:{originalSource:`{
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
}`,...(g=(d=a.parameters)==null?void 0:d.docs)==null?void 0:g.source}}};const H=["Default","AllOrganizationTypes","NoOrganizations"];export{r as AllOrganizationTypes,e as Default,a as NoOrganizations,H as __namedExportsOrder,E as default};
