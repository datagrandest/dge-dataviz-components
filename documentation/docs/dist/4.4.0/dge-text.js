!function(t,n){"object"==typeof exports&&"undefined"!=typeof module?n(exports):"function"==typeof define&&define.amd?define(["exports"],n):n((t="undefined"!=typeof globalThis?globalThis:t||self).DgeDatavizComponents={})}(this,(function(t){"use strict";function n(){}function e(t){return t()}function i(){return Object.create(null)}function o(t){t.forEach(e)}function r(t){return"function"==typeof t}function s(t,n){return t!=t?n==n:t!==n}function c(t,n){t.appendChild(n)}function u(t,n,e){t.insertBefore(n,e||null)}function l(t){t.parentNode.removeChild(t)}function a(t){return document.createElement(t)}function d(t){return document.createTextNode(t)}function f(){return d(" ")}function $(){return d("")}function p(t,n,e){null==e?t.removeAttribute(n):t.getAttribute(n)!==e&&t.setAttribute(n,e)}function b(t,n){n=""+n,t.wholeText!==n&&(t.data=n)}function h(t){const n={};for(const e of t)n[e.name]=e.value;return n}function m(t){const n={};return t.childNodes.forEach((t=>{n[t.slot||"default"]=!0})),n}let x;function g(t){x=t}function y(t){(function(){if(!x)throw new Error("Function called outside component initialization");return x})().$$.on_mount.push(t)}const _=[],v=[],z=[],k=[],E=Promise.resolve();let C=!1;function w(t){z.push(t)}const j=new Set;let T=0;function A(){const t=x;do{for(;T<_.length;){const t=_[T];T++,g(t),N(t.$$)}for(g(null),_.length=0,T=0;v.length;)v.pop()();for(let t=0;t<z.length;t+=1){const n=z[t];j.has(n)||(j.add(n),n())}z.length=0}while(_.length);for(;k.length;)k.pop()();C=!1,j.clear(),g(t)}function N(t){if(null!==t.fragment){t.update(),o(t.before_update);const n=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,n),t.after_update.forEach(w)}}const S=new Set;function F(t,n){-1===t.$$.dirty[0]&&(_.push(t),C||(C=!0,E.then(A)),t.$$.dirty.fill(0)),t.$$.dirty[n/31|0]|=1<<n%31}function M(t,s,c,u,a,d,f,$=[-1]){const p=x;g(t);const b=t.$$={fragment:null,ctx:null,props:d,update:n,not_equal:a,bound:i(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(s.context||(p?p.$$.context:[])),callbacks:i(),dirty:$,skip_bound:!1,root:s.target||p.$$.root};f&&f(b.root);let h=!1;if(b.ctx=c?c(t,s.props||{},((n,e,...i)=>{const o=i.length?i[0]:e;return b.ctx&&a(b.ctx[n],b.ctx[n]=o)&&(!b.skip_bound&&b.bound[n]&&b.bound[n](o),h&&F(t,n)),e})):[],b.update(),h=!0,o(b.before_update),b.fragment=!!u&&u(b.ctx),s.target){if(s.hydrate){const t=function(t){return Array.from(t.childNodes)}(s.target);b.fragment&&b.fragment.l(t),t.forEach(l)}else b.fragment&&b.fragment.c();s.intro&&((m=t.$$.fragment)&&m.i&&(S.delete(m),m.i(y))),function(t,n,i,s){const{fragment:c,on_mount:u,on_destroy:l,after_update:a}=t.$$;c&&c.m(n,i),s||w((()=>{const n=u.map(e).filter(r);l?l.push(...n):o(n),t.$$.on_mount=[]})),a.forEach(w)}(t,s.target,s.anchor,s.customElement),A()}var m,y;g(p)}let O;function D(t){return"true"==t||!("false"==t||!t)&&(/^[0-9\.]+$/.test(t)?parseFloat(t):t)}"function"==typeof HTMLElement&&(O=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}connectedCallback(){const{on_mount:t}=this.$$;this.$$.on_disconnect=t.map(e).filter(r);for(const t in this.$$.slotted)this.appendChild(this.$$.slotted[t])}attributeChangedCallback(t,n,e){this[t]=e}disconnectedCallback(){o(this.$$.on_disconnect)}$destroy(){!function(t,n){const e=t.$$;null!==e.fragment&&(o(e.on_destroy),e.fragment&&e.fragment.d(n),e.on_destroy=e.fragment=null,e.ctx=[])}(this,1),this.$destroy=n}$on(t,n){const e=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return e.push(n),()=>{const t=e.indexOf(n);-1!==t&&e.splice(t,1)}}$set(t){var n;this.$$set&&(n=t,0!==Object.keys(n).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}});var H={getJsonFromString:function(t,n){if(t&&("string"==typeof t||t instanceof String)){let n=t.split(";").map((t=>{const n=t.split(":")[0].trim();let e=t.split(":").slice(1).join(":").trim();return e=D(e),e="string"==typeof e?'"'+e+'"':e,'"'+n+'":'+e}));return JSON.parse("{"+n.join(",")+"}")}return n||!1},checkValueFormat:D};function J(t,n,e){const i=t.slice();return i[13]=n[e],i}function L(t){let n,e,i;return{c(){n=a("div"),e=a("h5"),i=d(t[3]),p(n,"class","title text-center")},m(t,o){u(t,n,o),c(n,e),c(e,i)},p(t,n){8&n&&b(i,t[3])},d(t){t&&l(n)}}}function P(t){let n,e;return{c(){n=a("div"),e=d(t[4]),p(n,"class","text mt-3 mb-1")},m(t,i){u(t,n,i),c(n,e)},p(t,n){16&n&&b(e,t[4])},d(t){t&&l(n)}}}function V(t){let n;return{c(){n=a("div"),n.innerHTML='<slot name="text"></slot>',p(n,"class","text mt-3 mb-1")},m(t,e){u(t,n,e)},d(t){t&&l(n)}}}function q(t){let n,e,i,o,r,s,h,m,x=t[13].prefix+"",g=t[13].icon&&B(t),y=t[13].text&&G(t);return{c(){n=a("span"),e=d(x),i=f(),o=a("a"),g&&g.c(),r=$(),y&&y.c(),m=f(),p(o,"href",s=t[13].url),p(o,"title",h=t[13].title||t[13].url||"Attribution"),p(o,"target","_blank"),p(n,"class","attribution me-1")},m(t,s){u(t,n,s),c(n,e),c(n,i),c(n,o),g&&g.m(o,null),c(o,r),y&&y.m(o,null),c(n,m)},p(t,n){2&n&&x!==(x=t[13].prefix+"")&&b(e,x),t[13].icon?g?g.p(t,n):(g=B(t),g.c(),g.m(o,r)):g&&(g.d(1),g=null),t[13].text?y?y.p(t,n):(y=G(t),y.c(),y.m(o,null)):y&&(y.d(1),y=null),2&n&&s!==(s=t[13].url)&&p(o,"href",s),2&n&&h!==(h=t[13].title||t[13].url||"Attribution")&&p(o,"title",h)},d(t){t&&l(n),g&&g.d(),y&&y.d()}}}function B(t){let n,e,i;return{c(){n=a("i"),p(n,"class",e="bi-"+t[13].icon),p(n,"style",i="font-size: "+t[13].size+"; color: "+t[13].color+";")},m(t,e){u(t,n,e)},p(t,o){2&o&&e!==(e="bi-"+t[13].icon)&&p(n,"class",e),2&o&&i!==(i="font-size: "+t[13].size+"; color: "+t[13].color+";")&&p(n,"style",i)},d(t){t&&l(n)}}}function G(t){let n,e=t[13].text+"";return{c(){n=d(e)},m(t,e){u(t,n,e)},p(t,i){2&i&&e!==(e=t[13].text+"")&&b(n,e)},d(t){t&&l(n)}}}function R(t){let n,e=(t[13].icon||t[13].text)&&q(t);return{c(){e&&e.c(),n=$()},m(t,i){e&&e.m(t,i),u(t,n,i)},p(t,i){t[13].icon||t[13].text?e?e.p(t,i):(e=q(t),e.c(),e.m(n.parentNode,n)):e&&(e.d(1),e=null)},d(t){e&&e.d(t),t&&l(n)}}}function I(t){let n;return{c(){n=a("style"),n.textContent='@import url("https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css");\r\n        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css");'},m(t,e){u(t,n,e)},d(t){t&&l(n)}}}function K(t){let n;return{c(){n=a("style"),n.textContent='@import "./dist/bootstrap/css/bootstrap.min.css";\r\n        @import "./dist/bootstrap-icons/bootstrap-icons.css";\r\n        @import "./dist/global.css";'},m(t,e){u(t,n,e)},d(t){t&&l(n)}}}function Q(t){let e,i,o,r,s,d,b,h,m,x=t[3]&&L(t),g=t[4]&&P(t),y=t[5].text&&V(),_=t[1],v=[];for(let n=0;n<_.length;n+=1)v[n]=R(J(t,_,n));function z(t,n){return t[0]?K:I}let k=z(t),E=k(t);return{c(){e=a("div"),i=a("div"),x&&x.c(),o=f(),g&&g.c(),r=f(),y&&y.c(),s=f(),d=a("div"),b=a("small");for(let t=0;t<v.length;t+=1)v[t].c();h=f(),E.c(),m=$(),this.c=n,p(b,"class","text-muted"),p(d,"class","text-end mt-2"),p(i,"class","card-body"),p(e,"id",t[2]),p(e,"class","card")},m(t,n){u(t,e,n),c(e,i),x&&x.m(i,null),c(i,o),g&&g.m(i,null),c(i,r),y&&y.m(i,null),c(i,s),c(i,d),c(d,b);for(let t=0;t<v.length;t+=1)v[t].m(b,null);u(t,h,n),E.m(t,n),u(t,m,n)},p(t,[n]){if(t[3]?x?x.p(t,n):(x=L(t),x.c(),x.m(i,o)):x&&(x.d(1),x=null),t[4]?g?g.p(t,n):(g=P(t),g.c(),g.m(i,r)):g&&(g.d(1),g=null),t[5].text?y||(y=V(),y.c(),y.m(i,s)):y&&(y.d(1),y=null),2&n){let e;for(_=t[1],e=0;e<_.length;e+=1){const i=J(t,_,e);v[e]?v[e].p(i,n):(v[e]=R(i),v[e].c(),v[e].m(b,null))}for(;e<v.length;e+=1)v[e].d(1);v.length=_.length}4&n&&p(e,"id",t[2]),k!==(k=z(t))&&(E.d(1),E=k(t),E&&(E.c(),E.m(m.parentNode,m)))},i:n,o:n,d(t){t&&l(e),x&&x.d(),g&&g.d(),y&&y.d(),function(t,n){for(let e=0;e<t.length;e+=1)t[e]&&t[e].d(n)}(v,t),t&&l(h),E.d(t),t&&l(m)}}}function U(t,n,e){let{$$slots:i={},$$scope:o}=n;const r=function(t){const n={};for(const e in t)n[e]=!0;return n}(i);let{id:s="dge-text"}=n,{title:c=""}=n,{text:u=null}=n,{localcss:l=!1}=n,{attribution:a=!1}=n,{attributionicon:d=!1}=n,{attributiontext:f=!1}=n,{attributionprefix:$=""}=n,{attributionurl:p=!1}=n,{attributionsize:b="1rem"}=n,{attributioncolor:h=null}=n,{attributiontitle:m=!1}=n;return y((()=>{})),t.$$set=t=>{"id"in t&&e(2,s=t.id),"title"in t&&e(3,c=t.title),"text"in t&&e(4,u=t.text),"localcss"in t&&e(0,l=t.localcss),"attribution"in t&&e(1,a=t.attribution),"attributionicon"in t&&e(6,d=t.attributionicon),"attributiontext"in t&&e(7,f=t.attributiontext),"attributionprefix"in t&&e(8,$=t.attributionprefix),"attributionurl"in t&&e(9,p=t.attributionurl),"attributionsize"in t&&e(10,b=t.attributionsize),"attributioncolor"in t&&e(11,h=t.attributioncolor),"attributiontitle"in t&&e(12,m=t.attributiontitle)},t.$$.update=()=>{if(1&t.$$.dirty&&e(0,l=H.checkValueFormat(l)),8130&t.$$.dirty){const t={icon:d,text:f||m||p,prefix:$,url:p,size:b,color:h,title:m||f},n=a?a.split("|"):[];e(1,a=n.map((n=>{const e=H.getJsonFromString(n,!1);return{...t,...e}})))}},[l,a,s,c,u,r,d,f,$,p,b,h,m]}class W extends O{constructor(t){super(),M(this,{target:this.shadowRoot,props:{...h(this.attributes),$$slots:m(this)},customElement:!0},U,Q,s,{id:2,title:3,text:4,localcss:0,attribution:1,attributionicon:6,attributiontext:7,attributionprefix:8,attributionurl:9,attributionsize:10,attributioncolor:11,attributiontitle:12},null),t&&(t.target&&u(t.target,this,t.anchor),t.props&&(this.$set(t.props),A()))}static get observedAttributes(){return["id","title","text","localcss","attribution","attributionicon","attributiontext","attributionprefix","attributionurl","attributionsize","attributioncolor","attributiontitle"]}get id(){return this.$$.ctx[2]}set id(t){this.$$set({id:t}),A()}get title(){return this.$$.ctx[3]}set title(t){this.$$set({title:t}),A()}get text(){return this.$$.ctx[4]}set text(t){this.$$set({text:t}),A()}get localcss(){return this.$$.ctx[0]}set localcss(t){this.$$set({localcss:t}),A()}get attribution(){return this.$$.ctx[1]}set attribution(t){this.$$set({attribution:t}),A()}get attributionicon(){return this.$$.ctx[6]}set attributionicon(t){this.$$set({attributionicon:t}),A()}get attributiontext(){return this.$$.ctx[7]}set attributiontext(t){this.$$set({attributiontext:t}),A()}get attributionprefix(){return this.$$.ctx[8]}set attributionprefix(t){this.$$set({attributionprefix:t}),A()}get attributionurl(){return this.$$.ctx[9]}set attributionurl(t){this.$$set({attributionurl:t}),A()}get attributionsize(){return this.$$.ctx[10]}set attributionsize(t){this.$$set({attributionsize:t}),A()}get attributioncolor(){return this.$$.ctx[11]}set attributioncolor(t){this.$$set({attributioncolor:t}),A()}get attributiontitle(){return this.$$.ctx[12]}set attributiontitle(t){this.$$set({attributiontitle:t}),A()}}customElements.define("dge-text",W),t.DGEText=W,Object.defineProperty(t,"__esModule",{value:!0})}));
