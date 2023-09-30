function t(){}function e(t){return t()}function n(){return Object.create(null)}function i(t){t.forEach(e)}function r(t){return"function"==typeof t}function o(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function s(t,e,n,i){return t[1]&&i?function(t,e){for(const n in e)t[n]=e[n];return t}(n.ctx.slice(),t[1](i(e))):n.ctx}function c(t,e){t.appendChild(e)}function u(t,e,n){t.insertBefore(e,n||null)}function l(t){t.parentNode&&t.parentNode.removeChild(t)}function $(t){return document.createElement(t)}function a(t){return document.createTextNode(t)}function f(){return a(" ")}function d(){return a("")}function h(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function p(t,e){e=""+e,t.data!==e&&(t.data=e)}let b;function m(t){b=t}function x(t){(function(){if(!b)throw new Error("Function called outside component initialization");return b})().$$.on_mount.push(t)}const g=[],y=[];let _=[];const v=[],k=Promise.resolve();let w=!1;function E(t){_.push(t)}const j=new Set;let z=0;function A(){if(0!==z)return;const t=b;do{try{for(;z<g.length;){const t=g[z];z++,m(t),O(t.$$)}}catch(t){throw g.length=0,z=0,t}for(m(null),g.length=0,z=0;y.length;)y.pop()();for(let t=0;t<_.length;t+=1){const e=_[t];j.has(e)||(j.add(e),e())}_.length=0}while(g.length);for(;v.length;)v.pop()();w=!1,j.clear(),m(t)}function O(t){if(null!==t.fragment){t.update(),i(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(E)}}const N=new Set;let S,B;function C(t,e){t&&t.i&&(N.delete(t),t.i(e))}function L(t,e,n,i){if(t&&t.o){if(N.has(t))return;N.add(t),S.c.push((()=>{N.delete(t),i&&(n&&t.d(1),i())})),t.o(e)}else i&&i()}function P(t){return void 0!==t?.length?t:Array.from(t)}function F(t,e){const n=t.$$;null!==n.fragment&&(!function(t){const e=[],n=[];_.forEach((i=>-1===t.indexOf(i)?e.push(i):n.push(i))),n.forEach((t=>t())),_=e}(n.after_update),i(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function J(t,e){-1===t.$$.dirty[0]&&(g.push(t),w||(w=!0,k.then(A)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function M(o,s,c,u,$,a,f=null,d=[-1]){const h=b;m(o);const p=o.$$={fragment:null,ctx:[],props:a,update:t,not_equal:$,bound:n(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(s.context||(h?h.$$.context:[])),callbacks:n(),dirty:d,skip_bound:!1,root:s.target||h.$$.root};f&&f(p.root);let x=!1;if(p.ctx=c?c(o,s.props||{},((t,e,...n)=>{const i=n.length?n[0]:e;return p.ctx&&$(p.ctx[t],p.ctx[t]=i)&&(!p.skip_bound&&p.bound[t]&&p.bound[t](i),x&&J(o,t)),e})):[],p.update(),x=!0,i(p.before_update),p.fragment=!!u&&u(p.ctx),s.target){if(s.hydrate){const t=function(t){return Array.from(t.childNodes)}(s.target);p.fragment&&p.fragment.l(t),t.forEach(l)}else p.fragment&&p.fragment.c();s.intro&&C(o.$$.fragment),function(t,n,o){const{fragment:s,after_update:c}=t.$$;s&&s.m(n,o),E((()=>{const n=t.$$.on_mount.map(e).filter(r);t.$$.on_destroy?t.$$.on_destroy.push(...n):i(n),t.$$.on_mount=[]})),c.forEach(E)}(o,s.target,s.anchor),A()}m(h)}function T(t,e,n,i){const r=n[t]?.type;if(e="Boolean"===r&&"boolean"!=typeof e?null!=e:e,!i||!n[t])return e;if("toAttribute"===i)switch(r){case"Object":case"Array":return null==e?null:JSON.stringify(e);case"Boolean":return e?"":null;case"Number":return null==e?null:e;default:return e}else switch(r){case"Object":case"Array":return e&&JSON.parse(e);case"Boolean":default:return e;case"Number":return null!=e?+e:e}}"function"==typeof HTMLElement&&(B=class extends HTMLElement{$$ctor;$$s;$$c;$$cn=!1;$$d={};$$r=!1;$$p_d={};$$l={};$$l_u=new Map;constructor(t,e,n){super(),this.$$ctor=t,this.$$s=e,n&&this.attachShadow({mode:"open"})}addEventListener(t,e,n){if(this.$$l[t]=this.$$l[t]||[],this.$$l[t].push(e),this.$$c){const n=this.$$c.$on(t,e);this.$$l_u.set(e,n)}super.addEventListener(t,e,n)}removeEventListener(t,e,n){if(super.removeEventListener(t,e,n),this.$$c){const t=this.$$l_u.get(e);t&&(t(),this.$$l_u.delete(e))}}async connectedCallback(){if(this.$$cn=!0,!this.$$c){if(await Promise.resolve(),!this.$$cn)return;function t(t){return()=>{let e;return{c:function(){e=$("slot"),"default"!==t&&h(e,"name",t)},m:function(t,n){u(t,e,n)},d:function(t){t&&l(e)}}}}const e={},n=function(t){const e={};return t.childNodes.forEach((t=>{e[t.slot||"default"]=!0})),e}(this);for(const r of this.$$s)r in n&&(e[r]=[t(r)]);for(const o of this.attributes){const s=this.$$g_p(o.name);s in this.$$d||(this.$$d[s]=T(s,o.value,this.$$p_d,"toProp"))}this.$$c=new this.$$ctor({target:this.shadowRoot||this,props:{...this.$$d,$$slots:e,$$scope:{ctx:[]}}});const i=()=>{this.$$r=!0;for(const t in this.$$p_d)if(this.$$d[t]=this.$$c.$$.ctx[this.$$c.$$.props[t]],this.$$p_d[t].reflect){const e=T(t,this.$$d[t],this.$$p_d,"toAttribute");null==e?this.removeAttribute(this.$$p_d[t].attribute||t):this.setAttribute(this.$$p_d[t].attribute||t,e)}this.$$r=!1};this.$$c.$$.after_update.push(i),i();for(const c in this.$$l)for(const a of this.$$l[c]){const f=this.$$c.$on(c,a);this.$$l_u.set(a,f)}this.$$l={}}}attributeChangedCallback(t,e,n){this.$$r||(t=this.$$g_p(t),this.$$d[t]=T(t,n,this.$$p_d,"toProp"),this.$$c?.$set({[t]:this.$$d[t]}))}disconnectedCallback(){this.$$cn=!1,Promise.resolve().then((()=>{this.$$cn||(this.$$c.$destroy(),this.$$c=void 0)}))}$$g_p(t){return Object.keys(this.$$p_d).find((e=>this.$$p_d[e].attribute===t||!this.$$p_d[e].attribute&&e.toLowerCase()===t))||t}});class V{$$=void 0;$$set=void 0;$destroy(){F(this,1),this.$destroy=t}$on(e,n){if(!r(n))return t;const i=this.$$.callbacks[e]||(this.$$.callbacks[e]=[]);return i.push(n),()=>{const t=i.indexOf(n);-1!==t&&i.splice(t,1)}}$set(t){var e;this.$$set&&(e=t,0!==Object.keys(e).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}function H(t){return"true"==t||!("false"==t||!t)&&(/^[0-9\.]+$/.test(t)?parseFloat(t):t)}"undefined"!=typeof window&&(window.__svelte||(window.__svelte={v:new Set})).v.add("4");var q={getJsonFromString:function(t,e){if(t&&("string"==typeof t||t instanceof String)){let e=t.split(";").map((t=>{const e=t.split(":")[0].trim();let n=t.split(":").slice(1).join(":").trim();return n=H(n),n="string"==typeof n?'"'+n+'"':n,'"'+e+'":'+n}));return JSON.parse("{"+e.join(",")+"}")}return e||!1},checkValueFormat:H,getBooleanValue:function(t,e){return null==t?e:![0,!1,"off"].includes(t)}};function D(t,e,n){const i=t.slice();return i[16]=e[n],i}const G=t=>({}),R=t=>({});function I(t){let e,n,i;return{c(){e=$("div"),n=$("h5"),i=a(t[4]),h(e,"class","title text-center")},m(t,r){u(t,e,r),c(e,n),c(n,i)},p(t,e){16&e&&p(i,t[4])},d(t){t&&l(e)}}}function K(t){let e,n;return{c(){e=$("div"),n=a(t[5]),h(e,"class","text mt-3 mb-1")},m(t,i){u(t,e,i),c(e,n)},p(t,e){32&e&&p(n,t[5])},d(t){t&&l(e)}}}function Q(t){let e,n;const i=t[15].text,r=function(t,e,n,i){if(t){const r=s(t,e,n,i);return t[0](r)}}(i,t,t[14],R);return{c(){e=$("div"),r&&r.c(),h(e,"class","text mt-3 mb-1")},m(t,i){u(t,e,i),r&&r.m(e,null),n=!0},p(t,e){r&&r.p&&(!n||16384&e)&&function(t,e,n,i,r,o){if(r){const c=s(e,n,i,o);t.p(c,r)}}(r,i,t,t[14],n?function(t,e,n,i){if(t[2]&&i){const r=t[2](i(n));if(void 0===e.dirty)return r;if("object"==typeof r){const t=[],n=Math.max(e.dirty.length,r.length);for(let i=0;i<n;i+=1)t[i]=e.dirty[i]|r[i];return t}return e.dirty|r}return e.dirty}(i,t[14],e,G):function(t){if(t.ctx.length>32){const e=[],n=t.ctx.length/32;for(let t=0;t<n;t++)e[t]=-1;return e}return-1}(t[14]),R)},i(t){n||(C(r,t),n=!0)},o(t){L(r,t),n=!1},d(t){t&&l(e),r&&r.d(t)}}}function U(t){let e,n,i,r,o,s,b,m,x=t[16].prefix+"",g=t[16].icon&&W(t),y=t[16].text&&X(t);return{c(){e=$("span"),n=a(x),i=f(),r=$("a"),g&&g.c(),o=d(),y&&y.c(),m=f(),h(r,"href",s=t[16].url),h(r,"title",b=t[16].title||t[16].url||"Attribution"),h(r,"target","_blank"),h(r,"rel","noreferrer"),h(e,"class","attribution me-1")},m(t,s){u(t,e,s),c(e,n),c(e,i),c(e,r),g&&g.m(r,null),c(r,o),y&&y.m(r,null),c(e,m)},p(t,e){2&e&&x!==(x=t[16].prefix+"")&&p(n,x),t[16].icon?g?g.p(t,e):(g=W(t),g.c(),g.m(r,o)):g&&(g.d(1),g=null),t[16].text?y?y.p(t,e):(y=X(t),y.c(),y.m(r,null)):y&&(y.d(1),y=null),2&e&&s!==(s=t[16].url)&&h(r,"href",s),2&e&&b!==(b=t[16].title||t[16].url||"Attribution")&&h(r,"title",b)},d(t){t&&l(e),g&&g.d(),y&&y.d()}}}function W(t){let e,n,i;return{c(){e=$("i"),h(e,"class",n="bi-"+t[16].icon),h(e,"style",i="font-size: "+t[16].size+"; color: "+t[16].color+";")},m(t,n){u(t,e,n)},p(t,r){2&r&&n!==(n="bi-"+t[16].icon)&&h(e,"class",n),2&r&&i!==(i="font-size: "+t[16].size+"; color: "+t[16].color+";")&&h(e,"style",i)},d(t){t&&l(e)}}}function X(t){let e,n=t[16].text+"";return{c(){e=a(n)},m(t,n){u(t,e,n)},p(t,i){2&i&&n!==(n=t[16].text+"")&&p(e,n)},d(t){t&&l(e)}}}function Y(t){let e,n=(t[16].icon||t[16].text)&&U(t);return{c(){n&&n.c(),e=d()},m(t,i){n&&n.m(t,i),u(t,e,i)},p(t,i){t[16].icon||t[16].text?n?n.p(t,i):(n=U(t),n.c(),n.m(e.parentNode,e)):n&&(n.d(1),n=null)},d(t){t&&l(e),n&&n.d(t)}}}function Z(t){let e;return{c(){e=$("style"),e.textContent='@import url("https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css");\r\n        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css");'},m(t,n){u(t,e,n)},d(t){t&&l(e)}}}function tt(t){let e;return{c(){e=$("style"),e.textContent='@import "./dist/bootstrap/css/bootstrap.min.css";\r\n        @import "./dist/bootstrap-icons/bootstrap-icons.css";\r\n        @import "./dist/global.css";'},m(t,n){u(t,e,n)},d(t){t&&l(e)}}}function et(t){let e,n,r,o,s,a,p,b,m,x,g,y=t[4]&&I(t),_=t[5]&&K(t),v=t[6].text&&Q(t),k=P(t[1]),w=[];for(let e=0;e<k.length;e+=1)w[e]=Y(D(t,k,e));function E(t,e){return t[0]?tt:Z}let j=E(t),z=j(t);return{c(){e=$("div"),n=$("div"),y&&y.c(),r=f(),_&&_.c(),o=f(),v&&v.c(),s=f(),a=$("div"),p=$("small");for(let t=0;t<w.length;t+=1)w[t].c();m=f(),z.c(),x=d(),h(p,"class","text-muted"),h(a,"class","text-end mt-2"),h(n,"class","card-body"),h(e,"id",t[2]),h(e,"class",b="card "+t[3])},m(t,i){u(t,e,i),c(e,n),y&&y.m(n,null),c(n,r),_&&_.m(n,null),c(n,o),v&&v.m(n,null),c(n,s),c(n,a),c(a,p);for(let t=0;t<w.length;t+=1)w[t]&&w[t].m(p,null);u(t,m,i),z.m(t,i),u(t,x,i),g=!0},p(t,[c]){if(t[4]?y?y.p(t,c):(y=I(t),y.c(),y.m(n,r)):y&&(y.d(1),y=null),t[5]?_?_.p(t,c):(_=K(t),_.c(),_.m(n,o)):_&&(_.d(1),_=null),t[6].text?v?(v.p(t,c),64&c&&C(v,1)):(v=Q(t),v.c(),C(v,1),v.m(n,s)):v&&(S={r:0,c:[],p:S},L(v,1,1,(()=>{v=null})),S.r||i(S.c),S=S.p),2&c){let e;for(k=P(t[1]),e=0;e<k.length;e+=1){const n=D(t,k,e);w[e]?w[e].p(n,c):(w[e]=Y(n),w[e].c(),w[e].m(p,null))}for(;e<w.length;e+=1)w[e].d(1);w.length=k.length}(!g||4&c)&&h(e,"id",t[2]),(!g||8&c&&b!==(b="card "+t[3]))&&h(e,"class",b),j!==(j=E(t))&&(z.d(1),z=j(t),z&&(z.c(),z.m(x.parentNode,x)))},i(t){g||(C(v),g=!0)},o(t){L(v),g=!1},d(t){t&&(l(e),l(m),l(x)),y&&y.d(),_&&_.d(),v&&v.d(),function(t,e){for(let n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}(w,t),z.d(t)}}}function nt(t,e,n){let{$$slots:i={},$$scope:r}=e;const o=function(t){const e={};for(const n in t)e[n]=!0;return e}(i);let{id:s="dge-text"}=e,{klass:c=""}=e,{title:u=""}=e,{text:l=null}=e,{localcss:$=!1}=e,{attribution:a=""}=e,{attributionicon:f=!1}=e,{attributiontext:d=!1}=e,{attributionprefix:h=""}=e,{attributionurl:p=!1}=e,{attributionsize:b="1rem"}=e,{attributioncolor:m=null}=e,{attributiontitle:g=!1}=e;return x((()=>{})),t.$$set=t=>{"id"in t&&n(2,s=t.id),"klass"in t&&n(3,c=t.klass),"title"in t&&n(4,u=t.title),"text"in t&&n(5,l=t.text),"localcss"in t&&n(0,$=t.localcss),"attribution"in t&&n(1,a=t.attribution),"attributionicon"in t&&n(7,f=t.attributionicon),"attributiontext"in t&&n(8,d=t.attributiontext),"attributionprefix"in t&&n(9,h=t.attributionprefix),"attributionurl"in t&&n(10,p=t.attributionurl),"attributionsize"in t&&n(11,b=t.attributionsize),"attributioncolor"in t&&n(12,m=t.attributioncolor),"attributiontitle"in t&&n(13,g=t.attributiontitle),"$$scope"in t&&n(14,r=t.$$scope)},t.$$.update=()=>{if(1&t.$$.dirty&&n(0,$=q.checkValueFormat($)),16258&t.$$.dirty){const t={icon:f,text:d||g||p,prefix:h,url:p,size:b,color:m,title:g||d},e=a?a.split("|"):[];n(1,a=e.map((e=>{const n=q.getJsonFromString(e,!1);return{...t,...n}})))}},[$,a,s,c,u,l,o,f,d,h,p,b,m,g,r,i]}class it extends V{constructor(t){super(),M(this,t,nt,et,o,{id:2,klass:3,title:4,text:5,localcss:0,attribution:1,attributionicon:7,attributiontext:8,attributionprefix:9,attributionurl:10,attributionsize:11,attributioncolor:12,attributiontitle:13})}get id(){return this.$$.ctx[2]}set id(t){this.$$set({id:t}),A()}get klass(){return this.$$.ctx[3]}set klass(t){this.$$set({klass:t}),A()}get title(){return this.$$.ctx[4]}set title(t){this.$$set({title:t}),A()}get text(){return this.$$.ctx[5]}set text(t){this.$$set({text:t}),A()}get localcss(){return this.$$.ctx[0]}set localcss(t){this.$$set({localcss:t}),A()}get attribution(){return this.$$.ctx[1]}set attribution(t){this.$$set({attribution:t}),A()}get attributionicon(){return this.$$.ctx[7]}set attributionicon(t){this.$$set({attributionicon:t}),A()}get attributiontext(){return this.$$.ctx[8]}set attributiontext(t){this.$$set({attributiontext:t}),A()}get attributionprefix(){return this.$$.ctx[9]}set attributionprefix(t){this.$$set({attributionprefix:t}),A()}get attributionurl(){return this.$$.ctx[10]}set attributionurl(t){this.$$set({attributionurl:t}),A()}get attributionsize(){return this.$$.ctx[11]}set attributionsize(t){this.$$set({attributionsize:t}),A()}get attributioncolor(){return this.$$.ctx[12]}set attributioncolor(t){this.$$set({attributioncolor:t}),A()}get attributiontitle(){return this.$$.ctx[13]}set attributiontitle(t){this.$$set({attributiontitle:t}),A()}}customElements.define("dge-text",function(t,e,n,i,r,o){let s=class extends B{constructor(){super(t,n,r),this.$$p_d=e}static get observedAttributes(){return Object.keys(e).map((t=>(e[t].attribute||t).toLowerCase()))}};return Object.keys(e).forEach((t=>{Object.defineProperty(s.prototype,t,{get(){return this.$$c&&t in this.$$c?this.$$c[t]:this.$$d[t]},set(n){n=T(t,n,e),this.$$d[t]=n,this.$$c?.$set({[t]:n})}})})),i.forEach((t=>{Object.defineProperty(s.prototype,t,{get(){return this.$$c?.[t]}})})),o&&(s=o(s)),t.element=s,s}(it,{id:{},klass:{},title:{},text:{},localcss:{type:"Boolean"},attribution:{reflect:!1,type:"String",attribute:"attribution"},attributionicon:{type:"Boolean"},attributiontext:{type:"Boolean"},attributionprefix:{},attributionurl:{type:"Boolean"},attributionsize:{},attributioncolor:{},attributiontitle:{type:"Boolean"}},["text"],[],!0));export{it as DGEText};
