function noop() { }
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
let src_url_equal_anchor;
function src_url_equal(element_src, url) {
    if (!src_url_equal_anchor) {
        src_url_equal_anchor = document.createElement('a');
    }
    src_url_equal_anchor.href = url;
    return element_src === src_url_equal_anchor.href;
}
function not_equal(a, b) {
    return a != a ? b == b : a !== b;
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data)
        text.data = data;
}
function attribute_to_object(attributes) {
    const result = {};
    for (const attribute of attributes) {
        result[attribute.name] = attribute.value;
    }
    return result;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
let SvelteElement;
if (typeof HTMLElement === 'function') {
    SvelteElement = class extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
            const { on_mount } = this.$$;
            this.$$.on_disconnect = on_mount.map(run).filter(is_function);
            // @ts-ignore todo: improve typings
            for (const key in this.$$.slotted) {
                // @ts-ignore todo: improve typings
                this.appendChild(this.$$.slotted[key]);
            }
        }
        attributeChangedCallback(attr, _oldValue, newValue) {
            this[attr] = newValue;
        }
        disconnectedCallback() {
            run_all(this.$$.on_disconnect);
        }
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            // TODO should this delegate to addEventListener?
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    };
}

/* src\dataviz-v4\DGE-Image.svelte generated by Svelte v3.44.2 */

function create_if_block_3(ctx) {
	let div;
	let h5;
	let t;

	return {
		c() {
			div = element("div");
			h5 = element("h5");
			t = text(/*title*/ ctx[2]);
			attr(div, "class", "title text-center");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, h5);
			append(h5, t);
		},
		p(ctx, dirty) {
			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (27:8) {#if src !== null}
function create_if_block_2(ctx) {
	let div;
	let img;
	let img_src_value;
	let img_alt_value;

	return {
		c() {
			div = element("div");
			img = element("img");
			if (!src_url_equal(img.src, img_src_value = /*src*/ ctx[4])) attr(img, "src", img_src_value);
			attr(img, "class", "figure-img img-fluid rounded");
			attr(img, "alt", img_alt_value = /*legend*/ ctx[5] ? /*legend*/ ctx[5] : Error);
			attr(div, "class", "img");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, img);
		},
		p(ctx, dirty) {
			if (dirty & /*src*/ 16 && !src_url_equal(img.src, img_src_value = /*src*/ ctx[4])) {
				attr(img, "src", img_src_value);
			}

			if (dirty & /*legend*/ 32 && img_alt_value !== (img_alt_value = /*legend*/ ctx[5] ? /*legend*/ ctx[5] : Error)) {
				attr(img, "alt", img_alt_value);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (32:8) {#if legend || attribution[0]}
function create_if_block_1(ctx) {
	let div;
	let span0;
	let small0;
	let t0;
	let t1;
	let span1;
	let small1;
	let t2;
	let a0;
	let t3_value = /*attribution*/ ctx[0][0] + "";
	let t3;
	let a0_href_value;
	let t4;
	let a1;
	let t5;
	let t6;

	return {
		c() {
			div = element("div");
			span0 = element("span");
			small0 = element("small");
			t0 = text(/*legend*/ ctx[5]);
			t1 = space();
			span1 = element("span");
			small1 = element("small");
			t2 = text("Source: ");
			a0 = element("a");
			t3 = text(t3_value);
			t4 = text(" (");
			a1 = element("a");
			t5 = text("lien");
			t6 = text(")");
			attr(span0, "class", "text-left");
			attr(a0, "href", a0_href_value = /*attribution*/ ctx[0][1]);
			attr(a1, "href", /*src*/ ctx[4]);
			attr(small1, "class", "text-muted");
			attr(span1, "class", "attribution text-right");
			attr(div, "class", "text-muted d-flex justify-content-between");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span0);
			append(span0, small0);
			append(small0, t0);
			append(div, t1);
			append(div, span1);
			append(span1, small1);
			append(small1, t2);
			append(small1, a0);
			append(a0, t3);
			append(small1, t4);
			append(small1, a1);
			append(a1, t5);
			append(small1, t6);
		},
		p(ctx, dirty) {
			if (dirty & /*legend*/ 32) set_data(t0, /*legend*/ ctx[5]);
			if (dirty & /*attribution*/ 1 && t3_value !== (t3_value = /*attribution*/ ctx[0][0] + "")) set_data(t3, t3_value);

			if (dirty & /*attribution*/ 1 && a0_href_value !== (a0_href_value = /*attribution*/ ctx[0][1])) {
				attr(a0, "href", a0_href_value);
			}

			if (dirty & /*src*/ 16) {
				attr(a1, "href", /*src*/ ctx[4]);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (50:0) {:else}
function create_else_block(ctx) {
	let style;

	return {
		c() {
			style = element("style");
			style.textContent = "@import \"https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css\";";
		},
		m(target, anchor) {
			insert(target, style, anchor);
		},
		d(detaching) {
			if (detaching) detach(style);
		}
	};
}

// (45:0) {#if localcss}
function create_if_block(ctx) {
	let style;

	return {
		c() {
			style = element("style");
			style.textContent = "@import \"./dge-components/bootstrap/css/bootstrap.min.css\";\r\n        @import \"./dge-components/global.css\";";
		},
		m(target, anchor) {
			insert(target, style, anchor);
		},
		d(detaching) {
			if (detaching) detach(style);
		}
	};
}

function create_fragment(ctx) {
	let div1;
	let div0;
	let t0;
	let t1;
	let t2;
	let if_block3_anchor;
	let if_block0 = /*title*/ ctx[2] && create_if_block_3(ctx);
	let if_block1 = /*src*/ ctx[4] !== null && create_if_block_2(ctx);
	let if_block2 = (/*legend*/ ctx[5] || /*attribution*/ ctx[0][0]) && create_if_block_1(ctx);

	function select_block_type(ctx, dirty) {
		if (/*localcss*/ ctx[3]) return create_if_block;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block3 = current_block_type(ctx);

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			if (if_block0) if_block0.c();
			t0 = space();
			if (if_block1) if_block1.c();
			t1 = space();
			if (if_block2) if_block2.c();
			t2 = space();
			if_block3.c();
			if_block3_anchor = empty();
			this.c = noop;
			attr(div0, "class", "card-body p-2");
			attr(div1, "id", /*id*/ ctx[1]);
			attr(div1, "class", "card");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			if (if_block0) if_block0.m(div0, null);
			append(div0, t0);
			if (if_block1) if_block1.m(div0, null);
			append(div0, t1);
			if (if_block2) if_block2.m(div0, null);
			insert(target, t2, anchor);
			if_block3.m(target, anchor);
			insert(target, if_block3_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (/*title*/ ctx[2]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_3(ctx);
					if_block0.c();
					if_block0.m(div0, t0);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*src*/ ctx[4] !== null) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_2(ctx);
					if_block1.c();
					if_block1.m(div0, t1);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*legend*/ ctx[5] || /*attribution*/ ctx[0][0]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_1(ctx);
					if_block2.c();
					if_block2.m(div0, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (dirty & /*id*/ 2) {
				attr(div1, "id", /*id*/ ctx[1]);
			}

			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
				if_block3.d(1);
				if_block3 = current_block_type(ctx);

				if (if_block3) {
					if_block3.c();
					if_block3.m(if_block3_anchor.parentNode, if_block3_anchor);
				}
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (detaching) detach(t2);
			if_block3.d(detaching);
			if (detaching) detach(if_block3_anchor);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { id = false } = $$props;
	let { attribution = "" } = $$props;
	let { title = "" } = $$props;
	let { localcss = false } = $$props;
	let { src = null } = $$props;
	let { legend = "" } = $$props;

	onMount(() => {
		$$invalidate(0, attribution = attribution.split("|"));
	});

	$$self.$$set = $$props => {
		if ('id' in $$props) $$invalidate(1, id = $$props.id);
		if ('attribution' in $$props) $$invalidate(0, attribution = $$props.attribution);
		if ('title' in $$props) $$invalidate(2, title = $$props.title);
		if ('localcss' in $$props) $$invalidate(3, localcss = $$props.localcss);
		if ('src' in $$props) $$invalidate(4, src = $$props.src);
		if ('legend' in $$props) $$invalidate(5, legend = $$props.legend);
	};

	return [attribution, id, title, localcss, src, legend];
}

class DGE_Image extends SvelteElement {
	constructor(options) {
		super();

		init(
			this,
			{
				target: this.shadowRoot,
				props: attribute_to_object(this.attributes),
				customElement: true
			},
			instance,
			create_fragment,
			not_equal,
			{
				id: 1,
				attribution: 0,
				title: 2,
				localcss: 3,
				src: 4,
				legend: 5
			},
			null
		);

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}

			if (options.props) {
				this.$set(options.props);
				flush();
			}
		}
	}

	static get observedAttributes() {
		return ["id", "attribution", "title", "localcss", "src", "legend"];
	}

	get id() {
		return this.$$.ctx[1];
	}

	set id(id) {
		this.$$set({ id });
		flush();
	}

	get attribution() {
		return this.$$.ctx[0];
	}

	set attribution(attribution) {
		this.$$set({ attribution });
		flush();
	}

	get title() {
		return this.$$.ctx[2];
	}

	set title(title) {
		this.$$set({ title });
		flush();
	}

	get localcss() {
		return this.$$.ctx[3];
	}

	set localcss(localcss) {
		this.$$set({ localcss });
		flush();
	}

	get src() {
		return this.$$.ctx[4];
	}

	set src(src) {
		this.$$set({ src });
		flush();
	}

	get legend() {
		return this.$$.ctx[5];
	}

	set legend(legend) {
		this.$$set({ legend });
		flush();
	}
}

customElements.define("dge-image", DGE_Image);

export { DGE_Image as default };
