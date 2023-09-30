(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.DgeDatavizComponents = factory());
}(this, (function () { 'use strict';

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
    function not_equal(a, b) {
        return a != a ? b == b : a !== b;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function compute_slots(slots) {
        const result = {};
        for (const key in slots) {
            result[key] = true;
        }
        return result;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
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
    function get_custom_elements_slots(element) {
        const result = {};
        element.childNodes.forEach((node) => {
            result[node.slot || 'default'] = true;
        });
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
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
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
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
                start_hydrating();
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
            end_hydrating();
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

    /* src\dataviz-v4\DGE-Text.svelte generated by Svelte v3.38.3 */

    function create_if_block_4(ctx) {
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

    // (26:8) {#if text}
    function create_if_block_3(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*text*/ ctx[3]);
    			attr(div, "class", "text mt-3 mb-1");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*text*/ 8) set_data(t, /*text*/ ctx[3]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (31:8) {#if $$slots.text}
    function create_if_block_2(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.innerHTML = `<slot name="text"></slot>`;
    			attr(div, "class", "text mt-3 mb-1");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (37:8) {#if attribution[0]}
    function create_if_block_1(ctx) {
    	let div;
    	let span;
    	let small;
    	let t0;
    	let a;
    	let t1_value = /*attribution*/ ctx[0][0] + "";
    	let t1;
    	let a_href_value;

    	return {
    		c() {
    			div = element("div");
    			span = element("span");
    			small = element("small");
    			t0 = text("Source: ");
    			a = element("a");
    			t1 = text(t1_value);
    			attr(a, "href", a_href_value = /*attribution*/ ctx[0][1]);
    			attr(small, "class", "text-muted");
    			attr(span, "class", "attribution");
    			attr(div, "class", "text-muted text-right");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, span);
    			append(span, small);
    			append(small, t0);
    			append(small, a);
    			append(a, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*attribution*/ 1 && t1_value !== (t1_value = /*attribution*/ ctx[0][0] + "")) set_data(t1, t1_value);

    			if (dirty & /*attribution*/ 1 && a_href_value !== (a_href_value = /*attribution*/ ctx[0][1])) {
    				attr(a, "href", a_href_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (54:0) {:else}
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

    // (49:0) {#if localcss}
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
    	let t3;
    	let if_block4_anchor;
    	let if_block0 = /*title*/ ctx[2] && create_if_block_4(ctx);
    	let if_block1 = /*text*/ ctx[3] && create_if_block_3(ctx);
    	let if_block2 = /*$$slots*/ ctx[5].text && create_if_block_2();
    	let if_block3 = /*attribution*/ ctx[0][0] && create_if_block_1(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*localcss*/ ctx[4]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block4 = current_block_type(ctx);

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
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if_block4.c();
    			if_block4_anchor = empty();
    			this.c = noop;
    			attr(div0, "class", "card-body");
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
    			append(div0, t2);
    			if (if_block3) if_block3.m(div0, null);
    			insert(target, t3, anchor);
    			if_block4.m(target, anchor);
    			insert(target, if_block4_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (/*title*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(div0, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*text*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(div0, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*$$slots*/ ctx[5].text) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_2();
    					if_block2.c();
    					if_block2.m(div0, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*attribution*/ ctx[0][0]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_1(ctx);
    					if_block3.c();
    					if_block3.m(div0, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty & /*id*/ 2) {
    				attr(div1, "id", /*id*/ ctx[1]);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block4.d(1);
    				if_block4 = current_block_type(ctx);

    				if (if_block4) {
    					if_block4.c();
    					if_block4.m(if_block4_anchor.parentNode, if_block4_anchor);
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
    			if (if_block3) if_block3.d();
    			if (detaching) detach(t3);
    			if_block4.d(detaching);
    			if (detaching) detach(if_block4_anchor);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const $$slots = compute_slots(slots);
    	let { id = false } = $$props;
    	let { title = "" } = $$props;
    	let { text = null } = $$props;
    	let { attribution = "" } = $$props;
    	let { localcss = false } = $$props;

    	onMount(() => {
    		$$invalidate(0, attribution = attribution.split("|"));
    	});

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("title" in $$props) $$invalidate(2, title = $$props.title);
    		if ("text" in $$props) $$invalidate(3, text = $$props.text);
    		if ("attribution" in $$props) $$invalidate(0, attribution = $$props.attribution);
    		if ("localcss" in $$props) $$invalidate(4, localcss = $$props.localcss);
    	};

    	return [attribution, id, title, text, localcss, $$slots];
    }

    class DGE_Text extends SvelteElement {
    	constructor(options) {
    		super();

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: {
    					...attribute_to_object(this.attributes),
    					$$slots: get_custom_elements_slots(this)
    				},
    				customElement: true
    			},
    			instance,
    			create_fragment,
    			not_equal,
    			{
    				id: 1,
    				title: 2,
    				text: 3,
    				attribution: 0,
    				localcss: 4
    			}
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
    		return ["id", "title", "text", "attribution", "localcss"];
    	}

    	get id() {
    		return this.$$.ctx[1];
    	}

    	set id(id) {
    		this.$set({ id });
    		flush();
    	}

    	get title() {
    		return this.$$.ctx[2];
    	}

    	set title(title) {
    		this.$set({ title });
    		flush();
    	}

    	get text() {
    		return this.$$.ctx[3];
    	}

    	set text(text) {
    		this.$set({ text });
    		flush();
    	}

    	get attribution() {
    		return this.$$.ctx[0];
    	}

    	set attribution(attribution) {
    		this.$set({ attribution });
    		flush();
    	}

    	get localcss() {
    		return this.$$.ctx[4];
    	}

    	set localcss(localcss) {
    		this.$set({ localcss });
    		flush();
    	}
    }

    customElements.define("dge-text", DGE_Text);

    return DGE_Text;

})));
