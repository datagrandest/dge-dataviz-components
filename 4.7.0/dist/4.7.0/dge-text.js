!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).DgeDatavizComponents={})}(this,(function(t){"use strict";function e(){}function n(t){return t()}function i(){return Object.create(null)}function o(t){t.forEach(n)}function r(t){return"function"==typeof t}function s(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function c(t,e,n,i){return t[1]&&i?function(t,e){for(const n in e)t[n]=e[n];return t}(n.ctx.slice(),t[1](i(e))):n.ctx}function u(t,e){t.appendChild(e)}function l(t,e,n){t.insertBefore(e,n||null)}function $(t){t.parentNode&&t.parentNode.removeChild(t)}function a(t){return document.createElement(t)}function f(t){return document.createTextNode(t)}function d(){return f(" ")}function h(){return f("")}function p(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function b(t,e){e=""+e,t.data!==e&&(t.data=e)}let m;function x(t){m=t}function g(t){(function(){if(!m)throw new Error("Function called outside component initialization");return m})().$$.on_mount.push(t)}const y=[],_=[];let v=[];const k=[],w=Promise.resolve();let E=!1;function j(t){v.push(t)}const z=new Set;let A=0;function O(){if(0!==A)return;const t=m;do{try{for(;A<y.length;){const t=y[A];A++,x(t),N(t.$$)}}catch(t){throw y.length=0,A=0,t}for(x(null),y.length=0,A=0;_.length;)_.pop()();for(let t=0;t<v.length;t+=1){const e=v[t];z.has(e)||(z.add(e),e())}v.length=0}while(y.length);for(;k.length;)k.pop()();E=!1,z.clear(),x(t)}function N(t){if(null!==t.fragment){t.update(),o(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(j)}}const C=new Set;let S,B;function L(t,e){t&&t.i&&(C.delete(t),t.i(e))}function P(t,e,n,i){if(t&&t.o){if(C.has(t))return;C.add(t),S.c.push((()=>{C.delete(t),i&&(n&&t.d(1),i())})),t.o(e)}else i&&i()}function F(t){return void 0!==t?.length?t:Array.from(t)}function T(t,e){const n=t.$$;null!==n.fragment&&(!function(t){const e=[],n=[];v.forEach((i=>-1===t.indexOf(i)?e.push(i):n.push(i))),n.forEach((t=>t())),v=e}(n.after_update),o(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function J(t,e){-1===t.$$.dirty[0]&&(y.push(t),E||(E=!0,w.then(O)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function M(t,s,c,u,l,a,f=null,d=[-1]){const h=m;x(t);const p=t.$$={fragment:null,ctx:[],props:a,update:e,not_equal:l,bound:i(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(s.context||(h?h.$$.context:[])),callbacks:i(),dirty:d,skip_bound:!1,root:s.target||h.$$.root};f&&f(p.root);let b=!1;if(p.ctx=c?c(t,s.props||{},((e,n,...i)=>{const o=i.length?i[0]:n;return p.ctx&&l(p.ctx[e],p.ctx[e]=o)&&(!p.skip_bound&&p.bound[e]&&p.bound[e](o),b&&J(t,e)),n})):[],p.update(),b=!0,o(p.before_update),p.fragment=!!u&&u(p.ctx),s.target){if(s.hydrate){const t=function(t){return Array.from(t.childNodes)}(s.target);p.fragment&&p.fragment.l(t),t.forEach($)}else p.fragment&&p.fragment.c();s.intro&&L(t.$$.fragment),function(t,e,i){const{fragment:s,after_update:c}=t.$$;s&&s.m(e,i),j((()=>{const e=t.$$.on_mount.map(n).filter(r);t.$$.on_destroy?t.$$.on_destroy.push(...e):o(e),t.$$.on_mount=[]})),c.forEach(j)}(t,s.target,s.anchor),O()}x(h)}function D(t,e,n,i){const o=n[t]?.type;if(e="Boolean"===o&&"boolean"!=typeof e?null!=e:e,!i||!n[t])return e;if("toAttribute"===i)switch(o){case"Object":case"Array":return null==e?null:JSON.stringify(e);case"Boolean":return e?"":null;case"Number":return null==e?null:e;default:return e}else switch(o){case"Object":case"Array":return e&&JSON.parse(e);case"Boolean":default:return e;case"Number":return null!=e?+e:e}}"function"==typeof HTMLElement&&(B=class extends HTMLElement{$$ctor;$$s;$$c;$$cn=!1;$$d={};$$r=!1;$$p_d={};$$l={};$$l_u=new Map;constructor(t,e,n){super(),this.$$ctor=t,this.$$s=e,n&&this.attachShadow({mode:"open"})}addEventListener(t,e,n){if(this.$$l[t]=this.$$l[t]||[],this.$$l[t].push(e),this.$$c){const n=this.$$c.$on(t,e);this.$$l_u.set(e,n)}super.addEventListener(t,e,n)}removeEventListener(t,e,n){if(super.removeEventListener(t,e,n),this.$$c){const t=this.$$l_u.get(e);t&&(t(),this.$$l_u.delete(e))}}async connectedCallback(){if(this.$$cn=!0,!this.$$c){if(await Promise.resolve(),!this.$$cn)return;function t(t){return()=>{let e;return{c:function(){e=a("slot"),"default"!==t&&p(e,"name",t)},m:function(t,n){l(t,e,n)},d:function(t){t&&$(e)}}}}const e={},n=function(t){const e={};return t.childNodes.forEach((t=>{e[t.slot||"default"]=!0})),e}(this);for(const o of this.$$s)o in n&&(e[o]=[t(o)]);for(const r of this.attributes){const s=this.$$g_p(r.name);s in this.$$d||(this.$$d[s]=D(s,r.value,this.$$p_d,"toProp"))}this.$$c=new this.$$ctor({target:this.shadowRoot||this,props:{...this.$$d,$$slots:e,$$scope:{ctx:[]}}});const i=()=>{this.$$r=!0;for(const t in this.$$p_d)if(this.$$d[t]=this.$$c.$$.ctx[this.$$c.$$.props[t]],this.$$p_d[t].reflect){const e=D(t,this.$$d[t],this.$$p_d,"toAttribute");null==e?this.removeAttribute(this.$$p_d[t].attribute||t):this.setAttribute(this.$$p_d[t].attribute||t,e)}this.$$r=!1};this.$$c.$$.after_update.push(i),i();for(const c in this.$$l)for(const u of this.$$l[c]){const f=this.$$c.$on(c,u);this.$$l_u.set(u,f)}this.$$l={}}}attributeChangedCallback(t,e,n){this.$$r||(t=this.$$g_p(t),this.$$d[t]=D(t,n,this.$$p_d,"toProp"),this.$$c?.$set({[t]:this.$$d[t]}))}disconnectedCallback(){this.$$cn=!1,Promise.resolve().then((()=>{this.$$cn||(this.$$c.$destroy(),this.$$c=void 0)}))}$$g_p(t){return Object.keys(this.$$p_d).find((e=>this.$$p_d[e].attribute===t||!this.$$p_d[e].attribute&&e.toLowerCase()===t))||t}});class V{$$=void 0;$$set=void 0;$destroy(){T(this,1),this.$destroy=e}$on(t,n){if(!r(n))return e;const i=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return i.push(n),()=>{const t=i.indexOf(n);-1!==t&&i.splice(t,1)}}$set(t){var e;this.$$set&&(e=t,0!==Object.keys(e).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}function H(t){return"true"==t||!("false"==t||!t)&&(/^[0-9\.]+$/.test(t)?parseFloat(t):t)}"undefined"!=typeof window&&(window.__svelte||(window.__svelte={v:new Set})).v.add("4");var q={getJsonFromString:function(t,e){if(t&&("string"==typeof t||t instanceof String)){let e=t.split(";").map((t=>{const e=t.split(":")[0].trim();let n=t.split(":").slice(1).join(":").trim();return n=H(n),n="string"==typeof n?'"'+n+'"':n,'"'+e+'":'+n}));return JSON.parse("{"+e.join(",")+"}")}return e||!1},checkValueFormat:H,getBooleanValue:function(t,e){return null==t?e:![0,!1,"off"].includes(t)}};function G(t,e,n){const i=t.slice();return i[16]=e[n],i}const R=t=>({}),I=t=>({});function K(t){let e,n,i;return{c(){e=a("div"),n=a("h5"),i=f(t[4]),p(e,"class","title text-center")},m(t,o){l(t,e,o),u(e,n),u(n,i)},p(t,e){16&e&&b(i,t[4])},d(t){t&&$(e)}}}function Q(t){let e,n;return{c(){e=a("div"),n=f(t[5]),p(e,"class","text mt-3 mb-1")},m(t,i){l(t,e,i),u(e,n)},p(t,e){32&e&&b(n,t[5])},d(t){t&&$(e)}}}function U(t){let e,n;const i=t[15].text,o=function(t,e,n,i){if(t){const o=c(t,e,n,i);return t[0](o)}}(i,t,t[14],I);return{c(){e=a("div"),o&&o.c(),p(e,"class","text mt-3 mb-1")},m(t,i){l(t,e,i),o&&o.m(e,null),n=!0},p(t,e){o&&o.p&&(!n||16384&e)&&function(t,e,n,i,o,r){if(o){const s=c(e,n,i,r);t.p(s,o)}}(o,i,t,t[14],n?function(t,e,n,i){if(t[2]&&i){const o=t[2](i(n));if(void 0===e.dirty)return o;if("object"==typeof o){const t=[],n=Math.max(e.dirty.length,o.length);for(let i=0;i<n;i+=1)t[i]=e.dirty[i]|o[i];return t}return e.dirty|o}return e.dirty}(i,t[14],e,R):function(t){if(t.ctx.length>32){const e=[],n=t.ctx.length/32;for(let t=0;t<n;t++)e[t]=-1;return e}return-1}(t[14]),I)},i(t){n||(L(o,t),n=!0)},o(t){P(o,t),n=!1},d(t){t&&$(e),o&&o.d(t)}}}function W(t){let e,n,i,o,r,s,c,m,x=t[16].prefix+"",g=t[16].icon&&X(t),y=t[16].text&&Y(t);return{c(){e=a("span"),n=f(x),i=d(),o=a("a"),g&&g.c(),r=h(),y&&y.c(),m=d(),p(o,"href",s=t[16].url),p(o,"title",c=t[16].title||t[16].url||"Attribution"),p(o,"target","_blank"),p(o,"rel","noreferrer"),p(e,"class","attribution me-1")},m(t,s){l(t,e,s),u(e,n),u(e,i),u(e,o),g&&g.m(o,null),u(o,r),y&&y.m(o,null),u(e,m)},p(t,e){2&e&&x!==(x=t[16].prefix+"")&&b(n,x),t[16].icon?g?g.p(t,e):(g=X(t),g.c(),g.m(o,r)):g&&(g.d(1),g=null),t[16].text?y?y.p(t,e):(y=Y(t),y.c(),y.m(o,null)):y&&(y.d(1),y=null),2&e&&s!==(s=t[16].url)&&p(o,"href",s),2&e&&c!==(c=t[16].title||t[16].url||"Attribution")&&p(o,"title",c)},d(t){t&&$(e),g&&g.d(),y&&y.d()}}}function X(t){let e,n,i;return{c(){e=a("i"),p(e,"class",n="bi-"+t[16].icon),p(e,"style",i="font-size: "+t[16].size+"; color: "+t[16].color+";")},m(t,n){l(t,e,n)},p(t,o){2&o&&n!==(n="bi-"+t[16].icon)&&p(e,"class",n),2&o&&i!==(i="font-size: "+t[16].size+"; color: "+t[16].color+";")&&p(e,"style",i)},d(t){t&&$(e)}}}function Y(t){let e,n=t[16].text+"";return{c(){e=f(n)},m(t,n){l(t,e,n)},p(t,i){2&i&&n!==(n=t[16].text+"")&&b(e,n)},d(t){t&&$(e)}}}function Z(t){let e,n=(t[16].icon||t[16].text)&&W(t);return{c(){n&&n.c(),e=h()},m(t,i){n&&n.m(t,i),l(t,e,i)},p(t,i){t[16].icon||t[16].text?n?n.p(t,i):(n=W(t),n.c(),n.m(e.parentNode,e)):n&&(n.d(1),n=null)},d(t){t&&$(e),n&&n.d(t)}}}function tt(t){let e;return{c(){e=a("style"),e.textContent='@import url("https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css");\r\n        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css");'},m(t,n){l(t,e,n)},d(t){t&&$(e)}}}function et(t){let e;return{c(){e=a("style"),e.textContent='@import "./dist/bootstrap/css/bootstrap.min.css";\r\n        @import "./dist/bootstrap-icons/bootstrap-icons.css";\r\n        @import "./dist/global.css";'},m(t,n){l(t,e,n)},d(t){t&&$(e)}}}function nt(t){let e,n,i,r,s,c,f,b,m,x,g,y=t[4]&&K(t),_=t[5]&&Q(t),v=t[6].text&&U(t),k=F(t[1]),w=[];for(let e=0;e<k.length;e+=1)w[e]=Z(G(t,k,e));function E(t,e){return t[0]?et:tt}let j=E(t),z=j(t);return{c(){e=a("div"),n=a("div"),y&&y.c(),i=d(),_&&_.c(),r=d(),v&&v.c(),s=d(),c=a("div"),f=a("small");for(let t=0;t<w.length;t+=1)w[t].c();m=d(),z.c(),x=h(),p(f,"class","text-muted"),p(c,"class","text-end mt-2"),p(n,"class","card-body"),p(e,"id",t[2]),p(e,"class",b="card "+t[3])},m(t,o){l(t,e,o),u(e,n),y&&y.m(n,null),u(n,i),_&&_.m(n,null),u(n,r),v&&v.m(n,null),u(n,s),u(n,c),u(c,f);for(let t=0;t<w.length;t+=1)w[t]&&w[t].m(f,null);l(t,m,o),z.m(t,o),l(t,x,o),g=!0},p(t,[c]){if(t[4]?y?y.p(t,c):(y=K(t),y.c(),y.m(n,i)):y&&(y.d(1),y=null),t[5]?_?_.p(t,c):(_=Q(t),_.c(),_.m(n,r)):_&&(_.d(1),_=null),t[6].text?v?(v.p(t,c),64&c&&L(v,1)):(v=U(t),v.c(),L(v,1),v.m(n,s)):v&&(S={r:0,c:[],p:S},P(v,1,1,(()=>{v=null})),S.r||o(S.c),S=S.p),2&c){let e;for(k=F(t[1]),e=0;e<k.length;e+=1){const n=G(t,k,e);w[e]?w[e].p(n,c):(w[e]=Z(n),w[e].c(),w[e].m(f,null))}for(;e<w.length;e+=1)w[e].d(1);w.length=k.length}(!g||4&c)&&p(e,"id",t[2]),(!g||8&c&&b!==(b="card "+t[3]))&&p(e,"class",b),j!==(j=E(t))&&(z.d(1),z=j(t),z&&(z.c(),z.m(x.parentNode,x)))},i(t){g||(L(v),g=!0)},o(t){P(v),g=!1},d(t){t&&($(e),$(m),$(x)),y&&y.d(),_&&_.d(),v&&v.d(),function(t,e){for(let n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}(w,t),z.d(t)}}}function it(t,e,n){let{$$slots:i={},$$scope:o}=e;const r=function(t){const e={};for(const n in t)e[n]=!0;return e}(i);let{id:s="dge-text"}=e,{klass:c=""}=e,{title:u=""}=e,{text:l=null}=e,{localcss:$=!1}=e,{attribution:a=""}=e,{attributionicon:f=!1}=e,{attributiontext:d=!1}=e,{attributionprefix:h=""}=e,{attributionurl:p=!1}=e,{attributionsize:b="1rem"}=e,{attributioncolor:m=null}=e,{attributiontitle:x=!1}=e;return g((()=>{})),t.$$set=t=>{"id"in t&&n(2,s=t.id),"klass"in t&&n(3,c=t.klass),"title"in t&&n(4,u=t.title),"text"in t&&n(5,l=t.text),"localcss"in t&&n(0,$=t.localcss),"attribution"in t&&n(1,a=t.attribution),"attributionicon"in t&&n(7,f=t.attributionicon),"attributiontext"in t&&n(8,d=t.attributiontext),"attributionprefix"in t&&n(9,h=t.attributionprefix),"attributionurl"in t&&n(10,p=t.attributionurl),"attributionsize"in t&&n(11,b=t.attributionsize),"attributioncolor"in t&&n(12,m=t.attributioncolor),"attributiontitle"in t&&n(13,x=t.attributiontitle),"$$scope"in t&&n(14,o=t.$$scope)},t.$$.update=()=>{if(1&t.$$.dirty&&n(0,$=q.checkValueFormat($)),16258&t.$$.dirty){const t={icon:f,text:d||x||p,prefix:h,url:p,size:b,color:m,title:x||d},e=a?a.split("|"):[];n(1,a=e.map((e=>{const n=q.getJsonFromString(e,!1);return{...t,...n}})))}},[$,a,s,c,u,l,r,f,d,h,p,b,m,x,o,i]}class ot extends V{constructor(t){super(),M(this,t,it,nt,s,{id:2,klass:3,title:4,text:5,localcss:0,attribution:1,attributionicon:7,attributiontext:8,attributionprefix:9,attributionurl:10,attributionsize:11,attributioncolor:12,attributiontitle:13})}get id(){return this.$$.ctx[2]}set id(t){this.$$set({id:t}),O()}get klass(){return this.$$.ctx[3]}set klass(t){this.$$set({klass:t}),O()}get title(){return this.$$.ctx[4]}set title(t){this.$$set({title:t}),O()}get text(){return this.$$.ctx[5]}set text(t){this.$$set({text:t}),O()}get localcss(){return this.$$.ctx[0]}set localcss(t){this.$$set({localcss:t}),O()}get attribution(){return this.$$.ctx[1]}set attribution(t){this.$$set({attribution:t}),O()}get attributionicon(){return this.$$.ctx[7]}set attributionicon(t){this.$$set({attributionicon:t}),O()}get attributiontext(){return this.$$.ctx[8]}set attributiontext(t){this.$$set({attributiontext:t}),O()}get attributionprefix(){return this.$$.ctx[9]}set attributionprefix(t){this.$$set({attributionprefix:t}),O()}get attributionurl(){return this.$$.ctx[10]}set attributionurl(t){this.$$set({attributionurl:t}),O()}get attributionsize(){return this.$$.ctx[11]}set attributionsize(t){this.$$set({attributionsize:t}),O()}get attributioncolor(){return this.$$.ctx[12]}set attributioncolor(t){this.$$set({attributioncolor:t}),O()}get attributiontitle(){return this.$$.ctx[13]}set attributiontitle(t){this.$$set({attributiontitle:t}),O()}}customElements.define("dge-text",function(t,e,n,i,o,r){let s=class extends B{constructor(){super(t,n,o),this.$$p_d=e}static get observedAttributes(){return Object.keys(e).map((t=>(e[t].attribute||t).toLowerCase()))}};return Object.keys(e).forEach((t=>{Object.defineProperty(s.prototype,t,{get(){return this.$$c&&t in this.$$c?this.$$c[t]:this.$$d[t]},set(n){n=D(t,n,e),this.$$d[t]=n,this.$$c?.$set({[t]:n})}})})),i.forEach((t=>{Object.defineProperty(s.prototype,t,{get(){return this.$$c?.[t]}})})),r&&(s=r(s)),t.element=s,s}(ot,{id:{},klass:{},title:{},text:{},localcss:{type:"Boolean"},attribution:{reflect:!1,type:"String",attribute:"attribution"},attributionicon:{type:"Boolean"},attributiontext:{type:"Boolean"},attributionprefix:{},attributionurl:{type:"Boolean"},attributionsize:{},attributioncolor:{},attributiontitle:{type:"Boolean"}},["text"],[],!0)),t.DGEText=ot}));
