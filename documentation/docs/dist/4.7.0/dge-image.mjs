function t(){}function e(t){return t()}function n(){return Object.create(null)}function i(t){t.forEach(e)}function r(t){return"function"==typeof t}function o(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}let s,c;function l(t,e){return t===e||(s||(s=document.createElement("a")),s.href=e,t===s.href)}function a(t,e){t.appendChild(e)}function $(t,e,n){t.insertBefore(e,n||null)}function u(t){t.parentNode&&t.parentNode.removeChild(t)}function d(t){return document.createElement(t)}function f(t){return document.createTextNode(t)}function h(){return f(" ")}function p(){return f("")}function b(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function m(t,e){e=""+e,t.data!==e&&(t.data=e)}function g(t){c=t}function x(t){(function(){if(!c)throw new Error("Function called outside component initialization");return c})().$$.on_mount.push(t)}const y=[],_=[];let v=[];const k=[],w=Promise.resolve();let E=!1;function j(t){v.push(t)}const z=new Set;let A=0;function O(){if(0!==A)return;const t=c;do{try{for(;A<y.length;){const t=y[A];A++,g(t),N(t.$$)}}catch(t){throw y.length=0,A=0,t}for(g(null),y.length=0,A=0;_.length;)_.pop()();for(let t=0;t<v.length;t+=1){const e=v[t];z.has(e)||(z.add(e),e())}v.length=0}while(y.length);for(;k.length;)k.pop()();E=!1,z.clear(),g(t)}function N(t){if(null!==t.fragment){t.update(),i(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(j)}}const B=new Set;function C(t){return void 0!==t?.length?t:Array.from(t)}function S(t,e){const n=t.$$;null!==n.fragment&&(!function(t){const e=[],n=[];v.forEach((i=>-1===t.indexOf(i)?e.push(i):n.push(i))),n.forEach((t=>t())),v=e}(n.after_update),i(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function L(t,e){-1===t.$$.dirty[0]&&(y.push(t),E||(E=!0,w.then(O)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function P(o,s,l,a,$,d,f=null,h=[-1]){const p=c;g(o);const b=o.$$={fragment:null,ctx:[],props:d,update:t,not_equal:$,bound:n(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(s.context||(p?p.$$.context:[])),callbacks:n(),dirty:h,skip_bound:!1,root:s.target||p.$$.root};f&&f(b.root);let m=!1;if(b.ctx=l?l(o,s.props||{},((t,e,...n)=>{const i=n.length?n[0]:e;return b.ctx&&$(b.ctx[t],b.ctx[t]=i)&&(!b.skip_bound&&b.bound[t]&&b.bound[t](i),m&&L(o,t)),e})):[],b.update(),m=!0,i(b.before_update),b.fragment=!!a&&a(b.ctx),s.target){if(s.hydrate){const t=function(t){return Array.from(t.childNodes)}(s.target);b.fragment&&b.fragment.l(t),t.forEach(u)}else b.fragment&&b.fragment.c();s.intro&&((x=o.$$.fragment)&&x.i&&(B.delete(x),x.i(y))),function(t,n,o){const{fragment:s,after_update:c}=t.$$;s&&s.m(n,o),j((()=>{const n=t.$$.on_mount.map(e).filter(r);t.$$.on_destroy?t.$$.on_destroy.push(...n):i(n),t.$$.on_mount=[]})),c.forEach(j)}(o,s.target,s.anchor),O()}var x,y;g(p)}let F;function J(t,e,n,i){const r=n[t]?.type;if(e="Boolean"===r&&"boolean"!=typeof e?null!=e:e,!i||!n[t])return e;if("toAttribute"===i)switch(r){case"Object":case"Array":return null==e?null:JSON.stringify(e);case"Boolean":return e?"":null;case"Number":return null==e?null:e;default:return e}else switch(r){case"Object":case"Array":return e&&JSON.parse(e);case"Boolean":default:return e;case"Number":return null!=e?+e:e}}"function"==typeof HTMLElement&&(F=class extends HTMLElement{$$ctor;$$s;$$c;$$cn=!1;$$d={};$$r=!1;$$p_d={};$$l={};$$l_u=new Map;constructor(t,e,n){super(),this.$$ctor=t,this.$$s=e,n&&this.attachShadow({mode:"open"})}addEventListener(t,e,n){if(this.$$l[t]=this.$$l[t]||[],this.$$l[t].push(e),this.$$c){const n=this.$$c.$on(t,e);this.$$l_u.set(e,n)}super.addEventListener(t,e,n)}removeEventListener(t,e,n){if(super.removeEventListener(t,e,n),this.$$c){const t=this.$$l_u.get(e);t&&(t(),this.$$l_u.delete(e))}}async connectedCallback(){if(this.$$cn=!0,!this.$$c){if(await Promise.resolve(),!this.$$cn)return;function t(t){return()=>{let e;return{c:function(){e=d("slot"),"default"!==t&&b(e,"name",t)},m:function(t,n){$(t,e,n)},d:function(t){t&&u(e)}}}}const e={},n=function(t){const e={};return t.childNodes.forEach((t=>{e[t.slot||"default"]=!0})),e}(this);for(const r of this.$$s)r in n&&(e[r]=[t(r)]);for(const o of this.attributes){const s=this.$$g_p(o.name);s in this.$$d||(this.$$d[s]=J(s,o.value,this.$$p_d,"toProp"))}this.$$c=new this.$$ctor({target:this.shadowRoot||this,props:{...this.$$d,$$slots:e,$$scope:{ctx:[]}}});const i=()=>{this.$$r=!0;for(const t in this.$$p_d)if(this.$$d[t]=this.$$c.$$.ctx[this.$$c.$$.props[t]],this.$$p_d[t].reflect){const e=J(t,this.$$d[t],this.$$p_d,"toAttribute");null==e?this.removeAttribute(this.$$p_d[t].attribute||t):this.setAttribute(this.$$p_d[t].attribute||t,e)}this.$$r=!1};this.$$c.$$.after_update.push(i),i();for(const c in this.$$l)for(const l of this.$$l[c]){const a=this.$$c.$on(c,l);this.$$l_u.set(l,a)}this.$$l={}}}attributeChangedCallback(t,e,n){this.$$r||(t=this.$$g_p(t),this.$$d[t]=J(t,n,this.$$p_d,"toProp"),this.$$c?.$set({[t]:this.$$d[t]}))}disconnectedCallback(){this.$$cn=!1,Promise.resolve().then((()=>{this.$$cn||(this.$$c.$destroy(),this.$$c=void 0)}))}$$g_p(t){return Object.keys(this.$$p_d).find((e=>this.$$p_d[e].attribute===t||!this.$$p_d[e].attribute&&e.toLowerCase()===t))||t}});class M{$$=void 0;$$set=void 0;$destroy(){S(this,1),this.$destroy=t}$on(e,n){if(!r(n))return t;const i=this.$$.callbacks[e]||(this.$$.callbacks[e]=[]);return i.push(n),()=>{const t=i.indexOf(n);-1!==t&&i.splice(t,1)}}$set(t){var e;this.$$set&&(e=t,0!==Object.keys(e).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}function T(t){return"true"==t||!("false"==t||!t)&&(/^[0-9\.]+$/.test(t)?parseFloat(t):t)}"undefined"!=typeof window&&(window.__svelte||(window.__svelte={v:new Set})).v.add("4");var V={getJsonFromString:function(t,e){if(t&&("string"==typeof t||t instanceof String)){let e=t.split(";").map((t=>{const e=t.split(":")[0].trim();let n=t.split(":").slice(1).join(":").trim();return n=T(n),n="string"==typeof n?'"'+n+'"':n,'"'+e+'":'+n}));return JSON.parse("{"+e.join(",")+"}")}return e||!1},checkValueFormat:T,getBooleanValue:function(t,e){return null==t?e:![0,!1,"off"].includes(t)}};function H(t,e,n){const i=t.slice();return i[14]=e[n],i}function q(t){let e,n,i;return{c(){e=d("div"),n=d("h5"),i=f(t[4]),b(e,"class","title text-center")},m(t,r){$(t,e,r),a(e,n),a(n,i)},p(t,e){16&e&&m(i,t[4])},d(t){t&&u(e)}}}function D(t){let e,n,i,r;return{c(){e=d("div"),n=d("img"),l(n.src,i=t[5])||b(n,"src",i),b(n,"class","figure-img img-fluid rounded"),b(n,"alt",r=t[6]?t[6]:Error),b(e,"class","img")},m(t,i){$(t,e,i),a(e,n)},p(t,e){32&e&&!l(n.src,i=t[5])&&b(n,"src",i),64&e&&r!==(r=t[6]?t[6]:Error)&&b(n,"alt",r)},d(t){t&&u(e)}}}function G(t){let e,n,i,r,o,s=C(t[1]),c=[];for(let e=0;e<s.length;e+=1)c[e]=Q(H(t,s,e));return{c(){e=d("div"),n=d("small"),i=f(t[6]),r=h(),o=d("small");for(let t=0;t<c.length;t+=1)c[t].c();b(n,"class","text-start"),b(o,"class","attribution text-end"),b(e,"class","text-muted d-flex justify-content-between")},m(t,s){$(t,e,s),a(e,n),a(n,i),a(e,r),a(e,o);for(let t=0;t<c.length;t+=1)c[t]&&c[t].m(o,null)},p(t,e){if(64&e&&m(i,t[6]),2&e){let n;for(s=C(t[1]),n=0;n<s.length;n+=1){const i=H(t,s,n);c[n]?c[n].p(i,e):(c[n]=Q(i),c[n].c(),c[n].m(o,null))}for(;n<c.length;n+=1)c[n].d(1);c.length=s.length}},d(t){t&&u(e),function(t,e){for(let n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}(c,t)}}}function I(t){let e,n,i,r,o,s,c,l=t[14].prefix+"",g=t[14].icon&&R(t),x=t[14].text&&K(t);return{c(){e=f(l),n=h(),i=d("a"),g&&g.c(),r=p(),x&&x.c(),o=h(),b(i,"href",s=t[14].url),b(i,"title",c=t[14].title||t[14].url||"Attribution"),b(i,"target","_blank"),b(i,"rel","noreferrer")},m(t,s){$(t,e,s),$(t,n,s),$(t,i,s),g&&g.m(i,null),a(i,r),x&&x.m(i,null),a(i,o)},p(t,n){2&n&&l!==(l=t[14].prefix+"")&&m(e,l),t[14].icon?g?g.p(t,n):(g=R(t),g.c(),g.m(i,r)):g&&(g.d(1),g=null),t[14].text?x?x.p(t,n):(x=K(t),x.c(),x.m(i,o)):x&&(x.d(1),x=null),2&n&&s!==(s=t[14].url)&&b(i,"href",s),2&n&&c!==(c=t[14].title||t[14].url||"Attribution")&&b(i,"title",c)},d(t){t&&(u(e),u(n),u(i)),g&&g.d(),x&&x.d()}}}function R(t){let e,n,i;return{c(){e=d("i"),b(e,"class",n="bi-"+t[14].icon),b(e,"style",i="font-size: "+t[14].size+"; color: "+t[14].color+";")},m(t,n){$(t,e,n)},p(t,r){2&r&&n!==(n="bi-"+t[14].icon)&&b(e,"class",n),2&r&&i!==(i="font-size: "+t[14].size+"; color: "+t[14].color+";")&&b(e,"style",i)},d(t){t&&u(e)}}}function K(t){let e,n=t[14].text+"";return{c(){e=f(n)},m(t,n){$(t,e,n)},p(t,i){2&i&&n!==(n=t[14].text+"")&&m(e,n)},d(t){t&&u(e)}}}function Q(t){let e,n=(t[14].icon||t[14].text)&&I(t);return{c(){n&&n.c(),e=p()},m(t,i){n&&n.m(t,i),$(t,e,i)},p(t,i){t[14].icon||t[14].text?n?n.p(t,i):(n=I(t),n.c(),n.m(e.parentNode,e)):n&&(n.d(1),n=null)},d(t){t&&u(e),n&&n.d(t)}}}function U(t){let e;return{c(){e=d("style"),e.textContent='@import url("https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css");\r\n        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css");'},m(t,n){$(t,e,n)},d(t){t&&u(e)}}}function W(t){let e;return{c(){e=d("style"),e.textContent='@import "./dist/bootstrap/css/bootstrap.min.css";\r\n        @import "./dist/bootstrap-icons/bootstrap-icons.css";\r\n        @import "./dist/global.css";'},m(t,n){$(t,e,n)},d(t){t&&u(e)}}}function X(e){let n,i,r,o,s,c,l,f=e[4]&&q(e),m=null!==e[5]&&D(e),g=(e[6]||e[1].length)&&G(e);function x(t,e){return t[0]?W:U}let y=x(e),_=y(e);return{c(){n=d("div"),i=d("div"),f&&f.c(),r=h(),m&&m.c(),o=h(),g&&g.c(),c=h(),_.c(),l=p(),b(i,"class","card-body p-2"),b(n,"id",e[2]),b(n,"class",s="card "+e[3])},m(t,e){$(t,n,e),a(n,i),f&&f.m(i,null),a(i,r),m&&m.m(i,null),a(i,o),g&&g.m(i,null),$(t,c,e),_.m(t,e),$(t,l,e)},p(t,[e]){t[4]?f?f.p(t,e):(f=q(t),f.c(),f.m(i,r)):f&&(f.d(1),f=null),null!==t[5]?m?m.p(t,e):(m=D(t),m.c(),m.m(i,o)):m&&(m.d(1),m=null),t[6]||t[1].length?g?g.p(t,e):(g=G(t),g.c(),g.m(i,null)):g&&(g.d(1),g=null),4&e&&b(n,"id",t[2]),8&e&&s!==(s="card "+t[3])&&b(n,"class",s),y!==(y=x(t))&&(_.d(1),_=y(t),_&&(_.c(),_.m(l.parentNode,l)))},i:t,o:t,d(t){t&&(u(n),u(c),u(l)),f&&f.d(),m&&m.d(),g&&g.d(),_.d(t)}}}function Y(t,e,n){let{id:i="dge-image"}=e,{klass:r=""}=e,{title:o=""}=e,{localcss:s=!1}=e,{src:c=null}=e,{legend:l=""}=e,{attribution:a=""}=e,{attribtionicon:$=!1}=e,{attribtiontext:u=!1}=e,{attribtionprefix:d=""}=e,{attribtionurl:f=!1}=e,{attribtionsize:h="1rem"}=e,{attribtioncolor:p=null}=e,{attribtiontitle:b=!1}=e;return x((()=>{})),t.$$set=t=>{"id"in t&&n(2,i=t.id),"klass"in t&&n(3,r=t.klass),"title"in t&&n(4,o=t.title),"localcss"in t&&n(0,s=t.localcss),"src"in t&&n(5,c=t.src),"legend"in t&&n(6,l=t.legend),"attribution"in t&&n(1,a=t.attribution),"attribtionicon"in t&&n(7,$=t.attribtionicon),"attribtiontext"in t&&n(8,u=t.attribtiontext),"attribtionprefix"in t&&n(9,d=t.attribtionprefix),"attribtionurl"in t&&n(10,f=t.attribtionurl),"attribtionsize"in t&&n(11,h=t.attribtionsize),"attribtioncolor"in t&&n(12,p=t.attribtioncolor),"attribtiontitle"in t&&n(13,b=t.attribtiontitle)},t.$$.update=()=>{if(1&t.$$.dirty&&n(0,s=V.checkValueFormat(s)),16258&t.$$.dirty){const t={icon:$,text:u||f,prefix:d,url:f,size:h,color:p,title:b||u},e=a?a.split("|"):[];n(1,a=e.map((e=>{const n=V.getJsonFromString(e,!1);return{...t,...n}})))}},[s,a,i,r,o,c,l,$,u,d,f,h,p,b]}class Z extends M{constructor(t){super(),P(this,t,Y,X,o,{id:2,klass:3,title:4,localcss:0,src:5,legend:6,attribution:1,attribtionicon:7,attribtiontext:8,attribtionprefix:9,attribtionurl:10,attribtionsize:11,attribtioncolor:12,attribtiontitle:13})}get id(){return this.$$.ctx[2]}set id(t){this.$$set({id:t}),O()}get klass(){return this.$$.ctx[3]}set klass(t){this.$$set({klass:t}),O()}get title(){return this.$$.ctx[4]}set title(t){this.$$set({title:t}),O()}get localcss(){return this.$$.ctx[0]}set localcss(t){this.$$set({localcss:t}),O()}get src(){return this.$$.ctx[5]}set src(t){this.$$set({src:t}),O()}get legend(){return this.$$.ctx[6]}set legend(t){this.$$set({legend:t}),O()}get attribution(){return this.$$.ctx[1]}set attribution(t){this.$$set({attribution:t}),O()}get attribtionicon(){return this.$$.ctx[7]}set attribtionicon(t){this.$$set({attribtionicon:t}),O()}get attribtiontext(){return this.$$.ctx[8]}set attribtiontext(t){this.$$set({attribtiontext:t}),O()}get attribtionprefix(){return this.$$.ctx[9]}set attribtionprefix(t){this.$$set({attribtionprefix:t}),O()}get attribtionurl(){return this.$$.ctx[10]}set attribtionurl(t){this.$$set({attribtionurl:t}),O()}get attribtionsize(){return this.$$.ctx[11]}set attribtionsize(t){this.$$set({attribtionsize:t}),O()}get attribtioncolor(){return this.$$.ctx[12]}set attribtioncolor(t){this.$$set({attribtioncolor:t}),O()}get attribtiontitle(){return this.$$.ctx[13]}set attribtiontitle(t){this.$$set({attribtiontitle:t}),O()}}customElements.define("dge-image",function(t,e,n,i,r,o){let s=class extends F{constructor(){super(t,n,r),this.$$p_d=e}static get observedAttributes(){return Object.keys(e).map((t=>(e[t].attribute||t).toLowerCase()))}};return Object.keys(e).forEach((t=>{Object.defineProperty(s.prototype,t,{get(){return this.$$c&&t in this.$$c?this.$$c[t]:this.$$d[t]},set(n){n=J(t,n,e),this.$$d[t]=n,this.$$c?.$set({[t]:n})}})})),i.forEach((t=>{Object.defineProperty(s.prototype,t,{get(){return this.$$c?.[t]}})})),o&&(s=o(s)),t.element=s,s}(Z,{id:{},klass:{},title:{},localcss:{type:"Boolean"},src:{},legend:{},attribution:{},attribtionicon:{type:"Boolean"},attribtiontext:{type:"Boolean"},attribtionprefix:{},attribtionurl:{type:"Boolean"},attribtionsize:{},attribtioncolor:{},attribtiontitle:{type:"Boolean"}},[],[],!0));export{Z as DGEImage};