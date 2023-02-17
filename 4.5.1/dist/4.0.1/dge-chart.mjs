function noop$1() { }
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
function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
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
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
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
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function select_option(select, value) {
    for (let i = 0; i < select.options.length; i += 1) {
        const option = select.options[i];
        if (option.__value === value) {
            option.selected = true;
            return;
        }
    }
    select.selectedIndex = -1; // no option should be selected
}
function select_value(select) {
    const selected_option = select.querySelector(':checked') || select.options[0];
    return selected_option && selected_option.__value;
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
        update: noop$1,
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
            this.$destroy = noop$1;
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

/*!
 * Chart.js v3.6.0
 * https://www.chartjs.org
 * (c) 2021 Chart.js Contributors
 * Released under the MIT License
 */
const requestAnimFrame = (function() {
  if (typeof window === 'undefined') {
    return function(callback) {
      return callback();
    };
  }
  return window.requestAnimationFrame;
}());
function throttled(fn, thisArg, updateFn) {
  const updateArgs = updateFn || ((args) => Array.prototype.slice.call(args));
  let ticking = false;
  let args = [];
  return function(...rest) {
    args = updateArgs(rest);
    if (!ticking) {
      ticking = true;
      requestAnimFrame.call(window, () => {
        ticking = false;
        fn.apply(thisArg, args);
      });
    }
  };
}
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    if (delay) {
      clearTimeout(timeout);
      timeout = setTimeout(fn, delay, args);
    } else {
      fn.apply(this, args);
    }
    return delay;
  };
}
const _toLeftRightCenter = (align) => align === 'start' ? 'left' : align === 'end' ? 'right' : 'center';
const _alignStartEnd = (align, start, end) => align === 'start' ? start : align === 'end' ? end : (start + end) / 2;
const _textX = (align, left, right, rtl) => {
  const check = rtl ? 'left' : 'right';
  return align === check ? right : align === 'center' ? (left + right) / 2 : left;
};

function noop() {}
const uid = (function() {
  let id = 0;
  return function() {
    return id++;
  };
}());
function isNullOrUndef(value) {
  return value === null || typeof value === 'undefined';
}
function isArray(value) {
  if (Array.isArray && Array.isArray(value)) {
    return true;
  }
  const type = Object.prototype.toString.call(value);
  if (type.substr(0, 7) === '[object' && type.substr(-6) === 'Array]') {
    return true;
  }
  return false;
}
function isObject(value) {
  return value !== null && Object.prototype.toString.call(value) === '[object Object]';
}
const isNumberFinite = (value) => (typeof value === 'number' || value instanceof Number) && isFinite(+value);
function finiteOrDefault(value, defaultValue) {
  return isNumberFinite(value) ? value : defaultValue;
}
function valueOrDefault(value, defaultValue) {
  return typeof value === 'undefined' ? defaultValue : value;
}
const toPercentage = (value, dimension) =>
  typeof value === 'string' && value.endsWith('%') ?
    parseFloat(value) / 100
    : value / dimension;
const toDimension = (value, dimension) =>
  typeof value === 'string' && value.endsWith('%') ?
    parseFloat(value) / 100 * dimension
    : +value;
function callback(fn, args, thisArg) {
  if (fn && typeof fn.call === 'function') {
    return fn.apply(thisArg, args);
  }
}
function each(loopable, fn, thisArg, reverse) {
  let i, len, keys;
  if (isArray(loopable)) {
    len = loopable.length;
    if (reverse) {
      for (i = len - 1; i >= 0; i--) {
        fn.call(thisArg, loopable[i], i);
      }
    } else {
      for (i = 0; i < len; i++) {
        fn.call(thisArg, loopable[i], i);
      }
    }
  } else if (isObject(loopable)) {
    keys = Object.keys(loopable);
    len = keys.length;
    for (i = 0; i < len; i++) {
      fn.call(thisArg, loopable[keys[i]], keys[i]);
    }
  }
}
function _elementsEqual(a0, a1) {
  let i, ilen, v0, v1;
  if (!a0 || !a1 || a0.length !== a1.length) {
    return false;
  }
  for (i = 0, ilen = a0.length; i < ilen; ++i) {
    v0 = a0[i];
    v1 = a1[i];
    if (v0.datasetIndex !== v1.datasetIndex || v0.index !== v1.index) {
      return false;
    }
  }
  return true;
}
function clone$1(source) {
  if (isArray(source)) {
    return source.map(clone$1);
  }
  if (isObject(source)) {
    const target = Object.create(null);
    const keys = Object.keys(source);
    const klen = keys.length;
    let k = 0;
    for (; k < klen; ++k) {
      target[keys[k]] = clone$1(source[keys[k]]);
    }
    return target;
  }
  return source;
}
function isValidKey(key) {
  return ['__proto__', 'prototype', 'constructor'].indexOf(key) === -1;
}
function _merger(key, target, source, options) {
  if (!isValidKey(key)) {
    return;
  }
  const tval = target[key];
  const sval = source[key];
  if (isObject(tval) && isObject(sval)) {
    merge(tval, sval, options);
  } else {
    target[key] = clone$1(sval);
  }
}
function merge(target, source, options) {
  const sources = isArray(source) ? source : [source];
  const ilen = sources.length;
  if (!isObject(target)) {
    return target;
  }
  options = options || {};
  const merger = options.merger || _merger;
  for (let i = 0; i < ilen; ++i) {
    source = sources[i];
    if (!isObject(source)) {
      continue;
    }
    const keys = Object.keys(source);
    for (let k = 0, klen = keys.length; k < klen; ++k) {
      merger(keys[k], target, source, options);
    }
  }
  return target;
}
function mergeIf(target, source) {
  return merge(target, source, {merger: _mergerIf});
}
function _mergerIf(key, target, source) {
  if (!isValidKey(key)) {
    return;
  }
  const tval = target[key];
  const sval = source[key];
  if (isObject(tval) && isObject(sval)) {
    mergeIf(tval, sval);
  } else if (!Object.prototype.hasOwnProperty.call(target, key)) {
    target[key] = clone$1(sval);
  }
}
const emptyString = '';
const dot = '.';
function indexOfDotOrLength(key, start) {
  const idx = key.indexOf(dot, start);
  return idx === -1 ? key.length : idx;
}
function resolveObjectKey(obj, key) {
  if (key === emptyString) {
    return obj;
  }
  let pos = 0;
  let idx = indexOfDotOrLength(key, pos);
  while (obj && idx > pos) {
    obj = obj[key.substr(pos, idx - pos)];
    pos = idx + 1;
    idx = indexOfDotOrLength(key, pos);
  }
  return obj;
}
function _capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
const defined = (value) => typeof value !== 'undefined';
const isFunction = (value) => typeof value === 'function';
const setsEqual = (a, b) => {
  if (a.size !== b.size) {
    return false;
  }
  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }
  return true;
};

const PI = Math.PI;
const TAU = 2 * PI;
const PITAU = TAU + PI;
const INFINITY = Number.POSITIVE_INFINITY;
const RAD_PER_DEG = PI / 180;
const HALF_PI = PI / 2;
const QUARTER_PI = PI / 4;
const TWO_THIRDS_PI = PI * 2 / 3;
const log10 = Math.log10;
const sign = Math.sign;
function niceNum(range) {
  const roundedRange = Math.round(range);
  range = almostEquals(range, roundedRange, range / 1000) ? roundedRange : range;
  const niceRange = Math.pow(10, Math.floor(log10(range)));
  const fraction = range / niceRange;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * niceRange;
}
function _factorize(value) {
  const result = [];
  const sqrt = Math.sqrt(value);
  let i;
  for (i = 1; i < sqrt; i++) {
    if (value % i === 0) {
      result.push(i);
      result.push(value / i);
    }
  }
  if (sqrt === (sqrt | 0)) {
    result.push(sqrt);
  }
  result.sort((a, b) => a - b).pop();
  return result;
}
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
function almostEquals(x, y, epsilon) {
  return Math.abs(x - y) < epsilon;
}
function almostWhole(x, epsilon) {
  const rounded = Math.round(x);
  return ((rounded - epsilon) <= x) && ((rounded + epsilon) >= x);
}
function _setMinAndMaxByKey(array, target, property) {
  let i, ilen, value;
  for (i = 0, ilen = array.length; i < ilen; i++) {
    value = array[i][property];
    if (!isNaN(value)) {
      target.min = Math.min(target.min, value);
      target.max = Math.max(target.max, value);
    }
  }
}
function toRadians(degrees) {
  return degrees * (PI / 180);
}
function toDegrees(radians) {
  return radians * (180 / PI);
}
function _decimalPlaces(x) {
  if (!isNumberFinite(x)) {
    return;
  }
  let e = 1;
  let p = 0;
  while (Math.round(x * e) / e !== x) {
    e *= 10;
    p++;
  }
  return p;
}
function getAngleFromPoint(centrePoint, anglePoint) {
  const distanceFromXCenter = anglePoint.x - centrePoint.x;
  const distanceFromYCenter = anglePoint.y - centrePoint.y;
  const radialDistanceFromCenter = Math.sqrt(distanceFromXCenter * distanceFromXCenter + distanceFromYCenter * distanceFromYCenter);
  let angle = Math.atan2(distanceFromYCenter, distanceFromXCenter);
  if (angle < (-0.5 * PI)) {
    angle += TAU;
  }
  return {
    angle,
    distance: radialDistanceFromCenter
  };
}
function distanceBetweenPoints(pt1, pt2) {
  return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
}
function _angleDiff(a, b) {
  return (a - b + PITAU) % TAU - PI;
}
function _normalizeAngle(a) {
  return (a % TAU + TAU) % TAU;
}
function _angleBetween(angle, start, end, sameAngleIsFullCircle) {
  const a = _normalizeAngle(angle);
  const s = _normalizeAngle(start);
  const e = _normalizeAngle(end);
  const angleToStart = _normalizeAngle(s - a);
  const angleToEnd = _normalizeAngle(e - a);
  const startToAngle = _normalizeAngle(a - s);
  const endToAngle = _normalizeAngle(a - e);
  return a === s || a === e || (sameAngleIsFullCircle && s === e)
    || (angleToStart > angleToEnd && startToAngle < endToAngle);
}
function _limitValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function _int16Range(value) {
  return _limitValue(value, -32768, 32767);
}

const atEdge = (t) => t === 0 || t === 1;
const elasticIn = (t, s, p) => -(Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * TAU / p));
const elasticOut = (t, s, p) => Math.pow(2, -10 * t) * Math.sin((t - s) * TAU / p) + 1;
const effects = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => -t * (t - 2),
  easeInOutQuad: t => ((t /= 0.5) < 1)
    ? 0.5 * t * t
    : -0.5 * ((--t) * (t - 2) - 1),
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (t -= 1) * t * t + 1,
  easeInOutCubic: t => ((t /= 0.5) < 1)
    ? 0.5 * t * t * t
    : 0.5 * ((t -= 2) * t * t + 2),
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => -((t -= 1) * t * t * t - 1),
  easeInOutQuart: t => ((t /= 0.5) < 1)
    ? 0.5 * t * t * t * t
    : -0.5 * ((t -= 2) * t * t * t - 2),
  easeInQuint: t => t * t * t * t * t,
  easeOutQuint: t => (t -= 1) * t * t * t * t + 1,
  easeInOutQuint: t => ((t /= 0.5) < 1)
    ? 0.5 * t * t * t * t * t
    : 0.5 * ((t -= 2) * t * t * t * t + 2),
  easeInSine: t => -Math.cos(t * HALF_PI) + 1,
  easeOutSine: t => Math.sin(t * HALF_PI),
  easeInOutSine: t => -0.5 * (Math.cos(PI * t) - 1),
  easeInExpo: t => (t === 0) ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => (t === 1) ? 1 : -Math.pow(2, -10 * t) + 1,
  easeInOutExpo: t => atEdge(t) ? t : t < 0.5
    ? 0.5 * Math.pow(2, 10 * (t * 2 - 1))
    : 0.5 * (-Math.pow(2, -10 * (t * 2 - 1)) + 2),
  easeInCirc: t => (t >= 1) ? t : -(Math.sqrt(1 - t * t) - 1),
  easeOutCirc: t => Math.sqrt(1 - (t -= 1) * t),
  easeInOutCirc: t => ((t /= 0.5) < 1)
    ? -0.5 * (Math.sqrt(1 - t * t) - 1)
    : 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1),
  easeInElastic: t => atEdge(t) ? t : elasticIn(t, 0.075, 0.3),
  easeOutElastic: t => atEdge(t) ? t : elasticOut(t, 0.075, 0.3),
  easeInOutElastic(t) {
    const s = 0.1125;
    const p = 0.45;
    return atEdge(t) ? t :
      t < 0.5
        ? 0.5 * elasticIn(t * 2, s, p)
        : 0.5 + 0.5 * elasticOut(t * 2 - 1, s, p);
  },
  easeInBack(t) {
    const s = 1.70158;
    return t * t * ((s + 1) * t - s);
  },
  easeOutBack(t) {
    const s = 1.70158;
    return (t -= 1) * t * ((s + 1) * t + s) + 1;
  },
  easeInOutBack(t) {
    let s = 1.70158;
    if ((t /= 0.5) < 1) {
      return 0.5 * (t * t * (((s *= (1.525)) + 1) * t - s));
    }
    return 0.5 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2);
  },
  easeInBounce: t => 1 - effects.easeOutBounce(1 - t),
  easeOutBounce(t) {
    const m = 7.5625;
    const d = 2.75;
    if (t < (1 / d)) {
      return m * t * t;
    }
    if (t < (2 / d)) {
      return m * (t -= (1.5 / d)) * t + 0.75;
    }
    if (t < (2.5 / d)) {
      return m * (t -= (2.25 / d)) * t + 0.9375;
    }
    return m * (t -= (2.625 / d)) * t + 0.984375;
  },
  easeInOutBounce: t => (t < 0.5)
    ? effects.easeInBounce(t * 2) * 0.5
    : effects.easeOutBounce(t * 2 - 1) * 0.5 + 0.5,
};

/*!
 * @kurkle/color v0.1.9
 * https://github.com/kurkle/color#readme
 * (c) 2020 Jukka Kurkela
 * Released under the MIT License
 */
const map$1 = {0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, a: 10, b: 11, c: 12, d: 13, e: 14, f: 15};
const hex = '0123456789ABCDEF';
const h1 = (b) => hex[b & 0xF];
const h2 = (b) => hex[(b & 0xF0) >> 4] + hex[b & 0xF];
const eq = (b) => (((b & 0xF0) >> 4) === (b & 0xF));
function isShort(v) {
	return eq(v.r) && eq(v.g) && eq(v.b) && eq(v.a);
}
function hexParse(str) {
	var len = str.length;
	var ret;
	if (str[0] === '#') {
		if (len === 4 || len === 5) {
			ret = {
				r: 255 & map$1[str[1]] * 17,
				g: 255 & map$1[str[2]] * 17,
				b: 255 & map$1[str[3]] * 17,
				a: len === 5 ? map$1[str[4]] * 17 : 255
			};
		} else if (len === 7 || len === 9) {
			ret = {
				r: map$1[str[1]] << 4 | map$1[str[2]],
				g: map$1[str[3]] << 4 | map$1[str[4]],
				b: map$1[str[5]] << 4 | map$1[str[6]],
				a: len === 9 ? (map$1[str[7]] << 4 | map$1[str[8]]) : 255
			};
		}
	}
	return ret;
}
function hexString(v) {
	var f = isShort(v) ? h1 : h2;
	return v
		? '#' + f(v.r) + f(v.g) + f(v.b) + (v.a < 255 ? f(v.a) : '')
		: v;
}
function round(v) {
	return v + 0.5 | 0;
}
const lim = (v, l, h) => Math.max(Math.min(v, h), l);
function p2b(v) {
	return lim(round(v * 2.55), 0, 255);
}
function n2b(v) {
	return lim(round(v * 255), 0, 255);
}
function b2n(v) {
	return lim(round(v / 2.55) / 100, 0, 1);
}
function n2p(v) {
	return lim(round(v * 100), 0, 100);
}
const RGB_RE = /^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;
function rgbParse(str) {
	const m = RGB_RE.exec(str);
	let a = 255;
	let r, g, b;
	if (!m) {
		return;
	}
	if (m[7] !== r) {
		const v = +m[7];
		a = 255 & (m[8] ? p2b(v) : v * 255);
	}
	r = +m[1];
	g = +m[3];
	b = +m[5];
	r = 255 & (m[2] ? p2b(r) : r);
	g = 255 & (m[4] ? p2b(g) : g);
	b = 255 & (m[6] ? p2b(b) : b);
	return {
		r: r,
		g: g,
		b: b,
		a: a
	};
}
function rgbString(v) {
	return v && (
		v.a < 255
			? `rgba(${v.r}, ${v.g}, ${v.b}, ${b2n(v.a)})`
			: `rgb(${v.r}, ${v.g}, ${v.b})`
	);
}
const HUE_RE = /^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;
function hsl2rgbn(h, s, l) {
	const a = s * Math.min(l, 1 - l);
	const f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
	return [f(0), f(8), f(4)];
}
function hsv2rgbn(h, s, v) {
	const f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
	return [f(5), f(3), f(1)];
}
function hwb2rgbn(h, w, b) {
	const rgb = hsl2rgbn(h, 1, 0.5);
	let i;
	if (w + b > 1) {
		i = 1 / (w + b);
		w *= i;
		b *= i;
	}
	for (i = 0; i < 3; i++) {
		rgb[i] *= 1 - w - b;
		rgb[i] += w;
	}
	return rgb;
}
function rgb2hsl(v) {
	const range = 255;
	const r = v.r / range;
	const g = v.g / range;
	const b = v.b / range;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	let h, s, d;
	if (max !== min) {
		d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		h = max === r
			? ((g - b) / d) + (g < b ? 6 : 0)
			: max === g
				? (b - r) / d + 2
				: (r - g) / d + 4;
		h = h * 60 + 0.5;
	}
	return [h | 0, s || 0, l];
}
function calln(f, a, b, c) {
	return (
		Array.isArray(a)
			? f(a[0], a[1], a[2])
			: f(a, b, c)
	).map(n2b);
}
function hsl2rgb(h, s, l) {
	return calln(hsl2rgbn, h, s, l);
}
function hwb2rgb(h, w, b) {
	return calln(hwb2rgbn, h, w, b);
}
function hsv2rgb(h, s, v) {
	return calln(hsv2rgbn, h, s, v);
}
function hue(h) {
	return (h % 360 + 360) % 360;
}
function hueParse(str) {
	const m = HUE_RE.exec(str);
	let a = 255;
	let v;
	if (!m) {
		return;
	}
	if (m[5] !== v) {
		a = m[6] ? p2b(+m[5]) : n2b(+m[5]);
	}
	const h = hue(+m[2]);
	const p1 = +m[3] / 100;
	const p2 = +m[4] / 100;
	if (m[1] === 'hwb') {
		v = hwb2rgb(h, p1, p2);
	} else if (m[1] === 'hsv') {
		v = hsv2rgb(h, p1, p2);
	} else {
		v = hsl2rgb(h, p1, p2);
	}
	return {
		r: v[0],
		g: v[1],
		b: v[2],
		a: a
	};
}
function rotate(v, deg) {
	var h = rgb2hsl(v);
	h[0] = hue(h[0] + deg);
	h = hsl2rgb(h);
	v.r = h[0];
	v.g = h[1];
	v.b = h[2];
}
function hslString(v) {
	if (!v) {
		return;
	}
	const a = rgb2hsl(v);
	const h = a[0];
	const s = n2p(a[1]);
	const l = n2p(a[2]);
	return v.a < 255
		? `hsla(${h}, ${s}%, ${l}%, ${b2n(v.a)})`
		: `hsl(${h}, ${s}%, ${l}%)`;
}
const map$1$1 = {
	x: 'dark',
	Z: 'light',
	Y: 're',
	X: 'blu',
	W: 'gr',
	V: 'medium',
	U: 'slate',
	A: 'ee',
	T: 'ol',
	S: 'or',
	B: 'ra',
	C: 'lateg',
	D: 'ights',
	R: 'in',
	Q: 'turquois',
	E: 'hi',
	P: 'ro',
	O: 'al',
	N: 'le',
	M: 'de',
	L: 'yello',
	F: 'en',
	K: 'ch',
	G: 'arks',
	H: 'ea',
	I: 'ightg',
	J: 'wh'
};
const names = {
	OiceXe: 'f0f8ff',
	antiquewEte: 'faebd7',
	aqua: 'ffff',
	aquamarRe: '7fffd4',
	azuY: 'f0ffff',
	beige: 'f5f5dc',
	bisque: 'ffe4c4',
	black: '0',
	blanKedOmond: 'ffebcd',
	Xe: 'ff',
	XeviTet: '8a2be2',
	bPwn: 'a52a2a',
	burlywood: 'deb887',
	caMtXe: '5f9ea0',
	KartYuse: '7fff00',
	KocTate: 'd2691e',
	cSO: 'ff7f50',
	cSnflowerXe: '6495ed',
	cSnsilk: 'fff8dc',
	crimson: 'dc143c',
	cyan: 'ffff',
	xXe: '8b',
	xcyan: '8b8b',
	xgTMnPd: 'b8860b',
	xWay: 'a9a9a9',
	xgYF: '6400',
	xgYy: 'a9a9a9',
	xkhaki: 'bdb76b',
	xmagFta: '8b008b',
	xTivegYF: '556b2f',
	xSange: 'ff8c00',
	xScEd: '9932cc',
	xYd: '8b0000',
	xsOmon: 'e9967a',
	xsHgYF: '8fbc8f',
	xUXe: '483d8b',
	xUWay: '2f4f4f',
	xUgYy: '2f4f4f',
	xQe: 'ced1',
	xviTet: '9400d3',
	dAppRk: 'ff1493',
	dApskyXe: 'bfff',
	dimWay: '696969',
	dimgYy: '696969',
	dodgerXe: '1e90ff',
	fiYbrick: 'b22222',
	flSOwEte: 'fffaf0',
	foYstWAn: '228b22',
	fuKsia: 'ff00ff',
	gaRsbSo: 'dcdcdc',
	ghostwEte: 'f8f8ff',
	gTd: 'ffd700',
	gTMnPd: 'daa520',
	Way: '808080',
	gYF: '8000',
	gYFLw: 'adff2f',
	gYy: '808080',
	honeyMw: 'f0fff0',
	hotpRk: 'ff69b4',
	RdianYd: 'cd5c5c',
	Rdigo: '4b0082',
	ivSy: 'fffff0',
	khaki: 'f0e68c',
	lavFMr: 'e6e6fa',
	lavFMrXsh: 'fff0f5',
	lawngYF: '7cfc00',
	NmoncEffon: 'fffacd',
	ZXe: 'add8e6',
	ZcSO: 'f08080',
	Zcyan: 'e0ffff',
	ZgTMnPdLw: 'fafad2',
	ZWay: 'd3d3d3',
	ZgYF: '90ee90',
	ZgYy: 'd3d3d3',
	ZpRk: 'ffb6c1',
	ZsOmon: 'ffa07a',
	ZsHgYF: '20b2aa',
	ZskyXe: '87cefa',
	ZUWay: '778899',
	ZUgYy: '778899',
	ZstAlXe: 'b0c4de',
	ZLw: 'ffffe0',
	lime: 'ff00',
	limegYF: '32cd32',
	lRF: 'faf0e6',
	magFta: 'ff00ff',
	maPon: '800000',
	VaquamarRe: '66cdaa',
	VXe: 'cd',
	VScEd: 'ba55d3',
	VpurpN: '9370db',
	VsHgYF: '3cb371',
	VUXe: '7b68ee',
	VsprRggYF: 'fa9a',
	VQe: '48d1cc',
	VviTetYd: 'c71585',
	midnightXe: '191970',
	mRtcYam: 'f5fffa',
	mistyPse: 'ffe4e1',
	moccasR: 'ffe4b5',
	navajowEte: 'ffdead',
	navy: '80',
	Tdlace: 'fdf5e6',
	Tive: '808000',
	TivedBb: '6b8e23',
	Sange: 'ffa500',
	SangeYd: 'ff4500',
	ScEd: 'da70d6',
	pOegTMnPd: 'eee8aa',
	pOegYF: '98fb98',
	pOeQe: 'afeeee',
	pOeviTetYd: 'db7093',
	papayawEp: 'ffefd5',
	pHKpuff: 'ffdab9',
	peru: 'cd853f',
	pRk: 'ffc0cb',
	plum: 'dda0dd',
	powMrXe: 'b0e0e6',
	purpN: '800080',
	YbeccapurpN: '663399',
	Yd: 'ff0000',
	Psybrown: 'bc8f8f',
	PyOXe: '4169e1',
	saddNbPwn: '8b4513',
	sOmon: 'fa8072',
	sandybPwn: 'f4a460',
	sHgYF: '2e8b57',
	sHshell: 'fff5ee',
	siFna: 'a0522d',
	silver: 'c0c0c0',
	skyXe: '87ceeb',
	UXe: '6a5acd',
	UWay: '708090',
	UgYy: '708090',
	snow: 'fffafa',
	sprRggYF: 'ff7f',
	stAlXe: '4682b4',
	tan: 'd2b48c',
	teO: '8080',
	tEstN: 'd8bfd8',
	tomato: 'ff6347',
	Qe: '40e0d0',
	viTet: 'ee82ee',
	JHt: 'f5deb3',
	wEte: 'ffffff',
	wEtesmoke: 'f5f5f5',
	Lw: 'ffff00',
	LwgYF: '9acd32'
};
function unpack() {
	const unpacked = {};
	const keys = Object.keys(names);
	const tkeys = Object.keys(map$1$1);
	let i, j, k, ok, nk;
	for (i = 0; i < keys.length; i++) {
		ok = nk = keys[i];
		for (j = 0; j < tkeys.length; j++) {
			k = tkeys[j];
			nk = nk.replace(k, map$1$1[k]);
		}
		k = parseInt(names[ok], 16);
		unpacked[nk] = [k >> 16 & 0xFF, k >> 8 & 0xFF, k & 0xFF];
	}
	return unpacked;
}
let names$1;
function nameParse(str) {
	if (!names$1) {
		names$1 = unpack();
		names$1.transparent = [0, 0, 0, 0];
	}
	const a = names$1[str.toLowerCase()];
	return a && {
		r: a[0],
		g: a[1],
		b: a[2],
		a: a.length === 4 ? a[3] : 255
	};
}
function modHSL(v, i, ratio) {
	if (v) {
		let tmp = rgb2hsl(v);
		tmp[i] = Math.max(0, Math.min(tmp[i] + tmp[i] * ratio, i === 0 ? 360 : 1));
		tmp = hsl2rgb(tmp);
		v.r = tmp[0];
		v.g = tmp[1];
		v.b = tmp[2];
	}
}
function clone(v, proto) {
	return v ? Object.assign(proto || {}, v) : v;
}
function fromObject(input) {
	var v = {r: 0, g: 0, b: 0, a: 255};
	if (Array.isArray(input)) {
		if (input.length >= 3) {
			v = {r: input[0], g: input[1], b: input[2], a: 255};
			if (input.length > 3) {
				v.a = n2b(input[3]);
			}
		}
	} else {
		v = clone(input, {r: 0, g: 0, b: 0, a: 1});
		v.a = n2b(v.a);
	}
	return v;
}
function functionParse(str) {
	if (str.charAt(0) === 'r') {
		return rgbParse(str);
	}
	return hueParse(str);
}
class Color {
	constructor(input) {
		if (input instanceof Color) {
			return input;
		}
		const type = typeof input;
		let v;
		if (type === 'object') {
			v = fromObject(input);
		} else if (type === 'string') {
			v = hexParse(input) || nameParse(input) || functionParse(input);
		}
		this._rgb = v;
		this._valid = !!v;
	}
	get valid() {
		return this._valid;
	}
	get rgb() {
		var v = clone(this._rgb);
		if (v) {
			v.a = b2n(v.a);
		}
		return v;
	}
	set rgb(obj) {
		this._rgb = fromObject(obj);
	}
	rgbString() {
		return this._valid ? rgbString(this._rgb) : this._rgb;
	}
	hexString() {
		return this._valid ? hexString(this._rgb) : this._rgb;
	}
	hslString() {
		return this._valid ? hslString(this._rgb) : this._rgb;
	}
	mix(color, weight) {
		const me = this;
		if (color) {
			const c1 = me.rgb;
			const c2 = color.rgb;
			let w2;
			const p = weight === w2 ? 0.5 : weight;
			const w = 2 * p - 1;
			const a = c1.a - c2.a;
			const w1 = ((w * a === -1 ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
			w2 = 1 - w1;
			c1.r = 0xFF & w1 * c1.r + w2 * c2.r + 0.5;
			c1.g = 0xFF & w1 * c1.g + w2 * c2.g + 0.5;
			c1.b = 0xFF & w1 * c1.b + w2 * c2.b + 0.5;
			c1.a = p * c1.a + (1 - p) * c2.a;
			me.rgb = c1;
		}
		return me;
	}
	clone() {
		return new Color(this.rgb);
	}
	alpha(a) {
		this._rgb.a = n2b(a);
		return this;
	}
	clearer(ratio) {
		const rgb = this._rgb;
		rgb.a *= 1 - ratio;
		return this;
	}
	greyscale() {
		const rgb = this._rgb;
		const val = round(rgb.r * 0.3 + rgb.g * 0.59 + rgb.b * 0.11);
		rgb.r = rgb.g = rgb.b = val;
		return this;
	}
	opaquer(ratio) {
		const rgb = this._rgb;
		rgb.a *= 1 + ratio;
		return this;
	}
	negate() {
		const v = this._rgb;
		v.r = 255 - v.r;
		v.g = 255 - v.g;
		v.b = 255 - v.b;
		return this;
	}
	lighten(ratio) {
		modHSL(this._rgb, 2, ratio);
		return this;
	}
	darken(ratio) {
		modHSL(this._rgb, 2, -ratio);
		return this;
	}
	saturate(ratio) {
		modHSL(this._rgb, 1, ratio);
		return this;
	}
	desaturate(ratio) {
		modHSL(this._rgb, 1, -ratio);
		return this;
	}
	rotate(deg) {
		rotate(this._rgb, deg);
		return this;
	}
}
function index_esm(input) {
	return new Color(input);
}

const isPatternOrGradient = (value) => value instanceof CanvasGradient || value instanceof CanvasPattern;
function color(value) {
  return isPatternOrGradient(value) ? value : index_esm(value);
}
function getHoverColor(value) {
  return isPatternOrGradient(value)
    ? value
    : index_esm(value).saturate(0.5).darken(0.1).hexString();
}

const overrides = Object.create(null);
const descriptors = Object.create(null);
function getScope$1(node, key) {
  if (!key) {
    return node;
  }
  const keys = key.split('.');
  for (let i = 0, n = keys.length; i < n; ++i) {
    const k = keys[i];
    node = node[k] || (node[k] = Object.create(null));
  }
  return node;
}
function set(root, scope, values) {
  if (typeof scope === 'string') {
    return merge(getScope$1(root, scope), values);
  }
  return merge(getScope$1(root, ''), scope);
}
class Defaults {
  constructor(_descriptors) {
    this.animation = undefined;
    this.backgroundColor = 'rgba(0,0,0,0.1)';
    this.borderColor = 'rgba(0,0,0,0.1)';
    this.color = '#666';
    this.datasets = {};
    this.devicePixelRatio = (context) => context.chart.platform.getDevicePixelRatio();
    this.elements = {};
    this.events = [
      'mousemove',
      'mouseout',
      'click',
      'touchstart',
      'touchmove'
    ];
    this.font = {
      family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
      size: 12,
      style: 'normal',
      lineHeight: 1.2,
      weight: null
    };
    this.hover = {};
    this.hoverBackgroundColor = (ctx, options) => getHoverColor(options.backgroundColor);
    this.hoverBorderColor = (ctx, options) => getHoverColor(options.borderColor);
    this.hoverColor = (ctx, options) => getHoverColor(options.color);
    this.indexAxis = 'x';
    this.interaction = {
      mode: 'nearest',
      intersect: true
    };
    this.maintainAspectRatio = true;
    this.onHover = null;
    this.onClick = null;
    this.parsing = true;
    this.plugins = {};
    this.responsive = true;
    this.scale = undefined;
    this.scales = {};
    this.showLine = true;
    this.describe(_descriptors);
  }
  set(scope, values) {
    return set(this, scope, values);
  }
  get(scope) {
    return getScope$1(this, scope);
  }
  describe(scope, values) {
    return set(descriptors, scope, values);
  }
  override(scope, values) {
    return set(overrides, scope, values);
  }
  route(scope, name, targetScope, targetName) {
    const scopeObject = getScope$1(this, scope);
    const targetScopeObject = getScope$1(this, targetScope);
    const privateName = '_' + name;
    Object.defineProperties(scopeObject, {
      [privateName]: {
        value: scopeObject[name],
        writable: true
      },
      [name]: {
        enumerable: true,
        get() {
          const local = this[privateName];
          const target = targetScopeObject[targetName];
          if (isObject(local)) {
            return Object.assign({}, target, local);
          }
          return valueOrDefault(local, target);
        },
        set(value) {
          this[privateName] = value;
        }
      }
    });
  }
}
var defaults$1 = new Defaults({
  _scriptable: (name) => !name.startsWith('on'),
  _indexable: (name) => name !== 'events',
  hover: {
    _fallback: 'interaction'
  },
  interaction: {
    _scriptable: false,
    _indexable: false,
  }
});

function toFontString(font) {
  if (!font || isNullOrUndef(font.size) || isNullOrUndef(font.family)) {
    return null;
  }
  return (font.style ? font.style + ' ' : '')
		+ (font.weight ? font.weight + ' ' : '')
		+ font.size + 'px '
		+ font.family;
}
function _measureText(ctx, data, gc, longest, string) {
  let textWidth = data[string];
  if (!textWidth) {
    textWidth = data[string] = ctx.measureText(string).width;
    gc.push(string);
  }
  if (textWidth > longest) {
    longest = textWidth;
  }
  return longest;
}
function _longestText(ctx, font, arrayOfThings, cache) {
  cache = cache || {};
  let data = cache.data = cache.data || {};
  let gc = cache.garbageCollect = cache.garbageCollect || [];
  if (cache.font !== font) {
    data = cache.data = {};
    gc = cache.garbageCollect = [];
    cache.font = font;
  }
  ctx.save();
  ctx.font = font;
  let longest = 0;
  const ilen = arrayOfThings.length;
  let i, j, jlen, thing, nestedThing;
  for (i = 0; i < ilen; i++) {
    thing = arrayOfThings[i];
    if (thing !== undefined && thing !== null && isArray(thing) !== true) {
      longest = _measureText(ctx, data, gc, longest, thing);
    } else if (isArray(thing)) {
      for (j = 0, jlen = thing.length; j < jlen; j++) {
        nestedThing = thing[j];
        if (nestedThing !== undefined && nestedThing !== null && !isArray(nestedThing)) {
          longest = _measureText(ctx, data, gc, longest, nestedThing);
        }
      }
    }
  }
  ctx.restore();
  const gcLen = gc.length / 2;
  if (gcLen > arrayOfThings.length) {
    for (i = 0; i < gcLen; i++) {
      delete data[gc[i]];
    }
    gc.splice(0, gcLen);
  }
  return longest;
}
function _alignPixel(chart, pixel, width) {
  const devicePixelRatio = chart.currentDevicePixelRatio;
  const halfWidth = width !== 0 ? Math.max(width / 2, 0.5) : 0;
  return Math.round((pixel - halfWidth) * devicePixelRatio) / devicePixelRatio + halfWidth;
}
function clearCanvas(canvas, ctx) {
  ctx = ctx || canvas.getContext('2d');
  ctx.save();
  ctx.resetTransform();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
function drawPoint(ctx, options, x, y) {
  let type, xOffset, yOffset, size, cornerRadius;
  const style = options.pointStyle;
  const rotation = options.rotation;
  const radius = options.radius;
  let rad = (rotation || 0) * RAD_PER_DEG;
  if (style && typeof style === 'object') {
    type = style.toString();
    if (type === '[object HTMLImageElement]' || type === '[object HTMLCanvasElement]') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rad);
      ctx.drawImage(style, -style.width / 2, -style.height / 2, style.width, style.height);
      ctx.restore();
      return;
    }
  }
  if (isNaN(radius) || radius <= 0) {
    return;
  }
  ctx.beginPath();
  switch (style) {
  default:
    ctx.arc(x, y, radius, 0, TAU);
    ctx.closePath();
    break;
  case 'triangle':
    ctx.moveTo(x + Math.sin(rad) * radius, y - Math.cos(rad) * radius);
    rad += TWO_THIRDS_PI;
    ctx.lineTo(x + Math.sin(rad) * radius, y - Math.cos(rad) * radius);
    rad += TWO_THIRDS_PI;
    ctx.lineTo(x + Math.sin(rad) * radius, y - Math.cos(rad) * radius);
    ctx.closePath();
    break;
  case 'rectRounded':
    cornerRadius = radius * 0.516;
    size = radius - cornerRadius;
    xOffset = Math.cos(rad + QUARTER_PI) * size;
    yOffset = Math.sin(rad + QUARTER_PI) * size;
    ctx.arc(x - xOffset, y - yOffset, cornerRadius, rad - PI, rad - HALF_PI);
    ctx.arc(x + yOffset, y - xOffset, cornerRadius, rad - HALF_PI, rad);
    ctx.arc(x + xOffset, y + yOffset, cornerRadius, rad, rad + HALF_PI);
    ctx.arc(x - yOffset, y + xOffset, cornerRadius, rad + HALF_PI, rad + PI);
    ctx.closePath();
    break;
  case 'rect':
    if (!rotation) {
      size = Math.SQRT1_2 * radius;
      ctx.rect(x - size, y - size, 2 * size, 2 * size);
      break;
    }
    rad += QUARTER_PI;
  case 'rectRot':
    xOffset = Math.cos(rad) * radius;
    yOffset = Math.sin(rad) * radius;
    ctx.moveTo(x - xOffset, y - yOffset);
    ctx.lineTo(x + yOffset, y - xOffset);
    ctx.lineTo(x + xOffset, y + yOffset);
    ctx.lineTo(x - yOffset, y + xOffset);
    ctx.closePath();
    break;
  case 'crossRot':
    rad += QUARTER_PI;
  case 'cross':
    xOffset = Math.cos(rad) * radius;
    yOffset = Math.sin(rad) * radius;
    ctx.moveTo(x - xOffset, y - yOffset);
    ctx.lineTo(x + xOffset, y + yOffset);
    ctx.moveTo(x + yOffset, y - xOffset);
    ctx.lineTo(x - yOffset, y + xOffset);
    break;
  case 'star':
    xOffset = Math.cos(rad) * radius;
    yOffset = Math.sin(rad) * radius;
    ctx.moveTo(x - xOffset, y - yOffset);
    ctx.lineTo(x + xOffset, y + yOffset);
    ctx.moveTo(x + yOffset, y - xOffset);
    ctx.lineTo(x - yOffset, y + xOffset);
    rad += QUARTER_PI;
    xOffset = Math.cos(rad) * radius;
    yOffset = Math.sin(rad) * radius;
    ctx.moveTo(x - xOffset, y - yOffset);
    ctx.lineTo(x + xOffset, y + yOffset);
    ctx.moveTo(x + yOffset, y - xOffset);
    ctx.lineTo(x - yOffset, y + xOffset);
    break;
  case 'line':
    xOffset = Math.cos(rad) * radius;
    yOffset = Math.sin(rad) * radius;
    ctx.moveTo(x - xOffset, y - yOffset);
    ctx.lineTo(x + xOffset, y + yOffset);
    break;
  case 'dash':
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(rad) * radius, y + Math.sin(rad) * radius);
    break;
  }
  ctx.fill();
  if (options.borderWidth > 0) {
    ctx.stroke();
  }
}
function _isPointInArea(point, area, margin) {
  margin = margin || 0.5;
  return !area || (point && point.x > area.left - margin && point.x < area.right + margin &&
		point.y > area.top - margin && point.y < area.bottom + margin);
}
function clipArea(ctx, area) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
  ctx.clip();
}
function unclipArea(ctx) {
  ctx.restore();
}
function _steppedLineTo(ctx, previous, target, flip, mode) {
  if (!previous) {
    return ctx.lineTo(target.x, target.y);
  }
  if (mode === 'middle') {
    const midpoint = (previous.x + target.x) / 2.0;
    ctx.lineTo(midpoint, previous.y);
    ctx.lineTo(midpoint, target.y);
  } else if (mode === 'after' !== !!flip) {
    ctx.lineTo(previous.x, target.y);
  } else {
    ctx.lineTo(target.x, previous.y);
  }
  ctx.lineTo(target.x, target.y);
}
function _bezierCurveTo(ctx, previous, target, flip) {
  if (!previous) {
    return ctx.lineTo(target.x, target.y);
  }
  ctx.bezierCurveTo(
    flip ? previous.cp1x : previous.cp2x,
    flip ? previous.cp1y : previous.cp2y,
    flip ? target.cp2x : target.cp1x,
    flip ? target.cp2y : target.cp1y,
    target.x,
    target.y);
}
function renderText(ctx, text, x, y, font, opts = {}) {
  const lines = isArray(text) ? text : [text];
  const stroke = opts.strokeWidth > 0 && opts.strokeColor !== '';
  let i, line;
  ctx.save();
  ctx.font = font.string;
  setRenderOpts(ctx, opts);
  for (i = 0; i < lines.length; ++i) {
    line = lines[i];
    if (stroke) {
      if (opts.strokeColor) {
        ctx.strokeStyle = opts.strokeColor;
      }
      if (!isNullOrUndef(opts.strokeWidth)) {
        ctx.lineWidth = opts.strokeWidth;
      }
      ctx.strokeText(line, x, y, opts.maxWidth);
    }
    ctx.fillText(line, x, y, opts.maxWidth);
    decorateText(ctx, x, y, line, opts);
    y += font.lineHeight;
  }
  ctx.restore();
}
function setRenderOpts(ctx, opts) {
  if (opts.translation) {
    ctx.translate(opts.translation[0], opts.translation[1]);
  }
  if (!isNullOrUndef(opts.rotation)) {
    ctx.rotate(opts.rotation);
  }
  if (opts.color) {
    ctx.fillStyle = opts.color;
  }
  if (opts.textAlign) {
    ctx.textAlign = opts.textAlign;
  }
  if (opts.textBaseline) {
    ctx.textBaseline = opts.textBaseline;
  }
}
function decorateText(ctx, x, y, line, opts) {
  if (opts.strikethrough || opts.underline) {
    const metrics = ctx.measureText(line);
    const left = x - metrics.actualBoundingBoxLeft;
    const right = x + metrics.actualBoundingBoxRight;
    const top = y - metrics.actualBoundingBoxAscent;
    const bottom = y + metrics.actualBoundingBoxDescent;
    const yDecoration = opts.strikethrough ? (top + bottom) / 2 : bottom;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.lineWidth = opts.decorationWidth || 2;
    ctx.moveTo(left, yDecoration);
    ctx.lineTo(right, yDecoration);
    ctx.stroke();
  }
}
function addRoundedRectPath(ctx, rect) {
  const {x, y, w, h, radius} = rect;
  ctx.arc(x + radius.topLeft, y + radius.topLeft, radius.topLeft, -HALF_PI, PI, true);
  ctx.lineTo(x, y + h - radius.bottomLeft);
  ctx.arc(x + radius.bottomLeft, y + h - radius.bottomLeft, radius.bottomLeft, PI, HALF_PI, true);
  ctx.lineTo(x + w - radius.bottomRight, y + h);
  ctx.arc(x + w - radius.bottomRight, y + h - radius.bottomRight, radius.bottomRight, HALF_PI, 0, true);
  ctx.lineTo(x + w, y + radius.topRight);
  ctx.arc(x + w - radius.topRight, y + radius.topRight, radius.topRight, 0, -HALF_PI, true);
  ctx.lineTo(x + radius.topLeft, y);
}

const LINE_HEIGHT = new RegExp(/^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/);
const FONT_STYLE = new RegExp(/^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/);
function toLineHeight(value, size) {
  const matches = ('' + value).match(LINE_HEIGHT);
  if (!matches || matches[1] === 'normal') {
    return size * 1.2;
  }
  value = +matches[2];
  switch (matches[3]) {
  case 'px':
    return value;
  case '%':
    value /= 100;
    break;
  }
  return size * value;
}
const numberOrZero$1 = v => +v || 0;
function _readValueToProps(value, props) {
  const ret = {};
  const objProps = isObject(props);
  const keys = objProps ? Object.keys(props) : props;
  const read = isObject(value)
    ? objProps
      ? prop => valueOrDefault(value[prop], value[props[prop]])
      : prop => value[prop]
    : () => value;
  for (const prop of keys) {
    ret[prop] = numberOrZero$1(read(prop));
  }
  return ret;
}
function toTRBL(value) {
  return _readValueToProps(value, {top: 'y', right: 'x', bottom: 'y', left: 'x'});
}
function toTRBLCorners(value) {
  return _readValueToProps(value, ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']);
}
function toPadding(value) {
  const obj = toTRBL(value);
  obj.width = obj.left + obj.right;
  obj.height = obj.top + obj.bottom;
  return obj;
}
function toFont(options, fallback) {
  options = options || {};
  fallback = fallback || defaults$1.font;
  let size = valueOrDefault(options.size, fallback.size);
  if (typeof size === 'string') {
    size = parseInt(size, 10);
  }
  let style = valueOrDefault(options.style, fallback.style);
  if (style && !('' + style).match(FONT_STYLE)) {
    console.warn('Invalid font style specified: "' + style + '"');
    style = '';
  }
  const font = {
    family: valueOrDefault(options.family, fallback.family),
    lineHeight: toLineHeight(valueOrDefault(options.lineHeight, fallback.lineHeight), size),
    size,
    style,
    weight: valueOrDefault(options.weight, fallback.weight),
    string: ''
  };
  font.string = toFontString(font);
  return font;
}
function resolve(inputs, context, index, info) {
  let cacheable = true;
  let i, ilen, value;
  for (i = 0, ilen = inputs.length; i < ilen; ++i) {
    value = inputs[i];
    if (value === undefined) {
      continue;
    }
    if (context !== undefined && typeof value === 'function') {
      value = value(context);
      cacheable = false;
    }
    if (index !== undefined && isArray(value)) {
      value = value[index % value.length];
      cacheable = false;
    }
    if (value !== undefined) {
      if (info && !cacheable) {
        info.cacheable = false;
      }
      return value;
    }
  }
}
function _addGrace(minmax, grace, beginAtZero) {
  const {min, max} = minmax;
  const change = toDimension(grace, (max - min) / 2);
  const keepZero = (value, add) => beginAtZero && value === 0 ? 0 : value + add;
  return {
    min: keepZero(min, -Math.abs(change)),
    max: keepZero(max, change)
  };
}
function createContext(parentContext, context) {
  return Object.assign(Object.create(parentContext), context);
}

function _lookup(table, value, cmp) {
  cmp = cmp || ((index) => table[index] < value);
  let hi = table.length - 1;
  let lo = 0;
  let mid;
  while (hi - lo > 1) {
    mid = (lo + hi) >> 1;
    if (cmp(mid)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return {lo, hi};
}
const _lookupByKey = (table, key, value) =>
  _lookup(table, value, index => table[index][key] < value);
const _rlookupByKey = (table, key, value) =>
  _lookup(table, value, index => table[index][key] >= value);
function _filterBetween(values, min, max) {
  let start = 0;
  let end = values.length;
  while (start < end && values[start] < min) {
    start++;
  }
  while (end > start && values[end - 1] > max) {
    end--;
  }
  return start > 0 || end < values.length
    ? values.slice(start, end)
    : values;
}
const arrayEvents = ['push', 'pop', 'shift', 'splice', 'unshift'];
function listenArrayEvents(array, listener) {
  if (array._chartjs) {
    array._chartjs.listeners.push(listener);
    return;
  }
  Object.defineProperty(array, '_chartjs', {
    configurable: true,
    enumerable: false,
    value: {
      listeners: [listener]
    }
  });
  arrayEvents.forEach((key) => {
    const method = '_onData' + _capitalize(key);
    const base = array[key];
    Object.defineProperty(array, key, {
      configurable: true,
      enumerable: false,
      value(...args) {
        const res = base.apply(this, args);
        array._chartjs.listeners.forEach((object) => {
          if (typeof object[method] === 'function') {
            object[method](...args);
          }
        });
        return res;
      }
    });
  });
}
function unlistenArrayEvents(array, listener) {
  const stub = array._chartjs;
  if (!stub) {
    return;
  }
  const listeners = stub.listeners;
  const index = listeners.indexOf(listener);
  if (index !== -1) {
    listeners.splice(index, 1);
  }
  if (listeners.length > 0) {
    return;
  }
  arrayEvents.forEach((key) => {
    delete array[key];
  });
  delete array._chartjs;
}
function _arrayUnique(items) {
  const set = new Set();
  let i, ilen;
  for (i = 0, ilen = items.length; i < ilen; ++i) {
    set.add(items[i]);
  }
  if (set.size === ilen) {
    return items;
  }
  return Array.from(set);
}

function _createResolver(scopes, prefixes = [''], rootScopes = scopes, fallback, getTarget = () => scopes[0]) {
  if (!defined(fallback)) {
    fallback = _resolve('_fallback', scopes);
  }
  const cache = {
    [Symbol.toStringTag]: 'Object',
    _cacheable: true,
    _scopes: scopes,
    _rootScopes: rootScopes,
    _fallback: fallback,
    _getTarget: getTarget,
    override: (scope) => _createResolver([scope, ...scopes], prefixes, rootScopes, fallback),
  };
  return new Proxy(cache, {
    deleteProperty(target, prop) {
      delete target[prop];
      delete target._keys;
      delete scopes[0][prop];
      return true;
    },
    get(target, prop) {
      return _cached(target, prop,
        () => _resolveWithPrefixes(prop, prefixes, scopes, target));
    },
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target._scopes[0], prop);
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(scopes[0]);
    },
    has(target, prop) {
      return getKeysFromAllScopes(target).includes(prop);
    },
    ownKeys(target) {
      return getKeysFromAllScopes(target);
    },
    set(target, prop, value) {
      const storage = target._storage || (target._storage = getTarget());
      storage[prop] = value;
      delete target[prop];
      delete target._keys;
      return true;
    }
  });
}
function _attachContext(proxy, context, subProxy, descriptorDefaults) {
  const cache = {
    _cacheable: false,
    _proxy: proxy,
    _context: context,
    _subProxy: subProxy,
    _stack: new Set(),
    _descriptors: _descriptors(proxy, descriptorDefaults),
    setContext: (ctx) => _attachContext(proxy, ctx, subProxy, descriptorDefaults),
    override: (scope) => _attachContext(proxy.override(scope), context, subProxy, descriptorDefaults)
  };
  return new Proxy(cache, {
    deleteProperty(target, prop) {
      delete target[prop];
      delete proxy[prop];
      return true;
    },
    get(target, prop, receiver) {
      return _cached(target, prop,
        () => _resolveWithContext(target, prop, receiver));
    },
    getOwnPropertyDescriptor(target, prop) {
      return target._descriptors.allKeys
        ? Reflect.has(proxy, prop) ? {enumerable: true, configurable: true} : undefined
        : Reflect.getOwnPropertyDescriptor(proxy, prop);
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(proxy);
    },
    has(target, prop) {
      return Reflect.has(proxy, prop);
    },
    ownKeys() {
      return Reflect.ownKeys(proxy);
    },
    set(target, prop, value) {
      proxy[prop] = value;
      delete target[prop];
      return true;
    }
  });
}
function _descriptors(proxy, defaults = {scriptable: true, indexable: true}) {
  const {_scriptable = defaults.scriptable, _indexable = defaults.indexable, _allKeys = defaults.allKeys} = proxy;
  return {
    allKeys: _allKeys,
    scriptable: _scriptable,
    indexable: _indexable,
    isScriptable: isFunction(_scriptable) ? _scriptable : () => _scriptable,
    isIndexable: isFunction(_indexable) ? _indexable : () => _indexable
  };
}
const readKey = (prefix, name) => prefix ? prefix + _capitalize(name) : name;
const needsSubResolver = (prop, value) => isObject(value) && prop !== 'adapters';
function _cached(target, prop, resolve) {
  if (Object.prototype.hasOwnProperty.call(target, prop)) {
    return target[prop];
  }
  const value = resolve();
  target[prop] = value;
  return value;
}
function _resolveWithContext(target, prop, receiver) {
  const {_proxy, _context, _subProxy, _descriptors: descriptors} = target;
  let value = _proxy[prop];
  if (isFunction(value) && descriptors.isScriptable(prop)) {
    value = _resolveScriptable(prop, value, target, receiver);
  }
  if (isArray(value) && value.length) {
    value = _resolveArray(prop, value, target, descriptors.isIndexable);
  }
  if (needsSubResolver(prop, value)) {
    value = _attachContext(value, _context, _subProxy && _subProxy[prop], descriptors);
  }
  return value;
}
function _resolveScriptable(prop, value, target, receiver) {
  const {_proxy, _context, _subProxy, _stack} = target;
  if (_stack.has(prop)) {
    throw new Error('Recursion detected: ' + Array.from(_stack).join('->') + '->' + prop);
  }
  _stack.add(prop);
  value = value(_context, _subProxy || receiver);
  _stack.delete(prop);
  if (isObject(value)) {
    value = createSubResolver(_proxy._scopes, _proxy, prop, value);
  }
  return value;
}
function _resolveArray(prop, value, target, isIndexable) {
  const {_proxy, _context, _subProxy, _descriptors: descriptors} = target;
  if (defined(_context.index) && isIndexable(prop)) {
    value = value[_context.index % value.length];
  } else if (isObject(value[0])) {
    const arr = value;
    const scopes = _proxy._scopes.filter(s => s !== arr);
    value = [];
    for (const item of arr) {
      const resolver = createSubResolver(scopes, _proxy, prop, item);
      value.push(_attachContext(resolver, _context, _subProxy && _subProxy[prop], descriptors));
    }
  }
  return value;
}
function resolveFallback(fallback, prop, value) {
  return isFunction(fallback) ? fallback(prop, value) : fallback;
}
const getScope = (key, parent) => key === true ? parent
  : typeof key === 'string' ? resolveObjectKey(parent, key) : undefined;
function addScopes(set, parentScopes, key, parentFallback) {
  for (const parent of parentScopes) {
    const scope = getScope(key, parent);
    if (scope) {
      set.add(scope);
      const fallback = resolveFallback(scope._fallback, key, scope);
      if (defined(fallback) && fallback !== key && fallback !== parentFallback) {
        return fallback;
      }
    } else if (scope === false && defined(parentFallback) && key !== parentFallback) {
      return null;
    }
  }
  return false;
}
function createSubResolver(parentScopes, resolver, prop, value) {
  const rootScopes = resolver._rootScopes;
  const fallback = resolveFallback(resolver._fallback, prop, value);
  const allScopes = [...parentScopes, ...rootScopes];
  const set = new Set();
  set.add(value);
  let key = addScopesFromKey(set, allScopes, prop, fallback || prop);
  if (key === null) {
    return false;
  }
  if (defined(fallback) && fallback !== prop) {
    key = addScopesFromKey(set, allScopes, fallback, key);
    if (key === null) {
      return false;
    }
  }
  return _createResolver(Array.from(set), [''], rootScopes, fallback,
    () => subGetTarget(resolver, prop, value));
}
function addScopesFromKey(set, allScopes, key, fallback) {
  while (key) {
    key = addScopes(set, allScopes, key, fallback);
  }
  return key;
}
function subGetTarget(resolver, prop, value) {
  const parent = resolver._getTarget();
  if (!(prop in parent)) {
    parent[prop] = {};
  }
  const target = parent[prop];
  if (isArray(target) && isObject(value)) {
    return value;
  }
  return target;
}
function _resolveWithPrefixes(prop, prefixes, scopes, proxy) {
  let value;
  for (const prefix of prefixes) {
    value = _resolve(readKey(prefix, prop), scopes);
    if (defined(value)) {
      return needsSubResolver(prop, value)
        ? createSubResolver(scopes, proxy, prop, value)
        : value;
    }
  }
}
function _resolve(key, scopes) {
  for (const scope of scopes) {
    if (!scope) {
      continue;
    }
    const value = scope[key];
    if (defined(value)) {
      return value;
    }
  }
}
function getKeysFromAllScopes(target) {
  let keys = target._keys;
  if (!keys) {
    keys = target._keys = resolveKeysFromAllScopes(target._scopes);
  }
  return keys;
}
function resolveKeysFromAllScopes(scopes) {
  const set = new Set();
  for (const scope of scopes) {
    for (const key of Object.keys(scope).filter(k => !k.startsWith('_'))) {
      set.add(key);
    }
  }
  return Array.from(set);
}

const EPSILON = Number.EPSILON || 1e-14;
const getPoint = (points, i) => i < points.length && !points[i].skip && points[i];
const getValueAxis = (indexAxis) => indexAxis === 'x' ? 'y' : 'x';
function splineCurve(firstPoint, middlePoint, afterPoint, t) {
  const previous = firstPoint.skip ? middlePoint : firstPoint;
  const current = middlePoint;
  const next = afterPoint.skip ? middlePoint : afterPoint;
  const d01 = distanceBetweenPoints(current, previous);
  const d12 = distanceBetweenPoints(next, current);
  let s01 = d01 / (d01 + d12);
  let s12 = d12 / (d01 + d12);
  s01 = isNaN(s01) ? 0 : s01;
  s12 = isNaN(s12) ? 0 : s12;
  const fa = t * s01;
  const fb = t * s12;
  return {
    previous: {
      x: current.x - fa * (next.x - previous.x),
      y: current.y - fa * (next.y - previous.y)
    },
    next: {
      x: current.x + fb * (next.x - previous.x),
      y: current.y + fb * (next.y - previous.y)
    }
  };
}
function monotoneAdjust(points, deltaK, mK) {
  const pointsLen = points.length;
  let alphaK, betaK, tauK, squaredMagnitude, pointCurrent;
  let pointAfter = getPoint(points, 0);
  for (let i = 0; i < pointsLen - 1; ++i) {
    pointCurrent = pointAfter;
    pointAfter = getPoint(points, i + 1);
    if (!pointCurrent || !pointAfter) {
      continue;
    }
    if (almostEquals(deltaK[i], 0, EPSILON)) {
      mK[i] = mK[i + 1] = 0;
      continue;
    }
    alphaK = mK[i] / deltaK[i];
    betaK = mK[i + 1] / deltaK[i];
    squaredMagnitude = Math.pow(alphaK, 2) + Math.pow(betaK, 2);
    if (squaredMagnitude <= 9) {
      continue;
    }
    tauK = 3 / Math.sqrt(squaredMagnitude);
    mK[i] = alphaK * tauK * deltaK[i];
    mK[i + 1] = betaK * tauK * deltaK[i];
  }
}
function monotoneCompute(points, mK, indexAxis = 'x') {
  const valueAxis = getValueAxis(indexAxis);
  const pointsLen = points.length;
  let delta, pointBefore, pointCurrent;
  let pointAfter = getPoint(points, 0);
  for (let i = 0; i < pointsLen; ++i) {
    pointBefore = pointCurrent;
    pointCurrent = pointAfter;
    pointAfter = getPoint(points, i + 1);
    if (!pointCurrent) {
      continue;
    }
    const iPixel = pointCurrent[indexAxis];
    const vPixel = pointCurrent[valueAxis];
    if (pointBefore) {
      delta = (iPixel - pointBefore[indexAxis]) / 3;
      pointCurrent[`cp1${indexAxis}`] = iPixel - delta;
      pointCurrent[`cp1${valueAxis}`] = vPixel - delta * mK[i];
    }
    if (pointAfter) {
      delta = (pointAfter[indexAxis] - iPixel) / 3;
      pointCurrent[`cp2${indexAxis}`] = iPixel + delta;
      pointCurrent[`cp2${valueAxis}`] = vPixel + delta * mK[i];
    }
  }
}
function splineCurveMonotone(points, indexAxis = 'x') {
  const valueAxis = getValueAxis(indexAxis);
  const pointsLen = points.length;
  const deltaK = Array(pointsLen).fill(0);
  const mK = Array(pointsLen);
  let i, pointBefore, pointCurrent;
  let pointAfter = getPoint(points, 0);
  for (i = 0; i < pointsLen; ++i) {
    pointBefore = pointCurrent;
    pointCurrent = pointAfter;
    pointAfter = getPoint(points, i + 1);
    if (!pointCurrent) {
      continue;
    }
    if (pointAfter) {
      const slopeDelta = pointAfter[indexAxis] - pointCurrent[indexAxis];
      deltaK[i] = slopeDelta !== 0 ? (pointAfter[valueAxis] - pointCurrent[valueAxis]) / slopeDelta : 0;
    }
    mK[i] = !pointBefore ? deltaK[i]
      : !pointAfter ? deltaK[i - 1]
      : (sign(deltaK[i - 1]) !== sign(deltaK[i])) ? 0
      : (deltaK[i - 1] + deltaK[i]) / 2;
  }
  monotoneAdjust(points, deltaK, mK);
  monotoneCompute(points, mK, indexAxis);
}
function capControlPoint(pt, min, max) {
  return Math.max(Math.min(pt, max), min);
}
function capBezierPoints(points, area) {
  let i, ilen, point, inArea, inAreaPrev;
  let inAreaNext = _isPointInArea(points[0], area);
  for (i = 0, ilen = points.length; i < ilen; ++i) {
    inAreaPrev = inArea;
    inArea = inAreaNext;
    inAreaNext = i < ilen - 1 && _isPointInArea(points[i + 1], area);
    if (!inArea) {
      continue;
    }
    point = points[i];
    if (inAreaPrev) {
      point.cp1x = capControlPoint(point.cp1x, area.left, area.right);
      point.cp1y = capControlPoint(point.cp1y, area.top, area.bottom);
    }
    if (inAreaNext) {
      point.cp2x = capControlPoint(point.cp2x, area.left, area.right);
      point.cp2y = capControlPoint(point.cp2y, area.top, area.bottom);
    }
  }
}
function _updateBezierControlPoints(points, options, area, loop, indexAxis) {
  let i, ilen, point, controlPoints;
  if (options.spanGaps) {
    points = points.filter((pt) => !pt.skip);
  }
  if (options.cubicInterpolationMode === 'monotone') {
    splineCurveMonotone(points, indexAxis);
  } else {
    let prev = loop ? points[points.length - 1] : points[0];
    for (i = 0, ilen = points.length; i < ilen; ++i) {
      point = points[i];
      controlPoints = splineCurve(
        prev,
        point,
        points[Math.min(i + 1, ilen - (loop ? 0 : 1)) % ilen],
        options.tension
      );
      point.cp1x = controlPoints.previous.x;
      point.cp1y = controlPoints.previous.y;
      point.cp2x = controlPoints.next.x;
      point.cp2y = controlPoints.next.y;
      prev = point;
    }
  }
  if (options.capBezierPoints) {
    capBezierPoints(points, area);
  }
}

function _isDomSupported() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
function _getParentNode(domNode) {
  let parent = domNode.parentNode;
  if (parent && parent.toString() === '[object ShadowRoot]') {
    parent = parent.host;
  }
  return parent;
}
function parseMaxStyle(styleValue, node, parentProperty) {
  let valueInPixels;
  if (typeof styleValue === 'string') {
    valueInPixels = parseInt(styleValue, 10);
    if (styleValue.indexOf('%') !== -1) {
      valueInPixels = valueInPixels / 100 * node.parentNode[parentProperty];
    }
  } else {
    valueInPixels = styleValue;
  }
  return valueInPixels;
}
const getComputedStyle = (element) => window.getComputedStyle(element, null);
function getStyle(el, property) {
  return getComputedStyle(el).getPropertyValue(property);
}
const positions = ['top', 'right', 'bottom', 'left'];
function getPositionedStyle(styles, style, suffix) {
  const result = {};
  suffix = suffix ? '-' + suffix : '';
  for (let i = 0; i < 4; i++) {
    const pos = positions[i];
    result[pos] = parseFloat(styles[style + '-' + pos + suffix]) || 0;
  }
  result.width = result.left + result.right;
  result.height = result.top + result.bottom;
  return result;
}
const useOffsetPos = (x, y, target) => (x > 0 || y > 0) && (!target || !target.shadowRoot);
function getCanvasPosition(evt, canvas) {
  const e = evt.native || evt;
  const touches = e.touches;
  const source = touches && touches.length ? touches[0] : e;
  const {offsetX, offsetY} = source;
  let box = false;
  let x, y;
  if (useOffsetPos(offsetX, offsetY, e.target)) {
    x = offsetX;
    y = offsetY;
  } else {
    const rect = canvas.getBoundingClientRect();
    x = source.clientX - rect.left;
    y = source.clientY - rect.top;
    box = true;
  }
  return {x, y, box};
}
function getRelativePosition$1(evt, chart) {
  const {canvas, currentDevicePixelRatio} = chart;
  const style = getComputedStyle(canvas);
  const borderBox = style.boxSizing === 'border-box';
  const paddings = getPositionedStyle(style, 'padding');
  const borders = getPositionedStyle(style, 'border', 'width');
  const {x, y, box} = getCanvasPosition(evt, canvas);
  const xOffset = paddings.left + (box && borders.left);
  const yOffset = paddings.top + (box && borders.top);
  let {width, height} = chart;
  if (borderBox) {
    width -= paddings.width + borders.width;
    height -= paddings.height + borders.height;
  }
  return {
    x: Math.round((x - xOffset) / width * canvas.width / currentDevicePixelRatio),
    y: Math.round((y - yOffset) / height * canvas.height / currentDevicePixelRatio)
  };
}
function getContainerSize(canvas, width, height) {
  let maxWidth, maxHeight;
  if (width === undefined || height === undefined) {
    const container = _getParentNode(canvas);
    if (!container) {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
    } else {
      const rect = container.getBoundingClientRect();
      const containerStyle = getComputedStyle(container);
      const containerBorder = getPositionedStyle(containerStyle, 'border', 'width');
      const containerPadding = getPositionedStyle(containerStyle, 'padding');
      width = rect.width - containerPadding.width - containerBorder.width;
      height = rect.height - containerPadding.height - containerBorder.height;
      maxWidth = parseMaxStyle(containerStyle.maxWidth, container, 'clientWidth');
      maxHeight = parseMaxStyle(containerStyle.maxHeight, container, 'clientHeight');
    }
  }
  return {
    width,
    height,
    maxWidth: maxWidth || INFINITY,
    maxHeight: maxHeight || INFINITY
  };
}
const round1 = v => Math.round(v * 10) / 10;
function getMaximumSize(canvas, bbWidth, bbHeight, aspectRatio) {
  const style = getComputedStyle(canvas);
  const margins = getPositionedStyle(style, 'margin');
  const maxWidth = parseMaxStyle(style.maxWidth, canvas, 'clientWidth') || INFINITY;
  const maxHeight = parseMaxStyle(style.maxHeight, canvas, 'clientHeight') || INFINITY;
  const containerSize = getContainerSize(canvas, bbWidth, bbHeight);
  let {width, height} = containerSize;
  if (style.boxSizing === 'content-box') {
    const borders = getPositionedStyle(style, 'border', 'width');
    const paddings = getPositionedStyle(style, 'padding');
    width -= paddings.width + borders.width;
    height -= paddings.height + borders.height;
  }
  width = Math.max(0, width - margins.width);
  height = Math.max(0, aspectRatio ? Math.floor(width / aspectRatio) : height - margins.height);
  width = round1(Math.min(width, maxWidth, containerSize.maxWidth));
  height = round1(Math.min(height, maxHeight, containerSize.maxHeight));
  if (width && !height) {
    height = round1(width / 2);
  }
  return {
    width,
    height
  };
}
function retinaScale(chart, forceRatio, forceStyle) {
  const pixelRatio = forceRatio || 1;
  const deviceHeight = Math.floor(chart.height * pixelRatio);
  const deviceWidth = Math.floor(chart.width * pixelRatio);
  chart.height = deviceHeight / pixelRatio;
  chart.width = deviceWidth / pixelRatio;
  const canvas = chart.canvas;
  if (canvas.style && (forceStyle || (!canvas.style.height && !canvas.style.width))) {
    canvas.style.height = `${chart.height}px`;
    canvas.style.width = `${chart.width}px`;
  }
  if (chart.currentDevicePixelRatio !== pixelRatio
      || canvas.height !== deviceHeight
      || canvas.width !== deviceWidth) {
    chart.currentDevicePixelRatio = pixelRatio;
    canvas.height = deviceHeight;
    canvas.width = deviceWidth;
    chart.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return true;
  }
  return false;
}
const supportsEventListenerOptions = (function() {
  let passiveSupported = false;
  try {
    const options = {
      get passive() {
        passiveSupported = true;
        return false;
      }
    };
    window.addEventListener('test', null, options);
    window.removeEventListener('test', null, options);
  } catch (e) {
  }
  return passiveSupported;
}());
function readUsedSize(element, property) {
  const value = getStyle(element, property);
  const matches = value && value.match(/^(\d+)(\.\d+)?px$/);
  return matches ? +matches[1] : undefined;
}

function _pointInLine(p1, p2, t, mode) {
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y)
  };
}
function _steppedInterpolation(p1, p2, t, mode) {
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: mode === 'middle' ? t < 0.5 ? p1.y : p2.y
    : mode === 'after' ? t < 1 ? p1.y : p2.y
    : t > 0 ? p2.y : p1.y
  };
}
function _bezierInterpolation(p1, p2, t, mode) {
  const cp1 = {x: p1.cp2x, y: p1.cp2y};
  const cp2 = {x: p2.cp1x, y: p2.cp1y};
  const a = _pointInLine(p1, cp1, t);
  const b = _pointInLine(cp1, cp2, t);
  const c = _pointInLine(cp2, p2, t);
  const d = _pointInLine(a, b, t);
  const e = _pointInLine(b, c, t);
  return _pointInLine(d, e, t);
}

const intlCache = new Map();
function getNumberFormat(locale, options) {
  options = options || {};
  const cacheKey = locale + JSON.stringify(options);
  let formatter = intlCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    intlCache.set(cacheKey, formatter);
  }
  return formatter;
}
function formatNumber(num, locale, options) {
  return getNumberFormat(locale, options).format(num);
}

const getRightToLeftAdapter = function(rectX, width) {
  return {
    x(x) {
      return rectX + rectX + width - x;
    },
    setWidth(w) {
      width = w;
    },
    textAlign(align) {
      if (align === 'center') {
        return align;
      }
      return align === 'right' ? 'left' : 'right';
    },
    xPlus(x, value) {
      return x - value;
    },
    leftForLtr(x, itemWidth) {
      return x - itemWidth;
    },
  };
};
const getLeftToRightAdapter = function() {
  return {
    x(x) {
      return x;
    },
    setWidth(w) {
    },
    textAlign(align) {
      return align;
    },
    xPlus(x, value) {
      return x + value;
    },
    leftForLtr(x, _itemWidth) {
      return x;
    },
  };
};
function getRtlAdapter(rtl, rectX, width) {
  return rtl ? getRightToLeftAdapter(rectX, width) : getLeftToRightAdapter();
}
function overrideTextDirection(ctx, direction) {
  let style, original;
  if (direction === 'ltr' || direction === 'rtl') {
    style = ctx.canvas.style;
    original = [
      style.getPropertyValue('direction'),
      style.getPropertyPriority('direction'),
    ];
    style.setProperty('direction', direction, 'important');
    ctx.prevTextDirection = original;
  }
}
function restoreTextDirection(ctx, original) {
  if (original !== undefined) {
    delete ctx.prevTextDirection;
    ctx.canvas.style.setProperty('direction', original[0], original[1]);
  }
}

function propertyFn(property) {
  if (property === 'angle') {
    return {
      between: _angleBetween,
      compare: _angleDiff,
      normalize: _normalizeAngle,
    };
  }
  return {
    between: (n, s, e) => n >= Math.min(s, e) && n <= Math.max(e, s),
    compare: (a, b) => a - b,
    normalize: x => x
  };
}
function normalizeSegment({start, end, count, loop, style}) {
  return {
    start: start % count,
    end: end % count,
    loop: loop && (end - start + 1) % count === 0,
    style
  };
}
function getSegment(segment, points, bounds) {
  const {property, start: startBound, end: endBound} = bounds;
  const {between, normalize} = propertyFn(property);
  const count = points.length;
  let {start, end, loop} = segment;
  let i, ilen;
  if (loop) {
    start += count;
    end += count;
    for (i = 0, ilen = count; i < ilen; ++i) {
      if (!between(normalize(points[start % count][property]), startBound, endBound)) {
        break;
      }
      start--;
      end--;
    }
    start %= count;
    end %= count;
  }
  if (end < start) {
    end += count;
  }
  return {start, end, loop, style: segment.style};
}
function _boundSegment(segment, points, bounds) {
  if (!bounds) {
    return [segment];
  }
  const {property, start: startBound, end: endBound} = bounds;
  const count = points.length;
  const {compare, between, normalize} = propertyFn(property);
  const {start, end, loop, style} = getSegment(segment, points, bounds);
  const result = [];
  let inside = false;
  let subStart = null;
  let value, point, prevValue;
  const startIsBefore = () => between(startBound, prevValue, value) && compare(startBound, prevValue) !== 0;
  const endIsBefore = () => compare(endBound, value) === 0 || between(endBound, prevValue, value);
  const shouldStart = () => inside || startIsBefore();
  const shouldStop = () => !inside || endIsBefore();
  for (let i = start, prev = start; i <= end; ++i) {
    point = points[i % count];
    if (point.skip) {
      continue;
    }
    value = normalize(point[property]);
    if (value === prevValue) {
      continue;
    }
    inside = between(value, startBound, endBound);
    if (subStart === null && shouldStart()) {
      subStart = compare(value, startBound) === 0 ? i : prev;
    }
    if (subStart !== null && shouldStop()) {
      result.push(normalizeSegment({start: subStart, end: i, loop, count, style}));
      subStart = null;
    }
    prev = i;
    prevValue = value;
  }
  if (subStart !== null) {
    result.push(normalizeSegment({start: subStart, end, loop, count, style}));
  }
  return result;
}
function _boundSegments(line, bounds) {
  const result = [];
  const segments = line.segments;
  for (let i = 0; i < segments.length; i++) {
    const sub = _boundSegment(segments[i], line.points, bounds);
    if (sub.length) {
      result.push(...sub);
    }
  }
  return result;
}
function findStartAndEnd(points, count, loop, spanGaps) {
  let start = 0;
  let end = count - 1;
  if (loop && !spanGaps) {
    while (start < count && !points[start].skip) {
      start++;
    }
  }
  while (start < count && points[start].skip) {
    start++;
  }
  start %= count;
  if (loop) {
    end += start;
  }
  while (end > start && points[end % count].skip) {
    end--;
  }
  end %= count;
  return {start, end};
}
function solidSegments(points, start, max, loop) {
  const count = points.length;
  const result = [];
  let last = start;
  let prev = points[start];
  let end;
  for (end = start + 1; end <= max; ++end) {
    const cur = points[end % count];
    if (cur.skip || cur.stop) {
      if (!prev.skip) {
        loop = false;
        result.push({start: start % count, end: (end - 1) % count, loop});
        start = last = cur.stop ? end : null;
      }
    } else {
      last = end;
      if (prev.skip) {
        start = end;
      }
    }
    prev = cur;
  }
  if (last !== null) {
    result.push({start: start % count, end: last % count, loop});
  }
  return result;
}
function _computeSegments(line, segmentOptions) {
  const points = line.points;
  const spanGaps = line.options.spanGaps;
  const count = points.length;
  if (!count) {
    return [];
  }
  const loop = !!line._loop;
  const {start, end} = findStartAndEnd(points, count, loop, spanGaps);
  if (spanGaps === true) {
    return splitByStyles(line, [{start, end, loop}], points, segmentOptions);
  }
  const max = end < start ? end + count : end;
  const completeLoop = !!line._fullLoop && start === 0 && end === count - 1;
  return splitByStyles(line, solidSegments(points, start, max, completeLoop), points, segmentOptions);
}
function splitByStyles(line, segments, points, segmentOptions) {
  if (!segmentOptions || !segmentOptions.setContext || !points) {
    return segments;
  }
  return doSplitByStyles(line, segments, points, segmentOptions);
}
function doSplitByStyles(line, segments, points, segmentOptions) {
  const chartContext = line._chart.getContext();
  const baseStyle = readStyle(line.options);
  const {_datasetIndex: datasetIndex, options: {spanGaps}} = line;
  const count = points.length;
  const result = [];
  let prevStyle = baseStyle;
  let start = segments[0].start;
  let i = start;
  function addStyle(s, e, l, st) {
    const dir = spanGaps ? -1 : 1;
    if (s === e) {
      return;
    }
    s += count;
    while (points[s % count].skip) {
      s -= dir;
    }
    while (points[e % count].skip) {
      e += dir;
    }
    if (s % count !== e % count) {
      result.push({start: s % count, end: e % count, loop: l, style: st});
      prevStyle = st;
      start = e % count;
    }
  }
  for (const segment of segments) {
    start = spanGaps ? start : segment.start;
    let prev = points[start % count];
    let style;
    for (i = start + 1; i <= segment.end; i++) {
      const pt = points[i % count];
      style = readStyle(segmentOptions.setContext(createContext(chartContext, {
        type: 'segment',
        p0: prev,
        p1: pt,
        p0DataIndex: (i - 1) % count,
        p1DataIndex: i % count,
        datasetIndex
      })));
      if (styleChanged(style, prevStyle)) {
        addStyle(start, i - 1, segment.loop, prevStyle);
      }
      prev = pt;
      prevStyle = style;
    }
    if (start < i - 1) {
      addStyle(start, i - 1, segment.loop, prevStyle);
    }
  }
  return result;
}
function readStyle(options) {
  return {
    backgroundColor: options.backgroundColor,
    borderCapStyle: options.borderCapStyle,
    borderDash: options.borderDash,
    borderDashOffset: options.borderDashOffset,
    borderJoinStyle: options.borderJoinStyle,
    borderWidth: options.borderWidth,
    borderColor: options.borderColor
  };
}
function styleChanged(style, prevStyle) {
  return prevStyle && JSON.stringify(style) !== JSON.stringify(prevStyle);
}

/*!
 * Chart.js v3.6.0
 * https://www.chartjs.org
 * (c) 2021 Chart.js Contributors
 * Released under the MIT License
 */

class Animator {
  constructor() {
    this._request = null;
    this._charts = new Map();
    this._running = false;
    this._lastDate = undefined;
  }
  _notify(chart, anims, date, type) {
    const callbacks = anims.listeners[type];
    const numSteps = anims.duration;
    callbacks.forEach(fn => fn({
      chart,
      initial: anims.initial,
      numSteps,
      currentStep: Math.min(date - anims.start, numSteps)
    }));
  }
  _refresh() {
    if (this._request) {
      return;
    }
    this._running = true;
    this._request = requestAnimFrame.call(window, () => {
      this._update();
      this._request = null;
      if (this._running) {
        this._refresh();
      }
    });
  }
  _update(date = Date.now()) {
    let remaining = 0;
    this._charts.forEach((anims, chart) => {
      if (!anims.running || !anims.items.length) {
        return;
      }
      const items = anims.items;
      let i = items.length - 1;
      let draw = false;
      let item;
      for (; i >= 0; --i) {
        item = items[i];
        if (item._active) {
          if (item._total > anims.duration) {
            anims.duration = item._total;
          }
          item.tick(date);
          draw = true;
        } else {
          items[i] = items[items.length - 1];
          items.pop();
        }
      }
      if (draw) {
        chart.draw();
        this._notify(chart, anims, date, 'progress');
      }
      if (!items.length) {
        anims.running = false;
        this._notify(chart, anims, date, 'complete');
        anims.initial = false;
      }
      remaining += items.length;
    });
    this._lastDate = date;
    if (remaining === 0) {
      this._running = false;
    }
  }
  _getAnims(chart) {
    const charts = this._charts;
    let anims = charts.get(chart);
    if (!anims) {
      anims = {
        running: false,
        initial: true,
        items: [],
        listeners: {
          complete: [],
          progress: []
        }
      };
      charts.set(chart, anims);
    }
    return anims;
  }
  listen(chart, event, cb) {
    this._getAnims(chart).listeners[event].push(cb);
  }
  add(chart, items) {
    if (!items || !items.length) {
      return;
    }
    this._getAnims(chart).items.push(...items);
  }
  has(chart) {
    return this._getAnims(chart).items.length > 0;
  }
  start(chart) {
    const anims = this._charts.get(chart);
    if (!anims) {
      return;
    }
    anims.running = true;
    anims.start = Date.now();
    anims.duration = anims.items.reduce((acc, cur) => Math.max(acc, cur._duration), 0);
    this._refresh();
  }
  running(chart) {
    if (!this._running) {
      return false;
    }
    const anims = this._charts.get(chart);
    if (!anims || !anims.running || !anims.items.length) {
      return false;
    }
    return true;
  }
  stop(chart) {
    const anims = this._charts.get(chart);
    if (!anims || !anims.items.length) {
      return;
    }
    const items = anims.items;
    let i = items.length - 1;
    for (; i >= 0; --i) {
      items[i].cancel();
    }
    anims.items = [];
    this._notify(chart, anims, Date.now(), 'complete');
  }
  remove(chart) {
    return this._charts.delete(chart);
  }
}
var animator = new Animator();

const transparent = 'transparent';
const interpolators = {
  boolean(from, to, factor) {
    return factor > 0.5 ? to : from;
  },
  color(from, to, factor) {
    const c0 = color(from || transparent);
    const c1 = c0.valid && color(to || transparent);
    return c1 && c1.valid
      ? c1.mix(c0, factor).hexString()
      : to;
  },
  number(from, to, factor) {
    return from + (to - from) * factor;
  }
};
class Animation {
  constructor(cfg, target, prop, to) {
    const currentValue = target[prop];
    to = resolve([cfg.to, to, currentValue, cfg.from]);
    const from = resolve([cfg.from, currentValue, to]);
    this._active = true;
    this._fn = cfg.fn || interpolators[cfg.type || typeof from];
    this._easing = effects[cfg.easing] || effects.linear;
    this._start = Math.floor(Date.now() + (cfg.delay || 0));
    this._duration = this._total = Math.floor(cfg.duration);
    this._loop = !!cfg.loop;
    this._target = target;
    this._prop = prop;
    this._from = from;
    this._to = to;
    this._promises = undefined;
  }
  active() {
    return this._active;
  }
  update(cfg, to, date) {
    if (this._active) {
      this._notify(false);
      const currentValue = this._target[this._prop];
      const elapsed = date - this._start;
      const remain = this._duration - elapsed;
      this._start = date;
      this._duration = Math.floor(Math.max(remain, cfg.duration));
      this._total += elapsed;
      this._loop = !!cfg.loop;
      this._to = resolve([cfg.to, to, currentValue, cfg.from]);
      this._from = resolve([cfg.from, currentValue, to]);
    }
  }
  cancel() {
    if (this._active) {
      this.tick(Date.now());
      this._active = false;
      this._notify(false);
    }
  }
  tick(date) {
    const elapsed = date - this._start;
    const duration = this._duration;
    const prop = this._prop;
    const from = this._from;
    const loop = this._loop;
    const to = this._to;
    let factor;
    this._active = from !== to && (loop || (elapsed < duration));
    if (!this._active) {
      this._target[prop] = to;
      this._notify(true);
      return;
    }
    if (elapsed < 0) {
      this._target[prop] = from;
      return;
    }
    factor = (elapsed / duration) % 2;
    factor = loop && factor > 1 ? 2 - factor : factor;
    factor = this._easing(Math.min(1, Math.max(0, factor)));
    this._target[prop] = this._fn(from, to, factor);
  }
  wait() {
    const promises = this._promises || (this._promises = []);
    return new Promise((res, rej) => {
      promises.push({res, rej});
    });
  }
  _notify(resolved) {
    const method = resolved ? 'res' : 'rej';
    const promises = this._promises || [];
    for (let i = 0; i < promises.length; i++) {
      promises[i][method]();
    }
  }
}

const numbers = ['x', 'y', 'borderWidth', 'radius', 'tension'];
const colors = ['color', 'borderColor', 'backgroundColor'];
defaults$1.set('animation', {
  delay: undefined,
  duration: 1000,
  easing: 'easeOutQuart',
  fn: undefined,
  from: undefined,
  loop: undefined,
  to: undefined,
  type: undefined,
});
const animationOptions = Object.keys(defaults$1.animation);
defaults$1.describe('animation', {
  _fallback: false,
  _indexable: false,
  _scriptable: (name) => name !== 'onProgress' && name !== 'onComplete' && name !== 'fn',
});
defaults$1.set('animations', {
  colors: {
    type: 'color',
    properties: colors
  },
  numbers: {
    type: 'number',
    properties: numbers
  },
});
defaults$1.describe('animations', {
  _fallback: 'animation',
});
defaults$1.set('transitions', {
  active: {
    animation: {
      duration: 400
    }
  },
  resize: {
    animation: {
      duration: 0
    }
  },
  show: {
    animations: {
      colors: {
        from: 'transparent'
      },
      visible: {
        type: 'boolean',
        duration: 0
      },
    }
  },
  hide: {
    animations: {
      colors: {
        to: 'transparent'
      },
      visible: {
        type: 'boolean',
        easing: 'linear',
        fn: v => v | 0
      },
    }
  }
});
class Animations {
  constructor(chart, config) {
    this._chart = chart;
    this._properties = new Map();
    this.configure(config);
  }
  configure(config) {
    if (!isObject(config)) {
      return;
    }
    const animatedProps = this._properties;
    Object.getOwnPropertyNames(config).forEach(key => {
      const cfg = config[key];
      if (!isObject(cfg)) {
        return;
      }
      const resolved = {};
      for (const option of animationOptions) {
        resolved[option] = cfg[option];
      }
      (isArray(cfg.properties) && cfg.properties || [key]).forEach((prop) => {
        if (prop === key || !animatedProps.has(prop)) {
          animatedProps.set(prop, resolved);
        }
      });
    });
  }
  _animateOptions(target, values) {
    const newOptions = values.options;
    const options = resolveTargetOptions(target, newOptions);
    if (!options) {
      return [];
    }
    const animations = this._createAnimations(options, newOptions);
    if (newOptions.$shared) {
      awaitAll(target.options.$animations, newOptions).then(() => {
        target.options = newOptions;
      }, () => {
      });
    }
    return animations;
  }
  _createAnimations(target, values) {
    const animatedProps = this._properties;
    const animations = [];
    const running = target.$animations || (target.$animations = {});
    const props = Object.keys(values);
    const date = Date.now();
    let i;
    for (i = props.length - 1; i >= 0; --i) {
      const prop = props[i];
      if (prop.charAt(0) === '$') {
        continue;
      }
      if (prop === 'options') {
        animations.push(...this._animateOptions(target, values));
        continue;
      }
      const value = values[prop];
      let animation = running[prop];
      const cfg = animatedProps.get(prop);
      if (animation) {
        if (cfg && animation.active()) {
          animation.update(cfg, value, date);
          continue;
        } else {
          animation.cancel();
        }
      }
      if (!cfg || !cfg.duration) {
        target[prop] = value;
        continue;
      }
      running[prop] = animation = new Animation(cfg, target, prop, value);
      animations.push(animation);
    }
    return animations;
  }
  update(target, values) {
    if (this._properties.size === 0) {
      Object.assign(target, values);
      return;
    }
    const animations = this._createAnimations(target, values);
    if (animations.length) {
      animator.add(this._chart, animations);
      return true;
    }
  }
}
function awaitAll(animations, properties) {
  const running = [];
  const keys = Object.keys(properties);
  for (let i = 0; i < keys.length; i++) {
    const anim = animations[keys[i]];
    if (anim && anim.active()) {
      running.push(anim.wait());
    }
  }
  return Promise.all(running);
}
function resolveTargetOptions(target, newOptions) {
  if (!newOptions) {
    return;
  }
  let options = target.options;
  if (!options) {
    target.options = newOptions;
    return;
  }
  if (options.$shared) {
    target.options = options = Object.assign({}, options, {$shared: false, $animations: {}});
  }
  return options;
}

function scaleClip(scale, allowedOverflow) {
  const opts = scale && scale.options || {};
  const reverse = opts.reverse;
  const min = opts.min === undefined ? allowedOverflow : 0;
  const max = opts.max === undefined ? allowedOverflow : 0;
  return {
    start: reverse ? max : min,
    end: reverse ? min : max
  };
}
function defaultClip(xScale, yScale, allowedOverflow) {
  if (allowedOverflow === false) {
    return false;
  }
  const x = scaleClip(xScale, allowedOverflow);
  const y = scaleClip(yScale, allowedOverflow);
  return {
    top: y.end,
    right: x.end,
    bottom: y.start,
    left: x.start
  };
}
function toClip(value) {
  let t, r, b, l;
  if (isObject(value)) {
    t = value.top;
    r = value.right;
    b = value.bottom;
    l = value.left;
  } else {
    t = r = b = l = value;
  }
  return {
    top: t,
    right: r,
    bottom: b,
    left: l,
    disabled: value === false
  };
}
function getSortedDatasetIndices(chart, filterVisible) {
  const keys = [];
  const metasets = chart._getSortedDatasetMetas(filterVisible);
  let i, ilen;
  for (i = 0, ilen = metasets.length; i < ilen; ++i) {
    keys.push(metasets[i].index);
  }
  return keys;
}
function applyStack(stack, value, dsIndex, options = {}) {
  const keys = stack.keys;
  const singleMode = options.mode === 'single';
  let i, ilen, datasetIndex, otherValue;
  if (value === null) {
    return;
  }
  for (i = 0, ilen = keys.length; i < ilen; ++i) {
    datasetIndex = +keys[i];
    if (datasetIndex === dsIndex) {
      if (options.all) {
        continue;
      }
      break;
    }
    otherValue = stack.values[datasetIndex];
    if (isNumberFinite(otherValue) && (singleMode || (value === 0 || sign(value) === sign(otherValue)))) {
      value += otherValue;
    }
  }
  return value;
}
function convertObjectDataToArray(data) {
  const keys = Object.keys(data);
  const adata = new Array(keys.length);
  let i, ilen, key;
  for (i = 0, ilen = keys.length; i < ilen; ++i) {
    key = keys[i];
    adata[i] = {
      x: key,
      y: data[key]
    };
  }
  return adata;
}
function isStacked(scale, meta) {
  const stacked = scale && scale.options.stacked;
  return stacked || (stacked === undefined && meta.stack !== undefined);
}
function getStackKey(indexScale, valueScale, meta) {
  return `${indexScale.id}.${valueScale.id}.${meta.stack || meta.type}`;
}
function getUserBounds(scale) {
  const {min, max, minDefined, maxDefined} = scale.getUserBounds();
  return {
    min: minDefined ? min : Number.NEGATIVE_INFINITY,
    max: maxDefined ? max : Number.POSITIVE_INFINITY
  };
}
function getOrCreateStack(stacks, stackKey, indexValue) {
  const subStack = stacks[stackKey] || (stacks[stackKey] = {});
  return subStack[indexValue] || (subStack[indexValue] = {});
}
function getLastIndexInStack(stack, vScale, positive, type) {
  for (const meta of vScale.getMatchingVisibleMetas(type).reverse()) {
    const value = stack[meta.index];
    if ((positive && value > 0) || (!positive && value < 0)) {
      return meta.index;
    }
  }
  return null;
}
function updateStacks(controller, parsed) {
  const {chart, _cachedMeta: meta} = controller;
  const stacks = chart._stacks || (chart._stacks = {});
  const {iScale, vScale, index: datasetIndex} = meta;
  const iAxis = iScale.axis;
  const vAxis = vScale.axis;
  const key = getStackKey(iScale, vScale, meta);
  const ilen = parsed.length;
  let stack;
  for (let i = 0; i < ilen; ++i) {
    const item = parsed[i];
    const {[iAxis]: index, [vAxis]: value} = item;
    const itemStacks = item._stacks || (item._stacks = {});
    stack = itemStacks[vAxis] = getOrCreateStack(stacks, key, index);
    stack[datasetIndex] = value;
    stack._top = getLastIndexInStack(stack, vScale, true, meta.type);
    stack._bottom = getLastIndexInStack(stack, vScale, false, meta.type);
  }
}
function getFirstScaleId(chart, axis) {
  const scales = chart.scales;
  return Object.keys(scales).filter(key => scales[key].axis === axis).shift();
}
function createDatasetContext(parent, index) {
  return createContext(parent,
    {
      active: false,
      dataset: undefined,
      datasetIndex: index,
      index,
      mode: 'default',
      type: 'dataset'
    }
  );
}
function createDataContext(parent, index, element) {
  return createContext(parent, {
    active: false,
    dataIndex: index,
    parsed: undefined,
    raw: undefined,
    element,
    index,
    mode: 'default',
    type: 'data'
  });
}
function clearStacks(meta, items) {
  const datasetIndex = meta.controller.index;
  const axis = meta.vScale && meta.vScale.axis;
  if (!axis) {
    return;
  }
  items = items || meta._parsed;
  for (const parsed of items) {
    const stacks = parsed._stacks;
    if (!stacks || stacks[axis] === undefined || stacks[axis][datasetIndex] === undefined) {
      return;
    }
    delete stacks[axis][datasetIndex];
  }
}
const isDirectUpdateMode = (mode) => mode === 'reset' || mode === 'none';
const cloneIfNotShared = (cached, shared) => shared ? cached : Object.assign({}, cached);
const createStack = (canStack, meta, chart) => canStack && !meta.hidden && meta._stacked
  && {keys: getSortedDatasetIndices(chart, true), values: null};
class DatasetController {
  constructor(chart, datasetIndex) {
    this.chart = chart;
    this._ctx = chart.ctx;
    this.index = datasetIndex;
    this._cachedDataOpts = {};
    this._cachedMeta = this.getMeta();
    this._type = this._cachedMeta.type;
    this.options = undefined;
    this._parsing = false;
    this._data = undefined;
    this._objectData = undefined;
    this._sharedOptions = undefined;
    this._drawStart = undefined;
    this._drawCount = undefined;
    this.enableOptionSharing = false;
    this.$context = undefined;
    this._syncList = [];
    this.initialize();
  }
  initialize() {
    const meta = this._cachedMeta;
    this.configure();
    this.linkScales();
    meta._stacked = isStacked(meta.vScale, meta);
    this.addElements();
  }
  updateIndex(datasetIndex) {
    if (this.index !== datasetIndex) {
      clearStacks(this._cachedMeta);
    }
    this.index = datasetIndex;
  }
  linkScales() {
    const chart = this.chart;
    const meta = this._cachedMeta;
    const dataset = this.getDataset();
    const chooseId = (axis, x, y, r) => axis === 'x' ? x : axis === 'r' ? r : y;
    const xid = meta.xAxisID = valueOrDefault(dataset.xAxisID, getFirstScaleId(chart, 'x'));
    const yid = meta.yAxisID = valueOrDefault(dataset.yAxisID, getFirstScaleId(chart, 'y'));
    const rid = meta.rAxisID = valueOrDefault(dataset.rAxisID, getFirstScaleId(chart, 'r'));
    const indexAxis = meta.indexAxis;
    const iid = meta.iAxisID = chooseId(indexAxis, xid, yid, rid);
    const vid = meta.vAxisID = chooseId(indexAxis, yid, xid, rid);
    meta.xScale = this.getScaleForId(xid);
    meta.yScale = this.getScaleForId(yid);
    meta.rScale = this.getScaleForId(rid);
    meta.iScale = this.getScaleForId(iid);
    meta.vScale = this.getScaleForId(vid);
  }
  getDataset() {
    return this.chart.data.datasets[this.index];
  }
  getMeta() {
    return this.chart.getDatasetMeta(this.index);
  }
  getScaleForId(scaleID) {
    return this.chart.scales[scaleID];
  }
  _getOtherScale(scale) {
    const meta = this._cachedMeta;
    return scale === meta.iScale
      ? meta.vScale
      : meta.iScale;
  }
  reset() {
    this._update('reset');
  }
  _destroy() {
    const meta = this._cachedMeta;
    if (this._data) {
      unlistenArrayEvents(this._data, this);
    }
    if (meta._stacked) {
      clearStacks(meta);
    }
  }
  _dataCheck() {
    const dataset = this.getDataset();
    const data = dataset.data || (dataset.data = []);
    const _data = this._data;
    if (isObject(data)) {
      this._data = convertObjectDataToArray(data);
    } else if (_data !== data) {
      if (_data) {
        unlistenArrayEvents(_data, this);
        const meta = this._cachedMeta;
        clearStacks(meta);
        meta._parsed = [];
      }
      if (data && Object.isExtensible(data)) {
        listenArrayEvents(data, this);
      }
      this._syncList = [];
      this._data = data;
    }
  }
  addElements() {
    const meta = this._cachedMeta;
    this._dataCheck();
    if (this.datasetElementType) {
      meta.dataset = new this.datasetElementType();
    }
  }
  buildOrUpdateElements(resetNewElements) {
    const meta = this._cachedMeta;
    const dataset = this.getDataset();
    let stackChanged = false;
    this._dataCheck();
    const oldStacked = meta._stacked;
    meta._stacked = isStacked(meta.vScale, meta);
    if (meta.stack !== dataset.stack) {
      stackChanged = true;
      clearStacks(meta);
      meta.stack = dataset.stack;
    }
    this._resyncElements(resetNewElements);
    if (stackChanged || oldStacked !== meta._stacked) {
      updateStacks(this, meta._parsed);
    }
  }
  configure() {
    const config = this.chart.config;
    const scopeKeys = config.datasetScopeKeys(this._type);
    const scopes = config.getOptionScopes(this.getDataset(), scopeKeys, true);
    this.options = config.createResolver(scopes, this.getContext());
    this._parsing = this.options.parsing;
  }
  parse(start, count) {
    const {_cachedMeta: meta, _data: data} = this;
    const {iScale, _stacked} = meta;
    const iAxis = iScale.axis;
    let sorted = start === 0 && count === data.length ? true : meta._sorted;
    let prev = start > 0 && meta._parsed[start - 1];
    let i, cur, parsed;
    if (this._parsing === false) {
      meta._parsed = data;
      meta._sorted = true;
      parsed = data;
    } else {
      if (isArray(data[start])) {
        parsed = this.parseArrayData(meta, data, start, count);
      } else if (isObject(data[start])) {
        parsed = this.parseObjectData(meta, data, start, count);
      } else {
        parsed = this.parsePrimitiveData(meta, data, start, count);
      }
      const isNotInOrderComparedToPrev = () => cur[iAxis] === null || (prev && cur[iAxis] < prev[iAxis]);
      for (i = 0; i < count; ++i) {
        meta._parsed[i + start] = cur = parsed[i];
        if (sorted) {
          if (isNotInOrderComparedToPrev()) {
            sorted = false;
          }
          prev = cur;
        }
      }
      meta._sorted = sorted;
    }
    if (_stacked) {
      updateStacks(this, parsed);
    }
  }
  parsePrimitiveData(meta, data, start, count) {
    const {iScale, vScale} = meta;
    const iAxis = iScale.axis;
    const vAxis = vScale.axis;
    const labels = iScale.getLabels();
    const singleScale = iScale === vScale;
    const parsed = new Array(count);
    let i, ilen, index;
    for (i = 0, ilen = count; i < ilen; ++i) {
      index = i + start;
      parsed[i] = {
        [iAxis]: singleScale || iScale.parse(labels[index], index),
        [vAxis]: vScale.parse(data[index], index)
      };
    }
    return parsed;
  }
  parseArrayData(meta, data, start, count) {
    const {xScale, yScale} = meta;
    const parsed = new Array(count);
    let i, ilen, index, item;
    for (i = 0, ilen = count; i < ilen; ++i) {
      index = i + start;
      item = data[index];
      parsed[i] = {
        x: xScale.parse(item[0], index),
        y: yScale.parse(item[1], index)
      };
    }
    return parsed;
  }
  parseObjectData(meta, data, start, count) {
    const {xScale, yScale} = meta;
    const {xAxisKey = 'x', yAxisKey = 'y'} = this._parsing;
    const parsed = new Array(count);
    let i, ilen, index, item;
    for (i = 0, ilen = count; i < ilen; ++i) {
      index = i + start;
      item = data[index];
      parsed[i] = {
        x: xScale.parse(resolveObjectKey(item, xAxisKey), index),
        y: yScale.parse(resolveObjectKey(item, yAxisKey), index)
      };
    }
    return parsed;
  }
  getParsed(index) {
    return this._cachedMeta._parsed[index];
  }
  getDataElement(index) {
    return this._cachedMeta.data[index];
  }
  applyStack(scale, parsed, mode) {
    const chart = this.chart;
    const meta = this._cachedMeta;
    const value = parsed[scale.axis];
    const stack = {
      keys: getSortedDatasetIndices(chart, true),
      values: parsed._stacks[scale.axis]
    };
    return applyStack(stack, value, meta.index, {mode});
  }
  updateRangeFromParsed(range, scale, parsed, stack) {
    const parsedValue = parsed[scale.axis];
    let value = parsedValue === null ? NaN : parsedValue;
    const values = stack && parsed._stacks[scale.axis];
    if (stack && values) {
      stack.values = values;
      value = applyStack(stack, parsedValue, this._cachedMeta.index);
    }
    range.min = Math.min(range.min, value);
    range.max = Math.max(range.max, value);
  }
  getMinMax(scale, canStack) {
    const meta = this._cachedMeta;
    const _parsed = meta._parsed;
    const sorted = meta._sorted && scale === meta.iScale;
    const ilen = _parsed.length;
    const otherScale = this._getOtherScale(scale);
    const stack = createStack(canStack, meta, this.chart);
    const range = {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY};
    const {min: otherMin, max: otherMax} = getUserBounds(otherScale);
    let i, parsed;
    function _skip() {
      parsed = _parsed[i];
      const otherValue = parsed[otherScale.axis];
      return !isNumberFinite(parsed[scale.axis]) || otherMin > otherValue || otherMax < otherValue;
    }
    for (i = 0; i < ilen; ++i) {
      if (_skip()) {
        continue;
      }
      this.updateRangeFromParsed(range, scale, parsed, stack);
      if (sorted) {
        break;
      }
    }
    if (sorted) {
      for (i = ilen - 1; i >= 0; --i) {
        if (_skip()) {
          continue;
        }
        this.updateRangeFromParsed(range, scale, parsed, stack);
        break;
      }
    }
    return range;
  }
  getAllParsedValues(scale) {
    const parsed = this._cachedMeta._parsed;
    const values = [];
    let i, ilen, value;
    for (i = 0, ilen = parsed.length; i < ilen; ++i) {
      value = parsed[i][scale.axis];
      if (isNumberFinite(value)) {
        values.push(value);
      }
    }
    return values;
  }
  getMaxOverflow() {
    return false;
  }
  getLabelAndValue(index) {
    const meta = this._cachedMeta;
    const iScale = meta.iScale;
    const vScale = meta.vScale;
    const parsed = this.getParsed(index);
    return {
      label: iScale ? '' + iScale.getLabelForValue(parsed[iScale.axis]) : '',
      value: vScale ? '' + vScale.getLabelForValue(parsed[vScale.axis]) : ''
    };
  }
  _update(mode) {
    const meta = this._cachedMeta;
    this.configure();
    this._cachedDataOpts = {};
    this.update(mode || 'default');
    meta._clip = toClip(valueOrDefault(this.options.clip, defaultClip(meta.xScale, meta.yScale, this.getMaxOverflow())));
  }
  update(mode) {}
  draw() {
    const ctx = this._ctx;
    const chart = this.chart;
    const meta = this._cachedMeta;
    const elements = meta.data || [];
    const area = chart.chartArea;
    const active = [];
    const start = this._drawStart || 0;
    const count = this._drawCount || (elements.length - start);
    let i;
    if (meta.dataset) {
      meta.dataset.draw(ctx, area, start, count);
    }
    for (i = start; i < start + count; ++i) {
      const element = elements[i];
      if (element.hidden) {
        continue;
      }
      if (element.active) {
        active.push(element);
      } else {
        element.draw(ctx, area);
      }
    }
    for (i = 0; i < active.length; ++i) {
      active[i].draw(ctx, area);
    }
  }
  getStyle(index, active) {
    const mode = active ? 'active' : 'default';
    return index === undefined && this._cachedMeta.dataset
      ? this.resolveDatasetElementOptions(mode)
      : this.resolveDataElementOptions(index || 0, mode);
  }
  getContext(index, active, mode) {
    const dataset = this.getDataset();
    let context;
    if (index >= 0 && index < this._cachedMeta.data.length) {
      const element = this._cachedMeta.data[index];
      context = element.$context ||
        (element.$context = createDataContext(this.getContext(), index, element));
      context.parsed = this.getParsed(index);
      context.raw = dataset.data[index];
      context.index = context.dataIndex = index;
    } else {
      context = this.$context ||
        (this.$context = createDatasetContext(this.chart.getContext(), this.index));
      context.dataset = dataset;
      context.index = context.datasetIndex = this.index;
    }
    context.active = !!active;
    context.mode = mode;
    return context;
  }
  resolveDatasetElementOptions(mode) {
    return this._resolveElementOptions(this.datasetElementType.id, mode);
  }
  resolveDataElementOptions(index, mode) {
    return this._resolveElementOptions(this.dataElementType.id, mode, index);
  }
  _resolveElementOptions(elementType, mode = 'default', index) {
    const active = mode === 'active';
    const cache = this._cachedDataOpts;
    const cacheKey = elementType + '-' + mode;
    const cached = cache[cacheKey];
    const sharing = this.enableOptionSharing && defined(index);
    if (cached) {
      return cloneIfNotShared(cached, sharing);
    }
    const config = this.chart.config;
    const scopeKeys = config.datasetElementScopeKeys(this._type, elementType);
    const prefixes = active ? [`${elementType}Hover`, 'hover', elementType, ''] : [elementType, ''];
    const scopes = config.getOptionScopes(this.getDataset(), scopeKeys);
    const names = Object.keys(defaults$1.elements[elementType]);
    const context = () => this.getContext(index, active);
    const values = config.resolveNamedOptions(scopes, names, context, prefixes);
    if (values.$shared) {
      values.$shared = sharing;
      cache[cacheKey] = Object.freeze(cloneIfNotShared(values, sharing));
    }
    return values;
  }
  _resolveAnimations(index, transition, active) {
    const chart = this.chart;
    const cache = this._cachedDataOpts;
    const cacheKey = `animation-${transition}`;
    const cached = cache[cacheKey];
    if (cached) {
      return cached;
    }
    let options;
    if (chart.options.animation !== false) {
      const config = this.chart.config;
      const scopeKeys = config.datasetAnimationScopeKeys(this._type, transition);
      const scopes = config.getOptionScopes(this.getDataset(), scopeKeys);
      options = config.createResolver(scopes, this.getContext(index, active, transition));
    }
    const animations = new Animations(chart, options && options.animations);
    if (options && options._cacheable) {
      cache[cacheKey] = Object.freeze(animations);
    }
    return animations;
  }
  getSharedOptions(options) {
    if (!options.$shared) {
      return;
    }
    return this._sharedOptions || (this._sharedOptions = Object.assign({}, options));
  }
  includeOptions(mode, sharedOptions) {
    return !sharedOptions || isDirectUpdateMode(mode) || this.chart._animationsDisabled;
  }
  updateElement(element, index, properties, mode) {
    if (isDirectUpdateMode(mode)) {
      Object.assign(element, properties);
    } else {
      this._resolveAnimations(index, mode).update(element, properties);
    }
  }
  updateSharedOptions(sharedOptions, mode, newOptions) {
    if (sharedOptions && !isDirectUpdateMode(mode)) {
      this._resolveAnimations(undefined, mode).update(sharedOptions, newOptions);
    }
  }
  _setStyle(element, index, mode, active) {
    element.active = active;
    const options = this.getStyle(index, active);
    this._resolveAnimations(index, mode, active).update(element, {
      options: (!active && this.getSharedOptions(options)) || options
    });
  }
  removeHoverStyle(element, datasetIndex, index) {
    this._setStyle(element, index, 'active', false);
  }
  setHoverStyle(element, datasetIndex, index) {
    this._setStyle(element, index, 'active', true);
  }
  _removeDatasetHoverStyle() {
    const element = this._cachedMeta.dataset;
    if (element) {
      this._setStyle(element, undefined, 'active', false);
    }
  }
  _setDatasetHoverStyle() {
    const element = this._cachedMeta.dataset;
    if (element) {
      this._setStyle(element, undefined, 'active', true);
    }
  }
  _resyncElements(resetNewElements) {
    const data = this._data;
    const elements = this._cachedMeta.data;
    for (const [method, arg1, arg2] of this._syncList) {
      this[method](arg1, arg2);
    }
    this._syncList = [];
    const numMeta = elements.length;
    const numData = data.length;
    const count = Math.min(numData, numMeta);
    if (count) {
      this.parse(0, count);
    }
    if (numData > numMeta) {
      this._insertElements(numMeta, numData - numMeta, resetNewElements);
    } else if (numData < numMeta) {
      this._removeElements(numData, numMeta - numData);
    }
  }
  _insertElements(start, count, resetNewElements = true) {
    const meta = this._cachedMeta;
    const data = meta.data;
    const end = start + count;
    let i;
    const move = (arr) => {
      arr.length += count;
      for (i = arr.length - 1; i >= end; i--) {
        arr[i] = arr[i - count];
      }
    };
    move(data);
    for (i = start; i < end; ++i) {
      data[i] = new this.dataElementType();
    }
    if (this._parsing) {
      move(meta._parsed);
    }
    this.parse(start, count);
    if (resetNewElements) {
      this.updateElements(data, start, count, 'reset');
    }
  }
  updateElements(element, start, count, mode) {}
  _removeElements(start, count) {
    const meta = this._cachedMeta;
    if (this._parsing) {
      const removed = meta._parsed.splice(start, count);
      if (meta._stacked) {
        clearStacks(meta, removed);
      }
    }
    meta.data.splice(start, count);
  }
  _sync(args) {
    if (this._parsing) {
      this._syncList.push(args);
    } else {
      const [method, arg1, arg2] = args;
      this[method](arg1, arg2);
    }
  }
  _onDataPush() {
    const count = arguments.length;
    this._sync(['_insertElements', this.getDataset().data.length - count, count]);
  }
  _onDataPop() {
    this._sync(['_removeElements', this._cachedMeta.data.length - 1, 1]);
  }
  _onDataShift() {
    this._sync(['_removeElements', 0, 1]);
  }
  _onDataSplice(start, count) {
    this._sync(['_removeElements', start, count]);
    this._sync(['_insertElements', start, arguments.length - 2]);
  }
  _onDataUnshift() {
    this._sync(['_insertElements', 0, arguments.length]);
  }
}
DatasetController.defaults = {};
DatasetController.prototype.datasetElementType = null;
DatasetController.prototype.dataElementType = null;

function getAllScaleValues(scale, type) {
  if (!scale._cache.$bar) {
    const visibleMetas = scale.getMatchingVisibleMetas(type);
    let values = [];
    for (let i = 0, ilen = visibleMetas.length; i < ilen; i++) {
      values = values.concat(visibleMetas[i].controller.getAllParsedValues(scale));
    }
    scale._cache.$bar = _arrayUnique(values.sort((a, b) => a - b));
  }
  return scale._cache.$bar;
}
function computeMinSampleSize(meta) {
  const scale = meta.iScale;
  const values = getAllScaleValues(scale, meta.type);
  let min = scale._length;
  let i, ilen, curr, prev;
  const updateMinAndPrev = () => {
    if (curr === 32767 || curr === -32768) {
      return;
    }
    if (defined(prev)) {
      min = Math.min(min, Math.abs(curr - prev) || min);
    }
    prev = curr;
  };
  for (i = 0, ilen = values.length; i < ilen; ++i) {
    curr = scale.getPixelForValue(values[i]);
    updateMinAndPrev();
  }
  prev = undefined;
  for (i = 0, ilen = scale.ticks.length; i < ilen; ++i) {
    curr = scale.getPixelForTick(i);
    updateMinAndPrev();
  }
  return min;
}
function computeFitCategoryTraits(index, ruler, options, stackCount) {
  const thickness = options.barThickness;
  let size, ratio;
  if (isNullOrUndef(thickness)) {
    size = ruler.min * options.categoryPercentage;
    ratio = options.barPercentage;
  } else {
    size = thickness * stackCount;
    ratio = 1;
  }
  return {
    chunk: size / stackCount,
    ratio,
    start: ruler.pixels[index] - (size / 2)
  };
}
function computeFlexCategoryTraits(index, ruler, options, stackCount) {
  const pixels = ruler.pixels;
  const curr = pixels[index];
  let prev = index > 0 ? pixels[index - 1] : null;
  let next = index < pixels.length - 1 ? pixels[index + 1] : null;
  const percent = options.categoryPercentage;
  if (prev === null) {
    prev = curr - (next === null ? ruler.end - ruler.start : next - curr);
  }
  if (next === null) {
    next = curr + curr - prev;
  }
  const start = curr - (curr - Math.min(prev, next)) / 2 * percent;
  const size = Math.abs(next - prev) / 2 * percent;
  return {
    chunk: size / stackCount,
    ratio: options.barPercentage,
    start
  };
}
function parseFloatBar(entry, item, vScale, i) {
  const startValue = vScale.parse(entry[0], i);
  const endValue = vScale.parse(entry[1], i);
  const min = Math.min(startValue, endValue);
  const max = Math.max(startValue, endValue);
  let barStart = min;
  let barEnd = max;
  if (Math.abs(min) > Math.abs(max)) {
    barStart = max;
    barEnd = min;
  }
  item[vScale.axis] = barEnd;
  item._custom = {
    barStart,
    barEnd,
    start: startValue,
    end: endValue,
    min,
    max
  };
}
function parseValue(entry, item, vScale, i) {
  if (isArray(entry)) {
    parseFloatBar(entry, item, vScale, i);
  } else {
    item[vScale.axis] = vScale.parse(entry, i);
  }
  return item;
}
function parseArrayOrPrimitive(meta, data, start, count) {
  const iScale = meta.iScale;
  const vScale = meta.vScale;
  const labels = iScale.getLabels();
  const singleScale = iScale === vScale;
  const parsed = [];
  let i, ilen, item, entry;
  for (i = start, ilen = start + count; i < ilen; ++i) {
    entry = data[i];
    item = {};
    item[iScale.axis] = singleScale || iScale.parse(labels[i], i);
    parsed.push(parseValue(entry, item, vScale, i));
  }
  return parsed;
}
function isFloatBar(custom) {
  return custom && custom.barStart !== undefined && custom.barEnd !== undefined;
}
function barSign(size, vScale, actualBase) {
  if (size !== 0) {
    return sign(size);
  }
  return (vScale.isHorizontal() ? 1 : -1) * (vScale.min >= actualBase ? 1 : -1);
}
function borderProps(properties) {
  let reverse, start, end, top, bottom;
  if (properties.horizontal) {
    reverse = properties.base > properties.x;
    start = 'left';
    end = 'right';
  } else {
    reverse = properties.base < properties.y;
    start = 'bottom';
    end = 'top';
  }
  if (reverse) {
    top = 'end';
    bottom = 'start';
  } else {
    top = 'start';
    bottom = 'end';
  }
  return {start, end, reverse, top, bottom};
}
function setBorderSkipped(properties, options, stack, index) {
  let edge = options.borderSkipped;
  const res = {};
  if (!edge) {
    properties.borderSkipped = res;
    return;
  }
  const {start, end, reverse, top, bottom} = borderProps(properties);
  if (edge === 'middle' && stack) {
    properties.enableBorderRadius = true;
    if ((stack._top || 0) === index) {
      edge = top;
    } else if ((stack._bottom || 0) === index) {
      edge = bottom;
    } else {
      res[parseEdge(bottom, start, end, reverse)] = true;
      edge = top;
    }
  }
  res[parseEdge(edge, start, end, reverse)] = true;
  properties.borderSkipped = res;
}
function parseEdge(edge, a, b, reverse) {
  if (reverse) {
    edge = swap(edge, a, b);
    edge = startEnd(edge, b, a);
  } else {
    edge = startEnd(edge, a, b);
  }
  return edge;
}
function swap(orig, v1, v2) {
  return orig === v1 ? v2 : orig === v2 ? v1 : orig;
}
function startEnd(v, start, end) {
  return v === 'start' ? start : v === 'end' ? end : v;
}
function setInflateAmount(properties, {inflateAmount}, ratio) {
  properties.inflateAmount = inflateAmount === 'auto'
    ? ratio === 1 ? 0.33 : 0
    : inflateAmount;
}
class BarController extends DatasetController {
  parsePrimitiveData(meta, data, start, count) {
    return parseArrayOrPrimitive(meta, data, start, count);
  }
  parseArrayData(meta, data, start, count) {
    return parseArrayOrPrimitive(meta, data, start, count);
  }
  parseObjectData(meta, data, start, count) {
    const {iScale, vScale} = meta;
    const {xAxisKey = 'x', yAxisKey = 'y'} = this._parsing;
    const iAxisKey = iScale.axis === 'x' ? xAxisKey : yAxisKey;
    const vAxisKey = vScale.axis === 'x' ? xAxisKey : yAxisKey;
    const parsed = [];
    let i, ilen, item, obj;
    for (i = start, ilen = start + count; i < ilen; ++i) {
      obj = data[i];
      item = {};
      item[iScale.axis] = iScale.parse(resolveObjectKey(obj, iAxisKey), i);
      parsed.push(parseValue(resolveObjectKey(obj, vAxisKey), item, vScale, i));
    }
    return parsed;
  }
  updateRangeFromParsed(range, scale, parsed, stack) {
    super.updateRangeFromParsed(range, scale, parsed, stack);
    const custom = parsed._custom;
    if (custom && scale === this._cachedMeta.vScale) {
      range.min = Math.min(range.min, custom.min);
      range.max = Math.max(range.max, custom.max);
    }
  }
  getMaxOverflow() {
    return 0;
  }
  getLabelAndValue(index) {
    const meta = this._cachedMeta;
    const {iScale, vScale} = meta;
    const parsed = this.getParsed(index);
    const custom = parsed._custom;
    const value = isFloatBar(custom)
      ? '[' + custom.start + ', ' + custom.end + ']'
      : '' + vScale.getLabelForValue(parsed[vScale.axis]);
    return {
      label: '' + iScale.getLabelForValue(parsed[iScale.axis]),
      value
    };
  }
  initialize() {
    this.enableOptionSharing = true;
    super.initialize();
    const meta = this._cachedMeta;
    meta.stack = this.getDataset().stack;
  }
  update(mode) {
    const meta = this._cachedMeta;
    this.updateElements(meta.data, 0, meta.data.length, mode);
  }
  updateElements(bars, start, count, mode) {
    const reset = mode === 'reset';
    const {index, _cachedMeta: {vScale}} = this;
    const base = vScale.getBasePixel();
    const horizontal = vScale.isHorizontal();
    const ruler = this._getRuler();
    const firstOpts = this.resolveDataElementOptions(start, mode);
    const sharedOptions = this.getSharedOptions(firstOpts);
    const includeOptions = this.includeOptions(mode, sharedOptions);
    this.updateSharedOptions(sharedOptions, mode, firstOpts);
    for (let i = start; i < start + count; i++) {
      const parsed = this.getParsed(i);
      const vpixels = reset || isNullOrUndef(parsed[vScale.axis]) ? {base, head: base} : this._calculateBarValuePixels(i);
      const ipixels = this._calculateBarIndexPixels(i, ruler);
      const stack = (parsed._stacks || {})[vScale.axis];
      const properties = {
        horizontal,
        base: vpixels.base,
        enableBorderRadius: !stack || isFloatBar(parsed._custom) || (index === stack._top || index === stack._bottom),
        x: horizontal ? vpixels.head : ipixels.center,
        y: horizontal ? ipixels.center : vpixels.head,
        height: horizontal ? ipixels.size : Math.abs(vpixels.size),
        width: horizontal ? Math.abs(vpixels.size) : ipixels.size
      };
      if (includeOptions) {
        properties.options = sharedOptions || this.resolveDataElementOptions(i, bars[i].active ? 'active' : mode);
      }
      const options = properties.options || bars[i].options;
      setBorderSkipped(properties, options, stack, index);
      setInflateAmount(properties, options, ruler.ratio);
      this.updateElement(bars[i], i, properties, mode);
    }
  }
  _getStacks(last, dataIndex) {
    const meta = this._cachedMeta;
    const iScale = meta.iScale;
    const metasets = iScale.getMatchingVisibleMetas(this._type);
    const stacked = iScale.options.stacked;
    const ilen = metasets.length;
    const stacks = [];
    let i, item;
    for (i = 0; i < ilen; ++i) {
      item = metasets[i];
      if (!item.controller.options.grouped) {
        continue;
      }
      if (typeof dataIndex !== 'undefined') {
        const val = item.controller.getParsed(dataIndex)[
          item.controller._cachedMeta.vScale.axis
        ];
        if (isNullOrUndef(val) || isNaN(val)) {
          continue;
        }
      }
      if (stacked === false || stacks.indexOf(item.stack) === -1 ||
				(stacked === undefined && item.stack === undefined)) {
        stacks.push(item.stack);
      }
      if (item.index === last) {
        break;
      }
    }
    if (!stacks.length) {
      stacks.push(undefined);
    }
    return stacks;
  }
  _getStackCount(index) {
    return this._getStacks(undefined, index).length;
  }
  _getStackIndex(datasetIndex, name, dataIndex) {
    const stacks = this._getStacks(datasetIndex, dataIndex);
    const index = (name !== undefined)
      ? stacks.indexOf(name)
      : -1;
    return (index === -1)
      ? stacks.length - 1
      : index;
  }
  _getRuler() {
    const opts = this.options;
    const meta = this._cachedMeta;
    const iScale = meta.iScale;
    const pixels = [];
    let i, ilen;
    for (i = 0, ilen = meta.data.length; i < ilen; ++i) {
      pixels.push(iScale.getPixelForValue(this.getParsed(i)[iScale.axis], i));
    }
    const barThickness = opts.barThickness;
    const min = barThickness || computeMinSampleSize(meta);
    return {
      min,
      pixels,
      start: iScale._startPixel,
      end: iScale._endPixel,
      stackCount: this._getStackCount(),
      scale: iScale,
      grouped: opts.grouped,
      ratio: barThickness ? 1 : opts.categoryPercentage * opts.barPercentage
    };
  }
  _calculateBarValuePixels(index) {
    const {_cachedMeta: {vScale, _stacked}, options: {base: baseValue, minBarLength}} = this;
    const actualBase = baseValue || 0;
    const parsed = this.getParsed(index);
    const custom = parsed._custom;
    const floating = isFloatBar(custom);
    let value = parsed[vScale.axis];
    let start = 0;
    let length = _stacked ? this.applyStack(vScale, parsed, _stacked) : value;
    let head, size;
    if (length !== value) {
      start = length - value;
      length = value;
    }
    if (floating) {
      value = custom.barStart;
      length = custom.barEnd - custom.barStart;
      if (value !== 0 && sign(value) !== sign(custom.barEnd)) {
        start = 0;
      }
      start += value;
    }
    const startValue = !isNullOrUndef(baseValue) && !floating ? baseValue : start;
    let base = vScale.getPixelForValue(startValue);
    if (this.chart.getDataVisibility(index)) {
      head = vScale.getPixelForValue(start + length);
    } else {
      head = base;
    }
    size = head - base;
    if (Math.abs(size) < minBarLength) {
      size = barSign(size, vScale, actualBase) * minBarLength;
      if (value === actualBase) {
        base -= size / 2;
      }
      head = base + size;
    }
    if (base === vScale.getPixelForValue(actualBase)) {
      const halfGrid = sign(size) * vScale.getLineWidthForValue(actualBase) / 2;
      base += halfGrid;
      size -= halfGrid;
    }
    return {
      size,
      base,
      head,
      center: head + size / 2
    };
  }
  _calculateBarIndexPixels(index, ruler) {
    const scale = ruler.scale;
    const options = this.options;
    const skipNull = options.skipNull;
    const maxBarThickness = valueOrDefault(options.maxBarThickness, Infinity);
    let center, size;
    if (ruler.grouped) {
      const stackCount = skipNull ? this._getStackCount(index) : ruler.stackCount;
      const range = options.barThickness === 'flex'
        ? computeFlexCategoryTraits(index, ruler, options, stackCount)
        : computeFitCategoryTraits(index, ruler, options, stackCount);
      const stackIndex = this._getStackIndex(this.index, this._cachedMeta.stack, skipNull ? index : undefined);
      center = range.start + (range.chunk * stackIndex) + (range.chunk / 2);
      size = Math.min(maxBarThickness, range.chunk * range.ratio);
    } else {
      center = scale.getPixelForValue(this.getParsed(index)[scale.axis], index);
      size = Math.min(maxBarThickness, ruler.min * ruler.ratio);
    }
    return {
      base: center - size / 2,
      head: center + size / 2,
      center,
      size
    };
  }
  draw() {
    const meta = this._cachedMeta;
    const vScale = meta.vScale;
    const rects = meta.data;
    const ilen = rects.length;
    let i = 0;
    for (; i < ilen; ++i) {
      if (this.getParsed(i)[vScale.axis] !== null) {
        rects[i].draw(this._ctx);
      }
    }
  }
}
BarController.id = 'bar';
BarController.defaults = {
  datasetElementType: false,
  dataElementType: 'bar',
  categoryPercentage: 0.8,
  barPercentage: 0.9,
  grouped: true,
  animations: {
    numbers: {
      type: 'number',
      properties: ['x', 'y', 'base', 'width', 'height']
    }
  }
};
BarController.overrides = {
  scales: {
    _index_: {
      type: 'category',
      offset: true,
      grid: {
        offset: true
      }
    },
    _value_: {
      type: 'linear',
      beginAtZero: true,
    }
  }
};

class BubbleController extends DatasetController {
  initialize() {
    this.enableOptionSharing = true;
    super.initialize();
  }
  parsePrimitiveData(meta, data, start, count) {
    const parsed = super.parsePrimitiveData(meta, data, start, count);
    for (let i = 0; i < parsed.length; i++) {
      parsed[i]._custom = this.resolveDataElementOptions(i + start).radius;
    }
    return parsed;
  }
  parseArrayData(meta, data, start, count) {
    const parsed = super.parseArrayData(meta, data, start, count);
    for (let i = 0; i < parsed.length; i++) {
      const item = data[start + i];
      parsed[i]._custom = valueOrDefault(item[2], this.resolveDataElementOptions(i + start).radius);
    }
    return parsed;
  }
  parseObjectData(meta, data, start, count) {
    const parsed = super.parseObjectData(meta, data, start, count);
    for (let i = 0; i < parsed.length; i++) {
      const item = data[start + i];
      parsed[i]._custom = valueOrDefault(item && item.r && +item.r, this.resolveDataElementOptions(i + start).radius);
    }
    return parsed;
  }
  getMaxOverflow() {
    const data = this._cachedMeta.data;
    let max = 0;
    for (let i = data.length - 1; i >= 0; --i) {
      max = Math.max(max, data[i].size(this.resolveDataElementOptions(i)) / 2);
    }
    return max > 0 && max;
  }
  getLabelAndValue(index) {
    const meta = this._cachedMeta;
    const {xScale, yScale} = meta;
    const parsed = this.getParsed(index);
    const x = xScale.getLabelForValue(parsed.x);
    const y = yScale.getLabelForValue(parsed.y);
    const r = parsed._custom;
    return {
      label: meta.label,
      value: '(' + x + ', ' + y + (r ? ', ' + r : '') + ')'
    };
  }
  update(mode) {
    const points = this._cachedMeta.data;
    this.updateElements(points, 0, points.length, mode);
  }
  updateElements(points, start, count, mode) {
    const reset = mode === 'reset';
    const {iScale, vScale} = this._cachedMeta;
    const firstOpts = this.resolveDataElementOptions(start, mode);
    const sharedOptions = this.getSharedOptions(firstOpts);
    const includeOptions = this.includeOptions(mode, sharedOptions);
    const iAxis = iScale.axis;
    const vAxis = vScale.axis;
    for (let i = start; i < start + count; i++) {
      const point = points[i];
      const parsed = !reset && this.getParsed(i);
      const properties = {};
      const iPixel = properties[iAxis] = reset ? iScale.getPixelForDecimal(0.5) : iScale.getPixelForValue(parsed[iAxis]);
      const vPixel = properties[vAxis] = reset ? vScale.getBasePixel() : vScale.getPixelForValue(parsed[vAxis]);
      properties.skip = isNaN(iPixel) || isNaN(vPixel);
      if (includeOptions) {
        properties.options = this.resolveDataElementOptions(i, point.active ? 'active' : mode);
        if (reset) {
          properties.options.radius = 0;
        }
      }
      this.updateElement(point, i, properties, mode);
    }
    this.updateSharedOptions(sharedOptions, mode, firstOpts);
  }
  resolveDataElementOptions(index, mode) {
    const parsed = this.getParsed(index);
    let values = super.resolveDataElementOptions(index, mode);
    if (values.$shared) {
      values = Object.assign({}, values, {$shared: false});
    }
    const radius = values.radius;
    if (mode !== 'active') {
      values.radius = 0;
    }
    values.radius += valueOrDefault(parsed && parsed._custom, radius);
    return values;
  }
}
BubbleController.id = 'bubble';
BubbleController.defaults = {
  datasetElementType: false,
  dataElementType: 'point',
  animations: {
    numbers: {
      type: 'number',
      properties: ['x', 'y', 'borderWidth', 'radius']
    }
  }
};
BubbleController.overrides = {
  scales: {
    x: {
      type: 'linear'
    },
    y: {
      type: 'linear'
    }
  },
  plugins: {
    tooltip: {
      callbacks: {
        title() {
          return '';
        }
      }
    }
  }
};

function getRatioAndOffset(rotation, circumference, cutout) {
  let ratioX = 1;
  let ratioY = 1;
  let offsetX = 0;
  let offsetY = 0;
  if (circumference < TAU) {
    const startAngle = rotation;
    const endAngle = startAngle + circumference;
    const startX = Math.cos(startAngle);
    const startY = Math.sin(startAngle);
    const endX = Math.cos(endAngle);
    const endY = Math.sin(endAngle);
    const calcMax = (angle, a, b) => _angleBetween(angle, startAngle, endAngle, true) ? 1 : Math.max(a, a * cutout, b, b * cutout);
    const calcMin = (angle, a, b) => _angleBetween(angle, startAngle, endAngle, true) ? -1 : Math.min(a, a * cutout, b, b * cutout);
    const maxX = calcMax(0, startX, endX);
    const maxY = calcMax(HALF_PI, startY, endY);
    const minX = calcMin(PI, startX, endX);
    const minY = calcMin(PI + HALF_PI, startY, endY);
    ratioX = (maxX - minX) / 2;
    ratioY = (maxY - minY) / 2;
    offsetX = -(maxX + minX) / 2;
    offsetY = -(maxY + minY) / 2;
  }
  return {ratioX, ratioY, offsetX, offsetY};
}
class DoughnutController extends DatasetController {
  constructor(chart, datasetIndex) {
    super(chart, datasetIndex);
    this.enableOptionSharing = true;
    this.innerRadius = undefined;
    this.outerRadius = undefined;
    this.offsetX = undefined;
    this.offsetY = undefined;
  }
  linkScales() {}
  parse(start, count) {
    const data = this.getDataset().data;
    const meta = this._cachedMeta;
    if (this._parsing === false) {
      meta._parsed = data;
    } else {
      let getter = (i) => +data[i];
      if (isObject(data[start])) {
        const {key = 'value'} = this._parsing;
        getter = (i) => +resolveObjectKey(data[i], key);
      }
      let i, ilen;
      for (i = start, ilen = start + count; i < ilen; ++i) {
        meta._parsed[i] = getter(i);
      }
    }
  }
  _getRotation() {
    return toRadians(this.options.rotation - 90);
  }
  _getCircumference() {
    return toRadians(this.options.circumference);
  }
  _getRotationExtents() {
    let min = TAU;
    let max = -TAU;
    for (let i = 0; i < this.chart.data.datasets.length; ++i) {
      if (this.chart.isDatasetVisible(i)) {
        const controller = this.chart.getDatasetMeta(i).controller;
        const rotation = controller._getRotation();
        const circumference = controller._getCircumference();
        min = Math.min(min, rotation);
        max = Math.max(max, rotation + circumference);
      }
    }
    return {
      rotation: min,
      circumference: max - min,
    };
  }
  update(mode) {
    const chart = this.chart;
    const {chartArea} = chart;
    const meta = this._cachedMeta;
    const arcs = meta.data;
    const spacing = this.getMaxBorderWidth() + this.getMaxOffset(arcs) + this.options.spacing;
    const maxSize = Math.max((Math.min(chartArea.width, chartArea.height) - spacing) / 2, 0);
    const cutout = Math.min(toPercentage(this.options.cutout, maxSize), 1);
    const chartWeight = this._getRingWeight(this.index);
    const {circumference, rotation} = this._getRotationExtents();
    const {ratioX, ratioY, offsetX, offsetY} = getRatioAndOffset(rotation, circumference, cutout);
    const maxWidth = (chartArea.width - spacing) / ratioX;
    const maxHeight = (chartArea.height - spacing) / ratioY;
    const maxRadius = Math.max(Math.min(maxWidth, maxHeight) / 2, 0);
    const outerRadius = toDimension(this.options.radius, maxRadius);
    const innerRadius = Math.max(outerRadius * cutout, 0);
    const radiusLength = (outerRadius - innerRadius) / this._getVisibleDatasetWeightTotal();
    this.offsetX = offsetX * outerRadius;
    this.offsetY = offsetY * outerRadius;
    meta.total = this.calculateTotal();
    this.outerRadius = outerRadius - radiusLength * this._getRingWeightOffset(this.index);
    this.innerRadius = Math.max(this.outerRadius - radiusLength * chartWeight, 0);
    this.updateElements(arcs, 0, arcs.length, mode);
  }
  _circumference(i, reset) {
    const opts = this.options;
    const meta = this._cachedMeta;
    const circumference = this._getCircumference();
    if ((reset && opts.animation.animateRotate) || !this.chart.getDataVisibility(i) || meta._parsed[i] === null || meta.data[i].hidden) {
      return 0;
    }
    return this.calculateCircumference(meta._parsed[i] * circumference / TAU);
  }
  updateElements(arcs, start, count, mode) {
    const reset = mode === 'reset';
    const chart = this.chart;
    const chartArea = chart.chartArea;
    const opts = chart.options;
    const animationOpts = opts.animation;
    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;
    const animateScale = reset && animationOpts.animateScale;
    const innerRadius = animateScale ? 0 : this.innerRadius;
    const outerRadius = animateScale ? 0 : this.outerRadius;
    const firstOpts = this.resolveDataElementOptions(start, mode);
    const sharedOptions = this.getSharedOptions(firstOpts);
    const includeOptions = this.includeOptions(mode, sharedOptions);
    let startAngle = this._getRotation();
    let i;
    for (i = 0; i < start; ++i) {
      startAngle += this._circumference(i, reset);
    }
    for (i = start; i < start + count; ++i) {
      const circumference = this._circumference(i, reset);
      const arc = arcs[i];
      const properties = {
        x: centerX + this.offsetX,
        y: centerY + this.offsetY,
        startAngle,
        endAngle: startAngle + circumference,
        circumference,
        outerRadius,
        innerRadius
      };
      if (includeOptions) {
        properties.options = sharedOptions || this.resolveDataElementOptions(i, arc.active ? 'active' : mode);
      }
      startAngle += circumference;
      this.updateElement(arc, i, properties, mode);
    }
    this.updateSharedOptions(sharedOptions, mode, firstOpts);
  }
  calculateTotal() {
    const meta = this._cachedMeta;
    const metaData = meta.data;
    let total = 0;
    let i;
    for (i = 0; i < metaData.length; i++) {
      const value = meta._parsed[i];
      if (value !== null && !isNaN(value) && this.chart.getDataVisibility(i) && !metaData[i].hidden) {
        total += Math.abs(value);
      }
    }
    return total;
  }
  calculateCircumference(value) {
    const total = this._cachedMeta.total;
    if (total > 0 && !isNaN(value)) {
      return TAU * (Math.abs(value) / total);
    }
    return 0;
  }
  getLabelAndValue(index) {
    const meta = this._cachedMeta;
    const chart = this.chart;
    const labels = chart.data.labels || [];
    const value = formatNumber(meta._parsed[index], chart.options.locale);
    return {
      label: labels[index] || '',
      value,
    };
  }
  getMaxBorderWidth(arcs) {
    let max = 0;
    const chart = this.chart;
    let i, ilen, meta, controller, options;
    if (!arcs) {
      for (i = 0, ilen = chart.data.datasets.length; i < ilen; ++i) {
        if (chart.isDatasetVisible(i)) {
          meta = chart.getDatasetMeta(i);
          arcs = meta.data;
          controller = meta.controller;
          if (controller !== this) {
            controller.configure();
          }
          break;
        }
      }
    }
    if (!arcs) {
      return 0;
    }
    for (i = 0, ilen = arcs.length; i < ilen; ++i) {
      options = controller.resolveDataElementOptions(i);
      if (options.borderAlign !== 'inner') {
        max = Math.max(max, options.borderWidth || 0, options.hoverBorderWidth || 0);
      }
    }
    return max;
  }
  getMaxOffset(arcs) {
    let max = 0;
    for (let i = 0, ilen = arcs.length; i < ilen; ++i) {
      const options = this.resolveDataElementOptions(i);
      max = Math.max(max, options.offset || 0, options.hoverOffset || 0);
    }
    return max;
  }
  _getRingWeightOffset(datasetIndex) {
    let ringWeightOffset = 0;
    for (let i = 0; i < datasetIndex; ++i) {
      if (this.chart.isDatasetVisible(i)) {
        ringWeightOffset += this._getRingWeight(i);
      }
    }
    return ringWeightOffset;
  }
  _getRingWeight(datasetIndex) {
    return Math.max(valueOrDefault(this.chart.data.datasets[datasetIndex].weight, 1), 0);
  }
  _getVisibleDatasetWeightTotal() {
    return this._getRingWeightOffset(this.chart.data.datasets.length) || 1;
  }
}
DoughnutController.id = 'doughnut';
DoughnutController.defaults = {
  datasetElementType: false,
  dataElementType: 'arc',
  animation: {
    animateRotate: true,
    animateScale: false
  },
  animations: {
    numbers: {
      type: 'number',
      properties: ['circumference', 'endAngle', 'innerRadius', 'outerRadius', 'startAngle', 'x', 'y', 'offset', 'borderWidth', 'spacing']
    },
  },
  cutout: '50%',
  rotation: 0,
  circumference: 360,
  radius: '100%',
  spacing: 0,
  indexAxis: 'r',
};
DoughnutController.descriptors = {
  _scriptable: (name) => name !== 'spacing',
  _indexable: (name) => name !== 'spacing',
};
DoughnutController.overrides = {
  aspectRatio: 1,
  plugins: {
    legend: {
      labels: {
        generateLabels(chart) {
          const data = chart.data;
          if (data.labels.length && data.datasets.length) {
            const {labels: {pointStyle}} = chart.legend.options;
            return data.labels.map((label, i) => {
              const meta = chart.getDatasetMeta(0);
              const style = meta.controller.getStyle(i);
              return {
                text: label,
                fillStyle: style.backgroundColor,
                strokeStyle: style.borderColor,
                lineWidth: style.borderWidth,
                pointStyle: pointStyle,
                hidden: !chart.getDataVisibility(i),
                index: i
              };
            });
          }
          return [];
        }
      },
      onClick(e, legendItem, legend) {
        legend.chart.toggleDataVisibility(legendItem.index);
        legend.chart.update();
      }
    },
    tooltip: {
      callbacks: {
        title() {
          return '';
        },
        label(tooltipItem) {
          let dataLabel = tooltipItem.label;
          const value = ': ' + tooltipItem.formattedValue;
          if (isArray(dataLabel)) {
            dataLabel = dataLabel.slice();
            dataLabel[0] += value;
          } else {
            dataLabel += value;
          }
          return dataLabel;
        }
      }
    }
  }
};

class LineController extends DatasetController {
  initialize() {
    this.enableOptionSharing = true;
    super.initialize();
  }
  update(mode) {
    const meta = this._cachedMeta;
    const {dataset: line, data: points = [], _dataset} = meta;
    const animationsDisabled = this.chart._animationsDisabled;
    let {start, count} = getStartAndCountOfVisiblePoints(meta, points, animationsDisabled);
    this._drawStart = start;
    this._drawCount = count;
    if (scaleRangesChanged(meta)) {
      start = 0;
      count = points.length;
    }
    line._chart = this.chart;
    line._datasetIndex = this.index;
    line._decimated = !!_dataset._decimated;
    line.points = points;
    const options = this.resolveDatasetElementOptions(mode);
    if (!this.options.showLine) {
      options.borderWidth = 0;
    }
    options.segment = this.options.segment;
    this.updateElement(line, undefined, {
      animated: !animationsDisabled,
      options
    }, mode);
    this.updateElements(points, start, count, mode);
  }
  updateElements(points, start, count, mode) {
    const reset = mode === 'reset';
    const {iScale, vScale, _stacked, _dataset} = this._cachedMeta;
    const firstOpts = this.resolveDataElementOptions(start, mode);
    const sharedOptions = this.getSharedOptions(firstOpts);
    const includeOptions = this.includeOptions(mode, sharedOptions);
    const iAxis = iScale.axis;
    const vAxis = vScale.axis;
    const {spanGaps, segment} = this.options;
    const maxGapLength = isNumber(spanGaps) ? spanGaps : Number.POSITIVE_INFINITY;
    const directUpdate = this.chart._animationsDisabled || reset || mode === 'none';
    let prevParsed = start > 0 && this.getParsed(start - 1);
    for (let i = start; i < start + count; ++i) {
      const point = points[i];
      const parsed = this.getParsed(i);
      const properties = directUpdate ? point : {};
      const nullData = isNullOrUndef(parsed[vAxis]);
      const iPixel = properties[iAxis] = iScale.getPixelForValue(parsed[iAxis], i);
      const vPixel = properties[vAxis] = reset || nullData ? vScale.getBasePixel() : vScale.getPixelForValue(_stacked ? this.applyStack(vScale, parsed, _stacked) : parsed[vAxis], i);
      properties.skip = isNaN(iPixel) || isNaN(vPixel) || nullData;
      properties.stop = i > 0 && (parsed[iAxis] - prevParsed[iAxis]) > maxGapLength;
      if (segment) {
        properties.parsed = parsed;
        properties.raw = _dataset.data[i];
      }
      if (includeOptions) {
        properties.options = sharedOptions || this.resolveDataElementOptions(i, point.active ? 'active' : mode);
      }
      if (!directUpdate) {
        this.updateElement(point, i, properties, mode);
      }
      prevParsed = parsed;
    }
    this.updateSharedOptions(sharedOptions, mode, firstOpts);
  }
  getMaxOverflow() {
    const meta = this._cachedMeta;
    const dataset = meta.dataset;
    const border = dataset.options && dataset.options.borderWidth || 0;
    const data = meta.data || [];
    if (!data.length) {
      return border;
    }
    const firstPoint = data[0].size(this.resolveDataElementOptions(0));
    const lastPoint = data[data.length - 1].size(this.resolveDataElementOptions(data.length - 1));
    return Math.max(border, firstPoint, lastPoint) / 2;
  }
  draw() {
    const meta = this._cachedMeta;
    meta.dataset.updateControlPoints(this.chart.chartArea, meta.iScale.axis);
    super.draw();
  }
}
LineController.id = 'line';
LineController.defaults = {
  datasetElementType: 'line',
  dataElementType: 'point',
  showLine: true,
  spanGaps: false,
};
LineController.overrides = {
  scales: {
    _index_: {
      type: 'category',
    },
    _value_: {
      type: 'linear',
    },
  }
};
function getStartAndCountOfVisiblePoints(meta, points, animationsDisabled) {
  const pointCount = points.length;
  let start = 0;
  let count = pointCount;
  if (meta._sorted) {
    const {iScale, _parsed} = meta;
    const axis = iScale.axis;
    const {min, max, minDefined, maxDefined} = iScale.getUserBounds();
    if (minDefined) {
      start = _limitValue(Math.min(
        _lookupByKey(_parsed, iScale.axis, min).lo,
        animationsDisabled ? pointCount : _lookupByKey(points, axis, iScale.getPixelForValue(min)).lo),
      0, pointCount - 1);
    }
    if (maxDefined) {
      count = _limitValue(Math.max(
        _lookupByKey(_parsed, iScale.axis, max).hi + 1,
        animationsDisabled ? 0 : _lookupByKey(points, axis, iScale.getPixelForValue(max)).hi + 1),
      start, pointCount) - start;
    } else {
      count = pointCount - start;
    }
  }
  return {start, count};
}
function scaleRangesChanged(meta) {
  const {xScale, yScale, _scaleRanges} = meta;
  const newRanges = {
    xmin: xScale.min,
    xmax: xScale.max,
    ymin: yScale.min,
    ymax: yScale.max
  };
  if (!_scaleRanges) {
    meta._scaleRanges = newRanges;
    return true;
  }
  const changed = _scaleRanges.xmin !== xScale.min
		|| _scaleRanges.xmax !== xScale.max
		|| _scaleRanges.ymin !== yScale.min
		|| _scaleRanges.ymax !== yScale.max;
  Object.assign(_scaleRanges, newRanges);
  return changed;
}

class PolarAreaController extends DatasetController {
  constructor(chart, datasetIndex) {
    super(chart, datasetIndex);
    this.innerRadius = undefined;
    this.outerRadius = undefined;
  }
  getLabelAndValue(index) {
    const meta = this._cachedMeta;
    const chart = this.chart;
    const labels = chart.data.labels || [];
    const value = formatNumber(meta._parsed[index].r, chart.options.locale);
    return {
      label: labels[index] || '',
      value,
    };
  }
  update(mode) {
    const arcs = this._cachedMeta.data;
    this._updateRadius();
    this.updateElements(arcs, 0, arcs.length, mode);
  }
  _updateRadius() {
    const chart = this.chart;
    const chartArea = chart.chartArea;
    const opts = chart.options;
    const minSize = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
    const outerRadius = Math.max(minSize / 2, 0);
    const innerRadius = Math.max(opts.cutoutPercentage ? (outerRadius / 100) * (opts.cutoutPercentage) : 1, 0);
    const radiusLength = (outerRadius - innerRadius) / chart.getVisibleDatasetCount();
    this.outerRadius = outerRadius - (radiusLength * this.index);
    this.innerRadius = this.outerRadius - radiusLength;
  }
  updateElements(arcs, start, count, mode) {
    const reset = mode === 'reset';
    const chart = this.chart;
    const dataset = this.getDataset();
    const opts = chart.options;
    const animationOpts = opts.animation;
    const scale = this._cachedMeta.rScale;
    const centerX = scale.xCenter;
    const centerY = scale.yCenter;
    const datasetStartAngle = scale.getIndexAngle(0) - 0.5 * PI;
    let angle = datasetStartAngle;
    let i;
    const defaultAngle = 360 / this.countVisibleElements();
    for (i = 0; i < start; ++i) {
      angle += this._computeAngle(i, mode, defaultAngle);
    }
    for (i = start; i < start + count; i++) {
      const arc = arcs[i];
      let startAngle = angle;
      let endAngle = angle + this._computeAngle(i, mode, defaultAngle);
      let outerRadius = chart.getDataVisibility(i) ? scale.getDistanceFromCenterForValue(dataset.data[i]) : 0;
      angle = endAngle;
      if (reset) {
        if (animationOpts.animateScale) {
          outerRadius = 0;
        }
        if (animationOpts.animateRotate) {
          startAngle = endAngle = datasetStartAngle;
        }
      }
      const properties = {
        x: centerX,
        y: centerY,
        innerRadius: 0,
        outerRadius,
        startAngle,
        endAngle,
        options: this.resolveDataElementOptions(i, arc.active ? 'active' : mode)
      };
      this.updateElement(arc, i, properties, mode);
    }
  }
  countVisibleElements() {
    const dataset = this.getDataset();
    const meta = this._cachedMeta;
    let count = 0;
    meta.data.forEach((element, index) => {
      if (!isNaN(dataset.data[index]) && this.chart.getDataVisibility(index)) {
        count++;
      }
    });
    return count;
  }
  _computeAngle(index, mode, defaultAngle) {
    return this.chart.getDataVisibility(index)
      ? toRadians(this.resolveDataElementOptions(index, mode).angle || defaultAngle)
      : 0;
  }
}
PolarAreaController.id = 'polarArea';
PolarAreaController.defaults = {
  dataElementType: 'arc',
  animation: {
    animateRotate: true,
    animateScale: true
  },
  animations: {
    numbers: {
      type: 'number',
      properties: ['x', 'y', 'startAngle', 'endAngle', 'innerRadius', 'outerRadius']
    },
  },
  indexAxis: 'r',
  startAngle: 0,
};
PolarAreaController.overrides = {
  aspectRatio: 1,
  plugins: {
    legend: {
      labels: {
        generateLabels(chart) {
          const data = chart.data;
          if (data.labels.length && data.datasets.length) {
            const {labels: {pointStyle}} = chart.legend.options;
            return data.labels.map((label, i) => {
              const meta = chart.getDatasetMeta(0);
              const style = meta.controller.getStyle(i);
              return {
                text: label,
                fillStyle: style.backgroundColor,
                strokeStyle: style.borderColor,
                lineWidth: style.borderWidth,
                pointStyle: pointStyle,
                hidden: !chart.getDataVisibility(i),
                index: i
              };
            });
          }
          return [];
        }
      },
      onClick(e, legendItem, legend) {
        legend.chart.toggleDataVisibility(legendItem.index);
        legend.chart.update();
      }
    },
    tooltip: {
      callbacks: {
        title() {
          return '';
        },
        label(context) {
          return context.chart.data.labels[context.dataIndex] + ': ' + context.formattedValue;
        }
      }
    }
  },
  scales: {
    r: {
      type: 'radialLinear',
      angleLines: {
        display: false
      },
      beginAtZero: true,
      grid: {
        circular: true
      },
      pointLabels: {
        display: false
      },
      startAngle: 0
    }
  }
};

class PieController extends DoughnutController {
}
PieController.id = 'pie';
PieController.defaults = {
  cutout: 0,
  rotation: 0,
  circumference: 360,
  radius: '100%'
};

class RadarController extends DatasetController {
  getLabelAndValue(index) {
    const vScale = this._cachedMeta.vScale;
    const parsed = this.getParsed(index);
    return {
      label: vScale.getLabels()[index],
      value: '' + vScale.getLabelForValue(parsed[vScale.axis])
    };
  }
  update(mode) {
    const meta = this._cachedMeta;
    const line = meta.dataset;
    const points = meta.data || [];
    const labels = meta.iScale.getLabels();
    line.points = points;
    if (mode !== 'resize') {
      const options = this.resolveDatasetElementOptions(mode);
      if (!this.options.showLine) {
        options.borderWidth = 0;
      }
      const properties = {
        _loop: true,
        _fullLoop: labels.length === points.length,
        options
      };
      this.updateElement(line, undefined, properties, mode);
    }
    this.updateElements(points, 0, points.length, mode);
  }
  updateElements(points, start, count, mode) {
    const dataset = this.getDataset();
    const scale = this._cachedMeta.rScale;
    const reset = mode === 'reset';
    for (let i = start; i < start + count; i++) {
      const point = points[i];
      const options = this.resolveDataElementOptions(i, point.active ? 'active' : mode);
      const pointPosition = scale.getPointPositionForValue(i, dataset.data[i]);
      const x = reset ? scale.xCenter : pointPosition.x;
      const y = reset ? scale.yCenter : pointPosition.y;
      const properties = {
        x,
        y,
        angle: pointPosition.angle,
        skip: isNaN(x) || isNaN(y),
        options
      };
      this.updateElement(point, i, properties, mode);
    }
  }
}
RadarController.id = 'radar';
RadarController.defaults = {
  datasetElementType: 'line',
  dataElementType: 'point',
  indexAxis: 'r',
  showLine: true,
  elements: {
    line: {
      fill: 'start'
    }
  },
};
RadarController.overrides = {
  aspectRatio: 1,
  scales: {
    r: {
      type: 'radialLinear',
    }
  }
};

class ScatterController extends LineController {
}
ScatterController.id = 'scatter';
ScatterController.defaults = {
  showLine: false,
  fill: false
};
ScatterController.overrides = {
  interaction: {
    mode: 'point'
  },
  plugins: {
    tooltip: {
      callbacks: {
        title() {
          return '';
        },
        label(item) {
          return '(' + item.label + ', ' + item.formattedValue + ')';
        }
      }
    }
  },
  scales: {
    x: {
      type: 'linear'
    },
    y: {
      type: 'linear'
    }
  }
};

var controllers = /*#__PURE__*/Object.freeze({
__proto__: null,
BarController: BarController,
BubbleController: BubbleController,
DoughnutController: DoughnutController,
LineController: LineController,
PolarAreaController: PolarAreaController,
PieController: PieController,
RadarController: RadarController,
ScatterController: ScatterController
});

function abstract() {
  throw new Error('This method is not implemented: Check that a complete date adapter is provided.');
}
class DateAdapter {
  constructor(options) {
    this.options = options || {};
  }
  formats() {
    return abstract();
  }
  parse(value, format) {
    return abstract();
  }
  format(timestamp, format) {
    return abstract();
  }
  add(timestamp, amount, unit) {
    return abstract();
  }
  diff(a, b, unit) {
    return abstract();
  }
  startOf(timestamp, unit, weekday) {
    return abstract();
  }
  endOf(timestamp, unit) {
    return abstract();
  }
}
DateAdapter.override = function(members) {
  Object.assign(DateAdapter.prototype, members);
};
var adapters = {
  _date: DateAdapter
};

function getRelativePosition(e, chart) {
  if ('native' in e) {
    return {
      x: e.x,
      y: e.y
    };
  }
  return getRelativePosition$1(e, chart);
}
function evaluateAllVisibleItems(chart, handler) {
  const metasets = chart.getSortedVisibleDatasetMetas();
  let index, data, element;
  for (let i = 0, ilen = metasets.length; i < ilen; ++i) {
    ({index, data} = metasets[i]);
    for (let j = 0, jlen = data.length; j < jlen; ++j) {
      element = data[j];
      if (!element.skip) {
        handler(element, index, j);
      }
    }
  }
}
function binarySearch(metaset, axis, value, intersect) {
  const {controller, data, _sorted} = metaset;
  const iScale = controller._cachedMeta.iScale;
  if (iScale && axis === iScale.axis && _sorted && data.length) {
    const lookupMethod = iScale._reversePixels ? _rlookupByKey : _lookupByKey;
    if (!intersect) {
      return lookupMethod(data, axis, value);
    } else if (controller._sharedOptions) {
      const el = data[0];
      const range = typeof el.getRange === 'function' && el.getRange(axis);
      if (range) {
        const start = lookupMethod(data, axis, value - range);
        const end = lookupMethod(data, axis, value + range);
        return {lo: start.lo, hi: end.hi};
      }
    }
  }
  return {lo: 0, hi: data.length - 1};
}
function optimizedEvaluateItems(chart, axis, position, handler, intersect) {
  const metasets = chart.getSortedVisibleDatasetMetas();
  const value = position[axis];
  for (let i = 0, ilen = metasets.length; i < ilen; ++i) {
    const {index, data} = metasets[i];
    const {lo, hi} = binarySearch(metasets[i], axis, value, intersect);
    for (let j = lo; j <= hi; ++j) {
      const element = data[j];
      if (!element.skip) {
        handler(element, index, j);
      }
    }
  }
}
function getDistanceMetricForAxis(axis) {
  const useX = axis.indexOf('x') !== -1;
  const useY = axis.indexOf('y') !== -1;
  return function(pt1, pt2) {
    const deltaX = useX ? Math.abs(pt1.x - pt2.x) : 0;
    const deltaY = useY ? Math.abs(pt1.y - pt2.y) : 0;
    return Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
  };
}
function getIntersectItems(chart, position, axis, useFinalPosition) {
  const items = [];
  if (!_isPointInArea(position, chart.chartArea, chart._minPadding)) {
    return items;
  }
  const evaluationFunc = function(element, datasetIndex, index) {
    if (element.inRange(position.x, position.y, useFinalPosition)) {
      items.push({element, datasetIndex, index});
    }
  };
  optimizedEvaluateItems(chart, axis, position, evaluationFunc, true);
  return items;
}
function getNearestItems(chart, position, axis, intersect, useFinalPosition) {
  const distanceMetric = getDistanceMetricForAxis(axis);
  let minDistance = Number.POSITIVE_INFINITY;
  let items = [];
  if (!_isPointInArea(position, chart.chartArea, chart._minPadding)) {
    return items;
  }
  const evaluationFunc = function(element, datasetIndex, index) {
    if (intersect && !element.inRange(position.x, position.y, useFinalPosition)) {
      return;
    }
    const center = element.getCenterPoint(useFinalPosition);
    if (!_isPointInArea(center, chart.chartArea, chart._minPadding) && !element.inRange(position.x, position.y, useFinalPosition)) {
      return;
    }
    const distance = distanceMetric(position, center);
    if (distance < minDistance) {
      items = [{element, datasetIndex, index}];
      minDistance = distance;
    } else if (distance === minDistance) {
      items.push({element, datasetIndex, index});
    }
  };
  optimizedEvaluateItems(chart, axis, position, evaluationFunc);
  return items;
}
function getAxisItems(chart, e, options, useFinalPosition) {
  const position = getRelativePosition(e, chart);
  const items = [];
  const axis = options.axis;
  const rangeMethod = axis === 'x' ? 'inXRange' : 'inYRange';
  let intersectsItem = false;
  evaluateAllVisibleItems(chart, (element, datasetIndex, index) => {
    if (element[rangeMethod](position[axis], useFinalPosition)) {
      items.push({element, datasetIndex, index});
    }
    if (element.inRange(position.x, position.y, useFinalPosition)) {
      intersectsItem = true;
    }
  });
  if (options.intersect && !intersectsItem) {
    return [];
  }
  return items;
}
var Interaction = {
  modes: {
    index(chart, e, options, useFinalPosition) {
      const position = getRelativePosition(e, chart);
      const axis = options.axis || 'x';
      const items = options.intersect
        ? getIntersectItems(chart, position, axis, useFinalPosition)
        : getNearestItems(chart, position, axis, false, useFinalPosition);
      const elements = [];
      if (!items.length) {
        return [];
      }
      chart.getSortedVisibleDatasetMetas().forEach((meta) => {
        const index = items[0].index;
        const element = meta.data[index];
        if (element && !element.skip) {
          elements.push({element, datasetIndex: meta.index, index});
        }
      });
      return elements;
    },
    dataset(chart, e, options, useFinalPosition) {
      const position = getRelativePosition(e, chart);
      const axis = options.axis || 'xy';
      let items = options.intersect
        ? getIntersectItems(chart, position, axis, useFinalPosition) :
        getNearestItems(chart, position, axis, false, useFinalPosition);
      if (items.length > 0) {
        const datasetIndex = items[0].datasetIndex;
        const data = chart.getDatasetMeta(datasetIndex).data;
        items = [];
        for (let i = 0; i < data.length; ++i) {
          items.push({element: data[i], datasetIndex, index: i});
        }
      }
      return items;
    },
    point(chart, e, options, useFinalPosition) {
      const position = getRelativePosition(e, chart);
      const axis = options.axis || 'xy';
      return getIntersectItems(chart, position, axis, useFinalPosition);
    },
    nearest(chart, e, options, useFinalPosition) {
      const position = getRelativePosition(e, chart);
      const axis = options.axis || 'xy';
      return getNearestItems(chart, position, axis, options.intersect, useFinalPosition);
    },
    x(chart, e, options, useFinalPosition) {
      options.axis = 'x';
      return getAxisItems(chart, e, options, useFinalPosition);
    },
    y(chart, e, options, useFinalPosition) {
      options.axis = 'y';
      return getAxisItems(chart, e, options, useFinalPosition);
    }
  }
};

const STATIC_POSITIONS = ['left', 'top', 'right', 'bottom'];
function filterByPosition(array, position) {
  return array.filter(v => v.pos === position);
}
function filterDynamicPositionByAxis(array, axis) {
  return array.filter(v => STATIC_POSITIONS.indexOf(v.pos) === -1 && v.box.axis === axis);
}
function sortByWeight(array, reverse) {
  return array.sort((a, b) => {
    const v0 = reverse ? b : a;
    const v1 = reverse ? a : b;
    return v0.weight === v1.weight ?
      v0.index - v1.index :
      v0.weight - v1.weight;
  });
}
function wrapBoxes(boxes) {
  const layoutBoxes = [];
  let i, ilen, box, pos, stack, stackWeight;
  for (i = 0, ilen = (boxes || []).length; i < ilen; ++i) {
    box = boxes[i];
    ({position: pos, options: {stack, stackWeight = 1}} = box);
    layoutBoxes.push({
      index: i,
      box,
      pos,
      horizontal: box.isHorizontal(),
      weight: box.weight,
      stack: stack && (pos + stack),
      stackWeight
    });
  }
  return layoutBoxes;
}
function buildStacks(layouts) {
  const stacks = {};
  for (const wrap of layouts) {
    const {stack, pos, stackWeight} = wrap;
    if (!stack || !STATIC_POSITIONS.includes(pos)) {
      continue;
    }
    const _stack = stacks[stack] || (stacks[stack] = {count: 0, placed: 0, weight: 0, size: 0});
    _stack.count++;
    _stack.weight += stackWeight;
  }
  return stacks;
}
function setLayoutDims(layouts, params) {
  const stacks = buildStacks(layouts);
  const {vBoxMaxWidth, hBoxMaxHeight} = params;
  let i, ilen, layout;
  for (i = 0, ilen = layouts.length; i < ilen; ++i) {
    layout = layouts[i];
    const {fullSize} = layout.box;
    const stack = stacks[layout.stack];
    const factor = stack && layout.stackWeight / stack.weight;
    if (layout.horizontal) {
      layout.width = factor ? factor * vBoxMaxWidth : fullSize && params.availableWidth;
      layout.height = hBoxMaxHeight;
    } else {
      layout.width = vBoxMaxWidth;
      layout.height = factor ? factor * hBoxMaxHeight : fullSize && params.availableHeight;
    }
  }
  return stacks;
}
function buildLayoutBoxes(boxes) {
  const layoutBoxes = wrapBoxes(boxes);
  const fullSize = sortByWeight(layoutBoxes.filter(wrap => wrap.box.fullSize), true);
  const left = sortByWeight(filterByPosition(layoutBoxes, 'left'), true);
  const right = sortByWeight(filterByPosition(layoutBoxes, 'right'));
  const top = sortByWeight(filterByPosition(layoutBoxes, 'top'), true);
  const bottom = sortByWeight(filterByPosition(layoutBoxes, 'bottom'));
  const centerHorizontal = filterDynamicPositionByAxis(layoutBoxes, 'x');
  const centerVertical = filterDynamicPositionByAxis(layoutBoxes, 'y');
  return {
    fullSize,
    leftAndTop: left.concat(top),
    rightAndBottom: right.concat(centerVertical).concat(bottom).concat(centerHorizontal),
    chartArea: filterByPosition(layoutBoxes, 'chartArea'),
    vertical: left.concat(right).concat(centerVertical),
    horizontal: top.concat(bottom).concat(centerHorizontal)
  };
}
function getCombinedMax(maxPadding, chartArea, a, b) {
  return Math.max(maxPadding[a], chartArea[a]) + Math.max(maxPadding[b], chartArea[b]);
}
function updateMaxPadding(maxPadding, boxPadding) {
  maxPadding.top = Math.max(maxPadding.top, boxPadding.top);
  maxPadding.left = Math.max(maxPadding.left, boxPadding.left);
  maxPadding.bottom = Math.max(maxPadding.bottom, boxPadding.bottom);
  maxPadding.right = Math.max(maxPadding.right, boxPadding.right);
}
function updateDims(chartArea, params, layout, stacks) {
  const {pos, box} = layout;
  const maxPadding = chartArea.maxPadding;
  if (!isObject(pos)) {
    if (layout.size) {
      chartArea[pos] -= layout.size;
    }
    const stack = stacks[layout.stack] || {size: 0, count: 1};
    stack.size = Math.max(stack.size, layout.horizontal ? box.height : box.width);
    layout.size = stack.size / stack.count;
    chartArea[pos] += layout.size;
  }
  if (box.getPadding) {
    updateMaxPadding(maxPadding, box.getPadding());
  }
  const newWidth = Math.max(0, params.outerWidth - getCombinedMax(maxPadding, chartArea, 'left', 'right'));
  const newHeight = Math.max(0, params.outerHeight - getCombinedMax(maxPadding, chartArea, 'top', 'bottom'));
  const widthChanged = newWidth !== chartArea.w;
  const heightChanged = newHeight !== chartArea.h;
  chartArea.w = newWidth;
  chartArea.h = newHeight;
  return layout.horizontal
    ? {same: widthChanged, other: heightChanged}
    : {same: heightChanged, other: widthChanged};
}
function handleMaxPadding(chartArea) {
  const maxPadding = chartArea.maxPadding;
  function updatePos(pos) {
    const change = Math.max(maxPadding[pos] - chartArea[pos], 0);
    chartArea[pos] += change;
    return change;
  }
  chartArea.y += updatePos('top');
  chartArea.x += updatePos('left');
  updatePos('right');
  updatePos('bottom');
}
function getMargins(horizontal, chartArea) {
  const maxPadding = chartArea.maxPadding;
  function marginForPositions(positions) {
    const margin = {left: 0, top: 0, right: 0, bottom: 0};
    positions.forEach((pos) => {
      margin[pos] = Math.max(chartArea[pos], maxPadding[pos]);
    });
    return margin;
  }
  return horizontal
    ? marginForPositions(['left', 'right'])
    : marginForPositions(['top', 'bottom']);
}
function fitBoxes(boxes, chartArea, params, stacks) {
  const refitBoxes = [];
  let i, ilen, layout, box, refit, changed;
  for (i = 0, ilen = boxes.length, refit = 0; i < ilen; ++i) {
    layout = boxes[i];
    box = layout.box;
    box.update(
      layout.width || chartArea.w,
      layout.height || chartArea.h,
      getMargins(layout.horizontal, chartArea)
    );
    const {same, other} = updateDims(chartArea, params, layout, stacks);
    refit |= same && refitBoxes.length;
    changed = changed || other;
    if (!box.fullSize) {
      refitBoxes.push(layout);
    }
  }
  return refit && fitBoxes(refitBoxes, chartArea, params, stacks) || changed;
}
function setBoxDims(box, left, top, width, height) {
  box.top = top;
  box.left = left;
  box.right = left + width;
  box.bottom = top + height;
  box.width = width;
  box.height = height;
}
function placeBoxes(boxes, chartArea, params, stacks) {
  const userPadding = params.padding;
  let {x, y} = chartArea;
  for (const layout of boxes) {
    const box = layout.box;
    const stack = stacks[layout.stack] || {count: 1, placed: 0, weight: 1};
    const weight = (layout.stackWeight / stack.weight) || 1;
    if (layout.horizontal) {
      const width = chartArea.w * weight;
      const height = stack.size || box.height;
      if (defined(stack.start)) {
        y = stack.start;
      }
      if (box.fullSize) {
        setBoxDims(box, userPadding.left, y, params.outerWidth - userPadding.right - userPadding.left, height);
      } else {
        setBoxDims(box, chartArea.left + stack.placed, y, width, height);
      }
      stack.start = y;
      stack.placed += width;
      y = box.bottom;
    } else {
      const height = chartArea.h * weight;
      const width = stack.size || box.width;
      if (defined(stack.start)) {
        x = stack.start;
      }
      if (box.fullSize) {
        setBoxDims(box, x, userPadding.top, width, params.outerHeight - userPadding.bottom - userPadding.top);
      } else {
        setBoxDims(box, x, chartArea.top + stack.placed, width, height);
      }
      stack.start = x;
      stack.placed += height;
      x = box.right;
    }
  }
  chartArea.x = x;
  chartArea.y = y;
}
defaults$1.set('layout', {
  autoPadding: true,
  padding: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  }
});
var layouts = {
  addBox(chart, item) {
    if (!chart.boxes) {
      chart.boxes = [];
    }
    item.fullSize = item.fullSize || false;
    item.position = item.position || 'top';
    item.weight = item.weight || 0;
    item._layers = item._layers || function() {
      return [{
        z: 0,
        draw(chartArea) {
          item.draw(chartArea);
        }
      }];
    };
    chart.boxes.push(item);
  },
  removeBox(chart, layoutItem) {
    const index = chart.boxes ? chart.boxes.indexOf(layoutItem) : -1;
    if (index !== -1) {
      chart.boxes.splice(index, 1);
    }
  },
  configure(chart, item, options) {
    item.fullSize = options.fullSize;
    item.position = options.position;
    item.weight = options.weight;
  },
  update(chart, width, height, minPadding) {
    if (!chart) {
      return;
    }
    const padding = toPadding(chart.options.layout.padding);
    const availableWidth = Math.max(width - padding.width, 0);
    const availableHeight = Math.max(height - padding.height, 0);
    const boxes = buildLayoutBoxes(chart.boxes);
    const verticalBoxes = boxes.vertical;
    const horizontalBoxes = boxes.horizontal;
    each(chart.boxes, box => {
      if (typeof box.beforeLayout === 'function') {
        box.beforeLayout();
      }
    });
    const visibleVerticalBoxCount = verticalBoxes.reduce((total, wrap) =>
      wrap.box.options && wrap.box.options.display === false ? total : total + 1, 0) || 1;
    const params = Object.freeze({
      outerWidth: width,
      outerHeight: height,
      padding,
      availableWidth,
      availableHeight,
      vBoxMaxWidth: availableWidth / 2 / visibleVerticalBoxCount,
      hBoxMaxHeight: availableHeight / 2
    });
    const maxPadding = Object.assign({}, padding);
    updateMaxPadding(maxPadding, toPadding(minPadding));
    const chartArea = Object.assign({
      maxPadding,
      w: availableWidth,
      h: availableHeight,
      x: padding.left,
      y: padding.top
    }, padding);
    const stacks = setLayoutDims(verticalBoxes.concat(horizontalBoxes), params);
    fitBoxes(boxes.fullSize, chartArea, params, stacks);
    fitBoxes(verticalBoxes, chartArea, params, stacks);
    if (fitBoxes(horizontalBoxes, chartArea, params, stacks)) {
      fitBoxes(verticalBoxes, chartArea, params, stacks);
    }
    handleMaxPadding(chartArea);
    placeBoxes(boxes.leftAndTop, chartArea, params, stacks);
    chartArea.x += chartArea.w;
    chartArea.y += chartArea.h;
    placeBoxes(boxes.rightAndBottom, chartArea, params, stacks);
    chart.chartArea = {
      left: chartArea.left,
      top: chartArea.top,
      right: chartArea.left + chartArea.w,
      bottom: chartArea.top + chartArea.h,
      height: chartArea.h,
      width: chartArea.w,
    };
    each(boxes.chartArea, (layout) => {
      const box = layout.box;
      Object.assign(box, chart.chartArea);
      box.update(chartArea.w, chartArea.h);
    });
  }
};

class BasePlatform {
  acquireContext(canvas, aspectRatio) {}
  releaseContext(context) {
    return false;
  }
  addEventListener(chart, type, listener) {}
  removeEventListener(chart, type, listener) {}
  getDevicePixelRatio() {
    return 1;
  }
  getMaximumSize(element, width, height, aspectRatio) {
    width = Math.max(0, width || element.width);
    height = height || element.height;
    return {
      width,
      height: Math.max(0, aspectRatio ? Math.floor(width / aspectRatio) : height)
    };
  }
  isAttached(canvas) {
    return true;
  }
  updateConfig(config) {
  }
}

class BasicPlatform extends BasePlatform {
  acquireContext(item) {
    return item && item.getContext && item.getContext('2d') || null;
  }
  updateConfig(config) {
    config.options.animation = false;
  }
}

const EXPANDO_KEY$1 = '$chartjs';
const EVENT_TYPES = {
  touchstart: 'mousedown',
  touchmove: 'mousemove',
  touchend: 'mouseup',
  pointerenter: 'mouseenter',
  pointerdown: 'mousedown',
  pointermove: 'mousemove',
  pointerup: 'mouseup',
  pointerleave: 'mouseout',
  pointerout: 'mouseout'
};
const isNullOrEmpty = value => value === null || value === '';
function initCanvas(canvas, aspectRatio) {
  const style = canvas.style;
  const renderHeight = canvas.getAttribute('height');
  const renderWidth = canvas.getAttribute('width');
  canvas[EXPANDO_KEY$1] = {
    initial: {
      height: renderHeight,
      width: renderWidth,
      style: {
        display: style.display,
        height: style.height,
        width: style.width
      }
    }
  };
  style.display = style.display || 'block';
  style.boxSizing = style.boxSizing || 'border-box';
  if (isNullOrEmpty(renderWidth)) {
    const displayWidth = readUsedSize(canvas, 'width');
    if (displayWidth !== undefined) {
      canvas.width = displayWidth;
    }
  }
  if (isNullOrEmpty(renderHeight)) {
    if (canvas.style.height === '') {
      canvas.height = canvas.width / (aspectRatio || 2);
    } else {
      const displayHeight = readUsedSize(canvas, 'height');
      if (displayHeight !== undefined) {
        canvas.height = displayHeight;
      }
    }
  }
  return canvas;
}
const eventListenerOptions = supportsEventListenerOptions ? {passive: true} : false;
function addListener(node, type, listener) {
  node.addEventListener(type, listener, eventListenerOptions);
}
function removeListener(chart, type, listener) {
  chart.canvas.removeEventListener(type, listener, eventListenerOptions);
}
function fromNativeEvent(event, chart) {
  const type = EVENT_TYPES[event.type] || event.type;
  const {x, y} = getRelativePosition$1(event, chart);
  return {
    type,
    chart,
    native: event,
    x: x !== undefined ? x : null,
    y: y !== undefined ? y : null,
  };
}
function createAttachObserver(chart, type, listener) {
  const canvas = chart.canvas;
  const observer = new MutationObserver(entries => {
    for (const entry of entries) {
      for (const node of entry.addedNodes) {
        if (node === canvas || node.contains(canvas)) {
          return listener();
        }
      }
    }
  });
  observer.observe(document, {childList: true, subtree: true});
  return observer;
}
function createDetachObserver(chart, type, listener) {
  const canvas = chart.canvas;
  const observer = new MutationObserver(entries => {
    for (const entry of entries) {
      for (const node of entry.removedNodes) {
        if (node === canvas || node.contains(canvas)) {
          return listener();
        }
      }
    }
  });
  observer.observe(document, {childList: true, subtree: true});
  return observer;
}
const drpListeningCharts = new Map();
let oldDevicePixelRatio = 0;
function onWindowResize() {
  const dpr = window.devicePixelRatio;
  if (dpr === oldDevicePixelRatio) {
    return;
  }
  oldDevicePixelRatio = dpr;
  drpListeningCharts.forEach((resize, chart) => {
    if (chart.currentDevicePixelRatio !== dpr) {
      resize();
    }
  });
}
function listenDevicePixelRatioChanges(chart, resize) {
  if (!drpListeningCharts.size) {
    window.addEventListener('resize', onWindowResize);
  }
  drpListeningCharts.set(chart, resize);
}
function unlistenDevicePixelRatioChanges(chart) {
  drpListeningCharts.delete(chart);
  if (!drpListeningCharts.size) {
    window.removeEventListener('resize', onWindowResize);
  }
}
function createResizeObserver(chart, type, listener) {
  const canvas = chart.canvas;
  const container = canvas && _getParentNode(canvas);
  if (!container) {
    return;
  }
  const resize = throttled((width, height) => {
    const w = container.clientWidth;
    listener(width, height);
    if (w < container.clientWidth) {
      listener();
    }
  }, window);
  const observer = new ResizeObserver(entries => {
    const entry = entries[0];
    const width = entry.contentRect.width;
    const height = entry.contentRect.height;
    if (width === 0 && height === 0) {
      return;
    }
    resize(width, height);
  });
  observer.observe(container);
  listenDevicePixelRatioChanges(chart, resize);
  return observer;
}
function releaseObserver(chart, type, observer) {
  if (observer) {
    observer.disconnect();
  }
  if (type === 'resize') {
    unlistenDevicePixelRatioChanges(chart);
  }
}
function createProxyAndListen(chart, type, listener) {
  const canvas = chart.canvas;
  const proxy = throttled((event) => {
    if (chart.ctx !== null) {
      listener(fromNativeEvent(event, chart));
    }
  }, chart, (args) => {
    const event = args[0];
    return [event, event.offsetX, event.offsetY];
  });
  addListener(canvas, type, proxy);
  return proxy;
}
class DomPlatform extends BasePlatform {
  acquireContext(canvas, aspectRatio) {
    const context = canvas && canvas.getContext && canvas.getContext('2d');
    if (context && context.canvas === canvas) {
      initCanvas(canvas, aspectRatio);
      return context;
    }
    return null;
  }
  releaseContext(context) {
    const canvas = context.canvas;
    if (!canvas[EXPANDO_KEY$1]) {
      return false;
    }
    const initial = canvas[EXPANDO_KEY$1].initial;
    ['height', 'width'].forEach((prop) => {
      const value = initial[prop];
      if (isNullOrUndef(value)) {
        canvas.removeAttribute(prop);
      } else {
        canvas.setAttribute(prop, value);
      }
    });
    const style = initial.style || {};
    Object.keys(style).forEach((key) => {
      canvas.style[key] = style[key];
    });
    canvas.width = canvas.width;
    delete canvas[EXPANDO_KEY$1];
    return true;
  }
  addEventListener(chart, type, listener) {
    this.removeEventListener(chart, type);
    const proxies = chart.$proxies || (chart.$proxies = {});
    const handlers = {
      attach: createAttachObserver,
      detach: createDetachObserver,
      resize: createResizeObserver
    };
    const handler = handlers[type] || createProxyAndListen;
    proxies[type] = handler(chart, type, listener);
  }
  removeEventListener(chart, type) {
    const proxies = chart.$proxies || (chart.$proxies = {});
    const proxy = proxies[type];
    if (!proxy) {
      return;
    }
    const handlers = {
      attach: releaseObserver,
      detach: releaseObserver,
      resize: releaseObserver
    };
    const handler = handlers[type] || removeListener;
    handler(chart, type, proxy);
    proxies[type] = undefined;
  }
  getDevicePixelRatio() {
    return window.devicePixelRatio;
  }
  getMaximumSize(canvas, width, height, aspectRatio) {
    return getMaximumSize(canvas, width, height, aspectRatio);
  }
  isAttached(canvas) {
    const container = _getParentNode(canvas);
    return !!(container && container.isConnected);
  }
}

function _detectPlatform(canvas) {
  if (!_isDomSupported() || (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas)) {
    return BasicPlatform;
  }
  return DomPlatform;
}

class Element {
  constructor() {
    this.x = undefined;
    this.y = undefined;
    this.active = false;
    this.options = undefined;
    this.$animations = undefined;
  }
  tooltipPosition(useFinalPosition) {
    const {x, y} = this.getProps(['x', 'y'], useFinalPosition);
    return {x, y};
  }
  hasValue() {
    return isNumber(this.x) && isNumber(this.y);
  }
  getProps(props, final) {
    const anims = this.$animations;
    if (!final || !anims) {
      return this;
    }
    const ret = {};
    props.forEach(prop => {
      ret[prop] = anims[prop] && anims[prop].active() ? anims[prop]._to : this[prop];
    });
    return ret;
  }
}
Element.defaults = {};
Element.defaultRoutes = undefined;

const formatters = {
  values(value) {
    return isArray(value) ? value : '' + value;
  },
  numeric(tickValue, index, ticks) {
    if (tickValue === 0) {
      return '0';
    }
    const locale = this.chart.options.locale;
    let notation;
    let delta = tickValue;
    if (ticks.length > 1) {
      const maxTick = Math.max(Math.abs(ticks[0].value), Math.abs(ticks[ticks.length - 1].value));
      if (maxTick < 1e-4 || maxTick > 1e+15) {
        notation = 'scientific';
      }
      delta = calculateDelta(tickValue, ticks);
    }
    const logDelta = log10(Math.abs(delta));
    const numDecimal = Math.max(Math.min(-1 * Math.floor(logDelta), 20), 0);
    const options = {notation, minimumFractionDigits: numDecimal, maximumFractionDigits: numDecimal};
    Object.assign(options, this.options.ticks.format);
    return formatNumber(tickValue, locale, options);
  },
  logarithmic(tickValue, index, ticks) {
    if (tickValue === 0) {
      return '0';
    }
    const remain = tickValue / (Math.pow(10, Math.floor(log10(tickValue))));
    if (remain === 1 || remain === 2 || remain === 5) {
      return formatters.numeric.call(this, tickValue, index, ticks);
    }
    return '';
  }
};
function calculateDelta(tickValue, ticks) {
  let delta = ticks.length > 3 ? ticks[2].value - ticks[1].value : ticks[1].value - ticks[0].value;
  if (Math.abs(delta) >= 1 && tickValue !== Math.floor(tickValue)) {
    delta = tickValue - Math.floor(tickValue);
  }
  return delta;
}
var Ticks = {formatters};

defaults$1.set('scale', {
  display: true,
  offset: false,
  reverse: false,
  beginAtZero: false,
  bounds: 'ticks',
  grace: 0,
  grid: {
    display: true,
    lineWidth: 1,
    drawBorder: true,
    drawOnChartArea: true,
    drawTicks: true,
    tickLength: 8,
    tickWidth: (_ctx, options) => options.lineWidth,
    tickColor: (_ctx, options) => options.color,
    offset: false,
    borderDash: [],
    borderDashOffset: 0.0,
    borderWidth: 1
  },
  title: {
    display: false,
    text: '',
    padding: {
      top: 4,
      bottom: 4
    }
  },
  ticks: {
    minRotation: 0,
    maxRotation: 50,
    mirror: false,
    textStrokeWidth: 0,
    textStrokeColor: '',
    padding: 3,
    display: true,
    autoSkip: true,
    autoSkipPadding: 3,
    labelOffset: 0,
    callback: Ticks.formatters.values,
    minor: {},
    major: {},
    align: 'center',
    crossAlign: 'near',
    showLabelBackdrop: false,
    backdropColor: 'rgba(255, 255, 255, 0.75)',
    backdropPadding: 2,
  }
});
defaults$1.route('scale.ticks', 'color', '', 'color');
defaults$1.route('scale.grid', 'color', '', 'borderColor');
defaults$1.route('scale.grid', 'borderColor', '', 'borderColor');
defaults$1.route('scale.title', 'color', '', 'color');
defaults$1.describe('scale', {
  _fallback: false,
  _scriptable: (name) => !name.startsWith('before') && !name.startsWith('after') && name !== 'callback' && name !== 'parser',
  _indexable: (name) => name !== 'borderDash' && name !== 'tickBorderDash',
});
defaults$1.describe('scales', {
  _fallback: 'scale',
});
defaults$1.describe('scale.ticks', {
  _scriptable: (name) => name !== 'backdropPadding' && name !== 'callback',
  _indexable: (name) => name !== 'backdropPadding',
});

function autoSkip(scale, ticks) {
  const tickOpts = scale.options.ticks;
  const ticksLimit = tickOpts.maxTicksLimit || determineMaxTicks(scale);
  const majorIndices = tickOpts.major.enabled ? getMajorIndices(ticks) : [];
  const numMajorIndices = majorIndices.length;
  const first = majorIndices[0];
  const last = majorIndices[numMajorIndices - 1];
  const newTicks = [];
  if (numMajorIndices > ticksLimit) {
    skipMajors(ticks, newTicks, majorIndices, numMajorIndices / ticksLimit);
    return newTicks;
  }
  const spacing = calculateSpacing(majorIndices, ticks, ticksLimit);
  if (numMajorIndices > 0) {
    let i, ilen;
    const avgMajorSpacing = numMajorIndices > 1 ? Math.round((last - first) / (numMajorIndices - 1)) : null;
    skip(ticks, newTicks, spacing, isNullOrUndef(avgMajorSpacing) ? 0 : first - avgMajorSpacing, first);
    for (i = 0, ilen = numMajorIndices - 1; i < ilen; i++) {
      skip(ticks, newTicks, spacing, majorIndices[i], majorIndices[i + 1]);
    }
    skip(ticks, newTicks, spacing, last, isNullOrUndef(avgMajorSpacing) ? ticks.length : last + avgMajorSpacing);
    return newTicks;
  }
  skip(ticks, newTicks, spacing);
  return newTicks;
}
function determineMaxTicks(scale) {
  const offset = scale.options.offset;
  const tickLength = scale._tickSize();
  const maxScale = scale._length / tickLength + (offset ? 0 : 1);
  const maxChart = scale._maxLength / tickLength;
  return Math.floor(Math.min(maxScale, maxChart));
}
function calculateSpacing(majorIndices, ticks, ticksLimit) {
  const evenMajorSpacing = getEvenSpacing(majorIndices);
  const spacing = ticks.length / ticksLimit;
  if (!evenMajorSpacing) {
    return Math.max(spacing, 1);
  }
  const factors = _factorize(evenMajorSpacing);
  for (let i = 0, ilen = factors.length - 1; i < ilen; i++) {
    const factor = factors[i];
    if (factor > spacing) {
      return factor;
    }
  }
  return Math.max(spacing, 1);
}
function getMajorIndices(ticks) {
  const result = [];
  let i, ilen;
  for (i = 0, ilen = ticks.length; i < ilen; i++) {
    if (ticks[i].major) {
      result.push(i);
    }
  }
  return result;
}
function skipMajors(ticks, newTicks, majorIndices, spacing) {
  let count = 0;
  let next = majorIndices[0];
  let i;
  spacing = Math.ceil(spacing);
  for (i = 0; i < ticks.length; i++) {
    if (i === next) {
      newTicks.push(ticks[i]);
      count++;
      next = majorIndices[count * spacing];
    }
  }
}
function skip(ticks, newTicks, spacing, majorStart, majorEnd) {
  const start = valueOrDefault(majorStart, 0);
  const end = Math.min(valueOrDefault(majorEnd, ticks.length), ticks.length);
  let count = 0;
  let length, i, next;
  spacing = Math.ceil(spacing);
  if (majorEnd) {
    length = majorEnd - majorStart;
    spacing = length / Math.floor(length / spacing);
  }
  next = start;
  while (next < 0) {
    count++;
    next = Math.round(start + count * spacing);
  }
  for (i = Math.max(start, 0); i < end; i++) {
    if (i === next) {
      newTicks.push(ticks[i]);
      count++;
      next = Math.round(start + count * spacing);
    }
  }
}
function getEvenSpacing(arr) {
  const len = arr.length;
  let i, diff;
  if (len < 2) {
    return false;
  }
  for (diff = arr[0], i = 1; i < len; ++i) {
    if (arr[i] - arr[i - 1] !== diff) {
      return false;
    }
  }
  return diff;
}

const reverseAlign = (align) => align === 'left' ? 'right' : align === 'right' ? 'left' : align;
const offsetFromEdge = (scale, edge, offset) => edge === 'top' || edge === 'left' ? scale[edge] + offset : scale[edge] - offset;
function sample(arr, numItems) {
  const result = [];
  const increment = arr.length / numItems;
  const len = arr.length;
  let i = 0;
  for (; i < len; i += increment) {
    result.push(arr[Math.floor(i)]);
  }
  return result;
}
function getPixelForGridLine(scale, index, offsetGridLines) {
  const length = scale.ticks.length;
  const validIndex = Math.min(index, length - 1);
  const start = scale._startPixel;
  const end = scale._endPixel;
  const epsilon = 1e-6;
  let lineValue = scale.getPixelForTick(validIndex);
  let offset;
  if (offsetGridLines) {
    if (length === 1) {
      offset = Math.max(lineValue - start, end - lineValue);
    } else if (index === 0) {
      offset = (scale.getPixelForTick(1) - lineValue) / 2;
    } else {
      offset = (lineValue - scale.getPixelForTick(validIndex - 1)) / 2;
    }
    lineValue += validIndex < index ? offset : -offset;
    if (lineValue < start - epsilon || lineValue > end + epsilon) {
      return;
    }
  }
  return lineValue;
}
function garbageCollect(caches, length) {
  each(caches, (cache) => {
    const gc = cache.gc;
    const gcLen = gc.length / 2;
    let i;
    if (gcLen > length) {
      for (i = 0; i < gcLen; ++i) {
        delete cache.data[gc[i]];
      }
      gc.splice(0, gcLen);
    }
  });
}
function getTickMarkLength(options) {
  return options.drawTicks ? options.tickLength : 0;
}
function getTitleHeight(options, fallback) {
  if (!options.display) {
    return 0;
  }
  const font = toFont(options.font, fallback);
  const padding = toPadding(options.padding);
  const lines = isArray(options.text) ? options.text.length : 1;
  return (lines * font.lineHeight) + padding.height;
}
function createScaleContext(parent, scale) {
  return createContext(parent, {
    scale,
    type: 'scale'
  });
}
function createTickContext(parent, index, tick) {
  return createContext(parent, {
    tick,
    index,
    type: 'tick'
  });
}
function titleAlign(align, position, reverse) {
  let ret = _toLeftRightCenter(align);
  if ((reverse && position !== 'right') || (!reverse && position === 'right')) {
    ret = reverseAlign(ret);
  }
  return ret;
}
function titleArgs(scale, offset, position, align) {
  const {top, left, bottom, right, chart} = scale;
  const {chartArea, scales} = chart;
  let rotation = 0;
  let maxWidth, titleX, titleY;
  const height = bottom - top;
  const width = right - left;
  if (scale.isHorizontal()) {
    titleX = _alignStartEnd(align, left, right);
    if (isObject(position)) {
      const positionAxisID = Object.keys(position)[0];
      const value = position[positionAxisID];
      titleY = scales[positionAxisID].getPixelForValue(value) + height - offset;
    } else if (position === 'center') {
      titleY = (chartArea.bottom + chartArea.top) / 2 + height - offset;
    } else {
      titleY = offsetFromEdge(scale, position, offset);
    }
    maxWidth = right - left;
  } else {
    if (isObject(position)) {
      const positionAxisID = Object.keys(position)[0];
      const value = position[positionAxisID];
      titleX = scales[positionAxisID].getPixelForValue(value) - width + offset;
    } else if (position === 'center') {
      titleX = (chartArea.left + chartArea.right) / 2 - width + offset;
    } else {
      titleX = offsetFromEdge(scale, position, offset);
    }
    titleY = _alignStartEnd(align, bottom, top);
    rotation = position === 'left' ? -HALF_PI : HALF_PI;
  }
  return {titleX, titleY, maxWidth, rotation};
}
class Scale extends Element {
  constructor(cfg) {
    super();
    this.id = cfg.id;
    this.type = cfg.type;
    this.options = undefined;
    this.ctx = cfg.ctx;
    this.chart = cfg.chart;
    this.top = undefined;
    this.bottom = undefined;
    this.left = undefined;
    this.right = undefined;
    this.width = undefined;
    this.height = undefined;
    this._margins = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    };
    this.maxWidth = undefined;
    this.maxHeight = undefined;
    this.paddingTop = undefined;
    this.paddingBottom = undefined;
    this.paddingLeft = undefined;
    this.paddingRight = undefined;
    this.axis = undefined;
    this.labelRotation = undefined;
    this.min = undefined;
    this.max = undefined;
    this._range = undefined;
    this.ticks = [];
    this._gridLineItems = null;
    this._labelItems = null;
    this._labelSizes = null;
    this._length = 0;
    this._maxLength = 0;
    this._longestTextCache = {};
    this._startPixel = undefined;
    this._endPixel = undefined;
    this._reversePixels = false;
    this._userMax = undefined;
    this._userMin = undefined;
    this._suggestedMax = undefined;
    this._suggestedMin = undefined;
    this._ticksLength = 0;
    this._borderValue = 0;
    this._cache = {};
    this._dataLimitsCached = false;
    this.$context = undefined;
  }
  init(options) {
    this.options = options.setContext(this.getContext());
    this.axis = options.axis;
    this._userMin = this.parse(options.min);
    this._userMax = this.parse(options.max);
    this._suggestedMin = this.parse(options.suggestedMin);
    this._suggestedMax = this.parse(options.suggestedMax);
  }
  parse(raw, index) {
    return raw;
  }
  getUserBounds() {
    let {_userMin, _userMax, _suggestedMin, _suggestedMax} = this;
    _userMin = finiteOrDefault(_userMin, Number.POSITIVE_INFINITY);
    _userMax = finiteOrDefault(_userMax, Number.NEGATIVE_INFINITY);
    _suggestedMin = finiteOrDefault(_suggestedMin, Number.POSITIVE_INFINITY);
    _suggestedMax = finiteOrDefault(_suggestedMax, Number.NEGATIVE_INFINITY);
    return {
      min: finiteOrDefault(_userMin, _suggestedMin),
      max: finiteOrDefault(_userMax, _suggestedMax),
      minDefined: isNumberFinite(_userMin),
      maxDefined: isNumberFinite(_userMax)
    };
  }
  getMinMax(canStack) {
    let {min, max, minDefined, maxDefined} = this.getUserBounds();
    let range;
    if (minDefined && maxDefined) {
      return {min, max};
    }
    const metas = this.getMatchingVisibleMetas();
    for (let i = 0, ilen = metas.length; i < ilen; ++i) {
      range = metas[i].controller.getMinMax(this, canStack);
      if (!minDefined) {
        min = Math.min(min, range.min);
      }
      if (!maxDefined) {
        max = Math.max(max, range.max);
      }
    }
    min = maxDefined && min > max ? max : min;
    max = minDefined && min > max ? min : max;
    return {
      min: finiteOrDefault(min, finiteOrDefault(max, min)),
      max: finiteOrDefault(max, finiteOrDefault(min, max))
    };
  }
  getPadding() {
    return {
      left: this.paddingLeft || 0,
      top: this.paddingTop || 0,
      right: this.paddingRight || 0,
      bottom: this.paddingBottom || 0
    };
  }
  getTicks() {
    return this.ticks;
  }
  getLabels() {
    const data = this.chart.data;
    return this.options.labels || (this.isHorizontal() ? data.xLabels : data.yLabels) || data.labels || [];
  }
  beforeLayout() {
    this._cache = {};
    this._dataLimitsCached = false;
  }
  beforeUpdate() {
    callback(this.options.beforeUpdate, [this]);
  }
  update(maxWidth, maxHeight, margins) {
    const {beginAtZero, grace, ticks: tickOpts} = this.options;
    const sampleSize = tickOpts.sampleSize;
    this.beforeUpdate();
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    this._margins = margins = Object.assign({
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }, margins);
    this.ticks = null;
    this._labelSizes = null;
    this._gridLineItems = null;
    this._labelItems = null;
    this.beforeSetDimensions();
    this.setDimensions();
    this.afterSetDimensions();
    this._maxLength = this.isHorizontal()
      ? this.width + margins.left + margins.right
      : this.height + margins.top + margins.bottom;
    if (!this._dataLimitsCached) {
      this.beforeDataLimits();
      this.determineDataLimits();
      this.afterDataLimits();
      this._range = _addGrace(this, grace, beginAtZero);
      this._dataLimitsCached = true;
    }
    this.beforeBuildTicks();
    this.ticks = this.buildTicks() || [];
    this.afterBuildTicks();
    const samplingEnabled = sampleSize < this.ticks.length;
    this._convertTicksToLabels(samplingEnabled ? sample(this.ticks, sampleSize) : this.ticks);
    this.configure();
    this.beforeCalculateLabelRotation();
    this.calculateLabelRotation();
    this.afterCalculateLabelRotation();
    if (tickOpts.display && (tickOpts.autoSkip || tickOpts.source === 'auto')) {
      this.ticks = autoSkip(this, this.ticks);
      this._labelSizes = null;
    }
    if (samplingEnabled) {
      this._convertTicksToLabels(this.ticks);
    }
    this.beforeFit();
    this.fit();
    this.afterFit();
    this.afterUpdate();
  }
  configure() {
    let reversePixels = this.options.reverse;
    let startPixel, endPixel;
    if (this.isHorizontal()) {
      startPixel = this.left;
      endPixel = this.right;
    } else {
      startPixel = this.top;
      endPixel = this.bottom;
      reversePixels = !reversePixels;
    }
    this._startPixel = startPixel;
    this._endPixel = endPixel;
    this._reversePixels = reversePixels;
    this._length = endPixel - startPixel;
    this._alignToPixels = this.options.alignToPixels;
  }
  afterUpdate() {
    callback(this.options.afterUpdate, [this]);
  }
  beforeSetDimensions() {
    callback(this.options.beforeSetDimensions, [this]);
  }
  setDimensions() {
    if (this.isHorizontal()) {
      this.width = this.maxWidth;
      this.left = 0;
      this.right = this.width;
    } else {
      this.height = this.maxHeight;
      this.top = 0;
      this.bottom = this.height;
    }
    this.paddingLeft = 0;
    this.paddingTop = 0;
    this.paddingRight = 0;
    this.paddingBottom = 0;
  }
  afterSetDimensions() {
    callback(this.options.afterSetDimensions, [this]);
  }
  _callHooks(name) {
    this.chart.notifyPlugins(name, this.getContext());
    callback(this.options[name], [this]);
  }
  beforeDataLimits() {
    this._callHooks('beforeDataLimits');
  }
  determineDataLimits() {}
  afterDataLimits() {
    this._callHooks('afterDataLimits');
  }
  beforeBuildTicks() {
    this._callHooks('beforeBuildTicks');
  }
  buildTicks() {
    return [];
  }
  afterBuildTicks() {
    this._callHooks('afterBuildTicks');
  }
  beforeTickToLabelConversion() {
    callback(this.options.beforeTickToLabelConversion, [this]);
  }
  generateTickLabels(ticks) {
    const tickOpts = this.options.ticks;
    let i, ilen, tick;
    for (i = 0, ilen = ticks.length; i < ilen; i++) {
      tick = ticks[i];
      tick.label = callback(tickOpts.callback, [tick.value, i, ticks], this);
    }
  }
  afterTickToLabelConversion() {
    callback(this.options.afterTickToLabelConversion, [this]);
  }
  beforeCalculateLabelRotation() {
    callback(this.options.beforeCalculateLabelRotation, [this]);
  }
  calculateLabelRotation() {
    const options = this.options;
    const tickOpts = options.ticks;
    const numTicks = this.ticks.length;
    const minRotation = tickOpts.minRotation || 0;
    const maxRotation = tickOpts.maxRotation;
    let labelRotation = minRotation;
    let tickWidth, maxHeight, maxLabelDiagonal;
    if (!this._isVisible() || !tickOpts.display || minRotation >= maxRotation || numTicks <= 1 || !this.isHorizontal()) {
      this.labelRotation = minRotation;
      return;
    }
    const labelSizes = this._getLabelSizes();
    const maxLabelWidth = labelSizes.widest.width;
    const maxLabelHeight = labelSizes.highest.height;
    const maxWidth = _limitValue(this.chart.width - maxLabelWidth, 0, this.maxWidth);
    tickWidth = options.offset ? this.maxWidth / numTicks : maxWidth / (numTicks - 1);
    if (maxLabelWidth + 6 > tickWidth) {
      tickWidth = maxWidth / (numTicks - (options.offset ? 0.5 : 1));
      maxHeight = this.maxHeight - getTickMarkLength(options.grid)
				- tickOpts.padding - getTitleHeight(options.title, this.chart.options.font);
      maxLabelDiagonal = Math.sqrt(maxLabelWidth * maxLabelWidth + maxLabelHeight * maxLabelHeight);
      labelRotation = toDegrees(Math.min(
        Math.asin(_limitValue((labelSizes.highest.height + 6) / tickWidth, -1, 1)),
        Math.asin(_limitValue(maxHeight / maxLabelDiagonal, -1, 1)) - Math.asin(_limitValue(maxLabelHeight / maxLabelDiagonal, -1, 1))
      ));
      labelRotation = Math.max(minRotation, Math.min(maxRotation, labelRotation));
    }
    this.labelRotation = labelRotation;
  }
  afterCalculateLabelRotation() {
    callback(this.options.afterCalculateLabelRotation, [this]);
  }
  beforeFit() {
    callback(this.options.beforeFit, [this]);
  }
  fit() {
    const minSize = {
      width: 0,
      height: 0
    };
    const {chart, options: {ticks: tickOpts, title: titleOpts, grid: gridOpts}} = this;
    const display = this._isVisible();
    const isHorizontal = this.isHorizontal();
    if (display) {
      const titleHeight = getTitleHeight(titleOpts, chart.options.font);
      if (isHorizontal) {
        minSize.width = this.maxWidth;
        minSize.height = getTickMarkLength(gridOpts) + titleHeight;
      } else {
        minSize.height = this.maxHeight;
        minSize.width = getTickMarkLength(gridOpts) + titleHeight;
      }
      if (tickOpts.display && this.ticks.length) {
        const {first, last, widest, highest} = this._getLabelSizes();
        const tickPadding = tickOpts.padding * 2;
        const angleRadians = toRadians(this.labelRotation);
        const cos = Math.cos(angleRadians);
        const sin = Math.sin(angleRadians);
        if (isHorizontal) {
          const labelHeight = tickOpts.mirror ? 0 : sin * widest.width + cos * highest.height;
          minSize.height = Math.min(this.maxHeight, minSize.height + labelHeight + tickPadding);
        } else {
          const labelWidth = tickOpts.mirror ? 0 : cos * widest.width + sin * highest.height;
          minSize.width = Math.min(this.maxWidth, minSize.width + labelWidth + tickPadding);
        }
        this._calculatePadding(first, last, sin, cos);
      }
    }
    this._handleMargins();
    if (isHorizontal) {
      this.width = this._length = chart.width - this._margins.left - this._margins.right;
      this.height = minSize.height;
    } else {
      this.width = minSize.width;
      this.height = this._length = chart.height - this._margins.top - this._margins.bottom;
    }
  }
  _calculatePadding(first, last, sin, cos) {
    const {ticks: {align, padding}, position} = this.options;
    const isRotated = this.labelRotation !== 0;
    const labelsBelowTicks = position !== 'top' && this.axis === 'x';
    if (this.isHorizontal()) {
      const offsetLeft = this.getPixelForTick(0) - this.left;
      const offsetRight = this.right - this.getPixelForTick(this.ticks.length - 1);
      let paddingLeft = 0;
      let paddingRight = 0;
      if (isRotated) {
        if (labelsBelowTicks) {
          paddingLeft = cos * first.width;
          paddingRight = sin * last.height;
        } else {
          paddingLeft = sin * first.height;
          paddingRight = cos * last.width;
        }
      } else if (align === 'start') {
        paddingRight = last.width;
      } else if (align === 'end') {
        paddingLeft = first.width;
      } else {
        paddingLeft = first.width / 2;
        paddingRight = last.width / 2;
      }
      this.paddingLeft = Math.max((paddingLeft - offsetLeft + padding) * this.width / (this.width - offsetLeft), 0);
      this.paddingRight = Math.max((paddingRight - offsetRight + padding) * this.width / (this.width - offsetRight), 0);
    } else {
      let paddingTop = last.height / 2;
      let paddingBottom = first.height / 2;
      if (align === 'start') {
        paddingTop = 0;
        paddingBottom = first.height;
      } else if (align === 'end') {
        paddingTop = last.height;
        paddingBottom = 0;
      }
      this.paddingTop = paddingTop + padding;
      this.paddingBottom = paddingBottom + padding;
    }
  }
  _handleMargins() {
    if (this._margins) {
      this._margins.left = Math.max(this.paddingLeft, this._margins.left);
      this._margins.top = Math.max(this.paddingTop, this._margins.top);
      this._margins.right = Math.max(this.paddingRight, this._margins.right);
      this._margins.bottom = Math.max(this.paddingBottom, this._margins.bottom);
    }
  }
  afterFit() {
    callback(this.options.afterFit, [this]);
  }
  isHorizontal() {
    const {axis, position} = this.options;
    return position === 'top' || position === 'bottom' || axis === 'x';
  }
  isFullSize() {
    return this.options.fullSize;
  }
  _convertTicksToLabels(ticks) {
    this.beforeTickToLabelConversion();
    this.generateTickLabels(ticks);
    let i, ilen;
    for (i = 0, ilen = ticks.length; i < ilen; i++) {
      if (isNullOrUndef(ticks[i].label)) {
        ticks.splice(i, 1);
        ilen--;
        i--;
      }
    }
    this.afterTickToLabelConversion();
  }
  _getLabelSizes() {
    let labelSizes = this._labelSizes;
    if (!labelSizes) {
      const sampleSize = this.options.ticks.sampleSize;
      let ticks = this.ticks;
      if (sampleSize < ticks.length) {
        ticks = sample(ticks, sampleSize);
      }
      this._labelSizes = labelSizes = this._computeLabelSizes(ticks, ticks.length);
    }
    return labelSizes;
  }
  _computeLabelSizes(ticks, length) {
    const {ctx, _longestTextCache: caches} = this;
    const widths = [];
    const heights = [];
    let widestLabelSize = 0;
    let highestLabelSize = 0;
    let i, j, jlen, label, tickFont, fontString, cache, lineHeight, width, height, nestedLabel;
    for (i = 0; i < length; ++i) {
      label = ticks[i].label;
      tickFont = this._resolveTickFontOptions(i);
      ctx.font = fontString = tickFont.string;
      cache = caches[fontString] = caches[fontString] || {data: {}, gc: []};
      lineHeight = tickFont.lineHeight;
      width = height = 0;
      if (!isNullOrUndef(label) && !isArray(label)) {
        width = _measureText(ctx, cache.data, cache.gc, width, label);
        height = lineHeight;
      } else if (isArray(label)) {
        for (j = 0, jlen = label.length; j < jlen; ++j) {
          nestedLabel = label[j];
          if (!isNullOrUndef(nestedLabel) && !isArray(nestedLabel)) {
            width = _measureText(ctx, cache.data, cache.gc, width, nestedLabel);
            height += lineHeight;
          }
        }
      }
      widths.push(width);
      heights.push(height);
      widestLabelSize = Math.max(width, widestLabelSize);
      highestLabelSize = Math.max(height, highestLabelSize);
    }
    garbageCollect(caches, length);
    const widest = widths.indexOf(widestLabelSize);
    const highest = heights.indexOf(highestLabelSize);
    const valueAt = (idx) => ({width: widths[idx] || 0, height: heights[idx] || 0});
    return {
      first: valueAt(0),
      last: valueAt(length - 1),
      widest: valueAt(widest),
      highest: valueAt(highest),
      widths,
      heights,
    };
  }
  getLabelForValue(value) {
    return value;
  }
  getPixelForValue(value, index) {
    return NaN;
  }
  getValueForPixel(pixel) {}
  getPixelForTick(index) {
    const ticks = this.ticks;
    if (index < 0 || index > ticks.length - 1) {
      return null;
    }
    return this.getPixelForValue(ticks[index].value);
  }
  getPixelForDecimal(decimal) {
    if (this._reversePixels) {
      decimal = 1 - decimal;
    }
    const pixel = this._startPixel + decimal * this._length;
    return _int16Range(this._alignToPixels ? _alignPixel(this.chart, pixel, 0) : pixel);
  }
  getDecimalForPixel(pixel) {
    const decimal = (pixel - this._startPixel) / this._length;
    return this._reversePixels ? 1 - decimal : decimal;
  }
  getBasePixel() {
    return this.getPixelForValue(this.getBaseValue());
  }
  getBaseValue() {
    const {min, max} = this;
    return min < 0 && max < 0 ? max :
      min > 0 && max > 0 ? min :
      0;
  }
  getContext(index) {
    const ticks = this.ticks || [];
    if (index >= 0 && index < ticks.length) {
      const tick = ticks[index];
      return tick.$context ||
				(tick.$context = createTickContext(this.getContext(), index, tick));
    }
    return this.$context ||
			(this.$context = createScaleContext(this.chart.getContext(), this));
  }
  _tickSize() {
    const optionTicks = this.options.ticks;
    const rot = toRadians(this.labelRotation);
    const cos = Math.abs(Math.cos(rot));
    const sin = Math.abs(Math.sin(rot));
    const labelSizes = this._getLabelSizes();
    const padding = optionTicks.autoSkipPadding || 0;
    const w = labelSizes ? labelSizes.widest.width + padding : 0;
    const h = labelSizes ? labelSizes.highest.height + padding : 0;
    return this.isHorizontal()
      ? h * cos > w * sin ? w / cos : h / sin
      : h * sin < w * cos ? h / cos : w / sin;
  }
  _isVisible() {
    const display = this.options.display;
    if (display !== 'auto') {
      return !!display;
    }
    return this.getMatchingVisibleMetas().length > 0;
  }
  _computeGridLineItems(chartArea) {
    const axis = this.axis;
    const chart = this.chart;
    const options = this.options;
    const {grid, position} = options;
    const offset = grid.offset;
    const isHorizontal = this.isHorizontal();
    const ticks = this.ticks;
    const ticksLength = ticks.length + (offset ? 1 : 0);
    const tl = getTickMarkLength(grid);
    const items = [];
    const borderOpts = grid.setContext(this.getContext());
    const axisWidth = borderOpts.drawBorder ? borderOpts.borderWidth : 0;
    const axisHalfWidth = axisWidth / 2;
    const alignBorderValue = function(pixel) {
      return _alignPixel(chart, pixel, axisWidth);
    };
    let borderValue, i, lineValue, alignedLineValue;
    let tx1, ty1, tx2, ty2, x1, y1, x2, y2;
    if (position === 'top') {
      borderValue = alignBorderValue(this.bottom);
      ty1 = this.bottom - tl;
      ty2 = borderValue - axisHalfWidth;
      y1 = alignBorderValue(chartArea.top) + axisHalfWidth;
      y2 = chartArea.bottom;
    } else if (position === 'bottom') {
      borderValue = alignBorderValue(this.top);
      y1 = chartArea.top;
      y2 = alignBorderValue(chartArea.bottom) - axisHalfWidth;
      ty1 = borderValue + axisHalfWidth;
      ty2 = this.top + tl;
    } else if (position === 'left') {
      borderValue = alignBorderValue(this.right);
      tx1 = this.right - tl;
      tx2 = borderValue - axisHalfWidth;
      x1 = alignBorderValue(chartArea.left) + axisHalfWidth;
      x2 = chartArea.right;
    } else if (position === 'right') {
      borderValue = alignBorderValue(this.left);
      x1 = chartArea.left;
      x2 = alignBorderValue(chartArea.right) - axisHalfWidth;
      tx1 = borderValue + axisHalfWidth;
      tx2 = this.left + tl;
    } else if (axis === 'x') {
      if (position === 'center') {
        borderValue = alignBorderValue((chartArea.top + chartArea.bottom) / 2 + 0.5);
      } else if (isObject(position)) {
        const positionAxisID = Object.keys(position)[0];
        const value = position[positionAxisID];
        borderValue = alignBorderValue(this.chart.scales[positionAxisID].getPixelForValue(value));
      }
      y1 = chartArea.top;
      y2 = chartArea.bottom;
      ty1 = borderValue + axisHalfWidth;
      ty2 = ty1 + tl;
    } else if (axis === 'y') {
      if (position === 'center') {
        borderValue = alignBorderValue((chartArea.left + chartArea.right) / 2);
      } else if (isObject(position)) {
        const positionAxisID = Object.keys(position)[0];
        const value = position[positionAxisID];
        borderValue = alignBorderValue(this.chart.scales[positionAxisID].getPixelForValue(value));
      }
      tx1 = borderValue - axisHalfWidth;
      tx2 = tx1 - tl;
      x1 = chartArea.left;
      x2 = chartArea.right;
    }
    const limit = valueOrDefault(options.ticks.maxTicksLimit, ticksLength);
    const step = Math.max(1, Math.ceil(ticksLength / limit));
    for (i = 0; i < ticksLength; i += step) {
      const optsAtIndex = grid.setContext(this.getContext(i));
      const lineWidth = optsAtIndex.lineWidth;
      const lineColor = optsAtIndex.color;
      const borderDash = grid.borderDash || [];
      const borderDashOffset = optsAtIndex.borderDashOffset;
      const tickWidth = optsAtIndex.tickWidth;
      const tickColor = optsAtIndex.tickColor;
      const tickBorderDash = optsAtIndex.tickBorderDash || [];
      const tickBorderDashOffset = optsAtIndex.tickBorderDashOffset;
      lineValue = getPixelForGridLine(this, i, offset);
      if (lineValue === undefined) {
        continue;
      }
      alignedLineValue = _alignPixel(chart, lineValue, lineWidth);
      if (isHorizontal) {
        tx1 = tx2 = x1 = x2 = alignedLineValue;
      } else {
        ty1 = ty2 = y1 = y2 = alignedLineValue;
      }
      items.push({
        tx1,
        ty1,
        tx2,
        ty2,
        x1,
        y1,
        x2,
        y2,
        width: lineWidth,
        color: lineColor,
        borderDash,
        borderDashOffset,
        tickWidth,
        tickColor,
        tickBorderDash,
        tickBorderDashOffset,
      });
    }
    this._ticksLength = ticksLength;
    this._borderValue = borderValue;
    return items;
  }
  _computeLabelItems(chartArea) {
    const axis = this.axis;
    const options = this.options;
    const {position, ticks: optionTicks} = options;
    const isHorizontal = this.isHorizontal();
    const ticks = this.ticks;
    const {align, crossAlign, padding, mirror} = optionTicks;
    const tl = getTickMarkLength(options.grid);
    const tickAndPadding = tl + padding;
    const hTickAndPadding = mirror ? -padding : tickAndPadding;
    const rotation = -toRadians(this.labelRotation);
    const items = [];
    let i, ilen, tick, label, x, y, textAlign, pixel, font, lineHeight, lineCount, textOffset;
    let textBaseline = 'middle';
    if (position === 'top') {
      y = this.bottom - hTickAndPadding;
      textAlign = this._getXAxisLabelAlignment();
    } else if (position === 'bottom') {
      y = this.top + hTickAndPadding;
      textAlign = this._getXAxisLabelAlignment();
    } else if (position === 'left') {
      const ret = this._getYAxisLabelAlignment(tl);
      textAlign = ret.textAlign;
      x = ret.x;
    } else if (position === 'right') {
      const ret = this._getYAxisLabelAlignment(tl);
      textAlign = ret.textAlign;
      x = ret.x;
    } else if (axis === 'x') {
      if (position === 'center') {
        y = ((chartArea.top + chartArea.bottom) / 2) + tickAndPadding;
      } else if (isObject(position)) {
        const positionAxisID = Object.keys(position)[0];
        const value = position[positionAxisID];
        y = this.chart.scales[positionAxisID].getPixelForValue(value) + tickAndPadding;
      }
      textAlign = this._getXAxisLabelAlignment();
    } else if (axis === 'y') {
      if (position === 'center') {
        x = ((chartArea.left + chartArea.right) / 2) - tickAndPadding;
      } else if (isObject(position)) {
        const positionAxisID = Object.keys(position)[0];
        const value = position[positionAxisID];
        x = this.chart.scales[positionAxisID].getPixelForValue(value);
      }
      textAlign = this._getYAxisLabelAlignment(tl).textAlign;
    }
    if (axis === 'y') {
      if (align === 'start') {
        textBaseline = 'top';
      } else if (align === 'end') {
        textBaseline = 'bottom';
      }
    }
    const labelSizes = this._getLabelSizes();
    for (i = 0, ilen = ticks.length; i < ilen; ++i) {
      tick = ticks[i];
      label = tick.label;
      const optsAtIndex = optionTicks.setContext(this.getContext(i));
      pixel = this.getPixelForTick(i) + optionTicks.labelOffset;
      font = this._resolveTickFontOptions(i);
      lineHeight = font.lineHeight;
      lineCount = isArray(label) ? label.length : 1;
      const halfCount = lineCount / 2;
      const color = optsAtIndex.color;
      const strokeColor = optsAtIndex.textStrokeColor;
      const strokeWidth = optsAtIndex.textStrokeWidth;
      if (isHorizontal) {
        x = pixel;
        if (position === 'top') {
          if (crossAlign === 'near' || rotation !== 0) {
            textOffset = -lineCount * lineHeight + lineHeight / 2;
          } else if (crossAlign === 'center') {
            textOffset = -labelSizes.highest.height / 2 - halfCount * lineHeight + lineHeight;
          } else {
            textOffset = -labelSizes.highest.height + lineHeight / 2;
          }
        } else {
          if (crossAlign === 'near' || rotation !== 0) {
            textOffset = lineHeight / 2;
          } else if (crossAlign === 'center') {
            textOffset = labelSizes.highest.height / 2 - halfCount * lineHeight;
          } else {
            textOffset = labelSizes.highest.height - lineCount * lineHeight;
          }
        }
        if (mirror) {
          textOffset *= -1;
        }
      } else {
        y = pixel;
        textOffset = (1 - lineCount) * lineHeight / 2;
      }
      let backdrop;
      if (optsAtIndex.showLabelBackdrop) {
        const labelPadding = toPadding(optsAtIndex.backdropPadding);
        const height = labelSizes.heights[i];
        const width = labelSizes.widths[i];
        let top = y + textOffset - labelPadding.top;
        let left = x - labelPadding.left;
        switch (textBaseline) {
        case 'middle':
          top -= height / 2;
          break;
        case 'bottom':
          top -= height;
          break;
        }
        switch (textAlign) {
        case 'center':
          left -= width / 2;
          break;
        case 'right':
          left -= width;
          break;
        }
        backdrop = {
          left,
          top,
          width: width + labelPadding.width,
          height: height + labelPadding.height,
          color: optsAtIndex.backdropColor,
        };
      }
      items.push({
        rotation,
        label,
        font,
        color,
        strokeColor,
        strokeWidth,
        textOffset,
        textAlign,
        textBaseline,
        translation: [x, y],
        backdrop,
      });
    }
    return items;
  }
  _getXAxisLabelAlignment() {
    const {position, ticks} = this.options;
    const rotation = -toRadians(this.labelRotation);
    if (rotation) {
      return position === 'top' ? 'left' : 'right';
    }
    let align = 'center';
    if (ticks.align === 'start') {
      align = 'left';
    } else if (ticks.align === 'end') {
      align = 'right';
    }
    return align;
  }
  _getYAxisLabelAlignment(tl) {
    const {position, ticks: {crossAlign, mirror, padding}} = this.options;
    const labelSizes = this._getLabelSizes();
    const tickAndPadding = tl + padding;
    const widest = labelSizes.widest.width;
    let textAlign;
    let x;
    if (position === 'left') {
      if (mirror) {
        x = this.right + padding;
        if (crossAlign === 'near') {
          textAlign = 'left';
        } else if (crossAlign === 'center') {
          textAlign = 'center';
          x += (widest / 2);
        } else {
          textAlign = 'right';
          x += widest;
        }
      } else {
        x = this.right - tickAndPadding;
        if (crossAlign === 'near') {
          textAlign = 'right';
        } else if (crossAlign === 'center') {
          textAlign = 'center';
          x -= (widest / 2);
        } else {
          textAlign = 'left';
          x = this.left;
        }
      }
    } else if (position === 'right') {
      if (mirror) {
        x = this.left + padding;
        if (crossAlign === 'near') {
          textAlign = 'right';
        } else if (crossAlign === 'center') {
          textAlign = 'center';
          x -= (widest / 2);
        } else {
          textAlign = 'left';
          x -= widest;
        }
      } else {
        x = this.left + tickAndPadding;
        if (crossAlign === 'near') {
          textAlign = 'left';
        } else if (crossAlign === 'center') {
          textAlign = 'center';
          x += widest / 2;
        } else {
          textAlign = 'right';
          x = this.right;
        }
      }
    } else {
      textAlign = 'right';
    }
    return {textAlign, x};
  }
  _computeLabelArea() {
    if (this.options.ticks.mirror) {
      return;
    }
    const chart = this.chart;
    const position = this.options.position;
    if (position === 'left' || position === 'right') {
      return {top: 0, left: this.left, bottom: chart.height, right: this.right};
    } if (position === 'top' || position === 'bottom') {
      return {top: this.top, left: 0, bottom: this.bottom, right: chart.width};
    }
  }
  drawBackground() {
    const {ctx, options: {backgroundColor}, left, top, width, height} = this;
    if (backgroundColor) {
      ctx.save();
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(left, top, width, height);
      ctx.restore();
    }
  }
  getLineWidthForValue(value) {
    const grid = this.options.grid;
    if (!this._isVisible() || !grid.display) {
      return 0;
    }
    const ticks = this.ticks;
    const index = ticks.findIndex(t => t.value === value);
    if (index >= 0) {
      const opts = grid.setContext(this.getContext(index));
      return opts.lineWidth;
    }
    return 0;
  }
  drawGrid(chartArea) {
    const grid = this.options.grid;
    const ctx = this.ctx;
    const items = this._gridLineItems || (this._gridLineItems = this._computeGridLineItems(chartArea));
    let i, ilen;
    const drawLine = (p1, p2, style) => {
      if (!style.width || !style.color) {
        return;
      }
      ctx.save();
      ctx.lineWidth = style.width;
      ctx.strokeStyle = style.color;
      ctx.setLineDash(style.borderDash || []);
      ctx.lineDashOffset = style.borderDashOffset;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    };
    if (grid.display) {
      for (i = 0, ilen = items.length; i < ilen; ++i) {
        const item = items[i];
        if (grid.drawOnChartArea) {
          drawLine(
            {x: item.x1, y: item.y1},
            {x: item.x2, y: item.y2},
            item
          );
        }
        if (grid.drawTicks) {
          drawLine(
            {x: item.tx1, y: item.ty1},
            {x: item.tx2, y: item.ty2},
            {
              color: item.tickColor,
              width: item.tickWidth,
              borderDash: item.tickBorderDash,
              borderDashOffset: item.tickBorderDashOffset
            }
          );
        }
      }
    }
  }
  drawBorder() {
    const {chart, ctx, options: {grid}} = this;
    const borderOpts = grid.setContext(this.getContext());
    const axisWidth = grid.drawBorder ? borderOpts.borderWidth : 0;
    if (!axisWidth) {
      return;
    }
    const lastLineWidth = grid.setContext(this.getContext(0)).lineWidth;
    const borderValue = this._borderValue;
    let x1, x2, y1, y2;
    if (this.isHorizontal()) {
      x1 = _alignPixel(chart, this.left, axisWidth) - axisWidth / 2;
      x2 = _alignPixel(chart, this.right, lastLineWidth) + lastLineWidth / 2;
      y1 = y2 = borderValue;
    } else {
      y1 = _alignPixel(chart, this.top, axisWidth) - axisWidth / 2;
      y2 = _alignPixel(chart, this.bottom, lastLineWidth) + lastLineWidth / 2;
      x1 = x2 = borderValue;
    }
    ctx.save();
    ctx.lineWidth = borderOpts.borderWidth;
    ctx.strokeStyle = borderOpts.borderColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }
  drawLabels(chartArea) {
    const optionTicks = this.options.ticks;
    if (!optionTicks.display) {
      return;
    }
    const ctx = this.ctx;
    const area = this._computeLabelArea();
    if (area) {
      clipArea(ctx, area);
    }
    const items = this._labelItems || (this._labelItems = this._computeLabelItems(chartArea));
    let i, ilen;
    for (i = 0, ilen = items.length; i < ilen; ++i) {
      const item = items[i];
      const tickFont = item.font;
      const label = item.label;
      if (item.backdrop) {
        ctx.fillStyle = item.backdrop.color;
        ctx.fillRect(item.backdrop.left, item.backdrop.top, item.backdrop.width, item.backdrop.height);
      }
      let y = item.textOffset;
      renderText(ctx, label, 0, y, tickFont, item);
    }
    if (area) {
      unclipArea(ctx);
    }
  }
  drawTitle() {
    const {ctx, options: {position, title, reverse}} = this;
    if (!title.display) {
      return;
    }
    const font = toFont(title.font);
    const padding = toPadding(title.padding);
    const align = title.align;
    let offset = font.lineHeight / 2;
    if (position === 'bottom' || position === 'center' || isObject(position)) {
      offset += padding.bottom;
      if (isArray(title.text)) {
        offset += font.lineHeight * (title.text.length - 1);
      }
    } else {
      offset += padding.top;
    }
    const {titleX, titleY, maxWidth, rotation} = titleArgs(this, offset, position, align);
    renderText(ctx, title.text, 0, 0, font, {
      color: title.color,
      maxWidth,
      rotation,
      textAlign: titleAlign(align, position, reverse),
      textBaseline: 'middle',
      translation: [titleX, titleY],
    });
  }
  draw(chartArea) {
    if (!this._isVisible()) {
      return;
    }
    this.drawBackground();
    this.drawGrid(chartArea);
    this.drawBorder();
    this.drawTitle();
    this.drawLabels(chartArea);
  }
  _layers() {
    const opts = this.options;
    const tz = opts.ticks && opts.ticks.z || 0;
    const gz = valueOrDefault(opts.grid && opts.grid.z, -1);
    if (!this._isVisible() || this.draw !== Scale.prototype.draw) {
      return [{
        z: tz,
        draw: (chartArea) => {
          this.draw(chartArea);
        }
      }];
    }
    return [{
      z: gz,
      draw: (chartArea) => {
        this.drawBackground();
        this.drawGrid(chartArea);
        this.drawTitle();
      }
    }, {
      z: gz + 1,
      draw: () => {
        this.drawBorder();
      }
    }, {
      z: tz,
      draw: (chartArea) => {
        this.drawLabels(chartArea);
      }
    }];
  }
  getMatchingVisibleMetas(type) {
    const metas = this.chart.getSortedVisibleDatasetMetas();
    const axisID = this.axis + 'AxisID';
    const result = [];
    let i, ilen;
    for (i = 0, ilen = metas.length; i < ilen; ++i) {
      const meta = metas[i];
      if (meta[axisID] === this.id && (!type || meta.type === type)) {
        result.push(meta);
      }
    }
    return result;
  }
  _resolveTickFontOptions(index) {
    const opts = this.options.ticks.setContext(this.getContext(index));
    return toFont(opts.font);
  }
  _maxDigits() {
    const fontSize = this._resolveTickFontOptions(0).lineHeight;
    return (this.isHorizontal() ? this.width : this.height) / fontSize;
  }
}

class TypedRegistry {
  constructor(type, scope, override) {
    this.type = type;
    this.scope = scope;
    this.override = override;
    this.items = Object.create(null);
  }
  isForType(type) {
    return Object.prototype.isPrototypeOf.call(this.type.prototype, type.prototype);
  }
  register(item) {
    const proto = Object.getPrototypeOf(item);
    let parentScope;
    if (isIChartComponent(proto)) {
      parentScope = this.register(proto);
    }
    const items = this.items;
    const id = item.id;
    const scope = this.scope + '.' + id;
    if (!id) {
      throw new Error('class does not have id: ' + item);
    }
    if (id in items) {
      return scope;
    }
    items[id] = item;
    registerDefaults(item, scope, parentScope);
    if (this.override) {
      defaults$1.override(item.id, item.overrides);
    }
    return scope;
  }
  get(id) {
    return this.items[id];
  }
  unregister(item) {
    const items = this.items;
    const id = item.id;
    const scope = this.scope;
    if (id in items) {
      delete items[id];
    }
    if (scope && id in defaults$1[scope]) {
      delete defaults$1[scope][id];
      if (this.override) {
        delete overrides[id];
      }
    }
  }
}
function registerDefaults(item, scope, parentScope) {
  const itemDefaults = merge(Object.create(null), [
    parentScope ? defaults$1.get(parentScope) : {},
    defaults$1.get(scope),
    item.defaults
  ]);
  defaults$1.set(scope, itemDefaults);
  if (item.defaultRoutes) {
    routeDefaults(scope, item.defaultRoutes);
  }
  if (item.descriptors) {
    defaults$1.describe(scope, item.descriptors);
  }
}
function routeDefaults(scope, routes) {
  Object.keys(routes).forEach(property => {
    const propertyParts = property.split('.');
    const sourceName = propertyParts.pop();
    const sourceScope = [scope].concat(propertyParts).join('.');
    const parts = routes[property].split('.');
    const targetName = parts.pop();
    const targetScope = parts.join('.');
    defaults$1.route(sourceScope, sourceName, targetScope, targetName);
  });
}
function isIChartComponent(proto) {
  return 'id' in proto && 'defaults' in proto;
}

class Registry {
  constructor() {
    this.controllers = new TypedRegistry(DatasetController, 'datasets', true);
    this.elements = new TypedRegistry(Element, 'elements');
    this.plugins = new TypedRegistry(Object, 'plugins');
    this.scales = new TypedRegistry(Scale, 'scales');
    this._typedRegistries = [this.controllers, this.scales, this.elements];
  }
  add(...args) {
    this._each('register', args);
  }
  remove(...args) {
    this._each('unregister', args);
  }
  addControllers(...args) {
    this._each('register', args, this.controllers);
  }
  addElements(...args) {
    this._each('register', args, this.elements);
  }
  addPlugins(...args) {
    this._each('register', args, this.plugins);
  }
  addScales(...args) {
    this._each('register', args, this.scales);
  }
  getController(id) {
    return this._get(id, this.controllers, 'controller');
  }
  getElement(id) {
    return this._get(id, this.elements, 'element');
  }
  getPlugin(id) {
    return this._get(id, this.plugins, 'plugin');
  }
  getScale(id) {
    return this._get(id, this.scales, 'scale');
  }
  removeControllers(...args) {
    this._each('unregister', args, this.controllers);
  }
  removeElements(...args) {
    this._each('unregister', args, this.elements);
  }
  removePlugins(...args) {
    this._each('unregister', args, this.plugins);
  }
  removeScales(...args) {
    this._each('unregister', args, this.scales);
  }
  _each(method, args, typedRegistry) {
    [...args].forEach(arg => {
      const reg = typedRegistry || this._getRegistryForType(arg);
      if (typedRegistry || reg.isForType(arg) || (reg === this.plugins && arg.id)) {
        this._exec(method, reg, arg);
      } else {
        each(arg, item => {
          const itemReg = typedRegistry || this._getRegistryForType(item);
          this._exec(method, itemReg, item);
        });
      }
    });
  }
  _exec(method, registry, component) {
    const camelMethod = _capitalize(method);
    callback(component['before' + camelMethod], [], component);
    registry[method](component);
    callback(component['after' + camelMethod], [], component);
  }
  _getRegistryForType(type) {
    for (let i = 0; i < this._typedRegistries.length; i++) {
      const reg = this._typedRegistries[i];
      if (reg.isForType(type)) {
        return reg;
      }
    }
    return this.plugins;
  }
  _get(id, typedRegistry, type) {
    const item = typedRegistry.get(id);
    if (item === undefined) {
      throw new Error('"' + id + '" is not a registered ' + type + '.');
    }
    return item;
  }
}
var registry = new Registry();

class PluginService {
  constructor() {
    this._init = [];
  }
  notify(chart, hook, args, filter) {
    if (hook === 'beforeInit') {
      this._init = this._createDescriptors(chart, true);
      this._notify(this._init, chart, 'install');
    }
    const descriptors = filter ? this._descriptors(chart).filter(filter) : this._descriptors(chart);
    const result = this._notify(descriptors, chart, hook, args);
    if (hook === 'destroy') {
      this._notify(descriptors, chart, 'stop');
      this._notify(this._init, chart, 'uninstall');
    }
    return result;
  }
  _notify(descriptors, chart, hook, args) {
    args = args || {};
    for (const descriptor of descriptors) {
      const plugin = descriptor.plugin;
      const method = plugin[hook];
      const params = [chart, args, descriptor.options];
      if (callback(method, params, plugin) === false && args.cancelable) {
        return false;
      }
    }
    return true;
  }
  invalidate() {
    if (!isNullOrUndef(this._cache)) {
      this._oldCache = this._cache;
      this._cache = undefined;
    }
  }
  _descriptors(chart) {
    if (this._cache) {
      return this._cache;
    }
    const descriptors = this._cache = this._createDescriptors(chart);
    this._notifyStateChanges(chart);
    return descriptors;
  }
  _createDescriptors(chart, all) {
    const config = chart && chart.config;
    const options = valueOrDefault(config.options && config.options.plugins, {});
    const plugins = allPlugins(config);
    return options === false && !all ? [] : createDescriptors(chart, plugins, options, all);
  }
  _notifyStateChanges(chart) {
    const previousDescriptors = this._oldCache || [];
    const descriptors = this._cache;
    const diff = (a, b) => a.filter(x => !b.some(y => x.plugin.id === y.plugin.id));
    this._notify(diff(previousDescriptors, descriptors), chart, 'stop');
    this._notify(diff(descriptors, previousDescriptors), chart, 'start');
  }
}
function allPlugins(config) {
  const plugins = [];
  const keys = Object.keys(registry.plugins.items);
  for (let i = 0; i < keys.length; i++) {
    plugins.push(registry.getPlugin(keys[i]));
  }
  const local = config.plugins || [];
  for (let i = 0; i < local.length; i++) {
    const plugin = local[i];
    if (plugins.indexOf(plugin) === -1) {
      plugins.push(plugin);
    }
  }
  return plugins;
}
function getOpts(options, all) {
  if (!all && options === false) {
    return null;
  }
  if (options === true) {
    return {};
  }
  return options;
}
function createDescriptors(chart, plugins, options, all) {
  const result = [];
  const context = chart.getContext();
  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    const id = plugin.id;
    const opts = getOpts(options[id], all);
    if (opts === null) {
      continue;
    }
    result.push({
      plugin,
      options: pluginOpts(chart.config, plugin, opts, context)
    });
  }
  return result;
}
function pluginOpts(config, plugin, opts, context) {
  const keys = config.pluginScopeKeys(plugin);
  const scopes = config.getOptionScopes(opts, keys);
  return config.createResolver(scopes, context, [''], {scriptable: false, indexable: false, allKeys: true});
}

function getIndexAxis(type, options) {
  const datasetDefaults = defaults$1.datasets[type] || {};
  const datasetOptions = (options.datasets || {})[type] || {};
  return datasetOptions.indexAxis || options.indexAxis || datasetDefaults.indexAxis || 'x';
}
function getAxisFromDefaultScaleID(id, indexAxis) {
  let axis = id;
  if (id === '_index_') {
    axis = indexAxis;
  } else if (id === '_value_') {
    axis = indexAxis === 'x' ? 'y' : 'x';
  }
  return axis;
}
function getDefaultScaleIDFromAxis(axis, indexAxis) {
  return axis === indexAxis ? '_index_' : '_value_';
}
function axisFromPosition(position) {
  if (position === 'top' || position === 'bottom') {
    return 'x';
  }
  if (position === 'left' || position === 'right') {
    return 'y';
  }
}
function determineAxis(id, scaleOptions) {
  if (id === 'x' || id === 'y') {
    return id;
  }
  return scaleOptions.axis || axisFromPosition(scaleOptions.position) || id.charAt(0).toLowerCase();
}
function mergeScaleConfig(config, options) {
  const chartDefaults = overrides[config.type] || {scales: {}};
  const configScales = options.scales || {};
  const chartIndexAxis = getIndexAxis(config.type, options);
  const firstIDs = Object.create(null);
  const scales = Object.create(null);
  Object.keys(configScales).forEach(id => {
    const scaleConf = configScales[id];
    if (!isObject(scaleConf)) {
      return console.error(`Invalid scale configuration for scale: ${id}`);
    }
    if (scaleConf._proxy) {
      return console.warn(`Ignoring resolver passed as options for scale: ${id}`);
    }
    const axis = determineAxis(id, scaleConf);
    const defaultId = getDefaultScaleIDFromAxis(axis, chartIndexAxis);
    const defaultScaleOptions = chartDefaults.scales || {};
    firstIDs[axis] = firstIDs[axis] || id;
    scales[id] = mergeIf(Object.create(null), [{axis}, scaleConf, defaultScaleOptions[axis], defaultScaleOptions[defaultId]]);
  });
  config.data.datasets.forEach(dataset => {
    const type = dataset.type || config.type;
    const indexAxis = dataset.indexAxis || getIndexAxis(type, options);
    const datasetDefaults = overrides[type] || {};
    const defaultScaleOptions = datasetDefaults.scales || {};
    Object.keys(defaultScaleOptions).forEach(defaultID => {
      const axis = getAxisFromDefaultScaleID(defaultID, indexAxis);
      const id = dataset[axis + 'AxisID'] || firstIDs[axis] || axis;
      scales[id] = scales[id] || Object.create(null);
      mergeIf(scales[id], [{axis}, configScales[id], defaultScaleOptions[defaultID]]);
    });
  });
  Object.keys(scales).forEach(key => {
    const scale = scales[key];
    mergeIf(scale, [defaults$1.scales[scale.type], defaults$1.scale]);
  });
  return scales;
}
function initOptions(config) {
  const options = config.options || (config.options = {});
  options.plugins = valueOrDefault(options.plugins, {});
  options.scales = mergeScaleConfig(config, options);
}
function initData(data) {
  data = data || {};
  data.datasets = data.datasets || [];
  data.labels = data.labels || [];
  return data;
}
function initConfig(config) {
  config = config || {};
  config.data = initData(config.data);
  initOptions(config);
  return config;
}
const keyCache = new Map();
const keysCached = new Set();
function cachedKeys(cacheKey, generate) {
  let keys = keyCache.get(cacheKey);
  if (!keys) {
    keys = generate();
    keyCache.set(cacheKey, keys);
    keysCached.add(keys);
  }
  return keys;
}
const addIfFound = (set, obj, key) => {
  const opts = resolveObjectKey(obj, key);
  if (opts !== undefined) {
    set.add(opts);
  }
};
class Config {
  constructor(config) {
    this._config = initConfig(config);
    this._scopeCache = new Map();
    this._resolverCache = new Map();
  }
  get platform() {
    return this._config.platform;
  }
  get type() {
    return this._config.type;
  }
  set type(type) {
    this._config.type = type;
  }
  get data() {
    return this._config.data;
  }
  set data(data) {
    this._config.data = initData(data);
  }
  get options() {
    return this._config.options;
  }
  set options(options) {
    this._config.options = options;
  }
  get plugins() {
    return this._config.plugins;
  }
  update() {
    const config = this._config;
    this.clearCache();
    initOptions(config);
  }
  clearCache() {
    this._scopeCache.clear();
    this._resolverCache.clear();
  }
  datasetScopeKeys(datasetType) {
    return cachedKeys(datasetType,
      () => [[
        `datasets.${datasetType}`,
        ''
      ]]);
  }
  datasetAnimationScopeKeys(datasetType, transition) {
    return cachedKeys(`${datasetType}.transition.${transition}`,
      () => [
        [
          `datasets.${datasetType}.transitions.${transition}`,
          `transitions.${transition}`,
        ],
        [
          `datasets.${datasetType}`,
          ''
        ]
      ]);
  }
  datasetElementScopeKeys(datasetType, elementType) {
    return cachedKeys(`${datasetType}-${elementType}`,
      () => [[
        `datasets.${datasetType}.elements.${elementType}`,
        `datasets.${datasetType}`,
        `elements.${elementType}`,
        ''
      ]]);
  }
  pluginScopeKeys(plugin) {
    const id = plugin.id;
    const type = this.type;
    return cachedKeys(`${type}-plugin-${id}`,
      () => [[
        `plugins.${id}`,
        ...plugin.additionalOptionScopes || [],
      ]]);
  }
  _cachedScopes(mainScope, resetCache) {
    const _scopeCache = this._scopeCache;
    let cache = _scopeCache.get(mainScope);
    if (!cache || resetCache) {
      cache = new Map();
      _scopeCache.set(mainScope, cache);
    }
    return cache;
  }
  getOptionScopes(mainScope, keyLists, resetCache) {
    const {options, type} = this;
    const cache = this._cachedScopes(mainScope, resetCache);
    const cached = cache.get(keyLists);
    if (cached) {
      return cached;
    }
    const scopes = new Set();
    keyLists.forEach(keys => {
      if (mainScope) {
        scopes.add(mainScope);
        keys.forEach(key => addIfFound(scopes, mainScope, key));
      }
      keys.forEach(key => addIfFound(scopes, options, key));
      keys.forEach(key => addIfFound(scopes, overrides[type] || {}, key));
      keys.forEach(key => addIfFound(scopes, defaults$1, key));
      keys.forEach(key => addIfFound(scopes, descriptors, key));
    });
    const array = Array.from(scopes);
    if (array.length === 0) {
      array.push(Object.create(null));
    }
    if (keysCached.has(keyLists)) {
      cache.set(keyLists, array);
    }
    return array;
  }
  chartOptionScopes() {
    const {options, type} = this;
    return [
      options,
      overrides[type] || {},
      defaults$1.datasets[type] || {},
      {type},
      defaults$1,
      descriptors
    ];
  }
  resolveNamedOptions(scopes, names, context, prefixes = ['']) {
    const result = {$shared: true};
    const {resolver, subPrefixes} = getResolver(this._resolverCache, scopes, prefixes);
    let options = resolver;
    if (needContext(resolver, names)) {
      result.$shared = false;
      context = isFunction(context) ? context() : context;
      const subResolver = this.createResolver(scopes, context, subPrefixes);
      options = _attachContext(resolver, context, subResolver);
    }
    for (const prop of names) {
      result[prop] = options[prop];
    }
    return result;
  }
  createResolver(scopes, context, prefixes = [''], descriptorDefaults) {
    const {resolver} = getResolver(this._resolverCache, scopes, prefixes);
    return isObject(context)
      ? _attachContext(resolver, context, undefined, descriptorDefaults)
      : resolver;
  }
}
function getResolver(resolverCache, scopes, prefixes) {
  let cache = resolverCache.get(scopes);
  if (!cache) {
    cache = new Map();
    resolverCache.set(scopes, cache);
  }
  const cacheKey = prefixes.join();
  let cached = cache.get(cacheKey);
  if (!cached) {
    const resolver = _createResolver(scopes, prefixes);
    cached = {
      resolver,
      subPrefixes: prefixes.filter(p => !p.toLowerCase().includes('hover'))
    };
    cache.set(cacheKey, cached);
  }
  return cached;
}
const hasFunction = value => isObject(value)
  && Object.getOwnPropertyNames(value).reduce((acc, key) => acc || isFunction(value[key]), false);
function needContext(proxy, names) {
  const {isScriptable, isIndexable} = _descriptors(proxy);
  for (const prop of names) {
    const scriptable = isScriptable(prop);
    const indexable = isIndexable(prop);
    const value = (indexable || scriptable) && proxy[prop];
    if ((scriptable && (isFunction(value) || hasFunction(value)))
      || (indexable && isArray(value))) {
      return true;
    }
  }
  return false;
}

var version = "3.6.0";

const KNOWN_POSITIONS = ['top', 'bottom', 'left', 'right', 'chartArea'];
function positionIsHorizontal(position, axis) {
  return position === 'top' || position === 'bottom' || (KNOWN_POSITIONS.indexOf(position) === -1 && axis === 'x');
}
function compare2Level(l1, l2) {
  return function(a, b) {
    return a[l1] === b[l1]
      ? a[l2] - b[l2]
      : a[l1] - b[l1];
  };
}
function onAnimationsComplete(context) {
  const chart = context.chart;
  const animationOptions = chart.options.animation;
  chart.notifyPlugins('afterRender');
  callback(animationOptions && animationOptions.onComplete, [context], chart);
}
function onAnimationProgress(context) {
  const chart = context.chart;
  const animationOptions = chart.options.animation;
  callback(animationOptions && animationOptions.onProgress, [context], chart);
}
function getCanvas(item) {
  if (_isDomSupported() && typeof item === 'string') {
    item = document.getElementById(item);
  } else if (item && item.length) {
    item = item[0];
  }
  if (item && item.canvas) {
    item = item.canvas;
  }
  return item;
}
const instances = {};
const getChart = (key) => {
  const canvas = getCanvas(key);
  return Object.values(instances).filter((c) => c.canvas === canvas).pop();
};
class Chart {
  constructor(item, userConfig) {
    const config = this.config = new Config(userConfig);
    const initialCanvas = getCanvas(item);
    const existingChart = getChart(initialCanvas);
    if (existingChart) {
      throw new Error(
        'Canvas is already in use. Chart with ID \'' + existingChart.id + '\'' +
				' must be destroyed before the canvas can be reused.'
      );
    }
    const options = config.createResolver(config.chartOptionScopes(), this.getContext());
    this.platform = new (config.platform || _detectPlatform(initialCanvas))();
    this.platform.updateConfig(config);
    const context = this.platform.acquireContext(initialCanvas, options.aspectRatio);
    const canvas = context && context.canvas;
    const height = canvas && canvas.height;
    const width = canvas && canvas.width;
    this.id = uid();
    this.ctx = context;
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this._options = options;
    this._aspectRatio = this.aspectRatio;
    this._layers = [];
    this._metasets = [];
    this._stacks = undefined;
    this.boxes = [];
    this.currentDevicePixelRatio = undefined;
    this.chartArea = undefined;
    this._active = [];
    this._lastEvent = undefined;
    this._listeners = {};
    this._responsiveListeners = undefined;
    this._sortedMetasets = [];
    this.scales = {};
    this._plugins = new PluginService();
    this.$proxies = {};
    this._hiddenIndices = {};
    this.attached = false;
    this._animationsDisabled = undefined;
    this.$context = undefined;
    this._doResize = debounce(mode => this.update(mode), options.resizeDelay || 0);
    instances[this.id] = this;
    if (!context || !canvas) {
      console.error("Failed to create chart: can't acquire context from the given item");
      return;
    }
    animator.listen(this, 'complete', onAnimationsComplete);
    animator.listen(this, 'progress', onAnimationProgress);
    this._initialize();
    if (this.attached) {
      this.update();
    }
  }
  get aspectRatio() {
    const {options: {aspectRatio, maintainAspectRatio}, width, height, _aspectRatio} = this;
    if (!isNullOrUndef(aspectRatio)) {
      return aspectRatio;
    }
    if (maintainAspectRatio && _aspectRatio) {
      return _aspectRatio;
    }
    return height ? width / height : null;
  }
  get data() {
    return this.config.data;
  }
  set data(data) {
    this.config.data = data;
  }
  get options() {
    return this._options;
  }
  set options(options) {
    this.config.options = options;
  }
  _initialize() {
    this.notifyPlugins('beforeInit');
    if (this.options.responsive) {
      this.resize();
    } else {
      retinaScale(this, this.options.devicePixelRatio);
    }
    this.bindEvents();
    this.notifyPlugins('afterInit');
    return this;
  }
  clear() {
    clearCanvas(this.canvas, this.ctx);
    return this;
  }
  stop() {
    animator.stop(this);
    return this;
  }
  resize(width, height) {
    if (!animator.running(this)) {
      this._resize(width, height);
    } else {
      this._resizeBeforeDraw = {width, height};
    }
  }
  _resize(width, height) {
    const options = this.options;
    const canvas = this.canvas;
    const aspectRatio = options.maintainAspectRatio && this.aspectRatio;
    const newSize = this.platform.getMaximumSize(canvas, width, height, aspectRatio);
    const newRatio = options.devicePixelRatio || this.platform.getDevicePixelRatio();
    const mode = this.width ? 'resize' : 'attach';
    this.width = newSize.width;
    this.height = newSize.height;
    this._aspectRatio = this.aspectRatio;
    if (!retinaScale(this, newRatio, true)) {
      return;
    }
    this.notifyPlugins('resize', {size: newSize});
    callback(options.onResize, [this, newSize], this);
    if (this.attached) {
      if (this._doResize(mode)) {
        this.render();
      }
    }
  }
  ensureScalesHaveIDs() {
    const options = this.options;
    const scalesOptions = options.scales || {};
    each(scalesOptions, (axisOptions, axisID) => {
      axisOptions.id = axisID;
    });
  }
  buildOrUpdateScales() {
    const options = this.options;
    const scaleOpts = options.scales;
    const scales = this.scales;
    const updated = Object.keys(scales).reduce((obj, id) => {
      obj[id] = false;
      return obj;
    }, {});
    let items = [];
    if (scaleOpts) {
      items = items.concat(
        Object.keys(scaleOpts).map((id) => {
          const scaleOptions = scaleOpts[id];
          const axis = determineAxis(id, scaleOptions);
          const isRadial = axis === 'r';
          const isHorizontal = axis === 'x';
          return {
            options: scaleOptions,
            dposition: isRadial ? 'chartArea' : isHorizontal ? 'bottom' : 'left',
            dtype: isRadial ? 'radialLinear' : isHorizontal ? 'category' : 'linear'
          };
        })
      );
    }
    each(items, (item) => {
      const scaleOptions = item.options;
      const id = scaleOptions.id;
      const axis = determineAxis(id, scaleOptions);
      const scaleType = valueOrDefault(scaleOptions.type, item.dtype);
      if (scaleOptions.position === undefined || positionIsHorizontal(scaleOptions.position, axis) !== positionIsHorizontal(item.dposition)) {
        scaleOptions.position = item.dposition;
      }
      updated[id] = true;
      let scale = null;
      if (id in scales && scales[id].type === scaleType) {
        scale = scales[id];
      } else {
        const scaleClass = registry.getScale(scaleType);
        scale = new scaleClass({
          id,
          type: scaleType,
          ctx: this.ctx,
          chart: this
        });
        scales[scale.id] = scale;
      }
      scale.init(scaleOptions, options);
    });
    each(updated, (hasUpdated, id) => {
      if (!hasUpdated) {
        delete scales[id];
      }
    });
    each(scales, (scale) => {
      layouts.configure(this, scale, scale.options);
      layouts.addBox(this, scale);
    });
  }
  _updateMetasets() {
    const metasets = this._metasets;
    const numData = this.data.datasets.length;
    const numMeta = metasets.length;
    metasets.sort((a, b) => a.index - b.index);
    if (numMeta > numData) {
      for (let i = numData; i < numMeta; ++i) {
        this._destroyDatasetMeta(i);
      }
      metasets.splice(numData, numMeta - numData);
    }
    this._sortedMetasets = metasets.slice(0).sort(compare2Level('order', 'index'));
  }
  _removeUnreferencedMetasets() {
    const {_metasets: metasets, data: {datasets}} = this;
    if (metasets.length > datasets.length) {
      delete this._stacks;
    }
    metasets.forEach((meta, index) => {
      if (datasets.filter(x => x === meta._dataset).length === 0) {
        this._destroyDatasetMeta(index);
      }
    });
  }
  buildOrUpdateControllers() {
    const newControllers = [];
    const datasets = this.data.datasets;
    let i, ilen;
    this._removeUnreferencedMetasets();
    for (i = 0, ilen = datasets.length; i < ilen; i++) {
      const dataset = datasets[i];
      let meta = this.getDatasetMeta(i);
      const type = dataset.type || this.config.type;
      if (meta.type && meta.type !== type) {
        this._destroyDatasetMeta(i);
        meta = this.getDatasetMeta(i);
      }
      meta.type = type;
      meta.indexAxis = dataset.indexAxis || getIndexAxis(type, this.options);
      meta.order = dataset.order || 0;
      meta.index = i;
      meta.label = '' + dataset.label;
      meta.visible = this.isDatasetVisible(i);
      if (meta.controller) {
        meta.controller.updateIndex(i);
        meta.controller.linkScales();
      } else {
        const ControllerClass = registry.getController(type);
        const {datasetElementType, dataElementType} = defaults$1.datasets[type];
        Object.assign(ControllerClass.prototype, {
          dataElementType: registry.getElement(dataElementType),
          datasetElementType: datasetElementType && registry.getElement(datasetElementType)
        });
        meta.controller = new ControllerClass(this, i);
        newControllers.push(meta.controller);
      }
    }
    this._updateMetasets();
    return newControllers;
  }
  _resetElements() {
    each(this.data.datasets, (dataset, datasetIndex) => {
      this.getDatasetMeta(datasetIndex).controller.reset();
    }, this);
  }
  reset() {
    this._resetElements();
    this.notifyPlugins('reset');
  }
  update(mode) {
    const config = this.config;
    config.update();
    const options = this._options = config.createResolver(config.chartOptionScopes(), this.getContext());
    each(this.scales, (scale) => {
      layouts.removeBox(this, scale);
    });
    const animsDisabled = this._animationsDisabled = !options.animation;
    this.ensureScalesHaveIDs();
    this.buildOrUpdateScales();
    const existingEvents = new Set(Object.keys(this._listeners));
    const newEvents = new Set(options.events);
    if (!setsEqual(existingEvents, newEvents) || !!this._responsiveListeners !== options.responsive) {
      this.unbindEvents();
      this.bindEvents();
    }
    this._plugins.invalidate();
    if (this.notifyPlugins('beforeUpdate', {mode, cancelable: true}) === false) {
      return;
    }
    const newControllers = this.buildOrUpdateControllers();
    this.notifyPlugins('beforeElementsUpdate');
    let minPadding = 0;
    for (let i = 0, ilen = this.data.datasets.length; i < ilen; i++) {
      const {controller} = this.getDatasetMeta(i);
      const reset = !animsDisabled && newControllers.indexOf(controller) === -1;
      controller.buildOrUpdateElements(reset);
      minPadding = Math.max(+controller.getMaxOverflow(), minPadding);
    }
    minPadding = this._minPadding = options.layout.autoPadding ? minPadding : 0;
    this._updateLayout(minPadding);
    if (!animsDisabled) {
      each(newControllers, (controller) => {
        controller.reset();
      });
    }
    this._updateDatasets(mode);
    this.notifyPlugins('afterUpdate', {mode});
    this._layers.sort(compare2Level('z', '_idx'));
    if (this._lastEvent) {
      this._eventHandler(this._lastEvent, true);
    }
    this.render();
  }
  _updateLayout(minPadding) {
    if (this.notifyPlugins('beforeLayout', {cancelable: true}) === false) {
      return;
    }
    layouts.update(this, this.width, this.height, minPadding);
    const area = this.chartArea;
    const noArea = area.width <= 0 || area.height <= 0;
    this._layers = [];
    each(this.boxes, (box) => {
      if (noArea && box.position === 'chartArea') {
        return;
      }
      if (box.configure) {
        box.configure();
      }
      this._layers.push(...box._layers());
    }, this);
    this._layers.forEach((item, index) => {
      item._idx = index;
    });
    this.notifyPlugins('afterLayout');
  }
  _updateDatasets(mode) {
    if (this.notifyPlugins('beforeDatasetsUpdate', {mode, cancelable: true}) === false) {
      return;
    }
    for (let i = 0, ilen = this.data.datasets.length; i < ilen; ++i) {
      this._updateDataset(i, isFunction(mode) ? mode({datasetIndex: i}) : mode);
    }
    this.notifyPlugins('afterDatasetsUpdate', {mode});
  }
  _updateDataset(index, mode) {
    const meta = this.getDatasetMeta(index);
    const args = {meta, index, mode, cancelable: true};
    if (this.notifyPlugins('beforeDatasetUpdate', args) === false) {
      return;
    }
    meta.controller._update(mode);
    args.cancelable = false;
    this.notifyPlugins('afterDatasetUpdate', args);
  }
  render() {
    if (this.notifyPlugins('beforeRender', {cancelable: true}) === false) {
      return;
    }
    if (animator.has(this)) {
      if (this.attached && !animator.running(this)) {
        animator.start(this);
      }
    } else {
      this.draw();
      onAnimationsComplete({chart: this});
    }
  }
  draw() {
    let i;
    if (this._resizeBeforeDraw) {
      const {width, height} = this._resizeBeforeDraw;
      this._resize(width, height);
      this._resizeBeforeDraw = null;
    }
    this.clear();
    if (this.width <= 0 || this.height <= 0) {
      return;
    }
    if (this.notifyPlugins('beforeDraw', {cancelable: true}) === false) {
      return;
    }
    const layers = this._layers;
    for (i = 0; i < layers.length && layers[i].z <= 0; ++i) {
      layers[i].draw(this.chartArea);
    }
    this._drawDatasets();
    for (; i < layers.length; ++i) {
      layers[i].draw(this.chartArea);
    }
    this.notifyPlugins('afterDraw');
  }
  _getSortedDatasetMetas(filterVisible) {
    const metasets = this._sortedMetasets;
    const result = [];
    let i, ilen;
    for (i = 0, ilen = metasets.length; i < ilen; ++i) {
      const meta = metasets[i];
      if (!filterVisible || meta.visible) {
        result.push(meta);
      }
    }
    return result;
  }
  getSortedVisibleDatasetMetas() {
    return this._getSortedDatasetMetas(true);
  }
  _drawDatasets() {
    if (this.notifyPlugins('beforeDatasetsDraw', {cancelable: true}) === false) {
      return;
    }
    const metasets = this.getSortedVisibleDatasetMetas();
    for (let i = metasets.length - 1; i >= 0; --i) {
      this._drawDataset(metasets[i]);
    }
    this.notifyPlugins('afterDatasetsDraw');
  }
  _drawDataset(meta) {
    const ctx = this.ctx;
    const clip = meta._clip;
    const useClip = !clip.disabled;
    const area = this.chartArea;
    const args = {
      meta,
      index: meta.index,
      cancelable: true
    };
    if (this.notifyPlugins('beforeDatasetDraw', args) === false) {
      return;
    }
    if (useClip) {
      clipArea(ctx, {
        left: clip.left === false ? 0 : area.left - clip.left,
        right: clip.right === false ? this.width : area.right + clip.right,
        top: clip.top === false ? 0 : area.top - clip.top,
        bottom: clip.bottom === false ? this.height : area.bottom + clip.bottom
      });
    }
    meta.controller.draw();
    if (useClip) {
      unclipArea(ctx);
    }
    args.cancelable = false;
    this.notifyPlugins('afterDatasetDraw', args);
  }
  getElementsAtEventForMode(e, mode, options, useFinalPosition) {
    const method = Interaction.modes[mode];
    if (typeof method === 'function') {
      return method(this, e, options, useFinalPosition);
    }
    return [];
  }
  getDatasetMeta(datasetIndex) {
    const dataset = this.data.datasets[datasetIndex];
    const metasets = this._metasets;
    let meta = metasets.filter(x => x && x._dataset === dataset).pop();
    if (!meta) {
      meta = {
        type: null,
        data: [],
        dataset: null,
        controller: null,
        hidden: null,
        xAxisID: null,
        yAxisID: null,
        order: dataset && dataset.order || 0,
        index: datasetIndex,
        _dataset: dataset,
        _parsed: [],
        _sorted: false
      };
      metasets.push(meta);
    }
    return meta;
  }
  getContext() {
    return this.$context || (this.$context = createContext(null, {chart: this, type: 'chart'}));
  }
  getVisibleDatasetCount() {
    return this.getSortedVisibleDatasetMetas().length;
  }
  isDatasetVisible(datasetIndex) {
    const dataset = this.data.datasets[datasetIndex];
    if (!dataset) {
      return false;
    }
    const meta = this.getDatasetMeta(datasetIndex);
    return typeof meta.hidden === 'boolean' ? !meta.hidden : !dataset.hidden;
  }
  setDatasetVisibility(datasetIndex, visible) {
    const meta = this.getDatasetMeta(datasetIndex);
    meta.hidden = !visible;
  }
  toggleDataVisibility(index) {
    this._hiddenIndices[index] = !this._hiddenIndices[index];
  }
  getDataVisibility(index) {
    return !this._hiddenIndices[index];
  }
  _updateVisibility(datasetIndex, dataIndex, visible) {
    const mode = visible ? 'show' : 'hide';
    const meta = this.getDatasetMeta(datasetIndex);
    const anims = meta.controller._resolveAnimations(undefined, mode);
    if (defined(dataIndex)) {
      meta.data[dataIndex].hidden = !visible;
      this.update();
    } else {
      this.setDatasetVisibility(datasetIndex, visible);
      anims.update(meta, {visible});
      this.update((ctx) => ctx.datasetIndex === datasetIndex ? mode : undefined);
    }
  }
  hide(datasetIndex, dataIndex) {
    this._updateVisibility(datasetIndex, dataIndex, false);
  }
  show(datasetIndex, dataIndex) {
    this._updateVisibility(datasetIndex, dataIndex, true);
  }
  _destroyDatasetMeta(datasetIndex) {
    const meta = this._metasets[datasetIndex];
    if (meta && meta.controller) {
      meta.controller._destroy();
    }
    delete this._metasets[datasetIndex];
  }
  _stop() {
    let i, ilen;
    this.stop();
    animator.remove(this);
    for (i = 0, ilen = this.data.datasets.length; i < ilen; ++i) {
      this._destroyDatasetMeta(i);
    }
  }
  destroy() {
    const {canvas, ctx} = this;
    this._stop();
    this.config.clearCache();
    if (canvas) {
      this.unbindEvents();
      clearCanvas(canvas, ctx);
      this.platform.releaseContext(ctx);
      this.canvas = null;
      this.ctx = null;
    }
    this.notifyPlugins('destroy');
    delete instances[this.id];
  }
  toBase64Image(...args) {
    return this.canvas.toDataURL(...args);
  }
  bindEvents() {
    this.bindUserEvents();
    if (this.options.responsive) {
      this.bindResponsiveEvents();
    } else {
      this.attached = true;
    }
  }
  bindUserEvents() {
    const listeners = this._listeners;
    const platform = this.platform;
    const _add = (type, listener) => {
      platform.addEventListener(this, type, listener);
      listeners[type] = listener;
    };
    const listener = (e, x, y) => {
      e.offsetX = x;
      e.offsetY = y;
      this._eventHandler(e);
    };
    each(this.options.events, (type) => _add(type, listener));
  }
  bindResponsiveEvents() {
    if (!this._responsiveListeners) {
      this._responsiveListeners = {};
    }
    const listeners = this._responsiveListeners;
    const platform = this.platform;
    const _add = (type, listener) => {
      platform.addEventListener(this, type, listener);
      listeners[type] = listener;
    };
    const _remove = (type, listener) => {
      if (listeners[type]) {
        platform.removeEventListener(this, type, listener);
        delete listeners[type];
      }
    };
    const listener = (width, height) => {
      if (this.canvas) {
        this.resize(width, height);
      }
    };
    let detached;
    const attached = () => {
      _remove('attach', attached);
      this.attached = true;
      this.resize();
      _add('resize', listener);
      _add('detach', detached);
    };
    detached = () => {
      this.attached = false;
      _remove('resize', listener);
      this._stop();
      this._resize(0, 0);
      _add('attach', attached);
    };
    if (platform.isAttached(this.canvas)) {
      attached();
    } else {
      detached();
    }
  }
  unbindEvents() {
    each(this._listeners, (listener, type) => {
      this.platform.removeEventListener(this, type, listener);
    });
    this._listeners = {};
    each(this._responsiveListeners, (listener, type) => {
      this.platform.removeEventListener(this, type, listener);
    });
    this._responsiveListeners = undefined;
  }
  updateHoverStyle(items, mode, enabled) {
    const prefix = enabled ? 'set' : 'remove';
    let meta, item, i, ilen;
    if (mode === 'dataset') {
      meta = this.getDatasetMeta(items[0].datasetIndex);
      meta.controller['_' + prefix + 'DatasetHoverStyle']();
    }
    for (i = 0, ilen = items.length; i < ilen; ++i) {
      item = items[i];
      const controller = item && this.getDatasetMeta(item.datasetIndex).controller;
      if (controller) {
        controller[prefix + 'HoverStyle'](item.element, item.datasetIndex, item.index);
      }
    }
  }
  getActiveElements() {
    return this._active || [];
  }
  setActiveElements(activeElements) {
    const lastActive = this._active || [];
    const active = activeElements.map(({datasetIndex, index}) => {
      const meta = this.getDatasetMeta(datasetIndex);
      if (!meta) {
        throw new Error('No dataset found at index ' + datasetIndex);
      }
      return {
        datasetIndex,
        element: meta.data[index],
        index,
      };
    });
    const changed = !_elementsEqual(active, lastActive);
    if (changed) {
      this._active = active;
      this._updateHoverStyles(active, lastActive);
    }
  }
  notifyPlugins(hook, args, filter) {
    return this._plugins.notify(this, hook, args, filter);
  }
  _updateHoverStyles(active, lastActive, replay) {
    const hoverOptions = this.options.hover;
    const diff = (a, b) => a.filter(x => !b.some(y => x.datasetIndex === y.datasetIndex && x.index === y.index));
    const deactivated = diff(lastActive, active);
    const activated = replay ? active : diff(active, lastActive);
    if (deactivated.length) {
      this.updateHoverStyle(deactivated, hoverOptions.mode, false);
    }
    if (activated.length && hoverOptions.mode) {
      this.updateHoverStyle(activated, hoverOptions.mode, true);
    }
  }
  _eventHandler(e, replay) {
    const args = {event: e, replay, cancelable: true};
    const eventFilter = (plugin) => (plugin.options.events || this.options.events).includes(e.native.type);
    if (this.notifyPlugins('beforeEvent', args, eventFilter) === false) {
      return;
    }
    const changed = this._handleEvent(e, replay);
    args.cancelable = false;
    this.notifyPlugins('afterEvent', args, eventFilter);
    if (changed || args.changed) {
      this.render();
    }
    return this;
  }
  _handleEvent(e, replay) {
    const {_active: lastActive = [], options} = this;
    const hoverOptions = options.hover;
    const useFinalPosition = replay;
    let active = [];
    let changed = false;
    let lastEvent = null;
    if (e.type !== 'mouseout') {
      active = this.getElementsAtEventForMode(e, hoverOptions.mode, hoverOptions, useFinalPosition);
      lastEvent = e.type === 'click' ? this._lastEvent : e;
    }
    this._lastEvent = null;
    if (_isPointInArea(e, this.chartArea, this._minPadding)) {
      callback(options.onHover, [e, active, this], this);
      if (e.type === 'mouseup' || e.type === 'click' || e.type === 'contextmenu') {
        callback(options.onClick, [e, active, this], this);
      }
    }
    changed = !_elementsEqual(active, lastActive);
    if (changed || replay) {
      this._active = active;
      this._updateHoverStyles(active, lastActive, replay);
    }
    this._lastEvent = lastEvent;
    return changed;
  }
}
const invalidatePlugins = () => each(Chart.instances, (chart) => chart._plugins.invalidate());
const enumerable = true;
Object.defineProperties(Chart, {
  defaults: {
    enumerable,
    value: defaults$1
  },
  instances: {
    enumerable,
    value: instances
  },
  overrides: {
    enumerable,
    value: overrides
  },
  registry: {
    enumerable,
    value: registry
  },
  version: {
    enumerable,
    value: version
  },
  getChart: {
    enumerable,
    value: getChart
  },
  register: {
    enumerable,
    value: (...items) => {
      registry.add(...items);
      invalidatePlugins();
    }
  },
  unregister: {
    enumerable,
    value: (...items) => {
      registry.remove(...items);
      invalidatePlugins();
    }
  }
});

function clipArc(ctx, element, endAngle) {
  const {startAngle, pixelMargin, x, y, outerRadius, innerRadius} = element;
  let angleMargin = pixelMargin / outerRadius;
  ctx.beginPath();
  ctx.arc(x, y, outerRadius, startAngle - angleMargin, endAngle + angleMargin);
  if (innerRadius > pixelMargin) {
    angleMargin = pixelMargin / innerRadius;
    ctx.arc(x, y, innerRadius, endAngle + angleMargin, startAngle - angleMargin, true);
  } else {
    ctx.arc(x, y, pixelMargin, endAngle + HALF_PI, startAngle - HALF_PI);
  }
  ctx.closePath();
  ctx.clip();
}
function toRadiusCorners(value) {
  return _readValueToProps(value, ['outerStart', 'outerEnd', 'innerStart', 'innerEnd']);
}
function parseBorderRadius$1(arc, innerRadius, outerRadius, angleDelta) {
  const o = toRadiusCorners(arc.options.borderRadius);
  const halfThickness = (outerRadius - innerRadius) / 2;
  const innerLimit = Math.min(halfThickness, angleDelta * innerRadius / 2);
  const computeOuterLimit = (val) => {
    const outerArcLimit = (outerRadius - Math.min(halfThickness, val)) * angleDelta / 2;
    return _limitValue(val, 0, Math.min(halfThickness, outerArcLimit));
  };
  return {
    outerStart: computeOuterLimit(o.outerStart),
    outerEnd: computeOuterLimit(o.outerEnd),
    innerStart: _limitValue(o.innerStart, 0, innerLimit),
    innerEnd: _limitValue(o.innerEnd, 0, innerLimit),
  };
}
function rThetaToXY(r, theta, x, y) {
  return {
    x: x + r * Math.cos(theta),
    y: y + r * Math.sin(theta),
  };
}
function pathArc(ctx, element, offset, spacing, end) {
  const {x, y, startAngle: start, pixelMargin, innerRadius: innerR} = element;
  const outerRadius = Math.max(element.outerRadius + spacing + offset - pixelMargin, 0);
  const innerRadius = innerR > 0 ? innerR + spacing + offset + pixelMargin : 0;
  let spacingOffset = 0;
  const alpha = end - start;
  if (spacing) {
    const noSpacingInnerRadius = innerR > 0 ? innerR - spacing : 0;
    const noSpacingOuterRadius = outerRadius > 0 ? outerRadius - spacing : 0;
    const avNogSpacingRadius = (noSpacingInnerRadius + noSpacingOuterRadius) / 2;
    const adjustedAngle = avNogSpacingRadius !== 0 ? (alpha * avNogSpacingRadius) / (avNogSpacingRadius + spacing) : alpha;
    spacingOffset = (alpha - adjustedAngle) / 2;
  }
  const beta = Math.max(0.001, alpha * outerRadius - offset / PI) / outerRadius;
  const angleOffset = (alpha - beta) / 2;
  const startAngle = start + angleOffset + spacingOffset;
  const endAngle = end - angleOffset - spacingOffset;
  const {outerStart, outerEnd, innerStart, innerEnd} = parseBorderRadius$1(element, innerRadius, outerRadius, endAngle - startAngle);
  const outerStartAdjustedRadius = outerRadius - outerStart;
  const outerEndAdjustedRadius = outerRadius - outerEnd;
  const outerStartAdjustedAngle = startAngle + outerStart / outerStartAdjustedRadius;
  const outerEndAdjustedAngle = endAngle - outerEnd / outerEndAdjustedRadius;
  const innerStartAdjustedRadius = innerRadius + innerStart;
  const innerEndAdjustedRadius = innerRadius + innerEnd;
  const innerStartAdjustedAngle = startAngle + innerStart / innerStartAdjustedRadius;
  const innerEndAdjustedAngle = endAngle - innerEnd / innerEndAdjustedRadius;
  ctx.beginPath();
  ctx.arc(x, y, outerRadius, outerStartAdjustedAngle, outerEndAdjustedAngle);
  if (outerEnd > 0) {
    const pCenter = rThetaToXY(outerEndAdjustedRadius, outerEndAdjustedAngle, x, y);
    ctx.arc(pCenter.x, pCenter.y, outerEnd, outerEndAdjustedAngle, endAngle + HALF_PI);
  }
  const p4 = rThetaToXY(innerEndAdjustedRadius, endAngle, x, y);
  ctx.lineTo(p4.x, p4.y);
  if (innerEnd > 0) {
    const pCenter = rThetaToXY(innerEndAdjustedRadius, innerEndAdjustedAngle, x, y);
    ctx.arc(pCenter.x, pCenter.y, innerEnd, endAngle + HALF_PI, innerEndAdjustedAngle + Math.PI);
  }
  ctx.arc(x, y, innerRadius, endAngle - (innerEnd / innerRadius), startAngle + (innerStart / innerRadius), true);
  if (innerStart > 0) {
    const pCenter = rThetaToXY(innerStartAdjustedRadius, innerStartAdjustedAngle, x, y);
    ctx.arc(pCenter.x, pCenter.y, innerStart, innerStartAdjustedAngle + Math.PI, startAngle - HALF_PI);
  }
  const p8 = rThetaToXY(outerStartAdjustedRadius, startAngle, x, y);
  ctx.lineTo(p8.x, p8.y);
  if (outerStart > 0) {
    const pCenter = rThetaToXY(outerStartAdjustedRadius, outerStartAdjustedAngle, x, y);
    ctx.arc(pCenter.x, pCenter.y, outerStart, startAngle - HALF_PI, outerStartAdjustedAngle);
  }
  ctx.closePath();
}
function drawArc(ctx, element, offset, spacing) {
  const {fullCircles, startAngle, circumference} = element;
  let endAngle = element.endAngle;
  if (fullCircles) {
    pathArc(ctx, element, offset, spacing, startAngle + TAU);
    for (let i = 0; i < fullCircles; ++i) {
      ctx.fill();
    }
    if (!isNaN(circumference)) {
      endAngle = startAngle + circumference % TAU;
      if (circumference % TAU === 0) {
        endAngle += TAU;
      }
    }
  }
  pathArc(ctx, element, offset, spacing, endAngle);
  ctx.fill();
  return endAngle;
}
function drawFullCircleBorders(ctx, element, inner) {
  const {x, y, startAngle, pixelMargin, fullCircles} = element;
  const outerRadius = Math.max(element.outerRadius - pixelMargin, 0);
  const innerRadius = element.innerRadius + pixelMargin;
  let i;
  if (inner) {
    clipArc(ctx, element, startAngle + TAU);
  }
  ctx.beginPath();
  ctx.arc(x, y, innerRadius, startAngle + TAU, startAngle, true);
  for (i = 0; i < fullCircles; ++i) {
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, outerRadius, startAngle, startAngle + TAU);
  for (i = 0; i < fullCircles; ++i) {
    ctx.stroke();
  }
}
function drawBorder(ctx, element, offset, spacing, endAngle) {
  const {options} = element;
  const inner = options.borderAlign === 'inner';
  if (!options.borderWidth) {
    return;
  }
  if (inner) {
    ctx.lineWidth = options.borderWidth * 2;
    ctx.lineJoin = 'round';
  } else {
    ctx.lineWidth = options.borderWidth;
    ctx.lineJoin = 'bevel';
  }
  if (element.fullCircles) {
    drawFullCircleBorders(ctx, element, inner);
  }
  if (inner) {
    clipArc(ctx, element, endAngle);
  }
  pathArc(ctx, element, offset, spacing, endAngle);
  ctx.stroke();
}
class ArcElement extends Element {
  constructor(cfg) {
    super();
    this.options = undefined;
    this.circumference = undefined;
    this.startAngle = undefined;
    this.endAngle = undefined;
    this.innerRadius = undefined;
    this.outerRadius = undefined;
    this.pixelMargin = 0;
    this.fullCircles = 0;
    if (cfg) {
      Object.assign(this, cfg);
    }
  }
  inRange(chartX, chartY, useFinalPosition) {
    const point = this.getProps(['x', 'y'], useFinalPosition);
    const {angle, distance} = getAngleFromPoint(point, {x: chartX, y: chartY});
    const {startAngle, endAngle, innerRadius, outerRadius, circumference} = this.getProps([
      'startAngle',
      'endAngle',
      'innerRadius',
      'outerRadius',
      'circumference'
    ], useFinalPosition);
    const rAdjust = this.options.spacing / 2;
    const betweenAngles = circumference >= TAU || _angleBetween(angle, startAngle, endAngle);
    const withinRadius = (distance >= innerRadius + rAdjust && distance <= outerRadius + rAdjust);
    return (betweenAngles && withinRadius);
  }
  getCenterPoint(useFinalPosition) {
    const {x, y, startAngle, endAngle, innerRadius, outerRadius} = this.getProps([
      'x',
      'y',
      'startAngle',
      'endAngle',
      'innerRadius',
      'outerRadius',
      'circumference',
    ], useFinalPosition);
    const {offset, spacing} = this.options;
    const halfAngle = (startAngle + endAngle) / 2;
    const halfRadius = (innerRadius + outerRadius + spacing + offset) / 2;
    return {
      x: x + Math.cos(halfAngle) * halfRadius,
      y: y + Math.sin(halfAngle) * halfRadius
    };
  }
  tooltipPosition(useFinalPosition) {
    return this.getCenterPoint(useFinalPosition);
  }
  draw(ctx) {
    const {options, circumference} = this;
    const offset = (options.offset || 0) / 2;
    const spacing = (options.spacing || 0) / 2;
    this.pixelMargin = (options.borderAlign === 'inner') ? 0.33 : 0;
    this.fullCircles = circumference > TAU ? Math.floor(circumference / TAU) : 0;
    if (circumference === 0 || this.innerRadius < 0 || this.outerRadius < 0) {
      return;
    }
    ctx.save();
    let radiusOffset = 0;
    if (offset) {
      radiusOffset = offset / 2;
      const halfAngle = (this.startAngle + this.endAngle) / 2;
      ctx.translate(Math.cos(halfAngle) * radiusOffset, Math.sin(halfAngle) * radiusOffset);
      if (this.circumference >= PI) {
        radiusOffset = offset;
      }
    }
    ctx.fillStyle = options.backgroundColor;
    ctx.strokeStyle = options.borderColor;
    const endAngle = drawArc(ctx, this, radiusOffset, spacing);
    drawBorder(ctx, this, radiusOffset, spacing, endAngle);
    ctx.restore();
  }
}
ArcElement.id = 'arc';
ArcElement.defaults = {
  borderAlign: 'center',
  borderColor: '#fff',
  borderRadius: 0,
  borderWidth: 2,
  offset: 0,
  spacing: 0,
  angle: undefined,
};
ArcElement.defaultRoutes = {
  backgroundColor: 'backgroundColor'
};

function setStyle(ctx, options, style = options) {
  ctx.lineCap = valueOrDefault(style.borderCapStyle, options.borderCapStyle);
  ctx.setLineDash(valueOrDefault(style.borderDash, options.borderDash));
  ctx.lineDashOffset = valueOrDefault(style.borderDashOffset, options.borderDashOffset);
  ctx.lineJoin = valueOrDefault(style.borderJoinStyle, options.borderJoinStyle);
  ctx.lineWidth = valueOrDefault(style.borderWidth, options.borderWidth);
  ctx.strokeStyle = valueOrDefault(style.borderColor, options.borderColor);
}
function lineTo(ctx, previous, target) {
  ctx.lineTo(target.x, target.y);
}
function getLineMethod(options) {
  if (options.stepped) {
    return _steppedLineTo;
  }
  if (options.tension || options.cubicInterpolationMode === 'monotone') {
    return _bezierCurveTo;
  }
  return lineTo;
}
function pathVars(points, segment, params = {}) {
  const count = points.length;
  const {start: paramsStart = 0, end: paramsEnd = count - 1} = params;
  const {start: segmentStart, end: segmentEnd} = segment;
  const start = Math.max(paramsStart, segmentStart);
  const end = Math.min(paramsEnd, segmentEnd);
  const outside = paramsStart < segmentStart && paramsEnd < segmentStart || paramsStart > segmentEnd && paramsEnd > segmentEnd;
  return {
    count,
    start,
    loop: segment.loop,
    ilen: end < start && !outside ? count + end - start : end - start
  };
}
function pathSegment(ctx, line, segment, params) {
  const {points, options} = line;
  const {count, start, loop, ilen} = pathVars(points, segment, params);
  const lineMethod = getLineMethod(options);
  let {move = true, reverse} = params || {};
  let i, point, prev;
  for (i = 0; i <= ilen; ++i) {
    point = points[(start + (reverse ? ilen - i : i)) % count];
    if (point.skip) {
      continue;
    } else if (move) {
      ctx.moveTo(point.x, point.y);
      move = false;
    } else {
      lineMethod(ctx, prev, point, reverse, options.stepped);
    }
    prev = point;
  }
  if (loop) {
    point = points[(start + (reverse ? ilen : 0)) % count];
    lineMethod(ctx, prev, point, reverse, options.stepped);
  }
  return !!loop;
}
function fastPathSegment(ctx, line, segment, params) {
  const points = line.points;
  const {count, start, ilen} = pathVars(points, segment, params);
  const {move = true, reverse} = params || {};
  let avgX = 0;
  let countX = 0;
  let i, point, prevX, minY, maxY, lastY;
  const pointIndex = (index) => (start + (reverse ? ilen - index : index)) % count;
  const drawX = () => {
    if (minY !== maxY) {
      ctx.lineTo(avgX, maxY);
      ctx.lineTo(avgX, minY);
      ctx.lineTo(avgX, lastY);
    }
  };
  if (move) {
    point = points[pointIndex(0)];
    ctx.moveTo(point.x, point.y);
  }
  for (i = 0; i <= ilen; ++i) {
    point = points[pointIndex(i)];
    if (point.skip) {
      continue;
    }
    const x = point.x;
    const y = point.y;
    const truncX = x | 0;
    if (truncX === prevX) {
      if (y < minY) {
        minY = y;
      } else if (y > maxY) {
        maxY = y;
      }
      avgX = (countX * avgX + x) / ++countX;
    } else {
      drawX();
      ctx.lineTo(x, y);
      prevX = truncX;
      countX = 0;
      minY = maxY = y;
    }
    lastY = y;
  }
  drawX();
}
function _getSegmentMethod(line) {
  const opts = line.options;
  const borderDash = opts.borderDash && opts.borderDash.length;
  const useFastPath = !line._decimated && !line._loop && !opts.tension && opts.cubicInterpolationMode !== 'monotone' && !opts.stepped && !borderDash;
  return useFastPath ? fastPathSegment : pathSegment;
}
function _getInterpolationMethod(options) {
  if (options.stepped) {
    return _steppedInterpolation;
  }
  if (options.tension || options.cubicInterpolationMode === 'monotone') {
    return _bezierInterpolation;
  }
  return _pointInLine;
}
function strokePathWithCache(ctx, line, start, count) {
  let path = line._path;
  if (!path) {
    path = line._path = new Path2D();
    if (line.path(path, start, count)) {
      path.closePath();
    }
  }
  setStyle(ctx, line.options);
  ctx.stroke(path);
}
function strokePathDirect(ctx, line, start, count) {
  const {segments, options} = line;
  const segmentMethod = _getSegmentMethod(line);
  for (const segment of segments) {
    setStyle(ctx, options, segment.style);
    ctx.beginPath();
    if (segmentMethod(ctx, line, segment, {start, end: start + count - 1})) {
      ctx.closePath();
    }
    ctx.stroke();
  }
}
const usePath2D = typeof Path2D === 'function';
function draw(ctx, line, start, count) {
  if (usePath2D && !line.options.segment) {
    strokePathWithCache(ctx, line, start, count);
  } else {
    strokePathDirect(ctx, line, start, count);
  }
}
class LineElement extends Element {
  constructor(cfg) {
    super();
    this.animated = true;
    this.options = undefined;
    this._chart = undefined;
    this._loop = undefined;
    this._fullLoop = undefined;
    this._path = undefined;
    this._points = undefined;
    this._segments = undefined;
    this._decimated = false;
    this._pointsUpdated = false;
    this._datasetIndex = undefined;
    if (cfg) {
      Object.assign(this, cfg);
    }
  }
  updateControlPoints(chartArea, indexAxis) {
    const options = this.options;
    if ((options.tension || options.cubicInterpolationMode === 'monotone') && !options.stepped && !this._pointsUpdated) {
      const loop = options.spanGaps ? this._loop : this._fullLoop;
      _updateBezierControlPoints(this._points, options, chartArea, loop, indexAxis);
      this._pointsUpdated = true;
    }
  }
  set points(points) {
    this._points = points;
    delete this._segments;
    delete this._path;
    this._pointsUpdated = false;
  }
  get points() {
    return this._points;
  }
  get segments() {
    return this._segments || (this._segments = _computeSegments(this, this.options.segment));
  }
  first() {
    const segments = this.segments;
    const points = this.points;
    return segments.length && points[segments[0].start];
  }
  last() {
    const segments = this.segments;
    const points = this.points;
    const count = segments.length;
    return count && points[segments[count - 1].end];
  }
  interpolate(point, property) {
    const options = this.options;
    const value = point[property];
    const points = this.points;
    const segments = _boundSegments(this, {property, start: value, end: value});
    if (!segments.length) {
      return;
    }
    const result = [];
    const _interpolate = _getInterpolationMethod(options);
    let i, ilen;
    for (i = 0, ilen = segments.length; i < ilen; ++i) {
      const {start, end} = segments[i];
      const p1 = points[start];
      const p2 = points[end];
      if (p1 === p2) {
        result.push(p1);
        continue;
      }
      const t = Math.abs((value - p1[property]) / (p2[property] - p1[property]));
      const interpolated = _interpolate(p1, p2, t, options.stepped);
      interpolated[property] = point[property];
      result.push(interpolated);
    }
    return result.length === 1 ? result[0] : result;
  }
  pathSegment(ctx, segment, params) {
    const segmentMethod = _getSegmentMethod(this);
    return segmentMethod(ctx, this, segment, params);
  }
  path(ctx, start, count) {
    const segments = this.segments;
    const segmentMethod = _getSegmentMethod(this);
    let loop = this._loop;
    start = start || 0;
    count = count || (this.points.length - start);
    for (const segment of segments) {
      loop &= segmentMethod(ctx, this, segment, {start, end: start + count - 1});
    }
    return !!loop;
  }
  draw(ctx, chartArea, start, count) {
    const options = this.options || {};
    const points = this.points || [];
    if (points.length && options.borderWidth) {
      ctx.save();
      draw(ctx, this, start, count);
      ctx.restore();
    }
    if (this.animated) {
      this._pointsUpdated = false;
      this._path = undefined;
    }
  }
}
LineElement.id = 'line';
LineElement.defaults = {
  borderCapStyle: 'butt',
  borderDash: [],
  borderDashOffset: 0,
  borderJoinStyle: 'miter',
  borderWidth: 3,
  capBezierPoints: true,
  cubicInterpolationMode: 'default',
  fill: false,
  spanGaps: false,
  stepped: false,
  tension: 0,
};
LineElement.defaultRoutes = {
  backgroundColor: 'backgroundColor',
  borderColor: 'borderColor'
};
LineElement.descriptors = {
  _scriptable: true,
  _indexable: (name) => name !== 'borderDash' && name !== 'fill',
};

function inRange$1(el, pos, axis, useFinalPosition) {
  const options = el.options;
  const {[axis]: value} = el.getProps([axis], useFinalPosition);
  return (Math.abs(pos - value) < options.radius + options.hitRadius);
}
class PointElement extends Element {
  constructor(cfg) {
    super();
    this.options = undefined;
    this.parsed = undefined;
    this.skip = undefined;
    this.stop = undefined;
    if (cfg) {
      Object.assign(this, cfg);
    }
  }
  inRange(mouseX, mouseY, useFinalPosition) {
    const options = this.options;
    const {x, y} = this.getProps(['x', 'y'], useFinalPosition);
    return ((Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2)) < Math.pow(options.hitRadius + options.radius, 2));
  }
  inXRange(mouseX, useFinalPosition) {
    return inRange$1(this, mouseX, 'x', useFinalPosition);
  }
  inYRange(mouseY, useFinalPosition) {
    return inRange$1(this, mouseY, 'y', useFinalPosition);
  }
  getCenterPoint(useFinalPosition) {
    const {x, y} = this.getProps(['x', 'y'], useFinalPosition);
    return {x, y};
  }
  size(options) {
    options = options || this.options || {};
    let radius = options.radius || 0;
    radius = Math.max(radius, radius && options.hoverRadius || 0);
    const borderWidth = radius && options.borderWidth || 0;
    return (radius + borderWidth) * 2;
  }
  draw(ctx, area) {
    const options = this.options;
    if (this.skip || options.radius < 0.1 || !_isPointInArea(this, area, this.size(options) / 2)) {
      return;
    }
    ctx.strokeStyle = options.borderColor;
    ctx.lineWidth = options.borderWidth;
    ctx.fillStyle = options.backgroundColor;
    drawPoint(ctx, options, this.x, this.y);
  }
  getRange() {
    const options = this.options || {};
    return options.radius + options.hitRadius;
  }
}
PointElement.id = 'point';
PointElement.defaults = {
  borderWidth: 1,
  hitRadius: 1,
  hoverBorderWidth: 1,
  hoverRadius: 4,
  pointStyle: 'circle',
  radius: 3,
  rotation: 0
};
PointElement.defaultRoutes = {
  backgroundColor: 'backgroundColor',
  borderColor: 'borderColor'
};

function getBarBounds(bar, useFinalPosition) {
  const {x, y, base, width, height} = bar.getProps(['x', 'y', 'base', 'width', 'height'], useFinalPosition);
  let left, right, top, bottom, half;
  if (bar.horizontal) {
    half = height / 2;
    left = Math.min(x, base);
    right = Math.max(x, base);
    top = y - half;
    bottom = y + half;
  } else {
    half = width / 2;
    left = x - half;
    right = x + half;
    top = Math.min(y, base);
    bottom = Math.max(y, base);
  }
  return {left, top, right, bottom};
}
function skipOrLimit(skip, value, min, max) {
  return skip ? 0 : _limitValue(value, min, max);
}
function parseBorderWidth(bar, maxW, maxH) {
  const value = bar.options.borderWidth;
  const skip = bar.borderSkipped;
  const o = toTRBL(value);
  return {
    t: skipOrLimit(skip.top, o.top, 0, maxH),
    r: skipOrLimit(skip.right, o.right, 0, maxW),
    b: skipOrLimit(skip.bottom, o.bottom, 0, maxH),
    l: skipOrLimit(skip.left, o.left, 0, maxW)
  };
}
function parseBorderRadius(bar, maxW, maxH) {
  const {enableBorderRadius} = bar.getProps(['enableBorderRadius']);
  const value = bar.options.borderRadius;
  const o = toTRBLCorners(value);
  const maxR = Math.min(maxW, maxH);
  const skip = bar.borderSkipped;
  const enableBorder = enableBorderRadius || isObject(value);
  return {
    topLeft: skipOrLimit(!enableBorder || skip.top || skip.left, o.topLeft, 0, maxR),
    topRight: skipOrLimit(!enableBorder || skip.top || skip.right, o.topRight, 0, maxR),
    bottomLeft: skipOrLimit(!enableBorder || skip.bottom || skip.left, o.bottomLeft, 0, maxR),
    bottomRight: skipOrLimit(!enableBorder || skip.bottom || skip.right, o.bottomRight, 0, maxR)
  };
}
function boundingRects$1(bar) {
  const bounds = getBarBounds(bar);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const border = parseBorderWidth(bar, width / 2, height / 2);
  const radius = parseBorderRadius(bar, width / 2, height / 2);
  return {
    outer: {
      x: bounds.left,
      y: bounds.top,
      w: width,
      h: height,
      radius
    },
    inner: {
      x: bounds.left + border.l,
      y: bounds.top + border.t,
      w: width - border.l - border.r,
      h: height - border.t - border.b,
      radius: {
        topLeft: Math.max(0, radius.topLeft - Math.max(border.t, border.l)),
        topRight: Math.max(0, radius.topRight - Math.max(border.t, border.r)),
        bottomLeft: Math.max(0, radius.bottomLeft - Math.max(border.b, border.l)),
        bottomRight: Math.max(0, radius.bottomRight - Math.max(border.b, border.r)),
      }
    }
  };
}
function inRange(bar, x, y, useFinalPosition) {
  const skipX = x === null;
  const skipY = y === null;
  const skipBoth = skipX && skipY;
  const bounds = bar && !skipBoth && getBarBounds(bar, useFinalPosition);
  return bounds
		&& (skipX || x >= bounds.left && x <= bounds.right)
		&& (skipY || y >= bounds.top && y <= bounds.bottom);
}
function hasRadius(radius) {
  return radius.topLeft || radius.topRight || radius.bottomLeft || radius.bottomRight;
}
function addNormalRectPath(ctx, rect) {
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
}
function inflateRect(rect, amount, refRect = {}) {
  const x = rect.x !== refRect.x ? -amount : 0;
  const y = rect.y !== refRect.y ? -amount : 0;
  const w = (rect.x + rect.w !== refRect.x + refRect.w ? amount : 0) - x;
  const h = (rect.y + rect.h !== refRect.y + refRect.h ? amount : 0) - y;
  return {
    x: rect.x + x,
    y: rect.y + y,
    w: rect.w + w,
    h: rect.h + h,
    radius: rect.radius
  };
}
class BarElement extends Element {
  constructor(cfg) {
    super();
    this.options = undefined;
    this.horizontal = undefined;
    this.base = undefined;
    this.width = undefined;
    this.height = undefined;
    this.inflateAmount = undefined;
    if (cfg) {
      Object.assign(this, cfg);
    }
  }
  draw(ctx) {
    const {inflateAmount, options: {borderColor, backgroundColor}} = this;
    const {inner, outer} = boundingRects$1(this);
    const addRectPath = hasRadius(outer.radius) ? addRoundedRectPath : addNormalRectPath;
    ctx.save();
    if (outer.w !== inner.w || outer.h !== inner.h) {
      ctx.beginPath();
      addRectPath(ctx, inflateRect(outer, inflateAmount, inner));
      ctx.clip();
      addRectPath(ctx, inflateRect(inner, -inflateAmount, outer));
      ctx.fillStyle = borderColor;
      ctx.fill('evenodd');
    }
    ctx.beginPath();
    addRectPath(ctx, inflateRect(inner, inflateAmount));
    ctx.fillStyle = backgroundColor;
    ctx.fill();
    ctx.restore();
  }
  inRange(mouseX, mouseY, useFinalPosition) {
    return inRange(this, mouseX, mouseY, useFinalPosition);
  }
  inXRange(mouseX, useFinalPosition) {
    return inRange(this, mouseX, null, useFinalPosition);
  }
  inYRange(mouseY, useFinalPosition) {
    return inRange(this, null, mouseY, useFinalPosition);
  }
  getCenterPoint(useFinalPosition) {
    const {x, y, base, horizontal} = this.getProps(['x', 'y', 'base', 'horizontal'], useFinalPosition);
    return {
      x: horizontal ? (x + base) / 2 : x,
      y: horizontal ? y : (y + base) / 2
    };
  }
  getRange(axis) {
    return axis === 'x' ? this.width / 2 : this.height / 2;
  }
}
BarElement.id = 'bar';
BarElement.defaults = {
  borderSkipped: 'start',
  borderWidth: 0,
  borderRadius: 0,
  inflateAmount: 'auto',
  pointStyle: undefined
};
BarElement.defaultRoutes = {
  backgroundColor: 'backgroundColor',
  borderColor: 'borderColor'
};

var elements = /*#__PURE__*/Object.freeze({
__proto__: null,
ArcElement: ArcElement,
LineElement: LineElement,
PointElement: PointElement,
BarElement: BarElement
});

function lttbDecimation(data, start, count, availableWidth, options) {
  const samples = options.samples || availableWidth;
  if (samples >= count) {
    return data.slice(start, start + count);
  }
  const decimated = [];
  const bucketWidth = (count - 2) / (samples - 2);
  let sampledIndex = 0;
  const endIndex = start + count - 1;
  let a = start;
  let i, maxAreaPoint, maxArea, area, nextA;
  decimated[sampledIndex++] = data[a];
  for (i = 0; i < samples - 2; i++) {
    let avgX = 0;
    let avgY = 0;
    let j;
    const avgRangeStart = Math.floor((i + 1) * bucketWidth) + 1 + start;
    const avgRangeEnd = Math.min(Math.floor((i + 2) * bucketWidth) + 1, count) + start;
    const avgRangeLength = avgRangeEnd - avgRangeStart;
    for (j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += data[j].x;
      avgY += data[j].y;
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;
    const rangeOffs = Math.floor(i * bucketWidth) + 1 + start;
    const rangeTo = Math.min(Math.floor((i + 1) * bucketWidth) + 1, count) + start;
    const {x: pointAx, y: pointAy} = data[a];
    maxArea = area = -1;
    for (j = rangeOffs; j < rangeTo; j++) {
      area = 0.5 * Math.abs(
        (pointAx - avgX) * (data[j].y - pointAy) -
        (pointAx - data[j].x) * (avgY - pointAy)
      );
      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[j];
        nextA = j;
      }
    }
    decimated[sampledIndex++] = maxAreaPoint;
    a = nextA;
  }
  decimated[sampledIndex++] = data[endIndex];
  return decimated;
}
function minMaxDecimation(data, start, count, availableWidth) {
  let avgX = 0;
  let countX = 0;
  let i, point, x, y, prevX, minIndex, maxIndex, startIndex, minY, maxY;
  const decimated = [];
  const endIndex = start + count - 1;
  const xMin = data[start].x;
  const xMax = data[endIndex].x;
  const dx = xMax - xMin;
  for (i = start; i < start + count; ++i) {
    point = data[i];
    x = (point.x - xMin) / dx * availableWidth;
    y = point.y;
    const truncX = x | 0;
    if (truncX === prevX) {
      if (y < minY) {
        minY = y;
        minIndex = i;
      } else if (y > maxY) {
        maxY = y;
        maxIndex = i;
      }
      avgX = (countX * avgX + point.x) / ++countX;
    } else {
      const lastIndex = i - 1;
      if (!isNullOrUndef(minIndex) && !isNullOrUndef(maxIndex)) {
        const intermediateIndex1 = Math.min(minIndex, maxIndex);
        const intermediateIndex2 = Math.max(minIndex, maxIndex);
        if (intermediateIndex1 !== startIndex && intermediateIndex1 !== lastIndex) {
          decimated.push({
            ...data[intermediateIndex1],
            x: avgX,
          });
        }
        if (intermediateIndex2 !== startIndex && intermediateIndex2 !== lastIndex) {
          decimated.push({
            ...data[intermediateIndex2],
            x: avgX
          });
        }
      }
      if (i > 0 && lastIndex !== startIndex) {
        decimated.push(data[lastIndex]);
      }
      decimated.push(point);
      prevX = truncX;
      countX = 0;
      minY = maxY = y;
      minIndex = maxIndex = startIndex = i;
    }
  }
  return decimated;
}
function cleanDecimatedDataset(dataset) {
  if (dataset._decimated) {
    const data = dataset._data;
    delete dataset._decimated;
    delete dataset._data;
    Object.defineProperty(dataset, 'data', {value: data});
  }
}
function cleanDecimatedData(chart) {
  chart.data.datasets.forEach((dataset) => {
    cleanDecimatedDataset(dataset);
  });
}
function getStartAndCountOfVisiblePointsSimplified(meta, points) {
  const pointCount = points.length;
  let start = 0;
  let count;
  const {iScale} = meta;
  const {min, max, minDefined, maxDefined} = iScale.getUserBounds();
  if (minDefined) {
    start = _limitValue(_lookupByKey(points, iScale.axis, min).lo, 0, pointCount - 1);
  }
  if (maxDefined) {
    count = _limitValue(_lookupByKey(points, iScale.axis, max).hi + 1, start, pointCount) - start;
  } else {
    count = pointCount - start;
  }
  return {start, count};
}
var plugin_decimation = {
  id: 'decimation',
  defaults: {
    algorithm: 'min-max',
    enabled: false,
  },
  beforeElementsUpdate: (chart, args, options) => {
    if (!options.enabled) {
      cleanDecimatedData(chart);
      return;
    }
    const availableWidth = chart.width;
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const {_data, indexAxis} = dataset;
      const meta = chart.getDatasetMeta(datasetIndex);
      const data = _data || dataset.data;
      if (resolve([indexAxis, chart.options.indexAxis]) === 'y') {
        return;
      }
      if (meta.type !== 'line') {
        return;
      }
      const xAxis = chart.scales[meta.xAxisID];
      if (xAxis.type !== 'linear' && xAxis.type !== 'time') {
        return;
      }
      if (chart.options.parsing) {
        return;
      }
      let {start, count} = getStartAndCountOfVisiblePointsSimplified(meta, data);
      const threshold = options.threshold || 4 * availableWidth;
      if (count <= threshold) {
        cleanDecimatedDataset(dataset);
        return;
      }
      if (isNullOrUndef(_data)) {
        dataset._data = data;
        delete dataset.data;
        Object.defineProperty(dataset, 'data', {
          configurable: true,
          enumerable: true,
          get: function() {
            return this._decimated;
          },
          set: function(d) {
            this._data = d;
          }
        });
      }
      let decimated;
      switch (options.algorithm) {
      case 'lttb':
        decimated = lttbDecimation(data, start, count, availableWidth, options);
        break;
      case 'min-max':
        decimated = minMaxDecimation(data, start, count, availableWidth);
        break;
      default:
        throw new Error(`Unsupported decimation algorithm '${options.algorithm}'`);
      }
      dataset._decimated = decimated;
    });
  },
  destroy(chart) {
    cleanDecimatedData(chart);
  }
};

function getLineByIndex(chart, index) {
  const meta = chart.getDatasetMeta(index);
  const visible = meta && chart.isDatasetVisible(index);
  return visible ? meta.dataset : null;
}
function parseFillOption(line) {
  const options = line.options;
  const fillOption = options.fill;
  let fill = valueOrDefault(fillOption && fillOption.target, fillOption);
  if (fill === undefined) {
    fill = !!options.backgroundColor;
  }
  if (fill === false || fill === null) {
    return false;
  }
  if (fill === true) {
    return 'origin';
  }
  return fill;
}
function decodeFill(line, index, count) {
  const fill = parseFillOption(line);
  if (isObject(fill)) {
    return isNaN(fill.value) ? false : fill;
  }
  let target = parseFloat(fill);
  if (isNumberFinite(target) && Math.floor(target) === target) {
    if (fill[0] === '-' || fill[0] === '+') {
      target = index + target;
    }
    if (target === index || target < 0 || target >= count) {
      return false;
    }
    return target;
  }
  return ['origin', 'start', 'end', 'stack', 'shape'].indexOf(fill) >= 0 && fill;
}
function computeLinearBoundary(source) {
  const {scale = {}, fill} = source;
  let target = null;
  let horizontal;
  if (fill === 'start') {
    target = scale.bottom;
  } else if (fill === 'end') {
    target = scale.top;
  } else if (isObject(fill)) {
    target = scale.getPixelForValue(fill.value);
  } else if (scale.getBasePixel) {
    target = scale.getBasePixel();
  }
  if (isNumberFinite(target)) {
    horizontal = scale.isHorizontal();
    return {
      x: horizontal ? target : null,
      y: horizontal ? null : target
    };
  }
  return null;
}
class simpleArc {
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.radius = opts.radius;
  }
  pathSegment(ctx, bounds, opts) {
    const {x, y, radius} = this;
    bounds = bounds || {start: 0, end: TAU};
    ctx.arc(x, y, radius, bounds.end, bounds.start, true);
    return !opts.bounds;
  }
  interpolate(point) {
    const {x, y, radius} = this;
    const angle = point.angle;
    return {
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
      angle
    };
  }
}
function computeCircularBoundary(source) {
  const {scale, fill} = source;
  const options = scale.options;
  const length = scale.getLabels().length;
  const target = [];
  const start = options.reverse ? scale.max : scale.min;
  const end = options.reverse ? scale.min : scale.max;
  let i, center, value;
  if (fill === 'start') {
    value = start;
  } else if (fill === 'end') {
    value = end;
  } else if (isObject(fill)) {
    value = fill.value;
  } else {
    value = scale.getBaseValue();
  }
  if (options.grid.circular) {
    center = scale.getPointPositionForValue(0, start);
    return new simpleArc({
      x: center.x,
      y: center.y,
      radius: scale.getDistanceFromCenterForValue(value)
    });
  }
  for (i = 0; i < length; ++i) {
    target.push(scale.getPointPositionForValue(i, value));
  }
  return target;
}
function computeBoundary(source) {
  const scale = source.scale || {};
  if (scale.getPointPositionForValue) {
    return computeCircularBoundary(source);
  }
  return computeLinearBoundary(source);
}
function findSegmentEnd(start, end, points) {
  for (;end > start; end--) {
    const point = points[end];
    if (!isNaN(point.x) && !isNaN(point.y)) {
      break;
    }
  }
  return end;
}
function pointsFromSegments(boundary, line) {
  const {x = null, y = null} = boundary || {};
  const linePoints = line.points;
  const points = [];
  line.segments.forEach(({start, end}) => {
    end = findSegmentEnd(start, end, linePoints);
    const first = linePoints[start];
    const last = linePoints[end];
    if (y !== null) {
      points.push({x: first.x, y});
      points.push({x: last.x, y});
    } else if (x !== null) {
      points.push({x, y: first.y});
      points.push({x, y: last.y});
    }
  });
  return points;
}
function buildStackLine(source) {
  const {scale, index, line} = source;
  const points = [];
  const segments = line.segments;
  const sourcePoints = line.points;
  const linesBelow = getLinesBelow(scale, index);
  linesBelow.push(createBoundaryLine({x: null, y: scale.bottom}, line));
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    for (let j = segment.start; j <= segment.end; j++) {
      addPointsBelow(points, sourcePoints[j], linesBelow);
    }
  }
  return new LineElement({points, options: {}});
}
function getLinesBelow(scale, index) {
  const below = [];
  const metas = scale.getMatchingVisibleMetas('line');
  for (let i = 0; i < metas.length; i++) {
    const meta = metas[i];
    if (meta.index === index) {
      break;
    }
    if (!meta.hidden) {
      below.unshift(meta.dataset);
    }
  }
  return below;
}
function addPointsBelow(points, sourcePoint, linesBelow) {
  const postponed = [];
  for (let j = 0; j < linesBelow.length; j++) {
    const line = linesBelow[j];
    const {first, last, point} = findPoint(line, sourcePoint, 'x');
    if (!point || (first && last)) {
      continue;
    }
    if (first) {
      postponed.unshift(point);
    } else {
      points.push(point);
      if (!last) {
        break;
      }
    }
  }
  points.push(...postponed);
}
function findPoint(line, sourcePoint, property) {
  const point = line.interpolate(sourcePoint, property);
  if (!point) {
    return {};
  }
  const pointValue = point[property];
  const segments = line.segments;
  const linePoints = line.points;
  let first = false;
  let last = false;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const firstValue = linePoints[segment.start][property];
    const lastValue = linePoints[segment.end][property];
    if (pointValue >= firstValue && pointValue <= lastValue) {
      first = pointValue === firstValue;
      last = pointValue === lastValue;
      break;
    }
  }
  return {first, last, point};
}
function getTarget(source) {
  const {chart, fill, line} = source;
  if (isNumberFinite(fill)) {
    return getLineByIndex(chart, fill);
  }
  if (fill === 'stack') {
    return buildStackLine(source);
  }
  if (fill === 'shape') {
    return true;
  }
  const boundary = computeBoundary(source);
  if (boundary instanceof simpleArc) {
    return boundary;
  }
  return createBoundaryLine(boundary, line);
}
function createBoundaryLine(boundary, line) {
  let points = [];
  let _loop = false;
  if (isArray(boundary)) {
    _loop = true;
    points = boundary;
  } else {
    points = pointsFromSegments(boundary, line);
  }
  return points.length ? new LineElement({
    points,
    options: {tension: 0},
    _loop,
    _fullLoop: _loop
  }) : null;
}
function resolveTarget(sources, index, propagate) {
  const source = sources[index];
  let fill = source.fill;
  const visited = [index];
  let target;
  if (!propagate) {
    return fill;
  }
  while (fill !== false && visited.indexOf(fill) === -1) {
    if (!isNumberFinite(fill)) {
      return fill;
    }
    target = sources[fill];
    if (!target) {
      return false;
    }
    if (target.visible) {
      return fill;
    }
    visited.push(fill);
    fill = target.fill;
  }
  return false;
}
function _clip(ctx, target, clipY) {
  ctx.beginPath();
  target.path(ctx);
  ctx.lineTo(target.last().x, clipY);
  ctx.lineTo(target.first().x, clipY);
  ctx.closePath();
  ctx.clip();
}
function getBounds(property, first, last, loop) {
  if (loop) {
    return;
  }
  let start = first[property];
  let end = last[property];
  if (property === 'angle') {
    start = _normalizeAngle(start);
    end = _normalizeAngle(end);
  }
  return {property, start, end};
}
function _getEdge(a, b, prop, fn) {
  if (a && b) {
    return fn(a[prop], b[prop]);
  }
  return a ? a[prop] : b ? b[prop] : 0;
}
function _segments(line, target, property) {
  const segments = line.segments;
  const points = line.points;
  const tpoints = target.points;
  const parts = [];
  for (const segment of segments) {
    let {start, end} = segment;
    end = findSegmentEnd(start, end, points);
    const bounds = getBounds(property, points[start], points[end], segment.loop);
    if (!target.segments) {
      parts.push({
        source: segment,
        target: bounds,
        start: points[start],
        end: points[end]
      });
      continue;
    }
    const targetSegments = _boundSegments(target, bounds);
    for (const tgt of targetSegments) {
      const subBounds = getBounds(property, tpoints[tgt.start], tpoints[tgt.end], tgt.loop);
      const fillSources = _boundSegment(segment, points, subBounds);
      for (const fillSource of fillSources) {
        parts.push({
          source: fillSource,
          target: tgt,
          start: {
            [property]: _getEdge(bounds, subBounds, 'start', Math.max)
          },
          end: {
            [property]: _getEdge(bounds, subBounds, 'end', Math.min)
          }
        });
      }
    }
  }
  return parts;
}
function clipBounds(ctx, scale, bounds) {
  const {top, bottom} = scale.chart.chartArea;
  const {property, start, end} = bounds || {};
  if (property === 'x') {
    ctx.beginPath();
    ctx.rect(start, top, end - start, bottom - top);
    ctx.clip();
  }
}
function interpolatedLineTo(ctx, target, point, property) {
  const interpolatedPoint = target.interpolate(point, property);
  if (interpolatedPoint) {
    ctx.lineTo(interpolatedPoint.x, interpolatedPoint.y);
  }
}
function _fill(ctx, cfg) {
  const {line, target, property, color, scale} = cfg;
  const segments = _segments(line, target, property);
  for (const {source: src, target: tgt, start, end} of segments) {
    const {style: {backgroundColor = color} = {}} = src;
    const notShape = target !== true;
    ctx.save();
    ctx.fillStyle = backgroundColor;
    clipBounds(ctx, scale, notShape && getBounds(property, start, end));
    ctx.beginPath();
    const lineLoop = !!line.pathSegment(ctx, src);
    let loop;
    if (notShape) {
      if (lineLoop) {
        ctx.closePath();
      } else {
        interpolatedLineTo(ctx, target, end, property);
      }
      const targetLoop = !!target.pathSegment(ctx, tgt, {move: lineLoop, reverse: true});
      loop = lineLoop && targetLoop;
      if (!loop) {
        interpolatedLineTo(ctx, target, start, property);
      }
    }
    ctx.closePath();
    ctx.fill(loop ? 'evenodd' : 'nonzero');
    ctx.restore();
  }
}
function doFill(ctx, cfg) {
  const {line, target, above, below, area, scale} = cfg;
  const property = line._loop ? 'angle' : cfg.axis;
  ctx.save();
  if (property === 'x' && below !== above) {
    _clip(ctx, target, area.top);
    _fill(ctx, {line, target, color: above, scale, property});
    ctx.restore();
    ctx.save();
    _clip(ctx, target, area.bottom);
  }
  _fill(ctx, {line, target, color: below, scale, property});
  ctx.restore();
}
function drawfill(ctx, source, area) {
  const target = getTarget(source);
  const {line, scale, axis} = source;
  const lineOpts = line.options;
  const fillOption = lineOpts.fill;
  const color = lineOpts.backgroundColor;
  const {above = color, below = color} = fillOption || {};
  if (target && line.points.length) {
    clipArea(ctx, area);
    doFill(ctx, {line, target, above, below, area, scale, axis});
    unclipArea(ctx);
  }
}
var plugin_filler = {
  id: 'filler',
  afterDatasetsUpdate(chart, _args, options) {
    const count = (chart.data.datasets || []).length;
    const sources = [];
    let meta, i, line, source;
    for (i = 0; i < count; ++i) {
      meta = chart.getDatasetMeta(i);
      line = meta.dataset;
      source = null;
      if (line && line.options && line instanceof LineElement) {
        source = {
          visible: chart.isDatasetVisible(i),
          index: i,
          fill: decodeFill(line, i, count),
          chart,
          axis: meta.controller.options.indexAxis,
          scale: meta.vScale,
          line,
        };
      }
      meta.$filler = source;
      sources.push(source);
    }
    for (i = 0; i < count; ++i) {
      source = sources[i];
      if (!source || source.fill === false) {
        continue;
      }
      source.fill = resolveTarget(sources, i, options.propagate);
    }
  },
  beforeDraw(chart, _args, options) {
    const draw = options.drawTime === 'beforeDraw';
    const metasets = chart.getSortedVisibleDatasetMetas();
    const area = chart.chartArea;
    for (let i = metasets.length - 1; i >= 0; --i) {
      const source = metasets[i].$filler;
      if (!source) {
        continue;
      }
      source.line.updateControlPoints(area, source.axis);
      if (draw) {
        drawfill(chart.ctx, source, area);
      }
    }
  },
  beforeDatasetsDraw(chart, _args, options) {
    if (options.drawTime !== 'beforeDatasetsDraw') {
      return;
    }
    const metasets = chart.getSortedVisibleDatasetMetas();
    for (let i = metasets.length - 1; i >= 0; --i) {
      const source = metasets[i].$filler;
      if (source) {
        drawfill(chart.ctx, source, chart.chartArea);
      }
    }
  },
  beforeDatasetDraw(chart, args, options) {
    const source = args.meta.$filler;
    if (!source || source.fill === false || options.drawTime !== 'beforeDatasetDraw') {
      return;
    }
    drawfill(chart.ctx, source, chart.chartArea);
  },
  defaults: {
    propagate: true,
    drawTime: 'beforeDatasetDraw'
  }
};

const getBoxSize = (labelOpts, fontSize) => {
  let {boxHeight = fontSize, boxWidth = fontSize} = labelOpts;
  if (labelOpts.usePointStyle) {
    boxHeight = Math.min(boxHeight, fontSize);
    boxWidth = Math.min(boxWidth, fontSize);
  }
  return {
    boxWidth,
    boxHeight,
    itemHeight: Math.max(fontSize, boxHeight)
  };
};
const itemsEqual = (a, b) => a !== null && b !== null && a.datasetIndex === b.datasetIndex && a.index === b.index;
class Legend extends Element {
  constructor(config) {
    super();
    this._added = false;
    this.legendHitBoxes = [];
    this._hoveredItem = null;
    this.doughnutMode = false;
    this.chart = config.chart;
    this.options = config.options;
    this.ctx = config.ctx;
    this.legendItems = undefined;
    this.columnSizes = undefined;
    this.lineWidths = undefined;
    this.maxHeight = undefined;
    this.maxWidth = undefined;
    this.top = undefined;
    this.bottom = undefined;
    this.left = undefined;
    this.right = undefined;
    this.height = undefined;
    this.width = undefined;
    this._margins = undefined;
    this.position = undefined;
    this.weight = undefined;
    this.fullSize = undefined;
  }
  update(maxWidth, maxHeight, margins) {
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    this._margins = margins;
    this.setDimensions();
    this.buildLabels();
    this.fit();
  }
  setDimensions() {
    if (this.isHorizontal()) {
      this.width = this.maxWidth;
      this.left = this._margins.left;
      this.right = this.width;
    } else {
      this.height = this.maxHeight;
      this.top = this._margins.top;
      this.bottom = this.height;
    }
  }
  buildLabels() {
    const labelOpts = this.options.labels || {};
    let legendItems = callback(labelOpts.generateLabels, [this.chart], this) || [];
    if (labelOpts.filter) {
      legendItems = legendItems.filter((item) => labelOpts.filter(item, this.chart.data));
    }
    if (labelOpts.sort) {
      legendItems = legendItems.sort((a, b) => labelOpts.sort(a, b, this.chart.data));
    }
    if (this.options.reverse) {
      legendItems.reverse();
    }
    this.legendItems = legendItems;
  }
  fit() {
    const {options, ctx} = this;
    if (!options.display) {
      this.width = this.height = 0;
      return;
    }
    const labelOpts = options.labels;
    const labelFont = toFont(labelOpts.font);
    const fontSize = labelFont.size;
    const titleHeight = this._computeTitleHeight();
    const {boxWidth, itemHeight} = getBoxSize(labelOpts, fontSize);
    let width, height;
    ctx.font = labelFont.string;
    if (this.isHorizontal()) {
      width = this.maxWidth;
      height = this._fitRows(titleHeight, fontSize, boxWidth, itemHeight) + 10;
    } else {
      height = this.maxHeight;
      width = this._fitCols(titleHeight, fontSize, boxWidth, itemHeight) + 10;
    }
    this.width = Math.min(width, options.maxWidth || this.maxWidth);
    this.height = Math.min(height, options.maxHeight || this.maxHeight);
  }
  _fitRows(titleHeight, fontSize, boxWidth, itemHeight) {
    const {ctx, maxWidth, options: {labels: {padding}}} = this;
    const hitboxes = this.legendHitBoxes = [];
    const lineWidths = this.lineWidths = [0];
    const lineHeight = itemHeight + padding;
    let totalHeight = titleHeight;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let row = -1;
    let top = -lineHeight;
    this.legendItems.forEach((legendItem, i) => {
      const itemWidth = boxWidth + (fontSize / 2) + ctx.measureText(legendItem.text).width;
      if (i === 0 || lineWidths[lineWidths.length - 1] + itemWidth + 2 * padding > maxWidth) {
        totalHeight += lineHeight;
        lineWidths[lineWidths.length - (i > 0 ? 0 : 1)] = 0;
        top += lineHeight;
        row++;
      }
      hitboxes[i] = {left: 0, top, row, width: itemWidth, height: itemHeight};
      lineWidths[lineWidths.length - 1] += itemWidth + padding;
    });
    return totalHeight;
  }
  _fitCols(titleHeight, fontSize, boxWidth, itemHeight) {
    const {ctx, maxHeight, options: {labels: {padding}}} = this;
    const hitboxes = this.legendHitBoxes = [];
    const columnSizes = this.columnSizes = [];
    const heightLimit = maxHeight - titleHeight;
    let totalWidth = padding;
    let currentColWidth = 0;
    let currentColHeight = 0;
    let left = 0;
    let col = 0;
    this.legendItems.forEach((legendItem, i) => {
      const itemWidth = boxWidth + (fontSize / 2) + ctx.measureText(legendItem.text).width;
      if (i > 0 && currentColHeight + itemHeight + 2 * padding > heightLimit) {
        totalWidth += currentColWidth + padding;
        columnSizes.push({width: currentColWidth, height: currentColHeight});
        left += currentColWidth + padding;
        col++;
        currentColWidth = currentColHeight = 0;
      }
      hitboxes[i] = {left, top: currentColHeight, col, width: itemWidth, height: itemHeight};
      currentColWidth = Math.max(currentColWidth, itemWidth);
      currentColHeight += itemHeight + padding;
    });
    totalWidth += currentColWidth;
    columnSizes.push({width: currentColWidth, height: currentColHeight});
    return totalWidth;
  }
  adjustHitBoxes() {
    if (!this.options.display) {
      return;
    }
    const titleHeight = this._computeTitleHeight();
    const {legendHitBoxes: hitboxes, options: {align, labels: {padding}, rtl}} = this;
    const rtlHelper = getRtlAdapter(rtl, this.left, this.width);
    if (this.isHorizontal()) {
      let row = 0;
      let left = _alignStartEnd(align, this.left + padding, this.right - this.lineWidths[row]);
      for (const hitbox of hitboxes) {
        if (row !== hitbox.row) {
          row = hitbox.row;
          left = _alignStartEnd(align, this.left + padding, this.right - this.lineWidths[row]);
        }
        hitbox.top += this.top + titleHeight + padding;
        hitbox.left = rtlHelper.leftForLtr(rtlHelper.x(left), hitbox.width);
        left += hitbox.width + padding;
      }
    } else {
      let col = 0;
      let top = _alignStartEnd(align, this.top + titleHeight + padding, this.bottom - this.columnSizes[col].height);
      for (const hitbox of hitboxes) {
        if (hitbox.col !== col) {
          col = hitbox.col;
          top = _alignStartEnd(align, this.top + titleHeight + padding, this.bottom - this.columnSizes[col].height);
        }
        hitbox.top = top;
        hitbox.left += this.left + padding;
        hitbox.left = rtlHelper.leftForLtr(rtlHelper.x(hitbox.left), hitbox.width);
        top += hitbox.height + padding;
      }
    }
  }
  isHorizontal() {
    return this.options.position === 'top' || this.options.position === 'bottom';
  }
  draw() {
    if (this.options.display) {
      const ctx = this.ctx;
      clipArea(ctx, this);
      this._draw();
      unclipArea(ctx);
    }
  }
  _draw() {
    const {options: opts, columnSizes, lineWidths, ctx} = this;
    const {align, labels: labelOpts} = opts;
    const defaultColor = defaults$1.color;
    const rtlHelper = getRtlAdapter(opts.rtl, this.left, this.width);
    const labelFont = toFont(labelOpts.font);
    const {color: fontColor, padding} = labelOpts;
    const fontSize = labelFont.size;
    const halfFontSize = fontSize / 2;
    let cursor;
    this.drawTitle();
    ctx.textAlign = rtlHelper.textAlign('left');
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 0.5;
    ctx.font = labelFont.string;
    const {boxWidth, boxHeight, itemHeight} = getBoxSize(labelOpts, fontSize);
    const drawLegendBox = function(x, y, legendItem) {
      if (isNaN(boxWidth) || boxWidth <= 0 || isNaN(boxHeight) || boxHeight < 0) {
        return;
      }
      ctx.save();
      const lineWidth = valueOrDefault(legendItem.lineWidth, 1);
      ctx.fillStyle = valueOrDefault(legendItem.fillStyle, defaultColor);
      ctx.lineCap = valueOrDefault(legendItem.lineCap, 'butt');
      ctx.lineDashOffset = valueOrDefault(legendItem.lineDashOffset, 0);
      ctx.lineJoin = valueOrDefault(legendItem.lineJoin, 'miter');
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = valueOrDefault(legendItem.strokeStyle, defaultColor);
      ctx.setLineDash(valueOrDefault(legendItem.lineDash, []));
      if (labelOpts.usePointStyle) {
        const drawOptions = {
          radius: boxWidth * Math.SQRT2 / 2,
          pointStyle: legendItem.pointStyle,
          rotation: legendItem.rotation,
          borderWidth: lineWidth
        };
        const centerX = rtlHelper.xPlus(x, boxWidth / 2);
        const centerY = y + halfFontSize;
        drawPoint(ctx, drawOptions, centerX, centerY);
      } else {
        const yBoxTop = y + Math.max((fontSize - boxHeight) / 2, 0);
        const xBoxLeft = rtlHelper.leftForLtr(x, boxWidth);
        const borderRadius = toTRBLCorners(legendItem.borderRadius);
        ctx.beginPath();
        if (Object.values(borderRadius).some(v => v !== 0)) {
          addRoundedRectPath(ctx, {
            x: xBoxLeft,
            y: yBoxTop,
            w: boxWidth,
            h: boxHeight,
            radius: borderRadius,
          });
        } else {
          ctx.rect(xBoxLeft, yBoxTop, boxWidth, boxHeight);
        }
        ctx.fill();
        if (lineWidth !== 0) {
          ctx.stroke();
        }
      }
      ctx.restore();
    };
    const fillText = function(x, y, legendItem) {
      renderText(ctx, legendItem.text, x, y + (itemHeight / 2), labelFont, {
        strikethrough: legendItem.hidden,
        textAlign: rtlHelper.textAlign(legendItem.textAlign)
      });
    };
    const isHorizontal = this.isHorizontal();
    const titleHeight = this._computeTitleHeight();
    if (isHorizontal) {
      cursor = {
        x: _alignStartEnd(align, this.left + padding, this.right - lineWidths[0]),
        y: this.top + padding + titleHeight,
        line: 0
      };
    } else {
      cursor = {
        x: this.left + padding,
        y: _alignStartEnd(align, this.top + titleHeight + padding, this.bottom - columnSizes[0].height),
        line: 0
      };
    }
    overrideTextDirection(this.ctx, opts.textDirection);
    const lineHeight = itemHeight + padding;
    this.legendItems.forEach((legendItem, i) => {
      ctx.strokeStyle = legendItem.fontColor || fontColor;
      ctx.fillStyle = legendItem.fontColor || fontColor;
      const textWidth = ctx.measureText(legendItem.text).width;
      const textAlign = rtlHelper.textAlign(legendItem.textAlign || (legendItem.textAlign = labelOpts.textAlign));
      const width = boxWidth + halfFontSize + textWidth;
      let x = cursor.x;
      let y = cursor.y;
      rtlHelper.setWidth(this.width);
      if (isHorizontal) {
        if (i > 0 && x + width + padding > this.right) {
          y = cursor.y += lineHeight;
          cursor.line++;
          x = cursor.x = _alignStartEnd(align, this.left + padding, this.right - lineWidths[cursor.line]);
        }
      } else if (i > 0 && y + lineHeight > this.bottom) {
        x = cursor.x = x + columnSizes[cursor.line].width + padding;
        cursor.line++;
        y = cursor.y = _alignStartEnd(align, this.top + titleHeight + padding, this.bottom - columnSizes[cursor.line].height);
      }
      const realX = rtlHelper.x(x);
      drawLegendBox(realX, y, legendItem);
      x = _textX(textAlign, x + boxWidth + halfFontSize, isHorizontal ? x + width : this.right, opts.rtl);
      fillText(rtlHelper.x(x), y, legendItem);
      if (isHorizontal) {
        cursor.x += width + padding;
      } else {
        cursor.y += lineHeight;
      }
    });
    restoreTextDirection(this.ctx, opts.textDirection);
  }
  drawTitle() {
    const opts = this.options;
    const titleOpts = opts.title;
    const titleFont = toFont(titleOpts.font);
    const titlePadding = toPadding(titleOpts.padding);
    if (!titleOpts.display) {
      return;
    }
    const rtlHelper = getRtlAdapter(opts.rtl, this.left, this.width);
    const ctx = this.ctx;
    const position = titleOpts.position;
    const halfFontSize = titleFont.size / 2;
    const topPaddingPlusHalfFontSize = titlePadding.top + halfFontSize;
    let y;
    let left = this.left;
    let maxWidth = this.width;
    if (this.isHorizontal()) {
      maxWidth = Math.max(...this.lineWidths);
      y = this.top + topPaddingPlusHalfFontSize;
      left = _alignStartEnd(opts.align, left, this.right - maxWidth);
    } else {
      const maxHeight = this.columnSizes.reduce((acc, size) => Math.max(acc, size.height), 0);
      y = topPaddingPlusHalfFontSize + _alignStartEnd(opts.align, this.top, this.bottom - maxHeight - opts.labels.padding - this._computeTitleHeight());
    }
    const x = _alignStartEnd(position, left, left + maxWidth);
    ctx.textAlign = rtlHelper.textAlign(_toLeftRightCenter(position));
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = titleOpts.color;
    ctx.fillStyle = titleOpts.color;
    ctx.font = titleFont.string;
    renderText(ctx, titleOpts.text, x, y, titleFont);
  }
  _computeTitleHeight() {
    const titleOpts = this.options.title;
    const titleFont = toFont(titleOpts.font);
    const titlePadding = toPadding(titleOpts.padding);
    return titleOpts.display ? titleFont.lineHeight + titlePadding.height : 0;
  }
  _getLegendItemAt(x, y) {
    let i, hitBox, lh;
    if (x >= this.left && x <= this.right && y >= this.top && y <= this.bottom) {
      lh = this.legendHitBoxes;
      for (i = 0; i < lh.length; ++i) {
        hitBox = lh[i];
        if (x >= hitBox.left && x <= hitBox.left + hitBox.width && y >= hitBox.top && y <= hitBox.top + hitBox.height) {
          return this.legendItems[i];
        }
      }
    }
    return null;
  }
  handleEvent(e) {
    const opts = this.options;
    if (!isListened(e.type, opts)) {
      return;
    }
    const hoveredItem = this._getLegendItemAt(e.x, e.y);
    if (e.type === 'mousemove') {
      const previous = this._hoveredItem;
      const sameItem = itemsEqual(previous, hoveredItem);
      if (previous && !sameItem) {
        callback(opts.onLeave, [e, previous, this], this);
      }
      this._hoveredItem = hoveredItem;
      if (hoveredItem && !sameItem) {
        callback(opts.onHover, [e, hoveredItem, this], this);
      }
    } else if (hoveredItem) {
      callback(opts.onClick, [e, hoveredItem, this], this);
    }
  }
}
function isListened(type, opts) {
  if (type === 'mousemove' && (opts.onHover || opts.onLeave)) {
    return true;
  }
  if (opts.onClick && (type === 'click' || type === 'mouseup')) {
    return true;
  }
  return false;
}
var plugin_legend = {
  id: 'legend',
  _element: Legend,
  start(chart, _args, options) {
    const legend = chart.legend = new Legend({ctx: chart.ctx, options, chart});
    layouts.configure(chart, legend, options);
    layouts.addBox(chart, legend);
  },
  stop(chart) {
    layouts.removeBox(chart, chart.legend);
    delete chart.legend;
  },
  beforeUpdate(chart, _args, options) {
    const legend = chart.legend;
    layouts.configure(chart, legend, options);
    legend.options = options;
  },
  afterUpdate(chart) {
    const legend = chart.legend;
    legend.buildLabels();
    legend.adjustHitBoxes();
  },
  afterEvent(chart, args) {
    if (!args.replay) {
      chart.legend.handleEvent(args.event);
    }
  },
  defaults: {
    display: true,
    position: 'top',
    align: 'center',
    fullSize: true,
    reverse: false,
    weight: 1000,
    onClick(e, legendItem, legend) {
      const index = legendItem.datasetIndex;
      const ci = legend.chart;
      if (ci.isDatasetVisible(index)) {
        ci.hide(index);
        legendItem.hidden = true;
      } else {
        ci.show(index);
        legendItem.hidden = false;
      }
    },
    onHover: null,
    onLeave: null,
    labels: {
      color: (ctx) => ctx.chart.options.color,
      boxWidth: 40,
      padding: 10,
      generateLabels(chart) {
        const datasets = chart.data.datasets;
        const {labels: {usePointStyle, pointStyle, textAlign, color}} = chart.legend.options;
        return chart._getSortedDatasetMetas().map((meta) => {
          const style = meta.controller.getStyle(usePointStyle ? 0 : undefined);
          const borderWidth = toPadding(style.borderWidth);
          return {
            text: datasets[meta.index].label,
            fillStyle: style.backgroundColor,
            fontColor: color,
            hidden: !meta.visible,
            lineCap: style.borderCapStyle,
            lineDash: style.borderDash,
            lineDashOffset: style.borderDashOffset,
            lineJoin: style.borderJoinStyle,
            lineWidth: (borderWidth.width + borderWidth.height) / 4,
            strokeStyle: style.borderColor,
            pointStyle: pointStyle || style.pointStyle,
            rotation: style.rotation,
            textAlign: textAlign || style.textAlign,
            borderRadius: 0,
            datasetIndex: meta.index
          };
        }, this);
      }
    },
    title: {
      color: (ctx) => ctx.chart.options.color,
      display: false,
      position: 'center',
      text: '',
    }
  },
  descriptors: {
    _scriptable: (name) => !name.startsWith('on'),
    labels: {
      _scriptable: (name) => !['generateLabels', 'filter', 'sort'].includes(name),
    }
  },
};

class Title extends Element {
  constructor(config) {
    super();
    this.chart = config.chart;
    this.options = config.options;
    this.ctx = config.ctx;
    this._padding = undefined;
    this.top = undefined;
    this.bottom = undefined;
    this.left = undefined;
    this.right = undefined;
    this.width = undefined;
    this.height = undefined;
    this.position = undefined;
    this.weight = undefined;
    this.fullSize = undefined;
  }
  update(maxWidth, maxHeight) {
    const opts = this.options;
    this.left = 0;
    this.top = 0;
    if (!opts.display) {
      this.width = this.height = this.right = this.bottom = 0;
      return;
    }
    this.width = this.right = maxWidth;
    this.height = this.bottom = maxHeight;
    const lineCount = isArray(opts.text) ? opts.text.length : 1;
    this._padding = toPadding(opts.padding);
    const textSize = lineCount * toFont(opts.font).lineHeight + this._padding.height;
    if (this.isHorizontal()) {
      this.height = textSize;
    } else {
      this.width = textSize;
    }
  }
  isHorizontal() {
    const pos = this.options.position;
    return pos === 'top' || pos === 'bottom';
  }
  _drawArgs(offset) {
    const {top, left, bottom, right, options} = this;
    const align = options.align;
    let rotation = 0;
    let maxWidth, titleX, titleY;
    if (this.isHorizontal()) {
      titleX = _alignStartEnd(align, left, right);
      titleY = top + offset;
      maxWidth = right - left;
    } else {
      if (options.position === 'left') {
        titleX = left + offset;
        titleY = _alignStartEnd(align, bottom, top);
        rotation = PI * -0.5;
      } else {
        titleX = right - offset;
        titleY = _alignStartEnd(align, top, bottom);
        rotation = PI * 0.5;
      }
      maxWidth = bottom - top;
    }
    return {titleX, titleY, maxWidth, rotation};
  }
  draw() {
    const ctx = this.ctx;
    const opts = this.options;
    if (!opts.display) {
      return;
    }
    const fontOpts = toFont(opts.font);
    const lineHeight = fontOpts.lineHeight;
    const offset = lineHeight / 2 + this._padding.top;
    const {titleX, titleY, maxWidth, rotation} = this._drawArgs(offset);
    renderText(ctx, opts.text, 0, 0, fontOpts, {
      color: opts.color,
      maxWidth,
      rotation,
      textAlign: _toLeftRightCenter(opts.align),
      textBaseline: 'middle',
      translation: [titleX, titleY],
    });
  }
}
function createTitle(chart, titleOpts) {
  const title = new Title({
    ctx: chart.ctx,
    options: titleOpts,
    chart
  });
  layouts.configure(chart, title, titleOpts);
  layouts.addBox(chart, title);
  chart.titleBlock = title;
}
var plugin_title = {
  id: 'title',
  _element: Title,
  start(chart, _args, options) {
    createTitle(chart, options);
  },
  stop(chart) {
    const titleBlock = chart.titleBlock;
    layouts.removeBox(chart, titleBlock);
    delete chart.titleBlock;
  },
  beforeUpdate(chart, _args, options) {
    const title = chart.titleBlock;
    layouts.configure(chart, title, options);
    title.options = options;
  },
  defaults: {
    align: 'center',
    display: false,
    font: {
      weight: 'bold',
    },
    fullSize: true,
    padding: 10,
    position: 'top',
    text: '',
    weight: 2000
  },
  defaultRoutes: {
    color: 'color'
  },
  descriptors: {
    _scriptable: true,
    _indexable: false,
  },
};

const map = new WeakMap();
var plugin_subtitle = {
  id: 'subtitle',
  start(chart, _args, options) {
    const title = new Title({
      ctx: chart.ctx,
      options,
      chart
    });
    layouts.configure(chart, title, options);
    layouts.addBox(chart, title);
    map.set(chart, title);
  },
  stop(chart) {
    layouts.removeBox(chart, map.get(chart));
    map.delete(chart);
  },
  beforeUpdate(chart, _args, options) {
    const title = map.get(chart);
    layouts.configure(chart, title, options);
    title.options = options;
  },
  defaults: {
    align: 'center',
    display: false,
    font: {
      weight: 'normal',
    },
    fullSize: true,
    padding: 0,
    position: 'top',
    text: '',
    weight: 1500
  },
  defaultRoutes: {
    color: 'color'
  },
  descriptors: {
    _scriptable: true,
    _indexable: false,
  },
};

const positioners$1 = {
  average(items) {
    if (!items.length) {
      return false;
    }
    let i, len;
    let x = 0;
    let y = 0;
    let count = 0;
    for (i = 0, len = items.length; i < len; ++i) {
      const el = items[i].element;
      if (el && el.hasValue()) {
        const pos = el.tooltipPosition();
        x += pos.x;
        y += pos.y;
        ++count;
      }
    }
    return {
      x: x / count,
      y: y / count
    };
  },
  nearest(items, eventPosition) {
    if (!items.length) {
      return false;
    }
    let x = eventPosition.x;
    let y = eventPosition.y;
    let minDistance = Number.POSITIVE_INFINITY;
    let i, len, nearestElement;
    for (i = 0, len = items.length; i < len; ++i) {
      const el = items[i].element;
      if (el && el.hasValue()) {
        const center = el.getCenterPoint();
        const d = distanceBetweenPoints(eventPosition, center);
        if (d < minDistance) {
          minDistance = d;
          nearestElement = el;
        }
      }
    }
    if (nearestElement) {
      const tp = nearestElement.tooltipPosition();
      x = tp.x;
      y = tp.y;
    }
    return {
      x,
      y
    };
  }
};
function pushOrConcat(base, toPush) {
  if (toPush) {
    if (isArray(toPush)) {
      Array.prototype.push.apply(base, toPush);
    } else {
      base.push(toPush);
    }
  }
  return base;
}
function splitNewlines(str) {
  if ((typeof str === 'string' || str instanceof String) && str.indexOf('\n') > -1) {
    return str.split('\n');
  }
  return str;
}
function createTooltipItem(chart, item) {
  const {element, datasetIndex, index} = item;
  const controller = chart.getDatasetMeta(datasetIndex).controller;
  const {label, value} = controller.getLabelAndValue(index);
  return {
    chart,
    label,
    parsed: controller.getParsed(index),
    raw: chart.data.datasets[datasetIndex].data[index],
    formattedValue: value,
    dataset: controller.getDataset(),
    dataIndex: index,
    datasetIndex,
    element
  };
}
function getTooltipSize(tooltip, options) {
  const ctx = tooltip._chart.ctx;
  const {body, footer, title} = tooltip;
  const {boxWidth, boxHeight} = options;
  const bodyFont = toFont(options.bodyFont);
  const titleFont = toFont(options.titleFont);
  const footerFont = toFont(options.footerFont);
  const titleLineCount = title.length;
  const footerLineCount = footer.length;
  const bodyLineItemCount = body.length;
  const padding = toPadding(options.padding);
  let height = padding.height;
  let width = 0;
  let combinedBodyLength = body.reduce((count, bodyItem) => count + bodyItem.before.length + bodyItem.lines.length + bodyItem.after.length, 0);
  combinedBodyLength += tooltip.beforeBody.length + tooltip.afterBody.length;
  if (titleLineCount) {
    height += titleLineCount * titleFont.lineHeight
			+ (titleLineCount - 1) * options.titleSpacing
			+ options.titleMarginBottom;
  }
  if (combinedBodyLength) {
    const bodyLineHeight = options.displayColors ? Math.max(boxHeight, bodyFont.lineHeight) : bodyFont.lineHeight;
    height += bodyLineItemCount * bodyLineHeight
			+ (combinedBodyLength - bodyLineItemCount) * bodyFont.lineHeight
			+ (combinedBodyLength - 1) * options.bodySpacing;
  }
  if (footerLineCount) {
    height += options.footerMarginTop
			+ footerLineCount * footerFont.lineHeight
			+ (footerLineCount - 1) * options.footerSpacing;
  }
  let widthPadding = 0;
  const maxLineWidth = function(line) {
    width = Math.max(width, ctx.measureText(line).width + widthPadding);
  };
  ctx.save();
  ctx.font = titleFont.string;
  each(tooltip.title, maxLineWidth);
  ctx.font = bodyFont.string;
  each(tooltip.beforeBody.concat(tooltip.afterBody), maxLineWidth);
  widthPadding = options.displayColors ? (boxWidth + 2 + options.boxPadding) : 0;
  each(body, (bodyItem) => {
    each(bodyItem.before, maxLineWidth);
    each(bodyItem.lines, maxLineWidth);
    each(bodyItem.after, maxLineWidth);
  });
  widthPadding = 0;
  ctx.font = footerFont.string;
  each(tooltip.footer, maxLineWidth);
  ctx.restore();
  width += padding.width;
  return {width, height};
}
function determineYAlign(chart, size) {
  const {y, height} = size;
  if (y < height / 2) {
    return 'top';
  } else if (y > (chart.height - height / 2)) {
    return 'bottom';
  }
  return 'center';
}
function doesNotFitWithAlign(xAlign, chart, options, size) {
  const {x, width} = size;
  const caret = options.caretSize + options.caretPadding;
  if (xAlign === 'left' && x + width + caret > chart.width) {
    return true;
  }
  if (xAlign === 'right' && x - width - caret < 0) {
    return true;
  }
}
function determineXAlign(chart, options, size, yAlign) {
  const {x, width} = size;
  const {width: chartWidth, chartArea: {left, right}} = chart;
  let xAlign = 'center';
  if (yAlign === 'center') {
    xAlign = x <= (left + right) / 2 ? 'left' : 'right';
  } else if (x <= width / 2) {
    xAlign = 'left';
  } else if (x >= chartWidth - width / 2) {
    xAlign = 'right';
  }
  if (doesNotFitWithAlign(xAlign, chart, options, size)) {
    xAlign = 'center';
  }
  return xAlign;
}
function determineAlignment(chart, options, size) {
  const yAlign = options.yAlign || determineYAlign(chart, size);
  return {
    xAlign: options.xAlign || determineXAlign(chart, options, size, yAlign),
    yAlign
  };
}
function alignX(size, xAlign) {
  let {x, width} = size;
  if (xAlign === 'right') {
    x -= width;
  } else if (xAlign === 'center') {
    x -= (width / 2);
  }
  return x;
}
function alignY(size, yAlign, paddingAndSize) {
  let {y, height} = size;
  if (yAlign === 'top') {
    y += paddingAndSize;
  } else if (yAlign === 'bottom') {
    y -= height + paddingAndSize;
  } else {
    y -= (height / 2);
  }
  return y;
}
function getBackgroundPoint(options, size, alignment, chart) {
  const {caretSize, caretPadding, cornerRadius} = options;
  const {xAlign, yAlign} = alignment;
  const paddingAndSize = caretSize + caretPadding;
  const {topLeft, topRight, bottomLeft, bottomRight} = toTRBLCorners(cornerRadius);
  let x = alignX(size, xAlign);
  const y = alignY(size, yAlign, paddingAndSize);
  if (yAlign === 'center') {
    if (xAlign === 'left') {
      x += paddingAndSize;
    } else if (xAlign === 'right') {
      x -= paddingAndSize;
    }
  } else if (xAlign === 'left') {
    x -= Math.max(topLeft, bottomLeft) + caretPadding;
  } else if (xAlign === 'right') {
    x += Math.max(topRight, bottomRight) + caretPadding;
  }
  return {
    x: _limitValue(x, 0, chart.width - size.width),
    y: _limitValue(y, 0, chart.height - size.height)
  };
}
function getAlignedX(tooltip, align, options) {
  const padding = toPadding(options.padding);
  return align === 'center'
    ? tooltip.x + tooltip.width / 2
    : align === 'right'
      ? tooltip.x + tooltip.width - padding.right
      : tooltip.x + padding.left;
}
function getBeforeAfterBodyLines(callback) {
  return pushOrConcat([], splitNewlines(callback));
}
function createTooltipContext(parent, tooltip, tooltipItems) {
  return createContext(parent, {
    tooltip,
    tooltipItems,
    type: 'tooltip'
  });
}
function overrideCallbacks(callbacks, context) {
  const override = context && context.dataset && context.dataset.tooltip && context.dataset.tooltip.callbacks;
  return override ? callbacks.override(override) : callbacks;
}
class Tooltip extends Element {
  constructor(config) {
    super();
    this.opacity = 0;
    this._active = [];
    this._chart = config._chart;
    this._eventPosition = undefined;
    this._size = undefined;
    this._cachedAnimations = undefined;
    this._tooltipItems = [];
    this.$animations = undefined;
    this.$context = undefined;
    this.options = config.options;
    this.dataPoints = undefined;
    this.title = undefined;
    this.beforeBody = undefined;
    this.body = undefined;
    this.afterBody = undefined;
    this.footer = undefined;
    this.xAlign = undefined;
    this.yAlign = undefined;
    this.x = undefined;
    this.y = undefined;
    this.height = undefined;
    this.width = undefined;
    this.caretX = undefined;
    this.caretY = undefined;
    this.labelColors = undefined;
    this.labelPointStyles = undefined;
    this.labelTextColors = undefined;
  }
  initialize(options) {
    this.options = options;
    this._cachedAnimations = undefined;
    this.$context = undefined;
  }
  _resolveAnimations() {
    const cached = this._cachedAnimations;
    if (cached) {
      return cached;
    }
    const chart = this._chart;
    const options = this.options.setContext(this.getContext());
    const opts = options.enabled && chart.options.animation && options.animations;
    const animations = new Animations(this._chart, opts);
    if (opts._cacheable) {
      this._cachedAnimations = Object.freeze(animations);
    }
    return animations;
  }
  getContext() {
    return this.$context ||
			(this.$context = createTooltipContext(this._chart.getContext(), this, this._tooltipItems));
  }
  getTitle(context, options) {
    const {callbacks} = options;
    const beforeTitle = callbacks.beforeTitle.apply(this, [context]);
    const title = callbacks.title.apply(this, [context]);
    const afterTitle = callbacks.afterTitle.apply(this, [context]);
    let lines = [];
    lines = pushOrConcat(lines, splitNewlines(beforeTitle));
    lines = pushOrConcat(lines, splitNewlines(title));
    lines = pushOrConcat(lines, splitNewlines(afterTitle));
    return lines;
  }
  getBeforeBody(tooltipItems, options) {
    return getBeforeAfterBodyLines(options.callbacks.beforeBody.apply(this, [tooltipItems]));
  }
  getBody(tooltipItems, options) {
    const {callbacks} = options;
    const bodyItems = [];
    each(tooltipItems, (context) => {
      const bodyItem = {
        before: [],
        lines: [],
        after: []
      };
      const scoped = overrideCallbacks(callbacks, context);
      pushOrConcat(bodyItem.before, splitNewlines(scoped.beforeLabel.call(this, context)));
      pushOrConcat(bodyItem.lines, scoped.label.call(this, context));
      pushOrConcat(bodyItem.after, splitNewlines(scoped.afterLabel.call(this, context)));
      bodyItems.push(bodyItem);
    });
    return bodyItems;
  }
  getAfterBody(tooltipItems, options) {
    return getBeforeAfterBodyLines(options.callbacks.afterBody.apply(this, [tooltipItems]));
  }
  getFooter(tooltipItems, options) {
    const {callbacks} = options;
    const beforeFooter = callbacks.beforeFooter.apply(this, [tooltipItems]);
    const footer = callbacks.footer.apply(this, [tooltipItems]);
    const afterFooter = callbacks.afterFooter.apply(this, [tooltipItems]);
    let lines = [];
    lines = pushOrConcat(lines, splitNewlines(beforeFooter));
    lines = pushOrConcat(lines, splitNewlines(footer));
    lines = pushOrConcat(lines, splitNewlines(afterFooter));
    return lines;
  }
  _createItems(options) {
    const active = this._active;
    const data = this._chart.data;
    const labelColors = [];
    const labelPointStyles = [];
    const labelTextColors = [];
    let tooltipItems = [];
    let i, len;
    for (i = 0, len = active.length; i < len; ++i) {
      tooltipItems.push(createTooltipItem(this._chart, active[i]));
    }
    if (options.filter) {
      tooltipItems = tooltipItems.filter((element, index, array) => options.filter(element, index, array, data));
    }
    if (options.itemSort) {
      tooltipItems = tooltipItems.sort((a, b) => options.itemSort(a, b, data));
    }
    each(tooltipItems, (context) => {
      const scoped = overrideCallbacks(options.callbacks, context);
      labelColors.push(scoped.labelColor.call(this, context));
      labelPointStyles.push(scoped.labelPointStyle.call(this, context));
      labelTextColors.push(scoped.labelTextColor.call(this, context));
    });
    this.labelColors = labelColors;
    this.labelPointStyles = labelPointStyles;
    this.labelTextColors = labelTextColors;
    this.dataPoints = tooltipItems;
    return tooltipItems;
  }
  update(changed, replay) {
    const options = this.options.setContext(this.getContext());
    const active = this._active;
    let properties;
    let tooltipItems = [];
    if (!active.length) {
      if (this.opacity !== 0) {
        properties = {
          opacity: 0
        };
      }
    } else {
      const position = positioners$1[options.position].call(this, active, this._eventPosition);
      tooltipItems = this._createItems(options);
      this.title = this.getTitle(tooltipItems, options);
      this.beforeBody = this.getBeforeBody(tooltipItems, options);
      this.body = this.getBody(tooltipItems, options);
      this.afterBody = this.getAfterBody(tooltipItems, options);
      this.footer = this.getFooter(tooltipItems, options);
      const size = this._size = getTooltipSize(this, options);
      const positionAndSize = Object.assign({}, position, size);
      const alignment = determineAlignment(this._chart, options, positionAndSize);
      const backgroundPoint = getBackgroundPoint(options, positionAndSize, alignment, this._chart);
      this.xAlign = alignment.xAlign;
      this.yAlign = alignment.yAlign;
      properties = {
        opacity: 1,
        x: backgroundPoint.x,
        y: backgroundPoint.y,
        width: size.width,
        height: size.height,
        caretX: position.x,
        caretY: position.y
      };
    }
    this._tooltipItems = tooltipItems;
    this.$context = undefined;
    if (properties) {
      this._resolveAnimations().update(this, properties);
    }
    if (changed && options.external) {
      options.external.call(this, {chart: this._chart, tooltip: this, replay});
    }
  }
  drawCaret(tooltipPoint, ctx, size, options) {
    const caretPosition = this.getCaretPosition(tooltipPoint, size, options);
    ctx.lineTo(caretPosition.x1, caretPosition.y1);
    ctx.lineTo(caretPosition.x2, caretPosition.y2);
    ctx.lineTo(caretPosition.x3, caretPosition.y3);
  }
  getCaretPosition(tooltipPoint, size, options) {
    const {xAlign, yAlign} = this;
    const {caretSize, cornerRadius} = options;
    const {topLeft, topRight, bottomLeft, bottomRight} = toTRBLCorners(cornerRadius);
    const {x: ptX, y: ptY} = tooltipPoint;
    const {width, height} = size;
    let x1, x2, x3, y1, y2, y3;
    if (yAlign === 'center') {
      y2 = ptY + (height / 2);
      if (xAlign === 'left') {
        x1 = ptX;
        x2 = x1 - caretSize;
        y1 = y2 + caretSize;
        y3 = y2 - caretSize;
      } else {
        x1 = ptX + width;
        x2 = x1 + caretSize;
        y1 = y2 - caretSize;
        y3 = y2 + caretSize;
      }
      x3 = x1;
    } else {
      if (xAlign === 'left') {
        x2 = ptX + Math.max(topLeft, bottomLeft) + (caretSize);
      } else if (xAlign === 'right') {
        x2 = ptX + width - Math.max(topRight, bottomRight) - caretSize;
      } else {
        x2 = this.caretX;
      }
      if (yAlign === 'top') {
        y1 = ptY;
        y2 = y1 - caretSize;
        x1 = x2 - caretSize;
        x3 = x2 + caretSize;
      } else {
        y1 = ptY + height;
        y2 = y1 + caretSize;
        x1 = x2 + caretSize;
        x3 = x2 - caretSize;
      }
      y3 = y1;
    }
    return {x1, x2, x3, y1, y2, y3};
  }
  drawTitle(pt, ctx, options) {
    const title = this.title;
    const length = title.length;
    let titleFont, titleSpacing, i;
    if (length) {
      const rtlHelper = getRtlAdapter(options.rtl, this.x, this.width);
      pt.x = getAlignedX(this, options.titleAlign, options);
      ctx.textAlign = rtlHelper.textAlign(options.titleAlign);
      ctx.textBaseline = 'middle';
      titleFont = toFont(options.titleFont);
      titleSpacing = options.titleSpacing;
      ctx.fillStyle = options.titleColor;
      ctx.font = titleFont.string;
      for (i = 0; i < length; ++i) {
        ctx.fillText(title[i], rtlHelper.x(pt.x), pt.y + titleFont.lineHeight / 2);
        pt.y += titleFont.lineHeight + titleSpacing;
        if (i + 1 === length) {
          pt.y += options.titleMarginBottom - titleSpacing;
        }
      }
    }
  }
  _drawColorBox(ctx, pt, i, rtlHelper, options) {
    const labelColors = this.labelColors[i];
    const labelPointStyle = this.labelPointStyles[i];
    const {boxHeight, boxWidth, boxPadding} = options;
    const bodyFont = toFont(options.bodyFont);
    const colorX = getAlignedX(this, 'left', options);
    const rtlColorX = rtlHelper.x(colorX);
    const yOffSet = boxHeight < bodyFont.lineHeight ? (bodyFont.lineHeight - boxHeight) / 2 : 0;
    const colorY = pt.y + yOffSet;
    if (options.usePointStyle) {
      const drawOptions = {
        radius: Math.min(boxWidth, boxHeight) / 2,
        pointStyle: labelPointStyle.pointStyle,
        rotation: labelPointStyle.rotation,
        borderWidth: 1
      };
      const centerX = rtlHelper.leftForLtr(rtlColorX, boxWidth) + boxWidth / 2;
      const centerY = colorY + boxHeight / 2;
      ctx.strokeStyle = options.multiKeyBackground;
      ctx.fillStyle = options.multiKeyBackground;
      drawPoint(ctx, drawOptions, centerX, centerY);
      ctx.strokeStyle = labelColors.borderColor;
      ctx.fillStyle = labelColors.backgroundColor;
      drawPoint(ctx, drawOptions, centerX, centerY);
    } else {
      ctx.lineWidth = labelColors.borderWidth || 1;
      ctx.strokeStyle = labelColors.borderColor;
      ctx.setLineDash(labelColors.borderDash || []);
      ctx.lineDashOffset = labelColors.borderDashOffset || 0;
      const outerX = rtlHelper.leftForLtr(rtlColorX, boxWidth - boxPadding);
      const innerX = rtlHelper.leftForLtr(rtlHelper.xPlus(rtlColorX, 1), boxWidth - boxPadding - 2);
      const borderRadius = toTRBLCorners(labelColors.borderRadius);
      if (Object.values(borderRadius).some(v => v !== 0)) {
        ctx.beginPath();
        ctx.fillStyle = options.multiKeyBackground;
        addRoundedRectPath(ctx, {
          x: outerX,
          y: colorY,
          w: boxWidth,
          h: boxHeight,
          radius: borderRadius,
        });
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = labelColors.backgroundColor;
        ctx.beginPath();
        addRoundedRectPath(ctx, {
          x: innerX,
          y: colorY + 1,
          w: boxWidth - 2,
          h: boxHeight - 2,
          radius: borderRadius,
        });
        ctx.fill();
      } else {
        ctx.fillStyle = options.multiKeyBackground;
        ctx.fillRect(outerX, colorY, boxWidth, boxHeight);
        ctx.strokeRect(outerX, colorY, boxWidth, boxHeight);
        ctx.fillStyle = labelColors.backgroundColor;
        ctx.fillRect(innerX, colorY + 1, boxWidth - 2, boxHeight - 2);
      }
    }
    ctx.fillStyle = this.labelTextColors[i];
  }
  drawBody(pt, ctx, options) {
    const {body} = this;
    const {bodySpacing, bodyAlign, displayColors, boxHeight, boxWidth, boxPadding} = options;
    const bodyFont = toFont(options.bodyFont);
    let bodyLineHeight = bodyFont.lineHeight;
    let xLinePadding = 0;
    const rtlHelper = getRtlAdapter(options.rtl, this.x, this.width);
    const fillLineOfText = function(line) {
      ctx.fillText(line, rtlHelper.x(pt.x + xLinePadding), pt.y + bodyLineHeight / 2);
      pt.y += bodyLineHeight + bodySpacing;
    };
    const bodyAlignForCalculation = rtlHelper.textAlign(bodyAlign);
    let bodyItem, textColor, lines, i, j, ilen, jlen;
    ctx.textAlign = bodyAlign;
    ctx.textBaseline = 'middle';
    ctx.font = bodyFont.string;
    pt.x = getAlignedX(this, bodyAlignForCalculation, options);
    ctx.fillStyle = options.bodyColor;
    each(this.beforeBody, fillLineOfText);
    xLinePadding = displayColors && bodyAlignForCalculation !== 'right'
      ? bodyAlign === 'center' ? (boxWidth / 2 + boxPadding) : (boxWidth + 2 + boxPadding)
      : 0;
    for (i = 0, ilen = body.length; i < ilen; ++i) {
      bodyItem = body[i];
      textColor = this.labelTextColors[i];
      ctx.fillStyle = textColor;
      each(bodyItem.before, fillLineOfText);
      lines = bodyItem.lines;
      if (displayColors && lines.length) {
        this._drawColorBox(ctx, pt, i, rtlHelper, options);
        bodyLineHeight = Math.max(bodyFont.lineHeight, boxHeight);
      }
      for (j = 0, jlen = lines.length; j < jlen; ++j) {
        fillLineOfText(lines[j]);
        bodyLineHeight = bodyFont.lineHeight;
      }
      each(bodyItem.after, fillLineOfText);
    }
    xLinePadding = 0;
    bodyLineHeight = bodyFont.lineHeight;
    each(this.afterBody, fillLineOfText);
    pt.y -= bodySpacing;
  }
  drawFooter(pt, ctx, options) {
    const footer = this.footer;
    const length = footer.length;
    let footerFont, i;
    if (length) {
      const rtlHelper = getRtlAdapter(options.rtl, this.x, this.width);
      pt.x = getAlignedX(this, options.footerAlign, options);
      pt.y += options.footerMarginTop;
      ctx.textAlign = rtlHelper.textAlign(options.footerAlign);
      ctx.textBaseline = 'middle';
      footerFont = toFont(options.footerFont);
      ctx.fillStyle = options.footerColor;
      ctx.font = footerFont.string;
      for (i = 0; i < length; ++i) {
        ctx.fillText(footer[i], rtlHelper.x(pt.x), pt.y + footerFont.lineHeight / 2);
        pt.y += footerFont.lineHeight + options.footerSpacing;
      }
    }
  }
  drawBackground(pt, ctx, tooltipSize, options) {
    const {xAlign, yAlign} = this;
    const {x, y} = pt;
    const {width, height} = tooltipSize;
    const {topLeft, topRight, bottomLeft, bottomRight} = toTRBLCorners(options.cornerRadius);
    ctx.fillStyle = options.backgroundColor;
    ctx.strokeStyle = options.borderColor;
    ctx.lineWidth = options.borderWidth;
    ctx.beginPath();
    ctx.moveTo(x + topLeft, y);
    if (yAlign === 'top') {
      this.drawCaret(pt, ctx, tooltipSize, options);
    }
    ctx.lineTo(x + width - topRight, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + topRight);
    if (yAlign === 'center' && xAlign === 'right') {
      this.drawCaret(pt, ctx, tooltipSize, options);
    }
    ctx.lineTo(x + width, y + height - bottomRight);
    ctx.quadraticCurveTo(x + width, y + height, x + width - bottomRight, y + height);
    if (yAlign === 'bottom') {
      this.drawCaret(pt, ctx, tooltipSize, options);
    }
    ctx.lineTo(x + bottomLeft, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - bottomLeft);
    if (yAlign === 'center' && xAlign === 'left') {
      this.drawCaret(pt, ctx, tooltipSize, options);
    }
    ctx.lineTo(x, y + topLeft);
    ctx.quadraticCurveTo(x, y, x + topLeft, y);
    ctx.closePath();
    ctx.fill();
    if (options.borderWidth > 0) {
      ctx.stroke();
    }
  }
  _updateAnimationTarget(options) {
    const chart = this._chart;
    const anims = this.$animations;
    const animX = anims && anims.x;
    const animY = anims && anims.y;
    if (animX || animY) {
      const position = positioners$1[options.position].call(this, this._active, this._eventPosition);
      if (!position) {
        return;
      }
      const size = this._size = getTooltipSize(this, options);
      const positionAndSize = Object.assign({}, position, this._size);
      const alignment = determineAlignment(chart, options, positionAndSize);
      const point = getBackgroundPoint(options, positionAndSize, alignment, chart);
      if (animX._to !== point.x || animY._to !== point.y) {
        this.xAlign = alignment.xAlign;
        this.yAlign = alignment.yAlign;
        this.width = size.width;
        this.height = size.height;
        this.caretX = position.x;
        this.caretY = position.y;
        this._resolveAnimations().update(this, point);
      }
    }
  }
  draw(ctx) {
    const options = this.options.setContext(this.getContext());
    let opacity = this.opacity;
    if (!opacity) {
      return;
    }
    this._updateAnimationTarget(options);
    const tooltipSize = {
      width: this.width,
      height: this.height
    };
    const pt = {
      x: this.x,
      y: this.y
    };
    opacity = Math.abs(opacity) < 1e-3 ? 0 : opacity;
    const padding = toPadding(options.padding);
    const hasTooltipContent = this.title.length || this.beforeBody.length || this.body.length || this.afterBody.length || this.footer.length;
    if (options.enabled && hasTooltipContent) {
      ctx.save();
      ctx.globalAlpha = opacity;
      this.drawBackground(pt, ctx, tooltipSize, options);
      overrideTextDirection(ctx, options.textDirection);
      pt.y += padding.top;
      this.drawTitle(pt, ctx, options);
      this.drawBody(pt, ctx, options);
      this.drawFooter(pt, ctx, options);
      restoreTextDirection(ctx, options.textDirection);
      ctx.restore();
    }
  }
  getActiveElements() {
    return this._active || [];
  }
  setActiveElements(activeElements, eventPosition) {
    const lastActive = this._active;
    const active = activeElements.map(({datasetIndex, index}) => {
      const meta = this._chart.getDatasetMeta(datasetIndex);
      if (!meta) {
        throw new Error('Cannot find a dataset at index ' + datasetIndex);
      }
      return {
        datasetIndex,
        element: meta.data[index],
        index,
      };
    });
    const changed = !_elementsEqual(lastActive, active);
    const positionChanged = this._positionChanged(active, eventPosition);
    if (changed || positionChanged) {
      this._active = active;
      this._eventPosition = eventPosition;
      this.update(true);
    }
  }
  handleEvent(e, replay) {
    const options = this.options;
    const lastActive = this._active || [];
    let changed = false;
    let active = [];
    if (e.type !== 'mouseout') {
      active = this._chart.getElementsAtEventForMode(e, options.mode, options, replay);
      if (options.reverse) {
        active.reverse();
      }
    }
    const positionChanged = this._positionChanged(active, e);
    changed = replay || !_elementsEqual(active, lastActive) || positionChanged;
    if (changed) {
      this._active = active;
      if (options.enabled || options.external) {
        this._eventPosition = {
          x: e.x,
          y: e.y
        };
        this.update(true, replay);
      }
    }
    return changed;
  }
  _positionChanged(active, e) {
    const {caretX, caretY, options} = this;
    const position = positioners$1[options.position].call(this, active, e);
    return position !== false && (caretX !== position.x || caretY !== position.y);
  }
}
Tooltip.positioners = positioners$1;
var plugin_tooltip = {
  id: 'tooltip',
  _element: Tooltip,
  positioners: positioners$1,
  afterInit(chart, _args, options) {
    if (options) {
      chart.tooltip = new Tooltip({_chart: chart, options});
    }
  },
  beforeUpdate(chart, _args, options) {
    if (chart.tooltip) {
      chart.tooltip.initialize(options);
    }
  },
  reset(chart, _args, options) {
    if (chart.tooltip) {
      chart.tooltip.initialize(options);
    }
  },
  afterDraw(chart) {
    const tooltip = chart.tooltip;
    const args = {
      tooltip
    };
    if (chart.notifyPlugins('beforeTooltipDraw', args) === false) {
      return;
    }
    if (tooltip) {
      tooltip.draw(chart.ctx);
    }
    chart.notifyPlugins('afterTooltipDraw', args);
  },
  afterEvent(chart, args) {
    if (chart.tooltip) {
      const useFinalPosition = args.replay;
      if (chart.tooltip.handleEvent(args.event, useFinalPosition)) {
        args.changed = true;
      }
    }
  },
  defaults: {
    enabled: true,
    external: null,
    position: 'average',
    backgroundColor: 'rgba(0,0,0,0.8)',
    titleColor: '#fff',
    titleFont: {
      weight: 'bold',
    },
    titleSpacing: 2,
    titleMarginBottom: 6,
    titleAlign: 'left',
    bodyColor: '#fff',
    bodySpacing: 2,
    bodyFont: {
    },
    bodyAlign: 'left',
    footerColor: '#fff',
    footerSpacing: 2,
    footerMarginTop: 6,
    footerFont: {
      weight: 'bold',
    },
    footerAlign: 'left',
    padding: 6,
    caretPadding: 2,
    caretSize: 5,
    cornerRadius: 6,
    boxHeight: (ctx, opts) => opts.bodyFont.size,
    boxWidth: (ctx, opts) => opts.bodyFont.size,
    multiKeyBackground: '#fff',
    displayColors: true,
    boxPadding: 0,
    borderColor: 'rgba(0,0,0,0)',
    borderWidth: 0,
    animation: {
      duration: 400,
      easing: 'easeOutQuart',
    },
    animations: {
      numbers: {
        type: 'number',
        properties: ['x', 'y', 'width', 'height', 'caretX', 'caretY'],
      },
      opacity: {
        easing: 'linear',
        duration: 200
      }
    },
    callbacks: {
      beforeTitle: noop,
      title(tooltipItems) {
        if (tooltipItems.length > 0) {
          const item = tooltipItems[0];
          const labels = item.chart.data.labels;
          const labelCount = labels ? labels.length : 0;
          if (this && this.options && this.options.mode === 'dataset') {
            return item.dataset.label || '';
          } else if (item.label) {
            return item.label;
          } else if (labelCount > 0 && item.dataIndex < labelCount) {
            return labels[item.dataIndex];
          }
        }
        return '';
      },
      afterTitle: noop,
      beforeBody: noop,
      beforeLabel: noop,
      label(tooltipItem) {
        if (this && this.options && this.options.mode === 'dataset') {
          return tooltipItem.label + ': ' + tooltipItem.formattedValue || tooltipItem.formattedValue;
        }
        let label = tooltipItem.dataset.label || '';
        if (label) {
          label += ': ';
        }
        const value = tooltipItem.formattedValue;
        if (!isNullOrUndef(value)) {
          label += value;
        }
        return label;
      },
      labelColor(tooltipItem) {
        const meta = tooltipItem.chart.getDatasetMeta(tooltipItem.datasetIndex);
        const options = meta.controller.getStyle(tooltipItem.dataIndex);
        return {
          borderColor: options.borderColor,
          backgroundColor: options.backgroundColor,
          borderWidth: options.borderWidth,
          borderDash: options.borderDash,
          borderDashOffset: options.borderDashOffset,
          borderRadius: 0,
        };
      },
      labelTextColor() {
        return this.options.bodyColor;
      },
      labelPointStyle(tooltipItem) {
        const meta = tooltipItem.chart.getDatasetMeta(tooltipItem.datasetIndex);
        const options = meta.controller.getStyle(tooltipItem.dataIndex);
        return {
          pointStyle: options.pointStyle,
          rotation: options.rotation,
        };
      },
      afterLabel: noop,
      afterBody: noop,
      beforeFooter: noop,
      footer: noop,
      afterFooter: noop
    }
  },
  defaultRoutes: {
    bodyFont: 'font',
    footerFont: 'font',
    titleFont: 'font'
  },
  descriptors: {
    _scriptable: (name) => name !== 'filter' && name !== 'itemSort' && name !== 'external',
    _indexable: false,
    callbacks: {
      _scriptable: false,
      _indexable: false,
    },
    animation: {
      _fallback: false
    },
    animations: {
      _fallback: 'animation'
    }
  },
  additionalOptionScopes: ['interaction']
};

var plugins = /*#__PURE__*/Object.freeze({
__proto__: null,
Decimation: plugin_decimation,
Filler: plugin_filler,
Legend: plugin_legend,
SubTitle: plugin_subtitle,
Title: plugin_title,
Tooltip: plugin_tooltip
});

const addIfString = (labels, raw, index) => typeof raw === 'string'
  ? labels.push(raw) - 1
  : isNaN(raw) ? null : index;
function findOrAddLabel(labels, raw, index) {
  const first = labels.indexOf(raw);
  if (first === -1) {
    return addIfString(labels, raw, index);
  }
  const last = labels.lastIndexOf(raw);
  return first !== last ? index : first;
}
const validIndex = (index, max) => index === null ? null : _limitValue(Math.round(index), 0, max);
class CategoryScale extends Scale {
  constructor(cfg) {
    super(cfg);
    this._startValue = undefined;
    this._valueRange = 0;
  }
  parse(raw, index) {
    if (isNullOrUndef(raw)) {
      return null;
    }
    const labels = this.getLabels();
    index = isFinite(index) && labels[index] === raw ? index
      : findOrAddLabel(labels, raw, valueOrDefault(index, raw));
    return validIndex(index, labels.length - 1);
  }
  determineDataLimits() {
    const {minDefined, maxDefined} = this.getUserBounds();
    let {min, max} = this.getMinMax(true);
    if (this.options.bounds === 'ticks') {
      if (!minDefined) {
        min = 0;
      }
      if (!maxDefined) {
        max = this.getLabels().length - 1;
      }
    }
    this.min = min;
    this.max = max;
  }
  buildTicks() {
    const min = this.min;
    const max = this.max;
    const offset = this.options.offset;
    const ticks = [];
    let labels = this.getLabels();
    labels = (min === 0 && max === labels.length - 1) ? labels : labels.slice(min, max + 1);
    this._valueRange = Math.max(labels.length - (offset ? 0 : 1), 1);
    this._startValue = this.min - (offset ? 0.5 : 0);
    for (let value = min; value <= max; value++) {
      ticks.push({value});
    }
    return ticks;
  }
  getLabelForValue(value) {
    const labels = this.getLabels();
    if (value >= 0 && value < labels.length) {
      return labels[value];
    }
    return value;
  }
  configure() {
    super.configure();
    if (!this.isHorizontal()) {
      this._reversePixels = !this._reversePixels;
    }
  }
  getPixelForValue(value) {
    if (typeof value !== 'number') {
      value = this.parse(value);
    }
    return value === null ? NaN : this.getPixelForDecimal((value - this._startValue) / this._valueRange);
  }
  getPixelForTick(index) {
    const ticks = this.ticks;
    if (index < 0 || index > ticks.length - 1) {
      return null;
    }
    return this.getPixelForValue(ticks[index].value);
  }
  getValueForPixel(pixel) {
    return Math.round(this._startValue + this.getDecimalForPixel(pixel) * this._valueRange);
  }
  getBasePixel() {
    return this.bottom;
  }
}
CategoryScale.id = 'category';
CategoryScale.defaults = {
  ticks: {
    callback: CategoryScale.prototype.getLabelForValue
  }
};

function generateTicks$1(generationOptions, dataRange) {
  const ticks = [];
  const MIN_SPACING = 1e-14;
  const {bounds, step, min, max, precision, count, maxTicks, maxDigits, includeBounds} = generationOptions;
  const unit = step || 1;
  const maxSpaces = maxTicks - 1;
  const {min: rmin, max: rmax} = dataRange;
  const minDefined = !isNullOrUndef(min);
  const maxDefined = !isNullOrUndef(max);
  const countDefined = !isNullOrUndef(count);
  const minSpacing = (rmax - rmin) / (maxDigits + 1);
  let spacing = niceNum((rmax - rmin) / maxSpaces / unit) * unit;
  let factor, niceMin, niceMax, numSpaces;
  if (spacing < MIN_SPACING && !minDefined && !maxDefined) {
    return [{value: rmin}, {value: rmax}];
  }
  numSpaces = Math.ceil(rmax / spacing) - Math.floor(rmin / spacing);
  if (numSpaces > maxSpaces) {
    spacing = niceNum(numSpaces * spacing / maxSpaces / unit) * unit;
  }
  if (!isNullOrUndef(precision)) {
    factor = Math.pow(10, precision);
    spacing = Math.ceil(spacing * factor) / factor;
  }
  if (bounds === 'ticks') {
    niceMin = Math.floor(rmin / spacing) * spacing;
    niceMax = Math.ceil(rmax / spacing) * spacing;
  } else {
    niceMin = rmin;
    niceMax = rmax;
  }
  if (minDefined && maxDefined && step && almostWhole((max - min) / step, spacing / 1000)) {
    numSpaces = Math.round(Math.min((max - min) / spacing, maxTicks));
    spacing = (max - min) / numSpaces;
    niceMin = min;
    niceMax = max;
  } else if (countDefined) {
    niceMin = minDefined ? min : niceMin;
    niceMax = maxDefined ? max : niceMax;
    numSpaces = count - 1;
    spacing = (niceMax - niceMin) / numSpaces;
  } else {
    numSpaces = (niceMax - niceMin) / spacing;
    if (almostEquals(numSpaces, Math.round(numSpaces), spacing / 1000)) {
      numSpaces = Math.round(numSpaces);
    } else {
      numSpaces = Math.ceil(numSpaces);
    }
  }
  const decimalPlaces = Math.max(
    _decimalPlaces(spacing),
    _decimalPlaces(niceMin)
  );
  factor = Math.pow(10, isNullOrUndef(precision) ? decimalPlaces : precision);
  niceMin = Math.round(niceMin * factor) / factor;
  niceMax = Math.round(niceMax * factor) / factor;
  let j = 0;
  if (minDefined) {
    if (includeBounds && niceMin !== min) {
      ticks.push({value: min});
      if (niceMin < min) {
        j++;
      }
      if (almostEquals(Math.round((niceMin + j * spacing) * factor) / factor, min, relativeLabelSize(min, minSpacing, generationOptions))) {
        j++;
      }
    } else if (niceMin < min) {
      j++;
    }
  }
  for (; j < numSpaces; ++j) {
    ticks.push({value: Math.round((niceMin + j * spacing) * factor) / factor});
  }
  if (maxDefined && includeBounds && niceMax !== max) {
    if (ticks.length && almostEquals(ticks[ticks.length - 1].value, max, relativeLabelSize(max, minSpacing, generationOptions))) {
      ticks[ticks.length - 1].value = max;
    } else {
      ticks.push({value: max});
    }
  } else if (!maxDefined || niceMax === max) {
    ticks.push({value: niceMax});
  }
  return ticks;
}
function relativeLabelSize(value, minSpacing, {horizontal, minRotation}) {
  const rad = toRadians(minRotation);
  const ratio = (horizontal ? Math.sin(rad) : Math.cos(rad)) || 0.001;
  const length = 0.75 * minSpacing * ('' + value).length;
  return Math.min(minSpacing / ratio, length);
}
class LinearScaleBase extends Scale {
  constructor(cfg) {
    super(cfg);
    this.start = undefined;
    this.end = undefined;
    this._startValue = undefined;
    this._endValue = undefined;
    this._valueRange = 0;
  }
  parse(raw, index) {
    if (isNullOrUndef(raw)) {
      return null;
    }
    if ((typeof raw === 'number' || raw instanceof Number) && !isFinite(+raw)) {
      return null;
    }
    return +raw;
  }
  handleTickRangeOptions() {
    const {beginAtZero} = this.options;
    const {minDefined, maxDefined} = this.getUserBounds();
    let {min, max} = this;
    const setMin = v => (min = minDefined ? min : v);
    const setMax = v => (max = maxDefined ? max : v);
    if (beginAtZero) {
      const minSign = sign(min);
      const maxSign = sign(max);
      if (minSign < 0 && maxSign < 0) {
        setMax(0);
      } else if (minSign > 0 && maxSign > 0) {
        setMin(0);
      }
    }
    if (min === max) {
      let offset = 1;
      if (max >= Number.MAX_SAFE_INTEGER || min <= Number.MIN_SAFE_INTEGER) {
        offset = Math.abs(max * 0.05);
      }
      setMax(max + offset);
      if (!beginAtZero) {
        setMin(min - offset);
      }
    }
    this.min = min;
    this.max = max;
  }
  getTickLimit() {
    const tickOpts = this.options.ticks;
    let {maxTicksLimit, stepSize} = tickOpts;
    let maxTicks;
    if (stepSize) {
      maxTicks = Math.ceil(this.max / stepSize) - Math.floor(this.min / stepSize) + 1;
      if (maxTicks > 1000) {
        console.warn(`scales.${this.id}.ticks.stepSize: ${stepSize} would result generating up to ${maxTicks} ticks. Limiting to 1000.`);
        maxTicks = 1000;
      }
    } else {
      maxTicks = this.computeTickLimit();
      maxTicksLimit = maxTicksLimit || 11;
    }
    if (maxTicksLimit) {
      maxTicks = Math.min(maxTicksLimit, maxTicks);
    }
    return maxTicks;
  }
  computeTickLimit() {
    return Number.POSITIVE_INFINITY;
  }
  buildTicks() {
    const opts = this.options;
    const tickOpts = opts.ticks;
    let maxTicks = this.getTickLimit();
    maxTicks = Math.max(2, maxTicks);
    const numericGeneratorOptions = {
      maxTicks,
      bounds: opts.bounds,
      min: opts.min,
      max: opts.max,
      precision: tickOpts.precision,
      step: tickOpts.stepSize,
      count: tickOpts.count,
      maxDigits: this._maxDigits(),
      horizontal: this.isHorizontal(),
      minRotation: tickOpts.minRotation || 0,
      includeBounds: tickOpts.includeBounds !== false
    };
    const dataRange = this._range || this;
    const ticks = generateTicks$1(numericGeneratorOptions, dataRange);
    if (opts.bounds === 'ticks') {
      _setMinAndMaxByKey(ticks, this, 'value');
    }
    if (opts.reverse) {
      ticks.reverse();
      this.start = this.max;
      this.end = this.min;
    } else {
      this.start = this.min;
      this.end = this.max;
    }
    return ticks;
  }
  configure() {
    const ticks = this.ticks;
    let start = this.min;
    let end = this.max;
    super.configure();
    if (this.options.offset && ticks.length) {
      const offset = (end - start) / Math.max(ticks.length - 1, 1) / 2;
      start -= offset;
      end += offset;
    }
    this._startValue = start;
    this._endValue = end;
    this._valueRange = end - start;
  }
  getLabelForValue(value) {
    return formatNumber(value, this.chart.options.locale);
  }
}

class LinearScale extends LinearScaleBase {
  determineDataLimits() {
    const {min, max} = this.getMinMax(true);
    this.min = isNumberFinite(min) ? min : 0;
    this.max = isNumberFinite(max) ? max : 1;
    this.handleTickRangeOptions();
  }
  computeTickLimit() {
    const horizontal = this.isHorizontal();
    const length = horizontal ? this.width : this.height;
    const minRotation = toRadians(this.options.ticks.minRotation);
    const ratio = (horizontal ? Math.sin(minRotation) : Math.cos(minRotation)) || 0.001;
    const tickFont = this._resolveTickFontOptions(0);
    return Math.ceil(length / Math.min(40, tickFont.lineHeight / ratio));
  }
  getPixelForValue(value) {
    return value === null ? NaN : this.getPixelForDecimal((value - this._startValue) / this._valueRange);
  }
  getValueForPixel(pixel) {
    return this._startValue + this.getDecimalForPixel(pixel) * this._valueRange;
  }
}
LinearScale.id = 'linear';
LinearScale.defaults = {
  ticks: {
    callback: Ticks.formatters.numeric
  }
};

function isMajor(tickVal) {
  const remain = tickVal / (Math.pow(10, Math.floor(log10(tickVal))));
  return remain === 1;
}
function generateTicks(generationOptions, dataRange) {
  const endExp = Math.floor(log10(dataRange.max));
  const endSignificand = Math.ceil(dataRange.max / Math.pow(10, endExp));
  const ticks = [];
  let tickVal = finiteOrDefault(generationOptions.min, Math.pow(10, Math.floor(log10(dataRange.min))));
  let exp = Math.floor(log10(tickVal));
  let significand = Math.floor(tickVal / Math.pow(10, exp));
  let precision = exp < 0 ? Math.pow(10, Math.abs(exp)) : 1;
  do {
    ticks.push({value: tickVal, major: isMajor(tickVal)});
    ++significand;
    if (significand === 10) {
      significand = 1;
      ++exp;
      precision = exp >= 0 ? 1 : precision;
    }
    tickVal = Math.round(significand * Math.pow(10, exp) * precision) / precision;
  } while (exp < endExp || (exp === endExp && significand < endSignificand));
  const lastTick = finiteOrDefault(generationOptions.max, tickVal);
  ticks.push({value: lastTick, major: isMajor(tickVal)});
  return ticks;
}
class LogarithmicScale extends Scale {
  constructor(cfg) {
    super(cfg);
    this.start = undefined;
    this.end = undefined;
    this._startValue = undefined;
    this._valueRange = 0;
  }
  parse(raw, index) {
    const value = LinearScaleBase.prototype.parse.apply(this, [raw, index]);
    if (value === 0) {
      this._zero = true;
      return undefined;
    }
    return isNumberFinite(value) && value > 0 ? value : null;
  }
  determineDataLimits() {
    const {min, max} = this.getMinMax(true);
    this.min = isNumberFinite(min) ? Math.max(0, min) : null;
    this.max = isNumberFinite(max) ? Math.max(0, max) : null;
    if (this.options.beginAtZero) {
      this._zero = true;
    }
    this.handleTickRangeOptions();
  }
  handleTickRangeOptions() {
    const {minDefined, maxDefined} = this.getUserBounds();
    let min = this.min;
    let max = this.max;
    const setMin = v => (min = minDefined ? min : v);
    const setMax = v => (max = maxDefined ? max : v);
    const exp = (v, m) => Math.pow(10, Math.floor(log10(v)) + m);
    if (min === max) {
      if (min <= 0) {
        setMin(1);
        setMax(10);
      } else {
        setMin(exp(min, -1));
        setMax(exp(max, +1));
      }
    }
    if (min <= 0) {
      setMin(exp(max, -1));
    }
    if (max <= 0) {
      setMax(exp(min, +1));
    }
    if (this._zero && this.min !== this._suggestedMin && min === exp(this.min, 0)) {
      setMin(exp(min, -1));
    }
    this.min = min;
    this.max = max;
  }
  buildTicks() {
    const opts = this.options;
    const generationOptions = {
      min: this._userMin,
      max: this._userMax
    };
    const ticks = generateTicks(generationOptions, this);
    if (opts.bounds === 'ticks') {
      _setMinAndMaxByKey(ticks, this, 'value');
    }
    if (opts.reverse) {
      ticks.reverse();
      this.start = this.max;
      this.end = this.min;
    } else {
      this.start = this.min;
      this.end = this.max;
    }
    return ticks;
  }
  getLabelForValue(value) {
    return value === undefined ? '0' : formatNumber(value, this.chart.options.locale);
  }
  configure() {
    const start = this.min;
    super.configure();
    this._startValue = log10(start);
    this._valueRange = log10(this.max) - log10(start);
  }
  getPixelForValue(value) {
    if (value === undefined || value === 0) {
      value = this.min;
    }
    if (value === null || isNaN(value)) {
      return NaN;
    }
    return this.getPixelForDecimal(value === this.min
      ? 0
      : (log10(value) - this._startValue) / this._valueRange);
  }
  getValueForPixel(pixel) {
    const decimal = this.getDecimalForPixel(pixel);
    return Math.pow(10, this._startValue + decimal * this._valueRange);
  }
}
LogarithmicScale.id = 'logarithmic';
LogarithmicScale.defaults = {
  ticks: {
    callback: Ticks.formatters.logarithmic,
    major: {
      enabled: true
    }
  }
};

function getTickBackdropHeight(opts) {
  const tickOpts = opts.ticks;
  if (tickOpts.display && opts.display) {
    const padding = toPadding(tickOpts.backdropPadding);
    return valueOrDefault(tickOpts.font && tickOpts.font.size, defaults$1.font.size) + padding.height;
  }
  return 0;
}
function measureLabelSize(ctx, font, label) {
  label = isArray(label) ? label : [label];
  return {
    w: _longestText(ctx, font.string, label),
    h: label.length * font.lineHeight
  };
}
function determineLimits(angle, pos, size, min, max) {
  if (angle === min || angle === max) {
    return {
      start: pos - (size / 2),
      end: pos + (size / 2)
    };
  } else if (angle < min || angle > max) {
    return {
      start: pos - size,
      end: pos
    };
  }
  return {
    start: pos,
    end: pos + size
  };
}
function fitWithPointLabels(scale) {
  const furthestLimits = {
    l: 0,
    r: scale.width,
    t: 0,
    b: scale.height - scale.paddingTop
  };
  const furthestAngles = {};
  const labelSizes = [];
  const padding = [];
  const valueCount = scale.getLabels().length;
  for (let i = 0; i < valueCount; i++) {
    const opts = scale.options.pointLabels.setContext(scale.getPointLabelContext(i));
    padding[i] = opts.padding;
    const pointPosition = scale.getPointPosition(i, scale.drawingArea + padding[i]);
    const plFont = toFont(opts.font);
    const textSize = measureLabelSize(scale.ctx, plFont, scale._pointLabels[i]);
    labelSizes[i] = textSize;
    const angleRadians = scale.getIndexAngle(i);
    const angle = toDegrees(angleRadians);
    const hLimits = determineLimits(angle, pointPosition.x, textSize.w, 0, 180);
    const vLimits = determineLimits(angle, pointPosition.y, textSize.h, 90, 270);
    if (hLimits.start < furthestLimits.l) {
      furthestLimits.l = hLimits.start;
      furthestAngles.l = angleRadians;
    }
    if (hLimits.end > furthestLimits.r) {
      furthestLimits.r = hLimits.end;
      furthestAngles.r = angleRadians;
    }
    if (vLimits.start < furthestLimits.t) {
      furthestLimits.t = vLimits.start;
      furthestAngles.t = angleRadians;
    }
    if (vLimits.end > furthestLimits.b) {
      furthestLimits.b = vLimits.end;
      furthestAngles.b = angleRadians;
    }
  }
  scale._setReductions(scale.drawingArea, furthestLimits, furthestAngles);
  scale._pointLabelItems = buildPointLabelItems(scale, labelSizes, padding);
}
function buildPointLabelItems(scale, labelSizes, padding) {
  const items = [];
  const valueCount = scale.getLabels().length;
  const opts = scale.options;
  const tickBackdropHeight = getTickBackdropHeight(opts);
  const outerDistance = scale.getDistanceFromCenterForValue(opts.ticks.reverse ? scale.min : scale.max);
  for (let i = 0; i < valueCount; i++) {
    const extra = (i === 0 ? tickBackdropHeight / 2 : 0);
    const pointLabelPosition = scale.getPointPosition(i, outerDistance + extra + padding[i]);
    const angle = toDegrees(scale.getIndexAngle(i));
    const size = labelSizes[i];
    const y = yForAngle(pointLabelPosition.y, size.h, angle);
    const textAlign = getTextAlignForAngle(angle);
    const left = leftForTextAlign(pointLabelPosition.x, size.w, textAlign);
    items.push({
      x: pointLabelPosition.x,
      y,
      textAlign,
      left,
      top: y,
      right: left + size.w,
      bottom: y + size.h
    });
  }
  return items;
}
function getTextAlignForAngle(angle) {
  if (angle === 0 || angle === 180) {
    return 'center';
  } else if (angle < 180) {
    return 'left';
  }
  return 'right';
}
function leftForTextAlign(x, w, align) {
  if (align === 'right') {
    x -= w;
  } else if (align === 'center') {
    x -= (w / 2);
  }
  return x;
}
function yForAngle(y, h, angle) {
  if (angle === 90 || angle === 270) {
    y -= (h / 2);
  } else if (angle > 270 || angle < 90) {
    y -= h;
  }
  return y;
}
function drawPointLabels(scale, labelCount) {
  const {ctx, options: {pointLabels}} = scale;
  for (let i = labelCount - 1; i >= 0; i--) {
    const optsAtIndex = pointLabels.setContext(scale.getPointLabelContext(i));
    const plFont = toFont(optsAtIndex.font);
    const {x, y, textAlign, left, top, right, bottom} = scale._pointLabelItems[i];
    const {backdropColor} = optsAtIndex;
    if (!isNullOrUndef(backdropColor)) {
      const padding = toPadding(optsAtIndex.backdropPadding);
      ctx.fillStyle = backdropColor;
      ctx.fillRect(left - padding.left, top - padding.top, right - left + padding.width, bottom - top + padding.height);
    }
    renderText(
      ctx,
      scale._pointLabels[i],
      x,
      y + (plFont.lineHeight / 2),
      plFont,
      {
        color: optsAtIndex.color,
        textAlign: textAlign,
        textBaseline: 'middle'
      }
    );
  }
}
function pathRadiusLine(scale, radius, circular, labelCount) {
  const {ctx} = scale;
  if (circular) {
    ctx.arc(scale.xCenter, scale.yCenter, radius, 0, TAU);
  } else {
    let pointPosition = scale.getPointPosition(0, radius);
    ctx.moveTo(pointPosition.x, pointPosition.y);
    for (let i = 1; i < labelCount; i++) {
      pointPosition = scale.getPointPosition(i, radius);
      ctx.lineTo(pointPosition.x, pointPosition.y);
    }
  }
}
function drawRadiusLine(scale, gridLineOpts, radius, labelCount) {
  const ctx = scale.ctx;
  const circular = gridLineOpts.circular;
  const {color, lineWidth} = gridLineOpts;
  if ((!circular && !labelCount) || !color || !lineWidth || radius < 0) {
    return;
  }
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(gridLineOpts.borderDash);
  ctx.lineDashOffset = gridLineOpts.borderDashOffset;
  ctx.beginPath();
  pathRadiusLine(scale, radius, circular, labelCount);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
function numberOrZero(param) {
  return isNumber(param) ? param : 0;
}
function createPointLabelContext(parent, index, label) {
  return createContext(parent, {
    label,
    index,
    type: 'pointLabel'
  });
}
class RadialLinearScale extends LinearScaleBase {
  constructor(cfg) {
    super(cfg);
    this.xCenter = undefined;
    this.yCenter = undefined;
    this.drawingArea = undefined;
    this._pointLabels = [];
    this._pointLabelItems = [];
  }
  setDimensions() {
    this.width = this.maxWidth;
    this.height = this.maxHeight;
    this.paddingTop = getTickBackdropHeight(this.options) / 2;
    this.xCenter = Math.floor(this.width / 2);
    this.yCenter = Math.floor((this.height - this.paddingTop) / 2);
    this.drawingArea = Math.min(this.height - this.paddingTop, this.width) / 2;
  }
  determineDataLimits() {
    const {min, max} = this.getMinMax(false);
    this.min = isNumberFinite(min) && !isNaN(min) ? min : 0;
    this.max = isNumberFinite(max) && !isNaN(max) ? max : 0;
    this.handleTickRangeOptions();
  }
  computeTickLimit() {
    return Math.ceil(this.drawingArea / getTickBackdropHeight(this.options));
  }
  generateTickLabels(ticks) {
    LinearScaleBase.prototype.generateTickLabels.call(this, ticks);
    this._pointLabels = this.getLabels().map((value, index) => {
      const label = callback(this.options.pointLabels.callback, [value, index], this);
      return label || label === 0 ? label : '';
    });
  }
  fit() {
    const opts = this.options;
    if (opts.display && opts.pointLabels.display) {
      fitWithPointLabels(this);
    } else {
      this.setCenterPoint(0, 0, 0, 0);
    }
  }
  _setReductions(largestPossibleRadius, furthestLimits, furthestAngles) {
    let radiusReductionLeft = furthestLimits.l / Math.sin(furthestAngles.l);
    let radiusReductionRight = Math.max(furthestLimits.r - this.width, 0) / Math.sin(furthestAngles.r);
    let radiusReductionTop = -furthestLimits.t / Math.cos(furthestAngles.t);
    let radiusReductionBottom = -Math.max(furthestLimits.b - (this.height - this.paddingTop), 0) / Math.cos(furthestAngles.b);
    radiusReductionLeft = numberOrZero(radiusReductionLeft);
    radiusReductionRight = numberOrZero(radiusReductionRight);
    radiusReductionTop = numberOrZero(radiusReductionTop);
    radiusReductionBottom = numberOrZero(radiusReductionBottom);
    this.drawingArea = Math.max(largestPossibleRadius / 2, Math.min(
      Math.floor(largestPossibleRadius - (radiusReductionLeft + radiusReductionRight) / 2),
      Math.floor(largestPossibleRadius - (radiusReductionTop + radiusReductionBottom) / 2)));
    this.setCenterPoint(radiusReductionLeft, radiusReductionRight, radiusReductionTop, radiusReductionBottom);
  }
  setCenterPoint(leftMovement, rightMovement, topMovement, bottomMovement) {
    const maxRight = this.width - rightMovement - this.drawingArea;
    const maxLeft = leftMovement + this.drawingArea;
    const maxTop = topMovement + this.drawingArea;
    const maxBottom = (this.height - this.paddingTop) - bottomMovement - this.drawingArea;
    this.xCenter = Math.floor(((maxLeft + maxRight) / 2) + this.left);
    this.yCenter = Math.floor(((maxTop + maxBottom) / 2) + this.top + this.paddingTop);
  }
  getIndexAngle(index) {
    const angleMultiplier = TAU / this.getLabels().length;
    const startAngle = this.options.startAngle || 0;
    return _normalizeAngle(index * angleMultiplier + toRadians(startAngle));
  }
  getDistanceFromCenterForValue(value) {
    if (isNullOrUndef(value)) {
      return NaN;
    }
    const scalingFactor = this.drawingArea / (this.max - this.min);
    if (this.options.reverse) {
      return (this.max - value) * scalingFactor;
    }
    return (value - this.min) * scalingFactor;
  }
  getValueForDistanceFromCenter(distance) {
    if (isNullOrUndef(distance)) {
      return NaN;
    }
    const scaledDistance = distance / (this.drawingArea / (this.max - this.min));
    return this.options.reverse ? this.max - scaledDistance : this.min + scaledDistance;
  }
  getPointLabelContext(index) {
    const pointLabels = this._pointLabels || [];
    if (index >= 0 && index < pointLabels.length) {
      const pointLabel = pointLabels[index];
      return createPointLabelContext(this.getContext(), index, pointLabel);
    }
  }
  getPointPosition(index, distanceFromCenter) {
    const angle = this.getIndexAngle(index) - HALF_PI;
    return {
      x: Math.cos(angle) * distanceFromCenter + this.xCenter,
      y: Math.sin(angle) * distanceFromCenter + this.yCenter,
      angle
    };
  }
  getPointPositionForValue(index, value) {
    return this.getPointPosition(index, this.getDistanceFromCenterForValue(value));
  }
  getBasePosition(index) {
    return this.getPointPositionForValue(index || 0, this.getBaseValue());
  }
  getPointLabelPosition(index) {
    const {left, top, right, bottom} = this._pointLabelItems[index];
    return {
      left,
      top,
      right,
      bottom,
    };
  }
  drawBackground() {
    const {backgroundColor, grid: {circular}} = this.options;
    if (backgroundColor) {
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath();
      pathRadiusLine(this, this.getDistanceFromCenterForValue(this._endValue), circular, this.getLabels().length);
      ctx.closePath();
      ctx.fillStyle = backgroundColor;
      ctx.fill();
      ctx.restore();
    }
  }
  drawGrid() {
    const ctx = this.ctx;
    const opts = this.options;
    const {angleLines, grid} = opts;
    const labelCount = this.getLabels().length;
    let i, offset, position;
    if (opts.pointLabels.display) {
      drawPointLabels(this, labelCount);
    }
    if (grid.display) {
      this.ticks.forEach((tick, index) => {
        if (index !== 0) {
          offset = this.getDistanceFromCenterForValue(tick.value);
          const optsAtIndex = grid.setContext(this.getContext(index - 1));
          drawRadiusLine(this, optsAtIndex, offset, labelCount);
        }
      });
    }
    if (angleLines.display) {
      ctx.save();
      for (i = this.getLabels().length - 1; i >= 0; i--) {
        const optsAtIndex = angleLines.setContext(this.getPointLabelContext(i));
        const {color, lineWidth} = optsAtIndex;
        if (!lineWidth || !color) {
          continue;
        }
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.setLineDash(optsAtIndex.borderDash);
        ctx.lineDashOffset = optsAtIndex.borderDashOffset;
        offset = this.getDistanceFromCenterForValue(opts.ticks.reverse ? this.min : this.max);
        position = this.getPointPosition(i, offset);
        ctx.beginPath();
        ctx.moveTo(this.xCenter, this.yCenter);
        ctx.lineTo(position.x, position.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  drawBorder() {}
  drawLabels() {
    const ctx = this.ctx;
    const opts = this.options;
    const tickOpts = opts.ticks;
    if (!tickOpts.display) {
      return;
    }
    const startAngle = this.getIndexAngle(0);
    let offset, width;
    ctx.save();
    ctx.translate(this.xCenter, this.yCenter);
    ctx.rotate(startAngle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.ticks.forEach((tick, index) => {
      if (index === 0 && !opts.reverse) {
        return;
      }
      const optsAtIndex = tickOpts.setContext(this.getContext(index));
      const tickFont = toFont(optsAtIndex.font);
      offset = this.getDistanceFromCenterForValue(this.ticks[index].value);
      if (optsAtIndex.showLabelBackdrop) {
        ctx.font = tickFont.string;
        width = ctx.measureText(tick.label).width;
        ctx.fillStyle = optsAtIndex.backdropColor;
        const padding = toPadding(optsAtIndex.backdropPadding);
        ctx.fillRect(
          -width / 2 - padding.left,
          -offset - tickFont.size / 2 - padding.top,
          width + padding.width,
          tickFont.size + padding.height
        );
      }
      renderText(ctx, tick.label, 0, -offset, tickFont, {
        color: optsAtIndex.color,
      });
    });
    ctx.restore();
  }
  drawTitle() {}
}
RadialLinearScale.id = 'radialLinear';
RadialLinearScale.defaults = {
  display: true,
  animate: true,
  position: 'chartArea',
  angleLines: {
    display: true,
    lineWidth: 1,
    borderDash: [],
    borderDashOffset: 0.0
  },
  grid: {
    circular: false
  },
  startAngle: 0,
  ticks: {
    showLabelBackdrop: true,
    callback: Ticks.formatters.numeric
  },
  pointLabels: {
    backdropColor: undefined,
    backdropPadding: 2,
    display: true,
    font: {
      size: 10
    },
    callback(label) {
      return label;
    },
    padding: 5
  }
};
RadialLinearScale.defaultRoutes = {
  'angleLines.color': 'borderColor',
  'pointLabels.color': 'color',
  'ticks.color': 'color'
};
RadialLinearScale.descriptors = {
  angleLines: {
    _fallback: 'grid'
  }
};

const INTERVALS = {
  millisecond: {common: true, size: 1, steps: 1000},
  second: {common: true, size: 1000, steps: 60},
  minute: {common: true, size: 60000, steps: 60},
  hour: {common: true, size: 3600000, steps: 24},
  day: {common: true, size: 86400000, steps: 30},
  week: {common: false, size: 604800000, steps: 4},
  month: {common: true, size: 2.628e9, steps: 12},
  quarter: {common: false, size: 7.884e9, steps: 4},
  year: {common: true, size: 3.154e10}
};
const UNITS = (Object.keys(INTERVALS));
function sorter(a, b) {
  return a - b;
}
function parse(scale, input) {
  if (isNullOrUndef(input)) {
    return null;
  }
  const adapter = scale._adapter;
  const {parser, round, isoWeekday} = scale._parseOpts;
  let value = input;
  if (typeof parser === 'function') {
    value = parser(value);
  }
  if (!isNumberFinite(value)) {
    value = typeof parser === 'string'
      ? adapter.parse(value, parser)
      : adapter.parse(value);
  }
  if (value === null) {
    return null;
  }
  if (round) {
    value = round === 'week' && (isNumber(isoWeekday) || isoWeekday === true)
      ? adapter.startOf(value, 'isoWeek', isoWeekday)
      : adapter.startOf(value, round);
  }
  return +value;
}
function determineUnitForAutoTicks(minUnit, min, max, capacity) {
  const ilen = UNITS.length;
  for (let i = UNITS.indexOf(minUnit); i < ilen - 1; ++i) {
    const interval = INTERVALS[UNITS[i]];
    const factor = interval.steps ? interval.steps : Number.MAX_SAFE_INTEGER;
    if (interval.common && Math.ceil((max - min) / (factor * interval.size)) <= capacity) {
      return UNITS[i];
    }
  }
  return UNITS[ilen - 1];
}
function determineUnitForFormatting(scale, numTicks, minUnit, min, max) {
  for (let i = UNITS.length - 1; i >= UNITS.indexOf(minUnit); i--) {
    const unit = UNITS[i];
    if (INTERVALS[unit].common && scale._adapter.diff(max, min, unit) >= numTicks - 1) {
      return unit;
    }
  }
  return UNITS[minUnit ? UNITS.indexOf(minUnit) : 0];
}
function determineMajorUnit(unit) {
  for (let i = UNITS.indexOf(unit) + 1, ilen = UNITS.length; i < ilen; ++i) {
    if (INTERVALS[UNITS[i]].common) {
      return UNITS[i];
    }
  }
}
function addTick(ticks, time, timestamps) {
  if (!timestamps) {
    ticks[time] = true;
  } else if (timestamps.length) {
    const {lo, hi} = _lookup(timestamps, time);
    const timestamp = timestamps[lo] >= time ? timestamps[lo] : timestamps[hi];
    ticks[timestamp] = true;
  }
}
function setMajorTicks(scale, ticks, map, majorUnit) {
  const adapter = scale._adapter;
  const first = +adapter.startOf(ticks[0].value, majorUnit);
  const last = ticks[ticks.length - 1].value;
  let major, index;
  for (major = first; major <= last; major = +adapter.add(major, 1, majorUnit)) {
    index = map[major];
    if (index >= 0) {
      ticks[index].major = true;
    }
  }
  return ticks;
}
function ticksFromTimestamps(scale, values, majorUnit) {
  const ticks = [];
  const map = {};
  const ilen = values.length;
  let i, value;
  for (i = 0; i < ilen; ++i) {
    value = values[i];
    map[value] = i;
    ticks.push({
      value,
      major: false
    });
  }
  return (ilen === 0 || !majorUnit) ? ticks : setMajorTicks(scale, ticks, map, majorUnit);
}
class TimeScale extends Scale {
  constructor(props) {
    super(props);
    this._cache = {
      data: [],
      labels: [],
      all: []
    };
    this._unit = 'day';
    this._majorUnit = undefined;
    this._offsets = {};
    this._normalized = false;
    this._parseOpts = undefined;
  }
  init(scaleOpts, opts) {
    const time = scaleOpts.time || (scaleOpts.time = {});
    const adapter = this._adapter = new adapters._date(scaleOpts.adapters.date);
    mergeIf(time.displayFormats, adapter.formats());
    this._parseOpts = {
      parser: time.parser,
      round: time.round,
      isoWeekday: time.isoWeekday
    };
    super.init(scaleOpts);
    this._normalized = opts.normalized;
  }
  parse(raw, index) {
    if (raw === undefined) {
      return null;
    }
    return parse(this, raw);
  }
  beforeLayout() {
    super.beforeLayout();
    this._cache = {
      data: [],
      labels: [],
      all: []
    };
  }
  determineDataLimits() {
    const options = this.options;
    const adapter = this._adapter;
    const unit = options.time.unit || 'day';
    let {min, max, minDefined, maxDefined} = this.getUserBounds();
    function _applyBounds(bounds) {
      if (!minDefined && !isNaN(bounds.min)) {
        min = Math.min(min, bounds.min);
      }
      if (!maxDefined && !isNaN(bounds.max)) {
        max = Math.max(max, bounds.max);
      }
    }
    if (!minDefined || !maxDefined) {
      _applyBounds(this._getLabelBounds());
      if (options.bounds !== 'ticks' || options.ticks.source !== 'labels') {
        _applyBounds(this.getMinMax(false));
      }
    }
    min = isNumberFinite(min) && !isNaN(min) ? min : +adapter.startOf(Date.now(), unit);
    max = isNumberFinite(max) && !isNaN(max) ? max : +adapter.endOf(Date.now(), unit) + 1;
    this.min = Math.min(min, max - 1);
    this.max = Math.max(min + 1, max);
  }
  _getLabelBounds() {
    const arr = this.getLabelTimestamps();
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    if (arr.length) {
      min = arr[0];
      max = arr[arr.length - 1];
    }
    return {min, max};
  }
  buildTicks() {
    const options = this.options;
    const timeOpts = options.time;
    const tickOpts = options.ticks;
    const timestamps = tickOpts.source === 'labels' ? this.getLabelTimestamps() : this._generate();
    if (options.bounds === 'ticks' && timestamps.length) {
      this.min = this._userMin || timestamps[0];
      this.max = this._userMax || timestamps[timestamps.length - 1];
    }
    const min = this.min;
    const max = this.max;
    const ticks = _filterBetween(timestamps, min, max);
    this._unit = timeOpts.unit || (tickOpts.autoSkip
      ? determineUnitForAutoTicks(timeOpts.minUnit, this.min, this.max, this._getLabelCapacity(min))
      : determineUnitForFormatting(this, ticks.length, timeOpts.minUnit, this.min, this.max));
    this._majorUnit = !tickOpts.major.enabled || this._unit === 'year' ? undefined
      : determineMajorUnit(this._unit);
    this.initOffsets(timestamps);
    if (options.reverse) {
      ticks.reverse();
    }
    return ticksFromTimestamps(this, ticks, this._majorUnit);
  }
  initOffsets(timestamps) {
    let start = 0;
    let end = 0;
    let first, last;
    if (this.options.offset && timestamps.length) {
      first = this.getDecimalForValue(timestamps[0]);
      if (timestamps.length === 1) {
        start = 1 - first;
      } else {
        start = (this.getDecimalForValue(timestamps[1]) - first) / 2;
      }
      last = this.getDecimalForValue(timestamps[timestamps.length - 1]);
      if (timestamps.length === 1) {
        end = last;
      } else {
        end = (last - this.getDecimalForValue(timestamps[timestamps.length - 2])) / 2;
      }
    }
    const limit = timestamps.length < 3 ? 0.5 : 0.25;
    start = _limitValue(start, 0, limit);
    end = _limitValue(end, 0, limit);
    this._offsets = {start, end, factor: 1 / (start + 1 + end)};
  }
  _generate() {
    const adapter = this._adapter;
    const min = this.min;
    const max = this.max;
    const options = this.options;
    const timeOpts = options.time;
    const minor = timeOpts.unit || determineUnitForAutoTicks(timeOpts.minUnit, min, max, this._getLabelCapacity(min));
    const stepSize = valueOrDefault(timeOpts.stepSize, 1);
    const weekday = minor === 'week' ? timeOpts.isoWeekday : false;
    const hasWeekday = isNumber(weekday) || weekday === true;
    const ticks = {};
    let first = min;
    let time, count;
    if (hasWeekday) {
      first = +adapter.startOf(first, 'isoWeek', weekday);
    }
    first = +adapter.startOf(first, hasWeekday ? 'day' : minor);
    if (adapter.diff(max, min, minor) > 100000 * stepSize) {
      throw new Error(min + ' and ' + max + ' are too far apart with stepSize of ' + stepSize + ' ' + minor);
    }
    const timestamps = options.ticks.source === 'data' && this.getDataTimestamps();
    for (time = first, count = 0; time < max; time = +adapter.add(time, stepSize, minor), count++) {
      addTick(ticks, time, timestamps);
    }
    if (time === max || options.bounds === 'ticks' || count === 1) {
      addTick(ticks, time, timestamps);
    }
    return Object.keys(ticks).sort((a, b) => a - b).map(x => +x);
  }
  getLabelForValue(value) {
    const adapter = this._adapter;
    const timeOpts = this.options.time;
    if (timeOpts.tooltipFormat) {
      return adapter.format(value, timeOpts.tooltipFormat);
    }
    return adapter.format(value, timeOpts.displayFormats.datetime);
  }
  _tickFormatFunction(time, index, ticks, format) {
    const options = this.options;
    const formats = options.time.displayFormats;
    const unit = this._unit;
    const majorUnit = this._majorUnit;
    const minorFormat = unit && formats[unit];
    const majorFormat = majorUnit && formats[majorUnit];
    const tick = ticks[index];
    const major = majorUnit && majorFormat && tick && tick.major;
    const label = this._adapter.format(time, format || (major ? majorFormat : minorFormat));
    const formatter = options.ticks.callback;
    return formatter ? callback(formatter, [label, index, ticks], this) : label;
  }
  generateTickLabels(ticks) {
    let i, ilen, tick;
    for (i = 0, ilen = ticks.length; i < ilen; ++i) {
      tick = ticks[i];
      tick.label = this._tickFormatFunction(tick.value, i, ticks);
    }
  }
  getDecimalForValue(value) {
    return value === null ? NaN : (value - this.min) / (this.max - this.min);
  }
  getPixelForValue(value) {
    const offsets = this._offsets;
    const pos = this.getDecimalForValue(value);
    return this.getPixelForDecimal((offsets.start + pos) * offsets.factor);
  }
  getValueForPixel(pixel) {
    const offsets = this._offsets;
    const pos = this.getDecimalForPixel(pixel) / offsets.factor - offsets.end;
    return this.min + pos * (this.max - this.min);
  }
  _getLabelSize(label) {
    const ticksOpts = this.options.ticks;
    const tickLabelWidth = this.ctx.measureText(label).width;
    const angle = toRadians(this.isHorizontal() ? ticksOpts.maxRotation : ticksOpts.minRotation);
    const cosRotation = Math.cos(angle);
    const sinRotation = Math.sin(angle);
    const tickFontSize = this._resolveTickFontOptions(0).size;
    return {
      w: (tickLabelWidth * cosRotation) + (tickFontSize * sinRotation),
      h: (tickLabelWidth * sinRotation) + (tickFontSize * cosRotation)
    };
  }
  _getLabelCapacity(exampleTime) {
    const timeOpts = this.options.time;
    const displayFormats = timeOpts.displayFormats;
    const format = displayFormats[timeOpts.unit] || displayFormats.millisecond;
    const exampleLabel = this._tickFormatFunction(exampleTime, 0, ticksFromTimestamps(this, [exampleTime], this._majorUnit), format);
    const size = this._getLabelSize(exampleLabel);
    const capacity = Math.floor(this.isHorizontal() ? this.width / size.w : this.height / size.h) - 1;
    return capacity > 0 ? capacity : 1;
  }
  getDataTimestamps() {
    let timestamps = this._cache.data || [];
    let i, ilen;
    if (timestamps.length) {
      return timestamps;
    }
    const metas = this.getMatchingVisibleMetas();
    if (this._normalized && metas.length) {
      return (this._cache.data = metas[0].controller.getAllParsedValues(this));
    }
    for (i = 0, ilen = metas.length; i < ilen; ++i) {
      timestamps = timestamps.concat(metas[i].controller.getAllParsedValues(this));
    }
    return (this._cache.data = this.normalize(timestamps));
  }
  getLabelTimestamps() {
    const timestamps = this._cache.labels || [];
    let i, ilen;
    if (timestamps.length) {
      return timestamps;
    }
    const labels = this.getLabels();
    for (i = 0, ilen = labels.length; i < ilen; ++i) {
      timestamps.push(parse(this, labels[i]));
    }
    return (this._cache.labels = this._normalized ? timestamps : this.normalize(timestamps));
  }
  normalize(values) {
    return _arrayUnique(values.sort(sorter));
  }
}
TimeScale.id = 'time';
TimeScale.defaults = {
  bounds: 'data',
  adapters: {},
  time: {
    parser: false,
    unit: false,
    round: false,
    isoWeekday: false,
    minUnit: 'millisecond',
    displayFormats: {}
  },
  ticks: {
    source: 'auto',
    major: {
      enabled: false
    }
  }
};

function interpolate(table, val, reverse) {
  let lo = 0;
  let hi = table.length - 1;
  let prevSource, nextSource, prevTarget, nextTarget;
  if (reverse) {
    if (val >= table[lo].pos && val <= table[hi].pos) {
      ({lo, hi} = _lookupByKey(table, 'pos', val));
    }
    ({pos: prevSource, time: prevTarget} = table[lo]);
    ({pos: nextSource, time: nextTarget} = table[hi]);
  } else {
    if (val >= table[lo].time && val <= table[hi].time) {
      ({lo, hi} = _lookupByKey(table, 'time', val));
    }
    ({time: prevSource, pos: prevTarget} = table[lo]);
    ({time: nextSource, pos: nextTarget} = table[hi]);
  }
  const span = nextSource - prevSource;
  return span ? prevTarget + (nextTarget - prevTarget) * (val - prevSource) / span : prevTarget;
}
class TimeSeriesScale extends TimeScale {
  constructor(props) {
    super(props);
    this._table = [];
    this._minPos = undefined;
    this._tableRange = undefined;
  }
  initOffsets() {
    const timestamps = this._getTimestampsForTable();
    const table = this._table = this.buildLookupTable(timestamps);
    this._minPos = interpolate(table, this.min);
    this._tableRange = interpolate(table, this.max) - this._minPos;
    super.initOffsets(timestamps);
  }
  buildLookupTable(timestamps) {
    const {min, max} = this;
    const items = [];
    const table = [];
    let i, ilen, prev, curr, next;
    for (i = 0, ilen = timestamps.length; i < ilen; ++i) {
      curr = timestamps[i];
      if (curr >= min && curr <= max) {
        items.push(curr);
      }
    }
    if (items.length < 2) {
      return [
        {time: min, pos: 0},
        {time: max, pos: 1}
      ];
    }
    for (i = 0, ilen = items.length; i < ilen; ++i) {
      next = items[i + 1];
      prev = items[i - 1];
      curr = items[i];
      if (Math.round((next + prev) / 2) !== curr) {
        table.push({time: curr, pos: i / (ilen - 1)});
      }
    }
    return table;
  }
  _getTimestampsForTable() {
    let timestamps = this._cache.all || [];
    if (timestamps.length) {
      return timestamps;
    }
    const data = this.getDataTimestamps();
    const label = this.getLabelTimestamps();
    if (data.length && label.length) {
      timestamps = this.normalize(data.concat(label));
    } else {
      timestamps = data.length ? data : label;
    }
    timestamps = this._cache.all = timestamps;
    return timestamps;
  }
  getDecimalForValue(value) {
    return (interpolate(this._table, value) - this._minPos) / this._tableRange;
  }
  getValueForPixel(pixel) {
    const offsets = this._offsets;
    const decimal = this.getDecimalForPixel(pixel) / offsets.factor - offsets.end;
    return interpolate(this._table, decimal * this._tableRange + this._minPos, true);
  }
}
TimeSeriesScale.id = 'timeseries';
TimeSeriesScale.defaults = TimeScale.defaults;

var scales = /*#__PURE__*/Object.freeze({
__proto__: null,
CategoryScale: CategoryScale,
LinearScale: LinearScale,
LogarithmicScale: LogarithmicScale,
RadialLinearScale: RadialLinearScale,
TimeScale: TimeScale,
TimeSeriesScale: TimeSeriesScale
});

const registerables = [
  controllers,
  elements,
  plugins,
  scales,
];

/*!
 * chartjs-plugin-datalabels v2.0.0
 * https://chartjs-plugin-datalabels.netlify.app
 * (c) 2017-2021 chartjs-plugin-datalabels contributors
 * Released under the MIT license
 */

var devicePixelRatio = (function() {
  if (typeof window !== 'undefined') {
    if (window.devicePixelRatio) {
      return window.devicePixelRatio;
    }

    // devicePixelRatio is undefined on IE10
    // https://stackoverflow.com/a/20204180/8837887
    // https://github.com/chartjs/chartjs-plugin-datalabels/issues/85
    var screen = window.screen;
    if (screen) {
      return (screen.deviceXDPI || 1) / (screen.logicalXDPI || 1);
    }
  }

  return 1;
}());

var utils = {
  // @todo move this in Chart.helpers.toTextLines
  toTextLines: function(inputs) {
    var lines = [];
    var input;

    inputs = [].concat(inputs);
    while (inputs.length) {
      input = inputs.pop();
      if (typeof input === 'string') {
        lines.unshift.apply(lines, input.split('\n'));
      } else if (Array.isArray(input)) {
        inputs.push.apply(inputs, input);
      } else if (!isNullOrUndef(inputs)) {
        lines.unshift('' + input);
      }
    }

    return lines;
  },

  // @todo move this in Chart.helpers.canvas.textSize
  // @todo cache calls of measureText if font doesn't change?!
  textSize: function(ctx, lines, font) {
    var items = [].concat(lines);
    var ilen = items.length;
    var prev = ctx.font;
    var width = 0;
    var i;

    ctx.font = font.string;

    for (i = 0; i < ilen; ++i) {
      width = Math.max(ctx.measureText(items[i]).width, width);
    }

    ctx.font = prev;

    return {
      height: ilen * font.lineHeight,
      width: width
    };
  },

  /**
   * Returns value bounded by min and max. This is equivalent to max(min, min(value, max)).
   * @todo move this method in Chart.helpers.bound
   * https://doc.qt.io/qt-5/qtglobal.html#qBound
   */
  bound: function(min, value, max) {
    return Math.max(min, Math.min(value, max));
  },

  /**
   * Returns an array of pair [value, state] where state is:
   * * -1: value is only in a0 (removed)
   * *  1: value is only in a1 (added)
   */
  arrayDiff: function(a0, a1) {
    var prev = a0.slice();
    var updates = [];
    var i, j, ilen, v;

    for (i = 0, ilen = a1.length; i < ilen; ++i) {
      v = a1[i];
      j = prev.indexOf(v);

      if (j === -1) {
        updates.push([v, 1]);
      } else {
        prev.splice(j, 1);
      }
    }

    for (i = 0, ilen = prev.length; i < ilen; ++i) {
      updates.push([prev[i], -1]);
    }

    return updates;
  },

  /**
   * https://github.com/chartjs/chartjs-plugin-datalabels/issues/70
   */
  rasterize: function(v) {
    return Math.round(v * devicePixelRatio) / devicePixelRatio;
  }
};

function orient(point, origin) {
  var x0 = origin.x;
  var y0 = origin.y;

  if (x0 === null) {
    return {x: 0, y: -1};
  }
  if (y0 === null) {
    return {x: 1, y: 0};
  }

  var dx = point.x - x0;
  var dy = point.y - y0;
  var ln = Math.sqrt(dx * dx + dy * dy);

  return {
    x: ln ? dx / ln : 0,
    y: ln ? dy / ln : -1
  };
}

function aligned(x, y, vx, vy, align) {
  switch (align) {
  case 'center':
    vx = vy = 0;
    break;
  case 'bottom':
    vx = 0;
    vy = 1;
    break;
  case 'right':
    vx = 1;
    vy = 0;
    break;
  case 'left':
    vx = -1;
    vy = 0;
    break;
  case 'top':
    vx = 0;
    vy = -1;
    break;
  case 'start':
    vx = -vx;
    vy = -vy;
    break;
  case 'end':
    // keep natural orientation
    break;
  default:
    // clockwise rotation (in degree)
    align *= (Math.PI / 180);
    vx = Math.cos(align);
    vy = Math.sin(align);
    break;
  }

  return {
    x: x,
    y: y,
    vx: vx,
    vy: vy
  };
}

// Line clipping (Cohen–Sutherland algorithm)
// https://en.wikipedia.org/wiki/Cohen–Sutherland_algorithm

var R_INSIDE = 0;
var R_LEFT = 1;
var R_RIGHT = 2;
var R_BOTTOM = 4;
var R_TOP = 8;

function region(x, y, rect) {
  var res = R_INSIDE;

  if (x < rect.left) {
    res |= R_LEFT;
  } else if (x > rect.right) {
    res |= R_RIGHT;
  }
  if (y < rect.top) {
    res |= R_TOP;
  } else if (y > rect.bottom) {
    res |= R_BOTTOM;
  }

  return res;
}

function clipped(segment, area) {
  var x0 = segment.x0;
  var y0 = segment.y0;
  var x1 = segment.x1;
  var y1 = segment.y1;
  var r0 = region(x0, y0, area);
  var r1 = region(x1, y1, area);
  var r, x, y;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!(r0 | r1) || (r0 & r1)) {
      // both points inside or on the same side: no clipping
      break;
    }

    // at least one point is outside
    r = r0 || r1;

    if (r & R_TOP) {
      x = x0 + (x1 - x0) * (area.top - y0) / (y1 - y0);
      y = area.top;
    } else if (r & R_BOTTOM) {
      x = x0 + (x1 - x0) * (area.bottom - y0) / (y1 - y0);
      y = area.bottom;
    } else if (r & R_RIGHT) {
      y = y0 + (y1 - y0) * (area.right - x0) / (x1 - x0);
      x = area.right;
    } else if (r & R_LEFT) {
      y = y0 + (y1 - y0) * (area.left - x0) / (x1 - x0);
      x = area.left;
    }

    if (r === r0) {
      x0 = x;
      y0 = y;
      r0 = region(x0, y0, area);
    } else {
      x1 = x;
      y1 = y;
      r1 = region(x1, y1, area);
    }
  }

  return {
    x0: x0,
    x1: x1,
    y0: y0,
    y1: y1
  };
}

function compute$1(range, config) {
  var anchor = config.anchor;
  var segment = range;
  var x, y;

  if (config.clamp) {
    segment = clipped(segment, config.area);
  }

  if (anchor === 'start') {
    x = segment.x0;
    y = segment.y0;
  } else if (anchor === 'end') {
    x = segment.x1;
    y = segment.y1;
  } else {
    x = (segment.x0 + segment.x1) / 2;
    y = (segment.y0 + segment.y1) / 2;
  }

  return aligned(x, y, range.vx, range.vy, config.align);
}

var positioners = {
  arc: function(el, config) {
    var angle = (el.startAngle + el.endAngle) / 2;
    var vx = Math.cos(angle);
    var vy = Math.sin(angle);
    var r0 = el.innerRadius;
    var r1 = el.outerRadius;

    return compute$1({
      x0: el.x + vx * r0,
      y0: el.y + vy * r0,
      x1: el.x + vx * r1,
      y1: el.y + vy * r1,
      vx: vx,
      vy: vy
    }, config);
  },

  point: function(el, config) {
    var v = orient(el, config.origin);
    var rx = v.x * el.options.radius;
    var ry = v.y * el.options.radius;

    return compute$1({
      x0: el.x - rx,
      y0: el.y - ry,
      x1: el.x + rx,
      y1: el.y + ry,
      vx: v.x,
      vy: v.y
    }, config);
  },

  bar: function(el, config) {
    var v = orient(el, config.origin);
    var x = el.x;
    var y = el.y;
    var sx = 0;
    var sy = 0;

    if (el.horizontal) {
      x = Math.min(el.x, el.base);
      sx = Math.abs(el.base - el.x);
    } else {
      y = Math.min(el.y, el.base);
      sy = Math.abs(el.base - el.y);
    }

    return compute$1({
      x0: x,
      y0: y + sy,
      x1: x + sx,
      y1: y,
      vx: v.x,
      vy: v.y
    }, config);
  },

  fallback: function(el, config) {
    var v = orient(el, config.origin);

    return compute$1({
      x0: el.x,
      y0: el.y,
      x1: el.x,
      y1: el.y,
      vx: v.x,
      vy: v.y
    }, config);
  }
};

var rasterize = utils.rasterize;

function boundingRects(model) {
  var borderWidth = model.borderWidth || 0;
  var padding = model.padding;
  var th = model.size.height;
  var tw = model.size.width;
  var tx = -tw / 2;
  var ty = -th / 2;

  return {
    frame: {
      x: tx - padding.left - borderWidth,
      y: ty - padding.top - borderWidth,
      w: tw + padding.width + borderWidth * 2,
      h: th + padding.height + borderWidth * 2
    },
    text: {
      x: tx,
      y: ty,
      w: tw,
      h: th
    }
  };
}

function getScaleOrigin(el, context) {
  var scale = context.chart.getDatasetMeta(context.datasetIndex).vScale;

  if (!scale) {
    return null;
  }

  if (scale.xCenter !== undefined && scale.yCenter !== undefined) {
    return {x: scale.xCenter, y: scale.yCenter};
  }

  var pixel = scale.getBasePixel();
  return el.horizontal ?
    {x: pixel, y: null} :
    {x: null, y: pixel};
}

function getPositioner(el) {
  if (el instanceof ArcElement) {
    return positioners.arc;
  }
  if (el instanceof PointElement) {
    return positioners.point;
  }
  if (el instanceof BarElement) {
    return positioners.bar;
  }
  return positioners.fallback;
}

function drawRoundedRect(ctx, x, y, w, h, radius) {
  var HALF_PI = Math.PI / 2;

  if (radius) {
    var r = Math.min(radius, h / 2, w / 2);
    var left = x + r;
    var top = y + r;
    var right = x + w - r;
    var bottom = y + h - r;

    ctx.moveTo(x, top);
    if (left < right && top < bottom) {
      ctx.arc(left, top, r, -Math.PI, -HALF_PI);
      ctx.arc(right, top, r, -HALF_PI, 0);
      ctx.arc(right, bottom, r, 0, HALF_PI);
      ctx.arc(left, bottom, r, HALF_PI, Math.PI);
    } else if (left < right) {
      ctx.moveTo(left, y);
      ctx.arc(right, top, r, -HALF_PI, HALF_PI);
      ctx.arc(left, top, r, HALF_PI, Math.PI + HALF_PI);
    } else if (top < bottom) {
      ctx.arc(left, top, r, -Math.PI, 0);
      ctx.arc(left, bottom, r, 0, Math.PI);
    } else {
      ctx.arc(left, top, r, -Math.PI, Math.PI);
    }
    ctx.closePath();
    ctx.moveTo(x, y);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function drawFrame(ctx, rect, model) {
  var bgColor = model.backgroundColor;
  var borderColor = model.borderColor;
  var borderWidth = model.borderWidth;

  if (!bgColor && (!borderColor || !borderWidth)) {
    return;
  }

  ctx.beginPath();

  drawRoundedRect(
    ctx,
    rasterize(rect.x) + borderWidth / 2,
    rasterize(rect.y) + borderWidth / 2,
    rasterize(rect.w) - borderWidth,
    rasterize(rect.h) - borderWidth,
    model.borderRadius);

  ctx.closePath();

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fill();
  }

  if (borderColor && borderWidth) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.lineJoin = 'miter';
    ctx.stroke();
  }
}

function textGeometry(rect, align, font) {
  var h = font.lineHeight;
  var w = rect.w;
  var x = rect.x;
  var y = rect.y + h / 2;

  if (align === 'center') {
    x += w / 2;
  } else if (align === 'end' || align === 'right') {
    x += w;
  }

  return {
    h: h,
    w: w,
    x: x,
    y: y
  };
}

function drawTextLine(ctx, text, cfg) {
  var shadow = ctx.shadowBlur;
  var stroked = cfg.stroked;
  var x = rasterize(cfg.x);
  var y = rasterize(cfg.y);
  var w = rasterize(cfg.w);

  if (stroked) {
    ctx.strokeText(text, x, y, w);
  }

  if (cfg.filled) {
    if (shadow && stroked) {
      // Prevent drawing shadow on both the text stroke and fill, so
      // if the text is stroked, remove the shadow for the text fill.
      ctx.shadowBlur = 0;
    }

    ctx.fillText(text, x, y, w);

    if (shadow && stroked) {
      ctx.shadowBlur = shadow;
    }
  }
}

function drawText(ctx, lines, rect, model) {
  var align = model.textAlign;
  var color = model.color;
  var filled = !!color;
  var font = model.font;
  var ilen = lines.length;
  var strokeColor = model.textStrokeColor;
  var strokeWidth = model.textStrokeWidth;
  var stroked = strokeColor && strokeWidth;
  var i;

  if (!ilen || (!filled && !stroked)) {
    return;
  }

  // Adjust coordinates based on text alignment and line height
  rect = textGeometry(rect, align, font);

  ctx.font = font.string;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = model.textShadowBlur;
  ctx.shadowColor = model.textShadowColor;

  if (filled) {
    ctx.fillStyle = color;
  }
  if (stroked) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
  }

  for (i = 0, ilen = lines.length; i < ilen; ++i) {
    drawTextLine(ctx, lines[i], {
      stroked: stroked,
      filled: filled,
      w: rect.w,
      x: rect.x,
      y: rect.y + rect.h * i
    });
  }
}

var Label = function(config, ctx, el, index) {
  var me = this;

  me._config = config;
  me._index = index;
  me._model = null;
  me._rects = null;
  me._ctx = ctx;
  me._el = el;
};

merge(Label.prototype, {
  /**
   * @private
   */
  _modelize: function(display, lines, config, context) {
    var me = this;
    var index = me._index;
    var font = toFont(resolve([config.font, {}], context, index));
    var color = resolve([config.color, defaults$1.color], context, index);

    return {
      align: resolve([config.align, 'center'], context, index),
      anchor: resolve([config.anchor, 'center'], context, index),
      area: context.chart.chartArea,
      backgroundColor: resolve([config.backgroundColor, null], context, index),
      borderColor: resolve([config.borderColor, null], context, index),
      borderRadius: resolve([config.borderRadius, 0], context, index),
      borderWidth: resolve([config.borderWidth, 0], context, index),
      clamp: resolve([config.clamp, false], context, index),
      clip: resolve([config.clip, false], context, index),
      color: color,
      display: display,
      font: font,
      lines: lines,
      offset: resolve([config.offset, 0], context, index),
      opacity: resolve([config.opacity, 1], context, index),
      origin: getScaleOrigin(me._el, context),
      padding: toPadding(resolve([config.padding, 0], context, index)),
      positioner: getPositioner(me._el),
      rotation: resolve([config.rotation, 0], context, index) * (Math.PI / 180),
      size: utils.textSize(me._ctx, lines, font),
      textAlign: resolve([config.textAlign, 'start'], context, index),
      textShadowBlur: resolve([config.textShadowBlur, 0], context, index),
      textShadowColor: resolve([config.textShadowColor, color], context, index),
      textStrokeColor: resolve([config.textStrokeColor, color], context, index),
      textStrokeWidth: resolve([config.textStrokeWidth, 0], context, index)
    };
  },

  update: function(context) {
    var me = this;
    var model = null;
    var rects = null;
    var index = me._index;
    var config = me._config;
    var value, label, lines;

    // We first resolve the display option (separately) to avoid computing
    // other options in case the label is hidden (i.e. display: false).
    var display = resolve([config.display, true], context, index);

    if (display) {
      value = context.dataset.data[index];
      label = valueOrDefault(callback(config.formatter, [value, context]), value);
      lines = isNullOrUndef(label) ? [] : utils.toTextLines(label);

      if (lines.length) {
        model = me._modelize(display, lines, config, context);
        rects = boundingRects(model);
      }
    }

    me._model = model;
    me._rects = rects;
  },

  geometry: function() {
    return this._rects ? this._rects.frame : {};
  },

  rotation: function() {
    return this._model ? this._model.rotation : 0;
  },

  visible: function() {
    return this._model && this._model.opacity;
  },

  model: function() {
    return this._model;
  },

  draw: function(chart, center) {
    var me = this;
    var ctx = chart.ctx;
    var model = me._model;
    var rects = me._rects;
    var area;

    if (!this.visible()) {
      return;
    }

    ctx.save();

    if (model.clip) {
      area = model.area;
      ctx.beginPath();
      ctx.rect(
        area.left,
        area.top,
        area.right - area.left,
        area.bottom - area.top);
      ctx.clip();
    }

    ctx.globalAlpha = utils.bound(0, model.opacity, 1);
    ctx.translate(rasterize(center.x), rasterize(center.y));
    ctx.rotate(model.rotation);

    drawFrame(ctx, rects.frame, model);
    drawText(ctx, model.lines, rects.text, model);

    ctx.restore();
  }
});

var MIN_INTEGER = Number.MIN_SAFE_INTEGER || -9007199254740991; // eslint-disable-line es/no-number-minsafeinteger
var MAX_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;  // eslint-disable-line es/no-number-maxsafeinteger

function rotated(point, center, angle) {
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  var cx = center.x;
  var cy = center.y;

  return {
    x: cx + cos * (point.x - cx) - sin * (point.y - cy),
    y: cy + sin * (point.x - cx) + cos * (point.y - cy)
  };
}

function projected(points, axis) {
  var min = MAX_INTEGER;
  var max = MIN_INTEGER;
  var origin = axis.origin;
  var i, pt, vx, vy, dp;

  for (i = 0; i < points.length; ++i) {
    pt = points[i];
    vx = pt.x - origin.x;
    vy = pt.y - origin.y;
    dp = axis.vx * vx + axis.vy * vy;
    min = Math.min(min, dp);
    max = Math.max(max, dp);
  }

  return {
    min: min,
    max: max
  };
}

function toAxis(p0, p1) {
  var vx = p1.x - p0.x;
  var vy = p1.y - p0.y;
  var ln = Math.sqrt(vx * vx + vy * vy);

  return {
    vx: (p1.x - p0.x) / ln,
    vy: (p1.y - p0.y) / ln,
    origin: p0,
    ln: ln
  };
}

var HitBox = function() {
  this._rotation = 0;
  this._rect = {
    x: 0,
    y: 0,
    w: 0,
    h: 0
  };
};

merge(HitBox.prototype, {
  center: function() {
    var r = this._rect;
    return {
      x: r.x + r.w / 2,
      y: r.y + r.h / 2
    };
  },

  update: function(center, rect, rotation) {
    this._rotation = rotation;
    this._rect = {
      x: rect.x + center.x,
      y: rect.y + center.y,
      w: rect.w,
      h: rect.h
    };
  },

  contains: function(point) {
    var me = this;
    var margin = 1;
    var rect = me._rect;

    point = rotated(point, me.center(), -me._rotation);

    return !(point.x < rect.x - margin
      || point.y < rect.y - margin
      || point.x > rect.x + rect.w + margin * 2
      || point.y > rect.y + rect.h + margin * 2);
  },

  // Separating Axis Theorem
  // https://gamedevelopment.tutsplus.com/tutorials/collision-detection-using-the-separating-axis-theorem--gamedev-169
  intersects: function(other) {
    var r0 = this._points();
    var r1 = other._points();
    var axes = [
      toAxis(r0[0], r0[1]),
      toAxis(r0[0], r0[3])
    ];
    var i, pr0, pr1;

    if (this._rotation !== other._rotation) {
      // Only separate with r1 axis if the rotation is different,
      // else it's enough to separate r0 and r1 with r0 axis only!
      axes.push(
        toAxis(r1[0], r1[1]),
        toAxis(r1[0], r1[3])
      );
    }

    for (i = 0; i < axes.length; ++i) {
      pr0 = projected(r0, axes[i]);
      pr1 = projected(r1, axes[i]);

      if (pr0.max < pr1.min || pr1.max < pr0.min) {
        return false;
      }
    }

    return true;
  },

  /**
   * @private
   */
  _points: function() {
    var me = this;
    var rect = me._rect;
    var angle = me._rotation;
    var center = me.center();

    return [
      rotated({x: rect.x, y: rect.y}, center, angle),
      rotated({x: rect.x + rect.w, y: rect.y}, center, angle),
      rotated({x: rect.x + rect.w, y: rect.y + rect.h}, center, angle),
      rotated({x: rect.x, y: rect.y + rect.h}, center, angle)
    ];
  }
});

function coordinates(el, model, geometry) {
  var point = model.positioner(el, model);
  var vx = point.vx;
  var vy = point.vy;

  if (!vx && !vy) {
    // if aligned center, we don't want to offset the center point
    return {x: point.x, y: point.y};
  }

  var w = geometry.w;
  var h = geometry.h;

  // take in account the label rotation
  var rotation = model.rotation;
  var dx = Math.abs(w / 2 * Math.cos(rotation)) + Math.abs(h / 2 * Math.sin(rotation));
  var dy = Math.abs(w / 2 * Math.sin(rotation)) + Math.abs(h / 2 * Math.cos(rotation));

  // scale the unit vector (vx, vy) to get at least dx or dy equal to
  // w or h respectively (else we would calculate the distance to the
  // ellipse inscribed in the bounding rect)
  var vs = 1 / Math.max(Math.abs(vx), Math.abs(vy));
  dx *= vx * vs;
  dy *= vy * vs;

  // finally, include the explicit offset
  dx += model.offset * vx;
  dy += model.offset * vy;

  return {
    x: point.x + dx,
    y: point.y + dy
  };
}

function collide(labels, collider) {
  var i, j, s0, s1;

  // IMPORTANT Iterate in the reverse order since items at the end of the
  // list have an higher weight/priority and thus should be less impacted
  // by the overlapping strategy.

  for (i = labels.length - 1; i >= 0; --i) {
    s0 = labels[i].$layout;

    for (j = i - 1; j >= 0 && s0._visible; --j) {
      s1 = labels[j].$layout;

      if (s1._visible && s0._box.intersects(s1._box)) {
        collider(s0, s1);
      }
    }
  }

  return labels;
}

function compute(labels) {
  var i, ilen, label, state, geometry, center, proxy;

  // Initialize labels for overlap detection
  for (i = 0, ilen = labels.length; i < ilen; ++i) {
    label = labels[i];
    state = label.$layout;

    if (state._visible) {
      // Chart.js 3 removed el._model in favor of getProps(), making harder to
      // abstract reading values in positioners. Also, using string arrays to
      // read values (i.e. var {a,b,c} = el.getProps(["a","b","c"])) would make
      // positioners inefficient in the normal case (i.e. not the final values)
      // and the code a bit ugly, so let's use a Proxy instead.
      proxy = new Proxy(label._el, {get: (el, p) => el.getProps([p], true)[p]});

      geometry = label.geometry();
      center = coordinates(proxy, label.model(), geometry);
      state._box.update(center, geometry, label.rotation());
    }
  }

  // Auto hide overlapping labels
  return collide(labels, function(s0, s1) {
    var h0 = s0._hidable;
    var h1 = s1._hidable;

    if ((h0 && h1) || h1) {
      s1._visible = false;
    } else if (h0) {
      s0._visible = false;
    }
  });
}

var layout = {
  prepare: function(datasets) {
    var labels = [];
    var i, j, ilen, jlen, label;

    for (i = 0, ilen = datasets.length; i < ilen; ++i) {
      for (j = 0, jlen = datasets[i].length; j < jlen; ++j) {
        label = datasets[i][j];
        labels.push(label);
        label.$layout = {
          _box: new HitBox(),
          _hidable: false,
          _visible: true,
          _set: i,
          _idx: j
        };
      }
    }

    // TODO New `z` option: labels with a higher z-index are drawn
    // of top of the ones with a lower index. Lowest z-index labels
    // are also discarded first when hiding overlapping labels.
    labels.sort(function(a, b) {
      var sa = a.$layout;
      var sb = b.$layout;

      return sa._idx === sb._idx
        ? sb._set - sa._set
        : sb._idx - sa._idx;
    });

    this.update(labels);

    return labels;
  },

  update: function(labels) {
    var dirty = false;
    var i, ilen, label, model, state;

    for (i = 0, ilen = labels.length; i < ilen; ++i) {
      label = labels[i];
      model = label.model();
      state = label.$layout;
      state._hidable = model && model.display === 'auto';
      state._visible = label.visible();
      dirty |= state._hidable;
    }

    if (dirty) {
      compute(labels);
    }
  },

  lookup: function(labels, point) {
    var i, state;

    // IMPORTANT Iterate in the reverse order since items at the end of
    // the list have an higher z-index, thus should be picked first.

    for (i = labels.length - 1; i >= 0; --i) {
      state = labels[i].$layout;

      if (state && state._visible && state._box.contains(point)) {
        return labels[i];
      }
    }

    return null;
  },

  draw: function(chart, labels) {
    var i, ilen, label, state, geometry, center;

    for (i = 0, ilen = labels.length; i < ilen; ++i) {
      label = labels[i];
      state = label.$layout;

      if (state._visible) {
        geometry = label.geometry();
        center = coordinates(label._el, label.model(), geometry);
        state._box.update(center, geometry, label.rotation());
        label.draw(chart, center);
      }
    }
  }
};

var formatter = function(value) {
  if (isNullOrUndef(value)) {
    return null;
  }

  var label = value;
  var keys, klen, k;
  if (isObject(value)) {
    if (!isNullOrUndef(value.label)) {
      label = value.label;
    } else if (!isNullOrUndef(value.r)) {
      label = value.r;
    } else {
      label = '';
      keys = Object.keys(value);
      for (k = 0, klen = keys.length; k < klen; ++k) {
        label += (k !== 0 ? ', ' : '') + keys[k] + ': ' + value[keys[k]];
      }
    }
  }

  return '' + label;
};

/**
 * IMPORTANT: make sure to also update tests and TypeScript definition
 * files (`/test/specs/defaults.spec.js` and `/types/options.d.ts`)
 */

var defaults = {
  align: 'center',
  anchor: 'center',
  backgroundColor: null,
  borderColor: null,
  borderRadius: 0,
  borderWidth: 0,
  clamp: false,
  clip: false,
  color: undefined,
  display: true,
  font: {
    family: undefined,
    lineHeight: 1.2,
    size: undefined,
    style: undefined,
    weight: null
  },
  formatter: formatter,
  labels: undefined,
  listeners: {},
  offset: 4,
  opacity: 1,
  padding: {
    top: 4,
    right: 4,
    bottom: 4,
    left: 4
  },
  rotation: 0,
  textAlign: 'start',
  textStrokeColor: undefined,
  textStrokeWidth: 0,
  textShadowBlur: 0,
  textShadowColor: undefined
};

/**
 * @see https://github.com/chartjs/Chart.js/issues/4176
 */

var EXPANDO_KEY = '$datalabels';
var DEFAULT_KEY = '$default';

function configure(dataset, options) {
  var override = dataset.datalabels;
  var listeners = {};
  var configs = [];
  var labels, keys;

  if (override === false) {
    return null;
  }
  if (override === true) {
    override = {};
  }

  options = merge({}, [options, override]);
  labels = options.labels || {};
  keys = Object.keys(labels);
  delete options.labels;

  if (keys.length) {
    keys.forEach(function(key) {
      if (labels[key]) {
        configs.push(merge({}, [
          options,
          labels[key],
          {_key: key}
        ]));
      }
    });
  } else {
    // Default label if no "named" label defined.
    configs.push(options);
  }

  // listeners: {<event-type>: {<label-key>: <fn>}}
  listeners = configs.reduce(function(target, config) {
    each(config.listeners || {}, function(fn, event) {
      target[event] = target[event] || {};
      target[event][config._key || DEFAULT_KEY] = fn;
    });

    delete config.listeners;
    return target;
  }, {});

  return {
    labels: configs,
    listeners: listeners
  };
}

function dispatchEvent(chart, listeners, label) {
  if (!listeners) {
    return;
  }

  var context = label.$context;
  var groups = label.$groups;
  var callback$1;

  if (!listeners[groups._set]) {
    return;
  }

  callback$1 = listeners[groups._set][groups._key];
  if (!callback$1) {
    return;
  }

  if (callback(callback$1, [context]) === true) {
    // Users are allowed to tweak the given context by injecting values that can be
    // used in scriptable options to display labels differently based on the current
    // event (e.g. highlight an hovered label). That's why we update the label with
    // the output context and schedule a new chart render by setting it dirty.
    chart[EXPANDO_KEY]._dirty = true;
    label.update(context);
  }
}

function dispatchMoveEvents(chart, listeners, previous, label) {
  var enter, leave;

  if (!previous && !label) {
    return;
  }

  if (!previous) {
    enter = true;
  } else if (!label) {
    leave = true;
  } else if (previous !== label) {
    leave = enter = true;
  }

  if (leave) {
    dispatchEvent(chart, listeners.leave, previous);
  }
  if (enter) {
    dispatchEvent(chart, listeners.enter, label);
  }
}

function handleMoveEvents(chart, event) {
  var expando = chart[EXPANDO_KEY];
  var listeners = expando._listeners;
  var previous, label;

  if (!listeners.enter && !listeners.leave) {
    return;
  }

  if (event.type === 'mousemove') {
    label = layout.lookup(expando._labels, event);
  } else if (event.type !== 'mouseout') {
    return;
  }

  previous = expando._hovered;
  expando._hovered = label;
  dispatchMoveEvents(chart, listeners, previous, label);
}

function handleClickEvents(chart, event) {
  var expando = chart[EXPANDO_KEY];
  var handlers = expando._listeners.click;
  var label = handlers && layout.lookup(expando._labels, event);
  if (label) {
    dispatchEvent(chart, handlers, label);
  }
}

var plugin = {
  id: 'datalabels',

  defaults: defaults,

  beforeInit: function(chart) {
    chart[EXPANDO_KEY] = {
      _actives: []
    };
  },

  beforeUpdate: function(chart) {
    var expando = chart[EXPANDO_KEY];
    expando._listened = false;
    expando._listeners = {};     // {<event-type>: {<dataset-index>: {<label-key>: <fn>}}}
    expando._datasets = [];      // per dataset labels: [Label[]]
    expando._labels = [];        // layouted labels: Label[]
  },

  afterDatasetUpdate: function(chart, args, options) {
    var datasetIndex = args.index;
    var expando = chart[EXPANDO_KEY];
    var labels = expando._datasets[datasetIndex] = [];
    var visible = chart.isDatasetVisible(datasetIndex);
    var dataset = chart.data.datasets[datasetIndex];
    var config = configure(dataset, options);
    var elements = args.meta.data || [];
    var ctx = chart.ctx;
    var i, j, ilen, jlen, cfg, key, el, label;

    ctx.save();

    for (i = 0, ilen = elements.length; i < ilen; ++i) {
      el = elements[i];
      el[EXPANDO_KEY] = [];

      if (visible && el && chart.getDataVisibility(i) && !el.skip) {
        for (j = 0, jlen = config.labels.length; j < jlen; ++j) {
          cfg = config.labels[j];
          key = cfg._key;

          label = new Label(cfg, ctx, el, i);
          label.$groups = {
            _set: datasetIndex,
            _key: key || DEFAULT_KEY
          };
          label.$context = {
            active: false,
            chart: chart,
            dataIndex: i,
            dataset: dataset,
            datasetIndex: datasetIndex
          };

          label.update(label.$context);
          el[EXPANDO_KEY].push(label);
          labels.push(label);
        }
      }
    }

    ctx.restore();

    // Store listeners at the chart level and per event type to optimize
    // cases where no listeners are registered for a specific event.
    merge(expando._listeners, config.listeners, {
      merger: function(event, target, source) {
        target[event] = target[event] || {};
        target[event][args.index] = source[event];
        expando._listened = true;
      }
    });
  },

  afterUpdate: function(chart, options) {
    chart[EXPANDO_KEY]._labels = layout.prepare(
      chart[EXPANDO_KEY]._datasets,
      options);
  },

  // Draw labels on top of all dataset elements
  // https://github.com/chartjs/chartjs-plugin-datalabels/issues/29
  // https://github.com/chartjs/chartjs-plugin-datalabels/issues/32
  afterDatasetsDraw: function(chart) {
    layout.draw(chart, chart[EXPANDO_KEY]._labels);
  },

  beforeEvent: function(chart, args) {
    // If there is no listener registered for this chart, `listened` will be false,
    // meaning we can immediately ignore the incoming event and avoid useless extra
    // computation for users who don't implement label interactions.
    if (chart[EXPANDO_KEY]._listened) {
      var event = args.event;
      switch (event.type) {
      case 'mousemove':
      case 'mouseout':
        handleMoveEvents(chart, event);
        break;
      case 'click':
        handleClickEvents(chart, event);
        break;
      }
    }
  },

  afterEvent: function(chart) {
    var expando = chart[EXPANDO_KEY];
    var previous = expando._actives;
    var actives = expando._actives = chart.getActiveElements();
    var updates = utils.arrayDiff(previous, actives);
    var i, ilen, j, jlen, update, label, labels;

    for (i = 0, ilen = updates.length; i < ilen; ++i) {
      update = updates[i];
      if (update[1]) {
        labels = update[0].element[EXPANDO_KEY] || [];
        for (j = 0, jlen = labels.length; j < jlen; ++j) {
          label = labels[j];
          label.$context.active = (update[1] === 1);
          label.update(label.$context);
        }
      }
    }

    if (expando._dirty || updates.length) {
      layout.update(expando._labels);
      chart.render();
    }

    delete expando._dirty;
  }
};

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var alasql_min = {exports: {}};

(function (module, exports) {
!function(e,t){module.exports=t();}(commonjsGlobal,function(){var bi=function(e,t,n,r){if(t=t||[],"function"!=typeof importScripts&&bi.webworker){var s=bi.lastid++;return bi.buffer[s]=n,void bi.webworker.postMessage({id:s,sql:e,params:t})}return 0===arguments.length?new k.Select({columns:[new k.Column({columnid:"*"})],from:[new k.ParamValue({param:0})]}):1===arguments.length&&e.constructor===Array?bi.promise(e):("function"==typeof t&&(r=n,n=t,t=[]),"object"!=typeof t&&(t=[t]),"string"==typeof e&&"#"===e[0]&&"object"==typeof document?e=document.querySelector(e).textContent:"object"==typeof e&&e instanceof HTMLElement?e=e.textContent:"function"==typeof e&&(e=e.toString(),e=(/\/\*([\S\s]+)\*\//m.exec(e)||["","Function given as SQL. Plese Provide SQL string or have a /* ... */ syle comment with SQL in the function."])[1]),bi.exec(e,t,n,r))};bi.version="1.7.3-develop-0be167bcundefined",bi.debug=void 0;function H(){return null}var t=function(){var e=function(e,t,n,r){for(n=n||{},r=e.length;r--;n[e[r]]=t);return n},t=[2,13],n=[1,104],r=[1,102],s=[1,103],a=[1,6],i=[1,42],o=[1,79],u=[1,76],c=[1,94],l=[1,93],h=[1,69],d=[1,101],f=[1,85],p=[1,64],b=[1,71],E=[1,84],g=[1,66],m=[1,70],S=[1,68],T=[1,61],v=[1,74],A=[1,62],y=[1,67],N=[1,83],C=[1,77],R=[1,86],O=[1,87],w=[1,81],I=[1,82],x=[1,80],k=[1,88],D=[1,89],L=[1,90],$=[1,91],M=[1,92],U=[1,98],_=[1,65],F=[1,78],P=[1,72],q=[1,96],G=[1,97],V=[1,63],B=[1,73],j=[1,108],H=[1,107],J=[10,308,604,765],Y=[10,308,312,604,765],W=[1,115],X=[1,116],K=[1,117],Q=[1,118],z=[1,119],Z=[130,355,412],ee=[1,127],te=[1,126],ne=[1,134],re=[1,164],se=[1,175],ae=[1,178],ie=[1,173],oe=[1,181],ue=[1,185],ce=[1,160],le=[1,182],he=[1,169],de=[1,171],fe=[1,174],pe=[1,183],be=[1,199],Ee=[1,200],ge=[1,166],me=[1,193],Se=[1,188],Te=[1,189],ve=[1,194],Ae=[1,195],ye=[1,196],Ne=[1,197],Ce=[1,198],Re=[1,201],Oe=[1,202],we=[1,176],Ie=[1,177],xe=[1,179],ke=[1,180],De=[1,186],Le=[1,192],$e=[1,184],Me=[1,187],Ue=[1,172],_e=[1,170],Fe=[1,191],Pe=[1,203],qe=[2,4,5],Ge=[2,474],Ve=[1,206],Be=[1,211],je=[1,220],He=[1,216],Je=[10,72,78,93,98,118,128,162,168,169,183,198,232,249,251,308,312,604,765],Ye=[2,4,5,10,72,76,77,78,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,183,185,187,198,244,245,284,285,286,287,288,289,290,308,312,422,426,604,765],We=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],Xe=[1,249],Ke=[1,256],Qe=[1,265],ze=[1,270],Ze=[1,269],et=[2,4,5,10,72,77,78,93,98,107,118,128,131,132,137,143,145,149,152,154,156,162,168,169,179,180,181,183,198,232,244,245,249,251,269,270,274,275,277,284,285,286,287,288,289,290,292,293,294,295,296,297,298,299,300,301,304,305,308,312,314,319,422,426,604,765],tt=[2,162],nt=[1,281],rt=[10,74,78,308,312,507,604,765],st=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,193,198,206,208,222,223,224,225,226,227,228,229,230,231,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,299,302,304,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,345,346,358,370,371,372,375,376,388,391,398,402,403,404,405,406,407,408,410,411,419,420,422,426,428,435,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,516,517,518,519,604,765],at=[2,4,5,10,53,72,89,124,146,156,189,270,271,292,308,337,340,341,398,402,403,406,408,410,411,419,420,436,438,439,441,442,443,444,445,449,450,453,454,507,509,510,519,604,765],it=[1,562],ot=[1,564],ut=[2,506],ct=[1,569],lt=[1,580],ht=[1,583],dt=[1,584],ft=[10,78,89,132,137,146,189,298,308,312,472,604,765],pt=[10,74,308,312,604,765],bt=[2,570],Et=[1,602],gt=[2,4,5,156],mt=[1,640],St=[1,612],Tt=[1,646],vt=[1,647],At=[1,620],yt=[1,631],Nt=[1,618],Ct=[1,626],Rt=[1,619],Ot=[1,627],wt=[1,629],It=[1,621],xt=[1,622],kt=[1,641],Dt=[1,638],Lt=[1,639],$t=[1,615],Mt=[1,617],Ut=[1,609],_t=[1,610],Ft=[1,611],Pt=[1,613],qt=[1,614],Gt=[1,616],Vt=[1,623],Bt=[1,624],jt=[1,628],Ht=[1,630],Jt=[1,632],Yt=[1,633],Wt=[1,634],Xt=[1,635],Kt=[1,636],Qt=[1,642],zt=[1,643],Zt=[1,644],en=[1,645],tn=[2,290],nn=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,230,231,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,299,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,345,358,370,371,375,376,398,402,403,406,408,410,411,419,420,422,426,428,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],rn=[2,362],sn=[1,668],an=[1,678],on=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,230,231,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,428,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],un=[1,694],cn=[1,703],ln=[1,702],hn=[2,4,5,10,72,74,78,93,98,118,128,162,168,169,206,208,222,223,224,225,226,227,228,229,230,231,232,249,251,308,312,604,765],dn=[10,72,74,78,93,98,118,128,162,168,169,206,208,222,223,224,225,226,227,228,229,230,231,232,249,251,308,312,604,765],fn=[2,202],pn=[1,725],bn=[10,72,78,93,98,118,128,162,168,169,183,232,249,251,308,312,604,765],En=[2,163],gn=[1,728],mn=[2,4,5,112],Sn=[1,741],Tn=[1,760],vn=[1,740],An=[1,739],yn=[1,734],Nn=[1,735],Cn=[1,737],Rn=[1,738],On=[1,742],wn=[1,743],In=[1,744],xn=[1,745],kn=[1,746],Dn=[1,747],Ln=[1,748],$n=[1,749],Mn=[1,750],Un=[1,751],_n=[1,752],Fn=[1,753],Pn=[1,754],qn=[1,755],Gn=[1,756],Vn=[1,757],Bn=[1,759],jn=[1,761],Hn=[1,762],Jn=[1,763],Yn=[1,764],Wn=[1,765],Xn=[1,766],Kn=[1,767],Qn=[1,770],zn=[1,771],Zn=[1,772],er=[1,773],tr=[1,774],nr=[1,775],rr=[1,776],sr=[1,777],ar=[1,778],ir=[1,779],or=[1,780],ur=[1,781],cr=[74,89,189],lr=[10,74,78,154,187,230,299,308,312,345,358,370,371,375,376,604,765],hr=[1,798],dr=[10,74,78,302,308,312,604,765],fr=[1,799],pr=[1,805],br=[1,806],Er=[1,810],gr=[10,74,78,308,312,604,765],mr=[2,4,5,77,131,132,137,143,145,149,152,154,156,179,180,181,244,245,269,270,274,275,277,284,285,286,287,288,289,290,292,293,294,295,296,297,298,299,300,301,304,305,314,319,422,426],Sr=[10,72,78,93,98,107,118,128,162,168,169,183,198,232,249,251,308,312,604,765],Tr=[2,4,5,10,72,77,78,93,98,107,118,128,131,132,137,143,145,149,152,154,156,162,164,168,169,179,180,181,183,185,187,195,198,232,244,245,249,251,269,270,274,275,277,284,285,286,287,288,289,290,292,293,294,295,296,297,298,299,300,301,304,305,308,312,314,319,422,426,604,765],vr=[2,4,5,132,298],Ar=[1,844],yr=[10,74,76,78,308,312,604,765],Nr=[2,741],Cr=[10,74,76,78,132,139,141,145,152,308,312,422,426,604,765],Rr=[2,1164],Or=[10,74,76,78,139,141,145,152,308,312,422,426,604,765],wr=[10,74,76,78,139,141,145,308,312,422,426,604,765],Ir=[10,74,78,139,141,308,312,604,765],xr=[10,78,89,132,146,189,298,308,312,472,604,765],kr=[337,340,341],Dr=[2,767],Lr=[1,869],$r=[1,870],Mr=[1,871],Ur=[1,872],_r=[1,881],Fr=[1,880],Pr=[164,166,336],qr=[2,447],Gr=[1,936],Vr=[2,4,5,77,131,156,292,293,294,295],Br=[1,951],jr=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,118,122,124,128,129,130,131,132,134,135,137,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,315,316,317,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],Hr=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,314,315,316,317,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],Jr=[2,378],Yr=[1,958],Wr=[308,310,312],Xr=[74,302],Kr=[74,302,428],Qr=[1,965],zr=[2,4,5,10,53,72,74,76,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],Zr=[74,428],es=[1,978],ts=[1,977],ns=[1,984],rs=[10,72,78,93,98,118,128,162,168,169,232,249,251,308,312,604,765],ss=[1,1010],as=[10,72,78,308,312,604,765],is=[1,1016],os=[1,1017],us=[1,1018],cs=[2,4,5,10,72,74,76,77,78,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,198,244,245,284,285,286,287,288,289,290,308,312,422,426,604,765],ls=[1,1068],hs=[1,1067],ds=[1,1081],fs=[1,1080],ps=[1,1088],bs=[10,72,74,78,93,98,107,118,128,162,168,169,183,198,232,249,251,308,312,604,765],Es=[1,1119],gs=[10,78,89,146,189,308,312,472,604,765],ms=[1,1139],Ss=[1,1138],Ts=[1,1137],vs=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,230,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,299,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,345,358,370,371,375,376,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],As=[1,1153],ys=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,118,122,124,128,129,130,131,132,134,135,137,139,140,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,315,316,317,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],Ns=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,118,122,124,128,129,130,131,132,134,135,137,139,140,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,315,317,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],Cs=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,118,122,124,128,129,130,131,132,133,134,135,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,315,316,317,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],Rs=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,118,122,124,128,129,130,131,132,134,135,137,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,315,316,317,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],Os=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,118,122,124,128,129,130,131,132,134,135,137,139,140,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,316,322,323,324,325,326,327,328,332,333,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],ws=[2,409],Is=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,107,118,122,128,129,130,131,132,134,135,137,143,145,146,148,149,150,152,156,162,164,166,168,169,170,171,172,173,175,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,316,332,333,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],xs=[2,288],ks=[2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,428,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],Ds=[10,78,308,312,604,765],Ls=[1,1189],$s=[10,77,78,143,145,152,181,304,308,312,422,426,604,765],Ms=[10,74,78,308,310,312,466,604,765],Us=[1,1200],_s=[10,72,78,118,128,162,168,169,232,249,251,308,312,604,765],Fs=[10,72,74,78,93,98,118,128,162,168,169,183,198,232,249,251,308,312,604,765],Ps=[2,4,5,72,76,77,78,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,185,187,244,245,284,285,286,287,288,289,290,422,426],qs=[2,4,5,72,74,76,77,78,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,185,187,244,245,284,285,286,287,288,289,290,422,426],Gs=[2,1088],Vs=[2,4,5,72,74,76,77,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,185,187,244,245,284,285,286,287,288,289,290,422,426],Bs=[1,1252],js=[10,74,78,128,308,310,312,466,604,765],Hs=[115,116,124],Js=[2,587],Ys=[1,1280],Ws=[76,139],Xs=[2,727],Ks=[1,1297],Qs=[1,1298],zs=[2,4,5,10,53,72,76,89,124,146,156,189,230,270,271,292,308,312,337,340,341,398,402,403,406,408,410,411,419,420,436,438,439,441,442,443,444,445,449,450,453,454,507,509,510,519,604,765],Zs=[2,333],ea=[1,1322],ta=[1,1336],na=[1,1338],ra=[2,490],sa=[74,78],aa=[10,308,310,312,466,604,765],ia=[10,72,78,118,162,168,169,232,249,251,308,312,604,765],oa=[1,1354],ua=[1,1358],ca=[1,1359],la=[1,1361],ha=[1,1362],da=[1,1363],fa=[1,1364],pa=[1,1365],ba=[1,1366],Ea=[1,1367],ga=[1,1368],ma=[10,72,74,78,93,98,118,128,162,168,169,206,208,222,223,224,225,226,227,228,229,232,249,251,308,312,604,765],Sa=[1,1393],Ta=[10,72,78,118,162,168,169,249,251,308,312,604,765],va=[10,72,78,93,98,118,128,162,168,169,206,208,222,223,224,225,226,227,228,229,232,249,251,308,312,604,765],Aa=[1,1490],ya=[1,1492],Na=[2,4,5,77,143,145,152,156,181,292,293,294,295,304,422,426],Ca=[1,1506],Ra=[10,72,74,78,162,168,169,249,251,308,312,604,765],Oa=[1,1524],wa=[1,1526],Ia=[1,1527],xa=[1,1523],ka=[1,1522],Da=[1,1521],La=[1,1528],$a=[1,1518],Ma=[1,1519],Ua=[1,1520],_a=[1,1545],Fa=[2,4,5,10,53,72,89,124,146,156,189,270,271,292,308,312,337,340,341,398,402,403,406,408,410,411,419,420,436,438,439,441,442,443,444,445,449,450,453,454,507,509,510,519,604,765],Pa=[1,1556],qa=[1,1564],Ga=[1,1563],Va=[10,72,78,162,168,169,249,251,308,312,604,765],Ba=[10,72,78,93,98,118,128,162,168,169,206,208,222,223,224,225,226,227,228,229,230,231,232,249,251,308,312,604,765],ja=[2,4,5,10,72,78,93,98,118,128,162,168,169,206,208,222,223,224,225,226,227,228,229,230,231,232,249,251,308,312,604,765],Ha=[1,1623],Ja=[1,1625],Ya=[1,1622],Wa=[1,1624],Xa=[187,193,370,371,372,375],Ka=[2,518],Qa=[1,1630],za=[1,1649],Za=[10,72,78,162,168,169,308,312,604,765],ei=[1,1659],ti=[1,1660],ni=[1,1661],ri=[1,1682],si=[4,10,247,308,312,345,358,604,765],ai=[1,1730],ii=[10,72,74,78,118,162,168,169,239,249,251,308,312,604,765],oi=[2,4,5,77],ui=[1,1824],ci=[1,1836],li=[1,1855],hi=[10,72,78,162,168,169,308,312,417,604,765],di=[10,74,78,230,308,312,604,765],e={trace:function(){},yy:{},symbols_:{error:2,Literal:3,LITERAL:4,BRALITERAL:5,NonReserved:6,LiteralWithSpaces:7,main:8,Statements:9,EOF:10,Statements_group0:11,AStatement:12,ExplainStatement:13,EXPLAIN:14,QUERY:15,PLAN:16,Statement:17,AlterTable:18,AttachDatabase:19,Call:20,CreateDatabase:21,CreateIndex:22,CreateGraph:23,CreateTable:24,CreateView:25,CreateEdge:26,CreateVertex:27,Declare:28,Delete:29,DetachDatabase:30,DropDatabase:31,DropIndex:32,DropTable:33,DropView:34,If:35,Insert:36,Merge:37,Reindex:38,RenameTable:39,Select:40,ShowCreateTable:41,ShowColumns:42,ShowDatabases:43,ShowIndex:44,ShowTables:45,TruncateTable:46,WithSelect:47,CreateTrigger:48,DropTrigger:49,BeginTransaction:50,CommitTransaction:51,RollbackTransaction:52,EndTransaction:53,UseDatabase:54,Update:55,JavaScript:56,Source:57,Assert:58,While:59,Continue:60,Break:61,BeginEnd:62,Print:63,Require:64,SetVariable:65,ExpressionStatement:66,AddRule:67,Query:68,Echo:69,CreateFunction:70,CreateAggregate:71,WITH:72,WithTablesList:73,COMMA:74,WithTable:75,AS:76,LPAR:77,RPAR:78,SelectClause:79,Select_option0:80,IntoClause:81,FromClause:82,Select_option1:83,WhereClause:84,GroupClause:85,OrderClause:86,LimitClause:87,UnionClause:88,SEARCH:89,Select_repetition0:90,Select_option2:91,PivotClause:92,PIVOT:93,Expression:94,FOR:95,PivotClause_option0:96,PivotClause_option1:97,UNPIVOT:98,IN:99,ColumnsList:100,PivotClause_option2:101,PivotClause2:102,AsList:103,AsLiteral:104,AsPart:105,RemoveClause:106,REMOVE:107,RemoveClause_option0:108,RemoveColumnsList:109,RemoveColumn:110,Column:111,LIKE:112,StringValue:113,ArrowDot:114,ARROW:115,DOT:116,SearchSelector:117,ORDER:118,BY:119,OrderExpressionsList:120,SearchSelector_option0:121,DOTDOT:122,CARET:123,EQ:124,SearchSelector_repetition_plus0:125,SearchSelector_repetition_plus1:126,SearchSelector_option1:127,WHERE:128,OF:129,CLASS:130,NUMBER:131,STRING:132,SLASH:133,VERTEX:134,EDGE:135,EXCLAMATION:136,SHARP:137,MODULO:138,GT:139,LT:140,GTGT:141,LTLT:142,DOLLAR:143,Json:144,AT:145,SET:146,SetColumnsList:147,TO:148,VALUE:149,ROW:150,ExprList:151,COLON:152,PlusStar:153,NOT:154,SearchSelector_repetition2:155,IF:156,SearchSelector_repetition3:157,Aggregator:158,SearchSelector_repetition4:159,SearchSelector_group0:160,SearchSelector_repetition5:161,UNION:162,SearchSelectorList:163,ALL:164,SearchSelector_repetition6:165,ANY:166,SearchSelector_repetition7:167,INTERSECT:168,EXCEPT:169,AND:170,OR:171,PATH:172,RETURN:173,ResultColumns:174,REPEAT:175,SearchSelector_repetition8:176,SearchSelectorList_repetition0:177,SearchSelectorList_repetition1:178,PLUS:179,STAR:180,QUESTION:181,SearchFrom:182,FROM:183,SelectModifier:184,DISTINCT:185,TopClause:186,UNIQUE:187,SelectClause_option0:188,SELECT:189,COLUMN:190,MATRIX:191,TEXTSTRING:192,INDEX:193,RECORDSET:194,TOP:195,NumValue:196,TopClause_option0:197,INTO:198,Table:199,FuncValue:200,ParamValue:201,VarValue:202,FromTablesList:203,JoinTablesList:204,ApplyClause:205,CROSS:206,APPLY:207,OUTER:208,FromTable:209,FromTable_option0:210,FromTable_option1:211,INDEXED:212,INSERTED:213,FromString:214,JoinTable:215,JoinMode:216,JoinTableAs:217,OnClause:218,JoinTableAs_option0:219,JoinTableAs_option1:220,JoinModeMode:221,NATURAL:222,JOIN:223,INNER:224,LEFT:225,RIGHT:226,FULL:227,SEMI:228,ANTI:229,ON:230,USING:231,GROUP:232,GroupExpressionsList:233,HavingClause:234,GroupExpression:235,GROUPING:236,ROLLUP:237,CUBE:238,HAVING:239,CORRESPONDING:240,OrderExpression:241,NullsOrder:242,NULLS:243,FIRST:244,LAST:245,DIRECTION:246,COLLATE:247,NOCASE:248,LIMIT:249,OffsetClause:250,OFFSET:251,LimitClause_option0:252,FETCH:253,LimitClause_option1:254,LimitClause_option2:255,LimitClause_option3:256,ResultColumn:257,Star:258,AggrValue:259,Op:260,LogicValue:261,NullValue:262,ExistsValue:263,CaseValue:264,CastClause:265,ArrayValue:266,NewClause:267,Expression_group0:268,CURRENT_TIMESTAMP:269,JAVASCRIPT:270,CREATE:271,FUNCTION:272,AGGREGATE:273,NEW:274,CAST:275,ColumnType:276,CONVERT:277,PrimitiveValue:278,OverClause:279,OVER:280,OverPartitionClause:281,OverOrderByClause:282,PARTITION:283,SUM:284,COUNT:285,MIN:286,MAX:287,AVG:288,AGGR:289,ARRAY:290,FuncValue_option0:291,REPLACE:292,DATEADD:293,DATEDIFF:294,INTERVAL:295,TRUE:296,FALSE:297,NSTRING:298,NULL:299,EXISTS:300,ARRAYLBRA:301,RBRA:302,ParamValue_group0:303,BRAQUESTION:304,CASE:305,WhensList:306,ElseClause:307,END:308,When:309,WHEN:310,THEN:311,ELSE:312,REGEXP:313,TILDA:314,GLOB:315,ESCAPE:316,NOT_LIKE:317,BARBAR:318,MINUS:319,AMPERSAND:320,BAR:321,GE:322,LE:323,EQEQ:324,EQEQEQ:325,NE:326,NEEQEQ:327,NEEQEQEQ:328,CondOp:329,AllSome:330,ColFunc:331,BETWEEN:332,NOT_BETWEEN:333,IS:334,DOUBLECOLON:335,SOME:336,UPDATE:337,SetColumn:338,SetColumn_group0:339,DELETE:340,INSERT:341,Into:342,Values:343,ValuesListsList:344,DEFAULT:345,VALUES:346,ValuesList:347,Value:348,DateValue:349,TemporaryClause:350,TableClass:351,IfNotExists:352,CreateTableDefClause:353,CreateTableOptionsClause:354,TABLE:355,CreateTableOptions:356,CreateTableOption:357,IDENTITY:358,TEMP:359,ColumnDefsList:360,ConstraintsList:361,Constraint:362,ConstraintName:363,PrimaryKey:364,ForeignKey:365,UniqueKey:366,IndexKey:367,Check:368,CONSTRAINT:369,CHECK:370,PRIMARY:371,KEY:372,PrimaryKey_option0:373,ColsList:374,FOREIGN:375,REFERENCES:376,ForeignKey_option0:377,OnForeignKeyClause:378,ParColsList:379,OnDeleteClause:380,OnUpdateClause:381,NO:382,ACTION:383,UniqueKey_option0:384,UniqueKey_option1:385,ColumnDef:386,ColumnConstraintsClause:387,ColumnConstraints:388,SingularColumnType:389,NumberMax:390,ENUM:391,MAXNUM:392,ColumnConstraintsList:393,ColumnConstraint:394,ParLiteral:395,ColumnConstraint_option0:396,ColumnConstraint_option1:397,DROP:398,DropTable_group0:399,IfExists:400,TablesList:401,ALTER:402,RENAME:403,ADD:404,MODIFY:405,ATTACH:406,DATABASE:407,DETACH:408,AsClause:409,USE:410,SHOW:411,VIEW:412,CreateView_option0:413,CreateView_option1:414,SubqueryRestriction:415,READ:416,ONLY:417,OPTION:418,SOURCE:419,ASSERT:420,JsonObject:421,ATLBRA:422,JsonArray:423,JsonValue:424,JsonPrimitiveValue:425,LCUR:426,JsonPropertiesList:427,RCUR:428,JsonElementsList:429,JsonProperty:430,OnOff:431,SetPropsList:432,AtDollar:433,SetProp:434,OFF:435,COMMIT:436,TRANSACTION:437,ROLLBACK:438,BEGIN:439,ElseStatement:440,WHILE:441,CONTINUE:442,BREAK:443,PRINT:444,REQUIRE:445,StringValuesList:446,PluginsList:447,Plugin:448,ECHO:449,DECLARE:450,DeclaresList:451,DeclareItem:452,TRUNCATE:453,MERGE:454,MergeInto:455,MergeUsing:456,MergeOn:457,MergeMatchedList:458,OutputClause:459,MergeMatched:460,MergeNotMatched:461,MATCHED:462,MergeMatchedAction:463,MergeNotMatchedAction:464,TARGET:465,OUTPUT:466,CreateVertex_option0:467,CreateVertex_option1:468,CreateVertex_option2:469,CreateVertexSet:470,SharpValue:471,CONTENT:472,CreateEdge_option0:473,GRAPH:474,GraphList:475,GraphVertexEdge:476,GraphElement:477,GraphVertexEdge_option0:478,GraphVertexEdge_option1:479,GraphElementVar:480,GraphVertexEdge_option2:481,GraphVertexEdge_option3:482,GraphVertexEdge_option4:483,GraphVar:484,GraphAsClause:485,GraphAtClause:486,GraphElement2:487,GraphElement2_option0:488,GraphElement2_option1:489,GraphElement2_option2:490,GraphElement2_option3:491,GraphElement_option0:492,GraphElement_option1:493,GraphElement_option2:494,SharpLiteral:495,GraphElement_option3:496,GraphElement_option4:497,GraphElement_option5:498,ColonLiteral:499,DeleteVertex:500,DeleteVertex_option0:501,DeleteEdge:502,DeleteEdge_option0:503,DeleteEdge_option1:504,DeleteEdge_option2:505,Term:506,COLONDASH:507,TermsList:508,QUESTIONDASH:509,CALL:510,TRIGGER:511,BeforeAfter:512,InsertDeleteUpdate:513,CreateTrigger_option0:514,CreateTrigger_option1:515,BEFORE:516,AFTER:517,INSTEAD:518,REINDEX:519,A:520,ABSENT:521,ABSOLUTE:522,ACCORDING:523,ADA:524,ADMIN:525,ALWAYS:526,ASC:527,ASSERTION:528,ASSIGNMENT:529,ATTRIBUTE:530,ATTRIBUTES:531,BASE64:532,BERNOULLI:533,BLOCKED:534,BOM:535,BREADTH:536,C:537,CASCADE:538,CATALOG:539,CATALOG_NAME:540,CHAIN:541,CHARACTERISTICS:542,CHARACTERS:543,CHARACTER_SET_CATALOG:544,CHARACTER_SET_NAME:545,CHARACTER_SET_SCHEMA:546,CLASS_ORIGIN:547,COBOL:548,COLLATION:549,COLLATION_CATALOG:550,COLLATION_NAME:551,COLLATION_SCHEMA:552,COLUMNS:553,COLUMN_NAME:554,COMMAND_FUNCTION:555,COMMAND_FUNCTION_CODE:556,COMMITTED:557,CONDITION_NUMBER:558,CONNECTION:559,CONNECTION_NAME:560,CONSTRAINTS:561,CONSTRAINT_CATALOG:562,CONSTRAINT_NAME:563,CONSTRAINT_SCHEMA:564,CONSTRUCTOR:565,CONTROL:566,CURSOR_NAME:567,DATA:568,DATETIME_INTERVAL_CODE:569,DATETIME_INTERVAL_PRECISION:570,DB:571,DEFAULTS:572,DEFERRABLE:573,DEFERRED:574,DEFINED:575,DEFINER:576,DEGREE:577,DEPTH:578,DERIVED:579,DESC:580,DESCRIPTOR:581,DIAGNOSTICS:582,DISPATCH:583,DOCUMENT:584,DOMAIN:585,DYNAMIC_FUNCTION:586,DYNAMIC_FUNCTION_CODE:587,EMPTY:588,ENCODING:589,ENFORCED:590,EXCLUDE:591,EXCLUDING:592,EXPRESSION:593,FILE:594,FINAL:595,FLAG:596,FOLLOWING:597,FORTRAN:598,FOUND:599,FS:600,G:601,GENERAL:602,GENERATED:603,GO:604,GOTO:605,GRANTED:606,HEX:607,HIERARCHY:608,ID:609,IGNORE:610,IMMEDIATE:611,IMMEDIATELY:612,IMPLEMENTATION:613,INCLUDING:614,INCREMENT:615,INDENT:616,INITIALLY:617,INPUT:618,INSTANCE:619,INSTANTIABLE:620,INTEGRITY:621,INVOKER:622,ISOLATION:623,K:624,KEY_MEMBER:625,KEY_TYPE:626,LENGTH:627,LEVEL:628,LIBRARY:629,LINK:630,LOCATION:631,LOCATOR:632,M:633,MAP:634,MAPPING:635,MAXVALUE:636,MESSAGE_LENGTH:637,MESSAGE_OCTET_LENGTH:638,MESSAGE_TEXT:639,MINVALUE:640,MORE:641,MUMPS:642,NAME:643,NAMES:644,NAMESPACE:645,NESTING:646,NEXT:647,NFC:648,NFD:649,NFKC:650,NFKD:651,NIL:652,NORMALIZED:653,NULLABLE:654,OBJECT:655,OCTETS:656,OPTIONS:657,ORDERING:658,ORDINALITY:659,OTHERS:660,OVERRIDING:661,P:662,PAD:663,PARAMETER_MODE:664,PARAMETER_NAME:665,PARAMETER_ORDINAL_POSITION:666,PARAMETER_SPECIFIC_CATALOG:667,PARAMETER_SPECIFIC_NAME:668,PARAMETER_SPECIFIC_SCHEMA:669,PARTIAL:670,PASCAL:671,PASSING:672,PASSTHROUGH:673,PERMISSION:674,PLACING:675,PLI:676,PRECEDING:677,PRESERVE:678,PRIOR:679,PRIVILEGES:680,PUBLIC:681,RECOVERY:682,RELATIVE:683,REPEATABLE:684,REQUIRING:685,RESPECT:686,RESTART:687,RESTORE:688,RESTRICT:689,RETURNED_CARDINALITY:690,RETURNED_LENGTH:691,RETURNED_OCTET_LENGTH:692,RETURNED_SQLSTATE:693,RETURNING:694,ROLE:695,ROUTINE:696,ROUTINE_CATALOG:697,ROUTINE_NAME:698,ROUTINE_SCHEMA:699,ROW_COUNT:700,SCALE:701,SCHEMA:702,SCHEMA_NAME:703,SCOPE_CATALOG:704,SCOPE_NAME:705,SCOPE_SCHEMA:706,SECTION:707,SECURITY:708,SELECTIVE:709,SELF:710,SEQUENCE:711,SERIALIZABLE:712,SERVER:713,SERVER_NAME:714,SESSION:715,SETS:716,SIMPLE:717,SIZE:718,SPACE:719,SPECIFIC_NAME:720,STANDALONE:721,STATE:722,STATEMENT:723,STRIP:724,STRUCTURE:725,STYLE:726,SUBCLASS_ORIGIN:727,T:728,TABLE_NAME:729,TEMPORARY:730,TIES:731,TOKEN:732,TOP_LEVEL_COUNT:733,TRANSACTIONS_COMMITTED:734,TRANSACTIONS_ROLLED_BACK:735,TRANSACTION_ACTIVE:736,TRANSFORM:737,TRANSFORMS:738,TRIGGER_CATALOG:739,TRIGGER_NAME:740,TRIGGER_SCHEMA:741,TYPE:742,UNBOUNDED:743,UNCOMMITTED:744,UNDER:745,UNLINK:746,UNNAMED:747,UNTYPED:748,URI:749,USAGE:750,USER_DEFINED_TYPE_CATALOG:751,USER_DEFINED_TYPE_CODE:752,USER_DEFINED_TYPE_NAME:753,USER_DEFINED_TYPE_SCHEMA:754,VALID:755,VERSION:756,WHITESPACE:757,WORK:758,WRAPPER:759,WRITE:760,XMLDECLARATION:761,XMLSCHEMA:762,YES:763,ZONE:764,SEMICOLON:765,PERCENT:766,ROWS:767,FuncValue_option0_group0:768,$accept:0,$end:1},terminals_:{2:"error",4:"LITERAL",5:"BRALITERAL",10:"EOF",14:"EXPLAIN",15:"QUERY",16:"PLAN",53:"EndTransaction",72:"WITH",74:"COMMA",76:"AS",77:"LPAR",78:"RPAR",89:"SEARCH",93:"PIVOT",95:"FOR",98:"UNPIVOT",99:"IN",107:"REMOVE",112:"LIKE",115:"ARROW",116:"DOT",118:"ORDER",119:"BY",122:"DOTDOT",123:"CARET",124:"EQ",128:"WHERE",129:"OF",130:"CLASS",131:"NUMBER",132:"STRING",133:"SLASH",134:"VERTEX",135:"EDGE",136:"EXCLAMATION",137:"SHARP",138:"MODULO",139:"GT",140:"LT",141:"GTGT",142:"LTLT",143:"DOLLAR",145:"AT",146:"SET",148:"TO",149:"VALUE",150:"ROW",152:"COLON",154:"NOT",156:"IF",162:"UNION",164:"ALL",166:"ANY",168:"INTERSECT",169:"EXCEPT",170:"AND",171:"OR",172:"PATH",173:"RETURN",175:"REPEAT",179:"PLUS",180:"STAR",181:"QUESTION",183:"FROM",185:"DISTINCT",187:"UNIQUE",189:"SELECT",190:"COLUMN",191:"MATRIX",192:"TEXTSTRING",193:"INDEX",194:"RECORDSET",195:"TOP",198:"INTO",206:"CROSS",207:"APPLY",208:"OUTER",212:"INDEXED",213:"INSERTED",222:"NATURAL",223:"JOIN",224:"INNER",225:"LEFT",226:"RIGHT",227:"FULL",228:"SEMI",229:"ANTI",230:"ON",231:"USING",232:"GROUP",236:"GROUPING",237:"ROLLUP",238:"CUBE",239:"HAVING",240:"CORRESPONDING",243:"NULLS",244:"FIRST",245:"LAST",246:"DIRECTION",247:"COLLATE",248:"NOCASE",249:"LIMIT",251:"OFFSET",253:"FETCH",269:"CURRENT_TIMESTAMP",270:"JAVASCRIPT",271:"CREATE",272:"FUNCTION",273:"AGGREGATE",274:"NEW",275:"CAST",277:"CONVERT",280:"OVER",283:"PARTITION",284:"SUM",285:"COUNT",286:"MIN",287:"MAX",288:"AVG",289:"AGGR",290:"ARRAY",292:"REPLACE",293:"DATEADD",294:"DATEDIFF",295:"INTERVAL",296:"TRUE",297:"FALSE",298:"NSTRING",299:"NULL",300:"EXISTS",301:"ARRAYLBRA",302:"RBRA",304:"BRAQUESTION",305:"CASE",308:"END",310:"WHEN",311:"THEN",312:"ELSE",313:"REGEXP",314:"TILDA",315:"GLOB",316:"ESCAPE",317:"NOT_LIKE",318:"BARBAR",319:"MINUS",320:"AMPERSAND",321:"BAR",322:"GE",323:"LE",324:"EQEQ",325:"EQEQEQ",326:"NE",327:"NEEQEQ",328:"NEEQEQEQ",332:"BETWEEN",333:"NOT_BETWEEN",334:"IS",335:"DOUBLECOLON",336:"SOME",337:"UPDATE",340:"DELETE",341:"INSERT",345:"DEFAULT",346:"VALUES",349:"DateValue",355:"TABLE",358:"IDENTITY",359:"TEMP",369:"CONSTRAINT",370:"CHECK",371:"PRIMARY",372:"KEY",375:"FOREIGN",376:"REFERENCES",382:"NO",383:"ACTION",388:"ColumnConstraints",391:"ENUM",392:"MAXNUM",398:"DROP",402:"ALTER",403:"RENAME",404:"ADD",405:"MODIFY",406:"ATTACH",407:"DATABASE",408:"DETACH",410:"USE",411:"SHOW",412:"VIEW",416:"READ",417:"ONLY",418:"OPTION",419:"SOURCE",420:"ASSERT",422:"ATLBRA",426:"LCUR",428:"RCUR",435:"OFF",436:"COMMIT",437:"TRANSACTION",438:"ROLLBACK",439:"BEGIN",441:"WHILE",442:"CONTINUE",443:"BREAK",444:"PRINT",445:"REQUIRE",449:"ECHO",450:"DECLARE",453:"TRUNCATE",454:"MERGE",462:"MATCHED",465:"TARGET",466:"OUTPUT",472:"CONTENT",474:"GRAPH",507:"COLONDASH",509:"QUESTIONDASH",510:"CALL",511:"TRIGGER",516:"BEFORE",517:"AFTER",518:"INSTEAD",519:"REINDEX",520:"A",521:"ABSENT",522:"ABSOLUTE",523:"ACCORDING",524:"ADA",525:"ADMIN",526:"ALWAYS",527:"ASC",528:"ASSERTION",529:"ASSIGNMENT",530:"ATTRIBUTE",531:"ATTRIBUTES",532:"BASE64",533:"BERNOULLI",534:"BLOCKED",535:"BOM",536:"BREADTH",537:"C",538:"CASCADE",539:"CATALOG",540:"CATALOG_NAME",541:"CHAIN",542:"CHARACTERISTICS",543:"CHARACTERS",544:"CHARACTER_SET_CATALOG",545:"CHARACTER_SET_NAME",546:"CHARACTER_SET_SCHEMA",547:"CLASS_ORIGIN",548:"COBOL",549:"COLLATION",550:"COLLATION_CATALOG",551:"COLLATION_NAME",552:"COLLATION_SCHEMA",553:"COLUMNS",554:"COLUMN_NAME",555:"COMMAND_FUNCTION",556:"COMMAND_FUNCTION_CODE",557:"COMMITTED",558:"CONDITION_NUMBER",559:"CONNECTION",560:"CONNECTION_NAME",561:"CONSTRAINTS",562:"CONSTRAINT_CATALOG",563:"CONSTRAINT_NAME",564:"CONSTRAINT_SCHEMA",565:"CONSTRUCTOR",566:"CONTROL",567:"CURSOR_NAME",568:"DATA",569:"DATETIME_INTERVAL_CODE",570:"DATETIME_INTERVAL_PRECISION",571:"DB",572:"DEFAULTS",573:"DEFERRABLE",574:"DEFERRED",575:"DEFINED",576:"DEFINER",577:"DEGREE",578:"DEPTH",579:"DERIVED",580:"DESC",581:"DESCRIPTOR",582:"DIAGNOSTICS",583:"DISPATCH",584:"DOCUMENT",585:"DOMAIN",586:"DYNAMIC_FUNCTION",587:"DYNAMIC_FUNCTION_CODE",588:"EMPTY",589:"ENCODING",590:"ENFORCED",591:"EXCLUDE",592:"EXCLUDING",593:"EXPRESSION",594:"FILE",595:"FINAL",596:"FLAG",597:"FOLLOWING",598:"FORTRAN",599:"FOUND",600:"FS",601:"G",602:"GENERAL",603:"GENERATED",604:"GO",605:"GOTO",606:"GRANTED",607:"HEX",608:"HIERARCHY",609:"ID",610:"IGNORE",611:"IMMEDIATE",612:"IMMEDIATELY",613:"IMPLEMENTATION",614:"INCLUDING",615:"INCREMENT",616:"INDENT",617:"INITIALLY",618:"INPUT",619:"INSTANCE",620:"INSTANTIABLE",621:"INTEGRITY",622:"INVOKER",623:"ISOLATION",624:"K",625:"KEY_MEMBER",626:"KEY_TYPE",627:"LENGTH",628:"LEVEL",629:"LIBRARY",630:"LINK",631:"LOCATION",632:"LOCATOR",633:"M",634:"MAP",635:"MAPPING",636:"MAXVALUE",637:"MESSAGE_LENGTH",638:"MESSAGE_OCTET_LENGTH",639:"MESSAGE_TEXT",640:"MINVALUE",641:"MORE",642:"MUMPS",643:"NAME",644:"NAMES",645:"NAMESPACE",646:"NESTING",647:"NEXT",648:"NFC",649:"NFD",650:"NFKC",651:"NFKD",652:"NIL",653:"NORMALIZED",654:"NULLABLE",655:"OBJECT",656:"OCTETS",657:"OPTIONS",658:"ORDERING",659:"ORDINALITY",660:"OTHERS",661:"OVERRIDING",662:"P",663:"PAD",664:"PARAMETER_MODE",665:"PARAMETER_NAME",666:"PARAMETER_ORDINAL_POSITION",667:"PARAMETER_SPECIFIC_CATALOG",668:"PARAMETER_SPECIFIC_NAME",669:"PARAMETER_SPECIFIC_SCHEMA",670:"PARTIAL",671:"PASCAL",672:"PASSING",673:"PASSTHROUGH",674:"PERMISSION",675:"PLACING",676:"PLI",677:"PRECEDING",678:"PRESERVE",679:"PRIOR",680:"PRIVILEGES",681:"PUBLIC",682:"RECOVERY",683:"RELATIVE",684:"REPEATABLE",685:"REQUIRING",686:"RESPECT",687:"RESTART",688:"RESTORE",689:"RESTRICT",690:"RETURNED_CARDINALITY",691:"RETURNED_LENGTH",692:"RETURNED_OCTET_LENGTH",693:"RETURNED_SQLSTATE",694:"RETURNING",695:"ROLE",696:"ROUTINE",697:"ROUTINE_CATALOG",698:"ROUTINE_NAME",699:"ROUTINE_SCHEMA",700:"ROW_COUNT",701:"SCALE",702:"SCHEMA",703:"SCHEMA_NAME",704:"SCOPE_CATALOG",705:"SCOPE_NAME",706:"SCOPE_SCHEMA",707:"SECTION",708:"SECURITY",709:"SELECTIVE",710:"SELF",711:"SEQUENCE",712:"SERIALIZABLE",713:"SERVER",714:"SERVER_NAME",715:"SESSION",716:"SETS",717:"SIMPLE",718:"SIZE",719:"SPACE",720:"SPECIFIC_NAME",721:"STANDALONE",722:"STATE",723:"STATEMENT",724:"STRIP",725:"STRUCTURE",726:"STYLE",727:"SUBCLASS_ORIGIN",728:"T",729:"TABLE_NAME",730:"TEMPORARY",731:"TIES",732:"TOKEN",733:"TOP_LEVEL_COUNT",734:"TRANSACTIONS_COMMITTED",735:"TRANSACTIONS_ROLLED_BACK",736:"TRANSACTION_ACTIVE",737:"TRANSFORM",738:"TRANSFORMS",739:"TRIGGER_CATALOG",740:"TRIGGER_NAME",741:"TRIGGER_SCHEMA",742:"TYPE",743:"UNBOUNDED",744:"UNCOMMITTED",745:"UNDER",746:"UNLINK",747:"UNNAMED",748:"UNTYPED",749:"URI",750:"USAGE",751:"USER_DEFINED_TYPE_CATALOG",752:"USER_DEFINED_TYPE_CODE",753:"USER_DEFINED_TYPE_NAME",754:"USER_DEFINED_TYPE_SCHEMA",755:"VALID",756:"VERSION",757:"WHITESPACE",758:"WORK",759:"WRAPPER",760:"WRITE",761:"XMLDECLARATION",762:"XMLSCHEMA",763:"YES",764:"ZONE",765:"SEMICOLON",766:"PERCENT",767:"ROWS"},productions_:[0,[3,1],[3,1],[3,2],[7,1],[7,2],[8,2],[9,3],[9,1],[9,1],[13,2],[13,4],[12,1],[17,0],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[47,3],[73,3],[73,1],[75,5],[40,10],[40,4],[92,8],[92,11],[102,4],[104,2],[104,1],[103,3],[103,1],[105,1],[105,3],[106,3],[109,3],[109,1],[110,1],[110,2],[114,1],[114,1],[117,1],[117,5],[117,5],[117,1],[117,2],[117,1],[117,2],[117,2],[117,3],[117,4],[117,4],[117,4],[117,4],[117,4],[117,1],[117,1],[117,1],[117,1],[117,1],[117,1],[117,2],[117,2],[117,2],[117,1],[117,1],[117,1],[117,1],[117,1],[117,1],[117,2],[117,3],[117,4],[117,3],[117,1],[117,4],[117,2],[117,2],[117,4],[117,4],[117,4],[117,4],[117,4],[117,5],[117,4],[117,4],[117,4],[117,4],[117,4],[117,4],[117,4],[117,4],[117,6],[163,3],[163,1],[153,1],[153,1],[153,1],[182,2],[79,4],[79,4],[79,4],[79,3],[184,1],[184,2],[184,2],[184,2],[184,2],[184,2],[184,2],[184,2],[186,3],[186,4],[186,0],[81,0],[81,2],[81,2],[81,2],[81,2],[81,2],[82,2],[82,3],[82,5],[82,0],[205,6],[205,7],[205,6],[205,7],[203,1],[203,3],[209,4],[209,5],[209,3],[209,3],[209,2],[209,3],[209,1],[209,3],[209,2],[209,3],[209,1],[209,1],[209,2],[209,3],[209,1],[209,1],[209,2],[209,3],[209,1],[209,2],[209,3],[214,1],[199,3],[199,1],[204,2],[204,2],[204,1],[204,1],[215,3],[217,1],[217,2],[217,3],[217,3],[217,2],[217,3],[217,4],[217,5],[217,1],[217,2],[217,3],[217,1],[217,2],[217,3],[216,1],[216,2],[221,1],[221,2],[221,2],[221,3],[221,2],[221,3],[221,2],[221,3],[221,2],[221,2],[221,2],[218,2],[218,2],[218,0],[84,0],[84,2],[85,0],[85,4],[233,1],[233,3],[235,5],[235,4],[235,4],[235,1],[234,0],[234,2],[88,0],[88,2],[88,3],[88,2],[88,2],[88,3],[88,4],[88,3],[88,3],[86,0],[86,3],[120,1],[120,3],[242,2],[242,2],[241,1],[241,2],[241,3],[241,3],[241,4],[87,0],[87,3],[87,8],[250,0],[250,2],[174,3],[174,1],[257,3],[257,2],[257,3],[257,2],[257,3],[257,2],[257,1],[258,5],[258,3],[258,1],[111,5],[111,3],[111,3],[111,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,1],[94,3],[94,3],[94,3],[94,1],[94,1],[56,1],[70,5],[71,5],[267,2],[267,2],[265,6],[265,8],[265,6],[265,8],[278,1],[278,1],[278,1],[278,1],[278,1],[278,1],[278,1],[259,5],[259,6],[259,6],[279,0],[279,4],[279,4],[279,5],[281,3],[282,3],[158,1],[158,1],[158,1],[158,1],[158,1],[158,1],[158,1],[158,1],[158,1],[200,5],[200,3],[200,4],[200,4],[200,8],[200,8],[200,8],[200,8],[200,3],[151,1],[151,3],[196,1],[261,1],[261,1],[113,1],[113,1],[262,1],[202,2],[263,4],[266,3],[201,2],[201,2],[201,1],[201,1],[264,5],[264,4],[306,2],[306,1],[309,4],[307,2],[307,0],[260,3],[260,3],[260,3],[260,3],[260,5],[260,3],[260,5],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,5],[260,3],[260,3],[260,3],[260,5],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,3],[260,6],[260,6],[260,3],[260,3],[260,2],[260,2],[260,2],[260,2],[260,2],[260,3],[260,5],[260,6],[260,5],[260,6],[260,4],[260,5],[260,3],[260,4],[260,3],[260,4],[260,3],[260,3],[260,3],[260,3],[260,3],[331,1],[331,1],[331,4],[329,1],[329,1],[329,1],[329,1],[329,1],[329,1],[330,1],[330,1],[330,1],[55,6],[55,4],[147,1],[147,3],[338,3],[338,4],[29,5],[29,3],[36,5],[36,4],[36,7],[36,6],[36,5],[36,4],[36,5],[36,8],[36,7],[36,4],[36,6],[36,7],[343,1],[343,1],[342,0],[342,1],[344,3],[344,1],[344,1],[344,5],[344,3],[344,3],[347,1],[347,3],[348,1],[348,1],[348,1],[348,1],[348,1],[348,1],[100,1],[100,3],[24,9],[24,5],[351,1],[351,1],[354,0],[354,1],[356,2],[356,1],[357,1],[357,3],[357,3],[357,3],[350,0],[350,1],[352,0],[352,3],[353,3],[353,1],[353,2],[361,1],[361,3],[362,2],[362,2],[362,2],[362,2],[362,2],[363,0],[363,2],[368,4],[364,6],[365,9],[379,3],[378,0],[378,2],[380,4],[381,4],[366,6],[367,5],[367,5],[374,1],[374,1],[374,3],[374,3],[360,1],[360,3],[386,3],[386,2],[386,1],[389,6],[389,4],[389,1],[389,4],[276,2],[276,1],[390,1],[390,1],[387,0],[387,1],[393,2],[393,1],[395,3],[394,2],[394,5],[394,3],[394,6],[394,1],[394,2],[394,4],[394,2],[394,1],[394,2],[394,1],[394,1],[394,3],[394,5],[33,4],[401,3],[401,1],[400,0],[400,2],[18,6],[18,6],[18,6],[18,8],[18,6],[39,5],[19,4],[19,7],[19,6],[19,9],[30,3],[21,4],[21,6],[21,9],[21,6],[409,0],[409,2],[54,3],[54,2],[31,4],[31,5],[31,5],[22,8],[22,9],[32,3],[43,2],[43,4],[43,3],[43,5],[45,2],[45,4],[45,4],[45,6],[42,4],[42,6],[44,4],[44,6],[41,4],[41,6],[25,11],[25,8],[415,3],[415,3],[415,5],[34,4],[66,2],[57,2],[58,2],[58,2],[58,4],[144,4],[144,2],[144,2],[144,2],[144,2],[144,1],[144,2],[144,2],[424,1],[424,1],[425,1],[425,1],[425,1],[425,1],[425,1],[425,1],[425,1],[425,3],[421,3],[421,4],[421,2],[423,2],[423,3],[423,1],[427,3],[427,1],[430,3],[430,3],[430,3],[429,3],[429,1],[65,4],[65,3],[65,4],[65,5],[65,5],[65,6],[433,1],[433,1],[432,3],[432,2],[434,1],[434,1],[434,3],[431,1],[431,1],[51,2],[52,2],[50,2],[35,4],[35,3],[440,2],[59,3],[60,1],[61,1],[62,3],[63,2],[63,2],[64,2],[64,2],[448,1],[448,1],[69,2],[446,3],[446,1],[447,3],[447,1],[28,2],[451,1],[451,3],[452,3],[452,4],[452,5],[452,6],[46,3],[37,6],[455,1],[455,2],[456,2],[457,2],[458,2],[458,2],[458,1],[458,1],[460,4],[460,6],[463,1],[463,3],[461,5],[461,7],[461,7],[461,9],[461,7],[461,9],[464,3],[464,6],[464,3],[464,6],[459,0],[459,2],[459,5],[459,4],[459,7],[27,6],[471,2],[470,0],[470,2],[470,2],[470,1],[26,8],[23,3],[23,4],[475,3],[475,1],[476,3],[476,7],[476,6],[476,3],[476,4],[480,1],[480,1],[484,2],[485,3],[486,2],[487,4],[477,4],[477,3],[477,2],[477,1],[499,2],[495,2],[495,2],[500,4],[502,6],[67,3],[67,2],[508,3],[508,1],[506,1],[506,4],[68,2],[20,2],[48,9],[48,8],[48,9],[512,0],[512,1],[512,1],[512,1],[512,2],[513,1],[513,1],[513,1],[49,3],[38,2],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[6,1],[11,1],[11,1],[80,0],[80,1],[83,0],[83,1],[90,0],[90,2],[91,0],[91,1],[96,0],[96,1],[97,0],[97,1],[101,0],[101,1],[108,0],[108,1],[121,0],[121,1],[125,1],[125,2],[126,1],[126,2],[127,0],[127,1],[155,0],[155,2],[157,0],[157,2],[159,0],[159,2],[160,1],[160,1],[161,0],[161,2],[165,0],[165,2],[167,0],[167,2],[176,0],[176,2],[177,0],[177,2],[178,0],[178,2],[188,0],[188,1],[197,0],[197,1],[210,0],[210,1],[211,0],[211,1],[219,0],[219,1],[220,0],[220,1],[252,0],[252,1],[254,0],[254,1],[255,0],[255,1],[256,0],[256,1],[268,1],[268,1],[768,1],[768,1],[291,0],[291,1],[303,1],[303,1],[339,1],[339,1],[373,0],[373,1],[377,0],[377,1],[384,0],[384,1],[385,0],[385,1],[396,0],[396,1],[397,0],[397,1],[399,1],[399,1],[413,0],[413,1],[414,0],[414,1],[467,0],[467,1],[468,0],[468,1],[469,0],[469,1],[473,0],[473,1],[478,0],[478,1],[479,0],[479,1],[481,0],[481,1],[482,0],[482,1],[483,0],[483,1],[488,0],[488,1],[489,0],[489,1],[490,0],[490,1],[491,0],[491,1],[492,0],[492,1],[493,0],[493,1],[494,0],[494,1],[496,0],[496,1],[497,0],[497,1],[498,0],[498,1],[501,0],[501,2],[503,0],[503,2],[504,0],[504,2],[505,0],[505,2],[514,0],[514,1],[515,0],[515,1]],performAction:function(e,t,n,r,s,a,i){var o=a.length-1;switch(s){case 1:bi.options.casesensitive?this.$=a[o]:this.$=a[o].toLowerCase();break;case 2:this.$=Ei(a[o].substr(1,a[o].length-2));break;case 3:this.$=a[o].toLowerCase();break;case 4:this.$=a[o];break;case 5:this.$=a[o]?a[o-1]+" "+a[o]:a[o-1];break;case 6:return new r.Statements({statements:a[o-1]});case 7:this.$=a[o-2],a[o]&&a[o-2].push(a[o]);break;case 8:case 9:case 70:case 80:case 85:case 143:case 177:case 205:case 206:case 242:case 261:case 276:case 357:case 375:case 454:case 477:case 478:case 482:case 490:case 531:case 532:case 569:case 652:case 662:case 686:case 688:case 690:case 704:case 705:case 735:case 759:this.$=[a[o]];break;case 10:case 11:this.$=a[o],a[o].explain=!0;break;case 12:this.$=a[o],r.exists&&(this.$.exists=r.exists),delete r.exists,r.queries&&(this.$.queries=r.queries),delete r.queries;break;case 13:case 162:case 172:case 237:case 238:case 240:case 248:case 250:case 259:case 270:case 273:case 378:case 494:case 504:case 506:case 518:case 524:case 525:case 570:this.$=void 0;break;case 68:this.$=new r.WithSelect({withs:a[o-1],select:a[o]});break;case 69:case 568:a[o-2].push(a[o]),this.$=a[o-2];break;case 71:this.$={name:a[o-4],select:a[o-1]};break;case 72:r.extend(this.$,a[o-9]),r.extend(this.$,a[o-8]),r.extend(this.$,a[o-7]),r.extend(this.$,a[o-6]),r.extend(this.$,a[o-5]),r.extend(this.$,a[o-4]),r.extend(this.$,a[o-3]),r.extend(this.$,a[o-2]),r.extend(this.$,a[o-1]),r.extend(this.$,a[o]),this.$=a[o-9];break;case 73:this.$=new r.Search({selectors:a[o-2],from:a[o]}),r.extend(this.$,a[o-1]);break;case 74:this.$={pivot:{expr:a[o-5],columnid:a[o-3],inlist:a[o-2],as:a[o]}};break;case 75:this.$={unpivot:{tocolumnid:a[o-8],forcolumnid:a[o-6],inlist:a[o-3],as:a[o]}};break;case 76:case 523:case 552:case 588:case 622:case 639:case 640:case 643:case 665:this.$=a[o-1];break;case 77:case 78:case 86:case 147:case 185:case 247:case 283:case 291:case 292:case 293:case 294:case 295:case 296:case 297:case 298:case 299:case 300:case 301:case 302:case 303:case 304:case 307:case 308:case 323:case 324:case 325:case 326:case 327:case 328:case 377:case 443:case 444:case 445:case 446:case 447:case 448:case 519:case 545:case 549:case 551:case 626:case 627:case 628:case 629:case 630:case 631:case 635:case 637:case 638:case 647:case 663:case 664:case 726:case 741:case 742:case 744:case 745:case 751:case 752:this.$=a[o];break;case 79:case 84:case 734:case 758:this.$=a[o-2],this.$.push(a[o]);break;case 81:this.$={expr:a[o]};break;case 82:this.$={expr:a[o-2],as:a[o]};break;case 83:this.$={removecolumns:a[o]};break;case 87:this.$={like:a[o]};break;case 90:case 104:this.$={srchid:"PROP",args:[a[o]]};break;case 91:this.$={srchid:"ORDERBY",args:a[o-1]};break;case 92:var u=(u=a[o-1])||"ASC";this.$={srchid:"ORDERBY",args:[{expression:new r.Column({columnid:"_"}),direction:u}]};break;case 93:this.$={srchid:"PARENT"};break;case 94:this.$={srchid:"APROP",args:[a[o]]};break;case 95:this.$={selid:"ROOT"};break;case 96:this.$={srchid:"EQ",args:[a[o]]};break;case 97:this.$={srchid:"LIKE",args:[a[o]]};break;case 98:case 99:this.$={selid:"WITH",args:a[o-1]};break;case 100:this.$={srchid:a[o-3].toUpperCase(),args:a[o-1]};break;case 101:this.$={srchid:"WHERE",args:[a[o-1]]};break;case 102:this.$={selid:"OF",args:[a[o-1]]};break;case 103:this.$={srchid:"CLASS",args:[a[o-1]]};break;case 105:this.$={srchid:"NAME",args:[a[o].substr(1,a[o].length-2)]};break;case 106:this.$={srchid:"CHILD"};break;case 107:this.$={srchid:"VERTEX"};break;case 108:this.$={srchid:"EDGE"};break;case 109:this.$={srchid:"REF"};break;case 110:this.$={srchid:"SHARP",args:[a[o]]};break;case 111:this.$={srchid:"ATTR",args:void 0===a[o]?void 0:[a[o]]};break;case 112:this.$={srchid:"ATTR"};break;case 113:this.$={srchid:"OUT"};break;case 114:this.$={srchid:"IN"};break;case 115:this.$={srchid:"OUTOUT"};break;case 116:this.$={srchid:"ININ"};break;case 117:this.$={srchid:"CONTENT"};break;case 118:this.$={srchid:"EX",args:[new r.Json({value:a[o]})]};break;case 119:this.$={srchid:"AT",args:[a[o]]};break;case 120:this.$={srchid:"AS",args:[a[o]]};break;case 121:this.$={srchid:"SET",args:a[o-1]};break;case 122:this.$={selid:"TO",args:[a[o]]};break;case 123:this.$={srchid:"VALUE"};break;case 124:this.$={srchid:"ROW",args:a[o-1]};break;case 125:this.$={srchid:"CLASS",args:[a[o]]};break;case 126:this.$={selid:a[o],args:[a[o-1]]};break;case 127:this.$={selid:"NOT",args:a[o-1]};break;case 128:this.$={selid:"IF",args:a[o-1]};break;case 129:this.$={selid:a[o-3],args:a[o-1]};break;case 130:this.$={selid:"DISTINCT",args:a[o-1]};break;case 131:this.$={selid:"UNION",args:a[o-1]};break;case 132:this.$={selid:"UNIONALL",args:a[o-1]};break;case 133:this.$={selid:"ALL",args:[a[o-1]]};break;case 134:this.$={selid:"ANY",args:[a[o-1]]};break;case 135:this.$={selid:"INTERSECT",args:a[o-1]};break;case 136:this.$={selid:"EXCEPT",args:a[o-1]};break;case 137:this.$={selid:"AND",args:a[o-1]};break;case 138:this.$={selid:"OR",args:a[o-1]};break;case 139:this.$={selid:"PATH",args:[a[o-1]]};break;case 140:this.$={srchid:"RETURN",args:a[o-1]};break;case 141:this.$={selid:"REPEAT",sels:a[o-3],args:a[o-1]};break;case 142:this.$=a[o-2],this.$.push(a[o]);break;case 144:this.$="PLUS";break;case 145:this.$="STAR";break;case 146:this.$="QUESTION";break;case 148:case 149:this.$=new r.Select({columns:a[o],distinct:!0}),r.extend(this.$,a[o-3]),r.extend(this.$,a[o-1]);break;case 150:this.$=new r.Select({columns:a[o],all:!0}),r.extend(this.$,a[o-3]),r.extend(this.$,a[o-1]);break;case 151:a[o]?(this.$=new r.Select({columns:a[o]}),r.extend(this.$,a[o-2]),r.extend(this.$,a[o-1])):this.$=new r.Select({columns:[new r.Column({columnid:"_"})],modifier:"COLUMN"});break;case 152:"SELECT"==a[o]?this.$=void 0:this.$={modifier:a[o]};break;case 153:this.$={modifier:"VALUE"};break;case 154:this.$={modifier:"ROW"};break;case 155:this.$={modifier:"COLUMN"};break;case 156:this.$={modifier:"MATRIX"};break;case 157:this.$={modifier:"TEXTSTRING"};break;case 158:this.$={modifier:"INDEX"};break;case 159:this.$={modifier:"RECORDSET"};break;case 160:this.$={top:a[o-1],percent:void 0!==a[o]||void 0};break;case 161:this.$={top:a[o-1]};break;case 163:case 333:case 526:case 527:case 727:this.$=void 0;break;case 164:case 165:case 166:case 167:this.$={into:a[o]};break;case 168:var c=(h=(h=a[o]).substr(1,h.length-2)).substr(-3).toUpperCase(),l=h.substr(-4).toUpperCase();"#"==h[0]?this.$={into:new r.FuncValue({funcid:"HTML",args:[new r.StringValue({value:h}),new r.Json({value:{headers:!0}})]})}:"XLS"==c||"CSV"==c||"TAB"==c?this.$={into:new r.FuncValue({funcid:c,args:[new r.StringValue({value:h}),new r.Json({value:{headers:!0}})]})}:"XLSX"!=l&&"JSON"!=l||(this.$={into:new r.FuncValue({funcid:l,args:[new r.StringValue({value:h}),new r.Json({value:{headers:!0}})]})});break;case 169:this.$={from:a[o]};break;case 170:this.$={from:a[o-1],joins:a[o]};break;case 171:this.$={from:a[o-2],joins:a[o-1]};break;case 173:this.$=new r.Apply({select:a[o-2],applymode:"CROSS",as:a[o]});break;case 174:this.$=new r.Apply({select:a[o-3],applymode:"CROSS",as:a[o]});break;case 175:this.$=new r.Apply({select:a[o-2],applymode:"OUTER",as:a[o]});break;case 176:this.$=new r.Apply({select:a[o-3],applymode:"OUTER",as:a[o]});break;case 178:case 243:case 455:case 533:case 534:this.$=a[o-2],a[o-2].push(a[o]);break;case 179:this.$=a[o-2],this.$.as=a[o];break;case 180:this.$=a[o-3],this.$.as=a[o];break;case 181:this.$=a[o-1],this.$.as="default";break;case 182:this.$=new r.Json({value:a[o-2]}),a[o-2].as=a[o];break;case 183:this.$=a[o-1],a[o-1].as=a[o];break;case 184:this.$=a[o-2],a[o-2].as=a[o];break;case 186:case 641:case 644:this.$=a[o-2];break;case 187:case 191:case 195:case 198:this.$=a[o-1],a[o-1].as=a[o];break;case 188:case 192:case 196:case 199:this.$=a[o-2],a[o-2].as=a[o];break;case 189:case 190:case 194:case 197:this.$=a[o],a[o].as="default";break;case 193:this.$={inserted:!0};break;case 200:var h,c=(h=(h=a[o]).substr(1,h.length-2)).substr(-3).toUpperCase(),l=h.substr(-4).toUpperCase();if("#"==h[0])d=new r.FuncValue({funcid:"HTML",args:[new r.StringValue({value:h}),new r.Json({value:{headers:!0}})]});else if("XLS"==c||"CSV"==c||"TAB"==c)d=new r.FuncValue({funcid:c,args:[new r.StringValue({value:h}),new r.Json({value:{headers:!0}})]});else {if("XLSX"!=l&&"JSON"!=l)throw new Error("Unknown string in FROM clause");d=new r.FuncValue({funcid:l,args:[new r.StringValue({value:h}),new r.Json({value:{headers:!0}})]});}this.$=d;break;case 201:"INFORMATION_SCHEMA"==a[o-2]?this.$=new r.FuncValue({funcid:a[o-2],args:[new r.StringValue({value:a[o]})]}):this.$=new r.Table({databaseid:a[o-2],tableid:a[o]});break;case 202:this.$=new r.Table({tableid:a[o]});break;case 203:case 204:this.$=a[o-1],a[o-1].push(a[o]);break;case 207:this.$=new r.Join(a[o-2]),r.extend(this.$,a[o-1]),r.extend(this.$,a[o]);break;case 208:this.$={table:a[o]};break;case 209:this.$={table:a[o-1],as:a[o]};break;case 210:this.$={table:a[o-2],as:a[o]};break;case 211:this.$={json:new r.Json({value:a[o-2],as:a[o]})};break;case 212:this.$={param:a[o-1],as:a[o]};break;case 213:this.$={param:a[o-2],as:a[o]};break;case 214:this.$={select:a[o-2],as:a[o]};break;case 215:this.$={select:a[o-3],as:a[o]};break;case 216:this.$={func:a[o],as:"default"};break;case 217:this.$={func:a[o-1],as:a[o]};break;case 218:this.$={func:a[o-2],as:a[o]};break;case 219:this.$={variable:a[o],as:"default"};break;case 220:this.$={variable:a[o-1],as:a[o]};break;case 221:this.$={variable:a[o-2],as:a[o]};break;case 222:this.$={joinmode:a[o]};break;case 223:this.$={joinmode:a[o-1],natural:!0};break;case 224:case 225:this.$="INNER";break;case 226:case 227:this.$="LEFT";break;case 228:case 229:this.$="RIGHT";break;case 230:case 231:this.$="OUTER";break;case 232:this.$="SEMI";break;case 233:this.$="ANTI";break;case 234:this.$="CROSS";break;case 235:this.$={on:a[o]};break;case 236:case 700:this.$={using:a[o]};break;case 239:this.$={where:new r.Expression({expression:a[o]})};break;case 241:this.$={group:a[o-1]},r.extend(this.$,a[o]);break;case 244:this.$=new r.GroupExpression({type:"GROUPING SETS",group:a[o-1]});break;case 245:this.$=new r.GroupExpression({type:"ROLLUP",group:a[o-1]});break;case 246:this.$=new r.GroupExpression({type:"CUBE",group:a[o-1]});break;case 249:this.$={having:a[o]};break;case 251:this.$={union:a[o]};break;case 252:this.$={unionall:a[o]};break;case 253:this.$={except:a[o]};break;case 254:this.$={intersect:a[o]};break;case 255:this.$={union:a[o],corresponding:!0};break;case 256:this.$={unionall:a[o],corresponding:!0};break;case 257:this.$={except:a[o],corresponding:!0};break;case 258:this.$={intersect:a[o],corresponding:!0};break;case 260:this.$={order:a[o]};break;case 262:this.$=a[o-2],a[o-2].push(a[o]);break;case 263:this.$={nullsOrder:"FIRST"};break;case 264:this.$={nullsOrder:"LAST"};break;case 265:this.$=new r.Expression({expression:a[o],direction:"ASC"});break;case 266:this.$=new r.Expression({expression:a[o-1],direction:a[o].toUpperCase()});break;case 267:this.$=new r.Expression({expression:a[o-2],direction:a[o-1].toUpperCase()}),r.extend(this.$,a[o]);break;case 268:this.$=new r.Expression({expression:a[o-2],direction:"ASC",nocase:!0});break;case 269:this.$=new r.Expression({expression:a[o-3],direction:a[o].toUpperCase(),nocase:!0});break;case 271:this.$={limit:a[o-1]},r.extend(this.$,a[o]);break;case 272:this.$={limit:a[o-2],offset:a[o-6]};break;case 274:this.$={offset:a[o]};break;case 275:case 512:case 536:case 651:case 661:case 685:case 687:case 691:a[o-2].push(a[o]),this.$=a[o-2];break;case 277:case 279:case 281:a[o-2].as=a[o],this.$=a[o-2];break;case 278:case 280:case 282:a[o-1].as=a[o],this.$=a[o-1];break;case 284:this.$=new r.Column({columid:a[o],tableid:a[o-2],databaseid:a[o-4]});break;case 285:this.$=new r.Column({columnid:a[o],tableid:a[o-2]});break;case 286:this.$=new r.Column({columnid:a[o]});break;case 287:this.$=new r.Column({columnid:a[o],tableid:a[o-2],databaseid:a[o-4]});break;case 288:case 289:this.$=new r.Column({columnid:a[o],tableid:a[o-2]});break;case 290:this.$=new r.Column({columnid:a[o]});break;case 305:this.$=new r.DomainValueValue;break;case 306:this.$=new r.Json({value:a[o]});break;case 309:case 310:case 311:r.queries||(r.queries=[]),r.queries.push(a[o-1]),a[o-1].queriesidx=r.queries.length,this.$=a[o-1];break;case 312:this.$=a[o];break;case 313:this.$=new r.FuncValue({funcid:"CURRENT_TIMESTAMP"});break;case 314:this.$=new r.JavaScript({value:a[o].substr(2,a[o].length-4)});break;case 315:this.$=new r.JavaScript({value:'alasql.fn["'+a[o-2]+'"] = '+a[o].substr(2,a[o].length-4)});break;case 316:this.$=new r.JavaScript({value:'alasql.aggr["'+a[o-2]+'"] = '+a[o].substr(2,a[o].length-4)});break;case 317:this.$=new r.FuncValue({funcid:a[o],newid:!0});break;case 318:this.$=a[o],r.extend(this.$,{newid:!0});break;case 319:this.$=new r.Convert({expression:a[o-3]}),r.extend(this.$,a[o-1]);break;case 320:this.$=new r.Convert({expression:a[o-5],style:a[o-1]}),r.extend(this.$,a[o-3]);break;case 321:this.$=new r.Convert({expression:a[o-1]}),r.extend(this.$,a[o-3]);break;case 322:this.$=new r.Convert({expression:a[o-3],style:a[o-1]}),r.extend(this.$,a[o-5]);break;case 329:this.$=new r.FuncValue({funcid:"CURRENT_TIMESTAMP"});break;case 330:1<a[o-2].length&&("MAX"==a[o-4].toUpperCase()||"MIN"==a[o-4].toUpperCase())?this.$=new r.FuncValue({funcid:a[o-4],args:a[o-2]}):this.$=new r.AggrValue({aggregatorid:a[o-4].toUpperCase(),expression:a[o-2].pop(),over:a[o]});break;case 331:this.$=new r.AggrValue({aggregatorid:a[o-5].toUpperCase(),expression:a[o-2],distinct:!0,over:a[o]});break;case 332:this.$=new r.AggrValue({aggregatorid:a[o-5].toUpperCase(),expression:a[o-2],over:a[o]});break;case 334:case 335:this.$=new r.Over,r.extend(this.$,a[o-1]);break;case 336:this.$=new r.Over,r.extend(this.$,a[o-2]),r.extend(this.$,a[o-1]);break;case 337:this.$={partition:a[o]};break;case 338:this.$={order:a[o]};break;case 339:this.$="SUM";break;case 340:this.$="COUNT";break;case 341:this.$="MIN";break;case 342:case 547:this.$="MAX";break;case 343:this.$="AVG";break;case 344:this.$="FIRST";break;case 345:this.$="LAST";break;case 346:this.$="AGGR";break;case 347:this.$="ARRAY";break;case 348:var d=a[o-4],f=a[o-1];(!(1<f.length)||"MIN"!=d.toUpperCase()&&"MAX"!=d.toUpperCase())&&bi.aggr[a[o-4]]?this.$=new r.AggrValue({aggregatorid:"REDUCE",funcid:d,expression:f.pop(),distinct:"DISTINCT"==a[o-2]}):this.$=new r.FuncValue({funcid:d,args:f});break;case 349:this.$=new r.FuncValue({funcid:a[o-2]});break;case 350:this.$=new r.FuncValue({funcid:"IIF",args:a[o-1]});break;case 351:this.$=new r.FuncValue({funcid:"REPLACE",args:a[o-1]});break;case 352:this.$=new r.FuncValue({funcid:"DATEADD",args:[new r.StringValue({value:a[o-5]}),a[o-3],a[o-1]]});break;case 353:this.$=new r.FuncValue({funcid:"DATEADD",args:[a[o-5],a[o-3],a[o-1]]});break;case 354:this.$=new r.FuncValue({funcid:"DATEDIFF",args:[new r.StringValue({value:a[o-5]}),a[o-3],a[o-1]]});break;case 355:this.$=new r.FuncValue({funcid:"DATEDIFF",args:[a[o-5],a[o-3],a[o-1]]});break;case 356:this.$=new r.FuncValue({funcid:"INTERVAL",args:[a[o-1],new r.StringValue({value:a[o].toLowerCase()})]});break;case 358:a[o-2].push(a[o]),this.$=a[o-2];break;case 359:this.$=new r.NumValue({value:+a[o]});break;case 360:this.$=new r.LogicValue({value:!0});break;case 361:this.$=new r.LogicValue({value:!1});break;case 362:this.$=new r.StringValue({value:a[o].substr(1,a[o].length-2).replace(/(\\\')/g,"'").replace(/(\'\')/g,"'")});break;case 363:this.$=new r.StringValue({value:a[o].substr(2,a[o].length-3).replace(/(\\\')/g,"'").replace(/(\'\')/g,"'")});break;case 364:this.$=new r.NullValue({value:void 0});break;case 365:this.$=new r.VarValue({variable:a[o]});break;case 366:r.exists||(r.exists=[]),this.$=new r.ExistsValue({value:a[o-1],existsidx:r.exists.length}),r.exists.push(a[o-1]);break;case 367:this.$=new r.ArrayValue({value:a[o-1]});break;case 368:case 369:this.$=new r.ParamValue({param:a[o]});break;case 370:void 0===r.question&&(r.question=0),this.$=new r.ParamValue({param:r.question++});break;case 371:void 0===r.question&&(r.question=0),this.$=new r.ParamValue({param:r.question++,array:!0});break;case 372:this.$=new r.CaseValue({expression:a[o-3],whens:a[o-2],elses:a[o-1]});break;case 373:this.$=new r.CaseValue({whens:a[o-2],elses:a[o-1]});break;case 374:case 702:case 703:this.$=a[o-1],this.$.push(a[o]);break;case 376:this.$={when:a[o-2],then:a[o]};break;case 379:case 380:this.$=new r.Op({left:a[o-2],op:"REGEXP",right:a[o]});break;case 381:this.$=new r.Op({left:a[o-2],op:"GLOB",right:a[o]});break;case 382:this.$=new r.Op({left:a[o-2],op:"LIKE",right:a[o]});break;case 383:this.$=new r.Op({left:a[o-4],op:"LIKE",right:a[o-2],escape:a[o]});break;case 384:this.$=new r.Op({left:a[o-2],op:"NOT LIKE",right:a[o]});break;case 385:this.$=new r.Op({left:a[o-4],op:"NOT LIKE",right:a[o-2],escape:a[o]});break;case 386:this.$=new r.Op({left:a[o-2],op:"||",right:a[o]});break;case 387:this.$=new r.Op({left:a[o-2],op:"+",right:a[o]});break;case 388:this.$=new r.Op({left:a[o-2],op:"-",right:a[o]});break;case 389:this.$=new r.Op({left:a[o-2],op:"*",right:a[o]});break;case 390:this.$=new r.Op({left:a[o-2],op:"/",right:a[o]});break;case 391:this.$=new r.Op({left:a[o-2],op:"%",right:a[o]});break;case 392:this.$=new r.Op({left:a[o-2],op:"^",right:a[o]});break;case 393:this.$=new r.Op({left:a[o-2],op:">>",right:a[o]});break;case 394:this.$=new r.Op({left:a[o-2],op:"<<",right:a[o]});break;case 395:this.$=new r.Op({left:a[o-2],op:"&",right:a[o]});break;case 396:this.$=new r.Op({left:a[o-2],op:"|",right:a[o]});break;case 397:case 398:case 400:this.$=new r.Op({left:a[o-2],op:"->",right:a[o]});break;case 399:this.$=new r.Op({left:a[o-4],op:"->",right:a[o-1]});break;case 401:case 402:case 404:this.$=new r.Op({left:a[o-2],op:"!",right:a[o]});break;case 403:this.$=new r.Op({left:a[o-4],op:"!",right:a[o-1]});break;case 405:this.$=new r.Op({left:a[o-2],op:">",right:a[o]});break;case 406:this.$=new r.Op({left:a[o-2],op:">=",right:a[o]});break;case 407:this.$=new r.Op({left:a[o-2],op:"<",right:a[o]});break;case 408:this.$=new r.Op({left:a[o-2],op:"<=",right:a[o]});break;case 409:this.$=new r.Op({left:a[o-2],op:"=",right:a[o]});break;case 410:this.$=new r.Op({left:a[o-2],op:"==",right:a[o]});break;case 411:this.$=new r.Op({left:a[o-2],op:"===",right:a[o]});break;case 412:this.$=new r.Op({left:a[o-2],op:"!=",right:a[o]});break;case 413:this.$=new r.Op({left:a[o-2],op:"!==",right:a[o]});break;case 414:this.$=new r.Op({left:a[o-2],op:"!===",right:a[o]});break;case 415:r.queries||(r.queries=[]),this.$=new r.Op({left:a[o-5],op:a[o-4],allsome:a[o-3],right:a[o-1],queriesidx:r.queries.length}),r.queries.push(a[o-1]);break;case 416:this.$=new r.Op({left:a[o-5],op:a[o-4],allsome:a[o-3],right:a[o-1]});break;case 417:"BETWEEN1"==a[o-2].op?"AND"==a[o-2].left.op?this.$=new r.Op({left:a[o-2].left.left,op:"AND",right:new r.Op({left:a[o-2].left.right,op:"BETWEEN",right1:a[o-2].right,right2:a[o]})}):this.$=new r.Op({left:a[o-2].left,op:"BETWEEN",right1:a[o-2].right,right2:a[o]}):"NOT BETWEEN1"==a[o-2].op?"AND"==a[o-2].left.op?this.$=new r.Op({left:a[o-2].left.left,op:"AND",right:new r.Op({left:a[o-2].left.right,op:"NOT BETWEEN",right1:a[o-2].right,right2:a[o]})}):this.$=new r.Op({left:a[o-2].left,op:"NOT BETWEEN",right1:a[o-2].right,right2:a[o]}):this.$=new r.Op({left:a[o-2],op:"AND",right:a[o]});break;case 418:this.$=new r.Op({left:a[o-2],op:"OR",right:a[o]});break;case 419:this.$=new r.UniOp({op:"NOT",right:a[o]});break;case 420:this.$=new r.UniOp({op:"-",right:a[o]});break;case 421:this.$=new r.UniOp({op:"+",right:a[o]});break;case 422:this.$=new r.UniOp({op:"~",right:a[o]});break;case 423:this.$=new r.UniOp({op:"#",right:a[o]});break;case 424:this.$=new r.UniOp({right:a[o-1]});break;case 425:r.queries||(r.queries=[]),this.$=new r.Op({left:a[o-4],op:"IN",right:a[o-1],queriesidx:r.queries.length}),r.queries.push(a[o-1]);break;case 426:r.queries||(r.queries=[]),this.$=new r.Op({left:a[o-5],op:"NOT IN",right:a[o-1],queriesidx:r.queries.length}),r.queries.push(a[o-1]);break;case 427:this.$=new r.Op({left:a[o-4],op:"IN",right:a[o-1]});break;case 428:this.$=new r.Op({left:a[o-5],op:"NOT IN",right:a[o-1]});break;case 429:this.$=new r.Op({left:a[o-3],op:"IN",right:[]});break;case 430:this.$=new r.Op({left:a[o-4],op:"NOT IN",right:[]});break;case 431:case 433:this.$=new r.Op({left:a[o-2],op:"IN",right:a[o]});break;case 432:case 434:this.$=new r.Op({left:a[o-3],op:"NOT IN",right:a[o]});break;case 435:this.$=new r.Op({left:a[o-2],op:"BETWEEN1",right:a[o]});break;case 436:this.$=new r.Op({left:a[o-2],op:"NOT BETWEEN1",right:a[o]});break;case 437:this.$=new r.Op({op:"IS",left:a[o-2],right:a[o]});break;case 438:this.$=new r.Op({op:"IS",left:a[o-2],right:new r.UniOp({op:"NOT",right:new r.NullValue({value:void 0})})});break;case 439:this.$=new r.Convert({expression:a[o-2]}),r.extend(this.$,a[o]);break;case 440:case 441:this.$=a[o];break;case 442:this.$=a[o-1];break;case 449:this.$="ALL";break;case 450:this.$="SOME";break;case 451:this.$="ANY";break;case 452:this.$=new r.Update({table:a[o-4],columns:a[o-2],where:a[o]});break;case 453:this.$=new r.Update({table:a[o-2],columns:a[o]});break;case 456:this.$=new r.SetColumn({column:a[o-2],expression:a[o]});break;case 457:this.$=new r.SetColumn({variable:a[o-2],expression:a[o],method:a[o-3]});break;case 458:this.$=new r.Delete({table:a[o-2],where:a[o]});break;case 459:this.$=new r.Delete({table:a[o]});break;case 460:this.$=new r.Insert({into:a[o-2],values:a[o]});break;case 461:this.$=new r.Insert({into:a[o-1],values:a[o]});break;case 462:case 464:this.$=new r.Insert({into:a[o-2],values:a[o],orreplace:!0});break;case 463:case 465:this.$=new r.Insert({into:a[o-1],values:a[o],orreplace:!0});break;case 466:this.$=new r.Insert({into:a[o-2],default:!0});break;case 467:this.$=new r.Insert({into:a[o-5],columns:a[o-3],values:a[o]});break;case 468:this.$=new r.Insert({into:a[o-4],columns:a[o-2],values:a[o]});break;case 469:this.$=new r.Insert({into:a[o-1],select:a[o]});break;case 470:this.$=new r.Insert({into:a[o-1],select:a[o],orreplace:!0});break;case 471:this.$=new r.Insert({into:a[o-4],columns:a[o-2],select:a[o]});break;case 476:this.$=[a[o-1]];break;case 479:this.$=a[o-4],a[o-4].push(a[o-1]);break;case 480:case 481:case 483:case 491:this.$=a[o-2],a[o-2].push(a[o]);break;case 492:this.$=new r.CreateTable({table:a[o-4]}),r.extend(this.$,a[o-7]),r.extend(this.$,a[o-6]),r.extend(this.$,a[o-5]),r.extend(this.$,a[o-2]),r.extend(this.$,a[o]);break;case 493:this.$=new r.CreateTable({table:a[o]}),r.extend(this.$,a[o-3]),r.extend(this.$,a[o-2]),r.extend(this.$,a[o-1]);break;case 495:this.$={class:!0};break;case 505:this.$={temporary:!0};break;case 507:this.$={ifnotexists:!0};break;case 508:this.$={columns:a[o-2],constraints:a[o]};break;case 509:this.$={columns:a[o]};break;case 510:this.$={as:a[o]};break;case 511:case 535:this.$=[a[o]];break;case 513:case 514:case 515:case 516:case 517:a[o].constraintid=a[o-1],this.$=a[o];break;case 520:this.$={type:"CHECK",expression:a[o-1]};break;case 521:this.$={type:"PRIMARY KEY",columns:a[o-1],clustered:(a[o-3]+"").toUpperCase()};break;case 522:this.$={type:"FOREIGN KEY",columns:a[o-5],fktable:a[o-2],fkcolumns:a[o-1]};break;case 528:this.$={type:"UNIQUE",columns:a[o-1],clustered:(a[o-3]+"").toUpperCase()};break;case 537:this.$=new r.ColumnDef({columnid:a[o-2]}),r.extend(this.$,a[o-1]),r.extend(this.$,a[o]);break;case 538:this.$=new r.ColumnDef({columnid:a[o-1]}),r.extend(this.$,a[o]);break;case 539:this.$=new r.ColumnDef({columnid:a[o],dbtypeid:""});break;case 540:this.$={dbtypeid:a[o-5],dbsize:a[o-3],dbprecision:+a[o-1]};break;case 541:this.$={dbtypeid:a[o-3],dbsize:a[o-1]};break;case 542:this.$={dbtypeid:a[o]};break;case 543:this.$={dbtypeid:"ENUM",enumvalues:a[o-1]};break;case 544:this.$=a[o-1],a[o-1].dbtypeid+="["+a[o]+"]";break;case 546:case 753:this.$=+a[o];break;case 548:this.$=void 0;break;case 550:r.extend(a[o-1],a[o]),this.$=a[o-1];break;case 553:this.$={primarykey:!0};break;case 554:case 555:this.$={foreignkey:{table:a[o-1],columnid:a[o]}};break;case 556:this.$={identity:{value:a[o-3],step:a[o-1]}};break;case 557:this.$={identity:{value:1,step:1}};break;case 558:case 560:this.$={default:a[o]};break;case 559:this.$={default:a[o-1]};break;case 561:this.$={null:!0};break;case 562:this.$={notnull:!0};break;case 563:this.$={check:a[o]};break;case 564:this.$={unique:!0};break;case 565:this.$={onupdate:a[o]};break;case 566:this.$={onupdate:a[o-1]};break;case 567:this.$=new r.DropTable({tables:a[o],type:a[o-2]}),r.extend(this.$,a[o-1]);break;case 571:this.$={ifexists:!0};break;case 572:this.$=new r.AlterTable({table:a[o-3],renameto:a[o]});break;case 573:this.$=new r.AlterTable({table:a[o-3],addcolumn:a[o]});break;case 574:this.$=new r.AlterTable({table:a[o-3],modifycolumn:a[o]});break;case 575:this.$=new r.AlterTable({table:a[o-5],renamecolumn:a[o-2],to:a[o]});break;case 576:this.$=new r.AlterTable({table:a[o-3],dropcolumn:a[o]});break;case 577:this.$=new r.AlterTable({table:a[o-2],renameto:a[o]});break;case 578:this.$=new r.AttachDatabase({databaseid:a[o],engineid:a[o-2].toUpperCase()});break;case 579:this.$=new r.AttachDatabase({databaseid:a[o-3],engineid:a[o-5].toUpperCase(),args:a[o-1]});break;case 580:this.$=new r.AttachDatabase({databaseid:a[o-2],engineid:a[o-4].toUpperCase(),as:a[o]});break;case 581:this.$=new r.AttachDatabase({databaseid:a[o-5],engineid:a[o-7].toUpperCase(),as:a[o],args:a[o-3]});break;case 582:this.$=new r.DetachDatabase({databaseid:a[o]});break;case 583:this.$=new r.CreateDatabase({databaseid:a[o]}),r.extend(this.$,a[o]);break;case 584:this.$=new r.CreateDatabase({engineid:a[o-4].toUpperCase(),databaseid:a[o-1],as:a[o]}),r.extend(this.$,a[o-2]);break;case 585:this.$=new r.CreateDatabase({engineid:a[o-7].toUpperCase(),databaseid:a[o-4],args:a[o-2],as:a[o]}),r.extend(this.$,a[o-5]);break;case 586:this.$=new r.CreateDatabase({engineid:a[o-4].toUpperCase(),as:a[o],args:[a[o-1]]}),r.extend(this.$,a[o-2]);break;case 587:this.$=void 0;break;case 589:case 590:this.$=new r.UseDatabase({databaseid:a[o]});break;case 591:this.$=new r.DropDatabase({databaseid:a[o]}),r.extend(this.$,a[o-1]);break;case 592:case 593:this.$=new r.DropDatabase({databaseid:a[o],engineid:a[o-3].toUpperCase()}),r.extend(this.$,a[o-1]);break;case 594:this.$=new r.CreateIndex({indexid:a[o-5],table:a[o-3],columns:a[o-1]});break;case 595:this.$=new r.CreateIndex({indexid:a[o-5],table:a[o-3],columns:a[o-1],unique:!0});break;case 596:this.$=new r.DropIndex({indexid:a[o]});break;case 597:this.$=new r.ShowDatabases;break;case 598:this.$=new r.ShowDatabases({like:a[o]});break;case 599:this.$=new r.ShowDatabases({engineid:a[o-1].toUpperCase()});break;case 600:this.$=new r.ShowDatabases({engineid:a[o-3].toUpperCase(),like:a[o]});break;case 601:this.$=new r.ShowTables;break;case 602:this.$=new r.ShowTables({like:a[o]});break;case 603:this.$=new r.ShowTables({databaseid:a[o]});break;case 604:this.$=new r.ShowTables({like:a[o],databaseid:a[o-2]});break;case 605:this.$=new r.ShowColumns({table:a[o]});break;case 606:this.$=new r.ShowColumns({table:a[o-2],databaseid:a[o]});break;case 607:this.$=new r.ShowIndex({table:a[o]});break;case 608:this.$=new r.ShowIndex({table:a[o-2],databaseid:a[o]});break;case 609:this.$=new r.ShowCreateTable({table:a[o]});break;case 610:this.$=new r.ShowCreateTable({table:a[o-2],databaseid:a[o]});break;case 611:this.$=new r.CreateTable({table:a[o-6],view:!0,select:a[o-1],viewcolumns:a[o-4]}),r.extend(this.$,a[o-9]),r.extend(this.$,a[o-7]);break;case 612:this.$=new r.CreateTable({table:a[o-3],view:!0,select:a[o-1]}),r.extend(this.$,a[o-6]),r.extend(this.$,a[o-4]);break;case 616:this.$=new r.DropTable({tables:a[o],view:!0}),r.extend(this.$,a[o-1]);break;case 617:case 763:this.$=new r.ExpressionStatement({expression:a[o]});break;case 618:this.$=new r.Source({url:a[o].value});break;case 619:this.$=new r.Assert({value:a[o]});break;case 620:this.$=new r.Assert({value:a[o].value});break;case 621:this.$=new r.Assert({value:a[o],message:a[o-2]});break;case 623:case 634:case 636:this.$=a[o].value;break;case 624:case 632:this.$=+a[o].value;break;case 625:this.$=!!a[o].value;break;case 633:this.$=""+a[o].value;break;case 642:this.$={};break;case 645:this.$=[];break;case 646:r.extend(a[o-2],a[o]),this.$=a[o-2];break;case 648:this.$={},this.$[a[o-2].substr(1,a[o-2].length-2)]=a[o];break;case 649:case 650:this.$={},this.$[a[o-2]]=a[o];break;case 653:this.$=new r.SetVariable({variable:a[o-2].toLowerCase(),value:a[o]});break;case 654:this.$=new r.SetVariable({variable:a[o-1].toLowerCase(),value:a[o]});break;case 655:this.$=new r.SetVariable({variable:a[o-2],expression:a[o]});break;case 656:this.$=new r.SetVariable({variable:a[o-3],props:a[o-2],expression:a[o]});break;case 657:this.$=new r.SetVariable({variable:a[o-2],expression:a[o],method:a[o-3]});break;case 658:this.$=new r.SetVariable({variable:a[o-3],props:a[o-2],expression:a[o],method:a[o-4]});break;case 659:this.$="@";break;case 660:this.$="$";break;case 666:this.$=!0;break;case 667:this.$=!1;break;case 668:this.$=new r.CommitTransaction;break;case 669:this.$=new r.RollbackTransaction;break;case 670:this.$=new r.BeginTransaction;break;case 671:this.$=new r.If({expression:a[o-2],thenstat:a[o-1],elsestat:a[o]}),a[o-1].exists&&(this.$.exists=a[o-1].exists),a[o-1].queries&&(this.$.queries=a[o-1].queries);break;case 672:this.$=new r.If({expression:a[o-1],thenstat:a[o]}),a[o].exists&&(this.$.exists=a[o].exists),a[o].queries&&(this.$.queries=a[o].queries);break;case 673:this.$=a[o];break;case 674:this.$=new r.While({expression:a[o-1],loopstat:a[o]}),a[o].exists&&(this.$.exists=a[o].exists),a[o].queries&&(this.$.queries=a[o].queries);break;case 675:this.$=new r.Continue;break;case 676:this.$=new r.Break;break;case 677:this.$=new r.BeginEnd({statements:a[o-1]});break;case 678:this.$=new r.Print({exprs:a[o]});break;case 679:this.$=new r.Print({select:a[o]});break;case 680:this.$=new r.Require({paths:a[o]});break;case 681:this.$=new r.Require({plugins:a[o]});break;case 682:case 683:this.$=a[o].toUpperCase();break;case 684:this.$=new r.Echo({expr:a[o]});break;case 689:this.$=new r.Declare({declares:a[o]});break;case 692:this.$={variable:a[o-1]},r.extend(this.$,a[o]);break;case 693:this.$={variable:a[o-2]},r.extend(this.$,a[o]);break;case 694:this.$={variable:a[o-3],expression:a[o]},r.extend(this.$,a[o-2]);break;case 695:this.$={variable:a[o-4],expression:a[o]},r.extend(this.$,a[o-2]);break;case 696:this.$=new r.TruncateTable({table:a[o]});break;case 697:this.$=new r.Merge,r.extend(this.$,a[o-4]),r.extend(this.$,a[o-3]),r.extend(this.$,a[o-2]),r.extend(this.$,{matches:a[o-1]}),r.extend(this.$,a[o]);break;case 698:case 699:this.$={into:a[o]};break;case 701:this.$={on:a[o]};break;case 706:this.$={matched:!0,action:a[o]};break;case 707:this.$={matched:!0,expr:a[o-2],action:a[o]};break;case 708:this.$={delete:!0};break;case 709:this.$={update:a[o]};break;case 710:case 711:this.$={matched:!1,bytarget:!0,action:a[o]};break;case 712:case 713:this.$={matched:!1,bytarget:!0,expr:a[o-2],action:a[o]};break;case 714:this.$={matched:!1,bysource:!0,action:a[o]};break;case 715:this.$={matched:!1,bysource:!0,expr:a[o-2],action:a[o]};break;case 716:this.$={insert:!0,values:a[o]};break;case 717:this.$={insert:!0,values:a[o],columns:a[o-3]};break;case 718:this.$={insert:!0,defaultvalues:!0};break;case 719:this.$={insert:!0,defaultvalues:!0,columns:a[o-3]};break;case 721:this.$={output:{columns:a[o]}};break;case 722:this.$={output:{columns:a[o-3],intovar:a[o],method:a[o-1]}};break;case 723:this.$={output:{columns:a[o-2],intotable:a[o]}};break;case 724:this.$={output:{columns:a[o-5],intotable:a[o-3],intocolumns:a[o-1]}};break;case 725:this.$=new r.CreateVertex({class:a[o-3],sharp:a[o-2],name:a[o-1]}),r.extend(this.$,a[o]);break;case 728:this.$={sets:a[o]};break;case 729:this.$={content:a[o]};break;case 730:this.$={select:a[o]};break;case 731:this.$=new r.CreateEdge({from:a[o-3],to:a[o-1],name:a[o-5]}),r.extend(this.$,a[o]);break;case 732:this.$=new r.CreateGraph({graph:a[o]});break;case 733:this.$=new r.CreateGraph({from:a[o]});break;case 736:this.$=a[o-2],a[o-1]&&(this.$.json=new r.Json({value:a[o-1]})),a[o]&&(this.$.as=a[o]);break;case 737:this.$={source:a[o-6],target:a[o]},a[o-3]&&(this.$.json=new r.Json({value:a[o-3]})),a[o-2]&&(this.$.as=a[o-2]),r.extend(this.$,a[o-4]);break;case 738:this.$={source:a[o-5],target:a[o]},a[o-2]&&(this.$.json=new r.Json({value:a[o-3]})),a[o-1]&&(this.$.as=a[o-2]);break;case 739:this.$={source:a[o-2],target:a[o]};break;case 743:this.$={vars:a[o],method:a[o-1]};break;case 746:case 747:f=a[o-1];this.$={prop:a[o-3],sharp:a[o-2],name:void 0===f?void 0:f.substr(1,f.length-2),class:a[o]};break;case 748:var p=a[o-1];this.$={sharp:a[o-2],name:void 0===p?void 0:p.substr(1,p.length-2),class:a[o]};break;case 749:p=a[o-1];this.$={name:void 0===p?void 0:p.substr(1,p.length-2),class:a[o]};break;case 750:this.$={class:a[o]};break;case 756:this.$=new r.AddRule({left:a[o-2],right:a[o]});break;case 757:this.$=new r.AddRule({right:a[o]});break;case 760:this.$=new r.Term({termid:a[o]});break;case 761:this.$=new r.Term({termid:a[o-3],args:a[o-1]});break;case 764:this.$=new r.CreateTrigger({trigger:a[o-6],when:a[o-5],action:a[o-4],table:a[o-2],statement:a[o]}),a[o].exists&&(this.$.exists=a[o].exists),a[o].queries&&(this.$.queries=a[o].queries);break;case 765:this.$=new r.CreateTrigger({trigger:a[o-5],when:a[o-4],action:a[o-3],table:a[o-1],funcid:a[o]});break;case 766:this.$=new r.CreateTrigger({trigger:a[o-6],when:a[o-4],action:a[o-3],table:a[o-5],statement:a[o]}),a[o].exists&&(this.$.exists=a[o].exists),a[o].queries&&(this.$.queries=a[o].queries);break;case 767:case 768:case 770:this.$="AFTER";break;case 769:this.$="BEFORE";break;case 771:this.$="INSTEADOF";break;case 772:this.$="INSERT";break;case 773:this.$="DELETE";break;case 774:this.$="UPDATE";break;case 775:this.$=new r.DropTrigger({trigger:a[o]});break;case 776:this.$=new r.Reindex({indexid:a[o]});break;case 1050:case 1070:case 1072:case 1074:case 1078:case 1080:case 1082:case 1084:case 1086:case 1088:this.$=[];break;case 1051:case 1065:case 1067:case 1071:case 1073:case 1075:case 1079:case 1081:case 1083:case 1085:case 1087:case 1089:a[o-1].push(a[o]);break;case 1064:case 1066:this.$=[a[o]];}},table:[e([10,604,765],t,{8:1,9:2,12:3,13:4,17:5,18:7,19:8,20:9,21:10,22:11,23:12,24:13,25:14,26:15,27:16,28:17,29:18,30:19,31:20,32:21,33:22,34:23,35:24,36:25,37:26,38:27,39:28,40:29,41:30,42:31,43:32,44:33,45:34,46:35,47:36,48:37,49:38,50:39,51:40,52:41,54:43,55:44,56:45,57:46,58:47,59:48,60:49,61:50,62:51,63:52,64:53,65:54,66:55,67:56,68:57,69:58,70:59,71:60,79:75,506:95,184:99,3:100,2:n,4:r,5:s,14:a,53:i,72:o,89:u,124:c,146:l,156:h,189:d,270:f,271:p,292:b,337:E,340:g,341:m,398:S,402:T,403:v,406:A,408:y,410:N,411:C,419:R,420:O,436:w,438:I,439:x,441:k,442:D,443:L,444:$,445:M,449:U,450:_,453:F,454:P,507:q,509:G,510:V,519:B}),{1:[3]},{10:[1,105],11:106,604:j,765:H},e(J,[2,8]),e(J,[2,9]),e(Y,[2,12]),e(J,t,{17:5,18:7,19:8,20:9,21:10,22:11,23:12,24:13,25:14,26:15,27:16,28:17,29:18,30:19,31:20,32:21,33:22,34:23,35:24,36:25,37:26,38:27,39:28,40:29,41:30,42:31,43:32,44:33,45:34,46:35,47:36,48:37,49:38,50:39,51:40,52:41,54:43,55:44,56:45,57:46,58:47,59:48,60:49,61:50,62:51,63:52,64:53,65:54,66:55,67:56,68:57,69:58,70:59,71:60,79:75,506:95,184:99,3:100,12:109,2:n,4:r,5:s,15:[1,110],53:i,72:o,89:u,124:c,146:l,156:h,189:d,270:f,271:p,292:b,337:E,340:g,341:m,398:S,402:T,403:v,406:A,408:y,410:N,411:C,419:R,420:O,436:w,438:I,439:x,441:k,442:D,443:L,444:$,445:M,449:U,450:_,453:F,454:P,507:q,509:G,510:V,519:B}),e(Y,[2,14]),e(Y,[2,15]),e(Y,[2,16]),e(Y,[2,17]),e(Y,[2,18]),e(Y,[2,19]),e(Y,[2,20]),e(Y,[2,21]),e(Y,[2,22]),e(Y,[2,23]),e(Y,[2,24]),e(Y,[2,25]),e(Y,[2,26]),e(Y,[2,27]),e(Y,[2,28]),e(Y,[2,29]),e(Y,[2,30]),e(Y,[2,31]),e(Y,[2,32]),e(Y,[2,33]),e(Y,[2,34]),e(Y,[2,35]),e(Y,[2,36]),e(Y,[2,37]),e(Y,[2,38]),e(Y,[2,39]),e(Y,[2,40]),e(Y,[2,41]),e(Y,[2,42]),e(Y,[2,43]),e(Y,[2,44]),e(Y,[2,45]),e(Y,[2,46]),e(Y,[2,47]),e(Y,[2,48]),e(Y,[2,49]),e(Y,[2,50]),e(Y,[2,51]),e(Y,[2,52]),e(Y,[2,53]),e(Y,[2,54]),e(Y,[2,55]),e(Y,[2,56]),e(Y,[2,57]),e(Y,[2,58]),e(Y,[2,59]),e(Y,[2,60]),e(Y,[2,61]),e(Y,[2,62]),e(Y,[2,63]),e(Y,[2,64]),e(Y,[2,65]),e(Y,[2,66]),e(Y,[2,67]),{355:[1,111]},{2:n,3:112,4:r,5:s},{2:n,3:114,4:r,5:s,156:W,200:113,292:X,293:K,294:Q,295:z},e(Z,[2,504],{3:121,350:125,2:n,4:r,5:s,134:ee,135:te,187:[1,123],193:[1,122],272:[1,129],273:[1,130],359:[1,131],407:[1,120],474:[1,124],511:[1,128]}),{145:ne,451:132,452:133},{183:[1,135]},{407:[1,136]},{2:n,3:138,4:r,5:s,130:[1,144],193:[1,139],355:[1,143],399:140,407:[1,137],412:[1,141],511:[1,142]},{2:n,3:168,4:r,5:s,56:165,77:re,94:145,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(qe,Ge,{342:204,171:[1,205],198:Ve}),e(qe,Ge,{342:207,198:Ve}),{2:n,3:219,4:r,5:s,77:Be,132:je,143:oe,144:212,145:ue,152:le,156:W,181:pe,198:[1,210],199:213,200:215,201:214,202:217,209:209,213:He,214:218,292:X,293:K,294:Q,295:z,304:$e,421:190,422:Fe,426:Pe,455:208},{2:n,3:221,4:r,5:s},{355:[1,222]},e(Je,[2,1046],{80:223,106:224,107:[1,225]}),e(Ye,[2,1050],{90:226}),{2:n,3:230,4:r,5:s,190:[1,228],193:[1,231],271:[1,227],355:[1,232],407:[1,229]},{355:[1,233]},{2:n,3:236,4:r,5:s,73:234,75:235},e([308,604,765],t,{12:3,13:4,17:5,18:7,19:8,20:9,21:10,22:11,23:12,24:13,25:14,26:15,27:16,28:17,29:18,30:19,31:20,32:21,33:22,34:23,35:24,36:25,37:26,38:27,39:28,40:29,41:30,42:31,43:32,44:33,45:34,46:35,47:36,48:37,49:38,50:39,51:40,52:41,54:43,55:44,56:45,57:46,58:47,59:48,60:49,61:50,62:51,63:52,64:53,65:54,66:55,67:56,68:57,69:58,70:59,71:60,79:75,506:95,184:99,3:100,9:238,2:n,4:r,5:s,14:a,53:i,72:o,89:u,124:c,146:l,156:h,189:d,270:f,271:p,292:b,337:E,340:g,341:m,398:S,402:T,403:v,406:A,408:y,410:N,411:C,419:R,420:O,436:w,437:[1,237],438:I,439:x,441:k,442:D,443:L,444:$,445:M,449:U,450:_,453:F,454:P,507:q,509:G,510:V,519:B}),{437:[1,239]},{437:[1,240]},{2:n,3:242,4:r,5:s,407:[1,241]},{2:n,3:244,4:r,5:s,199:243},e(We,[2,314]),{113:245,132:ae,298:xe},{2:n,3:114,4:r,5:s,113:251,131:se,132:[1,248],143:oe,144:246,145:Xe,152:le,156:W,181:pe,196:250,200:255,201:254,261:252,262:253,269:Ke,278:247,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,304:$e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:257,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Y,[2,675]),e(Y,[2,676]),{2:n,3:168,4:r,5:s,40:259,56:165,77:re,79:75,89:u,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:258,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,184:99,189:d,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:266,4:r,5:s,113:263,132:ae,298:xe,446:261,447:262,448:264,449:Qe},{2:n,3:267,4:r,5:s,143:ze,145:Ze,433:268},{2:n,3:168,4:r,5:s,56:165,77:re,94:271,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{507:[1,272]},{2:n,3:100,4:r,5:s,506:274,508:273},{2:n,3:114,4:r,5:s,156:W,200:275,292:X,293:K,294:Q,295:z},{2:n,3:168,4:r,5:s,56:165,77:re,94:276,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(et,tt,{186:280,164:[1,279],185:[1,277],187:[1,278],195:nt}),e(rt,[2,760],{77:[1,282]}),e([2,4,5,10,72,77,78,93,98,107,118,128,131,132,137,143,145,152,154,156,162,164,168,169,179,180,181,183,185,187,195,198,232,244,245,249,251,269,270,274,275,277,284,285,286,287,288,289,290,292,293,294,295,296,297,298,299,300,301,304,305,308,312,314,319,422,426,604,765],[2,152],{149:[1,283],150:[1,284],190:[1,285],191:[1,286],192:[1,287],193:[1,288],194:[1,289]}),e(st,[2,1]),e(st,[2,2]),{6:290,131:[1,439],172:[1,462],243:[1,438],244:[1,373],245:[1,407],249:[1,411],372:[1,404],383:[1,295],404:[1,297],412:[1,549],416:[1,471],418:[1,443],419:[1,509],435:[1,442],437:[1,525],442:[1,342],462:[1,418],466:[1,448],472:[1,341],516:[1,307],517:[1,299],518:[1,399],520:[1,291],521:[1,292],522:[1,293],523:[1,294],524:[1,296],525:[1,298],526:[1,300],527:[1,301],528:[1,302],529:[1,303],530:[1,304],531:[1,305],532:[1,306],533:[1,308],534:[1,309],535:[1,310],536:[1,311],537:[1,312],538:[1,313],539:[1,314],540:[1,315],541:[1,316],542:[1,317],543:[1,318],544:[1,319],545:[1,320],546:[1,321],547:[1,322],548:[1,323],549:[1,324],550:[1,325],551:[1,326],552:[1,327],553:[1,328],554:[1,329],555:[1,330],556:[1,331],557:[1,332],558:[1,333],559:[1,334],560:[1,335],561:[1,336],562:[1,337],563:[1,338],564:[1,339],565:[1,340],566:[1,343],567:[1,344],568:[1,345],569:[1,346],570:[1,347],571:[1,348],572:[1,349],573:[1,350],574:[1,351],575:[1,352],576:[1,353],577:[1,354],578:[1,355],579:[1,356],580:[1,357],581:[1,358],582:[1,359],583:[1,360],584:[1,361],585:[1,362],586:[1,363],587:[1,364],588:[1,365],589:[1,366],590:[1,367],591:[1,368],592:[1,369],593:[1,370],594:[1,371],595:[1,372],596:[1,374],597:[1,375],598:[1,376],599:[1,377],600:[1,378],601:[1,379],602:[1,380],603:[1,381],604:[1,382],605:[1,383],606:[1,384],607:[1,385],608:[1,386],609:[1,387],610:[1,388],611:[1,389],612:[1,390],613:[1,391],614:[1,392],615:[1,393],616:[1,394],617:[1,395],618:[1,396],619:[1,397],620:[1,398],621:[1,400],622:[1,401],623:[1,402],624:[1,403],625:[1,405],626:[1,406],627:[1,408],628:[1,409],629:[1,410],630:[1,412],631:[1,413],632:[1,414],633:[1,415],634:[1,416],635:[1,417],636:[1,419],637:[1,420],638:[1,421],639:[1,422],640:[1,423],641:[1,424],642:[1,425],643:[1,426],644:[1,427],645:[1,428],646:[1,429],647:[1,430],648:[1,431],649:[1,432],650:[1,433],651:[1,434],652:[1,435],653:[1,436],654:[1,437],655:[1,440],656:[1,441],657:[1,444],658:[1,445],659:[1,446],660:[1,447],661:[1,449],662:[1,450],663:[1,451],664:[1,452],665:[1,453],666:[1,454],667:[1,455],668:[1,456],669:[1,457],670:[1,458],671:[1,459],672:[1,460],673:[1,461],674:[1,463],675:[1,464],676:[1,465],677:[1,466],678:[1,467],679:[1,468],680:[1,469],681:[1,470],682:[1,472],683:[1,473],684:[1,474],685:[1,475],686:[1,476],687:[1,477],688:[1,478],689:[1,479],690:[1,480],691:[1,481],692:[1,482],693:[1,483],694:[1,484],695:[1,485],696:[1,486],697:[1,487],698:[1,488],699:[1,489],700:[1,490],701:[1,491],702:[1,492],703:[1,493],704:[1,494],705:[1,495],706:[1,496],707:[1,497],708:[1,498],709:[1,499],710:[1,500],711:[1,501],712:[1,502],713:[1,503],714:[1,504],715:[1,505],716:[1,506],717:[1,507],718:[1,508],719:[1,510],720:[1,511],721:[1,512],722:[1,513],723:[1,514],724:[1,515],725:[1,516],726:[1,517],727:[1,518],728:[1,519],729:[1,520],730:[1,521],731:[1,522],732:[1,523],733:[1,524],734:[1,526],735:[1,527],736:[1,528],737:[1,529],738:[1,530],739:[1,531],740:[1,532],741:[1,533],742:[1,534],743:[1,535],744:[1,536],745:[1,537],746:[1,538],747:[1,539],748:[1,540],749:[1,541],750:[1,542],751:[1,543],752:[1,544],753:[1,545],754:[1,546],755:[1,547],756:[1,548],757:[1,550],758:[1,551],759:[1,552],760:[1,553],761:[1,554],762:[1,555],763:[1,556],764:[1,557]},{1:[2,6]},e(J,t,{17:5,18:7,19:8,20:9,21:10,22:11,23:12,24:13,25:14,26:15,27:16,28:17,29:18,30:19,31:20,32:21,33:22,34:23,35:24,36:25,37:26,38:27,39:28,40:29,41:30,42:31,43:32,44:33,45:34,46:35,47:36,48:37,49:38,50:39,51:40,52:41,54:43,55:44,56:45,57:46,58:47,59:48,60:49,61:50,62:51,63:52,64:53,65:54,66:55,67:56,68:57,69:58,70:59,71:60,79:75,506:95,184:99,3:100,12:558,2:n,4:r,5:s,53:i,72:o,89:u,124:c,146:l,156:h,189:d,270:f,271:p,292:b,337:E,340:g,341:m,398:S,402:T,403:v,406:A,408:y,410:N,411:C,419:R,420:O,436:w,438:I,439:x,441:k,442:D,443:L,444:$,445:M,449:U,450:_,453:F,454:P,507:q,509:G,510:V,519:B}),e(at,[2,1044]),e(at,[2,1045]),e(J,[2,10]),{16:[1,559]},{2:n,3:244,4:r,5:s,199:560},{407:[1,561]},e(Y,[2,763]),{77:it},{77:[1,563]},{77:ot},{77:[1,565]},{77:[1,566]},{2:n,3:168,4:r,5:s,56:165,77:re,94:567,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(qe,ut,{352:568,156:ct}),{407:[1,570]},{2:n,3:571,4:r,5:s},{193:[1,572]},{2:n,3:578,4:r,5:s,132:lt,137:ht,143:ze,145:Ze,152:dt,183:[1,574],433:585,475:573,476:575,477:576,480:577,484:582,495:579,499:581},{130:[1,589],351:586,355:[1,588],412:[1,587]},{113:591,132:ae,183:[2,1144],298:xe,473:590},e(ft,[2,1138],{467:592,3:593,2:n,4:r,5:s}),{2:n,3:594,4:r,5:s},{4:[1,595]},{4:[1,596]},e(Z,[2,505]),e(Y,[2,689],{74:[1,597]}),e(pt,[2,690]),{2:n,3:598,4:r,5:s},{2:n,3:244,4:r,5:s,199:599},{2:n,3:600,4:r,5:s},e(qe,bt,{400:601,156:Et}),{407:[1,603]},{2:n,3:604,4:r,5:s},e(qe,bt,{400:605,156:Et}),e(qe,bt,{400:606,156:Et}),{2:n,3:607,4:r,5:s},e(gt,[2,1132]),e(gt,[2,1133]),e(Y,t,{17:5,18:7,19:8,20:9,21:10,22:11,23:12,24:13,25:14,26:15,27:16,28:17,29:18,30:19,31:20,32:21,33:22,34:23,35:24,36:25,37:26,38:27,39:28,40:29,41:30,42:31,43:32,44:33,45:34,46:35,47:36,48:37,49:38,50:39,51:40,52:41,54:43,55:44,56:45,57:46,58:47,59:48,60:49,61:50,62:51,63:52,64:53,65:54,66:55,67:56,68:57,69:58,70:59,71:60,79:75,506:95,184:99,3:100,12:608,114:625,329:637,2:n,4:r,5:s,53:i,72:o,89:u,99:mt,112:St,115:Tt,116:vt,123:At,124:yt,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,146:l,154:kt,156:h,170:Dt,171:Lt,179:$t,180:Mt,189:d,270:f,271:p,292:b,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en,337:E,340:g,341:m,398:S,402:T,403:v,406:A,408:y,410:N,411:C,419:R,420:O,436:w,438:I,439:x,441:k,442:D,443:L,444:$,445:M,449:U,450:_,453:F,454:P,507:q,509:G,510:V,519:B}),e(We,[2,291]),e(We,[2,292]),e(We,[2,293]),e(We,[2,294]),e(We,[2,295]),e(We,[2,296]),e(We,[2,297]),e(We,[2,298]),e(We,[2,299]),e(We,[2,300]),e(We,[2,301]),e(We,[2,302]),e(We,[2,303]),e(We,[2,304]),e(We,[2,305]),e(We,[2,306]),e(We,[2,307]),e(We,[2,308]),{2:n,3:168,4:r,5:s,26:654,27:653,36:649,40:648,56:165,77:re,79:75,89:u,94:651,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,184:99,189:d,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,268:650,269:ge,270:f,271:[1,655],274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:[1,652],293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,341:m,421:190,422:Fe,426:Pe},e(We,[2,312]),e(We,[2,313]),{77:[1,656]},e([2,4,5,10,53,72,74,76,78,89,93,95,98,99,107,112,115,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],tn,{77:it,116:[1,657]}),{2:n,3:168,4:r,5:s,56:165,77:re,94:658,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:659,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:660,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:661,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:662,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(We,[2,286]),e([2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,230,231,232,239,244,245,246,247,249,251,253,269,270,271,274,275,277,284,285,286,287,288,289,290,292,293,294,295,296,297,298,299,300,301,302,304,305,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,345,358,370,371,375,376,398,402,403,406,408,410,411,417,419,420,422,426,428,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765,766,767],[2,359]),e(nn,[2,360]),e(nn,[2,361]),e(nn,rn),e(nn,[2,363]),e([2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,230,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,299,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,345,358,370,371,375,376,398,402,403,406,408,410,411,419,420,422,426,428,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],[2,364]),{2:n,3:664,4:r,5:s,131:[1,665],303:663},{2:n,3:666,4:r,5:s},e(nn,[2,370]),e(nn,[2,371]),{2:n,3:667,4:r,5:s,77:sn,113:669,131:se,132:ae,143:oe,152:le,181:pe,196:670,201:672,261:671,296:we,297:Ie,298:xe,304:$e,421:673,426:Pe},{77:[1,674]},{2:n,3:168,4:r,5:s,56:165,77:re,94:675,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,306:676,309:677,310:an,314:Ue,319:_e,421:190,422:Fe,426:Pe},{77:[1,679]},{77:[1,680]},e(on,[2,627]),{2:n,3:695,4:r,5:s,77:un,111:690,113:688,131:se,132:ae,143:oe,144:685,145:Xe,152:le,156:W,181:pe,196:687,200:693,201:692,261:689,262:691,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,302:[1,683],304:$e,421:190,422:Fe,423:681,424:684,425:686,426:Pe,429:682},{2:n,3:168,4:r,5:s,56:165,77:re,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:696,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:697,4:r,5:s,156:W,200:698,292:X,293:K,294:Q,295:z},{77:[2,339]},{77:[2,340]},{77:[2,341]},{77:[2,342]},{77:[2,343]},{77:[2,344]},{77:[2,345]},{77:[2,346]},{77:[2,347]},{2:n,3:704,4:r,5:s,131:cn,132:ln,427:699,428:[1,700],430:701},{2:n,3:244,4:r,5:s,199:705},{292:[1,706]},e(qe,[2,475]),{2:n,3:244,4:r,5:s,199:707},{231:[1,709],456:708},{231:[2,698]},{2:n,3:219,4:r,5:s,77:Be,132:je,143:oe,144:212,145:ue,152:le,156:W,181:pe,199:213,200:215,201:214,202:217,209:710,213:He,214:218,292:X,293:K,294:Q,295:z,304:$e,421:190,422:Fe,426:Pe},{40:711,79:75,89:u,184:99,189:d},e(hn,[2,1094],{210:712,76:[1,713]}),e(dn,[2,185],{3:714,2:n,4:r,5:s,76:[1,715],154:[1,716]}),e(dn,[2,189],{3:717,2:n,4:r,5:s,76:[1,718]}),e(dn,[2,190],{3:719,2:n,4:r,5:s,76:[1,720]}),e(dn,[2,193]),e(dn,[2,194],{3:721,2:n,4:r,5:s,76:[1,722]}),e(dn,[2,197],{3:723,2:n,4:r,5:s,76:[1,724]}),e([2,4,5,10,72,74,76,78,93,98,118,128,154,162,168,169,183,206,208,222,223,224,225,226,227,228,229,230,231,232,249,251,308,312,604,765],fn,{77:it,116:pn}),e([2,4,5,10,72,74,76,78,93,98,118,128,162,168,169,206,208,222,223,224,225,226,227,228,229,230,231,232,249,251,308,312,604,765],[2,200]),e(Y,[2,776]),{2:n,3:244,4:r,5:s,199:726},e(bn,En,{81:727,198:gn}),e(Je,[2,1047]),e(mn,[2,1060],{108:729,190:[1,730]}),e([10,78,183,308,312,604,765],En,{421:190,81:731,117:732,3:733,114:736,144:758,158:768,160:769,2:n,4:r,5:s,72:Sn,76:Tn,77:vn,112:An,115:Tt,116:vt,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,198:gn,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,422:Fe,426:Pe}),{355:[1,782]},{183:[1,783]},e(Y,[2,597],{112:[1,784]}),{407:[1,785]},{183:[1,786]},e(Y,[2,601],{112:[1,787],183:[1,788]}),{2:n,3:244,4:r,5:s,199:789},{40:790,74:[1,791],79:75,89:u,184:99,189:d},e(cr,[2,70]),{76:[1,792]},e(Y,[2,670]),{11:106,308:[1,793],604:j,765:H},e(Y,[2,668]),e(Y,[2,669]),{2:n,3:794,4:r,5:s},e(Y,[2,590]),{146:[1,795]},e([2,4,5,10,53,72,74,76,77,78,89,95,124,128,143,145,146,148,149,152,154,156,181,183,187,189,230,270,271,292,299,304,308,312,337,340,341,345,346,358,370,371,375,376,398,402,403,404,405,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,507,509,510,516,517,518,519,604,765],fn,{116:pn}),e(Y,[2,618]),e(Y,[2,619]),e(Y,[2,620]),e(Y,rn,{74:[1,796]}),{77:sn,113:669,131:se,132:ae,143:oe,152:le,181:pe,196:670,201:672,261:671,296:we,297:Ie,298:xe,304:$e,421:673,426:Pe},e(lr,[2,323]),e(lr,[2,324]),e(lr,[2,325]),e(lr,[2,326]),e(lr,[2,327]),e(lr,[2,328]),e(lr,[2,329]),e(Y,t,{17:5,18:7,19:8,20:9,21:10,22:11,23:12,24:13,25:14,26:15,27:16,28:17,29:18,30:19,31:20,32:21,33:22,34:23,35:24,36:25,37:26,38:27,39:28,40:29,41:30,42:31,43:32,44:33,45:34,46:35,47:36,48:37,49:38,50:39,51:40,52:41,54:43,55:44,56:45,57:46,58:47,59:48,60:49,61:50,62:51,63:52,64:53,65:54,66:55,67:56,68:57,69:58,70:59,71:60,79:75,506:95,184:99,3:100,114:625,329:637,12:797,2:n,4:r,5:s,53:i,72:o,89:u,99:mt,112:St,115:Tt,116:vt,123:At,124:yt,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,146:l,154:kt,156:h,170:Dt,171:Lt,179:$t,180:Mt,189:d,270:f,271:p,292:b,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en,337:E,340:g,341:m,398:S,402:T,403:v,406:A,408:y,410:N,411:C,419:R,420:O,436:w,438:I,439:x,441:k,442:D,443:L,444:$,445:M,449:U,450:_,453:F,454:P,507:q,509:G,510:V,519:B}),e(Y,[2,678],{74:hr}),e(Y,[2,679]),e(dr,[2,357],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(Y,[2,680],{74:[1,800]}),e(Y,[2,681],{74:[1,801]}),e(pt,[2,686]),e(pt,[2,688]),e(pt,[2,682]),e(pt,[2,683]),{114:807,115:Tt,116:vt,124:[1,802],230:pr,431:803,432:804,435:br},{2:n,3:808,4:r,5:s},e(qe,[2,659]),e(qe,[2,660]),e(Y,[2,617],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{2:n,3:100,4:r,5:s,506:274,508:809},e(Y,[2,757],{74:Er}),e(gr,[2,759]),e(Y,[2,762]),e(Y,[2,684],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(mr,tt,{186:811,195:nt}),e(mr,tt,{186:812,195:nt}),e(mr,tt,{186:813,195:nt}),e(Sr,[2,1090],{259:146,200:147,260:148,111:149,258:150,196:151,261:152,113:153,262:154,201:155,202:156,263:157,264:158,265:159,144:161,266:162,267:163,56:165,158:167,3:168,421:190,188:814,174:815,257:816,94:817,2:n,4:r,5:s,77:re,131:se,132:ae,137:ie,143:oe,145:ue,149:ce,152:le,154:he,156:W,179:de,180:fe,181:pe,244:be,245:Ee,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,422:Fe,426:Pe}),{77:[1,819],131:se,196:818},{2:n,3:100,4:r,5:s,506:274,508:820},e(Tr,[2,153]),e(Tr,[2,154]),e(Tr,[2,155]),e(Tr,[2,156]),e(Tr,[2,157]),e(Tr,[2,158]),e(Tr,[2,159]),e(st,[2,3]),e(st,[2,777]),e(st,[2,778]),e(st,[2,779]),e(st,[2,780]),e(st,[2,781]),e(st,[2,782]),e(st,[2,783]),e(st,[2,784]),e(st,[2,785]),e(st,[2,786]),e(st,[2,787]),e(st,[2,788]),e(st,[2,789]),e(st,[2,790]),e(st,[2,791]),e(st,[2,792]),e(st,[2,793]),e(st,[2,794]),e(st,[2,795]),e(st,[2,796]),e(st,[2,797]),e(st,[2,798]),e(st,[2,799]),e(st,[2,800]),e(st,[2,801]),e(st,[2,802]),e(st,[2,803]),e(st,[2,804]),e(st,[2,805]),e(st,[2,806]),e(st,[2,807]),e(st,[2,808]),e(st,[2,809]),e(st,[2,810]),e(st,[2,811]),e(st,[2,812]),e(st,[2,813]),e(st,[2,814]),e(st,[2,815]),e(st,[2,816]),e(st,[2,817]),e(st,[2,818]),e(st,[2,819]),e(st,[2,820]),e(st,[2,821]),e(st,[2,822]),e(st,[2,823]),e(st,[2,824]),e(st,[2,825]),e(st,[2,826]),e(st,[2,827]),e(st,[2,828]),e(st,[2,829]),e(st,[2,830]),e(st,[2,831]),e(st,[2,832]),e(st,[2,833]),e(st,[2,834]),e(st,[2,835]),e(st,[2,836]),e(st,[2,837]),e(st,[2,838]),e(st,[2,839]),e(st,[2,840]),e(st,[2,841]),e(st,[2,842]),e(st,[2,843]),e(st,[2,844]),e(st,[2,845]),e(st,[2,846]),e(st,[2,847]),e(st,[2,848]),e(st,[2,849]),e(st,[2,850]),e(st,[2,851]),e(st,[2,852]),e(st,[2,853]),e(st,[2,854]),e(st,[2,855]),e(st,[2,856]),e(st,[2,857]),e(st,[2,858]),e(st,[2,859]),e(st,[2,860]),e(st,[2,861]),e(st,[2,862]),e(st,[2,863]),e(st,[2,864]),e(st,[2,865]),e(st,[2,866]),e(st,[2,867]),e(st,[2,868]),e(st,[2,869]),e(st,[2,870]),e(st,[2,871]),e(st,[2,872]),e(st,[2,873]),e(st,[2,874]),e(st,[2,875]),e(st,[2,876]),e(st,[2,877]),e(st,[2,878]),e(st,[2,879]),e(st,[2,880]),e(st,[2,881]),e(st,[2,882]),e(st,[2,883]),e(st,[2,884]),e(st,[2,885]),e(st,[2,886]),e(st,[2,887]),e(st,[2,888]),e(st,[2,889]),e(st,[2,890]),e(st,[2,891]),e(st,[2,892]),e(st,[2,893]),e(st,[2,894]),e(st,[2,895]),e(st,[2,896]),e(st,[2,897]),e(st,[2,898]),e(st,[2,899]),e(st,[2,900]),e(st,[2,901]),e(st,[2,902]),e(st,[2,903]),e(st,[2,904]),e(st,[2,905]),e(st,[2,906]),e(st,[2,907]),e(st,[2,908]),e(st,[2,909]),e(st,[2,910]),e(st,[2,911]),e(st,[2,912]),e(st,[2,913]),e(st,[2,914]),e(st,[2,915]),e(st,[2,916]),e(st,[2,917]),e(st,[2,918]),e(st,[2,919]),e(st,[2,920]),e(st,[2,921]),e(st,[2,922]),e(st,[2,923]),e(st,[2,924]),e(st,[2,925]),e(st,[2,926]),e(st,[2,927]),e(st,[2,928]),e(st,[2,929]),e(st,[2,930]),e(st,[2,931]),e(st,[2,932]),e(st,[2,933]),e(st,[2,934]),e(st,[2,935]),e(st,[2,936]),e(st,[2,937]),e(st,[2,938]),e(st,[2,939]),e(st,[2,940]),e(st,[2,941]),e(st,[2,942]),e(st,[2,943]),e(st,[2,944]),e(st,[2,945]),e(st,[2,946]),e(st,[2,947]),e(st,[2,948]),e(st,[2,949]),e(st,[2,950]),e(st,[2,951]),e(st,[2,952]),e(st,[2,953]),e(st,[2,954]),e(st,[2,955]),e(st,[2,956]),e(st,[2,957]),e(st,[2,958]),e(st,[2,959]),e(st,[2,960]),e(st,[2,961]),e(st,[2,962]),e(st,[2,963]),e(st,[2,964]),e(st,[2,965]),e(st,[2,966]),e(st,[2,967]),e(st,[2,968]),e(st,[2,969]),e(st,[2,970]),e(st,[2,971]),e(st,[2,972]),e(st,[2,973]),e(st,[2,974]),e(st,[2,975]),e(st,[2,976]),e(st,[2,977]),e(st,[2,978]),e(st,[2,979]),e(st,[2,980]),e(st,[2,981]),e(st,[2,982]),e(st,[2,983]),e(st,[2,984]),e(st,[2,985]),e(st,[2,986]),e(st,[2,987]),e(st,[2,988]),e(st,[2,989]),e(st,[2,990]),e(st,[2,991]),e(st,[2,992]),e(st,[2,993]),e(st,[2,994]),e(st,[2,995]),e(st,[2,996]),e(st,[2,997]),e(st,[2,998]),e(st,[2,999]),e(st,[2,1e3]),e(st,[2,1001]),e(st,[2,1002]),e(st,[2,1003]),e(st,[2,1004]),e(st,[2,1005]),e(st,[2,1006]),e(st,[2,1007]),e(st,[2,1008]),e(st,[2,1009]),e(st,[2,1010]),e(st,[2,1011]),e(st,[2,1012]),e(st,[2,1013]),e(st,[2,1014]),e(st,[2,1015]),e(st,[2,1016]),e(st,[2,1017]),e(st,[2,1018]),e(st,[2,1019]),e(st,[2,1020]),e(st,[2,1021]),e(st,[2,1022]),e(st,[2,1023]),e(st,[2,1024]),e(st,[2,1025]),e(st,[2,1026]),e(st,[2,1027]),e(st,[2,1028]),e(st,[2,1029]),e(st,[2,1030]),e(st,[2,1031]),e(st,[2,1032]),e(st,[2,1033]),e(st,[2,1034]),e(st,[2,1035]),e(st,[2,1036]),e(st,[2,1037]),e(st,[2,1038]),e(st,[2,1039]),e(st,[2,1040]),e(st,[2,1041]),e(st,[2,1042]),e(st,[2,1043]),e(J,[2,7]),e(J,t,{17:5,18:7,19:8,20:9,21:10,22:11,23:12,24:13,25:14,26:15,27:16,28:17,29:18,30:19,31:20,32:21,33:22,34:23,35:24,36:25,37:26,38:27,39:28,40:29,41:30,42:31,43:32,44:33,45:34,46:35,47:36,48:37,49:38,50:39,51:40,52:41,54:43,55:44,56:45,57:46,58:47,59:48,60:49,61:50,62:51,63:52,64:53,65:54,66:55,67:56,68:57,69:58,70:59,71:60,79:75,506:95,184:99,3:100,12:821,2:n,4:r,5:s,53:i,72:o,89:u,124:c,146:l,156:h,189:d,270:f,271:p,292:b,337:E,340:g,341:m,398:S,402:T,403:v,406:A,408:y,410:N,411:C,419:R,420:O,436:w,438:I,439:x,441:k,442:D,443:L,444:$,445:M,449:U,450:_,453:F,454:P,507:q,509:G,510:V,519:B}),{398:[1,825],403:[1,822],404:[1,823],405:[1,824]},{2:n,3:826,4:r,5:s},e(mr,[2,1114],{291:827,768:829,78:[1,828],164:[1,831],185:[1,830]}),{2:n,3:168,4:r,5:s,56:165,77:re,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:832,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:833,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:834,4:r,5:s,132:[1,835]},{2:n,3:836,4:r,5:s,132:[1,837]},{2:n,3:838,4:r,5:s,99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{2:n,3:839,4:r,5:s},{154:[1,840]},e(vr,ut,{352:841,156:ct}),{230:[1,842]},{2:n,3:843,4:r,5:s},e(Y,[2,732],{74:Ar}),{2:n,3:168,4:r,5:s,56:165,77:re,94:845,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(gr,[2,735]),e(yr,[2,1146],{421:190,478:846,144:847,139:Nr,141:Nr,145:Xe,422:Fe,426:Pe}),{139:[1,848],141:[1,849]},e(Cr,Rr,{492:851,495:852,77:[1,850],137:ht}),e(Or,[2,1170],{496:853,132:[1,854]}),e(wr,[2,1174],{498:855,499:856,152:dt}),e(wr,[2,750]),e(Ir,[2,742]),{2:n,3:857,4:r,5:s,131:[1,858]},{2:n,3:859,4:r,5:s},{2:n,3:860,4:r,5:s},e(qe,ut,{352:861,156:ct}),e(qe,ut,{352:862,156:ct}),e(gt,[2,494]),e(gt,[2,495]),{183:[1,863]},{183:[2,1145]},e(xr,[2,1140],{468:864,471:865,137:[1,866]}),e(ft,[2,1139]),e(kr,Dr,{512:867,95:Lr,230:[1,868],516:$r,517:Mr,518:Ur}),{76:[1,873]},{76:[1,874]},{145:ne,452:875},{4:_r,7:879,76:[1,877],276:876,389:878,391:Fr},e(Y,[2,459],{128:[1,882]}),e(Y,[2,582]),{2:n,3:883,4:r,5:s},{300:[1,884]},e(vr,bt,{400:885,156:Et}),e(Y,[2,596]),{2:n,3:244,4:r,5:s,199:887,401:886},{2:n,3:244,4:r,5:s,199:887,401:888},e(Y,[2,775]),e(J,[2,672],{440:889,312:[1,890]}),{2:n,3:168,4:r,5:s,56:165,77:re,94:891,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:892,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:893,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:894,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:895,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:896,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:897,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:898,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:899,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:900,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:901,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:902,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:903,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:904,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:905,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:906,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:907,4:r,5:s,77:[1,909],131:se,156:W,196:908,200:910,292:X,293:K,294:Q,295:z},{2:n,3:911,4:r,5:s,77:[1,913],131:se,156:W,196:912,200:914,292:X,293:K,294:Q,295:z},e(Pr,[2,443],{259:146,200:147,260:148,111:149,258:150,196:151,261:152,113:153,262:154,201:155,202:156,263:157,264:158,265:159,144:161,266:162,267:163,56:165,158:167,3:168,421:190,94:915,2:n,4:r,5:s,77:re,131:se,132:ae,137:ie,143:oe,145:ue,149:ce,152:le,154:he,156:W,179:de,180:fe,181:pe,244:be,245:Ee,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,422:Fe,426:Pe}),e(Pr,[2,444],{259:146,200:147,260:148,111:149,258:150,196:151,261:152,113:153,262:154,201:155,202:156,263:157,264:158,265:159,144:161,266:162,267:163,56:165,158:167,3:168,421:190,94:916,2:n,4:r,5:s,77:re,131:se,132:ae,137:ie,143:oe,145:ue,149:ce,152:le,154:he,156:W,179:de,180:fe,181:pe,244:be,245:Ee,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,422:Fe,426:Pe}),e(Pr,[2,445],{259:146,200:147,260:148,111:149,258:150,196:151,261:152,113:153,262:154,201:155,202:156,263:157,264:158,265:159,144:161,266:162,267:163,56:165,158:167,3:168,421:190,94:917,2:n,4:r,5:s,77:re,131:se,132:ae,137:ie,143:oe,145:ue,149:ce,152:le,154:he,156:W,179:de,180:fe,181:pe,244:be,245:Ee,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,422:Fe,426:Pe}),e(Pr,[2,446],{259:146,200:147,260:148,111:149,258:150,196:151,261:152,113:153,262:154,201:155,202:156,263:157,264:158,265:159,144:161,266:162,267:163,56:165,158:167,3:168,421:190,94:918,2:n,4:r,5:s,77:re,131:se,132:ae,137:ie,143:oe,145:ue,149:ce,152:le,154:he,156:W,179:de,180:fe,181:pe,244:be,245:Ee,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,422:Fe,426:Pe}),e(Pr,qr,{259:146,200:147,260:148,111:149,258:150,196:151,261:152,113:153,262:154,201:155,202:156,263:157,264:158,265:159,144:161,266:162,267:163,56:165,158:167,3:168,421:190,94:919,2:n,4:r,5:s,77:re,131:se,132:ae,137:ie,143:oe,145:ue,149:ce,152:le,154:he,156:W,179:de,180:fe,181:pe,244:be,245:Ee,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,422:Fe,426:Pe}),{2:n,3:168,4:r,5:s,56:165,77:re,94:920,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:921,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Pr,[2,448],{259:146,200:147,260:148,111:149,258:150,196:151,261:152,113:153,262:154,201:155,202:156,263:157,264:158,265:159,144:161,266:162,267:163,56:165,158:167,3:168,421:190,94:922,2:n,4:r,5:s,77:re,131:se,132:ae,137:ie,143:oe,145:ue,149:ce,152:le,154:he,156:W,179:de,180:fe,181:pe,244:be,245:Ee,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,422:Fe,426:Pe}),{2:n,3:168,4:r,5:s,56:165,77:re,94:923,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:924,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{164:[1,926],166:[1,928],330:925,336:[1,927]},{2:n,3:168,4:r,5:s,56:165,77:re,94:929,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:930,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:695,4:r,5:s,77:[1,931],111:934,145:Gr,156:W,200:935,202:933,292:X,293:K,294:Q,295:z,331:932},{99:[1,937],299:[1,938]},{2:n,3:168,4:r,5:s,56:165,77:re,94:939,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:940,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:941,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{4:_r,7:879,276:942,389:878,391:Fr},e(Vr,[2,88]),e(Vr,[2,89]),{78:[1,943]},{78:[1,944]},{78:[1,945]},{78:[1,946],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(qe,Ge,{342:207,77:ot,198:Ve}),{78:[2,1110]},{78:[2,1111]},{134:ee,135:te},{2:n,3:168,4:r,5:s,56:165,77:re,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:947,152:le,154:he,156:W,158:167,164:[1,949],179:de,180:fe,181:pe,185:[1,948],196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:950,4:r,5:s,149:Br,180:[1,952]},e([2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,118,122,128,129,130,131,132,134,135,137,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,316,332,333,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],[2,419],{114:625,329:637,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,334:Zt}),e(jr,[2,420],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,180:Mt,314:_t,318:qt}),e(jr,[2,421],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,180:Mt,314:_t,318:qt}),e(Hr,[2,422],{114:625,329:637,318:qt}),e(Hr,[2,423],{114:625,329:637,318:qt}),e(nn,[2,368]),e(nn,[2,1116]),e(nn,[2,1117]),e(nn,[2,369]),e([2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,230,231,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],[2,365]),{2:n,3:168,4:r,5:s,56:165,77:re,94:953,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(on,[2,623]),e(on,[2,624]),e(on,[2,625]),e(on,[2,626]),e(on,[2,628]),{40:954,79:75,89:u,184:99,189:d},{99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,306:955,309:677,310:an,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{307:956,308:Jr,309:957,310:an,312:Yr},e(Wr,[2,375]),{2:n,3:168,4:r,5:s,56:165,77:re,94:959,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:960,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{4:_r,7:879,276:961,389:878,391:Fr},e(on,[2,629]),{74:[1,963],302:[1,962]},e(on,[2,645]),e(Xr,[2,652]),e(Kr,[2,630]),e(Kr,[2,631]),e(Kr,[2,632]),e(Kr,[2,633]),e(Kr,[2,634]),e(Kr,[2,635]),e(Kr,[2,636]),e(Kr,[2,637]),e(Kr,[2,638]),{2:n,3:168,4:r,5:s,56:165,77:re,94:964,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e([2,4,5,10,53,72,74,76,78,89,93,95,98,99,107,112,115,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,428,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],tn,{77:it,116:Qr}),{74:hr,302:[1,966]},e(zr,[2,317],{77:it}),e(We,[2,318]),{74:[1,968],428:[1,967]},e(on,[2,642]),e(Zr,[2,647]),{152:[1,969]},{152:[1,970]},{152:[1,971]},{40:976,77:[1,975],79:75,89:u,143:oe,144:979,145:Xe,149:es,152:le,181:pe,184:99,189:d,201:980,304:$e,343:972,344:973,345:[1,974],346:ts,421:190,422:Fe,426:Pe},e(qe,Ge,{342:981,198:Ve}),{77:ns,143:oe,144:979,145:Xe,149:es,152:le,181:pe,201:980,304:$e,343:982,344:983,346:ts,421:190,422:Fe,426:Pe},{230:[1,986],457:985},{2:n,3:219,4:r,5:s,77:Be,132:je,143:oe,144:212,145:ue,152:le,156:W,181:pe,199:213,200:215,201:214,202:217,209:987,213:He,214:218,292:X,293:K,294:Q,295:z,304:$e,421:190,422:Fe,426:Pe},{231:[2,699]},{78:[1,988]},e(dn,[2,1096],{211:989,3:990,2:n,4:r,5:s}),e(hn,[2,1095]),e(dn,[2,183]),{2:n,3:991,4:r,5:s},{212:[1,992]},e(dn,[2,187]),{2:n,3:993,4:r,5:s},e(dn,[2,191]),{2:n,3:994,4:r,5:s},e(dn,[2,195]),{2:n,3:995,4:r,5:s},e(dn,[2,198]),{2:n,3:996,4:r,5:s},{2:n,3:997,4:r,5:s},{148:[1,998]},e(rs,[2,172],{82:999,183:[1,1e3]}),{2:n,3:219,4:r,5:s,132:[1,1005],143:oe,145:[1,1006],152:le,156:W,181:pe,199:1001,200:1002,201:1003,202:1004,292:X,293:K,294:Q,295:z,304:$e},{2:n,3:1011,4:r,5:s,109:1007,110:1008,111:1009,112:ss},e(mn,[2,1061]),e(as,[2,1052],{91:1012,182:1013,183:[1,1014]}),e(Ye,[2,1051],{153:1015,179:is,180:os,181:us}),e([2,4,5,10,72,74,76,78,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,198,244,245,284,285,286,287,288,289,290,308,312,422,426,604,765],[2,90],{77:[1,1019]}),{119:[1,1020]},e(cs,[2,93]),{2:n,3:1021,4:r,5:s},e(cs,[2,95]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1022,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1023,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:733,4:r,5:s,72:Sn,76:Tn,77:vn,112:An,114:736,115:Tt,116:vt,117:1025,118:yn,122:Nn,123:Cn,124:Rn,125:1024,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},{77:[1,1026]},{77:[1,1027]},{77:[1,1028]},{77:[1,1029]},e(cs,[2,104]),e(cs,[2,105]),e(cs,[2,106]),e(cs,[2,107]),e(cs,[2,108]),e(cs,[2,109]),{2:n,3:1030,4:r,5:s},{2:n,3:1031,4:r,5:s,133:[1,1032]},e(cs,[2,113]),e(cs,[2,114]),e(cs,[2,115]),e(cs,[2,116]),e(cs,[2,117]),e(cs,[2,118]),{2:n,3:1033,4:r,5:s,77:sn,113:669,131:se,132:ae,143:oe,152:le,181:pe,196:670,201:672,261:671,296:we,297:Ie,298:xe,304:$e,421:673,426:Pe},{145:[1,1034]},{77:[1,1035]},{145:[1,1036]},e(cs,[2,123]),{77:[1,1037]},{2:n,3:1038,4:r,5:s},{77:[1,1039]},{77:[1,1040]},{77:[1,1041]},{77:[1,1042]},{77:[1,1043],164:[1,1044]},{77:[1,1045]},{77:[1,1046]},{77:[1,1047]},{77:[1,1048]},{77:[1,1049]},{77:[1,1050]},{77:[1,1051]},{77:[1,1052]},{77:[1,1053]},{77:[2,1076]},{77:[2,1077]},{2:n,3:244,4:r,5:s,199:1054},{2:n,3:244,4:r,5:s,199:1055},{113:1056,132:ae,298:xe},e(Y,[2,599],{112:[1,1057]}),{2:n,3:244,4:r,5:s,199:1058},{113:1059,132:ae,298:xe},{2:n,3:1060,4:r,5:s},e(Y,[2,696]),e(Y,[2,68]),{2:n,3:236,4:r,5:s,75:1061},{77:[1,1062]},e(Y,[2,677]),e(Y,[2,589]),{2:n,3:1011,4:r,5:s,111:1065,143:ls,145:hs,147:1063,338:1064,339:1066},{144:1069,145:Xe,421:190,422:Fe,426:Pe},e(Y,[2,674]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1070,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Pr,qr,{259:146,200:147,260:148,111:149,258:150,196:151,261:152,113:153,262:154,201:155,202:156,263:157,264:158,265:159,144:161,266:162,267:163,56:165,158:167,3:168,421:190,94:1071,2:n,4:r,5:s,77:re,131:se,132:ae,137:ie,143:oe,145:ue,149:ce,152:le,154:he,156:W,179:de,180:fe,181:pe,244:be,245:Ee,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,422:Fe,426:Pe}),{113:1072,132:ae,298:xe},{2:n,3:266,4:r,5:s,448:1073,449:Qe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1075,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,230:pr,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe,431:1074,435:br},e(Y,[2,654]),{114:1077,115:Tt,116:vt,124:[1,1076]},e(Y,[2,666]),e(Y,[2,667]),{2:n,3:1079,4:r,5:s,77:ds,131:fs,434:1078},{114:807,115:Tt,116:vt,124:[1,1082],432:1083},e(Y,[2,756],{74:Er}),{2:n,3:100,4:r,5:s,506:1084},{2:n,3:168,4:r,5:s,56:165,77:re,94:817,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,174:1085,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,257:816,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:817,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,174:1086,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,257:816,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:817,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,174:1087,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,257:816,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Sr,[2,151]),e(Sr,[2,1091],{74:ps}),e(bs,[2,276]),e(bs,[2,283],{114:625,329:637,3:1090,113:1092,2:n,4:r,5:s,76:[1,1089],99:mt,112:St,115:Tt,116:vt,123:At,124:fr,131:[1,1091],132:ae,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,298:xe,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(et,[2,1092],{197:1093,766:[1,1094]}),{131:se,196:1095},{74:Er,78:[1,1096]},e(J,[2,11]),{148:[1,1097],190:[1,1098]},{190:[1,1099]},{190:[1,1100]},{190:[1,1101]},e(Y,[2,578],{76:[1,1103],77:[1,1102]}),{2:n,3:168,4:r,5:s,56:165,77:re,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:1104,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(nn,[2,349]),e(mr,[2,1115]),e(mr,[2,1112]),e(mr,[2,1113]),{74:hr,78:[1,1105]},{74:hr,78:[1,1106]},{74:[1,1107]},{74:[1,1108]},{74:[1,1109]},{74:[1,1110]},e(nn,[2,356]),e(Y,[2,583]),{300:[1,1111]},{2:n,3:1112,4:r,5:s,113:1113,132:ae,298:xe},{2:n,3:244,4:r,5:s,199:1114},{230:[1,1115]},{2:n,3:578,4:r,5:s,132:lt,137:ht,143:ze,145:Ze,152:dt,433:585,476:1116,477:576,480:577,484:582,495:579,499:581},e(Y,[2,733],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(gr,[2,1148],{479:1117,485:1118,76:Es}),e(yr,[2,1147]),{2:n,3:1122,4:r,5:s,132:lt,137:ht,144:1121,145:Xe,152:dt,421:190,422:Fe,426:Pe,477:1120,495:579,499:581},{2:n,3:1122,4:r,5:s,132:lt,137:ht,143:ze,145:Ze,152:dt,433:585,477:1124,480:1123,484:582,495:579,499:581},{2:n,3:578,4:r,5:s,132:lt,137:ht,143:ze,145:Ze,152:dt,433:585,475:1125,476:575,477:576,480:577,484:582,495:579,499:581},e(Or,[2,1166],{493:1126,132:[1,1127]}),e(Cr,[2,1165]),e(wr,[2,1172],{497:1128,499:1129,152:dt}),e(Or,[2,1171]),e(wr,[2,749]),e(wr,[2,1175]),e(Cr,[2,752]),e(Cr,[2,753]),e(wr,[2,751]),e(Ir,[2,743]),{2:n,3:244,4:r,5:s,199:1130},{2:n,3:244,4:r,5:s,199:1131},{2:n,3:168,4:r,5:s,56:165,77:re,94:1132,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(gs,[2,1142],{469:1133,113:1134,132:ae,298:xe}),e(xr,[2,1141]),{2:n,3:1135,4:r,5:s},{337:ms,340:Ss,341:Ts,513:1136},{2:n,3:244,4:r,5:s,199:1140},e(kr,[2,768]),e(kr,[2,769]),e(kr,[2,770]),{129:[1,1141]},{270:[1,1142]},{270:[1,1143]},e(pt,[2,691]),e(pt,[2,692],{124:[1,1144]}),{4:_r,7:879,276:1145,389:878,391:Fr},e([2,4,10,53,72,74,76,77,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,230,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,299,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,345,358,370,371,375,376,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],[2,545],{5:[1,1146]}),e([2,5,10,53,72,74,76,78,89,93,95,98,99,107,112,115,116,118,122,123,124,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,230,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,299,302,308,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,345,358,370,371,375,376,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],[2,542],{4:[1,1148],77:[1,1147]}),{77:[1,1149]},e(vs,[2,4]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1150,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Y,[2,591]),e(vr,[2,571]),{2:n,3:1151,4:r,5:s,113:1152,132:ae,298:xe},e(Y,[2,567],{74:As}),e(pt,[2,569]),e(Y,[2,616],{74:As}),e(Y,[2,671]),e(Y,t,{17:5,18:7,19:8,20:9,21:10,22:11,23:12,24:13,25:14,26:15,27:16,28:17,29:18,30:19,31:20,32:21,33:22,34:23,35:24,36:25,37:26,38:27,39:28,40:29,41:30,42:31,43:32,44:33,45:34,46:35,47:36,48:37,49:38,50:39,51:40,52:41,54:43,55:44,56:45,57:46,58:47,59:48,60:49,61:50,62:51,63:52,64:53,65:54,66:55,67:56,68:57,69:58,70:59,71:60,79:75,506:95,184:99,3:100,12:1154,2:n,4:r,5:s,53:i,72:o,89:u,124:c,146:l,156:h,189:d,270:f,271:p,292:b,337:E,340:g,341:m,398:S,402:T,403:v,406:A,408:y,410:N,411:C,419:R,420:O,436:w,438:I,439:x,441:k,442:D,443:L,444:$,445:M,449:U,450:_,453:F,454:P,507:q,509:G,510:V,519:B}),e(ys,[2,379],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,314:_t,318:qt,319:Gt,320:Vt,321:Bt}),e(Hr,[2,380],{114:625,329:637,318:qt}),e(ys,[2,381],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,314:_t,318:qt,319:Gt,320:Vt,321:Bt}),e(Ns,[2,382],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,314:_t,316:[1,1155],318:qt,319:Gt,320:Vt,321:Bt}),e(Ns,[2,384],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,314:_t,316:[1,1156],318:qt,319:Gt,320:Vt,321:Bt}),e(We,[2,386],{114:625,329:637}),e(jr,[2,387],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,180:Mt,314:_t,318:qt}),e(jr,[2,388],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,180:Mt,314:_t,318:qt}),e(Cs,[2,389],{114:625,329:637,115:Tt,116:vt,123:At,136:Ct,314:_t,318:qt}),e(Cs,[2,390],{114:625,329:637,115:Tt,116:vt,123:At,136:Ct,314:_t,318:qt}),e(Cs,[2,391],{114:625,329:637,115:Tt,116:vt,123:At,136:Ct,314:_t,318:qt}),e([2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,112,118,122,123,124,128,129,130,131,132,133,134,135,137,138,139,140,141,142,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,179,180,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,313,315,316,317,319,320,321,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],[2,392],{114:625,329:637,115:Tt,116:vt,136:Ct,314:_t,318:qt}),e(Rs,[2,393],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,179:$t,180:Mt,314:_t,318:qt,319:Gt}),e(Rs,[2,394],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,179:$t,180:Mt,314:_t,318:qt,319:Gt}),e(Rs,[2,395],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,179:$t,180:Mt,314:_t,318:qt,319:Gt}),e(Rs,[2,396],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,179:$t,180:Mt,314:_t,318:qt,319:Gt}),e(zr,[2,397],{77:it}),e(We,[2,398]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1157,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(We,[2,400]),e(zr,[2,401],{77:it}),e(We,[2,402]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1158,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(We,[2,404]),e(Os,[2,405],{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,334:Zt}),e(Os,[2,406],{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,334:Zt}),e(Os,[2,407],{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,334:Zt}),e(Os,[2,408],{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,334:Zt}),e([2,4,5,10,53,72,89,99,124,139,140,146,154,156,170,171,189,270,271,292,308,312,322,323,324,325,326,327,328,332,333,335,337,340,341,398,402,403,406,408,410,411,419,420,436,438,439,441,442,443,444,445,449,450,453,454,507,509,510,519,604,765],ws,{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,334:Zt}),e(Os,[2,410],{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,334:Zt}),e(Os,[2,411],{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,334:Zt}),e(Os,[2,412],{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,334:Zt}),e(Os,[2,413],{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,334:Zt}),e(Os,[2,414],{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,334:Zt}),{77:[1,1159]},{77:[2,449]},{77:[2,450]},{77:[2,451]},e(Is,[2,417],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,334:Zt}),e([2,4,5,10,53,72,74,76,77,78,89,93,95,98,107,118,122,128,129,130,131,132,134,135,137,143,145,146,148,149,150,152,156,162,164,166,168,169,171,172,173,175,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,316,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],[2,418],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt}),{2:n,3:168,4:r,5:s,40:1160,56:165,77:re,78:[1,1162],79:75,89:u,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:1161,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,184:99,189:d,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(We,[2,431]),e(We,[2,433]),e(We,[2,440]),e(We,[2,441]),{2:n,3:667,4:r,5:s,77:[1,1163]},{2:n,3:695,4:r,5:s,77:[1,1164],111:934,145:Gr,156:W,200:935,202:1166,292:X,293:K,294:Q,295:z,331:1165},e(We,[2,438]),e(Is,[2,435],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,334:Zt}),e(Is,[2,436],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,334:Zt}),e([2,4,5,10,53,72,74,76,77,78,89,93,95,98,99,107,118,122,124,128,129,130,131,132,134,135,137,139,140,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,181,183,185,187,189,198,206,208,222,223,224,225,226,227,228,229,232,239,244,245,246,247,249,251,270,271,284,285,286,287,288,289,290,292,298,302,308,310,311,312,316,322,323,324,325,326,327,328,332,333,334,335,337,340,341,398,402,403,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,466,472,507,509,510,519,604,765],[2,437],{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt}),e(We,[2,439]),e(We,[2,309]),e(We,[2,310]),e(We,[2,311]),e(We,[2,424]),{74:hr,78:[1,1167]},{2:n,3:168,4:r,5:s,56:165,77:re,94:1168,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1169,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(We,xs),e(ks,[2,289]),e(We,[2,285]),{78:[1,1171],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{78:[1,1172]},{307:1173,308:Jr,309:957,310:an,312:Yr},{308:[1,1174]},e(Wr,[2,374]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1175,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,311:[1,1176],313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{76:[1,1177],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{74:[1,1178]},e(on,[2,643]),{2:n,3:695,4:r,5:s,77:un,111:690,113:688,131:se,132:ae,143:oe,144:685,145:Xe,152:le,156:W,181:pe,196:687,200:693,201:692,261:689,262:691,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,302:[1,1179],304:$e,421:190,422:Fe,424:1180,425:686,426:Pe},{78:[1,1181],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{2:n,3:1182,4:r,5:s,149:Br},e(We,[2,367]),e(on,[2,640]),{2:n,3:704,4:r,5:s,131:cn,132:ln,428:[1,1183],430:1184},{2:n,3:695,4:r,5:s,77:un,111:690,113:688,131:se,132:ae,143:oe,144:685,145:Xe,152:le,156:W,181:pe,196:687,200:693,201:692,261:689,262:691,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,304:$e,421:190,422:Fe,424:1185,425:686,426:Pe},{2:n,3:695,4:r,5:s,77:un,111:690,113:688,131:se,132:ae,143:oe,144:685,145:Xe,152:le,156:W,181:pe,196:687,200:693,201:692,261:689,262:691,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,304:$e,421:190,422:Fe,424:1186,425:686,426:Pe},{2:n,3:695,4:r,5:s,77:un,111:690,113:688,131:se,132:ae,143:oe,144:685,145:Xe,152:le,156:W,181:pe,196:687,200:693,201:692,261:689,262:691,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,304:$e,421:190,422:Fe,424:1187,425:686,426:Pe},{77:ns,143:oe,144:979,145:Xe,152:le,181:pe,201:980,304:$e,344:1188,421:190,422:Fe,426:Pe},e(Ds,[2,461],{74:Ls}),{149:es,343:1190,346:ts},{2:n,3:168,4:r,5:s,56:165,77:re,94:1194,100:1191,111:1193,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,347:1192,421:190,422:Fe,426:Pe},e(Ds,[2,469]),e($s,[2,472]),e($s,[2,473]),e(Ms,[2,477]),e(Ms,[2,478]),{2:n,3:244,4:r,5:s,199:1195},{77:ns,143:oe,144:979,145:Xe,152:le,181:pe,201:980,304:$e,344:1196,421:190,422:Fe,426:Pe},e(Ds,[2,465],{74:Ls}),{2:n,3:168,4:r,5:s,56:165,77:re,94:1194,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,347:1192,421:190,422:Fe,426:Pe},{310:Us,458:1197,460:1198,461:1199},{2:n,3:168,4:r,5:s,56:165,77:re,94:1201,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{230:[2,700]},e(dn,[2,181],{3:1202,2:n,4:r,5:s,76:[1,1203]}),e(dn,[2,182]),e(dn,[2,1097]),e(dn,[2,184]),e(dn,[2,186]),e(dn,[2,188]),e(dn,[2,192]),e(dn,[2,196]),e(dn,[2,199]),e([2,4,5,10,53,72,74,76,77,78,89,93,95,98,118,124,128,143,145,146,148,149,152,154,156,162,168,169,181,183,187,189,206,208,222,223,224,225,226,227,228,229,230,231,232,249,251,270,271,292,299,304,308,312,337,340,341,345,346,358,370,371,375,376,398,402,403,404,405,406,408,410,411,419,420,422,426,436,438,439,441,442,443,444,445,449,450,453,454,507,509,510,516,517,518,519,604,765],[2,201]),{2:n,3:1204,4:r,5:s},e(_s,[2,1048],{83:1205,92:1206,93:[1,1207],98:[1,1208]}),{2:n,3:219,4:r,5:s,77:[1,1210],132:je,143:oe,144:212,145:ue,152:le,156:W,181:pe,199:213,200:215,201:214,202:217,203:1209,209:1211,213:He,214:218,292:X,293:K,294:Q,295:z,304:$e,421:190,422:Fe,426:Pe},e(bn,[2,164]),e(bn,[2,165]),e(bn,[2,166]),e(bn,[2,167]),e(bn,[2,168]),{2:n,3:667,4:r,5:s},e(Je,[2,83],{74:[1,1212]}),e(Fs,[2,85]),e(Fs,[2,86]),{113:1213,132:ae,298:xe},e([10,72,74,78,93,98,118,124,128,162,168,169,183,198,206,208,222,223,224,225,226,227,228,229,232,249,251,308,312,604,765],tn,{116:Qr}),e(as,[2,73]),e(as,[2,1053]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1214,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(cs,[2,126]),e(cs,[2,144]),e(cs,[2,145]),e(cs,[2,146]),{2:n,3:168,4:r,5:s,56:165,77:re,78:[2,1068],94:260,111:149,113:153,127:1215,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:1216,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{77:[1,1217]},e(cs,[2,94]),e([2,4,5,10,72,74,76,77,78,118,122,124,128,129,130,131,132,134,135,137,139,140,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,181,183,185,187,198,244,245,284,285,286,287,288,289,290,308,312,422,426,604,765],[2,96],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e([2,4,5,10,72,74,76,77,78,112,118,122,124,128,129,130,131,132,134,135,137,139,140,143,145,146,148,149,150,152,154,156,162,164,166,168,169,170,171,172,173,175,181,183,185,187,198,244,245,284,285,286,287,288,289,290,308,312,422,426,604,765],[2,97],{114:625,329:637,99:mt,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{2:n,3:733,4:r,5:s,72:Sn,76:Tn,77:vn,78:[1,1218],112:An,114:736,115:Tt,116:vt,117:1219,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},e(Ps,[2,1064],{153:1015,179:is,180:os,181:us}),{2:n,3:733,4:r,5:s,72:Sn,76:Tn,77:vn,112:An,114:736,115:Tt,116:vt,117:1221,118:yn,122:Nn,123:Cn,124:Rn,126:1220,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1222,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1223,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:1224,4:r,5:s},e(cs,[2,110]),e(cs,[2,111]),e(cs,[2,112]),e(cs,[2,119]),{2:n,3:1225,4:r,5:s},{2:n,3:1011,4:r,5:s,111:1065,143:ls,145:hs,147:1226,338:1064,339:1066},{2:n,3:1227,4:r,5:s},{2:n,3:168,4:r,5:s,56:165,77:re,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:1228,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(cs,[2,125]),e(Ps,[2,1070],{155:1229}),e(Ps,[2,1072],{157:1230}),e(Ps,[2,1074],{159:1231}),e(Ps,[2,1078],{161:1232}),e(qs,Gs,{163:1233,178:1234}),{77:[1,1235]},e(Ps,[2,1080],{165:1236}),e(Ps,[2,1082],{167:1237}),e(qs,Gs,{178:1234,163:1238}),e(qs,Gs,{178:1234,163:1239}),e(qs,Gs,{178:1234,163:1240}),e(qs,Gs,{178:1234,163:1241}),{2:n,3:733,4:r,5:s,72:Sn,76:Tn,77:vn,112:An,114:736,115:Tt,116:vt,117:1242,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:817,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,174:1243,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,257:816,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Vs,[2,1084],{176:1244}),e(Y,[2,609],{183:[1,1245]}),e(Y,[2,605],{183:[1,1246]}),e(Y,[2,598]),{113:1247,132:ae,298:xe},e(Y,[2,607],{183:[1,1248]}),e(Y,[2,602]),e(Y,[2,603],{112:[1,1249]}),e(cr,[2,69]),{40:1250,79:75,89:u,184:99,189:d},e(Y,[2,453],{74:Bs,128:[1,1251]}),e(js,[2,454]),{124:[1,1253]},{2:n,3:1254,4:r,5:s},e(qe,[2,1118]),e(qe,[2,1119]),e(Y,[2,621]),e(dr,[2,358],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(Os,ws,{114:625,329:637,112:St,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,334:Zt}),e(pt,[2,685]),e(pt,[2,687]),e(Y,[2,653]),e(Y,[2,655],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{2:n,3:168,4:r,5:s,56:165,77:re,94:1255,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:1079,4:r,5:s,77:ds,131:fs,434:1256},e(Hs,[2,662]),e(Hs,[2,663]),e(Hs,[2,664]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1257,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1258,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{114:1077,115:Tt,116:vt,124:[1,1259]},e(gr,[2,758]),e(Sr,[2,148],{74:ps}),e(Sr,[2,149],{74:ps}),e(Sr,[2,150],{74:ps}),{2:n,3:168,4:r,5:s,56:165,77:re,94:817,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,257:1260,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:1261,4:r,5:s,113:1263,131:[1,1262],132:ae,298:xe},e(bs,[2,278]),e(bs,[2,280]),e(bs,[2,282]),e(et,[2,160]),e(et,[2,1093]),{78:[1,1264]},e(rt,[2,761]),{2:n,3:1265,4:r,5:s},{2:n,3:1266,4:r,5:s},{2:n,3:1268,4:r,5:s,386:1267},{2:n,3:1268,4:r,5:s,386:1269},{2:n,3:1270,4:r,5:s},{2:n,3:168,4:r,5:s,56:165,77:re,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:1271,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:1272,4:r,5:s},{74:hr,78:[1,1273]},e(nn,[2,350]),e(nn,[2,351]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1274,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1275,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1276,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1277,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(vr,[2,507]),e(Y,Js,{409:1278,76:Ys,77:[1,1279]}),e(Y,Js,{409:1281,76:Ys}),{77:[1,1282]},{2:n,3:244,4:r,5:s,199:1283},e(gr,[2,734]),e(gr,[2,736]),e(gr,[2,1149]),{143:ze,145:Ze,433:1284},e(Ws,[2,1150],{421:190,481:1285,144:1286,145:Xe,422:Fe,426:Pe}),{76:Es,139:[2,1154],483:1287,485:1288},e([10,74,76,78,132,139,145,152,308,312,422,426,604,765],Rr,{492:851,495:852,137:ht}),e(gr,[2,739]),e(gr,Nr),{74:Ar,78:[1,1289]},e(wr,[2,1168],{494:1290,499:1291,152:dt}),e(Or,[2,1167]),e(wr,[2,748]),e(wr,[2,1173]),e(Y,[2,493],{77:[1,1292]}),{76:[1,1294],77:[1,1293]},{99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,148:[1,1295],154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(Ds,Xs,{79:75,184:99,470:1296,40:1299,89:u,146:Ks,189:d,472:Qs}),e(gs,[2,1143]),e(xr,[2,726]),{230:[1,1300]},e(zs,[2,772]),e(zs,[2,773]),e(zs,[2,774]),e(kr,Dr,{512:1301,95:Lr,516:$r,517:Mr,518:Ur}),e(kr,[2,771]),e(Y,[2,315]),e(Y,[2,316]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1302,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(pt,[2,693],{124:[1,1303]}),e(vs,[2,544]),{131:[1,1305],390:1304,392:[1,1306]},e(vs,[2,5]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1194,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,347:1307,421:190,422:Fe,426:Pe},e(Y,[2,458],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(Y,[2,592]),e(Y,[2,593]),{2:n,3:244,4:r,5:s,199:1308},e(Y,[2,673]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1309,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1310,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{78:[1,1311],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{78:[1,1312],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{2:n,3:168,4:r,5:s,40:1313,56:165,77:re,79:75,89:u,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:1314,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,184:99,189:d,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{78:[1,1315]},{74:hr,78:[1,1316]},e(We,[2,429]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1317,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,40:1318,56:165,77:re,78:[1,1320],79:75,89:u,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:1319,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,184:99,189:d,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(We,[2,432]),e(We,[2,434]),e(We,Zs,{279:1321,280:ea}),{78:[1,1323],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{78:[1,1324],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{2:n,3:1325,4:r,5:s,180:[1,1326]},e(on,[2,622]),e(We,[2,366]),{308:[1,1327]},e(We,[2,373]),{99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,308:[2,377],313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{2:n,3:168,4:r,5:s,56:165,77:re,94:1328,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{4:_r,7:879,276:1329,389:878,391:Fr},{2:n,3:168,4:r,5:s,56:165,77:re,94:1330,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(on,[2,644]),e(Xr,[2,651]),e(Kr,[2,639]),e(ks,xs),e(on,[2,641]),e(Zr,[2,646]),e(Zr,[2,648]),e(Zr,[2,649]),e(Zr,[2,650]),e(Ds,[2,460],{74:Ls}),{77:[1,1332],143:oe,144:1333,145:Xe,152:le,181:pe,201:1334,304:$e,421:190,422:Fe,426:Pe},e(Ds,[2,466]),{74:ta,78:[1,1335]},{74:na,78:[1,1337]},e([74,78,99,112,115,116,123,124,133,136,138,139,140,141,142,154,170,171,179,180,313,314,315,317,318,319,320,321,322,323,324,325,326,327,328,332,333,334,335],ra),e(sa,[2,482],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{40:1341,77:ns,79:75,89:u,143:oe,144:979,145:Xe,149:es,152:le,181:pe,184:99,189:d,201:980,304:$e,343:1339,344:1340,346:ts,421:190,422:Fe,426:Pe},e(Ds,[2,464],{74:Ls}),e(Y,[2,720],{459:1342,460:1343,461:1344,310:Us,466:[1,1345]}),e(aa,[2,704]),e(aa,[2,705]),{154:[1,1347],462:[1,1346]},{99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,310:[2,701],313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(dn,[2,179]),{2:n,3:1348,4:r,5:s},e(Y,[2,577]),e(ia,[2,238],{84:1349,128:[1,1350]}),e(_s,[2,1049]),{77:[1,1351]},{77:[1,1352]},e(rs,[2,169],{204:1353,215:1355,205:1356,216:1357,221:1360,74:oa,206:ua,208:ca,222:la,223:ha,224:da,225:fa,226:pa,227:ba,228:Ea,229:ga}),{2:n,3:219,4:r,5:s,40:711,77:Be,79:75,89:u,132:je,143:oe,144:212,145:ue,152:le,156:W,181:pe,184:99,189:d,199:213,200:215,201:214,202:217,203:1369,209:1211,213:He,214:218,292:X,293:K,294:Q,295:z,304:$e,421:190,422:Fe,426:Pe},e(ma,[2,177]),{2:n,3:1011,4:r,5:s,110:1370,111:1009,112:ss},e(Fs,[2,87]),e(as,[2,147],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{78:[1,1371]},{74:hr,78:[2,1069]},{2:n,3:168,4:r,5:s,56:165,77:re,78:[2,1062],94:1376,111:149,113:153,120:1372,121:1373,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,241:1374,244:be,245:Ee,246:[1,1375],258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(cs,[2,98]),e(Ps,[2,1065],{153:1015,179:is,180:os,181:us}),{2:n,3:733,4:r,5:s,72:Sn,76:Tn,77:vn,78:[1,1377],112:An,114:736,115:Tt,116:vt,117:1378,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},e(Ps,[2,1066],{153:1015,179:is,180:os,181:us}),{78:[1,1379],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{78:[1,1380],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{78:[1,1381]},e(cs,[2,120]),{74:Bs,78:[1,1382]},e(cs,[2,122]),{74:hr,78:[1,1383]},{2:n,3:733,4:r,5:s,72:Sn,76:Tn,77:vn,78:[1,1384],112:An,114:736,115:Tt,116:vt,117:1385,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},{2:n,3:733,4:r,5:s,72:Sn,76:Tn,77:vn,78:[1,1386],112:An,114:736,115:Tt,116:vt,117:1387,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},{2:n,3:733,4:r,5:s,72:Sn,76:Tn,77:vn,78:[1,1388],112:An,114:736,115:Tt,116:vt,117:1389,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},{2:n,3:733,4:r,5:s,72:Sn,76:Tn,77:vn,78:[1,1390],112:An,114:736,115:Tt,116:vt,117:1391,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},{74:Sa,78:[1,1392]},e(sa,[2,143],{421:190,3:733,114:736,144:758,158:768,160:769,117:1394,2:n,4:r,5:s,72:Sn,76:Tn,77:vn,112:An,115:Tt,116:vt,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,422:Fe,426:Pe}),e(qs,Gs,{178:1234,163:1395}),{2:n,3:733,4:r,5:s,72:Sn,76:Tn,77:vn,78:[1,1396],112:An,114:736,115:Tt,116:vt,117:1397,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},{2:n,3:733,4:r,5:s,72:Sn,76:Tn,77:vn,78:[1,1398],112:An,114:736,115:Tt,116:vt,117:1399,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},{74:Sa,78:[1,1400]},{74:Sa,78:[1,1401]},{74:Sa,78:[1,1402]},{74:Sa,78:[1,1403]},{78:[1,1404],153:1015,179:is,180:os,181:us},{74:ps,78:[1,1405]},{2:n,3:733,4:r,5:s,72:Sn,74:[1,1406],76:Tn,77:vn,112:An,114:736,115:Tt,116:vt,117:1407,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,144:758,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,158:768,160:769,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,421:190,422:Fe,426:Pe},{2:n,3:1408,4:r,5:s},{2:n,3:1409,4:r,5:s},e(Y,[2,600]),{2:n,3:1410,4:r,5:s},{113:1411,132:ae,298:xe},{78:[1,1412]},{2:n,3:168,4:r,5:s,56:165,77:re,94:1413,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:1011,4:r,5:s,111:1065,143:ls,145:hs,338:1414,339:1066},{2:n,3:168,4:r,5:s,56:165,77:re,94:1415,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{124:[1,1416]},e(Y,[2,656],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(Hs,[2,661]),{78:[1,1417],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(Y,[2,657],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{2:n,3:168,4:r,5:s,56:165,77:re,94:1418,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(bs,[2,275]),e(bs,[2,277]),e(bs,[2,279]),e(bs,[2,281]),e(et,[2,161]),e(Y,[2,572]),{148:[1,1419]},e(Y,[2,573]),e(gr,[2,539],{389:878,7:879,276:1420,4:_r,388:[1,1421],391:Fr}),e(Y,[2,574]),e(Y,[2,576]),{74:hr,78:[1,1422]},e(Y,[2,580]),e(nn,[2,348]),{74:[1,1423],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{74:[1,1424],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{74:[1,1425],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{74:[1,1426],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(Y,[2,584]),{2:n,3:168,4:r,5:s,56:165,77:re,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:1427,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:1428,4:r,5:s},e(Y,[2,586]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1376,111:149,113:153,120:1429,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,241:1374,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{77:[1,1430]},{2:n,3:1431,4:r,5:s},{76:Es,139:[2,1152],482:1432,485:1433},e(Ws,[2,1151]),{139:[1,1434]},{139:[2,1155]},e(gr,[2,740]),e(wr,[2,747]),e(wr,[2,1169]),{2:n,3:1268,4:r,5:s,76:[1,1437],353:1435,360:1436,386:1438},{2:n,3:1011,4:r,5:s,100:1439,111:1440},{40:1441,79:75,89:u,184:99,189:d},{2:n,3:168,4:r,5:s,56:165,77:re,94:1442,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Ds,[2,725]),{2:n,3:1011,4:r,5:s,111:1065,143:ls,145:hs,147:1443,338:1064,339:1066},{2:n,3:168,4:r,5:s,56:165,77:re,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:1444,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Ds,[2,730]),{2:n,3:244,4:r,5:s,199:1445},{337:ms,340:Ss,341:Ts,513:1446},e(pt,[2,694],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{2:n,3:168,4:r,5:s,56:165,77:re,94:1447,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{74:[1,1448],78:[1,1449]},e(sa,[2,546]),e(sa,[2,547]),{74:na,78:[1,1450]},e(pt,[2,568]),e(ys,[2,383],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,314:_t,318:qt,319:Gt,320:Vt,321:Bt}),e(ys,[2,385],{114:625,329:637,115:Tt,116:vt,123:At,133:Nt,136:Ct,138:Rt,141:It,142:xt,179:$t,180:Mt,314:_t,318:qt,319:Gt,320:Vt,321:Bt}),e(We,[2,399]),e(We,[2,403]),{78:[1,1451]},{74:hr,78:[1,1452]},e(We,[2,425]),e(We,[2,427]),{78:[1,1453],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{78:[1,1454]},{74:hr,78:[1,1455]},e(We,[2,430]),e(We,[2,330]),{77:[1,1456]},e(We,Zs,{279:1457,280:ea}),e(We,Zs,{279:1458,280:ea}),e(ks,[2,287]),e(We,[2,284]),e(We,[2,372]),e(Wr,[2,376],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{74:[1,1460],78:[1,1459]},{74:[1,1462],78:[1,1461],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{2:n,3:1325,4:r,5:s},{2:n,3:168,4:r,5:s,56:165,77:re,94:1194,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,347:1463,421:190,422:Fe,426:Pe},e(Ms,[2,480]),e(Ms,[2,481]),{40:1466,77:ns,79:75,89:u,143:oe,144:979,145:Xe,149:es,152:le,181:pe,184:99,189:d,201:980,304:$e,343:1464,344:1465,346:ts,421:190,422:Fe,426:Pe},{2:n,3:1011,4:r,5:s,111:1467},e(Ms,[2,476]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1468,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{77:ns,143:oe,144:979,145:Xe,152:le,181:pe,201:980,304:$e,344:1469,421:190,422:Fe,426:Pe},e(Ds,[2,463],{74:Ls}),e(Ds,[2,470]),e(Y,[2,697]),e(aa,[2,702]),e(aa,[2,703]),{2:n,3:168,4:r,5:s,56:165,77:re,94:817,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,174:1470,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,257:816,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{170:[1,1472],311:[1,1471]},{462:[1,1473]},e(dn,[2,180]),e(Ta,[2,240],{85:1474,232:[1,1475]}),{2:n,3:168,4:r,5:s,56:165,77:re,94:1476,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1477,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:1478,4:r,5:s},e(rs,[2,170],{216:1357,221:1360,215:1479,205:1480,206:ua,208:ca,222:la,223:ha,224:da,225:fa,226:pa,227:ba,228:Ea,229:ga}),{2:n,3:219,4:r,5:s,77:Be,132:je,143:oe,144:212,145:ue,152:le,156:W,181:pe,199:213,200:215,201:214,202:217,209:1481,213:He,214:218,292:X,293:K,294:Q,295:z,304:$e,421:190,422:Fe,426:Pe},e(va,[2,205]),e(va,[2,206]),{2:n,3:219,4:r,5:s,77:[1,1486],143:oe,144:1484,145:ue,152:le,156:W,181:pe,199:1483,200:1487,201:1485,202:1488,217:1482,292:X,293:K,294:Q,295:z,304:$e,421:190,422:Fe,426:Pe},{207:[1,1489],223:Aa},{207:[1,1491],223:ya},e(Na,[2,222]),{206:[1,1495],208:[1,1494],221:1493,223:ha,224:da,225:fa,226:pa,227:ba,228:Ea,229:ga},e(Na,[2,224]),{223:[1,1496]},{208:[1,1498],223:[1,1497]},{208:[1,1500],223:[1,1499]},{208:[1,1501]},{223:[1,1502]},{223:[1,1503]},{74:oa,204:1504,205:1356,206:ua,208:ca,215:1355,216:1357,221:1360,222:la,223:ha,224:da,225:fa,226:pa,227:ba,228:Ea,229:ga},e(Fs,[2,84]),e(cs,[2,100]),{74:Ca,78:[1,1505]},{78:[1,1507]},e(Ra,[2,261]),{78:[2,1063]},e(Ra,[2,265],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,246:[1,1508],247:[1,1509],313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(cs,[2,99]),e(Ps,[2,1067],{153:1015,179:is,180:os,181:us}),e(cs,[2,101]),e(cs,[2,102]),e(cs,[2,103]),e(cs,[2,121]),e(cs,[2,124]),e(cs,[2,127]),e(Ps,[2,1071],{153:1015,179:is,180:os,181:us}),e(cs,[2,128]),e(Ps,[2,1073],{153:1015,179:is,180:os,181:us}),e(cs,[2,129]),e(Ps,[2,1075],{153:1015,179:is,180:os,181:us}),e(cs,[2,130]),e(Ps,[2,1079],{153:1015,179:is,180:os,181:us}),e(cs,[2,131]),e(qs,[2,1086],{177:1510}),e(qs,[2,1089],{153:1015,179:is,180:os,181:us}),{74:Sa,78:[1,1511]},e(cs,[2,133]),e(Ps,[2,1081],{153:1015,179:is,180:os,181:us}),e(cs,[2,134]),e(Ps,[2,1083],{153:1015,179:is,180:os,181:us}),e(cs,[2,135]),e(cs,[2,136]),e(cs,[2,137]),e(cs,[2,138]),e(cs,[2,139]),e(cs,[2,140]),{2:n,3:168,4:r,5:s,56:165,77:re,94:260,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,151:1512,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Vs,[2,1085],{153:1015,179:is,180:os,181:us}),e(Y,[2,610]),e(Y,[2,606]),e(Y,[2,608]),e(Y,[2,604]),e(cr,[2,71]),e(Y,[2,452],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(js,[2,455]),e(js,[2,456],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{2:n,3:168,4:r,5:s,56:165,77:re,94:1513,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Hs,[2,665]),e(Y,[2,658],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{2:n,3:1514,4:r,5:s},e(gr,[2,548],{387:1515,393:1516,394:1517,368:1525,154:Oa,187:wa,230:Ia,299:xa,345:ka,358:Da,370:La,371:$a,375:Ma,376:Ua}),e(gr,[2,538]),e(Y,[2,579],{76:[1,1529]}),{2:n,3:168,4:r,5:s,56:165,77:re,94:1530,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1531,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1532,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1533,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{74:hr,78:[1,1534]},e(Y,[2,588]),{74:Ca,78:[1,1535]},{2:n,3:168,4:r,5:s,56:165,77:re,94:1376,111:149,113:153,120:1536,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,241:1374,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e([10,74,78,139,308,312,604,765],[2,744]),{139:[1,1537]},{139:[2,1153]},{2:n,3:1122,4:r,5:s,132:lt,137:ht,143:ze,145:Ze,152:dt,433:585,477:1124,480:1538,484:582,495:579,499:581},{78:[1,1539]},{74:[1,1540],78:[2,509]},{40:1541,79:75,89:u,184:99,189:d},e(sa,[2,535]),{74:ta,78:[1,1542]},e(ma,ra),e(Y,[2,1136],{414:1543,415:1544,72:_a}),e(Ds,Xs,{79:75,184:99,114:625,329:637,40:1299,470:1546,89:u,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,146:Ks,154:kt,170:Dt,171:Lt,179:$t,180:Mt,189:d,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en,472:Qs}),e(Ds,[2,728],{74:Bs}),e(Ds,[2,729],{74:hr}),e([10,53,72,89,124,146,156,189,270,271,292,308,312,337,340,341,398,402,403,406,408,410,411,419,420,436,438,439,441,442,443,444,445,449,450,453,454,507,509,510,519,604,765],[2,1184],{514:1547,3:1548,2:n,4:r,5:s,76:[1,1549]}),e(Fa,[2,1186],{515:1550,76:[1,1551]}),e(pt,[2,695],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{131:[1,1552]},e(vs,[2,541]),e(vs,[2,543]),e(We,[2,415]),e(We,[2,416]),e(We,[2,442]),e(We,[2,426]),e(We,[2,428]),{118:Pa,281:1553,282:1554,283:[1,1555]},e(We,[2,331]),e(We,[2,332]),e(We,[2,319]),{131:[1,1557]},e(We,[2,321]),{131:[1,1558]},{74:na,78:[1,1559]},{77:ns,143:oe,144:979,145:Xe,152:le,181:pe,201:980,304:$e,344:1560,421:190,422:Fe,426:Pe},e(Ds,[2,468],{74:Ls}),e(Ds,[2,471]),e(ma,[2,491]),e(sa,[2,483],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(Ds,[2,462],{74:Ls}),e(Y,[2,721],{74:ps,198:[1,1561]}),{337:qa,340:Ga,463:1562},{2:n,3:168,4:r,5:s,56:165,77:re,94:1565,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{119:[1,1567],170:[1,1568],311:[1,1566]},e(Va,[2,259],{86:1569,118:[1,1570]}),{119:[1,1571]},e(ia,[2,239],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{95:[1,1572],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{95:[1,1573]},e(va,[2,203]),e(va,[2,204]),e(ma,[2,178]),e(va,[2,237],{218:1574,230:[1,1575],231:[1,1576]}),e(Ba,[2,208],{3:1577,2:n,4:r,5:s,76:[1,1578]}),e(ja,[2,1098],{219:1579,76:[1,1580]}),{2:n,3:1581,4:r,5:s,76:[1,1582]},{40:1583,79:75,89:u,184:99,189:d},e(Ba,[2,216],{3:1584,2:n,4:r,5:s,76:[1,1585]}),e(Ba,[2,219],{3:1586,2:n,4:r,5:s,76:[1,1587]}),{77:[1,1588]},e(Na,[2,234]),{77:[1,1589]},e(Na,[2,230]),e(Na,[2,223]),{223:ya},{223:Aa},e(Na,[2,225]),e(Na,[2,226]),{223:[1,1590]},e(Na,[2,228]),{223:[1,1591]},{223:[1,1592]},e(Na,[2,232]),e(Na,[2,233]),{78:[1,1593],205:1480,206:ua,208:ca,215:1479,216:1357,221:1360,222:la,223:ha,224:da,225:fa,226:pa,227:ba,228:Ea,229:ga},e(cs,[2,91]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1376,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,241:1594,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(cs,[2,92]),e(Ra,[2,266],{242:1595,243:[1,1596]}),{248:[1,1597]},e(sa,[2,142],{421:190,3:733,114:736,144:758,158:768,160:769,117:1598,2:n,4:r,5:s,72:Sn,76:Tn,77:vn,112:An,115:Tt,116:vt,118:yn,122:Nn,123:Cn,124:Rn,128:On,129:wn,130:In,131:xn,132:kn,133:Dn,134:Ln,135:$n,136:Mn,137:Un,138:_n,139:Fn,140:Pn,141:qn,142:Gn,143:Vn,145:Bn,146:jn,148:Hn,149:Jn,150:Yn,152:Wn,154:Xn,156:Kn,162:Qn,164:zn,166:Zn,168:er,169:tr,170:nr,171:rr,172:sr,173:ar,175:ir,185:or,187:ur,244:be,245:Ee,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,422:Fe,426:Pe}),e(cs,[2,132]),{74:hr,78:[1,1599]},e(js,[2,457],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(Y,[2,575]),e(gr,[2,537]),e(gr,[2,549],{368:1525,394:1600,154:Oa,187:wa,230:Ia,299:xa,345:ka,358:Da,370:La,371:$a,375:Ma,376:Ua}),e(lr,[2,551]),{372:[1,1601]},{372:[1,1602]},{2:n,3:244,4:r,5:s,199:1603},e(lr,[2,557],{77:[1,1604]}),{2:n,3:114,4:r,5:s,77:[1,1606],113:251,131:se,132:ae,143:oe,152:le,156:W,181:pe,196:250,200:1607,201:254,261:252,262:253,269:Ke,278:1605,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,304:$e},e(lr,[2,561]),{299:[1,1608]},e(lr,[2,563]),e(lr,[2,564]),{337:[1,1609]},{77:[1,1610]},{2:n,3:1611,4:r,5:s},{78:[1,1612],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{78:[1,1613],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{78:[1,1614],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{78:[1,1615],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(Y,Js,{409:1616,76:Ys}),e(Y,[2,594]),{74:Ca,78:[1,1617]},{2:n,3:1122,4:r,5:s,132:lt,137:ht,143:ze,145:Ze,152:dt,433:585,477:1124,480:1618,484:582,495:579,499:581},e(gr,[2,738]),e(Y,[2,496],{354:1619,356:1620,357:1621,4:Ha,247:Ja,345:Ya,358:Wa}),e(Xa,Ka,{3:1268,361:1626,386:1627,362:1628,363:1629,2:n,4:r,5:s,369:Qa}),{78:[2,510]},{76:[1,1631]},e(Y,[2,612]),e(Y,[2,1137]),{370:[1,1633],416:[1,1632]},e(Ds,[2,731]),e(Y,t,{17:5,18:7,19:8,20:9,21:10,22:11,23:12,24:13,25:14,26:15,27:16,28:17,29:18,30:19,31:20,32:21,33:22,34:23,35:24,36:25,37:26,38:27,39:28,40:29,41:30,42:31,43:32,44:33,45:34,46:35,47:36,48:37,49:38,50:39,51:40,52:41,54:43,55:44,56:45,57:46,58:47,59:48,60:49,61:50,62:51,63:52,64:53,65:54,66:55,67:56,68:57,69:58,70:59,71:60,79:75,506:95,184:99,3:100,12:1634,2:n,4:r,5:s,53:i,72:o,89:u,124:c,146:l,156:h,189:d,270:f,271:p,292:b,337:E,340:g,341:m,398:S,402:T,403:v,406:A,408:y,410:N,411:C,419:R,420:O,436:w,438:I,439:x,441:k,442:D,443:L,444:$,445:M,449:U,450:_,453:F,454:P,507:q,509:G,510:V,519:B}),e(Y,[2,765]),e(Fa,[2,1185]),e(Y,t,{17:5,18:7,19:8,20:9,21:10,22:11,23:12,24:13,25:14,26:15,27:16,28:17,29:18,30:19,31:20,32:21,33:22,34:23,35:24,36:25,37:26,38:27,39:28,40:29,41:30,42:31,43:32,44:33,45:34,46:35,47:36,48:37,49:38,50:39,51:40,52:41,54:43,55:44,56:45,57:46,58:47,59:48,60:49,61:50,62:51,63:52,64:53,65:54,66:55,67:56,68:57,69:58,70:59,71:60,79:75,506:95,184:99,3:100,12:1635,2:n,4:r,5:s,53:i,72:o,89:u,124:c,146:l,156:h,189:d,270:f,271:p,292:b,337:E,340:g,341:m,398:S,402:T,403:v,406:A,408:y,410:N,411:C,419:R,420:O,436:w,438:I,439:x,441:k,442:D,443:L,444:$,445:M,449:U,450:_,453:F,454:P,507:q,509:G,510:V,519:B}),e(Fa,[2,1187]),{78:[1,1636]},{78:[1,1637],118:Pa,282:1638},{78:[1,1639]},{119:[1,1640]},{119:[1,1641]},{78:[1,1642]},{78:[1,1643]},e(Ms,[2,479]),e(Ds,[2,467],{74:Ls}),{2:n,3:244,4:r,5:s,143:ze,145:Ze,199:1645,433:1644},e(aa,[2,706]),e(aa,[2,708]),{146:[1,1646]},{99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,311:[1,1647],313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},{341:za,464:1648},{419:[1,1651],465:[1,1650]},{2:n,3:168,4:r,5:s,56:165,77:re,94:1652,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Za,[2,270],{87:1653,249:[1,1654],251:[1,1655]}),{119:[1,1656]},{2:n,3:168,4:r,5:s,56:165,77:re,94:1662,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,233:1657,235:1658,236:ei,237:ti,238:ni,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:1663,4:r,5:s},{2:n,3:1664,4:r,5:s},e(va,[2,207]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1665,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:1011,4:r,5:s,100:1666,111:1440},e(Ba,[2,209]),{2:n,3:1667,4:r,5:s},e(Ba,[2,1100],{220:1668,3:1669,2:n,4:r,5:s}),e(ja,[2,1099]),e(Ba,[2,212]),{2:n,3:1670,4:r,5:s},{78:[1,1671]},e(Ba,[2,217]),{2:n,3:1672,4:r,5:s},e(Ba,[2,220]),{2:n,3:1673,4:r,5:s},{40:1674,79:75,89:u,184:99,189:d},{40:1675,79:75,89:u,184:99,189:d},e(Na,[2,227]),e(Na,[2,229]),e(Na,[2,231]),e(rs,[2,171]),e(Ra,[2,262]),e(Ra,[2,267]),{244:[1,1676],245:[1,1677]},e(Ra,[2,268],{246:[1,1678]}),e(qs,[2,1087],{153:1015,179:is,180:os,181:us}),e(cs,[2,141]),e(lr,[2,550]),e(lr,[2,553]),{376:[1,1679]},e(lr,[2,1130],{397:1680,395:1681,77:ri}),{131:se,196:1683},e(lr,[2,558]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1684,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(lr,[2,560]),e(lr,[2,562]),{2:n,3:114,4:r,5:s,77:[1,1686],113:251,131:se,132:ae,143:oe,152:le,156:W,181:pe,196:250,200:255,201:254,261:252,262:253,269:Ke,278:1685,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,304:$e},{2:n,3:168,4:r,5:s,56:165,77:re,94:1687,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Y,[2,581]),e(nn,[2,352]),e(nn,[2,353]),e(nn,[2,354]),e(nn,[2,355]),e(Y,[2,585]),e(Y,[2,595]),e(gr,[2,737]),e(Y,[2,492]),e(Y,[2,497],{357:1688,4:Ha,247:Ja,345:Ya,358:Wa}),e(si,[2,499]),e(si,[2,500]),{124:[1,1689]},{124:[1,1690]},{124:[1,1691]},{74:[1,1692],78:[2,508]},e(sa,[2,536]),e(sa,[2,511]),{187:[1,1700],193:[1,1701],364:1693,365:1694,366:1695,367:1696,368:1697,370:La,371:[1,1698],372:[1,1702],375:[1,1699]},{2:n,3:1703,4:r,5:s},{40:1704,79:75,89:u,184:99,189:d},{417:[1,1705]},{418:[1,1706]},e(Y,[2,764]),e(Y,[2,766]),e(vs,[2,540]),e(We,[2,334]),{78:[1,1707]},e(We,[2,335]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1662,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,233:1708,235:1658,236:ei,237:ti,238:ni,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1376,111:149,113:153,120:1709,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,241:1374,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(We,[2,320]),e(We,[2,322]),{2:n,3:1710,4:r,5:s},e(Y,[2,723],{77:[1,1711]}),{2:n,3:1011,4:r,5:s,111:1065,143:ls,145:hs,147:1712,338:1064,339:1066},{337:qa,340:Ga,463:1713},e(aa,[2,710]),{77:[1,1715],345:[1,1716],346:[1,1714]},{170:[1,1718],311:[1,1717]},{170:[1,1720],311:[1,1719]},{99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,311:[1,1721],313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(as,[2,250],{88:1722,162:[1,1723],168:[1,1725],169:[1,1724]}),{131:se,196:1726},{131:se,196:1727},{2:n,3:168,4:r,5:s,56:165,77:re,94:1376,111:149,113:153,120:1728,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,241:1374,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},e(Ta,[2,248],{234:1729,74:ai,239:[1,1731]}),e(ii,[2,242]),{146:[1,1732]},{77:[1,1733]},{77:[1,1734]},e(ii,[2,247],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{78:[2,1054],96:1735,99:[1,1737],102:1736},{99:[1,1738]},e(va,[2,235],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),e(va,[2,236],{74:ta}),e(Ba,[2,210]),e(Ba,[2,211]),e(Ba,[2,1101]),e(Ba,[2,213]),{2:n,3:1739,4:r,5:s,76:[1,1740]},e(Ba,[2,218]),e(Ba,[2,221]),{78:[1,1741]},{78:[1,1742]},e(Ra,[2,263]),e(Ra,[2,264]),e(Ra,[2,269]),{2:n,3:244,4:r,5:s,199:1743},e(lr,[2,555]),e(lr,[2,1131]),{2:n,3:1744,4:r,5:s},{74:[1,1745]},{78:[1,1746],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(lr,[2,565]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1747,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{78:[1,1748],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(si,[2,498]),{2:n,3:1749,4:r,5:s},{131:se,196:1750},{2:n,3:1751,4:r,5:s},e(Xa,Ka,{363:1629,362:1752,369:Qa}),e(gr,[2,513]),e(gr,[2,514]),e(gr,[2,515]),e(gr,[2,516]),e(gr,[2,517]),{372:[1,1753]},{372:[1,1754]},e(oi,[2,1124],{384:1755,372:[1,1756]}),{2:n,3:1757,4:r,5:s},{2:n,3:1758,4:r,5:s},e(Xa,[2,519]),e(Y,[2,1134],{413:1759,415:1760,72:_a}),e(Y,[2,613]),e(Y,[2,614],{369:[1,1761]}),e(We,[2,336]),e([78,118],[2,337],{74:ai}),{74:Ca,78:[2,338]},e(Y,[2,722]),{2:n,3:1011,4:r,5:s,100:1762,111:1440},e(aa,[2,709],{74:Bs}),e(aa,[2,707]),{77:ns,143:oe,144:979,145:Xe,152:le,181:pe,201:980,304:$e,344:1763,421:190,422:Fe,426:Pe},{2:n,3:1011,4:r,5:s,100:1764,111:1440},{346:[1,1765]},{341:za,464:1766},{2:n,3:168,4:r,5:s,56:165,77:re,94:1767,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{341:za,464:1768},{2:n,3:168,4:r,5:s,56:165,77:re,94:1769,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{341:za,464:1770},e(as,[2,72]),{40:1771,79:75,89:u,164:[1,1772],184:99,189:d,240:[1,1773]},{40:1774,79:75,89:u,184:99,189:d,240:[1,1775]},{40:1776,79:75,89:u,184:99,189:d,240:[1,1777]},e(Za,[2,273],{250:1778,251:[1,1779]}),{252:1780,253:[2,1102],767:[1,1781]},e(Va,[2,260],{74:Ca}),e(Ta,[2,241]),{2:n,3:168,4:r,5:s,56:165,77:re,94:1662,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,235:1782,236:ei,237:ti,238:ni,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1783,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{77:[1,1784]},{2:n,3:168,4:r,5:s,56:165,77:re,94:1662,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,233:1785,235:1658,236:ei,237:ti,238:ni,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:168,4:r,5:s,56:165,77:re,94:1662,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,233:1786,235:1658,236:ei,237:ti,238:ni,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{78:[1,1787]},{78:[2,1055]},{77:[1,1788]},{77:[1,1789]},e(Ba,[2,214]),{2:n,3:1790,4:r,5:s},{2:n,3:1791,4:r,5:s,76:[1,1792]},{2:n,3:1793,4:r,5:s,76:[1,1794]},e(lr,[2,1128],{396:1795,395:1796,77:ri}),{78:[1,1797]},{131:se,196:1798},e(lr,[2,559]),{78:[1,1799],99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(lr,[2,520]),e(si,[2,501]),e(si,[2,502]),e(si,[2,503]),e(sa,[2,512]),{2:n,3:1801,4:r,5:s,77:[2,1120],373:1800},{77:[1,1802]},{2:n,3:1804,4:r,5:s,77:[2,1126],385:1803},e(oi,[2,1125]),{77:[1,1805]},{77:[1,1806]},e(Y,[2,611]),e(Y,[2,1135]),e(Xa,Ka,{363:1629,362:1807,369:Qa}),{74:ta,78:[1,1808]},e(aa,[2,716],{74:Ls}),{74:ta,78:[1,1809]},e(aa,[2,718]),e(aa,[2,711]),{99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,311:[1,1810],313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(aa,[2,714]),{99:mt,112:St,114:625,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,311:[1,1811],313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,329:637,332:Qt,333:zt,334:Zt,335:en},e(aa,[2,712]),e(as,[2,251]),{40:1812,79:75,89:u,184:99,189:d,240:[1,1813]},{40:1814,79:75,89:u,184:99,189:d},e(as,[2,253]),{40:1815,79:75,89:u,184:99,189:d},e(as,[2,254]),{40:1816,79:75,89:u,184:99,189:d},e(Za,[2,271]),{131:se,196:1817},{253:[1,1818]},{253:[2,1103]},e(ii,[2,243]),e(Ta,[2,249],{114:625,329:637,99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{2:n,3:168,4:r,5:s,56:165,77:re,94:1662,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,233:1819,235:1658,236:ei,237:ti,238:ni,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{74:ai,78:[1,1820]},{74:ai,78:[1,1821]},e(_s,[2,1056],{97:1822,104:1823,3:1825,2:n,4:r,5:s,76:ui}),{2:n,3:168,4:r,5:s,56:165,77:re,94:1828,103:1826,105:1827,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:1011,4:r,5:s,100:1829,111:1440},e(Ba,[2,215]),e(va,[2,173]),{2:n,3:1830,4:r,5:s},e(va,[2,175]),{2:n,3:1831,4:r,5:s},e(lr,[2,554]),e(lr,[2,1129]),e(lr,[2,552]),{78:[1,1832]},e(lr,[2,566]),{77:[1,1833]},{77:[2,1121]},{2:n,3:1835,4:r,5:s,132:ci,374:1834},{77:[1,1837]},{77:[2,1127]},{2:n,3:1011,4:r,5:s,100:1838,111:1440},{2:n,3:1011,4:r,5:s,100:1839,111:1440},e(Y,[2,615]),e(Y,[2,724]),{345:[1,1841],346:[1,1840]},{341:za,464:1842},{337:qa,340:Ga,463:1843},e(as,[2,252]),{40:1844,79:75,89:u,184:99,189:d},e(as,[2,255]),e(as,[2,257]),e(as,[2,258]),e(Za,[2,274]),{131:[2,1104],254:1845,647:[1,1846]},{74:ai,78:[1,1847]},e(ii,[2,245]),e(ii,[2,246]),e(_s,[2,74]),e(_s,[2,1057]),{2:n,3:1848,4:r,5:s},e(_s,[2,78]),{74:[1,1850],78:[1,1849]},e(sa,[2,80]),e(sa,[2,81],{114:625,329:637,76:[1,1851],99:mt,112:St,115:Tt,116:vt,123:At,124:fr,133:Nt,136:Ct,138:Rt,139:Ot,140:wt,141:It,142:xt,154:kt,170:Dt,171:Lt,179:$t,180:Mt,313:Ut,314:_t,315:Ft,317:Pt,318:qt,319:Gt,320:Vt,321:Bt,322:jt,323:Ht,324:Jt,325:Yt,326:Wt,327:Xt,328:Kt,332:Qt,333:zt,334:Zt,335:en}),{74:ta,78:[1,1852]},e(va,[2,174]),e(va,[2,176]),e(lr,[2,556]),{2:n,3:1835,4:r,5:s,132:ci,374:1853},{74:li,78:[1,1854]},e(sa,[2,531]),e(sa,[2,532]),{2:n,3:1011,4:r,5:s,100:1856,111:1440},{74:ta,78:[1,1857]},{74:ta,78:[1,1858]},{77:ns,143:oe,144:979,145:Xe,152:le,181:pe,201:980,304:$e,344:1859,421:190,422:Fe,426:Pe},{346:[1,1860]},e(aa,[2,713]),e(aa,[2,715]),e(as,[2,256]),{131:se,196:1861},{131:[2,1105]},e(ii,[2,244]),e(_s,[2,77]),{78:[2,76]},{2:n,3:168,4:r,5:s,56:165,77:re,94:1828,105:1862,111:149,113:153,131:se,132:ae,137:ie,143:oe,144:161,145:ue,149:ce,152:le,154:he,156:W,158:167,179:de,180:fe,181:pe,196:151,200:147,201:155,202:156,244:be,245:Ee,258:150,259:146,260:148,261:152,262:154,263:157,264:158,265:159,266:162,267:163,269:ge,270:f,274:me,275:Se,277:Te,284:ve,285:Ae,286:ye,287:Ne,288:Ce,289:Re,290:Oe,292:X,293:K,294:Q,295:z,296:we,297:Ie,298:xe,299:ke,300:De,301:Le,304:$e,305:Me,314:Ue,319:_e,421:190,422:Fe,426:Pe},{2:n,3:1863,4:r,5:s},{78:[1,1864]},{74:li,78:[1,1865]},{376:[1,1866]},{2:n,3:1867,4:r,5:s,132:[1,1868]},{74:ta,78:[1,1869]},e(gr,[2,529]),e(gr,[2,530]),e(aa,[2,717],{74:Ls}),e(aa,[2,719]),e(hi,[2,1106],{255:1870,767:[1,1871]}),e(sa,[2,79]),e(sa,[2,82]),e(_s,[2,1058],{3:1825,101:1872,104:1873,2:n,4:r,5:s,76:ui}),e(gr,[2,521]),{2:n,3:244,4:r,5:s,199:1874},e(sa,[2,533]),e(sa,[2,534]),e(gr,[2,528]),e(Za,[2,1108],{256:1875,417:[1,1876]}),e(hi,[2,1107]),e(_s,[2,75]),e(_s,[2,1059]),e(di,[2,1122],{377:1877,379:1878,77:[1,1879]}),e(Za,[2,272]),e(Za,[2,1109]),e(gr,[2,524],{378:1880,380:1881,230:[1,1882]}),e(di,[2,1123]),{2:n,3:1835,4:r,5:s,132:ci,374:1883},e(gr,[2,522]),{230:[1,1885],381:1884},{340:[1,1886]},{74:li,78:[1,1887]},e(gr,[2,525]),{337:[1,1888]},{382:[1,1889]},e(di,[2,523]),{382:[1,1890]},{383:[1,1891]},{383:[1,1892]},{230:[2,526]},e(gr,[2,527])],defaultActions:{105:[2,6],194:[2,339],195:[2,340],196:[2,341],197:[2,342],198:[2,343],199:[2,344],200:[2,345],201:[2,346],202:[2,347],209:[2,698],591:[2,1145],653:[2,1110],654:[2,1111],710:[2,699],780:[2,1076],781:[2,1077],926:[2,449],927:[2,450],928:[2,451],987:[2,700],1288:[2,1155],1375:[2,1063],1433:[2,1153],1541:[2,510],1736:[2,1055],1781:[2,1103],1801:[2,1121],1804:[2,1127],1846:[2,1105],1849:[2,76],1891:[2,526]},parseError:function(e,t){if(!t.recoverable){var n=new Error(e);throw n.hash=t,n}this.trace(e);},parse:function(e){var t,n=this,r=[0],s=[null],a=[],i=this.table,o="",u=0,c=0,l=0,h=a.slice.call(arguments,1),d=Object.create(this.lexer),f={yy:{}};for(t in this.yy)Object.prototype.hasOwnProperty.call(this.yy,t)&&(f.yy[t]=this.yy[t]);d.setInput(e,f.yy),f.yy.lexer=d,f.yy.parser=this,void 0===d.yylloc&&(d.yylloc={});var p=d.yylloc;a.push(p);var b=d.options&&d.options.ranges;"function"==typeof f.yy.parseError?this.parseError=f.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;for(var E,g,m,S,T,v,A,y,N,C=function(){var e=d.lex()||1;return e="number"!=typeof e?n.symbols_[e]||e:e},R={};;){if(m=r[r.length-1],void 0===(S=this.defaultActions[m]||(null==E&&(E=C()),i[m]&&i[m][E]))||!S.length||!S[0]){var O,w="",I=function(e){for(var t=r.length-1,n=0;;){if(2..toString()in i[e])return n;if(0===e||t<2)return !1;e=r[t-=2],++n;}};if(l)1!==g&&(O=I(m));else {for(v in O=I(m),y=[],i[m])this.terminals_[v]&&2<v&&y.push("'"+this.terminals_[v]+"'");w=d.showPosition?"Parse error on line "+(u+1)+":\n"+d.showPosition()+"\nExpecting "+y.join(", ")+", got '"+(this.terminals_[E]||E)+"'":"Parse error on line "+(u+1)+": Unexpected "+(1==E?"end of input":"'"+(this.terminals_[E]||E)+"'"),this.parseError(w,{text:d.match,token:this.terminals_[E]||E,line:d.yylineno,loc:p,expected:y,recoverable:!1!==O});}if(3==l){if(1===E||1===g)throw new Error(w||"Parsing halted while starting to recover from another error.");c=d.yyleng,o=d.yytext,u=d.yylineno,p=d.yylloc,E=C();}if(!1===O)throw new Error(w||"Parsing halted. No suitable error recovery rule available.");N=O,r.length=r.length-2*N,s.length=s.length-N,a.length=a.length-N,g=2==E?null:E,E=2,m=r[r.length-1],S=i[m]&&i[m][2],l=3;}if(S[0]instanceof Array&&1<S.length)throw new Error("Parse Error: multiple actions possible at state: "+m+", token: "+E);switch(S[0]){case 1:r.push(E),s.push(d.yytext),a.push(d.yylloc),r.push(S[1]),E=null,g?(E=g,g=null):(c=d.yyleng,o=d.yytext,u=d.yylineno,p=d.yylloc,0<l&&l--);break;case 2:if(A=this.productions_[S[1]][1],R.$=s[s.length-A],R._$={first_line:a[a.length-(A||1)].first_line,last_line:a[a.length-1].last_line,first_column:a[a.length-(A||1)].first_column,last_column:a[a.length-1].last_column},b&&(R._$.range=[a[a.length-(A||1)].range[0],a[a.length-1].range[1]]),void 0!==(T=this.performAction.apply(R,[o,c,u,f.yy,S[1],s,a].concat(h))))return T;A&&(r=r.slice(0,-1*A*2),s=s.slice(0,-1*A),a=a.slice(0,-1*A)),r.push(this.productions_[S[1]][0]),s.push(R.$),a.push(R._$),A=i[r[r.length-2]][r[r.length-1]],r.push(A);break;case 3:return !0}}return !0}},fi=["A","ABSENT","ABSOLUTE","ACCORDING","ACTION","ADA","ADD","ADMIN","AFTER","ALWAYS","ASC","ASSERTION","ASSIGNMENT","ATTRIBUTE","ATTRIBUTES","BASE64","BEFORE","BERNOULLI","BLOCKED","BOM","BREADTH","C","CASCADE","CATALOG","CATALOG_NAME","CHAIN","CHARACTERISTICS","CHARACTERS","CHARACTER_SET_CATALOG","CHARACTER_SET_NAME","CHARACTER_SET_SCHEMA","CLASS_ORIGIN","COBOL","COLLATION","COLLATION_CATALOG","COLLATION_NAME","COLLATION_SCHEMA","COLUMNS","COLUMN_NAME","COMMAND_FUNCTION","COMMAND_FUNCTION_CODE","COMMITTED","CONDITION_NUMBER","CONNECTION","CONNECTION_NAME","CONSTRAINTS","CONSTRAINT_CATALOG","CONSTRAINT_NAME","CONSTRAINT_SCHEMA","CONSTRUCTOR","CONTENT","CONTINUE","CONTROL","CURSOR_NAME","DATA","DATETIME_INTERVAL_CODE","DATETIME_INTERVAL_PRECISION","DB","DEFAULTS","DEFERRABLE","DEFERRED","DEFINED","DEFINER","DEGREE","DEPTH","DERIVED","DESC","DESCRIPTOR","DIAGNOSTICS","DISPATCH","DOCUMENT","DOMAIN","DYNAMIC_FUNCTION","DYNAMIC_FUNCTION_CODE","EMPTY","ENCODING","ENFORCED","EXCLUDE","EXCLUDING","EXPRESSION","FILE","FINAL","FIRST","FLAG","FOLLOWING","FORTRAN","FOUND","FS","G","GENERAL","GENERATED","GO","GOTO","GRANTED","HEX","HIERARCHY","ID","IGNORE","IMMEDIATE","IMMEDIATELY","IMPLEMENTATION","INCLUDING","INCREMENT","INDENT","INITIALLY","INPUT","INSTANCE","INSTANTIABLE","INSTEAD","INTEGRITY","INVOKER","ISOLATION","K","KEY","KEY_MEMBER","KEY_TYPE","LAST","LENGTH","LEVEL","LIBRARY","LIMIT","LINK","LOCATION","LOCATOR","M","MAP","MAPPING","MATCHED","MAXVALUE","MESSAGE_LENGTH","MESSAGE_OCTET_LENGTH","MESSAGE_TEXT","MINVALUE","MORE","MUMPS","NAME","NAMES","NAMESPACE","NESTING","NEXT","NFC","NFD","NFKC","NFKD","NIL","NORMALIZED","NULLABLE","NULLS","NUMBER","OBJECT","OCTETS","OFF","OPTION","OPTIONS","ORDERING","ORDINALITY","OTHERS","OUTPUT","OVERRIDING","P","PAD","PARAMETER_MODE","PARAMETER_NAME","PARAMETER_ORDINAL_POSITION","PARAMETER_SPECIFIC_CATALOG","PARAMETER_SPECIFIC_NAME","PARAMETER_SPECIFIC_SCHEMA","PARTIAL","PASCAL","PASSING","PASSTHROUGH","PATH","PERMISSION","PLACING","PLI","PRECEDING","PRESERVE","PRIOR","PRIVILEGES","PUBLIC","READ","RECOVERY","RELATIVE","REPEATABLE","REQUIRING","RESPECT","RESTART","RESTORE","RESTRICT","RETURNED_CARDINALITY","RETURNED_LENGTH","RETURNED_OCTET_LENGTH","RETURNED_SQLSTATE","RETURNING","ROLE","ROUTINE","ROUTINE_CATALOG","ROUTINE_NAME","ROUTINE_SCHEMA","ROW_COUNT","SCALE","SCHEMA","SCHEMA_NAME","SCOPE_CATALOG","SCOPE_NAME","SCOPE_SCHEMA","SECTION","SECURITY","SELECTIVE","SELF","SEQUENCE","SERIALIZABLE","SERVER","SERVER_NAME","SESSION","SETS","SIMPLE","SIZE","SOURCE","SPACE","SPECIFIC_NAME","STANDALONE","STATE","STATEMENT","STRIP","STRUCTURE","STYLE","SUBCLASS_ORIGIN","T","TABLE_NAME","TEMPORARY","TIES","TOKEN","TOP_LEVEL_COUNT","TRANSACTION","TRANSACTIONS_COMMITTED","TRANSACTIONS_ROLLED_BACK","TRANSACTION_ACTIVE","TRANSFORM","TRANSFORMS","TRIGGER_CATALOG","TRIGGER_NAME","TRIGGER_SCHEMA","TYPE","UNBOUNDED","UNCOMMITTED","UNDER","UNLINK","UNNAMED","UNTYPED","URI","USAGE","USER_DEFINED_TYPE_CATALOG","USER_DEFINED_TYPE_CODE","USER_DEFINED_TYPE_NAME","USER_DEFINED_TYPE_SCHEMA","VALID","VERSION","VIEW","WHITESPACE","WORK","WRAPPER","WRITE","XMLDECLARATION","XMLSCHEMA","YES","ZONE"];e.parseError=function(e,t){if(!(t.expected&&-1<t.expected.indexOf("'LITERAL'")&&/[a-zA-Z_][a-zA-Z_0-9]*/.test(t.token)&&-1<fi.indexOf(t.token)))throw new SyntaxError(e)};gr={EOF:1,parseError:function(e,t){if(!this.yy.parser)throw new Error(e);this.yy.parser.parseError(e,t);},setInput:function(e,t){return this.yy=t||this.yy||{},this._input=e,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var e=this._input[0];return this.yytext+=e,this.yyleng++,this.offset++,this.match+=e,this.matched+=e,e.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),e},unput:function(e){var t=e.length,n=e.split(/(?:\r\n?|\n)/g);this._input=e+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-t),this.offset-=t;var r=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),n.length-1&&(this.yylineno-=n.length-1);e=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:n?(n.length===r.length?this.yylloc.first_column:0)+r[r.length-n.length].length-n[0].length:this.yylloc.first_column-t},this.options.ranges&&(this.yylloc.range=[e[0],e[0]+this.yyleng-t]),this.yyleng=this.yytext.length,this},more:function(){return this._more=!0,this},reject:function(){return this.options.backtrack_lexer?(this._backtrack=!0,this):this.parseError("Lexical error on line "+(this.yylineno+1)+". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},less:function(e){this.unput(this.match.slice(e));},pastInput:function(){var e=this.matched.substr(0,this.matched.length-this.match.length);return (20<e.length?"...":"")+e.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var e=this.match;return e.length<20&&(e+=this._input.substr(0,20-e.length)),(e.substr(0,20)+(20<e.length?"...":"")).replace(/\n/g,"")},showPosition:function(){var e=this.pastInput(),t=new Array(e.length+1).join("-");return e+this.upcomingInput()+"\n"+t+"^"},test_match:function(e,t){var n,r;if(this.options.backtrack_lexer&&(r={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(r.yylloc.range=this.yylloc.range.slice(0))),(n=e[0].match(/(?:\r\n?|\n).*/g))&&(this.yylineno+=n.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:n?n[n.length-1].length-n[n.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+e[0].length},this.yytext+=e[0],this.match+=e[0],this.matches=e,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(e[0].length),this.matched+=e[0],t=this.performAction.call(this,this.yy,this,t,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),t)return t;if(this._backtrack){for(var s in r)this[s]=r[s];return !1}return !1},next:function(){if(this.done)return this.EOF;var e,t,n,r;this._input||(this.done=!0),this._more||(this.yytext="",this.match="");for(var s=this._currentRules(),a=0;a<s.length;a++)if((n=this._input.match(this.rules[s[a]]))&&(!t||n[0].length>t[0].length))if(t=n,r=a,this.options.backtrack_lexer){if(!1!==(e=this.test_match(n,s[a])))return e;if(!this._backtrack)return !1;t=!1;}else if(!this.options.flex)break;return t?!1!==(e=this.test_match(t,s[r]))&&e:""===this._input?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+". Unrecognized text.\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var e=this.next();return e||this.lex()},begin:function(e){this.conditionStack.push(e);},popState:function(){return 0<this.conditionStack.length-1?this.conditionStack.pop():this.conditionStack[0]},_currentRules:function(){return (this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]]:this.conditions.INITIAL).rules},topState:function(e){return 0<=(e=this.conditionStack.length-1-Math.abs(e||0))?this.conditionStack[e]:"INITIAL"},pushState:function(e){this.begin(e);},stateStackSize:function(){return this.conditionStack.length},options:{"case-insensitive":!0},performAction:function(e,t,n,r){switch(n){case 0:return 270;case 1:return 304;case 2:return 422;case 3:return 301;case 4:case 5:return 5;case 6:case 7:return 298;case 8:case 9:return 132;case 10:return;case 11:break;case 12:return 318;case 13:return 321;case 14:return t.yytext="VALUE",89;case 15:return t.yytext="VALUE",189;case 16:return t.yytext="ROW",189;case 17:return t.yytext="COLUMN",189;case 18:return t.yytext="MATRIX",189;case 19:return t.yytext="INDEX",189;case 20:return t.yytext="RECORDSET",189;case 21:return t.yytext="TEXT",189;case 22:return t.yytext="SELECT",189;case 23:return 522;case 24:return 383;case 25:return 404;case 26:return 517;case 27:return 289;case 28:case 29:return 273;case 30:return 164;case 31:return 402;case 32:return 170;case 33:return 229;case 34:return 166;case 35:return 207;case 36:return 290;case 37:return 76;case 38:return 420;case 39:return 246;case 40:return 406;case 41:return 358;case 42:return 288;case 43:return 516;case 44:return 439;case 45:return 332;case 46:return 443;case 47:return 333;case 48:return 317;case 49:return 119;case 50:return 112;case 51:return 317;case 52:return 112;case 53:return 317;case 54:return 112;case 55:return 317;case 56:return 510;case 57:return 305;case 58:return 275;case 59:return 370;case 60:return 130;case 61:return "CLOSE";case 62:return 247;case 63:case 64:return 190;case 65:return 436;case 66:return 369;case 67:return 472;case 68:return 442;case 69:return 277;case 70:return 240;case 71:return 285;case 72:return 271;case 73:return 206;case 74:return 238;case 75:return 269;case 76:return "CURSOR";case 77:return 407;case 78:return 293;case 79:return 294;case 80:return 450;case 81:return 345;case 82:return 340;case 83:return "DELETED";case 84:return 246;case 85:return 408;case 86:return 185;case 87:return 398;case 88:return 449;case 89:return 135;case 90:return 308;case 91:return 391;case 92:return 312;case 93:return 316;case 94:return 169;case 95:case 96:return 510;case 97:return 300;case 98:return 14;case 99:return 297;case 100:return 253;case 101:return 244;case 102:return 95;case 103:return 375;case 104:return 183;case 105:return 227;case 106:return 272;case 107:return 315;case 108:return 604;case 109:return 474;case 110:return 232;case 111:return 236;case 112:return 239;case 113:return 156;case 114:return 358;case 115:return 334;case 116:return 99;case 117:return 193;case 118:return 212;case 119:return 224;case 120:return 518;case 121:return 341;case 122:return 213;case 123:return 168;case 124:return 295;case 125:return 198;case 126:return 223;case 127:return 372;case 128:return 245;case 129:return "LET";case 130:return 225;case 131:return 112;case 132:return 249;case 133:return 462;case 134:return 191;case 135:return 287;case 136:return 392;case 137:return 286;case 138:return 454;case 139:return 169;case 140:return 405;case 141:return 222;case 142:return 647;case 143:return 274;case 144:return 248;case 145:return 382;case 146:return 154;case 147:return 299;case 148:return 243;case 149:return 435;case 150:return 230;case 151:return 417;case 152:return 129;case 153:return 251;case 154:return "OPEN";case 155:return 418;case 156:return 171;case 157:return 118;case 158:return 208;case 159:return 280;case 160:return 172;case 161:return 283;case 162:return 766;case 163:return 93;case 164:return 16;case 165:return 371;case 166:return 444;case 167:return 679;case 168:return 15;case 169:return 416;case 170:return 194;case 171:return "REDUCE";case 172:return 376;case 173:return 313;case 174:return 519;case 175:return 683;case 176:return 107;case 177:return 403;case 178:return 175;case 179:return 292;case 180:return 445;case 181:return 688;case 182:case 183:return 173;case 184:return 226;case 185:return 438;case 186:return 237;case 187:return 150;case 188:return 767;case 189:return 407;case 190:return 89;case 191:return 228;case 192:case 193:return 146;case 194:return 411;case 195:return 336;case 196:return 419;case 197:return "STRATEGY";case 198:return "STORE";case 199:return 284;case 200:case 201:return 355;case 202:return 465;case 203:case 204:return 359;case 205:return 192;case 206:return 311;case 207:return "TIMEOUT";case 208:return 148;case 209:return 195;case 210:case 211:return 437;case 212:return 511;case 213:return 296;case 214:return 453;case 215:return 162;case 216:return 187;case 217:return 98;case 218:return 337;case 219:return 410;case 220:return 231;case 221:return 149;case 222:return 346;case 223:return 134;case 224:return 412;case 225:return 310;case 226:return 128;case 227:return 441;case 228:return 72;case 229:return 437;case 230:case 231:return 131;case 232:return 115;case 233:return 137;case 234:return 179;case 235:return 319;case 236:return 180;case 237:return 133;case 238:return 138;case 239:return 328;case 240:return 325;case 241:return 327;case 242:return 324;case 243:return 322;case 244:return 320;case 245:return 321;case 246:return 142;case 247:return 141;case 248:return 139;case 249:return 323;case 250:return 326;case 251:return 140;case 252:return 124;case 253:return 326;case 254:return 77;case 255:return 78;case 256:return 145;case 257:return 426;case 258:return 428;case 259:return 302;case 260:return 507;case 261:return 509;case 262:return 122;case 263:return 116;case 264:return 74;case 265:return 335;case 266:return 152;case 267:return 765;case 268:return 143;case 269:return 181;case 270:return 136;case 271:return 123;case 272:return 314;case 273:return 4;case 274:return 10;case 275:return "INVALID"}},rules:[/^(?:``([^\`])+``)/i,/^(?:\[\?\])/i,/^(?:@\[)/i,/^(?:ARRAY\[)/i,/^(?:\[([^\]'])*?\])/i,/^(?:`([^\`'])*?`)/i,/^(?:N(['](\\.|[^']|\\')*?['])+)/i,/^(?:X(['](\\.|[^']|\\')*?['])+)/i,/^(?:(['](\\.|[^']|\\')*?['])+)/i,/^(?:(["](\\.|[^"]|\\")*?["])+)/i,/^(?:--(.*?)($|\r\n|\r|\n))/i,/^(?:\s+)/i,/^(?:\|\|)/i,/^(?:\|)/i,/^(?:VALUE\s+OF\s+SEARCH\b)/i,/^(?:VALUE\s+OF\s+SELECT\b)/i,/^(?:ROW\s+OF\s+SELECT\b)/i,/^(?:COLUMN\s+OF\s+SELECT\b)/i,/^(?:MATRIX\s+OF\s+SELECT\b)/i,/^(?:INDEX\s+OF\s+SELECT\b)/i,/^(?:RECORDSET\s+OF\s+SELECT\b)/i,/^(?:TEXT\s+OF\s+SELECT\b)/i,/^(?:SELECT\b)/i,/^(?:ABSOLUTE\b)/i,/^(?:ACTION\b)/i,/^(?:ADD\b)/i,/^(?:AFTER\b)/i,/^(?:AGGR\b)/i,/^(?:AGGREGATE\b)/i,/^(?:AGGREGATOR\b)/i,/^(?:ALL\b)/i,/^(?:ALTER\b)/i,/^(?:AND\b)/i,/^(?:ANTI\b)/i,/^(?:ANY\b)/i,/^(?:APPLY\b)/i,/^(?:ARRAY\b)/i,/^(?:AS\b)/i,/^(?:ASSERT\b)/i,/^(?:ASC\b)/i,/^(?:ATTACH\b)/i,/^(?:AUTO(_)?INCREMENT\b)/i,/^(?:AVG\b)/i,/^(?:BEFORE\b)/i,/^(?:BEGIN\b)/i,/^(?:BETWEEN\b)/i,/^(?:BREAK\b)/i,/^(?:NOT\s+BETWEEN\b)/i,/^(?:NOT\s+LIKE\b)/i,/^(?:BY\b)/i,/^(?:~~\*)/i,/^(?:!~~\*)/i,/^(?:~~)/i,/^(?:!~~)/i,/^(?:ILIKE\b)/i,/^(?:NOT\s+ILIKE\b)/i,/^(?:CALL\b)/i,/^(?:CASE\b)/i,/^(?:CAST\b)/i,/^(?:CHECK\b)/i,/^(?:CLASS\b)/i,/^(?:CLOSE\b)/i,/^(?:COLLATE\b)/i,/^(?:COLUMN\b)/i,/^(?:COLUMNS\b)/i,/^(?:COMMIT\b)/i,/^(?:CONSTRAINT\b)/i,/^(?:CONTENT\b)/i,/^(?:CONTINUE\b)/i,/^(?:CONVERT\b)/i,/^(?:CORRESPONDING\b)/i,/^(?:COUNT\b)/i,/^(?:CREATE\b)/i,/^(?:CROSS\b)/i,/^(?:CUBE\b)/i,/^(?:CURRENT_TIMESTAMP\b)/i,/^(?:CURSOR\b)/i,/^(?:DATABASE(S)?)/i,/^(?:DATEADD\b)/i,/^(?:DATEDIFF\b)/i,/^(?:DECLARE\b)/i,/^(?:DEFAULT\b)/i,/^(?:DELETE\b)/i,/^(?:DELETED\b)/i,/^(?:DESC\b)/i,/^(?:DETACH\b)/i,/^(?:DISTINCT\b)/i,/^(?:DROP\b)/i,/^(?:ECHO\b)/i,/^(?:EDGE\b)/i,/^(?:END\b)/i,/^(?:ENUM\b)/i,/^(?:ELSE\b)/i,/^(?:ESCAPE\b)/i,/^(?:EXCEPT\b)/i,/^(?:EXEC\b)/i,/^(?:EXECUTE\b)/i,/^(?:EXISTS\b)/i,/^(?:EXPLAIN\b)/i,/^(?:FALSE\b)/i,/^(?:FETCH\b)/i,/^(?:FIRST\b)/i,/^(?:FOR\b)/i,/^(?:FOREIGN\b)/i,/^(?:FROM\b)/i,/^(?:FULL\b)/i,/^(?:FUNCTION\b)/i,/^(?:GLOB\b)/i,/^(?:GO\b)/i,/^(?:GRAPH\b)/i,/^(?:GROUP\b)/i,/^(?:GROUPING\b)/i,/^(?:HAVING\b)/i,/^(?:IF\b)/i,/^(?:IDENTITY\b)/i,/^(?:IS\b)/i,/^(?:IN\b)/i,/^(?:INDEX\b)/i,/^(?:INDEXED\b)/i,/^(?:INNER\b)/i,/^(?:INSTEAD\b)/i,/^(?:INSERT\b)/i,/^(?:INSERTED\b)/i,/^(?:INTERSECT\b)/i,/^(?:INTERVAL\b)/i,/^(?:INTO\b)/i,/^(?:JOIN\b)/i,/^(?:KEY\b)/i,/^(?:LAST\b)/i,/^(?:LET\b)/i,/^(?:LEFT\b)/i,/^(?:LIKE\b)/i,/^(?:LIMIT\b)/i,/^(?:MATCHED\b)/i,/^(?:MATRIX\b)/i,/^(?:MAX(\s+)?(?=\())/i,/^(?:MAX(\s+)?(?=(,|\))))/i,/^(?:MIN(\s+)?(?=\())/i,/^(?:MERGE\b)/i,/^(?:MINUS\b)/i,/^(?:MODIFY\b)/i,/^(?:NATURAL\b)/i,/^(?:NEXT\b)/i,/^(?:NEW\b)/i,/^(?:NOCASE\b)/i,/^(?:NO\b)/i,/^(?:NOT\b)/i,/^(?:NULL\b)/i,/^(?:NULLS\b)/i,/^(?:OFF\b)/i,/^(?:ON\b)/i,/^(?:ONLY\b)/i,/^(?:OF\b)/i,/^(?:OFFSET\b)/i,/^(?:OPEN\b)/i,/^(?:OPTION\b)/i,/^(?:OR\b)/i,/^(?:ORDER\b)/i,/^(?:OUTER\b)/i,/^(?:OVER\b)/i,/^(?:PATH\b)/i,/^(?:PARTITION\b)/i,/^(?:PERCENT\b)/i,/^(?:PIVOT\b)/i,/^(?:PLAN\b)/i,/^(?:PRIMARY\b)/i,/^(?:PRINT\b)/i,/^(?:PRIOR\b)/i,/^(?:QUERY\b)/i,/^(?:READ\b)/i,/^(?:RECORDSET\b)/i,/^(?:REDUCE\b)/i,/^(?:REFERENCES\b)/i,/^(?:REGEXP\b)/i,/^(?:REINDEX\b)/i,/^(?:RELATIVE\b)/i,/^(?:REMOVE\b)/i,/^(?:RENAME\b)/i,/^(?:REPEAT\b)/i,/^(?:REPLACE\b)/i,/^(?:REQUIRE\b)/i,/^(?:RESTORE\b)/i,/^(?:RETURN\b)/i,/^(?:RETURNS\b)/i,/^(?:RIGHT\b)/i,/^(?:ROLLBACK\b)/i,/^(?:ROLLUP\b)/i,/^(?:ROW\b)/i,/^(?:ROWS\b)/i,/^(?:SCHEMA(S)?)/i,/^(?:SEARCH\b)/i,/^(?:SEMI\b)/i,/^(?:SET\b)/i,/^(?:SETS\b)/i,/^(?:SHOW\b)/i,/^(?:SOME\b)/i,/^(?:SOURCE\b)/i,/^(?:STRATEGY\b)/i,/^(?:STORE\b)/i,/^(?:SUM\b)/i,/^(?:TABLE\b)/i,/^(?:TABLES\b)/i,/^(?:TARGET\b)/i,/^(?:TEMP\b)/i,/^(?:TEMPORARY\b)/i,/^(?:TEXTSTRING\b)/i,/^(?:THEN\b)/i,/^(?:TIMEOUT\b)/i,/^(?:TO\b)/i,/^(?:TOP\b)/i,/^(?:TRAN\b)/i,/^(?:TRANSACTION\b)/i,/^(?:TRIGGER\b)/i,/^(?:TRUE\b)/i,/^(?:TRUNCATE\b)/i,/^(?:UNION\b)/i,/^(?:UNIQUE\b)/i,/^(?:UNPIVOT\b)/i,/^(?:UPDATE\b)/i,/^(?:USE\b)/i,/^(?:USING\b)/i,/^(?:VALUE\b)/i,/^(?:VALUES\b)/i,/^(?:VERTEX\b)/i,/^(?:VIEW\b)/i,/^(?:WHEN\b)/i,/^(?:WHERE\b)/i,/^(?:WHILE\b)/i,/^(?:WITH\b)/i,/^(?:WORK\b)/i,/^(?:(\d*[.])?\d+[eE]\d+)/i,/^(?:(\d*[.])?\d+)/i,/^(?:->)/i,/^(?:#)/i,/^(?:\+)/i,/^(?:-)/i,/^(?:\*)/i,/^(?:\/)/i,/^(?:%)/i,/^(?:!===)/i,/^(?:===)/i,/^(?:!==)/i,/^(?:==)/i,/^(?:>=)/i,/^(?:&)/i,/^(?:\|)/i,/^(?:<<)/i,/^(?:>>)/i,/^(?:>)/i,/^(?:<=)/i,/^(?:<>)/i,/^(?:<)/i,/^(?:=)/i,/^(?:!=)/i,/^(?:\()/i,/^(?:\))/i,/^(?:@)/i,/^(?:\{)/i,/^(?:\})/i,/^(?:\])/i,/^(?::-)/i,/^(?:\?-)/i,/^(?:\.\.)/i,/^(?:\.)/i,/^(?:,)/i,/^(?:::)/i,/^(?::)/i,/^(?:;)/i,/^(?:\$)/i,/^(?:\?)/i,/^(?:!)/i,/^(?:\^)/i,/^(?:~)/i,/^(?:[0-9]*[a-zA-Z_]+[a-zA-Z_0-9]*)/i,/^(?:$)/i,/^(?:.)/i],conditions:{INITIAL:{rules:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275],inclusive:!0}}};function pi(){this.yy={};}return e.lexer=gr,new((pi.prototype=e).Parser=pi)}();void 0!==H&&"undefined"!='object'&&(exports.parser=t,exports.Parser=t.Parser,exports.parse=function(){return t.parse.apply(t,arguments)},exports.main=function(e){e[1]||(console.log("Usage: "+e[0]+" FILE"),process.exit(1));e=H().readFileSync(H().normalize(e[1]),"utf8");return exports.parser.parse(e)},H.main===module&&exports.main(process.argv.slice(1))),bi.prettyflag=!1,bi.pretty=function(e,t){var n=bi.prettyflag;bi.prettyflag=!t;e=bi.parse(e).toString();return bi.prettyflag=n,e};var c=bi.utils={};function l(e){return "(y="+e+",y===y?y:undefined)"}function r(e,t){return "(y="+e+',typeof y=="undefined"?undefined:'+t+")"}function f(){return !0}function e(){}function i(e){return e=e[0]===String.fromCharCode(65279)?e.substr(1):e}var h=c.escapeq=function(e){return (""+e).replace(/["'\\\n\r\u2028\u2029]/g,function(e){switch(e){case'"':case"'":case"\\":return "\\"+e;case"\n":return "\\n";case"\r":return "\\r";case"\u2028":return "\\u2028";case"\u2029":return "\\u2029"}})},d=c.undoubleq=function(e){return e.replace(/(\')/g,"''")},Ei=c.doubleq=function(e){return e.replace(/(\'\')/g,"\\'")};c.doubleqq=function(e){return e.replace(/\'/g,"'")};c.global="undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof commonjsGlobal?commonjsGlobal:Function("return this")();c.isNativeFunction=function(e){return "function"==typeof e&&!!~e.toString().indexOf("[native code]")};c.isWebWorker=function(){try{var e=c.global.importScripts;return c.isNativeFunction(e)}catch(e){return !1}}(),c.isNode=function(){try{return c.isNativeFunction(c.global.process.reallyExit)}catch(e){return !1}}(),c.isBrowser=function(){try{return c.isNativeFunction(c.global.location.reload)}catch(e){return !1}}(),c.isBrowserify=c.isBrowser&&"undefined"!=typeof process&&process.browser,c.isRequireJS=c.isBrowser&&"function"==typeof H.specified,c.isMeteor="undefined"!=typeof Meteor&&Meteor.release,c.isMeteorClient=c.isMeteorClient=c.isMeteor&&Meteor.isClient,c.isMeteorServer=c.isMeteor&&Meteor.isServer,c.isCordova="object"==typeof cordova,c.isReactNative=!1,c.hasIndexedDB=!!c.global.indexedDB,c.isArray=function(e){return "[object Array]"===Object.prototype.toString.call(e)};var o=c.loadFile=function(t,e,n,r){var s,a;c.isNode||c.isMeteorServer||(c.isCordova?c.global.requestFileSystem(LocalFileSystem.PERSISTENT,0,function(e){e.root.getFile(t,{create:!1},function(e){e.file(function(e){var t=new FileReader;t.onloadend=function(e){n(i(this.result));},t.readAsText(e);});});}):"string"==typeof t?"#"===t.substr(0,1)&&"undefined"!=typeof document?(a=document.querySelector(t).textContent,n(a)):((s=new XMLHttpRequest).onreadystatechange=function(){if(4===s.readyState)if(200===s.status)n&&n(i(s.responseText));else if(r)return r(s)},s.open("GET",t,e),s.responseType="text",s.send()):t instanceof Event&&(a=t.target.files,e=new FileReader,a[0].name,e.onload=function(e){e=e.target.result;n(i(e));},e.readAsText(a[0])));};c.loadBinaryFile=function(e,t,r,n){var s,a;c.isNode||c.isMeteorServer||("string"==typeof e?((s=new XMLHttpRequest).open("GET",e,t),s.responseType="arraybuffer",s.onload=function(){for(var e=new Uint8Array(s.response),t=[],n=0;n<e.length;++n)t[n]=String.fromCharCode(e[n]);r(t.join(""));},s.send()):e instanceof Event?(a=e.target.files,t=new FileReader,a[0].name,t.onload=function(e){e=e.target.result;r(e);},t.readAsArrayBuffer(a[0])):e instanceof Blob&&r(e));},c.removeFile=function(e,t){if(!c.isNode)throw new Error("You can remove files only in Node.js and Apache Cordova")},c.deleteFile=function(e,t){};c.autoExtFilename=function(e,t,n){return n=n||{},"string"!=typeof e||e.match(/^[A-z]+:\/\/|\n|\..{2,4}$/)||0===n.autoExt||!1===n.autoExt?e:e+"."+t};c.fileExists=function(e,t){if(!c.isNode)throw new Error("You can use exists() only in Node.js or Apach Cordova")},c.saveFile=function(e,t,n,r){var s,a,i=1;return void 0===e?(i=t,n&&(i=n(i))):c.isNode||(9===p()?(s=(s=(s=t.replace(/\r\n/g,"&#A;&#D;")).replace(/\n/g,"&#D;")).replace(/\t/g,"&#9;"),(a=c.global.open("about:blank","_blank")).document.write(s),a.document.close(),a.document.execCommand("SaveAs",!1,e),a.close()):(a={disableAutoBom:!1},bi.utils.extend(a,r),t=new Blob([t],{type:"text/plain;charset=utf-8"}),ne(t,e,a.disableAutoBom),n&&(i=n(i)))),i};function p(){var e=navigator.userAgent.toLowerCase();return -1!==e.indexOf("msie")&&parseInt(e.split("msie")[1])}var b=c.hash=function(e){for(var t=2166136261,n=e.length;n;)t^=e.charCodeAt(--n),t+=(t<<1)+(t<<4)+(t<<7)+(t<<8)+(t<<24);return t},u=c.arrayUnion=function(e,t){var n=t.slice(0);return e.forEach(function(e){n.indexOf(e)<0&&n.push(e);}),n},E=c.arrayDiff=function(e,t){return e.filter(function(e){return t.indexOf(e)<0})},g=c.arrayIntersect=function(e,r){var s=[];return e.forEach(function(t){var n=!1;r.forEach(function(e){n=n||t===e;}),n&&s.push(t);}),s},S=c.arrayUnionDeep=function(e,t){var r=t.slice(0);return e.forEach(function(t){var n=!1;r.forEach(function(e){n=n||A(t,e);}),n||r.push(t);}),r},T=c.arrayExceptDeep=function(e,r){var s=[];return e.forEach(function(t){var n=!1;r.forEach(function(e){n=n||A(t,e);}),n||s.push(t);}),s},v=c.arrayIntersectDeep=function(e,r){var s=[];return e.forEach(function(t){var n=!1;r.forEach(function(e){n=n||A(t,e,!0);}),n&&s.push(t);}),s},m=c.cloneDeep=function e(t){if(null===t||"object"!=typeof t)return t;if(t instanceof Date)return new Date(t);if(t instanceof String)return t.toString();if(t instanceof Number)return +t;var n,r=t.constructor();for(n in t)t.hasOwnProperty(n)&&(r[n]=e(t[n]));return r},A=c.deepEqual=function(e,t){if(e===t)return !0;if("object"!=typeof e||null===e||"object"!=typeof t||null===t)return !1;if(Object.keys(e).length!==Object.keys(t).length)return !1;for(var n in e)if(!A(e[n],t[n]))return !1;return !0},x=c.distinctArray=function(t){for(var e={},n=0,r=t.length;n<r;n++){var s="object"==typeof t[n]?Object.keys(t[n]).sort().map(function(e){return e+"`"+t[n][e]}).join("`"):t[n];e[s]=t[n];}var a,i=[];for(a in e)i.push(e[a]);return i},y=c.extend=function(e,t){for(var n in e=e||{},t)t.hasOwnProperty(n)&&(e[n]=t[n]);return e},s=c.flatArray=function(t){if(!t||0===t.length)return [];if("object"==typeof t&&t instanceof bi.Recordset)return t.data.map(function(e){return e[t.columns[0].columnid]});var n=Object.keys(t[0])[0];return void 0===n?[]:t.map(function(e){return e[n]})};c.arrayOfArrays=function(e){return e.map(function(e){var t,n=[];for(t in e)n.push(e[t]);return n})};Array.isArray||(Array.isArray=function(e){return "[object Array]"===Object.prototype.toString.call(e)});c.xlsnc=function(e){var t=String.fromCharCode(65+e%26);return 26<=e&&(e=(e/26|0)-1,t=String.fromCharCode(65+e%26)+t,26<e&&(e=(e/26|0)-1,t=String.fromCharCode(65+e%26)+t)),t},c.xlscn=function(e){var t=e.charCodeAt(0)-65;return 1<e.length&&(t=26*(t+1)+e.charCodeAt(1)-65,2<e.length&&(t=26*(t+1)+e.charCodeAt(2)-65)),t},c.domEmptyChildren=function(e){for(var t=e.childNodes.length;t--;)e.removeChild(e.lastChild);},c.like=function(e,t,n){n=n||"";for(var r=0,s="^";r<e.length;){var a=e[r],i="";r<e.length-1&&(i=e[r+1]),a===n?(s+="\\"+i,r++):"["===a&&"^"===i?(s+="[^",r++):"["===a||"]"===a?s+=a:"%"===a?s+=".*":"_"===a?s+=".":-1<"/.*+?|(){}".indexOf(a)?s+="\\"+a:s+=a,r++;}return s+="$",-1<(""+(t||"")).toUpperCase().search(RegExp(s.toUpperCase()))};c.glob=function(e,t){for(var n=0,r="^";n<t.length;){var s=t[n],a="";n<t.length-1&&(a=t[n+1]),"["===s&&"^"===a?(r+="[^",n++):"["===s||"]"===s?r+=s:"*"===s?r+=".*":"?"===s?r+=".":-1<"/.*+?|(){}".indexOf(s)?r+="\\"+s:r+=s,n++;}return r+="$",-1<(""+(e||"")).toUpperCase().search(RegExp(r.toUpperCase()))},c.findAlaSQLPath=function(){if(c.isWebWorker)return "";if(c.isMeteorClient)return "/packages/dist/";if(c.isMeteorServer)return "assets/packages/dist/";if(c.isNode)return "";if(c.isBrowser)for(var e=document.getElementsByTagName("script"),t=0;t<e.length;t++){if("alasql-worker.js"===e[t].src.substr(-16).toLowerCase())return e[t].src.substr(0,e[t].src.length-16);if("alasql-worker.min.js"===e[t].src.substr(-20).toLowerCase())return e[t].src.substr(0,e[t].src.length-20);if("alasql.js"===e[t].src.substr(-9).toLowerCase())return e[t].src.substr(0,e[t].src.length-9);if("alasql.min.js"===e[t].src.substr(-13).toLowerCase())return e[t].src.substr(0,e[t].src.length-13)}return ""};function N(){var e=bi.private.externalXlsxLib;if(e)return e;if(null===(e=!(c.isNode||c.isBrowserify||c.isMeteorServer)?c.global.XLSX||null:e))throw new Error("Please include the xlsx.js library");return e}var a=JSON.stringify;bi.path=bi.utils.findAlaSQLPath(),bi.utils.uncomment=function(e){for(var t,n=!1,r=!1,s=!1,a=0,i=(e=("__"+e+"__").split("")).length;a<i;a++){var o="\\"!==e[a-1]||"\\"===e[a-2];n?e[a]===t&&o&&(n=!1):r?"*"===e[a]&&"/"===e[a+1]?(e[a]=e[a+1]="",r=!1,a++):e[a]="":s?("\n"!==e[a+1]&&"\r"!==e[a+1]||(s=!1),e[a]=""):'"'===e[a]||"'"===e[a]?(n=!0,t=e[a]):"["===e[a]&&"@"!==e[a-1]?(n=!0,t="]"):"/"===e[a]&&"*"===e[a+1]&&(r=!(e[a]=""));}return e=e.join("").slice(2,-2)},bi.parser=t,bi.parser.parseError=function(e,t){throw new Error("Have you used a reserved keyword without `escaping` it?\n"+e)},bi.parse=function(e){return t.parse(bi.utils.uncomment(e))},bi.engines={},bi.databases={},bi.databasenum=0,bi.options={},bi.options.errorlog=!1,bi.options.valueof=!1,bi.options.dropifnotexists=!1,bi.options.datetimeformat="sql",bi.options.casesensitive=!0,bi.options.logtarget="output",bi.options.logprompt=!0,bi.options.progress=!1,bi.options.modifier=void 0,bi.options.columnlookup=10,bi.options.autovertex=!0,bi.options.usedbo=!0,bi.options.autocommit=!0,bi.options.cache=!0,bi.options.tsql=!0,bi.options.mysql=!0,bi.options.postgres=!0,bi.options.oracle=!0,bi.options.sqlite=!0,bi.options.orientdb=!0,bi.options.nocount=!1,bi.options.nan=!1,bi.options.joinstar="overwrite",bi.vars={},bi.declares={},bi.prompthistory=[],bi.plugins={},bi.from={},bi.into={},bi.fn={},bi.aggr={},bi.busy=0,bi.MAXSQLCACHESIZE=1e4,bi.DEFAULTDATABASEID="alasql",bi.lastid=0,bi.buffer={},bi.private={externalXlsxLib:null},bi.setXLSX=function(e){bi.private.externalXlsxLib=e;},bi.use=function(e){if(e=e||bi.DEFAULTDATABASEID,bi.useid!==e){if(void 0===bi.databases[e])throw Error("Database does not exist: "+e);bi.useid=e;e=bi.databases[bi.useid];bi.tables=e.tables,e.resetSqlCache(),bi.options.usedbo&&(bi.databases.dbo=e);}},bi.autoval=function(e,t,n,r){r=r?bi.databases[r]:bi.databases[bi.useid];if(!r.tables[e])throw new Error("Tablename not found: "+e);if(!r.tables[e].identities[t])throw new Error("Colname not found: "+t);return n?r.tables[e].identities[t].value||null:r.tables[e].identities[t].value-r.tables[e].identities[t].step||null},bi.exec=function(e,t,n,r){if("function"==typeof t&&(r=n,n=t,t={}),delete bi.error,t=t||{},!bi.options.errorlog)return bi.dexec(bi.useid,e,t,n,r);try{return bi.dexec(bi.useid,e,t,n,r)}catch(e){bi.error=e,n&&n(null,bi.error);}},bi.dexec=function(e,t,n,r,s){var a=bi.databases[e];if(bi.options.cache){var i=b(t);if((o=a.sqlCache[i])&&a.dbversion===o.dbversion)return o(n,r)}var o,u=bi.parse(t);if(u.statements)return 0===u.statements.length?0:1===u.statements.length?u.statements[0].compile?(o=u.statements[0].compile(e,n))?(o.sql=t,o.dbversion=a.dbversion,bi.options.cache&&(a.sqlCacheSize>bi.MAXSQLCACHESIZE&&a.resetSqlCache(),a.sqlCacheSize++,a.sqlCache[i]=o),bi.res=o(n,r,s)):void 0:(bi.precompile(u.statements[0],bi.useid,n),bi.res=u.statements[0].execute(e,n,r,s)):r?void bi.adrun(e,u,n,r,s):bi.drun(e,u,n,r,s)},bi.drun=function(e,t,n,r,s){var a=bi.useid;a!==e&&bi.use(e);for(var i,o=[],u=0,c=t.statements.length;u<c;u++)t.statements[u]&&(t.statements[u].compile?(i=t.statements[u].compile(bi.useid),o.push(bi.res=i(n,null,s))):(bi.precompile(t.statements[u],bi.useid,n),o.push(bi.res=t.statements[u].execute(bi.useid,n))));return a!==e&&bi.use(a),r&&r(o),bi.res=o},bi.adrun=function(n,r,s,a,i){var o=0,u=r.statements.length;!1!==bi.options.progress&&bi.options.progress(u,o++);var c=bi.useid;c!==n&&bi.use(n);var l=[];!function e(t){void 0!==t&&l.push(t);t=r.statements.shift();t?(t.compile?t.compile(bi.useid)(s,e,i):(bi.precompile(r.statements[0],bi.useid,s),t.execute(bi.useid,s,e)),!1!==bi.options.progress&&bi.options.progress(u,o++)):(c!==n&&bi.use(c),a(l));}();},bi.compile=function(e,t){t=t||bi.useid;e=bi.parse(e);if(1!==e.statements.length)throw new Error("Cannot compile, because number of statements in SQL is not equal to 1");var s=e.statements[0].compile(t);return s.promise=function(e){return new Promise(function(n,r){s(e,function(e,t){t?r(t):n(e);});})},s},c.global.Promise||c.isNode||function(){function c(e){return "function"==typeof e}function t(){return function(){setTimeout(n,1);}}function n(){for(var e=0;e<C;e+=2)(0, k[e])(k[e+1]),k[e]=void 0,k[e+1]=void 0;C=0;}function i(){}function o(e){try{return e.then}catch(e){return P.error=e,P}}function a(e,r,s){R(function(t){var n=!1,e=function(e,t,n,r){try{e.call(t,n,r);}catch(e){return e}}(s,r,function(e){n||(n=!0,(r!==e?l:h)(t,e));},function(e){n||(n=!0,d(t,e));},t._label);!n&&e&&(n=!0,d(t,e));},e);}function u(e,t,n){var r,s;t.constructor===e.constructor&&n===L&&constructor.resolve===$?(r=e,(s=t)._state===_?h(r,s._result):s._state===F?d(r,s._result):f(s,void 0,function(e){l(r,e);},function(e){d(r,e);})):n===P?d(e,P.error):void 0!==n&&c(n)?a(e,t,n):h(e,t);}function l(e,t){var n;e===t?d(e,new TypeError("You cannot resolve a promise with itself")):"function"==typeof(n=t)||"object"==typeof n&&null!==n?u(e,t,o(t)):h(e,t);}function r(e){e._onerror&&e._onerror(e._result),p(e);}function h(e,t){e._state===U&&(e._result=t,e._state=_,0!==e._subscribers.length&&R(p,e));}function d(e,t){e._state===U&&(e._state=F,e._result=t,R(r,e));}function f(e,t,n,r){var s=e._subscribers,a=s.length;e._onerror=null,s[a]=t,s[a+_]=n,s[a+F]=r,0===a&&e._state&&R(p,e);}function p(e){var t=e._subscribers,n=e._state;if(0!==t.length){for(var r,s,a=e._result,i=0;i<t.length;i+=3)r=t[i],s=t[i+n],r?b(n,r,s,a):s(a);e._subscribers.length=0;}}function e(){this.error=null;}function b(e,t,n,r){var s,a,i,o,u=c(n);if(u){if((s=function(e,t){try{return e(t)}catch(e){return q.error=e,q}}(n,r))===q?(o=!0,a=s.error,s=null):i=!0,t===s)return d(t,new TypeError("A promises callback cannot return that same promise.")),0}else s=r,i=!0;t._state!==U||(u&&i?l(t,s):o?d(t,a):e===_?h(t,s):e===F&&d(t,s));}function E(e){e[M]=G++,e._state=void 0,e._result=void 0,e._subscribers=[];}function s(e){this[M]=G++,this._result=this._state=void 0,this._subscribers=[],i!==e&&("function"!=typeof e&&function(){throw new TypeError("You must pass a resolver function as the first argument to the promise constructor")}(),this instanceof s?function(t,e){try{e(function(e){l(t,e);},function(e){d(t,e);});}catch(e){d(t,e);}}(this,e):function(){throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.")}());}function g(e,t){this._instanceConstructor=e,this.promise=new e(i),this.promise[M]||E(this.promise),Array.isArray(t)?(this._input=t,this.length=t.length,this._remaining=t.length,this._result=new Array(this.length),0===this.length?h(this.promise,this._result):(this.length=this.length||0,this._enumerate(),0===this._remaining&&h(this.promise,this._result))):d(this.promise,new Error("Array Methods must be provided an Array"));}var m,S,T,v,A,y,N=Array.isArray||function(e){return "[object Array]"===Object.prototype.toString.call(e)},C=0,R=function(e,t){k[C]=e,k[C+1]=t,2===(C+=2)&&(S?S(n):D());},O="undefined"!=typeof window?window:void 0,w=O||{},I=w.MutationObserver||w.WebKitMutationObserver,x="undefined"==typeof self&&"undefined"!=typeof process&&"[object process]"==={}.toString.call(process),w="undefined"!=typeof Uint8ClampedArray&&"undefined"!=typeof importScripts&&"undefined"!=typeof MessageChannel,k=new Array(1e3),D=x?function(){process.nextTick(n);}:I?(v=0,A=new I(n),y=document.createTextNode(""),A.observe(y,{characterData:!0}),function(){y.data=v=++v%2;}):w?((T=new MessageChannel).port1.onmessage=n,function(){T.port2.postMessage(0);}):(void 0===O?function(){try{var e=H();return m=e.runOnLoop||e.runOnContext,function(){m(n);}}catch(e){return t()}}:t)(),L=function(e,t){var n=this,r=new this.constructor(i);void 0===r[M]&&E(r);var s,a=n._state;return a?(s=arguments[a-1],R(function(){b(a,r,s,n._result);})):f(n,r,e,t),r},$=function(e){if(e&&"object"==typeof e&&e.constructor===this)return e;var t=new this(i);return l(t,e),t},M=Math.random().toString(36).substring(16),U=void 0,_=1,F=2,P=new e,q=new e,G=0,w=function(s){var a=this;return new a(N(s)?function(e,t){for(var n=s.length,r=0;r<n;r++)a.resolve(s[r]).then(e,t);}:function(e,t){t(new TypeError("You must pass an array to race."));})},O=function(e){var t=new this(i);return d(t,e),t},V=s;s.all=function(e){return new B(this,e).promise},s.race=w,s.resolve=$,s.reject=O,s._setScheduler=function(e){S=e;},s._setAsap=function(e){R=e;},s._asap=R,s.prototype={constructor:s,then:L,catch:function(e){return this.then(null,e)}};var B=g;g.prototype._enumerate=function(){for(var e=this.length,t=this._input,n=0;this._state===U&&n<e;n++)this._eachEntry(t[n],n);},g.prototype._eachEntry=function(t,e){var n,r,s=this._instanceConstructor,a=s.resolve;a===$?(n=o(t))===L&&t._state!==U?this._settledAt(t._state,e,t._result):"function"!=typeof n?(this._remaining--,this._result[e]=t):s===V?(u(r=new s(i),t,n),this._willSettleAt(r,e)):this._willSettleAt(new s(function(e){e(t);}),e):this._willSettleAt(a(t),e);},g.prototype._settledAt=function(e,t,n){var r=this.promise;r._state===U&&(this._remaining--,e===F?d(r,n):this._result[t]=n),0===this._remaining&&h(r,this._result);},g.prototype._willSettleAt=function(e,t){var n=this;f(e,void 0,function(e){n._settledAt(_,t,e);},function(e){n._settledAt(F,t,e);});};var O=function(){var e;if("undefined"!=typeof commonjsGlobal)e=commonjsGlobal;else if("undefined"!=typeof self)e=self;else try{e=Function("return this")();}catch(e){throw new Error("polyfill failed because global object is unavailable in this environment")}var t=e.Promise;t&&"[object Promise]"===Object.prototype.toString.call(t.resolve())&&!t.cast||(e.Promise=V);},j={Promise:V,polyfill:O};module.exports?module.exports=j:void 0!==this&&(this.ES6Promise=j),O();}.call(this);function C(e,t,s,a){return new c.global.Promise(function(n,r){bi(e,t,function(e,t){t?r(t):(s&&a&&!1!==bi.options.progress&&bi.options.progress(s,a),n(e));});})}bi.promise=function(e,t){if("undefined"==typeof Promise)throw new Error("Please include a Promise/A+ library");if("string"==typeof e)return C(e,t);if(!c.isArray(e)||e.length<1||void 0!==t)throw new Error("Error in .promise parameters");return function(e){if(!(e.length<1)){for(var t,n,r=[],s=0;s<e.length;s++){if("string"==typeof(n=e[s])&&(n=[n]),!c.isArray(n)||n.length<1||2<n.length)throw new Error("Error in .promise parameter");t=n[0],n=n[1]||void 0,r.push(C(t,n,s,e.length));}return c.global.Promise.all(r)}}(e)};var n=bi.Database=function(e){var t=this;if(t===bi)if(e){if(t=bi.databases[e],!(bi.databases[e]=t))throw new Error('Database "'+e+'" not found')}else t=bi.databases.alasql,bi.options.tsql&&(bi.databases.tempdb=bi.databases.alasql);return e=e||"db"+bi.databasenum++,t.databaseid=e,(bi.databases[e]=t).dbversion=0,t.tables={},t.views={},t.triggers={},t.indices={},t.objects={},t.counter=0,t.resetSqlCache(),t};n.prototype.resetSqlCache=function(){this.sqlCache={},this.sqlCacheSize=0;},n.prototype.exec=function(e,t,n){return bi.dexec(this.databaseid,e,t,n)},n.prototype.autoval=function(e,t,n){return bi.autoval(e,t,n,this.databaseid)},n.prototype.transaction=function(e){return e(new bi.Transaction(this.databaseid))};var R=bi.Transaction=function(e){return this.transactionid=Date.now(),this.databaseid=e,this.commited=!1,this.dbversion=bi.databases[e].dbversion,this.bank=JSON.stringify(bi.databases[e]),this};R.prototype.commit=function(){this.commited=!0,bi.databases[this.databaseid].dbversion=Date.now(),delete this.bank;},R.prototype.rollback=function(){if(this.commited)throw new Error("Transaction already commited");bi.databases[this.databaseid]=JSON.parse(this.bank),delete this.bank;},R.prototype.exec=function(e,t,n){return bi.dexec(this.databaseid,e,t,n)},R.prototype.executeSQL=R.prototype.exec;var O=bi.Table=function(e){this.data=[],this.columns=[],this.xcolumns={},this.inddefs={},this.indices={},this.uniqs={},this.uniqdefs={},this.identities={},this.checks=[],this.checkfns=[],this.beforeinsert={},this.afterinsert={},this.insteadofinsert={},this.beforedelete={},this.afterdelete={},this.insteadofdelete={},this.beforeupdate={},this.afterupdate={},this.insteadofupdate={},y(this,e);};O.prototype.indexColumns=function(){var t=this;t.xcolumns={},t.columns.forEach(function(e){t.xcolumns[e.columnid]=e;});};bi.View=function(e){this.columns=[],this.xcolumns={},this.query=[],y(this,e);};var w=bi.Query=function(e){this.alasql=bi,this.columns=[],this.xcolumns={},this.selectGroup=[],this.groupColumns={},y(this,e);},k=(bi.Recordset=function(e){y(this,e);},t.yy=bi.yy={});k.extend=y,k.casesensitive=bi.options.casesensitive;var I=k.Base=function(e){return k.extend(this,e)};function D(e,O,t){var w,n,r,s,I={},a=m(this.selectors);return void 0!==a&&0<a.length&&(a&&a[0]&&"PROP"===a[0].srchid&&a[0].args&&a[0].args[0]&&("XML"===a[0].args[0].toUpperCase()?(I.mode="XML",a.shift()):"HTML"===a[0].args[0].toUpperCase()?(I.mode="HTML",a.shift()):"JSON"===a[0].args[0].toUpperCase()&&(I.mode="JSON",a.shift())),0<a.length&&"VALUE"===a[0].srchid&&(I.value=!0,a.shift())),this.from instanceof k.Column?(n=this.from.databaseid||e,w=bi.databases[n].tables[this.from.columnid].data):this.from instanceof k.FuncValue&&bi.from[this.from.funcid.toUpperCase()]?(n=this.from.args.map(function(e){e=e.toJS();return new Function("params,alasql","var y;return "+e).bind(this)(O,bi)}),w=bi.from[this.from.funcid.toUpperCase()].apply(this,n)):void 0===this.from?w=bi.databases[e].objects:(e=new Function("params,alasql","var y;return "+this.from.toJS()),w=e(O,bi),"object"==typeof Mongo&&"object"!=typeof Mongo.Collection&&w instanceof Mongo.Collection&&(w=w.find().fetch())),a=void 0!==a&&0<a.length?function t(n,r,s){var a=n[r];if(a.selid){if("PATH"===a.selid){for(var i=[{node:s,stack:[]}],e={},o=bi.databases[bi.useid].objects;0<i.length;){var u=i.shift(),c=u.node,l=u.stack;if(0<(C=t(a.args,0,c)).length){if(r+1+1>n.length)return l;var h=[];return l&&0<l.length&&l.forEach(function(e){h=h.concat(t(n,r+1,e));}),h}void 0===e[c.$id]&&(e[c.$id]=!0,c.$out&&0<c.$out.length&&c.$out.forEach(function(e){var t=o[e],e=l.concat(t);e.push(o[t.$out[0]]),i.push({node:o[t.$out[0]],stack:e});}));}return []}if("NOT"===a.selid)return 0<(f=t(a.args,0,s)).length?[]:r+1+1>n.length?[s]:t(n,r+1,s);if("DISTINCT"===a.selid){if(0===(f=void 0===a.args||0===a.args.length?x(s):t(a.args,0,s)).length)return [];var d=x(f);return r+1+1>n.length?d:t(n,r+1,d)}if("AND"===a.selid)return d=!0,a.args.forEach(function(e){d=d&&0<t(e,0,s).length;}),d?r+1+1>n.length?[s]:t(n,r+1,s):[];if("OR"===a.selid)return d=!1,a.args.forEach(function(e){d=d||0<t(e,0,s).length;}),d?r+1+1>n.length?[s]:t(n,r+1,s):[];if("ALL"===a.selid)return 0===(f=t(a.args[0],0,s)).length?[]:r+1+1>n.length?f:t(n,r+1,f);if("ANY"===a.selid)return 0===(f=t(a.args[0],0,s)).length?[]:r+1+1>n.length?[f[0]]:t(n,r+1,[f[0]]);if("UNIONALL"===a.selid){var f=[];return a.args.forEach(function(e){f=f.concat(t(e,0,s));}),0===f.length?[]:r+1+1>n.length?f:t(n,r+1,f)}if("UNION"===a.selid){var f=[];return a.args.forEach(function(e){f=f.concat(t(e,0,s));}),0===(f=x(f)).length?[]:r+1+1>n.length?f:t(n,r+1,f)}if("IF"===a.selid)return 0===(f=t(a.args,0,s)).length?[]:r+1+1>n.length?[s]:t(n,r+1,s);if("REPEAT"===a.selid){var p,b=a.args[0].value,E=a.args[1]?a.args[1].value:b;a.args[2]&&(p=a.args[2].variable);var g=[];if(0===b&&(g=r+1+1>n.length?[s]:(p&&(bi.vars[p]=0),g.concat(t(n,r+1,s)))),0<E)for(var m=[{value:s,lvl:1}],S=0;0<m.length;){var T,f=m[0];if(m.shift(),f.lvl<=E&&(p&&(bi.vars[p]=f.lvl),(T=t(a.sels,0,f.value)).forEach(function(e){m.push({value:e,lvl:f.lvl+1});}),f.lvl>=b&&(r+1+1>n.length?g=g.concat(T):T.forEach(function(e){g=g.concat(t(n,r+1,e));}))),1e5<++S)throw new Error("Security brake. Number of iterations = "+S)}return g}if("OF"===a.selid){if(r+1+1>n.length)return [s];var v=[];return Object.keys(s).forEach(function(e){bi.vars[a.args[0].variable]=e,v=v.concat(t(n,r+1,s[e]));}),v}if("TO"===a.selid){var A=bi.vars[a.args[0]],y=[];return ((y=void 0!==A?A.slice(0):[]).push(s),r+1+1>n.length)?[s]:(bi.vars[a.args[0]]=y,v=t(n,r+1,s),bi.vars[a.args[0]]=A,v)}if("ARRAY"===a.selid)return 0<(f=t(a.args,0,s)).length?(N=f,r+1+1>n.length?[N]:t(n,r+1,N)):[];if("SUM"===a.selid){if(!(0<(f=t(a.args,0,s)).length))return [];var N=f.reduce(function(e,t){return e+t},0);return r+1+1>n.length?[N]:t(n,r+1,N)}if("AVG"===a.selid)return 0<(f=t(a.args,0,s)).length?(N=f.reduce(function(e,t){return e+t},0)/f.length,r+1+1>n.length?[N]:t(n,r+1,N)):[];if("COUNT"===a.selid)return 0<(f=t(a.args,0,s)).length?(N=f.length,r+1+1>n.length?[N]:t(n,r+1,N)):[];if("FIRST"===a.selid)return 0<(f=t(a.args,0,s)).length?(N=f[0],r+1+1>n.length?[N]:t(n,r+1,N)):[];if("LAST"===a.selid)return 0<(f=t(a.args,0,s)).length?(N=f[f.length-1],r+1+1>n.length?[N]:t(n,r+1,N)):[];if("MIN"===a.selid)return 0===(f=t(a.args,0,s)).length?[]:(N=f.reduce(function(e,t){return Math.min(e,t)},1/0),r+1+1>n.length?[N]:t(n,r+1,N));if("MAX"===a.selid)return 0===(f=t(a.args,0,s)).length?[]:(N=f.reduce(function(e,t){return Math.max(e,t)},-1/0),r+1+1>n.length?[N]:t(n,r+1,N));if("PLUS"===a.selid){var g=[],m=t(a.args,0,s).slice();for(r+1+1>n.length?g=g.concat(m):m.forEach(function(e){g=g.concat(t(n,r+1,e));}),S=0;0<m.length;)if(f=m.shift(),f=t(a.args,0,f),m=m.concat(f),r+1+1>n.length?g=g.concat(f):f.forEach(function(e){e=t(n,r+1,e),g=g.concat(e);}),1e5<++S)throw new Error("Security brake. Number of iterations = "+S);return g}if("STAR"===a.selid){for(g=[],g=t(n,r+1,s),m=t(a.args,0,s).slice(),r+1+1>n.length?g=g.concat(m):m.forEach(function(e){g=g.concat(t(n,r+1,e));}),S=0;0<m.length;)if(f=m[0],m.shift(),f=t(a.args,0,f),m=m.concat(f),r+1+1<=n.length&&f.forEach(function(e){g=g.concat(t(n,r+1,e));}),1e5<++S)throw new Error("Loop brake. Number of iterations = "+S);return g}if("QUESTION"===a.selid)return g=(g=[]).concat(t(n,r+1,s)),f=t(a.args,0,s),r+1+1<=n.length&&f.forEach(function(e){g=g.concat(t(n,r+1,e));}),g;if("WITH"!==a.selid){if("ROOT"===a.selid)return r+1+1>n.length?[s]:t(n,r+1,w);throw new Error("Wrong selector "+a.selid)}if(0===(f=t(a.args,0,s)).length)return [];var C={status:1,values:f};}else {if(!a.srchid)throw new Error("Selector not found");C=bi.srch[a.srchid.toUpperCase()](s,a.args,I,O);}d=[];if(1===(C=void 0===C?{status:1,values:[s]}:C).status){var R=C.values;if(r+1+1>n.length)d=R;else for(S=0;S<C.values.length;S++)d=d.concat(t(n,r+1,R[S]));}return d}(a,0,w):w,this.into?(void 0!==this.into.args[0]&&(r=new Function("params,alasql","var y;return "+this.into.args[0].toJS())(O,bi)),void 0!==this.into.args[1]&&(s=new Function("params,alasql","var y;return "+this.into.args[1].toJS())(O,bi)),a=bi.into[this.into.funcid.toUpperCase()](r,s,a,[],t)):(I.value&&0<a.length&&(a=a[0]),t&&(a=t(a))),a}I.prototype.toString=function(){},I.prototype.toType=function(){},I.prototype.toJS=function(){},I.prototype.compile=e,I.prototype.exec=function(){},I.prototype.compile=e,I.prototype.exec=function(){},k.Statements=function(e){return k.extend(this,e)},k.Statements.prototype.toString=function(){return this.statements.map(function(e){return e.toString()}).join("; ")},k.Statements.prototype.compile=function(t){var r=this.statements.map(function(e){return e.compile(t)});return 1===r.length?r[0]:function(t,e){var n=r.map(function(e){return e(t)});return e&&e(n),n}},k.Search=function(e){return k.extend(this,e)},k.Search.prototype.toString=function(){var e="SEARCH ";return this.selectors&&(e+=this.selectors.toString()),this.from&&(e+="FROM "+this.from.toString()),e},k.Search.prototype.toJS=function(e){return "this.queriesfn["+a(this.queriesidx-1)+"](this.params,null,"+a(e)+")"},k.Search.prototype.compile=function(e){var r=e,s=this,a=function(e,t){var n;return D.bind(s)(r,e,function(e){n=U(a.query,e),t&&(n=t(n));}),n};return a.query={},a},bi.srch={},bi.srch.PROP=function(e,t,n){if("XML"!==n.mode)return "object"!=typeof e||null===e||"object"!=typeof t||void 0===e[t[0]]?{status:-1,values:[]}:{status:1,values:[e[t[0]]]};var r=[];return e.children.forEach(function(e){e.name.toUpperCase()===t[0].toUpperCase()&&r.push(e);}),0<r.length?{status:1,values:r}:{status:-1,values:[]}},bi.srch.APROP=function(e,t){return "object"!=typeof e||null===e||"object"!=typeof t||void 0===e[t[0]]?{status:1,values:[void 0]}:{status:1,values:[e[t[0]]]}},bi.srch.EQ=function(e,t,n,r){t=t[0].toJS("x","");return e===new Function("x,alasql,params","return "+t)(e,bi,r)?{status:1,values:[e]}:{status:-1,values:[]}},bi.srch.LIKE=function(e,t,n,r){t=t[0].toJS("x",""),t=new Function("x,alasql,params","return "+t);return e.toUpperCase().match(new RegExp("^"+t(e,bi,r).toUpperCase().replace(/%/g,".*").replace(/\?|_/g,".")+"$"),"g")?{status:1,values:[e]}:{status:-1,values:[]}},bi.srch.ATTR=function(e,t,n){if("XML"===n.mode)return void 0===t?{status:1,values:[e.attributes]}:"object"==typeof e&&"object"==typeof e.attributes&&void 0!==e.attributes[t[0]]?{status:1,values:[e.attributes[t[0]]]}:{status:-1,values:[]};throw new Error("ATTR is not using in usual mode")},bi.srch.CONTENT=function(e,t,n){if("XML"===n.mode)return {status:1,values:[e.content]};throw new Error("ATTR is not using in usual mode")},bi.srch.SHARP=function(e,t){t=bi.databases[bi.useid].objects[t[0]];return void 0!==e&&e===t?{status:1,values:[e]}:{status:-1,values:[]}},bi.srch.PARENT=function(){return console.error("PARENT not implemented",arguments),{status:-1,values:[]}},bi.srch.CHILD=function(t,e,n){return "object"==typeof t?Array.isArray(t)?{status:1,values:t}:"XML"===n.mode?{status:1,values:Object.keys(t.children).map(function(e){return t.children[e]})}:{status:1,values:Object.keys(t).map(function(e){return t[e]})}:{status:1,values:[]}},bi.srch.KEYS=function(e){return "object"==typeof e&&null!==e?{status:1,values:Object.keys(e)}:{status:1,values:[]}},bi.srch.WHERE=function(e,t,n,r){t=t[0].toJS("x","");return new Function("x,alasql,params","return "+t)(e,bi,r)?{status:1,values:[e]}:{status:-1,values:[]}},bi.srch.NAME=function(e,t){return e.name===t[0]?{status:1,values:[e]}:{status:-1,values:[]}},bi.srch.CLASS=function(e,t){return e.$class==t?{status:1,values:[e]}:{status:-1,values:[]}},bi.srch.VERTEX=function(e){return "VERTEX"===e.$node?{status:1,values:[e]}:{status:-1,values:[]}},bi.srch.INSTANCEOF=function(e,t){return e instanceof bi.fn[t[0]]?{status:1,values:[e]}:{status:-1,values:[]}},bi.srch.EDGE=function(e){return "EDGE"===e.$node?{status:1,values:[e]}:{status:-1,values:[]}},bi.srch.EX=function(e,t,n,r){t=t[0].toJS("x","");return {status:1,values:[new Function("x,alasql,params","return "+t)(e,bi,r)]}},bi.srch.RETURN=function(n,e,t,r){var s={};return e&&0<e.length&&e.forEach(function(e){var t=e.toJS("x",""),t=new Function("x,alasql,params","return "+t);void 0===e.as&&(e.as=e.toString()),s[e.as]=t(n,bi,r);}),{status:1,values:[s]}},bi.srch.REF=function(e){return {status:1,values:[bi.databases[bi.useid].objects[e]]}},bi.srch.OUT=function(e){return e.$out&&0<e.$out.length?{status:1,values:e.$out.map(function(e){return bi.databases[bi.useid].objects[e]})}:{status:-1,values:[]}},bi.srch.OUTOUT=function(e){if(e.$out&&0<e.$out.length){var t=[];return e.$out.forEach(function(e){e=bi.databases[bi.useid].objects[e];e&&e.$out&&0<e.$out.length&&e.$out.forEach(function(e){t=t.concat(bi.databases[bi.useid].objects[e]);});}),{status:1,values:t}}return {status:-1,values:[]}},bi.srch.IN=function(e){return e.$in&&0<e.$in.length?{status:1,values:e.$in.map(function(e){return bi.databases[bi.useid].objects[e]})}:{status:-1,values:[]}},bi.srch.ININ=function(e){if(e.$in&&0<e.$in.length){var t=[];return e.$in.forEach(function(e){e=bi.databases[bi.useid].objects[e];e&&e.$in&&0<e.$in.length&&e.$in.forEach(function(e){t=t.concat(bi.databases[bi.useid].objects[e]);});}),{status:1,values:t}}return {status:-1,values:[]}},bi.srch.AS=function(e,t){return {status:1,values:[bi.vars[t[0]]=e]}},bi.srch.AT=function(e,t){return {status:1,values:[bi.vars[t[0]]]}},bi.srch.CLONEDEEP=function(e){return {status:1,values:[m(e)]}},bi.srch.SET=function(e,t,n,r){t=t.map(function(e){return "@"===e.method?"alasql.vars["+a(e.variable)+"]="+e.expression.toJS("x",""):"$"===e.method?"params["+a(e.variable)+"]="+e.expression.toJS("x",""):"x["+a(e.column.columnid)+"]="+e.expression.toJS("x","")}).join(";");return new Function("x,params,alasql",t)(e,r,bi),{status:1,values:[e]}},bi.srch.ROW=function(e,t,n,r){var s="var y;return [";return s+=t.map(function(e){return e.toJS("x","")}).join(","),s+="]",{status:1,values:[new Function("x,params,alasql",s)(e,r,bi)]}},bi.srch.D3=function(e){return "VERTEX"!==e.$node&&"EDGE"===e.$node&&(e.source=e.$in[0],e.target=e.$out[0]),{status:1,values:[e]}};function L(e,t,n){var r;if(0<=t?((r=n.sources[t]).data=e,"function"==typeof r.data&&(r.getfn=r.data,r.dontcache=r.getfn.dontcache,"OUTER"!=r.joinmode&&"RIGHT"!=r.joinmode&&"ANTI"!=r.joinmode||(r.dontcache=!1),r.data={})):n.queriesdata[-t-1]=s(e),n.sourceslen--,!(0<n.sourceslen))return $(n)}function $(e){var t=e.scope;M(e),e.data=[],e.xgroups={},e.groups=[];var n,r,s,a;if(!function n(r,s,a){if(a>=r.sources.length)r.wherefn(s,r.params,bi)&&(r.groupfn?r.groupfn(s,r.params,bi):r.data.push(r.selectfn(s,r.params,bi)));else if(r.sources[a].applyselect){var i=r.sources[a];i.applyselect(r.params,function(e){if(0<e.length)for(var t=0;t<e.length;t++)s[i.alias]=e[t],n(r,s,a+1);else "OUTER"==i.applymode&&(s[i.alias]={},n(r,s,a+1));},s);}else {var i=r.sources[a],e=r.sources[a+1],t=i.alias||i.tableid,o=!1,u=i.data,c=!1;i.getfn&&(!i.getfn||i.dontcache)||"RIGHT"==i.joinmode||"OUTER"==i.joinmode||"ANTI"==i.joinmode||"ix"!=i.optimization||(u=i.ix[i.onleftfn(s,r.params,bi)]||[],c=!0);var l=0;if(void 0===u)throw new Error("Data source number "+a+" in undefined");for(var h=u.length;(E=u[l])||!c&&i.getfn&&(E=i.getfn(l))||l<h;){c||!i.getfn||i.dontcache||(u[l]=E),s[t]=E;var d,f,p=!i.onleftfn;p||(d=i.onleftfn(s,r.params,bi),f=i.onrightfn(s,r.params,bi),(d instanceof String||d instanceof Number)&&(d=d.valueOf()),(f instanceof String||f instanceof Number)&&(f=d.valueOf()),p=d==f),p&&i.onmiddlefn(s,r.params,bi)&&("SEMI"!=i.joinmode&&"ANTI"!=i.joinmode&&n(r,s,a+1),"LEFT"!=i.joinmode&&"INNER"!=i.joinmode&&(E._rightjoin=!0),o=!0),l++;}if("LEFT"!=i.joinmode&&"OUTER"!=i.joinmode&&"SEMI"!=i.joinmode||o||(s[t]={},n(r,s,a+1)),0==a)for(var b=a+1;b<r.sources.length;b++){if("OUTER"==e.joinmode||"RIGHT"==e.joinmode||"ANTI"==e.joinmode){s[i.alias]={};for(var E,g=0,m=e.data.length;(E=e.data[g])||e.getfn&&(E=e.getfn(g))||g<m;)e.getfn&&!e.dontcache&&(e.data[g]=E),E._rightjoin?delete E._rightjoin:(s[e.alias]=E,n(r,s,b+1)),g++;}i=r.sources[b],e=r.sources[b+1];}s[t]=void 0;}}(e,t,0),e.groupfn){e.data=[],0===e.groups.length&&0===e.allgroups.length&&(c={},0<e.selectGroup.length&&e.selectGroup.forEach(function(e){"COUNT"==e.aggregatorid||"SUM"==e.aggregatorid?c[e.nick]=0:c[e.nick]=void 0;}),e.groups=[c]),0<e.aggrKeys.length&&(n="",e.aggrKeys.forEach(function(e){n+="g['"+e.nick+"']=alasql.aggr['"+e.funcid+"'](undefined,g['"+e.nick+"'],3);";}),r=new Function("g,params,alasql","var y;"+n));for(var i=0,o=e.groups.length;i<o;i++){var u,c=e.groups[i];r&&r(c,e.params,bi),e.havingfn&&!e.havingfn(c,e.params,bi)||(u=e.selectgfn(c,e.params,bi),e.data.push(u));}}if(!function(t){if(t.distinct){for(var e,n={},r=Object.keys(t.data[0]||[]),s=0,a=t.data.length;s<a;s++){var i=r.map(function(e){return t.data[s][e]}).join("`");n[i]=t.data[s];}for(e in t.data=[],n)t.data.push(n[e]);}}(e),e.unionallfn){if(e.corresponding)e.unionallfn.query.modifier||(e.unionallfn.query.modifier=void 0),f=e.unionallfn(e.params);else {e.unionallfn.query.modifier||(e.unionallfn.query.modifier="RECORDSET"),f=[],o=(p=e.unionallfn(e.params)).data.length;for(i=0;i<o;i++){for(var l={},h=Math.min(e.columns.length,p.columns.length)-1;0<=h;h--)l[e.columns[h].columnid]=p.data[i][p.columns[h].columnid];f.push(l);}}e.data=e.data.concat(f);}else if(e.unionfn){if(e.corresponding)e.unionfn.query.modifier||(e.unionfn.query.modifier="ARRAY"),f=e.unionfn(e.params);else {e.unionfn.query.modifier||(e.unionfn.query.modifier="RECORDSET"),f=[],o=(p=e.unionfn(e.params)).data.length;for(i=0;i<o;i++){l={};for(var d=Math.min(e.columns.length,p.columns.length),h=0;h<d;h++)l[e.columns[h].columnid]=p.data[i][p.columns[h].columnid];f.push(l);}}e.data=S(e.data,f);}else if(e.exceptfn){if(e.corresponding){e.exceptfn.query.modifier||(e.exceptfn.query.modifier="ARRAY");var f=e.exceptfn(e.params);}else {e.exceptfn.query.modifier||(e.exceptfn.query.modifier="RECORDSET");for(var p,f=[],i=0,o=(p=e.exceptfn(e.params)).data.length;i<o;i++){for(l={},h=Math.min(e.columns.length,p.columns.length)-1;0<=h;h--)l[e.columns[h].columnid]=p.data[i][p.columns[h].columnid];f.push(l);}}e.data=T(e.data,f);}else if(e.intersectfn){if(e.corresponding)e.intersectfn.query.modifier||(e.intersectfn.query.modifier=void 0),f=e.intersectfn(e.params);else for(e.intersectfn.query.modifier||(e.intersectfn.query.modifier="RECORDSET"),f=[],o=(p=e.intersectfn(e.params)).data.length,i=0;i<o;i++){for(l={},d=Math.min(e.columns.length,p.columns.length),h=0;h<d;h++)l[e.columns[h].columnid]=p.data[i][p.columns[h].columnid];f.push(l);}e.data=v(e.data,f);}if(e.orderfn&&(e.explain&&(a=Date.now()),e.data=e.data.sort(e.orderfn),e.explain&&e.explaination.push({explid:e.explid++,description:"QUERY BY",ms:Date.now()-a})),(s=e).limit&&(t=0,s.offset&&(t=(t=0|s.offset||0)<0?0:t),a=s.percent?(s.data.length*s.limit/100|0)+t:(0|s.limit)+t,s.data=s.data.slice(t,a)),"undefined"!=typeof angular&&e.removeKeys.push("$$hashKey"),0<e.removeKeys.length){var b=e.removeKeys;if(0<(d=b.length))for(o=e.data.length,i=0;i<o;i++)for(h=0;h<d;h++)delete e.data[i][b[h]];0<e.columns.length&&(e.columns=e.columns.filter(function(t){var n=!1;return b.forEach(function(e){t.columnid==e&&(n=!0);}),!n}));}if(void 0!==e.removeLikeKeys&&0<e.removeLikeKeys.length){for(var E=e.removeLikeKeys,i=0,o=e.data.length;i<o;i++)for(var g in l=e.data[i])for(h=0;h<e.removeLikeKeys.length;h++)bi.utils.like(e.removeLikeKeys[h],g)&&delete l[g];0<e.columns.length&&(e.columns=e.columns.filter(function(t){var n=!1;return E.forEach(function(e){bi.utils.like(e,t.columnid)&&(n=!0);}),!n}));}if(e.pivotfn&&e.pivotfn(),e.unpivotfn&&e.unpivotfn(),e.intoallfn){var m=e.intoallfn(e.columns,e.cb,e.params,e.alasql);return m}if(e.intofn){for(o=e.data.length,i=0;i<o;i++)e.intofn(e.data[i],i,e.params,e.alasql);return e.cb&&e.cb(e.data.length,e.A,e.B),e.data.length}return m=e.data,m=e.cb?e.cb(e.data,e.A,e.B):m}bi.srch.ORDERBY=function(e,t){return {status:1,values:e.sort(function(e){if(e){if(e&&1===e.length&&e[0].expression&&"function"==typeof e[0].expression){var n=e[0].expression;return function(e,t){e=n(e),t=n(t);return t<e?1:e===t?0:-1}}var r="",s="";return e.forEach(function(e){var t,n="";e.expression instanceof k.NumValue&&(e.expression=self.columns[e.expression.value-1]),e.expression instanceof k.Column?(t=e.expression.columnid,bi.options.valueof&&(n=".valueOf()"),e.nocase&&(n+=".toUpperCase()"),"_"===t?(r+="if(a"+n+("ASC"===e.direction?">":"<")+"b"+n+")return 1;",r+="if(a"+n+"==b"+n+"){"):(r+="if((a["+a(t)+"]||'')"+n+("ASC"===e.direction?">":"<")+"(b["+a(t)+"]||'')"+n+")return 1;",r+="if((a["+a(t)+"]||'')"+n+"==(b["+a(t)+"]||'')"+n+"){")):(n=".valueOf()",e.nocase&&(n+=".toUpperCase()"),r+="if(("+e.toJS("a","")+"||'')"+n+("ASC"===e.direction?">(":"<(")+e.toJS("b","")+"||'')"+n+")return 1;",r+="if(("+e.toJS("a","")+"||'')"+n+"==("+e.toJS("b","")+"||'')"+n+"){"),s+="}";}),r+="return 0;",r+=s+"return -1",new Function("a,b",r)}}(t))}};var M=function(t){for(var e=0,n=t.sources.length;e<n;e++){var r,s=t.sources[e];if(delete s.ix,0<e&&"ix"==s.optimization&&s.onleftfn&&s.onrightfn){if(s.databaseid&&bi.databases[s.databaseid].tables[s.tableid]&&(bi.databases[s.databaseid].tables[s.tableid].indices||(t.database.tables[s.tableid].indices={}),r=bi.databases[s.databaseid].tables[s.tableid].indices[b(s.onrightfns+"`"+s.srcwherefns)],!bi.databases[s.databaseid].tables[s.tableid].dirty&&r&&(s.ix=r)),!s.ix){s.ix={};for(var a,i,o={},u=0,c=s.data.length;(a=s.data[u])||s.getfn&&(a=s.getfn(u))||u<c;)s.getfn&&!s.dontcache&&(s.data[u]=a),o[s.alias||s.tableid]=a,s.srcwherefn(o,t.params,bi)&&(i=s.onrightfn(o,t.params,bi),(s.ix[i]||(s.ix[i]=[])).push(a)),u++;s.databaseid&&bi.databases[s.databaseid].tables[s.tableid]&&(bi.databases[s.databaseid].tables[s.tableid].indices[b(s.onrightfns+"`"+s.srcwherefns)]=s.ix);}}else if(s.wxleftfn){if(bi.databases[s.databaseid].engineid||(r=bi.databases[s.databaseid].tables[s.tableid].indices[b(s.wxleftfns+"`")]),!bi.databases[s.databaseid].tables[s.tableid].dirty&&r)s.ix=r,s.data=s.ix[s.wxrightfn(null,t.params,bi)];else {for(s.ix={},o={},u=0,c=s.data.length;(a=s.data[u])||s.getfn&&(a=s.getfn(u))||u<c;)s.getfn&&!s.dontcache&&(s.data[u]=a),o[s.alias||s.tableid]=s.data[u],i=s.wxleftfn(o,t.params,bi),(s.ix[i]||(s.ix[i]=[])).push(s.data[u]),u++;bi.databases[s.databaseid].engineid||(bi.databases[s.databaseid].tables[s.tableid].indices[b(s.wxleftfns+"`")]=s.ix);}s.srcwherefns&&(s.data?(o={},s.data=s.data.filter(function(e){return o[s.alias]=e,s.srcwherefn(o,t.params,bi)})):s.data=[]);}else if(s.srcwherefns&&!s.dontcache)if(s.data){o={};s.data=s.data.filter(function(e){return o[s.alias]=e,s.srcwherefn(o,t.params,bi)}),o={};for(var u=0,c=s.data.length,l=[];(a=s.data[u])||s.getfn&&(a=s.getfn(u))||u<c;)s.getfn&&!s.dontcache&&(s.data[u]=a),o[s.alias]=a,s.srcwherefn(o,t.params,bi)&&l.push(a),u++;s.data=l;}else s.data=[];s.databaseid&&bi.databases[s.databaseid].tables[s.tableid];}};function U(e,t){if(void 0===t||"number"==typeof t||"string"==typeof t||"boolean"==typeof t)return t;var n=e.modifier||bi.options.modifier,r=e.columns;if(void 0===r||0==r.length)if(0<t.length){for(var s={},a=Math.min(t.length,bi.options.columnlookup||10)-1;0<=a;a--)for(var i in t[a])s[i]=!0;r=Object.keys(s).map(function(e){return {columnid:e}});}else r=[];if("VALUE"===n)t=0<t.length?(i=r&&0<r.length?r[0].columnid:Object.keys(t[0])[0],t[0][i]):void 0;else if("ROW"===n)if(0<t.length){var o=[];for(i in t[0])o.push(t[0][i]);t=o;}else t=void 0;else if("COLUMN"===n){var u=[];if(0<t.length){i=r&&0<r.length?r[0].columnid:Object.keys(t[0])[0];for(var a=0,c=t.length;a<c;a++)u.push(t[a][i]);}t=u;}else if("MATRIX"===n){for(u=[],a=0;a<t.length;a++){for(var o=[],l=t[a],h=0;h<r.length;h++)o.push(l[r[h].columnid]);u.push(o);}t=u;}else if("INDEX"===n){for(var u={},d=r&&0<r.length?(i=r[0].columnid,r[1].columnid):(i=(e=Object.keys(t[0]))[0],e[1]),a=0,c=t.length;a<c;a++)u[t[a][i]]=t[a][d];t=u;}else if("RECORDSET"===n)t=new bi.Recordset({columns:r,data:t});else if("TEXTSTRING"===n){i=r&&0<r.length?r[0].columnid:Object.keys(t[0])[0];for(a=0,c=t.length;a<c;a++)t[a]=t[a][i];t=t.join("\n");}return t}function _(s,e,a){var i="",o=[],u={};return e.forEach(function(r){var e;s.ixsources={},s.sources.forEach(function(e){s.ixsources[e.alias]=e;}),s.ixsources[r]&&(e=s.ixsources[r].columns),a&&"json"==bi.options.joinstar&&(i+="r['"+r+"']={};"),e&&0<e.length?e.forEach(function(e){var t,n;a&&"underscore"==bi.options.joinstar?o.push("'"+r+"_"+e.columnid+"':p['"+r+"']['"+e.columnid+"']"):a&&"json"==bi.options.joinstar?i+="r['"+r+"']['"+e.columnid+"']=p['"+r+"']['"+e.columnid+"'];":(t="p['"+r+"']['"+e.columnid+"']",u[e.columnid]?(n=t+" !== undefined ? "+t+" : "+u[e.columnid].value,o[u[e.columnid].id]=u[e.columnid].key+n,u[e.columnid].value=n):(n="'"+e.columnid+"':",o.push(n+t),u[e.columnid]={id:o.length-1,value:t,key:n})),s.selectColumns[h(e.columnid)]=!0;e={columnid:e.columnid,dbtypeid:e.dbtypeid,dbsize:e.dbsize,dbprecision:e.dbprecision,dbenum:e.dbenum};s.columns.push(e),s.xcolumns[e.columnid]=e;}):(i+='var w=p["'+r+'"];for(var k in w){r[k]=w[k]};',s.dirtyColumns=!0);}),{s:o.join(","),sp:i}}k.Select=function(e){return k.extend(this,e)},k.Select.prototype.toString=function(){var e="";return this.explain&&(e+="EXPLAIN "),e+="SELECT ",this.modifier&&(e+=this.modifier+" "),this.distinct&&(e+="DISTINCT "),this.top&&(e+="TOP "+this.top.value+" ",this.percent&&(e+="PERCENT ")),e+=this.columns.map(function(e){var t=e.toString();return void 0!==e.as&&(t+=" AS "+e.as),t}).join(", "),this.from&&(e+=" FROM "+this.from.map(function(e){var t=e.toString();return e.as&&(t+=" AS "+e.as),t}).join(",")),this.joins&&(e+=this.joins.map(function(e){var t=" ";if(e.joinmode&&(t+=e.joinmode+" "),e.table)t+="JOIN "+e.table.toString();else if(e.select)t+="JOIN ("+e.select.toString()+")";else {if(!(e instanceof bi.yy.Apply))throw new Error("Wrong type in JOIN mode");t+=e.toString();}return e.as&&(t+=" AS "+e.as),e.using&&(t+=" USING "+e.using.toString()),e.on&&(t+=" ON "+e.on.toString()),t}).join("")),this.where&&(e+=" WHERE "+this.where.toString()),this.group&&0<this.group.length&&(e+=" GROUP BY "+this.group.map(function(e){return e.toString()}).join(", ")),this.having&&(e+=" HAVING "+this.having.toString()),this.order&&0<this.order.length&&(e+=" ORDER BY "+this.order.map(function(e){return e.toString()}).join(", ")),this.limit&&(e+=" LIMIT "+this.limit.value),this.offset&&(e+=" OFFSET "+this.offset.value),this.union&&(e+=" UNION "+(this.corresponding?"CORRESPONDING ":"")+this.union.toString()),this.unionall&&(e+=" UNION ALL "+(this.corresponding?"CORRESPONDING ":"")+this.unionall.toString()),this.except&&(e+=" EXCEPT "+(this.corresponding?"CORRESPONDING ":"")+this.except.toString()),this.intersect&&(e+=" INTERSECT "+(this.corresponding?"CORRESPONDING ":"")+this.intersect.toString()),e},k.Select.prototype.toJS=function(e){return "alasql.utils.flatArray(this.queriesfn["+(this.queriesidx-1)+"](this.params,null,"+e+"))[0]"},k.Select.prototype.compile=function(e,t){var n=bi.databases[e],o=new w;o.removeKeys=[],o.aggrKeys=[],o.explain=this.explain,o.explaination=[],o.explid=1,o.modifier=this.modifier,o.database=n,this.compileWhereExists(o),this.compileQueries(o),o.defcols=this.compileDefCols(o,e),o.fromfn=this.compileFrom(o),this.joins&&this.compileJoins(o),o.rownums=[],this.compileSelectGroup0(o),this.group||0<o.selectGroup.length?o.selectgfns=this.compileSelectGroup1(o):o.selectfns=this.compileSelect1(o,t),this.compileRemoveColumns(o),this.where&&this.compileWhereJoins(o),o.wherefn=this.compileWhere(o),(this.group||0<o.selectGroup.length)&&(o.groupfn=this.compileGroup(o)),this.having&&(o.havingfn=this.compileHaving(o)),this.order&&(o.orderfn=this.compileOrder(o,t)),this.group||0<o.selectGroup.length?o.selectgfn=this.compileSelectGroup2(o):o.selectfn=this.compileSelect2(o,t),o.distinct=this.distinct,this.pivot&&(o.pivotfn=this.compilePivot(o)),this.unpivot&&(o.pivotfn=this.compileUnpivot(o)),this.top?o.limit=this.top.value:this.limit&&(o.limit=this.limit.value,this.offset&&(o.offset=this.offset.value)),o.percent=this.percent,o.corresponding=this.corresponding,this.union?(o.unionfn=this.union.compile(e),this.union.order?o.orderfn=this.union.compileOrder(o,t):o.orderfn=null):this.unionall?(o.unionallfn=this.unionall.compile(e),this.unionall.order?o.orderfn=this.unionall.compileOrder(o,t):o.orderfn=null):this.except?(o.exceptfn=this.except.compile(e),this.except.order?o.orderfn=this.except.compileOrder(o,t):o.orderfn=null):this.intersect&&(o.intersectfn=this.intersect.compile(e),this.intersect.order?o.intersectfn=this.intersect.compileOrder(o,t):o.orderfn=null),this.into&&(this.into instanceof k.Table?bi.options.autocommit&&bi.databases[this.into.databaseid||e].engineid?o.intoallfns='return alasql.engines["'+bi.databases[this.into.databaseid||e].engineid+'"].intoTable("'+(this.into.databaseid||e)+'","'+this.into.tableid+'",this.data, columns, cb);':o.intofns="alasql.databases['"+(this.into.databaseid||e)+"'].tables['"+this.into.tableid+"'].data.push(r);":this.into instanceof k.VarValue?o.intoallfns='alasql.vars["'+this.into.variable+'"]=this.data;res=this.data.length;if(cb)res=cb(res);return res;':this.into instanceof k.FuncValue?(r="return alasql.into["+JSON.stringify(this.into.funcid.toUpperCase())+"](",this.into.args&&0<this.into.args.length?(r+=this.into.args[0].toJS()+",",1<this.into.args.length?r+=this.into.args[1].toJS()+",":r+="undefined,"):r+="undefined, undefined,",o.intoallfns=r+"this.data,columns,cb)"):this.into instanceof k.ParamValue&&(o.intofns="params['"+this.into.param+"'].push(r)"),o.intofns?o.intofn=new Function("r,i,params,alasql","var y;"+o.intofns):o.intoallfns&&(o.intoallfn=new Function("columns,cb,params,alasql","var y;"+o.intoallfns)));var r=function(e,i,t){return o.params=e,function(n,e,t,r,s){n.sources.length,n.sourceslen=n.sources.length;var a,i=n.sourceslen;return (n.query=n).A=r,n.B=s,n.cb=t,n.oldscope=e,n.queriesfn&&(n.sourceslen+=n.queriesfn.length,i+=n.queriesfn.length,n.queriesdata=[],n.queriesfn.forEach(function(e,t){e.query.params=n.params,L([],-t-1,n);})),e=e?m(e):{},n.scope=e,n.sources.forEach(function(e,t){e.query=n;t=e.datafn(n,n.params,L,t,bi);void 0!==t&&((n.intofn||n.intoallfn)&&Array.isArray(t)&&(t=t.length),a=t),e.queriesdata=n.queriesdata;}),a=0==n.sources.length||0===i?$(n):a}(o,t,function(e,t){if(t)return i(t,null);if(0<o.rownums.length)for(var n=0,r=e.length;n<r;n++)for(var s=0,a=o.rownums.length;s<a;s++)e[n][o.rownums[s]]=n+1;t=U(o,e);return i&&i(t),t})};return r.query=o,r},k.Select.prototype.execute=function(e,t,n){return this.compile(e)(t,n)},k.ExistsValue=function(e){return k.extend(this,e)},k.ExistsValue.prototype.toString=function(){return "EXISTS("+this.value.toString()+")"},k.ExistsValue.prototype.toType=function(){return "boolean"},k.ExistsValue.prototype.toJS=function(e,t,n){return "this.existsfn["+this.existsidx+"](params,null,"+e+").data.length"},k.Select.prototype.compileWhereExists=function(t){this.exists&&(t.existsfn=this.exists.map(function(e){e=e.compile(t.database.databaseid);return e.query.modifier="RECORDSET",e}));},k.Select.prototype.compileQueries=function(t){this.queries&&(t.queriesfn=this.queries.map(function(e){e=e.compile(t.database.databaseid);return e.query.modifier="RECORDSET",e}));},bi.precompile=function(t,n,e){t&&(t.params=e,t.queries&&(t.queriesfn=t.queries.map(function(e){e=e.compile(n||t.database.databaseid);return e.query.modifier="RECORDSET",e})),t.exists&&(t.existsfn=t.exists.map(function(e){e=e.compile(n||t.database.databaseid);return e.query.modifier="RECORDSET",e})));},k.Select.prototype.compileFrom=function(n){n.sources=[],n.aliases={},this.from&&(this.from.forEach(function(i){var e="",t=i.as||i.tableid;if(i instanceof k.Table)n.aliases[t]={tableid:i.tableid,databaseid:i.databaseid||n.database.databaseid,type:"table"};else if(i instanceof k.Select)n.aliases[t]={type:"subquery"};else if(i instanceof k.Search)n.aliases[t]={type:"subsearch"};else if(i instanceof k.ParamValue)n.aliases[t]={type:"paramvalue"};else if(i instanceof k.FuncValue)n.aliases[t]={type:"funcvalue"};else if(i instanceof k.VarValue)n.aliases[t]={type:"varvalue"};else if(i instanceof k.FromData)n.aliases[t]={type:"fromdata"};else if(i instanceof k.Json)n.aliases[t]={type:"json"};else {if(!i.inserted)throw new Error("Wrong table at FROM");n.aliases[t]={type:"inserted"};}var o={alias:t,databaseid:i.databaseid||n.database.databaseid,tableid:i.tableid,joinmode:"INNER",onmiddlefn:f,srcwherefns:"",srcwherefn:f};if(i instanceof k.Table)o.columns=bi.databases[o.databaseid].tables[o.tableid].columns,bi.options.autocommit&&bi.databases[o.databaseid].engineid&&!bi.databases[o.databaseid].tables[o.tableid].view?o.datafn=function(e,t,n,r,s){return s.engines[s.databases[o.databaseid].engineid].fromTable(o.databaseid,o.tableid,n,r,e)}:bi.databases[o.databaseid].tables[o.tableid].view?o.datafn=function(e,t,n,r,s){t=s.databases[o.databaseid].tables[o.tableid].select(t);return t=n?n(t,r,e):t}:o.datafn=function(e,t,n,r,s){s=s.databases[o.databaseid].tables[o.tableid].data;return s=n?n(s,r,e):s};else if(i instanceof k.Select)o.subquery=i.compile(n.database.databaseid),void 0===o.subquery.query.modifier&&(o.subquery.query.modifier="RECORDSET"),o.columns=o.subquery.query.columns,o.datafn=function(t,e,n,r,s){var a;return o.subquery(t.params,function(e){return a=e.data,a=n?n(a,r,t):a}),a};else if(i instanceof k.Search)o.subsearch=i,o.columns=[],o.datafn=function(t,e,n,r,s){var a;return o.subsearch.execute(t.database.databaseid,t.params,function(e){return a=e,a=n?n(a,r,t):a}),a};else if(i instanceof k.ParamValue)e="var res = alasql.prepareFromData(params['"+i.param+"']",i.array&&(e+=",true"),e+=");if(cb)res=cb(res,idx,query);return res",o.datafn=new Function("query,params,cb,idx,alasql",e);else if(i.inserted)e="var res = alasql.prepareFromData(alasql.inserted",i.array&&(e+=",true"),e+=");if(cb)res=cb(res,idx,query);return res",o.datafn=new Function("query,params,cb,idx,alasql",e);else if(i instanceof k.Json)e="var res = alasql.prepareFromData("+i.toJS(),i.array&&(e+=",true"),e+=");if(cb)res=cb(res,idx,query);return res",o.datafn=new Function("query,params,cb,idx,alasql",e);else if(i instanceof k.VarValue)e="var res = alasql.prepareFromData(alasql.vars['"+i.variable+"']",i.array&&(e+=",true"),e+=");if(cb)res=cb(res,idx,query);return res",o.datafn=new Function("query,params,cb,idx,alasql",e);else if(i instanceof k.FuncValue)e="var res=alasql.from["+JSON.stringify(i.funcid.toUpperCase())+"](",i.args&&0<i.args.length?(i.args[0]?e+=i.args[0].toJS("query.oldscope")+",":e+="null,",i.args[1]?e+=i.args[1].toJS("query.oldscope")+",":e+="null,"):e+="null,null,",e+="cb,idx,query",e+=");/*if(cb)res=cb(res,idx,query);*/return res",o.datafn=new Function("query, params, cb, idx, alasql",e);else {if(!(i instanceof k.FromData))throw new Error("Wrong table at FROM");o.datafn=function(e,t,n,r,s){var a=i.data;return a=n?n(a,r,e):a};}n.sources.push(o);}),n.defaultTableid=n.sources[0].alias);},bi.prepareFromData=function(e,t){var n,r,s=e;if("string"==typeof e){if(s=e.split(/\r?\n/),t)for(n=0,r=s.length;n<r;n++)s[n]=[s[n]];}else if(t)for(s=[],n=0,r=e.length;n<r;n++)s.push([e[n]]);else if("object"==typeof e&&!Array.isArray(e))if("undefined"!=typeof Mongo&&void 0!==Mongo.Collection&&e instanceof Mongo.Collection)s=e.find().fetch();else for(var a in s=[],e)e.hasOwnProperty(a)&&s.push([a,e[a]]);return s},k.Select.prototype.compileJoins=function(d){this.joins.forEach(function(e){var t,a,n;if("CROSS"===e.joinmode){if(e.using||e.on)throw new Error("CROSS JOIN cannot have USING or ON clauses");e.joinmode="INNER";}if(e instanceof k.Apply)return (a={alias:e.as,applymode:e.applymode,onmiddlefn:f,srcwherefns:"",srcwherefn:f,columns:[]}).applyselect=e.select.compile(d.database.databaseid),a.columns=a.applyselect.query.columns,a.datafn=function(e,t,n,r,s){var a;return a=n?n(a,r,e):a},void d.sources.push(a);if(e.table){if(t=e.table,a={alias:e.as||t.tableid,databaseid:t.databaseid||d.database.databaseid,tableid:t.tableid,joinmode:e.joinmode,onmiddlefn:f,srcwherefns:"",srcwherefn:f,columns:[]},!bi.databases[a.databaseid].tables[a.tableid])throw new Error("Table '"+a.tableid+"' is not exists in database '"+a.databaseid+"'");a.columns=bi.databases[a.databaseid].tables[a.tableid].columns,bi.options.autocommit&&bi.databases[a.databaseid].engineid?a.datafn=function(e,t,n,r,s){return s.engines[s.databases[a.databaseid].engineid].fromTable(a.databaseid,a.tableid,n,r,e)}:bi.databases[a.databaseid].tables[a.tableid].view?a.datafn=function(e,t,n,r,s){t=s.databases[a.databaseid].tables[a.tableid].select(t);return t=n?n(t,r,e):t}:a.datafn=function(e,t,n,r,s){s=s.databases[a.databaseid].tables[a.tableid].data;return s=n?n(s,r,e):s},d.aliases[a.alias]={tableid:t.tableid,databaseid:t.databaseid||d.database.databaseid};}else e.select?(t=e.select,(a={alias:e.as,joinmode:e.joinmode,onmiddlefn:f,srcwherefns:"",srcwherefn:f,columns:[]}).subquery=t.compile(d.database.databaseid),void 0===a.subquery.query.modifier&&(a.subquery.query.modifier="RECORDSET"),a.columns=a.subquery.query.columns,a.datafn=function(e,t,n,r,s){return a.subquery(e.params,null,n,r).data},d.aliases[a.alias]={type:"subquery"}):e.param?(a={alias:e.as,joinmode:e.joinmode,onmiddlefn:f,srcwherefns:"",srcwherefn:f},n="var res=alasql.prepareFromData(params['"+e.param.param+"']",e.array&&(n+=",true"),n+=");if(cb)res=cb(res, idx, query);return res",a.datafn=new Function("query,params,cb,idx, alasql",n),d.aliases[a.alias]={type:"paramvalue"}):e.variable?(a={alias:e.as,joinmode:e.joinmode,onmiddlefn:f,srcwherefns:"",srcwherefn:f},n="var res=alasql.prepareFromData(alasql.vars['"+e.variable+"']",e.array&&(n+=",true"),n+=");if(cb)res=cb(res, idx, query);return res",a.datafn=new Function("query,params,cb,idx, alasql",n),d.aliases[a.alias]={type:"varvalue"}):e.func&&(a={alias:e.as,joinmode:e.joinmode,onmiddlefn:f,srcwherefns:"",srcwherefn:f},s="var res=alasql.from["+JSON.stringify(e.func.funcid.toUpperCase())+"](",(r=e.func.args)&&0<r.length?(r[0]?s+=r[0].toJS("query.oldscope")+",":s+="null,",r[1]?s+=r[1].toJS("query.oldscope")+",":s+="null,"):s+="null,null,",s+="cb,idx,query",s+=");/*if(cb)res=cb(res,idx,query);*/return res",a.datafn=new Function("query, params, cb, idx, alasql",s),d.aliases[a.alias]={type:"funcvalue"});var r,s,i=a.alias;if(e.natural){if(e.using||e.on)throw new Error("NATURAL JOIN cannot have USING or ON clauses");if(0<d.sources.length){var o=d.sources[d.sources.length-1],u=bi.databases[o.databaseid].tables[o.tableid],c=bi.databases[a.databaseid].tables[a.tableid];if(!u||!c)throw new Error("In this version of Alasql NATURAL JOIN works for tables with predefined columns only");var l=u.columns.map(function(e){return e.columnid}),h=c.columns.map(function(e){return e.columnid});e.using=g(l,h).map(function(e){return {columnid:e}});}}e.using?(o=d.sources[d.sources.length-1],a.onleftfns=e.using.map(function(e){return "p['"+(o.alias||o.tableid)+"']['"+e.columnid+"']"}).join('+"`"+'),a.onleftfn=new Function("p,params,alasql","var y;return "+a.onleftfns),a.onrightfns=e.using.map(function(e){return "p['"+(a.alias||a.tableid)+"']['"+e.columnid+"']"}).join('+"`"+'),a.onrightfn=new Function("p,params,alasql","var y;return "+a.onrightfns),a.optimization="ix"):e.on&&(e.on instanceof k.Op&&"="===e.on.op&&!e.on.allsome?(u=s=r="",c=!(a.optimization="ix"),l=e.on.left.toJS("p",d.defaultTableid,d.defcols),h=e.on.right.toJS("p",d.defaultTableid,d.defcols),-1<l.indexOf("p['"+i+"']")&&!(-1<h.indexOf("p['"+i+"']"))?(l.match(/p\['.*?'\]/g)||[]).every(function(e){return e==="p['"+i+"']"})?s=l:c=!0:!(-1<l.indexOf("p['"+i+"']"))&&-1<h.indexOf("p['"+i+"']")&&(h.match(/p\['.*?'\]/g)||[]).every(function(e){return e==="p['"+i+"']"})?r=l:c=!0,-1<h.indexOf("p['"+i+"']")&&!(-1<l.indexOf("p['"+i+"']"))?(h.match(/p\['.*?'\]/g)||[]).every(function(e){return e==="p['"+i+"']"})?s=h:c=!0:!(-1<h.indexOf("p['"+i+"']"))&&-1<l.indexOf("p['"+i+"']")&&(l.match(/p\['.*?'\]/g)||[]).every(function(e){return e==="p['"+i+"']"})?r=h:c=!0,c&&(r=s="",u=e.on.toJS("p",d.defaultTableid,d.defcols),a.optimization="no"),a.onleftfns=r,a.onrightfns=s,a.onmiddlefns=u||"true",a.onleftfn=new Function("p,params,alasql","var y;return "+a.onleftfns),a.onrightfn=new Function("p,params,alasql","var y;return "+a.onrightfns),a.onmiddlefn=new Function("p,params,alasql","var y;return "+a.onmiddlefns)):(a.optimization="no",a.onmiddlefns=e.on.toJS("p",d.defaultTableid,d.defcols),a.onmiddlefn=new Function("p,params,alasql","var y;return "+e.on.toJS("p",d.defaultTableid,d.defcols)))),d.sources.push(a);});},k.Select.prototype.compileWhere=function(e){if(this.where){if("function"==typeof this.where)return this.where;var t=this.where.toJS("p",e.defaultTableid,e.defcols);return e.wherefns=t,new Function("p,params,alasql","var y;return "+t)}return function(){return !0}},k.Select.prototype.compileWhereJoins=function(e){},k.Select.prototype.compileGroup=function(s){var a;a=0<s.sources.length?s.sources[0].alias:"";var i=s.defcols,e=[[]];this.group&&(e=V(this.group,s));var n=[];e.forEach(function(e){n=u(n,e);}),s.allgroups=n,s.ingroup=[];var o="";return e.forEach(function(e){o+="var g=this.xgroups[";var t=e.map(function(e){var t=e.split("\t")[0],e=e.split("\t")[1];return ""===t?"1":(s.ingroup.push(t),e)});0===t.length&&(t=["''"]),o+=t.join('+"`"+'),o+="];if(!g) {this.groups.push((g=this.xgroups[",o+=t.join('+"`"+'),o+="] = {",o+=e.map(function(e){var t=e.split("\t")[0],e=e.split("\t")[1];return ""===t?"":"'"+t+"':"+e+","}).join("");e=E(n,e);o+=e.map(function(e){return "'"+e.split("\t")[0]+"':null,"}).join("");var r="",e="";void 0!==s.groupStar&&(e+="for(var f in p['"+s.groupStar+"']) {g[f]=p['"+s.groupStar+"'][f];};"),o+=s.selectGroup.map(function(e){var t=e.expression.toJS("p",a,i),n=e.nick;return e instanceof k.AggrValue?(e.distinct&&(r+=",g['$$_VALUES_"+n+"']={},g['$$_VALUES_"+n+"']["+t+"]=true"),"SUM"===e.aggregatorid?"'"+n+"':("+t+")||0,":"MIN"===e.aggregatorid||"MAX"===e.aggregatorid||"FIRST"===e.aggregatorid||"LAST"===e.aggregatorid?"'"+n+"':"+t+",":"ARRAY"===e.aggregatorid?"'"+n+"':["+t+"],":"COUNT"===e.aggregatorid?"*"===e.expression.columnid?"'"+n+"':1,":"'"+n+"':(typeof "+t+' == "undefined" || '+t+" === null) ? 0 : 1,":"AVG"===e.aggregatorid?(s.removeKeys.push("_SUM_"+n),s.removeKeys.push("_COUNT_"+n),"'"+n+"':"+t+",'_SUM_"+n+"':("+t+")||0,'_COUNT_"+n+"':(typeof "+t+' == "undefined" || '+t+" === null) ? 0 : 1,"):"AGGR"===e.aggregatorid?(r+=",g['"+n+"']="+e.expression.toJS("g",-1),""):"REDUCE"===e.aggregatorid?(s.aggrKeys.push(e),"'"+n+"':alasql.aggr['"+e.funcid+"']("+t+",undefined,1),"):""):""}).join(""),o+="}"+r+",g));"+e+"} else {",o+=s.selectGroup.map(function(e){var t=e.nick,n=e.expression.toJS("p",a,i);if(e instanceof k.AggrValue){var r="",s="";return e.distinct&&(r="if(typeof "+n+'!="undefined" && (!g[\'$$_VALUES_'+t+"']["+n+"])) \t\t\t\t \t\t {",s="g['$$_VALUES_"+t+"']["+n+"]=true;}"),"SUM"===e.aggregatorid?r+"g['"+t+"']+=("+n+"||0);"+s:"COUNT"===e.aggregatorid?"*"===e.expression.columnid?r+"g['"+t+"']++;"+s:r+"if(typeof "+n+'!="undefined" && '+n+" !== null) g['"+t+"']++;"+s:"ARRAY"===e.aggregatorid?r+"g['"+t+"'].push("+n+");"+s:"MIN"===e.aggregatorid?r+"if ((y="+n+") < g['"+t+"']) g['"+t+"'] = y;"+s:"MAX"===e.aggregatorid?r+"if ((y="+n+") > g['"+t+"']) g['"+t+"'] = y;"+s:"FIRST"===e.aggregatorid?"":"LAST"===e.aggregatorid?r+"g['"+t+"']="+n+";"+s:"AVG"===e.aggregatorid?r+"g['_SUM_"+t+"']+=(y="+n+")||0;g['_COUNT_"+t+"']+=(typeof y == \"undefined\" || y === null) ? 0 : 1;g['"+t+"']=g['_SUM_"+t+"']/g['_COUNT_"+t+"'];"+s:"AGGR"===e.aggregatorid?r+"g['"+t+"']="+e.expression.toJS("g",-1)+";"+s:"REDUCE"===e.aggregatorid?r+"g['"+t+"']=alasql.aggr."+e.funcid+"("+n+",g['"+t+"'],2);"+s:""}return ""}).join(""),o+="}";}),new Function("p,params,alasql","var y;"+o)},k.Select.prototype.compileSelect1=function(a,i){var o=this;a.columns=[],a.xcolumns={},a.selectColumns={},a.dirtyColumns=!1;var e="var r={",u="",c=[];return this.columns.forEach(function(e){if(e instanceof k.Column)if("*"===e.columnid)e.func?u+="r=params['"+e.param+"'](p['"+a.sources[0].alias+"'],p,params,alasql);":(e.tableid?(r=_(a,[e.tableid],!1)).s&&(c=c.concat(r.s)):(r=_(a,Object.keys(a.aliases),!0)).s&&(c=c.concat(r.s)),u+=r.sp);else {var t=e.tableid,n=e.databaseid||a.sources[0].databaseid||a.database.databaseid;if(t=(t=t||a.defcols[e.columnid])||a.defaultTableid,"_"!==e.columnid?i&&1<i.length&&Array.isArray(i[0])&&1<=i[0].length&&i[0][0].hasOwnProperty("sheetid")?u='var r={};var w=p["'+t+'"];var cols=['+o.columns.map(function(e){return "'"+e.columnid+"'"}).join(",")+"];var colas=["+o.columns.map(function(e){return "'"+(e.as||e.columnid)+"'"}).join(",")+"];for (var i=0;i<Object.keys(p['"+t+"']).length;i++) for(var k=0;k<cols.length;k++){if (!r.hasOwnProperty(i)) r[i]={}; r[i][colas[k]]=w[i][cols[k]];}":c.push("'"+h(e.as||e.columnid)+"':p['"+t+"']['"+e.columnid+"']"):c.push("'"+h(e.as||e.columnid)+"':p['"+t+"']"),a.selectColumns[h(e.as||e.columnid)]=!0,a.aliases[t]&&"table"===a.aliases[t].type){if(!bi.databases[n].tables[a.aliases[t].tableid])throw new Error("Table '"+t+"' does not exist in database");var r=bi.databases[n].tables[a.aliases[t].tableid].columns,t=bi.databases[n].tables[a.aliases[t].tableid].xcolumns;if(t&&0<r.length){var s=t[e.columnid];if(void 0===s)throw new Error("Column does not exist: "+e.columnid);var s={columnid:e.as||e.columnid,dbtypeid:s.dbtypeid,dbsize:s.dbsize,dbpecision:s.dbprecision,dbenum:s.dbenum};a.columns.push(s),a.xcolumns[s.columnid]=s;}else {var s={columnid:e.as||e.columnid};a.columns.push(s),a.xcolumns[s.columnid]=s,a.dirtyColumns=!0;}}else {s={columnid:e.as||e.columnid};a.columns.push(s),a.xcolumns[s.columnid]=s;}}else s=(e instanceof k.AggrValue?(o.group||(o.group=[""]),e.as||(e.as=h(e.toString())),"SUM"===e.aggregatorid||"MAX"===e.aggregatorid||"MIN"===e.aggregatorid||"FIRST"===e.aggregatorid||"LAST"===e.aggregatorid||"AVG"===e.aggregatorid||"ARRAY"===e.aggregatorid||"REDUCE"===e.aggregatorid?c.push("'"+h(e.as)+"':"+l(e.expression.toJS("p",a.defaultTableid,a.defcols))):"COUNT"===e.aggregatorid&&c.push("'"+h(e.as)+"':1")):(c.push("'"+h(e.as||e.columnid||e.toString())+"':"+l(e.toJS("p",a.defaultTableid,a.defcols))),a.selectColumns[h(e.as||e.columnid||e.toString())]=!0),{columnid:e.as||e.columnid||e.toString()}),a.columns.push(s),a.xcolumns[s.columnid]=s;}),e+=c.join(",")+"};"+u},k.Select.prototype.compileSelect2=function(n,r){var s=n.selectfns;return this.orderColumns&&0<this.orderColumns.length&&this.orderColumns.forEach(function(e,t){t="$$$"+t;e instanceof k.Column&&n.xcolumns[e.columnid]?s+="r['"+t+"']=r['"+e.columnid+"'];":e instanceof k.ParamValue&&n.xcolumns[r[e.param]]?s+="r['"+t+"']=r['"+r[e.param]+"'];":s+="r['"+t+"']="+e.toJS("p",n.defaultTableid,n.defcols)+";",n.removeKeys.push(t);}),new Function("p,params,alasql","var y;"+s+"return r")},k.Select.prototype.compileSelectGroup0=function(a){var i=this;i.columns.forEach(function(t,e){if(t instanceof k.Column&&"*"===t.columnid)a.groupStar=t.tableid||"default";else {for(var n,r=t instanceof k.Column?h(t.columnid):h(t.toString(!0)),s=0;s<e;s++)if(r===i.columns[s].nick){r=i.columns[s].nick+":"+e;break}t.nick=r,!i.group||-1<(n=i.group.findIndex(function(e){return e.columnid===t.columnid&&e.tableid===t.tableid}))&&(i.group[n].nick=r),!t.funcid||"ROWNUM"!==t.funcid.toUpperCase()&&"ROW_NUMBER"!==t.funcid.toUpperCase()||a.rownums.push(t.as);}}),this.columns.forEach(function(e){e.findAggregator&&e.findAggregator(a);}),this.having&&this.having.findAggregator&&this.having.findAggregator(a);},k.Select.prototype.compileSelectGroup1=function(r){var s="var r = {};";return this.columns.forEach(function(e){if(e instanceof k.Column&&"*"===e.columnid)return s+="for(var k in g) {r[k]=g[k]};","";var t=e.as;void 0===t&&(t=e instanceof k.Column?h(e.columnid):e.nick),r.groupColumns[t]=e.nick,s+="r['"+t+"']=",s+=l(e.toJS("g",""))+";";for(var n=0;n<r.removeKeys.length;n++)if(r.removeKeys[n]===t){r.removeKeys.splice(n,1);break}}),s},k.Select.prototype.compileSelectGroup2=function(n){var r=n.selectgfns;return this.columns.forEach(function(e){-1<n.ingroup.indexOf(e.nick)&&(r+="r['"+(e.as||e.nick)+"']=g['"+e.nick+"'];");}),this.orderColumns&&0<this.orderColumns.length&&this.orderColumns.forEach(function(e,t){t="$$$"+t;e instanceof k.Column&&n.groupColumns[e.columnid]?r+="r['"+t+"']=r['"+e.columnid+"'];":r+="r['"+t+"']="+e.toJS("g","")+";",n.removeKeys.push(t);}),new Function("g,params,alasql","var y;"+r+"return r")},k.Select.prototype.compileRemoveColumns=function(e){void 0!==this.removecolumns&&(e.removeKeys=e.removeKeys.concat(this.removecolumns.filter(function(e){return void 0===e.like}).map(function(e){return e.columnid})),e.removeLikeKeys=this.removecolumns.filter(function(e){return void 0!==e.like}).map(function(e){return e.like.value}));},k.Select.prototype.compileHaving=function(e){if(this.having){var t=this.having.toJS("g",-1);return e.havingfns=t,new Function("g,params,alasql","var y;return "+t)}return function(){return !0}},k.Select.prototype.compileOrder=function(a,i){var o=this;if(o.orderColumns=[],this.order){if(this.order&&1==this.order.length&&this.order[0].expression&&"function"==typeof this.order[0].expression){var n=this.order[0].expression,r="FIRST"==this.order[0].nullsOrder?-1:"LAST"==this.order[0].nullsOrder?1:0;return function(e,t){e=n(e),t=n(t);if(r){if(null==e)return null==t?0:r;if(null==t)return -r}return t<e?1:e==t?0:-1}}var u="",c="";return this.order.forEach(function(e,t){s=e.expression instanceof k.NumValue?o.columns[e.expression.value-1]:e.expression,o.orderColumns.push(s);var n,r,s="$$$"+t,t="";e.expression instanceof k.Column&&(n=e.expression.columnid,a.xcolumns[n]?"DATE"!=(r=a.xcolumns[n].dbtypeid)&&"DATETIME"!=r&&"DATETIME2"!=r||(t=".valueOf()"):bi.options.valueof&&(t=".valueOf()")),e.expression instanceof k.ParamValue&&(n=i[e.expression.param],a.xcolumns[n]?"DATE"!=(r=a.xcolumns[n].dbtypeid)&&"DATETIME"!=r&&"DATETIME2"!=r||(t=".valueOf()"):bi.options.valueof&&(t=".valueOf()")),e.nocase&&(t+=".toUpperCase()"),e.nullsOrder&&("FIRST"==e.nullsOrder?u+="if((a['"+s+"'] != null) && (b['"+s+"'] == null)) return 1;":"LAST"==e.nullsOrder&&(u+="if((a['"+s+"'] == null) && (b['"+s+"'] != null)) return 1;"),u+="if((a['"+s+"'] == null) == (b['"+s+"'] == null)) {",c+="}"),u+="if((a['"+s+"']||'')"+t+("ASC"==e.direction?">":"<")+"(b['"+s+"']||'')"+t+")return 1;",u+="if((a['"+s+"']||'')"+t+"==(b['"+s+"']||'')"+t+"){",c+="}";}),u+="return 0;",u+=c+"return -1",a.orderfns=u,new Function("a,b","var y;"+u)}},k.Select.prototype.compilePivot=function(e){var t=this,h=t.pivot.columnid,d=t.pivot.expr.aggregatorid,f=t.pivot.inlist,p=null;if(null==(p=(t.pivot.expr.expression.hasOwnProperty("columnid")?t.pivot.expr:t.pivot.expr.expression).expression.columnid))throw "columnid not found";return f=f&&f.map(function(e){return e.expr.columnid}),function(){var n=this,r=n.columns.filter(function(e){return e.columnid!=h&&e.columnid!=p}).map(function(e){return e.columnid}),s=[],a={},i={},o={},u=[];if(n.data.forEach(function(t){if(!f||-1<f.indexOf(t[h])){var e=r.map(function(e){return t[e]}).join("`"),n=i[e];if(n||(n={},i[e]=n,u.push(n),r.forEach(function(e){n[e]=t[e];})),o[e]||(o[e]={}),o[e][t[h]]?o[e][t[h]]++:o[e][t[h]]=1,a[t[h]]||(a[t[h]]=!0,s.push(t[h])),"SUM"==d||"AVG"==d)void 0===n[t[h]]&&(n[t[h]]=0),n[t[h]]+=+t[p];else if("COUNT"==d)void 0===n[t[h]]&&(n[t[h]]=0),n[t[h]]++;else if("MIN"==d)void 0===n[t[h]]&&(n[t[h]]=t[p]),t[p]<n[t[h]]&&(n[t[h]]=t[p]);else if("MAX"==d)void 0===n[t[h]]&&(n[t[h]]=t[p]),t[p]>n[t[h]]&&(n[t[h]]=t[p]);else if("FIRST"==d)void 0===n[t[h]]&&(n[t[h]]=t[p]);else if("LAST"==d)n[t[h]]=t[p];else {if(!bi.aggr[d])throw new Error("Wrong aggregator in PIVOT clause");bi.aggr[d](n[t[h]],t[p]);}}}),"AVG"==d)for(var e in i){var t,c=i[e];for(t in c)-1==r.indexOf(t)&&t!=p&&(c[t]=c[t]/o[e][t]);}n.data=u,f&&(s=f);var l=n.columns.filter(function(e){return e.columnid==p})[0];n.columns=n.columns.filter(function(e){return !(e.columnid==h||e.columnid==p)}),s.forEach(function(e){var t=m(l);t.columnid=e,n.columns.push(t);});}},k.Select.prototype.compileUnpivot=function(e){var a=this.unpivot.tocolumnid,i=this.unpivot.forcolumnid,t=this.unpivot.inlist.map(function(e){return e.columnid});return function(){var r=[],s=e.columns.map(function(e){return e.columnid}).filter(function(e){return -1==t.indexOf(e)&&e!=i&&e!=a});e.data.forEach(function(n){t.forEach(function(e){var t={};s.forEach(function(e){t[e]=n[e];}),t[i]=e,t[a]=n[e],r.push(t);});}),e.data=r;}};var F=function(e,t){for(var n=[],r=0,s=e.length,a=0;a<s+1;a++){for(var i,o=[],u=0;u<s;u++)i=e[u]instanceof k.Column?(e[u].nick=h(e[u].columnid),t.groupColumns[h(e[u].columnid)]=e[u].nick,e[u].nick+"\t"+e[u].toJS("p",t.sources[0].alias,t.defcols)):(t.groupColumns[h(e[u].toString())]=h(e[u].toString()),h(e[u].toString())+"\t"+e[u].toJS("p",t.sources[0].alias,t.defcols)),r&1<<u&&o.push(i);n.push(o),r=1+(r<<1);}return n},P=function(e,t){for(var n=[],r=e.length,s=1<<r,a=0;a<s;a++){for(var i=[],o=0;o<r;o++)a&1<<o&&(i=i.concat(V(e[o],t)));n.push(i);}return n},q=function(e,n){return e.reduce(function(e,t){return e=e.concat(V(t,n))},[])},G=function(e,t){for(var n=[],r=0;r<e.length;r++)for(var s=0;s<t.length;s++)n.push(e[r].concat(t[s]));return n};function V(t,n){if(Array.isArray(t)){for(var e=[[]],r=0;r<t.length;r++)if(t[r]instanceof k.Column)t[r].nick=t[r].nick?h(t[r].nick):h(t[r].columnid),n.groupColumns[t[r].nick]=t[r].nick,e=e.map(function(e){return e.concat(t[r].nick+"\t"+t[r].toJS("p",n.sources[0].alias,n.defcols))});else if(t[r]instanceof k.FuncValue)n.groupColumns[h(t[r].toString())]=h(t[r].toString()),e=e.map(function(e){return e.concat(h(t[r].toString())+"\t"+t[r].toJS("p",n.sources[0].alias,n.defcols))});else if(t[r]instanceof k.GroupExpression)if("ROLLUP"==t[r].type)e=G(e,F(t[r].group,n));else if("CUBE"==t[r].type)e=G(e,P(t[r].group,n));else {if("GROUPING SETS"!=t[r].type)throw new Error("Unknown grouping function");e=G(e,q(t[r].group,n));}else e=""===t[r]?[["1\t1"]]:e.map(function(e){return n.groupColumns[h(t[r].toString())]=h(t[r].toString()),e.concat(h(t[r].toString())+"\t"+t[r].toJS("p",n.sources[0].alias,n.defcols))});return e}return t instanceof k.FuncValue?(n.groupColumns[h(t.toString())]=h(t.toString()),[t.toString()+"\t"+t.toJS("p",n.sources[0].alias,n.defcols)]):t instanceof k.Column?(t.nick=h(t.columnid),n.groupColumns[t.nick]=t.nick,[t.nick+"\t"+t.toJS("p",n.sources[0].alias,n.defcols)]):(n.groupColumns[h(t.toString())]=h(t.toString()),[h(t.toString())+"\t"+t.toJS("p",n.sources[0].alias,n.defcols)])}k.Select.prototype.compileDefCols=function(e,r){var s={".":{}};return this.from&&this.from.forEach(function(e){if(s["."][e.as||e.tableid]=!0,e instanceof k.Table){var t=e.as||e.tableid,n=bi.databases[e.databaseid||r].tables[e.tableid];if(void 0===n)throw new Error("Table does not exist: "+e.tableid);n.columns&&n.columns.forEach(function(e){s[e.columnid]?s[e.columnid]="-":s[e.columnid]=t;});}else if(!(e instanceof k.Select||e instanceof k.Search||e instanceof k.ParamValue||e instanceof k.VarValue||e instanceof k.FuncValue||e instanceof k.FromData||e instanceof k.Json||e.inserted))throw new Error("Unknown type of FROM clause")}),this.joins&&this.joins.forEach(function(e){if(s["."][e.as||e.table.tableid]=!0,e.table){var t=e.table.tableid;e.as&&(t=e.as);var t=e.as||e.table.tableid,n=bi.databases[e.table.databaseid||r].tables[e.table.tableid];n.columns&&n.columns.forEach(function(e){s[e.columnid]?s[e.columnid]="-":s[e.columnid]=t;});}else if(!e.select&&!e.param&&!e.func)throw new Error("Unknown type of FROM clause")}),s},k.Union=function(e){return k.extend(this,e)},k.Union.prototype.toString=function(){return "UNION"},k.Union.prototype.compile=function(e){return null},k.Apply=function(e){return k.extend(this,e)},k.Apply.prototype.toString=function(){var e=this.applymode+" APPLY ("+this.select.toString()+")";return this.as&&(e+=" AS "+this.as),e},k.Over=function(e){return k.extend(this,e)},k.Over.prototype.toString=function(){var e="OVER (";return this.partition&&(e+="PARTITION BY "+this.partition.toString(),this.order&&(e+=" ")),this.order&&(e+="ORDER BY "+this.order.toString()),e+=")"},k.ExpressionStatement=function(e){return k.extend(this,e)},k.ExpressionStatement.prototype.toString=function(){return this.expression.toString()},k.ExpressionStatement.prototype.execute=function(e,t,n){if(this.expression){bi.precompile(this,e,t);t=new Function("params,alasql,p","var y;return "+this.expression.toJS("({})","",null)).bind(this)(t,bi);return t=n?n(t):t}},k.Expression=function(e){return k.extend(this,e)},k.Expression.prototype.toString=function(e){e=this.expression.toString(e);return this.order&&(e+=" "+this.order.toString()),this.nocase&&(e+=" COLLATE NOCASE"),this.direction&&(e+=" "+this.direction),e},k.Expression.prototype.findAggregator=function(e){this.expression.findAggregator&&this.expression.findAggregator(e);},k.Expression.prototype.toJS=function(e,t,n){return this.expression.reduced?"true":this.expression.toJS(e,t,n)},k.Expression.prototype.compile=function(e,t,n){return !!this.reduced||new Function("p","var y;return "+this.toJS(e,t,n))},k.JavaScript=function(e){return k.extend(this,e)},k.JavaScript.prototype.toString=function(){return "``"+this.value+"``"},k.JavaScript.prototype.toJS=function(){return "("+this.value+")"},k.JavaScript.prototype.execute=function(e,t,n){var r=1;return new Function("params,alasql,p",this.value)(t,bi),r=n?n(r):r},k.Literal=function(e){return k.extend(this,e)},k.Literal.prototype.toString=function(e){var t=this.value;return this.value1&&(t=this.value1+"."+t),this.alias&&!e&&(t+=" AS "+this.alias),t},k.Join=function(e){return k.extend(this,e)},k.Join.prototype.toString=function(){var e=" ";return this.joinmode&&(e+=this.joinmode+" "),e+="JOIN "+this.table.toString()},k.Table=function(e){return k.extend(this,e)},k.Table.prototype.toString=function(){var e=this.tableid;return e=this.databaseid?this.databaseid+"."+e:e},k.View=function(e){return k.extend(this,e)},k.View.prototype.toString=function(){var e=this.viewid;return e=this.databaseid?this.databaseid+"."+e:e},k.Op=function(e){return k.extend(this,e)},k.Op.prototype.toString=function(){if("IN"===this.op||"NOT IN"===this.op)return this.left.toString()+" "+this.op+" ("+this.right.toString()+")";if(this.allsome)return this.left.toString()+" "+this.op+" "+this.allsome+" ("+this.right.toString()+")";if("->"!==this.op&&"!"!==this.op)return "BETWEEN"!==this.op&&"NOT BETWEEN"!==this.op?this.left.toString()+" "+this.op+" "+(this.allsome?this.allsome+" ":"")+this.right.toString():this.left.toString()+" "+this.op+" "+this.right1.toString()+" AND "+this.right2.toString();var e=this.left.toString()+this.op;return "string"!=typeof this.right&&"number"!=typeof this.right&&(e+="("),e+=this.right.toString(),"string"!=typeof this.right&&"number"!=typeof this.right&&(e+=")"),e},k.Op.prototype.findAggregator=function(e){this.left&&this.left.findAggregator&&this.left.findAggregator(e),this.right&&this.right.findAggregator&&!this.allsome&&this.right.findAggregator(e);},k.Op.prototype.toType=function(e){if(-1<["-","*","/","%","^"].indexOf(this.op))return "number";if(-1<["||"].indexOf(this.op))return "string";if("+"===this.op){if("string"===this.left.toType(e)||"string"===this.right.toType(e))return "string";if("number"===this.left.toType(e)||"number"===this.right.toType(e))return "number"}return -1<["AND","OR","NOT","=","==","===","!=","!==","!===",">",">=","<","<=","IN","NOT IN","LIKE","NOT LIKE","REGEXP","GLOB"].indexOf(this.op)||"BETWEEN"===this.op||"NOT BETWEEN"===this.op||"IS NULL"===this.op||"IS NOT NULL"===this.op||this.allsome?"boolean":this.op?"unknown":this.left.toType()},k.Op.prototype.toJS=function(t,n,r){function e(e){return e.toJS&&(e=e.toJS(t,n,r)),"y["+(i.push(e)-1)+"]"}var s,a,i=[],o=this.op,u=this,c=function(){return e(u.left)},l=function(){return e(u.right)};if("="===this.op?o="===":"<>"===this.op?o="!=":"OR"===this.op&&(o="||"),"->"===this.op&&(s="("+c()+"||{})",a="string"==typeof this.right?s+'["'+this.right+'"]':"number"==typeof this.right?s+"["+this.right+"]":this.right instanceof k.FuncValue?(a=[],this.right.args&&0!==this.right.args.length&&(a=this.right.args.map(e)),s+"["+JSON.stringify(this.right.funcid)+"]("+a.join(",")+")"):s+"["+l()+"]"),"!"===this.op&&"string"==typeof this.right&&(a="alasql.databases[alasql.useid].objects["+c()+']["'+this.right+'"]'),"IS"===this.op&&(a="(("+c()+"==null) === ("+l()+"==null))"),"=="===this.op&&(a="alasql.utils.deepEqual("+c()+","+l()+")"),"==="!==this.op&&"!==="!==this.op||(a="("+("!==="===this.op?"!":"")+"(("+c()+").valueOf()===("+l()+").valueOf()))"),"!=="===this.op&&(a="(!alasql.utils.deepEqual("+c()+","+l()+"))"),"||"===this.op&&(a="(''+("+c()+"||'')+("+l()+'||""))'),"LIKE"!==this.op&&"NOT LIKE"!==this.op||(a="("+("NOT LIKE"===this.op?"!":"")+"alasql.utils.like("+l()+","+c(),this.escape&&(a+=","+e(this.escape)),a+="))"),"REGEXP"===this.op&&(a="alasql.stdfn.REGEXP_LIKE("+c()+","+l()+")"),"GLOB"===this.op&&(a="alasql.utils.glob("+c()+","+l()+")"),"BETWEEN"!==this.op&&"NOT BETWEEN"!==this.op||(s=c(),a="("+("NOT BETWEEN"===this.op?"!":"")+"(("+e(this.right1)+"<="+s+") && ("+s+"<="+e(this.right2)+")))"),"IN"===this.op&&(this.right instanceof k.Select?(a="(",a+="alasql.utils.flatArray(this.queriesfn["+this.queriesidx+"](params,null,"+t+"))",a+=".indexOf(",a+=c()+")>-1)"):a=Array.isArray(this.right)?"(["+this.right.map(e).join(",")+"].indexOf("+c()+")>-1)":"("+l()+".indexOf("+c()+")>-1)"),"NOT IN"===this.op&&(this.right instanceof k.Select?(a="(",a+="alasql.utils.flatArray(this.queriesfn["+this.queriesidx+"](params,null,p))",a+=".indexOf(",a+=c()+")<0)"):Array.isArray(this.right)?(a="(["+this.right.map(e).join(",")+"].indexOf(",a+=c()+")<0)"):(a="("+l()+".indexOf(",a+=c()+")==-1)")),"ALL"===this.allsome)if(this.right instanceof k.Select)a="alasql.utils.flatArray(this.query.queriesfn["+this.queriesidx+"](params,null,p))",a+=".every(function(b){return (",a+=c()+")"+o+"b})";else {if(!Array.isArray(this.right))throw new Error("NOT IN operator without SELECT");a=""+(1==this.right.length?e(this.right[0]):"["+this.right.map(e).join(",")+"]"),a+=".every(function(b){return (",a+=c()+")"+o+"b})";}if("SOME"===this.allsome||"ANY"===this.allsome)if(this.right instanceof k.Select)a="alasql.utils.flatArray(this.query.queriesfn["+this.queriesidx+"](params,null,p))",a+=".some(function(b){return (",a+=c()+")"+o+"b})";else {if(!Array.isArray(this.right))throw new Error("SOME/ANY operator without SELECT");a=""+(1==this.right.length?e(this.right[0]):"["+this.right.map(e).join(",")+"]"),a+=".some(function(b){return (",a+=c()+")"+o+"b})";}if("AND"===this.op){if(this.left.reduced){if(this.right.reduced)return "true";a=l();}else this.right.reduced&&(a=c());o="&&";}c=a||"("+c()+o+l()+")",l="y=[("+i.join("), (")+")]";return "&&"===o||"||"===o||"IS"===o||"IS NULL"===o||"IS NOT NULL"===o?"("+l+", "+c+")":"("+l+", y.some(function(e){return e == null}) ? void 0 : "+c+")"},k.VarValue=function(e){return k.extend(this,e)},k.VarValue.prototype.toString=function(){return "@"+this.variable},k.VarValue.prototype.toType=function(){return "unknown"},k.VarValue.prototype.toJS=function(){return "alasql.vars['"+this.variable+"']"},k.NumValue=function(e){return k.extend(this,e)},k.NumValue.prototype.toString=function(){return this.value.toString()},k.NumValue.prototype.toType=function(){return "number"},k.NumValue.prototype.toJS=function(){return ""+this.value},k.StringValue=function(e){return k.extend(this,e)},k.StringValue.prototype.toString=function(){return "'"+this.value.toString()+"'"},k.StringValue.prototype.toType=function(){return "string"},k.StringValue.prototype.toJS=function(){return "'"+h(this.value)+"'"},k.DomainValueValue=function(e){return k.extend(this,e)},k.DomainValueValue.prototype.toString=function(){return "VALUE"},k.DomainValueValue.prototype.toType=function(){return "object"},k.DomainValueValue.prototype.toJS=function(e,t,n){return e},k.ArrayValue=function(e){return k.extend(this,e)},k.ArrayValue.prototype.toString=function(){return "ARRAY[]"},k.ArrayValue.prototype.toType=function(){return "object"},k.ArrayValue.prototype.toJS=function(t,n,r){return "[("+this.value.map(function(e){return e.toJS(t,n,r)}).join("), (")+")]"},k.LogicValue=function(e){return k.extend(this,e)},k.LogicValue.prototype.toString=function(){return this.value?"TRUE":"FALSE"},k.LogicValue.prototype.toType=function(){return "boolean"},k.LogicValue.prototype.toJS=function(){return this.value?"true":"false"},k.NullValue=function(e){return k.extend(this,e)},k.NullValue.prototype.toString=function(){return "NULL"},k.NullValue.prototype.toJS=function(){return "undefined"},k.ParamValue=function(e){return k.extend(this,e)},k.ParamValue.prototype.toString=function(){return "$"+this.param},k.ParamValue.prototype.toJS=function(){return "string"==typeof this.param?"params['"+this.param+"']":"params["+this.param+"]"},k.UniOp=function(e){return k.extend(this,e)},k.UniOp.prototype.toString=function(){var e=void 0;return "~"===this.op&&(e=this.op+this.right.toString()),"-"===this.op&&(e=this.op+this.right.toString()),"+"===this.op&&(e=this.op+this.right.toString()),"#"===this.op&&(e=this.op+this.right.toString()),"NOT"===this.op&&(e=this.op+"("+this.right.toString()+")"),e=(e=null===this.op?"("+this.right.toString()+")":e)||"("+this.right.toString()+")"},k.UniOp.prototype.findAggregator=function(e){this.right.findAggregator&&this.right.findAggregator(e);},k.UniOp.prototype.toType=function(){return "-"===this.op||"+"===this.op?"number":"NOT"===this.op?"boolean":void 0},k.UniOp.prototype.toJS=function(e,t,n){return "~"===this.op?"(~("+this.right.toJS(e,t,n)+"))":"-"===this.op?"(-("+this.right.toJS(e,t,n)+"))":"+"===this.op?"("+this.right.toJS(e,t,n)+")":"NOT"===this.op?"!("+this.right.toJS(e,t,n)+")":"#"===this.op?this.right instanceof k.Column?"(alasql.databases[alasql.useid].objects['"+this.right.columnid+"'])":"(alasql.databases[alasql.useid].objects["+this.right.toJS(e,t,n)+"])":null==this.op?"("+this.right.toJS(e,t,n)+")":void 0},k.Column=function(e){return k.extend(this,e)},k.Column.prototype.toString=function(e){var t=this.columnid==+this.columnid?"["+this.columnid+"]":this.columnid;return this.tableid&&(t=+this.columnid===this.columnid?this.tableid+t:this.tableid+"."+t,this.databaseid&&(t=this.databaseid+"."+t)),this.alias&&!e&&(t+=" AS "+this.alias),t},k.Column.prototype.toJS=function(e,t,n){var r="";if(this.tableid||""!==t||n)if("g"===e)r="g['"+this.nick+"']";else if(this.tableid)r="_"!==this.columnid?e+"['"+this.tableid+"']['"+this.columnid+"']":"g"===e?"g['_']":e+"['"+this.tableid+"']";else if(n){n=n[this.columnid];if("-"===n)throw new Error('Cannot resolve column "'+this.columnid+'" because it exists in two source tables');r=n?"_"!==this.columnid?e+"['"+n+"']['"+this.columnid+"']":e+"['"+n+"']":"_"!==this.columnid?e+"['"+(this.tableid||t)+"']['"+this.columnid+"']":e+"['"+(this.tableid||t)+"']";}else r=-1===t?e+"['"+this.columnid+"']":"_"!==this.columnid?e+"['"+(this.tableid||t)+"']['"+this.columnid+"']":e+"['"+(this.tableid||t)+"']";else r="_"!==this.columnid?e+"['"+this.columnid+"']":"g"===e?"g['_']":e;return r},k.AggrValue=function(e){return k.extend(this,e)},k.AggrValue.prototype.toString=function(e){var t="";return "REDUCE"===this.aggregatorid?t+=this.funcid.replace(B,"")+"(":t+=this.aggregatorid+"(",this.distinct&&(t+="DISTINCT "),this.expression&&(t+=this.expression.toString()),t+=")",this.over&&(t+=" "+this.over.toString()),this.alias&&!e&&(t+=" AS "+this.alias),t},k.AggrValue.prototype.findAggregator=function(e){var t=h(this.toString())+":"+e.selectGroup.length;if(!(n=!1)){if(!this.nick){this.nick=t;for(var n=!1,r=0;r<e.removeKeys.length;r++)if(e.removeKeys[r]===t){n=!0;break}n||e.removeKeys.push(t);}e.selectGroup.push(this);}},k.AggrValue.prototype.toType=function(){return -1<["SUM","COUNT","AVG","MIN","MAX","AGGR","VAR","STDDEV"].indexOf(this.aggregatorid)?"number":-1<["ARRAY"].indexOf(this.aggregatorid)?"array":-1<["FIRST","LAST"].indexOf(this.aggregatorid)?this.expression.toType():void 0},k.AggrValue.prototype.toJS=function(){var e=this.nick;return "g['"+(e=void 0===e?this.toString():e)+"']"},k.OrderExpression=function(e){return k.extend(this,e)},k.OrderExpression.prototype.toString=k.Expression.prototype.toString,k.GroupExpression=function(e){return k.extend(this,e)},k.GroupExpression.prototype.toString=function(){return this.type+"("+this.group.toString()+")"},k.FromData=function(e){return k.extend(this,e)},k.FromData.prototype.toString=function(){return this.data?"DATA("+(1e16*Math.random()|0)+")":"?"},k.FromData.prototype.toJS=function(){},k.Select.prototype.exec=function(e,t){this.preparams&&(e=this.preparams.concat(e));var n=bi.useid,r=bi.databases[n],s=this.toString(),a=b(s),n=this.compile(n);if(n)return n.sql=s,n.dbversion=r.dbversion,r.sqlCacheSize>bi.MAXSQLCACHESIZE&&r.resetSqlCache(),r.sqlCacheSize++,r.sqlCache[a]=n,bi.res=n(e,t)},k.Select.prototype.Select=function(){var n=this,e=[];if(1<arguments.length)e=Array.prototype.slice.call(arguments);else {if(1!=arguments.length)throw new Error("Wrong number of arguments of Select() function");e=Array.isArray(arguments[0])?arguments[0]:[arguments[0]];}return n.columns=[],e.forEach(function(e){var t;"string"==typeof e?n.columns.push(new k.Column({columnid:e})):"function"==typeof e&&(t=0,n.preparams?t=n.preparams.length:n.preparams=[],n.preparams.push(e),n.columns.push(new k.Column({columnid:"*",func:e,param:t})));}),n},k.Select.prototype.From=function(e){var t=this;if(t.from||(t.from=[]),Array.isArray(e)){var n=0;t.preparams?n=t.preparams.length:t.preparams=[],t.preparams.push(e),t.from.push(new k.ParamValue({param:n}));}else {if("string"!=typeof e)throw new Error("Unknown arguments in From() function");t.from.push(new k.Table({tableid:e}));}return t},k.Select.prototype.OrderBy=function(){var n=this,e=[];if(n.order=[],0==arguments.length)e=["_"];else if(1<arguments.length)e=Array.prototype.slice.call(arguments);else {if(1!=arguments.length)throw new Error("Wrong number of arguments of Select() function");e=Array.isArray(arguments[0])?arguments[0]:[arguments[0]];}return 0<e.length&&e.forEach(function(e){var t=new k.Column({columnid:e});"function"==typeof e&&(t=e),n.order.push(new k.OrderExpression({expression:t,direction:"ASC"}));}),n},k.Select.prototype.Top=function(e){return this.top=new k.NumValue({value:e}),this},k.Select.prototype.GroupBy=function(){var t=this,e=[];if(1<arguments.length)e=Array.prototype.slice.call(arguments);else {if(1!=arguments.length)throw new Error("Wrong number of arguments of Select() function");e=Array.isArray(arguments[0])?arguments[0]:[arguments[0]];}return t.group=[],e.forEach(function(e){e=new k.Column({columnid:e});t.group.push(e);}),t},k.Select.prototype.Where=function(e){return "function"==typeof e&&(this.where=e),this},k.FuncValue=function(e){return k.extend(this,e)};var B=/[^0-9A-Z_$]+/i;k.FuncValue.prototype.toString=function(e){var t="";return bi.fn[this.funcid]||bi.aggr[this.funcid]?t+=this.funcid:(bi.stdlib[this.funcid.toUpperCase()]||bi.stdfn[this.funcid.toUpperCase()])&&(t+=this.funcid.toUpperCase().replace(B,"")),"CURRENT_TIMESTAMP"!==this.funcid&&(t+="(",this.args&&0<this.args.length&&(t+=this.args.map(function(e){return e.toString()}).join(",")),t+=")"),this.as&&!e&&(t+=" AS "+this.as.toString()),t},k.FuncValue.prototype.execute=function(e,t,n){var r=1;return bi.precompile(this,e,t),new Function("params,alasql","var y;return "+this.toJS("","",null))(t,bi),r=n?n(r):r},k.FuncValue.prototype.findAggregator=function(t){this.args&&0<this.args.length&&this.args.forEach(function(e){e.findAggregator&&e.findAggregator(t);});},k.FuncValue.prototype.toJS=function(t,n,r){var e="",s=this.funcid;return !bi.fn[s]&&bi.stdlib[s.toUpperCase()]?this.args&&0<this.args.length?e+=bi.stdlib[s.toUpperCase()].apply(this,this.args.map(function(e){return e.toJS(t,n)})):e+=bi.stdlib[s.toUpperCase()]():(!bi.fn[s]&&bi.stdfn[s.toUpperCase()]?(this.newid&&(e+="new "),e+="alasql.stdfn["+JSON.stringify(this.funcid.toUpperCase())+"](",this.args&&0<this.args.length&&(e+=this.args.map(function(e){return e.toJS(t,n,r)}).join(","))):(this.newid&&(e+="new "),e+="alasql.fn["+JSON.stringify(this.funcid)+"](",this.args&&0<this.args.length&&(e+=this.args.map(function(e){return e.toJS(t,n,r)}).join(","))),e+=")"),e};R=bi.stdlib={},I=bi.stdfn={};R.ABS=function(e){return "Math.abs("+e+")"},R.CLONEDEEP=function(e){return "alasql.utils.cloneDeep("+e+")"},I.CONCAT=function(){return Array.prototype.slice.call(arguments).join("")},R.EXP=function(e){return "Math.pow(Math.E,"+e+")"},R.IIF=function(e,t,n){if(3==arguments.length)return "(("+e+")?("+t+"):("+n+"))";throw new Error("Number of arguments of IFF is not equals to 3")},R.IFNULL=function(e,t){return "("+e+"||"+t+")"},R.INSTR=function(e,t){return "(("+e+").indexOf("+t+")+1)"},R.LEN=R.LENGTH=function(e){return r(e,"y.length")},R.LOWER=R.LCASE=function(e){return r(e,"String(y).toLowerCase()")},R.LTRIM=function(e){return r(e,'y.replace(/^[ ]+/,"")')},R.RTRIM=function(e){return r(e,'y.replace(/[ ]+$/,"")')},R.MAX=R.GREATEST=function(){return "["+Array.prototype.join.call(arguments,",")+"].reduce(function (a, b) { return a > b ? a : b; })"},R.MIN=R.LEAST=function(){return "["+Array.prototype.join.call(arguments,",")+"].reduce(function (a, b) { return a < b ? a : b; })"},R.SUBSTRING=R.SUBSTR=R.MID=function(e,t,n){return 2==arguments.length?r(e,"y.substr("+t+"-1)"):3==arguments.length?r(e,"y.substr("+t+"-1,"+n+")"):void 0},I.REGEXP_LIKE=function(e,t,n){return -1<(e||"").search(RegExp(t,n))},R.ISNULL=R.NULLIF=function(e,t){return "("+e+"=="+t+"?undefined:"+e+")"},R.POWER=function(e,t){return "Math.pow("+e+","+t+")"},R.RANDOM=function(e){return 0==arguments.length?"Math.random()":"(Math.random()*("+e+")|0)"},R.ROUND=function(e,t){return 2==arguments.length?"Math.round(("+e+")*Math.pow(10,("+t+")))/Math.pow(10,("+t+"))":"Math.round("+e+")"},R.CEIL=R.CEILING=function(e){return "Math.ceil("+e+")"},R.FLOOR=function(e){return "Math.floor("+e+")"},R.ROWNUM=function(){return "1"},R.ROW_NUMBER=function(){return "1"},R.SQRT=function(e){return "Math.sqrt("+e+")"},R.TRIM=function(e){return r(e,"y.trim()")},R.UPPER=R.UCASE=function(e){return r(e,"String(y).toUpperCase()")},I.CONCAT_WS=function(){var e=Array.prototype.slice.call(arguments);return e.slice(1,e.length).join(e[0])},bi.aggr.GROUP_CONCAT=function(e,t,n){return 1===n?""+e:2===n?t+=","+e:t},bi.aggr.MEDIAN=function(e,t,n){if(2===n)return null!==e&&t.push(e),t;if(1===n)return null===e?[]:[e];if(!t.length)return t;n=t.sort(function(e,t){return e===t?0:t<e?1:-1}),e=(n.length+1)/2;if(Number.isInteger(e))return n[e-1];t=n[Math.floor(e-1)];return "number"==typeof t||t instanceof Number?(t+n[Math.ceil(e-1)])/2:t},bi.aggr.QUART=function(e,t,n,r){if(2===n)return null!==e&&t.push(e),t;if(1===n)return null===e?[]:[e];if(!t.length)return t;r=r||1;t=t.sort(function(e,t){return e===t?0:t<e?1:-1}),r=r*(t.length+1)/4;return Number.isInteger(r)?t[r-1]:t[Math.floor(r)]},bi.aggr.QUART2=function(e,t,n){return bi.aggr.QUART(e,t,n,2)},bi.aggr.QUART3=function(e,t,n){return bi.aggr.QUART(e,t,n,3)},bi.aggr.VAR=function(e,t,n){if(1===n)return null===e?{arr:[],sum:0}:{arr:[e],sum:e};if(2===n)return null===e||(t.arr.push(e),t.sum+=e),t;for(var r=t.arr.length,s=t.sum/r,a=0,i=0;i<r;i++)a+=(t.arr[i]-s)*(t.arr[i]-s);return a/=r-1},bi.aggr.STDEV=function(e,t,n){return 1===n||2===n?bi.aggr.VAR(e,t,n):Math.sqrt(bi.aggr.VAR(e,t,n))},bi.aggr.VARP=function(e,t,n){if(1==n)return {arr:[e],sum:e};if(2==n)return t.arr.push(e),t.sum+=e,t;for(var r=t.arr.length,s=t.sum/r,a=0,i=0;i<r;i++)a+=(t.arr[i]-s)*(t.arr[i]-s);return a/=r},bi.aggr.STD=bi.aggr.STDDEV=bi.aggr.STDEVP=function(e,t,n){return 1==n||2==n?bi.aggr.VARP(e,t,n):Math.sqrt(bi.aggr.VARP(e,t,n))},bi._aggrOriginal=bi.aggr,bi.aggr={},Object.keys(bi._aggrOriginal).forEach(function(r){bi.aggr[r]=function(e,t,n){if(3!==n||void 0!==t)return bi._aggrOriginal[r].apply(null,arguments)};}),I.REPLACE=function(e,t,n){return (e||"").split(t).join(n)};for(var j=[],J=0;J<256;J++)j[J]=(J<16?"0":"")+J.toString(16);I.NEWID=I.UUID=I.GEN_RANDOM_UUID=function(){var e=4294967295*Math.random()|0,t=4294967295*Math.random()|0,n=4294967295*Math.random()|0,r=4294967295*Math.random()|0;return j[255&e]+j[e>>8&255]+j[e>>16&255]+j[e>>24&255]+"-"+j[255&t]+j[t>>8&255]+"-"+j[t>>16&15|64]+j[t>>24&255]+"-"+j[63&n|128]+j[n>>8&255]+"-"+j[n>>16&255]+j[n>>24&255]+j[255&r]+j[r>>8&255]+j[r>>16&255]+j[r>>24&255]},k.CaseValue=function(e){return k.extend(this,e)},k.CaseValue.prototype.toString=function(){var e="CASE ";return this.expression&&(e+=this.expression.toString()),this.whens&&(e+=this.whens.map(function(e){return " WHEN "+e.when.toString()+" THEN "+e.then.toString()}).join()),e+=" END"},k.CaseValue.prototype.findAggregator=function(t){this.expression&&this.expression.findAggregator&&this.expression.findAggregator(t),this.whens&&0<this.whens.length&&this.whens.forEach(function(e){e.when.findAggregator&&e.when.findAggregator(t),e.then.findAggregator&&e.then.findAggregator(t);}),this.elses&&this.elses.findAggregator&&this.elses.findAggregator(t);},k.CaseValue.prototype.toJS=function(t,n,r){var e="((function("+t+",params,alasql){var y,r;";return this.expression?(e+="v="+this.expression.toJS(t,n,r)+";",e+=(this.whens||[]).map(function(e){return " if(v=="+e.when.toJS(t,n,r)+") {r="+e.then.toJS(t,n,r)+"}"}).join(" else ")):e+=(this.whens||[]).map(function(e){return " if("+e.when.toJS(t,n,r)+") {r="+e.then.toJS(t,n,r)+"}"}).join(" else "),this.elses&&(e+=" else {r="+this.elses.toJS(t,n,r)+"}"),e+=";return r;}).bind(this))("+t+",params,alasql)"},k.Json=function(e){return k.extend(this,e)},k.Json.prototype.toString=function(){var e="";return e+=Y(this.value),e+=""};var Y=bi.utils.JSONtoString=function(e){var t="";if("string"==typeof e)t='"'+e+'"';else if("number"==typeof e)t=e;else if("boolean"==typeof e)t=e;else {if("object"!=typeof e)throw new Error("2Can not show JSON object "+JSON.stringify(e));if(Array.isArray(e))t+="["+e.map(function(e){return Y(e)}).join(",")+"]";else if(!e.toJS||e instanceof k.Json){var n,t="{",r=[];for(n in e){var s="";if("string"==typeof n)s+='"'+n+'"';else if("number"==typeof n)s+=n;else {if("boolean"!=typeof n)throw new Error("THis is not ES6... no expressions on left side yet");s+=n;}s+=":"+Y(e[n]),r.push(s);}t+=r.join(",")+"}";}else {if(!e.toString)throw new Error("1Can not show JSON object "+JSON.stringify(e));t=e.toString();}}return t};function W(e,t,n,r){var s="";if("string"==typeof e)s='"'+e+'"';else if("number"==typeof e)s="("+e+")";else if("boolean"==typeof e)s=e;else {if("object"!=typeof e)throw new Error("2Can not parse JSON object "+JSON.stringify(e));if(Array.isArray(e))s+="["+e.map(function(e){return W(e,t,n,r)}).join(",")+"]";else if(!e.toJS||e instanceof k.Json){var a,s="{",i=[];for(a in e){var o="";if("string"==typeof a)o+='"'+a+'"';else if("number"==typeof a)o+=a;else {if("boolean"!=typeof a)throw new Error("THis is not ES6... no expressions on left side yet");o+=a;}o+=":"+W(e[a],t,n,r),i.push(o);}s+=i.join(",")+"}";}else {if(!e.toJS)throw new Error("1Can not parse JSON object "+JSON.stringify(e));s=e.toJS(t,n,r);}}return s}k.Json.prototype.toJS=function(e,t,n){return W(this.value,e,t,n)},k.Convert=function(e){return k.extend(this,e)},k.Convert.prototype.toString=function(){var e="CONVERT(";return e+=this.dbtypeid,void 0!==this.dbsize&&(e+="("+this.dbsize,this.dbprecision&&(e+=","+this.dbprecision),e+=")"),e+=","+this.expression.toString(),this.style&&(e+=","+this.style),e+=")"},k.Convert.prototype.toJS=function(e,t,n){return "alasql.stdfn.CONVERT("+this.expression.toJS(e,t,n)+',{dbtypeid:"'+this.dbtypeid+'",dbsize:'+this.dbsize+",dbprecision:"+this.dbprecision+",style:"+this.style+"})"},bi.stdfn.CONVERT=function(e,t){var n=e;if(t.style){var r=/\d{8}/.test(n)?new Date(+n.substr(0,4),+n.substr(4,2)-1,+n.substr(6,2)):new Date(n);switch(t.style){case 1:n=("0"+(r.getMonth()+1)).substr(-2)+"/"+("0"+r.getDate()).substr(-2)+"/"+("0"+r.getYear()).substr(-2);break;case 2:n=("0"+r.getYear()).substr(-2)+"."+("0"+(r.getMonth()+1)).substr(-2)+"."+("0"+r.getDate()).substr(-2);break;case 3:n=("0"+r.getDate()).substr(-2)+"/"+("0"+(r.getMonth()+1)).substr(-2)+"/"+("0"+r.getYear()).substr(-2);break;case 4:n=("0"+r.getDate()).substr(-2)+"."+("0"+(r.getMonth()+1)).substr(-2)+"."+("0"+r.getYear()).substr(-2);break;case 5:n=("0"+r.getDate()).substr(-2)+"-"+("0"+(r.getMonth()+1)).substr(-2)+"-"+("0"+r.getYear()).substr(-2);break;case 6:n=("0"+r.getDate()).substr(-2)+" "+r.toString().substr(4,3).toLowerCase()+" "+("0"+r.getYear()).substr(-2);break;case 7:n=r.toString().substr(4,3)+" "+("0"+r.getDate()).substr(-2)+","+("0"+r.getYear()).substr(-2);break;case 8:case 108:n=("0"+r.getHours()).substr(-2)+":"+("0"+r.getMinutes()).substr(-2)+":"+("0"+r.getSeconds()).substr(-2);break;case 10:n=("0"+(r.getMonth()+1)).substr(-2)+"-"+("0"+r.getDate()).substr(-2)+"-"+("0"+r.getYear()).substr(-2);break;case 11:n=("0"+r.getYear()).substr(-2)+"/"+("0"+(r.getMonth()+1)).substr(-2)+"/"+("0"+r.getDate()).substr(-2);break;case 12:n=("0"+r.getYear()).substr(-2)+("0"+(r.getMonth()+1)).substr(-2)+("0"+r.getDate()).substr(-2);break;case 101:n=("0"+(r.getMonth()+1)).substr(-2)+"/"+("0"+r.getDate()).substr(-2)+"/"+r.getFullYear();break;case 102:n=r.getFullYear()+"."+("0"+(r.getMonth()+1)).substr(-2)+"."+("0"+r.getDate()).substr(-2);break;case 103:n=("0"+r.getDate()).substr(-2)+"/"+("0"+(r.getMonth()+1)).substr(-2)+"/"+r.getFullYear();break;case 104:n=("0"+r.getDate()).substr(-2)+"."+("0"+(r.getMonth()+1)).substr(-2)+"."+r.getFullYear();break;case 105:n=("0"+r.getDate()).substr(-2)+"-"+("0"+(r.getMonth()+1)).substr(-2)+"-"+r.getFullYear();break;case 106:n=("0"+r.getDate()).substr(-2)+" "+r.toString().substr(4,3).toLowerCase()+" "+r.getFullYear();break;case 107:n=r.toString().substr(4,3)+" "+("0"+r.getDate()).substr(-2)+","+r.getFullYear();break;case 110:n=("0"+(r.getMonth()+1)).substr(-2)+"-"+("0"+r.getDate()).substr(-2)+"-"+r.getFullYear();break;case 111:n=r.getFullYear()+"/"+("0"+(r.getMonth()+1)).substr(-2)+"/"+("0"+r.getDate()).substr(-2);break;case 112:n=r.getFullYear()+("0"+(r.getMonth()+1)).substr(-2)+("0"+r.getDate()).substr(-2);break;default:throw new Error("The CONVERT style "+t.style+" is not realized yet.")}}e=t.dbtypeid.toUpperCase();if("Date"==t.dbtypeid)return new Date(n);if("DATE"==e)return a=(s=new Date(n)).getFullYear()+"."+("0"+(s.getMonth()+1)).substr(-2)+"."+("0"+s.getDate()).substr(-2);if("DATETIME"==e||"DATETIME2"==e){var s,a=(s=new Date(n)).getFullYear()+"."+("0"+(s.getMonth()+1)).substr(-2)+"."+("0"+s.getDate()).substr(-2);return a+=" "+("0"+s.getHours()).substr(-2)+":"+("0"+s.getMinutes()).substr(-2)+":"+("0"+s.getSeconds()).substr(-2),a+="."+("00"+s.getMilliseconds()).substr(-3)}if(-1<["MONEY"].indexOf(e))return (0|(i=+n))+100*i%100/100;if(-1<["BOOLEAN"].indexOf(e))return !!n;if(-1<["INT","INTEGER","SMALLINT","BIGINT","SERIAL","SMALLSERIAL","BIGSERIAL"].indexOf(t.dbtypeid.toUpperCase()))return 0|n;if(-1<["STRING","VARCHAR","NVARCHAR","CHARACTER VARIABLE"].indexOf(t.dbtypeid.toUpperCase()))return t.dbsize?(""+n).substr(0,t.dbsize):""+n;if(-1<["CHAR","CHARACTER","NCHAR"].indexOf(e))return (n+new Array(t.dbsize+1).join(" ")).substr(0,t.dbsize);if(-1<["NUMBER","FLOAT","DECIMAL","NUMERIC"].indexOf(e)){var i=+n;return i=void 0!==t.dbsize?parseFloat(i.toPrecision(t.dbsize)):i,i=void 0!==t.dbprecision?parseFloat(i.toFixed(t.dbprecision)):i}if(-1<["JSON"].indexOf(e)){if("object"==typeof n)return n;try{return JSON.parse(n)}catch(e){throw new Error("Cannot convert string to JSON")}}return n},k.ColumnDef=function(e){return k.extend(this,e)},k.ColumnDef.prototype.toString=function(){var e=this.columnid;return this.dbtypeid&&(e+=" "+this.dbtypeid),this.dbsize&&(e+="("+this.dbsize,this.dbprecision&&(e+=","+this.dbprecision),e+=")"),this.primarykey&&(e+=" PRIMARY KEY"),this.notnull&&(e+=" NOT NULL"),e},k.CreateTable=function(e){return k.extend(this,e)},k.CreateTable.prototype.toString=function(){var e="CREATE";return this.temporary&&(e+=" TEMPORARY"),this.view?e+=" VIEW":e+=" "+(this.class?"CLASS":"TABLE"),this.ifnotexists&&(e+=" IF  NOT EXISTS"),e+=" "+this.table.toString(),this.viewcolumns&&(e+="("+this.viewcolumns.map(function(e){return e.toString()}).join(",")+")"),this.as?e+=" AS "+this.as:e+=" ("+this.columns.map(function(e){return e.toString()}).join(",")+")",this.view&&this.select&&(e+=" AS "+this.select.toString()),e},k.CreateTable.prototype.execute=function(f,p,e){var t=bi.databases[this.table.databaseid||f],n=this.table.tableid;if(!n)throw new Error("Table name is not defined");var r=this.columns,s=this.constraints||[];if(this.ifnotexists&&t.tables[n])return e?e(0):0;if(t.tables[n])throw new Error("Can not create table '"+n+"', because it already exists in the database '"+t.databaseid+"'");var c=t.tables[n]=new bi.Table;this.class&&(c.isclass=!0);var a,i,o=[],u=[];return r&&r.forEach(function(n){var e=n.dbtypeid;bi.fn[e]||(e=e.toUpperCase()),-1<["SERIAL","SMALLSERIAL","BIGSERIAL"].indexOf(e)&&(n.identity={value:1,step:1});var t,e={columnid:n.columnid,dbtypeid:e,dbsize:n.dbsize,dbprecision:n.dbprecision,notnull:n.notnull,identity:n.identity};if(n.identity&&(c.identities[n.columnid]={value:+n.identity.value,step:+n.identity.step}),n.check&&c.checks.push({id:n.check.constrantid,fn:new Function("r","var y;return "+n.check.expression.toJS("r",""))}),n.default&&o.push("'"+n.columnid+"':"+n.default.toJS("r","")),n.primarykey&&((t=c.pk={}).columns=[n.columnid],t.onrightfns="r['"+n.columnid+"']",t.onrightfn=new Function("r","var y;return "+t.onrightfns),t.hh=b(t.onrightfns),c.uniqs[t.hh]={}),n.unique&&(t={},c.uk=c.uk||[],c.uk.push(t),t.columns=[n.columnid],t.onrightfns="r['"+n.columnid+"']",t.onrightfn=new Function("r","var y;return "+t.onrightfns),t.hh=b(t.onrightfns),c.uniqs[t.hh]={}),n.foreignkey){var r=n.foreignkey.table,s=bi.databases[r.databaseid||f].tables[r.tableid];if(void 0===r.columnid){if(!(s.pk.columns&&0<s.pk.columns.length))throw new Error("FOREIGN KEY allowed only to tables with PRIMARY KEYs");r.columnid=s.pk.columns[0];}c.checks.push({fn:function(e){var t={};if(void 0===e[n.columnid])return !0;t[r.columnid]=e[n.columnid];t=s.pk.onrightfn(t);if(!s.uniqs[s.pk.hh][t])throw new Error("Foreign key violation");return !0}});}n.onupdate&&u.push("r['"+n.columnid+"']="+n.onupdate.toJS("r","")),c.columns.push(e),c.xcolumns[e.columnid]=e;}),c.defaultfns=o.join(","),c.onupdatefns=u.join(";"),s.forEach(function(e){var t;if("PRIMARY KEY"===e.type){if(c.pk)throw new Error("Primary key already exists");var n=c.pk={};n.columns=e.columns,n.onrightfns=n.columns.map(function(e){return "r['"+e+"']"}).join("+'`'+"),n.onrightfn=new Function("r","var y;return "+n.onrightfns),n.hh=b(n.onrightfns),c.uniqs[n.hh]={};}else if("CHECK"===e.type)t=new Function("r","var y;return "+e.expression.toJS("r",""));else if("UNIQUE"===e.type){var r={};c.uk=c.uk||[],c.uk.push(r),r.columns=e.columns,r.onrightfns=r.columns.map(function(e){return "r['"+e+"']"}).join("+'`'+"),r.onrightfn=new Function("r","var y;return "+r.onrightfns),r.hh=b(r.onrightfns),c.uniqs[r.hh]={};}else if("FOREIGN KEY"===e.type){var s=e.fktable;e.fkcolumns&&0<e.fkcolumns.length&&(s.fkcolumns=e.fkcolumns);r=bi.databases[s.databaseid||f].tables[s.tableid];if(void 0===s.fkcolumns&&(s.fkcolumns=r.pk.columns),s.columns=e.columns,s.fkcolumns.length>s.columns.length)throw new Error("Invalid foreign key on table "+c.tableid);t=function(n){var r={};if(s.fkcolumns.forEach(function(e,t){null!=n[s.columns[t]]&&(r[e]=n[s.columns[t]]);}),0===Object.keys(r).length)return !0;if(Object.keys(r).length!==s.columns.length)throw new Error("Invalid foreign key on table "+c.tableid);var e=bi.databases[s.databaseid||f].tables[s.tableid],t=e.pk.onrightfn(r);if(!e.uniqs[e.pk.hh][t])throw new Error("Foreign key violation");return !0};}t&&c.checks.push({fn:t,id:e.constraintid,fk:"FOREIGN KEY"===e.type});}),this.view&&this.viewcolumns&&(a=this).viewcolumns.forEach(function(e,t){a.select.columns[t].as=e.columnid;}),this.view&&this.select&&(c.view=!0,c.select=this.select.compile(this.table.databaseid||f)),t.engineid?bi.engines[t.engineid].createTable(this.table.databaseid||f,n,this.ifnotexists,e):(c.insert=function(n,r){var e=bi.inserted;bi.inserted=[n];var s=this,a=!1,t=!1;for(d in s.beforeinsert)(i=s.beforeinsert[d])&&(i.funcid?!1===bi.fn[i.funcid](n)&&(t=t||!0):i.statement&&!1===i.statement.execute(f)&&(t=t||!0));if(!t){var i,o=!1;for(d in s.insteadofinsert)o=!0,(i=s.insteadofinsert[d])&&(i.funcid?bi.fn[i.funcid](n):i.statement&&i.statement.execute(f));if(!o){for(var u in s.identities){var c=s.identities[u];n[u]=c.value;}if(s.checks&&0<s.checks.length&&s.checks.forEach(function(e){if(!e.fn(n))throw new Error("Violation of CHECK constraint "+(e.id||""))}),s.columns.forEach(function(e){if(e.notnull&&void 0===n[e.columnid])throw new Error("Wrong NULL value in NOT NULL column "+e.columnid)}),s.pk){var l,h=(l=s.pk).onrightfn(n);if(void 0!==s.uniqs[l.hh][h]){if(!r)throw new Error("Cannot insert record, because it already exists in primary key index");a=s.uniqs[l.hh][h];}}if(s.uk&&s.uk.length&&s.uk.forEach(function(e){var t=e.onrightfn(n);if(void 0!==s.uniqs[e.hh][t]){if(!r)throw new Error("Cannot insert record, because it already exists in unique index");a=s.uniqs[e.hh][t];}}),a)s.update(function(e){for(var t in n)e[t]=n[t];},s.data.indexOf(a),p);else {for(var u in s.data.push(n),s.identities)(c=s.identities[u]).value+=c.step;s.pk&&(h=(l=s.pk).onrightfn(n),s.uniqs[l.hh][h]=n),s.uk&&s.uk.length&&s.uk.forEach(function(e){var t=e.onrightfn(n);s.uniqs[e.hh][t]=n;});}for(var d in s.afterinsert)(i=s.afterinsert[d])&&(i.funcid?bi.fn[i.funcid](n):i.statement&&i.statement.execute(f));bi.inserted=e;}}},c.delete=function(e){var n=this,r=n.data[e],t=!1;for(s in n.beforedelete)(i=n.beforedelete[s])&&(i.funcid?!1===bi.fn[i.funcid](r)&&(t=t||!0):i.statement&&!1===i.statement.execute(f)&&(t=t||!0));if(t)return !1;var s,a=!1;for(s in n.insteadofdelete){var i,a=!0;(i=n.insteadofdelete[s])&&(i.funcid?bi.fn[i.funcid](r):i.statement&&i.statement.execute(f));}if(!a){if(this.pk){var o=this.pk,e=o.onrightfn(r);if(void 0===this.uniqs[o.hh][e])throw new Error("Something wrong with primary key index on table");this.uniqs[o.hh][e]=void 0;}n.uk&&n.uk.length&&n.uk.forEach(function(e){var t=e.onrightfn(r);if(void 0===n.uniqs[e.hh][t])throw new Error("Something wrong with unique index on table");n.uniqs[e.hh][t]=void 0;});}},c.deleteall=function(){this.data.length=0,this.pk&&(this.uniqs[this.pk.hh]={}),c.uk&&c.uk.length&&c.uk.forEach(function(e){c.uniqs[e.hh]={};});},c.update=function(e,t,n){var r,s=m(this.data[t]);if(this.pk&&((r=this.pk).pkaddr=r.onrightfn(s,n),void 0===this.uniqs[r.hh][r.pkaddr]))throw new Error("Something wrong with index on table");c.uk&&c.uk.length&&c.uk.forEach(function(e){if(e.ukaddr=e.onrightfn(s),void 0===c.uniqs[e.hh][e.ukaddr])throw new Error("Something wrong with unique index on table")}),e(s,n,bi);var a=!1;for(u in c.beforeupdate)(o=c.beforeupdate[u])&&(o.funcid?!1===bi.fn[o.funcid](this.data[t],s)&&(a=a||!0):o.statement&&!1===o.statement.execute(f)&&(a=a||!0));if(a)return !1;var i=!1;for(u in c.insteadofupdate){var o,i=!0;(o=c.insteadofupdate[u])&&(o.funcid?bi.fn[o.funcid](this.data[t],s):o.statement&&o.statement.execute(f));}if(!i){if(c.checks&&0<c.checks.length&&c.checks.forEach(function(e){if(!e.fn(s))throw new Error("Violation of CHECK constraint "+(e.id||""))}),c.columns.forEach(function(e){if(e.notnull&&void 0===s[e.columnid])throw new Error("Wrong NULL value in NOT NULL column "+e.columnid)}),this.pk&&(r.newpkaddr=r.onrightfn(s),void 0!==this.uniqs[r.hh][r.newpkaddr]&&r.newpkaddr!==r.pkaddr))throw new Error("Record already exists");for(var u in c.uk&&c.uk.length&&c.uk.forEach(function(e){if(e.newukaddr=e.onrightfn(s),void 0!==c.uniqs[e.hh][e.newukaddr]&&e.newukaddr!==e.ukaddr)throw new Error("Record already exists")}),this.pk&&(this.uniqs[r.hh][r.pkaddr]=void 0,this.uniqs[r.hh][r.newpkaddr]=s),c.uk&&c.uk.length&&c.uk.forEach(function(e){c.uniqs[e.hh][e.ukaddr]=void 0,c.uniqs[e.hh][e.newukaddr]=s;}),this.data[t]=s,c.afterupdate)(o=c.afterupdate[u])&&(o.funcid?bi.fn[o.funcid](this.data[t],s):o.statement&&o.statement.execute(f));}},bi.options.nocount||(i=1),i=e?e(i):i)},bi.fn.Date=Object,bi.fn.Date=Date,bi.fn.Number=Number,bi.fn.String=String,bi.fn.Boolean=Boolean,I.EXTEND=bi.utils.extend,I.CHAR=String.fromCharCode.bind(String),I.ASCII=function(e){return e.charCodeAt(0)},I.COALESCE=function(){for(var e=0;e<arguments.length;e++)if(void 0!==arguments[e]&&("number"!=typeof arguments[e]||!isNaN(arguments[e])))return arguments[e]},I.USER=function(){return "alasql"},I.OBJECT_ID=function(e){return !!bi.tables[e]},I.DATE=function(e){return /\d{8}/.test(e)?new Date(+e.substr(0,4),+e.substr(4,2)-1,+e.substr(6,2)):new Date(e)},I.NOW=function(){var e=new Date,t=e.getFullYear()+"."+("0"+(e.getMonth()+1)).substr(-2)+"."+("0"+e.getDate()).substr(-2);return t+=" "+("0"+e.getHours()).substr(-2)+":"+("0"+e.getMinutes()).substr(-2)+":"+("0"+e.getSeconds()).substr(-2),t+="."+("00"+e.getMilliseconds()).substr(-3)},I.GETDATE=I.NOW,I.CURRENT_TIMESTAMP=I.NOW,I.SECOND=function(e){return (e=new Date(e)).getSeconds()},I.MINUTE=function(e){return (e=new Date(e)).getMinutes()},I.HOUR=function(e){return (e=new Date(e)).getHours()},I.DAYOFWEEK=I.WEEKDAY=function(e){return (e=new Date(e)).getDay()},I.DAY=I.DAYOFMONTH=function(e){return (e=new Date(e)).getDate()},I.MONTH=function(e){return (e=new Date(e)).getMonth()+1},I.YEAR=function(e){return (e=new Date(e)).getFullYear()};var X={year:31536e6,quarter:7884e6,month:2592e6,week:6048e5,day:864e5,dayofyear:864e5,weekday:864e5,hour:36e5,minute:6e4,second:1e3,millisecond:1,microsecond:.001};function K(t){var n="";if(void 0===t)n+="undefined";else if(Array.isArray(t)){n+="<style>",n+="table {border:1px black solid; border-collapse: collapse; border-spacing: 0px;}",n+="td,th {border:1px black solid; padding-left:5px; padding-right:5px}",n+="th {background-color: #EEE}",n+="</style>",n+="<table>";var e,r=[];for(e in t[0])r.push(e);n+="<tr><th>#",r.forEach(function(e){n+="<th>"+e;});for(var s=0,a=t.length;s<a;s++)n+="<tr><th>"+(s+1),r.forEach(function(e){n+="<td> ",t[s][e]==+t[s][e]?(n+='<div style="text-align:right">',void 0===t[s][e]?n+="NULL":n+=t[s][e],n+="</div>"):void 0===t[s][e]?n+="NULL":"string"==typeof t[s][e]?n+=t[s][e]:n+=Y(t[s][e]);});n+="</table>";}else n+="<p>"+Y(t)+"</p>";return n}function Q(e,t,n){var r;n<=0||(r=(t-e.scrollTop)/n*10,setTimeout(function(){e.scrollTop!==t&&(e.scrollTop=e.scrollTop+r,Q(e,t,n-10));},10));}function z(b,e,t,E,g,m){var S={};function T(e){return e&&!1===bi.options.casesensitive?e.toLowerCase():e}t=t||{},bi.utils.extend(S,t),void 0===S.headers&&(S.headers=!0),e=bi.utils.autoExtFilename(e,"xls",t),bi.utils.loadBinaryFile(e,!!E,function(e){var t;t=e instanceof ArrayBuffer?(s=function(e){for(var t="",n=0,r=10240;n<e.byteLength/r;++n)t+=String.fromCharCode.apply(null,new Uint8Array(e.slice(n*r,n*r+r)));return t+=String.fromCharCode.apply(null,new Uint8Array(e.slice(n*r)))}(e),b.read(btoa(s),{type:"base64"})):b.read(e,{type:"binary"});var n=void 0===S.sheetid?t.SheetNames[0]:"number"==typeof S.sheetid?t.SheetNames[S.sheetid]:S.sheetid,r=[];if(void 0===S.range?i=t.Sheets[n]["!ref"]:(i=S.range,t.Sheets[n][i]&&(i=t.Sheets[n][i])),i){for(var s=i.split(":"),e=s[0].match(/[A-Z]+/)[0],a=+s[0].match(/[0-9]+/)[0],i=s[1].match(/[A-Z]+/)[0],o=+s[1].match(/[0-9]+/)[0],u={},c=bi.utils.xlscn(e),l=bi.utils.xlscn(i),h=c;h<=l;h++){var d=bi.utils.xlsnc(h);S.headers?t.Sheets[n][d+""+a]?u[d]=T(t.Sheets[n][d+""+a].v):u[d]=T(d):u[d]=d;}S.headers&&a++;for(var f=a;f<=o;f++){for(var p={},h=c;h<=l;h++){d=bi.utils.xlsnc(h);t.Sheets[n][d+""+f]&&(p[u[d]]=t.Sheets[n][d+""+f].v);}r.push(p);}}else r.push([]);0<r.length&&r[r.length-1]&&0==Object.keys(r[r.length-1]).length&&r.pop(),E&&(r=E(r,g,m));},function(e){throw e});}bi.stdfn.DATEDIFF=function(e,t,n){return (new Date(n).getTime()-new Date(t).getTime())/X[e.toLowerCase()]},bi.stdfn.DATEADD=function(e,t,n){e=new Date(n).getTime()+t*X[e.toLowerCase()];return new Date(e)},bi.stdfn.INTERVAL=function(e,t){return e*X[t.toLowerCase()]},bi.stdfn.DATE_ADD=bi.stdfn.ADDDATE=function(e,t){t=new Date(e).getTime()+t;return new Date(t)},bi.stdfn.DATE_SUB=bi.stdfn.SUBDATE=function(e,t){t=new Date(e).getTime()-t;return new Date(t)},k.DropTable=function(e){return k.extend(this,e)},k.DropTable.prototype.toString=function(){var e="DROP ";return this.view?e+="VIEW":e+="TABLE",this.ifexists&&(e+=" IF EXISTS"),e+=" "+this.tables.toString()},k.DropTable.prototype.execute=function(r,e,s){var a=this.ifexists,i=0,o=0,u=this.tables.length;return this.tables.forEach(function(e){var t=bi.databases[e.databaseid||r],n=e.tableid;if(!a||a&&t.tables[n]){if(t.tables[n])t.engineid?bi.engines[t.engineid].dropTable(e.databaseid||r,n,a,function(e){delete t.tables[n],i+=e,++o==u&&s&&s(i);}):(delete t.tables[n],i++,++o==u&&s&&s(i));else if(!bi.options.dropifnotexists)throw new Error("Can not drop table '"+e.tableid+"', because it does not exist in the database.")}else ++o==u&&s&&s(i);}),i},k.TruncateTable=function(e){return k.extend(this,e)},k.TruncateTable.prototype.toString=function(){var e="TRUNCATE TABLE";return e+=" "+this.table.toString()},k.TruncateTable.prototype.execute=function(e,t,n){var r=bi.databases[this.table.databaseid||e],s=this.table.tableid;if(r.engineid)return bi.engines[r.engineid].truncateTable(this.table.databaseid||e,s,this.ifexists,n);if(!r.tables[s])throw new Error("Cannot truncate table becaues it does not exist");return r.tables[s].data=[],n?n(0):0},k.CreateVertex=function(e){return k.extend(this,e)},k.CreateVertex.prototype.toString=function(){var e="CREATE VERTEX ";return this.class&&(e+=this.class+" "),this.sharp&&(e+="#"+this.sharp+" "),this.sets?e+=this.sets.toString():this.content?e+=this.content.toString():this.select&&(e+=this.select.toString()),e},k.CreateVertex.prototype.toJS=function(e){return "this.queriesfn["+(this.queriesidx-1)+"](this.params,null,"+e+")"},k.CreateVertex.prototype.compile=function(e){var s,t,a,i=e,o=this.sharp;void 0!==this.name&&(t="x.name="+this.name.toJS(),s=new Function("x",t)),this.sets&&0<this.sets.length&&(t=this.sets.map(function(e){return "x['"+e.column.columnid+"']="+e.expression.toJS("x","")}).join(";"),a=new Function("x,params,alasql",t));return function(e,t){var n=bi.databases[i],r=void 0!==o?o:n.counter++,r={$id:r,$node:"VERTEX"},n=n.objects[r.$id]=r;return s&&s(r),a&&a(r,e,bi),n=t?t(n):n}},k.CreateEdge=function(e){return k.extend(this,e)},k.CreateEdge.prototype.toString=function(){var e="CREATE EDGE ";return this.class&&(e+=this.class+" "),e},k.CreateEdge.prototype.toJS=function(e){return "this.queriesfn["+(this.queriesidx-1)+"](this.params,null,"+e+")"},k.CreateEdge.prototype.compile=function(e){var o,t,u,c=e,l=new Function("params,alasql","var y;return "+this.from.toJS()),h=new Function("params,alasql","var y;return "+this.to.toJS());void 0!==this.name&&(t="x.name="+this.name.toJS(),o=new Function("x",t)),this.sets&&0<this.sets.length&&(t=this.sets.map(function(e){return "x['"+e.column.columnid+"']="+e.expression.toJS("x","")}).join(";"),u=new Function("x,params,alasql","var y;"+t));return function(e,t){var n=0,r=bi.databases[c],s={$id:r.counter++,$node:"EDGE"},a=l(e,bi),i=h(e,bi);return s.$in=[a.$id],s.$out=[i.$id],void 0===a.$out&&(a.$out=[]),a.$out.push(s.$id),i.$in,i.$in.push(s.$id),n=r.objects[s.$id]=s,o&&o(s),u&&u(s,e,bi),n=t?t(n):n}},k.CreateGraph=function(e){return k.extend(this,e)},k.CreateGraph.prototype.toString=function(){var e="CREATE GRAPH ";return this.class&&(e+=this.class+" "),e},k.CreateGraph.prototype.execute=function(o,u,e){var c=[];return this.from&&bi.from[this.from.funcid]&&(this.graph=bi.from[this.from.funcid.toUpperCase()]),this.graph.forEach(function(e){if(e.source){var t={};void 0!==e.as&&(bi.vars[e.as]=t),void 0!==e.prop&&(t.name=e.prop),void 0!==e.sharp&&(t.$id=e.sharp),void 0!==e.name&&(t.name=e.name),void 0!==e.class&&(t.$class=e.class);var n,r,s,a,i=bi.databases[o];if(void 0===t.$id&&(t.$id=i.counter++),t.$node="EDGE",void 0!==e.json&&y(t,new Function("params,alasql","var y;return "+e.json.toJS())(u,bi)),e.source.vars?n="object"==typeof(a=bi.vars[e.source.vars])?a:i.objects[a]:(void 0===(r=e.source.sharp)&&(r=e.source.prop),void 0!==(n=bi.databases[o].objects[r])||!bi.options.autovertex||void 0===e.source.prop&&void 0===e.source.name||void 0===(n=l(e.source.prop||e.source.name))&&(n=h(e.source))),e.source.vars?s="object"==typeof(a=bi.vars[e.target.vars])?a:i.objects[a]:(void 0===(a=e.target.sharp)&&(a=e.target.prop),void 0!==(s=bi.databases[o].objects[a])||!bi.options.autovertex||void 0===e.target.prop&&void 0===e.target.name||void 0===(s=l(e.target.prop||e.target.name))&&(s=h(e.target))),t.$in=[n.$id],t.$out=[s.$id],void 0===n.$out&&(n.$out=[]),n.$out.push(t.$id),void 0===s.$in&&(s.$in=[]),s.$in.push(t.$id),void 0!==(i.objects[t.$id]=t).$class){if(void 0===bi.databases[o].tables[t.$class])throw new Error("No such class. Pleace use CREATE CLASS");bi.databases[o].tables[t.$class].data.push(t);}c.push(t.$id);}else h(e);}),c=e?e(c):c;function l(e){var t,n=bi.databases[bi.useid].objects;for(t in n)if(n[t].name===e)return n[t]}function h(e){var t={};void 0!==e.as&&(bi.vars[e.as]=t),void 0!==e.prop&&(t.$id=e.prop,t.name=e.prop),void 0!==e.sharp&&(t.$id=e.sharp),void 0!==e.name&&(t.name=e.name),void 0!==e.class&&(t.$class=e.class);var n=bi.databases[o];if(void 0===t.$id&&(t.$id=n.counter++),t.$node="VERTEX",void 0!==e.json&&y(t,new Function("params,alasql","var y;return "+e.json.toJS())(u,bi)),void 0!==(n.objects[t.$id]=t).$class){if(void 0===bi.databases[o].tables[t.$class])throw new Error("No such class. Pleace use CREATE CLASS");bi.databases[o].tables[t.$class].data.push(t);}return c.push(t.$id),t}},k.CreateGraph.prototype.compile1=function(e){var o,t,u,c=e,l=new Function("params,alasql","var y;return "+this.from.toJS()),h=new Function("params,alasql","var y;return "+this.to.toJS());void 0!==this.name&&(t="x.name="+this.name.toJS(),o=new Function("x",t)),this.sets&&0<this.sets.length&&(t=this.sets.map(function(e){return "x['"+e.column.columnid+"']="+e.expression.toJS("x","")}).join(";"),u=new Function("x,params,alasql","var y;"+t));return function(e,t){var n=0,r=bi.databases[c],s={$id:r.counter++,$node:"EDGE"},a=l(e,bi),i=h(e,bi);return s.$in=[a.$id],s.$out=[i.$id],void 0===a.$out&&(a.$out=[]),a.$out.push(s.$id),void 0===i.$in&&(i.$in=[]),i.$in.push(s.$id),n=r.objects[s.$id]=s,o&&o(s),u&&u(s,e,bi),n=t?t(n):n}},k.AlterTable=function(e){return k.extend(this,e)},k.AlterTable.prototype.toString=function(){var e="ALTER TABLE "+this.table.toString();return this.renameto&&(e+=" RENAME TO "+this.renameto),e},k.AlterTable.prototype.execute=function(e,t,n){var r=bi.databases[e];if(r.dbversion=Date.now(),this.renameto){var s=this.table.tableid,a=this.renameto,i=1;if(r.tables[a])throw new Error("Can not rename a table '"+s+"' to '"+a+"', because the table with this name already exists");if(a===s)throw new Error("Can not rename a table '"+s+"' to itself");return r.tables[a]=r.tables[s],delete r.tables[s],i=1,n&&n(i),i}if(this.addcolumn){(r=bi.databases[this.table.databaseid||e]).dbversion++;var o=this.table.tableid,u=r.tables[o],c=this.addcolumn.columnid;if(u.xcolumns[c])throw new Error('Cannot add column "'+c+'", because it already exists in the table "'+o+'"');var l={columnid:c,dbtypeid:this.addcolumn.dbtypeid,dbsize:this.dbsize,dbprecision:this.dbprecision,dbenum:this.dbenum,defaultfns:null};u.columns.push(l),u.xcolumns[c]=l;for(var h=0,d=u.data.length;h<d;h++)u.data[h][c]=void 0;return n?n(1):1}if(this.modifycolumn){(r=bi.databases[this.table.databaseid||e]).dbversion++;o=this.table.tableid,u=r.tables[o],c=this.modifycolumn.columnid;if(!u.xcolumns[c])throw new Error('Cannot modify column "'+c+'", because it was not found in the table "'+o+'"');return (l=u.xcolumns[c]).dbtypeid=this.dbtypeid,l.dbsize=this.dbsize,l.dbprecision=this.dbprecision,l.dbenum=this.dbenum,n?n(1):1}if(this.renamecolumn){(r=bi.databases[this.table.databaseid||e]).dbversion++;var o=this.table.tableid,u=r.tables[o],c=this.renamecolumn,f=this.to;if(!u.xcolumns[c])throw new Error('Column "'+c+'" is not found in the table "'+o+'"');if(u.xcolumns[f])throw new Error('Column "'+f+'" already exists in the table "'+o+'"');if(c==f)return n?n(0):0;for(var p=0;p<u.columns.length;p++)u.columns[p].columnid==c&&(u.columns[p].columnid=f);u.xcolumns[f]=u.xcolumns[c],delete u.xcolumns[c];for(h=0,d=u.data.length;h<d;h++)u.data[h][f]=u.data[h][c],delete u.data[h][c];return u.data.length}if(this.dropcolumn){(r=bi.databases[this.table.databaseid||e]).dbversion++;for(var o=this.table.tableid,u=r.tables[o],c=this.dropcolumn,b=!1,p=0;p<u.columns.length;p++)if(u.columns[p].columnid==c){b=!0,u.columns.splice(p,1);break}if(!b)throw new Error('Cannot drop column "'+c+'", because it was not found in the table "'+o+'"');for(delete u.xcolumns[c],h=0,d=u.data.length;h<d;h++)delete u.data[h][c];return n?n(u.data.length):u.data.length}throw Error("Unknown ALTER TABLE method")},k.CreateIndex=function(e){return k.extend(this,e)},k.CreateIndex.prototype.toString=function(){var e="CREATE";return this.unique&&(e+=" UNIQUE"),e+=" INDEX "+this.indexid+" ON "+this.table.toString(),e+="("+this.columns.toString()+")"},k.CreateIndex.prototype.execute=function(e,t,n){var r=bi.databases[e],s=this.table.tableid,a=r.tables[s],e=this.indexid;r.indices[e]=s;var i=this.columns.map(function(e){return e.expression.toJS("r","")}).join("+'`'+"),o=new Function("r,params,alasql","return "+i);if(this.unique){a.uniqdefs[e]={rightfns:i};var u=a.uniqs[e]={};if(0<a.data.length)for(var c=0,l=a.data.length;c<l;c++)u[f=i(a.data[c])]||(u[f]={num:0}),u[f].num++;}else {var h=b(i);a.inddefs[e]={rightfns:i,hh:h},a.indices[h]={};var d=a.indices[h]={};if(0<a.data.length)for(var f,c=0,l=a.data.length;c<l;c++)d[f=o(a.data[c],t,bi)]||(d[f]=[]),d[f].push(a.data[c]);}h=1;return h=n?n(h):h},k.Reindex=function(e){return k.extend(this,e)},k.Reindex.prototype.toString=function(){return "REINDEX "+this.indexid},k.Reindex.prototype.execute=function(e,t,n){var r=bi.databases[e],e=this.indexid,e=r.indices[e];r.tables[e].indexColumns();e=1;return e=n?n(e):e},k.DropIndex=function(e){return k.extend(this,e)},k.DropIndex.prototype.toString=function(){return "DROP INDEX"+this.indexid},k.DropIndex.prototype.compile=function(e){this.indexid;return function(){return 1}},k.WithSelect=function(e){return k.extend(this,e)},k.WithSelect.prototype.toString=function(){var e="WITH ";return e+=this.withs.map(function(e){return e.name+" AS ("+e.select.toString()+")"}).join(",")+" ",e+=this.select.toString()},k.WithSelect.prototype.execute=function(n,t,r){var s=this,a=[];s.withs.forEach(function(e){a.push(bi.databases[n].tables[e.name]),(bi.databases[n].tables[e.name]=new O({tableid:e.name})).data=e.select.execute(n,t);});return this.select.execute(n,t,function(e){return s.withs.forEach(function(e,t){a[t]?bi.databases[n].tables[e.name]=a[t]:delete bi.databases[n].tables[e.name];}),e=r?r(e):e})},k.If=function(e){return k.extend(this,e)},k.If.prototype.toString=function(){var e="IF ";return e+=this.expression.toString(),e+=" "+this.thenstat.toString(),this.elsestat&&(e+=" ELSE "+this.thenstat.toString()),e},k.If.prototype.execute=function(e,t,n){var r;return new Function("params,alasql,p","var y;return "+this.expression.toJS("({})","",null)).bind(this)(t,bi)?r=this.thenstat.execute(e,t,n):this.elsestat?r=this.elsestat.execute(e,t,n):n&&(r=n(r)),r},k.While=function(e){return k.extend(this,e)},k.While.prototype.toString=function(){var e="WHILE ";return e+=this.expression.toString(),e+=" "+this.loopstat.toString()},k.While.prototype.execute=function(t,n,r){var s=this,a=[],i=new Function("params,alasql,p","var y;return "+this.expression.toJS());if(r){var o=!1,u=function(e){o?a.push(e):o=!0,setTimeout(function(){i(n,bi)?s.loopstat.execute(t,n,u):a=r(a);},0);};u();}else for(;i(n,bi);){var e=s.loopstat.execute(t,n);a.push(e);}return a},k.Break=function(e){return k.extend(this,e)},k.Break.prototype.toString=function(){return "BREAK"},k.Break.prototype.execute=function(e,t,n,r){var s=1;return s=n?n(s):s},k.Continue=function(e){return k.extend(this,e)},k.Continue.prototype.toString=function(){return "CONTINUE"},k.Continue.prototype.execute=function(e,t,n,r){var s=1;return s=n?n(s):s},k.BeginEnd=function(e){return k.extend(this,e)},k.BeginEnd.prototype.toString=function(){return "BEGIN "+this.statements.toString()+" END"},k.BeginEnd.prototype.execute=function(e,n,r,t){var s=this,a=[],i=0;return function t(){s.statements[i].execute(e,n,function(e){return a.push(e),++i<s.statements.length?t():void(r&&(a=r(a)))});}(),a},k.Insert=function(e){return k.extend(this,e)},k.Insert.prototype.toString=function(){var e="INSERT ";return this.orreplace&&(e+="OR REPLACE "),this.replaceonly&&(e="REPLACE "),e+="INTO "+this.into.toString(),this.columns&&(e+="("+this.columns.toString()+")"),this.values&&(e+=" VALUES "+this.values.map(function(e){return "("+e.toString()+")"}).join(",")),this.select&&(e+=" "+this.select.toString()),e},k.Insert.prototype.toJS=function(e,t,n){return "this.queriesfn["+(this.queriesidx-1)+"](this.params,null,"+e+")"},k.Insert.prototype.compile=function(a){var o=this;a=o.into.databaseid||a;var n=bi.databases[a],u=o.into.tableid,i=n.tables[u];if(!i)throw "Table '"+u+"' could not be found";var r,e="",t="",e="db.tables['"+u+"'].dirty=true;",s="var a,aa=[],x;";if(this.values){this.exists&&(this.existsfn=this.exists.map(function(e){e=e.compile(a);return e.query.modifier="RECORDSET",e})),this.queries&&(this.queriesfn=this.queries.map(function(e){e=e.compile(a);return e.query.modifier="RECORDSET",e})),o.values.forEach(function(r){var s=[];o.columns?o.columns.forEach(function(e,t){var n="'"+e.columnid+"':";i.xcolumns&&i.xcolumns[e.columnid]?0<=["INT","FLOAT","NUMBER","MONEY"].indexOf(i.xcolumns[e.columnid].dbtypeid)?n+="(x="+r[t].toJS()+",x==undefined?undefined:+x)":bi.fn[i.xcolumns[e.columnid].dbtypeid]?(n+="(new "+i.xcolumns[e.columnid].dbtypeid+"(",n+=r[t].toJS(),n+="))"):n+=r[t].toJS():n+=r[t].toJS(),s.push(n);}):Array.isArray(r)&&i.columns&&0<i.columns.length?i.columns.forEach(function(e,t){var n="'"+e.columnid+"':";0<=["INT","FLOAT","NUMBER","MONEY"].indexOf(e.dbtypeid)?n+="+"+r[t].toJS():bi.fn[e.dbtypeid]?(n+="(new "+e.dbtypeid+"(",n+=r[t].toJS(),n+="))"):n+=r[t].toJS(),s.push(n);}):t=W(r),n.tables[u].defaultfns&&s.unshift(n.tables[u].defaultfns),e+=t?"a="+t+";":"a={"+s.join(",")+"};",n.tables[u].isclass&&(e+="var db=alasql.databases['"+a+"'];",e+='a.$class="'+u+'";',e+="a.$id=db.counter++;",e+="db.objects[a.$id]=a;"),n.tables[u].insert?(e+="var db=alasql.databases['"+a+"'];",e+="db.tables['"+u+"'].insert(a,"+(o.orreplace?"true":"false")+");"):e+="aa.push(a);";}),r=s+e,n.tables[u].insert||(e+="alasql.databases['"+a+"'].tables['"+u+"'].data=alasql.databases['"+a+"'].tables['"+u+"'].data.concat(aa);"),n.tables[u].insert&&n.tables[u].isclass?e+="return a.$id;":e+="return "+o.values.length;var c=new Function("db, params, alasql","var y;"+s+e).bind(this);}else if(this.select){this.select.modifier="RECORDSET";var l=this.select.compile(a);if(n.engineid&&bi.engines[n.engineid].intoTable)return function(e,t){e=l(e);return bi.engines[n.engineid].intoTable(n.databaseid,u,e.data,null,t)};var h="return alasql.utils.extend(r,{"+i.defaultfns+"})",d=new Function("r,db,params,alasql",h),c=function(e,t,n){var r=l(t).data;if(e.tables[u].insert)for(var s=0,a=r.length;s<a;s++){var i=m(r[s]);d(i,e,t,n),e.tables[u].insert(i,o.orreplace);}else e.tables[u].data=e.tables[u].data.concat(r);return n.options.nocount?void 0:r.length};}else {if(!this.default)throw new Error("Wrong INSERT parameters");h="db.tables['"+u+"'].data.push({"+i.defaultfns+"});return 1;",c=new Function("db,params,alasql",h);}return n.engineid&&bi.engines[n.engineid].intoTable&&bi.options.autocommit?function(e,t){e=new Function("db,params","var y;"+r+"return aa;")(n,e);return bi.engines[n.engineid].intoTable(n.databaseid,u,e,null,t)}:function(e,t){var n=bi.databases[a];bi.options.autocommit&&n.engineid&&bi.engines[n.engineid].loadTableData(a,u);e=c(n,e,bi);return bi.options.autocommit&&n.engineid&&bi.engines[n.engineid].saveTableData(a,u),bi.options.nocount&&(e=void 0),t&&t(e),e}},k.Insert.prototype.execute=function(e,t,n){return this.compile(e)(t,n)},k.CreateTrigger=function(e){return k.extend(this,e)},k.CreateTrigger.prototype.toString=function(){var e="CREATE TRIGGER "+this.trigger+" ";return this.when&&(e+=this.when+" "),e+=this.action+" ON ",this.table.databaseid&&(e+=this.table.databaseid+"."),e+=this.table.tableid+" ",e+=this.statement.toString()},k.CreateTrigger.prototype.execute=function(e,t,n){var r=1,s=this.trigger;e=this.table.databaseid||e;var a=bi.databases[e],i=this.table.tableid,e={action:this.action,when:this.when,statement:this.statement,funcid:this.funcid,tableid:this.table.tableid};return "INSERT"==(a.triggers[s]=e).action&&"BEFORE"==e.when?a.tables[i].beforeinsert[s]=e:"INSERT"==e.action&&"AFTER"==e.when?a.tables[i].afterinsert[s]=e:"INSERT"==e.action&&"INSTEADOF"==e.when?a.tables[i].insteadofinsert[s]=e:"DELETE"==e.action&&"BEFORE"==e.when?a.tables[i].beforedelete[s]=e:"DELETE"==e.action&&"AFTER"==e.when?a.tables[i].afterdelete[s]=e:"DELETE"==e.action&&"INSTEADOF"==e.when?a.tables[i].insteadofdelete[s]=e:"UPDATE"==e.action&&"BEFORE"==e.when?a.tables[i].beforeupdate[s]=e:"UPDATE"==e.action&&"AFTER"==e.when?a.tables[i].afterupdate[s]=e:"UPDATE"==e.action&&"INSTEADOF"==e.when&&(a.tables[i].insteadofupdate[s]=e),r=n?n(r):r},k.DropTrigger=function(e){return k.extend(this,e)},k.DropTrigger.prototype.toString=function(){return "DROP TRIGGER "+this.trigger},k.DropTrigger.prototype.execute=function(e,t,n){var r=0,s=bi.databases[e],a=this.trigger;if(!s.triggers[a])throw new Error("Trigger not found");e=s.triggers[a].tableid;if(!e)throw new Error("Trigger Table not found");return r=1,delete s.tables[e].beforeinsert[a],delete s.tables[e].afterinsert[a],delete s.tables[e].insteadofinsert[a],delete s.tables[e].beforedelete[a],delete s.tables[e].afterdelete[a],delete s.tables[e].insteadofdelete[a],delete s.tables[e].beforeupdate[a],delete s.tables[e].afterupdate[a],delete s.tables[e].insteadofupdate[a],delete s.triggers[a],r=n?n(r):r},k.Delete=function(e){return k.extend(this,e)},k.Delete.prototype.toString=function(){var e="DELETE FROM "+this.table.toString();return this.where&&(e+=" WHERE "+this.where.toString()),e},k.Delete.prototype.compile=function(c){c=this.table.databaseid||c;var l,h=this.table.tableid,d=bi.databases[c];return this.where?(this.exists&&(this.existsfn=this.exists.map(function(e){e=e.compile(c);return e.query.modifier="RECORDSET",e})),this.queries&&(this.queriesfn=this.queries.map(function(e){e=e.compile(c);return e.query.modifier="RECORDSET",e})),l=new Function("r,params,alasql","var y;return ("+this.where.toJS("r","")+")").bind(this),function(e,t){if(d.engineid&&bi.engines[d.engineid].deleteFromTable)return bi.engines[d.engineid].deleteFromTable(c,h,l,e,t);bi.options.autocommit&&d.engineid&&("LOCALSTORAGE"==d.engineid||"FILESTORAGE"==d.engineid)&&bi.engines[d.engineid].loadTableData(c,h);for(var n,r=d.tables[h],s=r.data.length,a=[],i=0,o=r.data.length;i<o;i++)l(r.data[i],e,bi)?r.delete&&r.delete(i,e,bi):a.push(r.data[i]);for(n in r.data=a,r.afterdelete){var u=r.afterdelete[n];u&&(u.funcid?bi.fn[u.funcid]():u.statement&&u.statement.execute(c));}s-=r.data.length;return bi.options.autocommit&&d.engineid&&("LOCALSTORAGE"==d.engineid||"FILESTORAGE"==d.engineid)&&bi.engines[d.engineid].saveTableData(c,h),t&&t(s),s}):function(e,t){bi.options.autocommit&&d.engineid&&bi.engines[d.engineid].loadTableData(c,h),d.tables[h].dirty=!0;var n,r=d.tables[h].data.length;for(n in d.tables[h].data.length=0,d.tables[h].uniqs)d.tables[h].uniqs[n]={};for(n in d.tables[h].indices)d.tables[h].indices[n]={};return bi.options.autocommit&&d.engineid&&bi.engines[d.engineid].saveTableData(c,h),t&&t(r),r}},k.Delete.prototype.execute=function(e,t,n){return this.compile(e)(t,n)},k.Update=function(e){return k.extend(this,e)},k.Update.prototype.toString=function(){var e="UPDATE "+this.table.toString();return this.columns&&(e+=" SET "+this.columns.toString()),this.where&&(e+=" WHERE "+this.where.toString()),e},k.SetColumn=function(e){return k.extend(this,e)},k.SetColumn.prototype.toString=function(){return this.column.toString()+"="+this.expression.toString()},k.Update.prototype.compile=function(o){o=this.table.databaseid||o;var u,c=this.table.tableid;this.where&&(this.exists&&(this.existsfn=this.exists.map(function(e){e=e.compile(o);return e.query.modifier="RECORDSET",e})),this.queries&&(this.queriesfn=this.queries.map(function(e){e=e.compile(o);return e.query.modifier="RECORDSET",e})),u=new Function("r,params,alasql","var y;return "+this.where.toJS("r","")).bind(this));var t=bi.databases[o].tables[c].onupdatefns||"";t+=";",this.columns.forEach(function(e){t+="r['"+e.column.columnid+"']="+e.expression.toJS("r","")+";";});var l=new Function("r,params,alasql","var y;"+t);return function(e,t){var n=bi.databases[o];if(n.engineid&&bi.engines[n.engineid].updateTable)return bi.engines[n.engineid].updateTable(o,c,l,u,e,t);bi.options.autocommit&&n.engineid&&bi.engines[n.engineid].loadTableData(o,c);var r=n.tables[c];if(!r)throw new Error("Table '"+c+"' not exists");for(var s=0,a=0,i=r.data.length;a<i;a++)u&&!u(r.data[a],e,bi)||(r.update?r.update(l,a,e):l(r.data[a],e,bi),s++);return bi.options.autocommit&&n.engineid&&bi.engines[n.engineid].saveTableData(o,c),t&&t(s),s}},k.Update.prototype.execute=function(e,t,n){return this.compile(e)(t,n)},k.Merge=function(e){return k.extend(this,e)},k.Merge.prototype.toString=function(){var t="MERGE ";return t+=this.into.tableid+" ",this.into.as&&(t+="AS "+this.into.as+" "),t+="USING "+this.using.tableid+" ",this.using.as&&(t+="AS "+this.using.as+" "),t+="ON "+this.on.toString()+" ",this.matches.forEach(function(e){t+="WHEN ",e.matched||(t+="NOT "),t+="MATCHED ",e.bytarget&&(t+="BY TARGET "),e.bysource&&(t+="BY SOURCE "),e.expr&&(t+="AND "+e.expr.toString()+" "),t+="THEN ",e.action.delete&&(t+="DELETE "),e.action.insert&&(t+="INSERT ",e.action.columns&&(t+="("+e.action.columns.toString()+") "),e.action.values&&(t+="VALUES ("+e.action.values.toString()+") "),e.action.defaultvalues&&(t+="DEFAULT VALUES ")),e.action.update&&(t+="UPDATE ",t+=e.action.update.map(function(e){return e.toString()}).join(",")+" ");}),t},k.Merge.prototype.execute=function(e,t,n){var r=1;return r=n?n(r):r},k.CreateDatabase=function(e){return k.extend(this,e)},k.CreateDatabase.prototype.toString=function(){var e="CREATE";return this.engineid&&(e+=" "+this.engineid),e+=" DATABASE",this.ifnotexists&&(e+=" IF NOT EXISTS"),e+=" "+this.databaseid,this.args&&0<this.args.length&&(e+="("+this.args.map(function(e){return e.toString()}).join(", ")+")"),this.as&&(e+=" AS "+this.as),e},k.CreateDatabase.prototype.execute=function(e,t,n){if(this.args&&0<this.args.length&&this.args.map(function(e){return new Function("params,alasql","var y;return "+e.toJS())(t,bi)}),this.engineid)return s=bi.engines[this.engineid].createDatabase(this.databaseid,this.args,this.ifnotexists,this.as,n);var r=this.databaseid;if(bi.databases[r])throw new Error("Database '"+r+"' already exists");new bi.Database(r);var s=1;return n?n(s):s},k.AttachDatabase=function(e){return k.extend(this,e)},k.AttachDatabase.prototype.toString=function(e){var t="ATTACH";return this.engineid&&(t+=" "+this.engineid),t+=" DATABASE "+this.databaseid,e&&(t+="(",0<e.length&&(t+=e.map(function(e){return e.toString()}).join(", ")),t+=")"),this.as&&(t+=" AS "+this.as),t},k.AttachDatabase.prototype.execute=function(e,t,n){if(!bi.engines[this.engineid])throw new Error('Engine "'+this.engineid+'" is not defined.');return bi.engines[this.engineid].attachDatabase(this.databaseid,this.as,this.args,t,n)},k.DetachDatabase=function(e){return k.extend(this,e)},k.DetachDatabase.prototype.toString=function(){var e="DETACH";return e+=" DATABASE "+this.databaseid},k.DetachDatabase.prototype.execute=function(e,t,n){if(!bi.databases[this.databaseid].engineid)throw new Error('Cannot detach database "'+this.engineid+'", because it was not attached.');var r=this.databaseid;if(r===bi.DEFAULTDATABASEID)throw new Error("Drop of default database is prohibited");if(bi.databases[r]){var s=bi.databases[r].engineid&&"FILESTORAGE"==bi.databases[r].engineid,a=bi.databases[r].filename||"";delete bi.databases[r],s&&(bi.databases[r]={},bi.databases[r].isDetached=!0,bi.databases[r].filename=a),r===bi.useid&&bi.use(),a=1;}else {if(!this.ifexists)throw new Error("Database '"+r+"' does not exist");a=0;}return n&&n(a),a},k.UseDatabase=function(e){return k.extend(this,e)},k.UseDatabase.prototype.toString=function(){return "USE DATABASE "+this.databaseid},k.UseDatabase.prototype.execute=function(e,t,n){var r=this.databaseid;if(!bi.databases[r])throw new Error("Database '"+r+"' does not exist");bi.use(r);return n&&n(1),1},k.DropDatabase=function(e){return k.extend(this,e)},k.DropDatabase.prototype.toString=function(){var e="DROP";return this.ifexists&&(e+=" IF EXISTS"),e+=" DATABASE "+this.databaseid},k.DropDatabase.prototype.execute=function(e,t,n){if(this.engineid)return bi.engines[this.engineid].dropDatabase(this.databaseid,this.ifexists,n);var r,s=this.databaseid;if(s===bi.DEFAULTDATABASEID)throw new Error("Drop of default database is prohibited");if(bi.databases[s]){if(bi.databases[s].engineid)throw new Error("Cannot drop database '"+s+"', because it is attached. Detach it.");delete bi.databases[s],s===bi.useid&&bi.use(),r=1;}else {if(!this.ifexists)throw new Error("Database '"+s+"' does not exist");r=0;}return n&&n(r),r},k.Declare=function(e){return k.extend(this,e)},k.Declare.prototype.toString=function(){var e="DECLARE ";return e=this.declares&&0<this.declares.length?this.declares.map(function(e){var t="";return t+="@"+e.variable+" ",t+=e.dbtypeid,this.dbsize&&(t+="("+this.dbsize,this.dbprecision&&(t+=","+this.dbprecision),t+=")"),e.expression&&(t+=" = "+e.expression.toString()),t}).join(","):e},k.Declare.prototype.execute=function(e,n,t){var r=1;return this.declares&&0<this.declares.length&&this.declares.map(function(e){var t=e.dbtypeid;bi.fn[t]||(t=t.toUpperCase()),bi.declares[e.variable]={dbtypeid:t,dbsize:e.dbsize,dbprecision:e.dbprecision},e.expression&&(bi.vars[e.variable]=new Function("params,alasql","return "+e.expression.toJS("({})","",null))(n,bi),bi.declares[e.variable]&&(bi.vars[e.variable]=bi.stdfn.CONVERT(bi.vars[e.variable],bi.declares[e.variable])));}),r=t?t(r):r},k.ShowDatabases=function(e){return k.extend(this,e)},k.ShowDatabases.prototype.toString=function(){var e="SHOW DATABASES";return this.like&&(e+="LIKE "+this.like.toString()),e},k.ShowDatabases.prototype.execute=function(e,t,n){if(this.engineid)return bi.engines[this.engineid].showDatabases(this.like,n);var r,s=this,a=[];for(r in bi.databases)a.push({databaseid:r});return s.like&&a&&0<a.length&&(a=a.filter(function(e){return bi.utils.like(s.like.value,e.databaseid)})),n&&n(a),a},k.ShowTables=function(e){return k.extend(this,e)},k.ShowTables.prototype.toString=function(){var e="SHOW TABLES";return this.databaseid&&(e+=" FROM "+this.databaseid),this.like&&(e+=" LIKE "+this.like.toString()),e},k.ShowTables.prototype.execute=function(e,t,n){var r,e=bi.databases[this.databaseid||e],s=this,a=[];for(r in e.tables)a.push({tableid:r});return s.like&&a&&0<a.length&&(a=a.filter(function(e){return bi.utils.like(s.like.value,e.tableid)})),n&&n(a),a},k.ShowColumns=function(e){return k.extend(this,e)},k.ShowColumns.prototype.toString=function(){var e="SHOW COLUMNS";return this.table.tableid&&(e+=" FROM "+this.table.tableid),this.databaseid&&(e+=" FROM "+this.databaseid),e},k.ShowColumns.prototype.execute=function(e,t,n){e=bi.databases[this.databaseid||e].tables[this.table.tableid];if(e&&e.columns){e=e.columns.map(function(e){return {columnid:e.columnid,dbtypeid:e.dbtypeid,dbsize:e.dbsize}});return n&&n(e),e}return n&&n([]),[]},k.ShowIndex=function(e){return k.extend(this,e)},k.ShowIndex.prototype.toString=function(){var e="SHOW INDEX";return this.table.tableid&&(e+=" FROM "+this.table.tableid),this.databaseid&&(e+=" FROM "+this.databaseid),e},k.ShowIndex.prototype.execute=function(e,t,n){var r=bi.databases[this.databaseid||e].tables[this.table.tableid],s=[];if(r&&r.indices)for(var a in r.indices)s.push({hh:a,len:Object.keys(r.indices[a]).length});return n&&n(s),s},k.ShowCreateTable=function(e){return k.extend(this,e)},k.ShowCreateTable.prototype.toString=function(){var e="SHOW CREATE TABLE "+this.table.tableid;return this.databaseid&&(e+=" FROM "+this.databaseid),e},k.ShowCreateTable.prototype.execute=function(e){var t=bi.databases[this.databaseid||e].tables[this.table.tableid];if(t){var e="CREATE TABLE "+this.table.tableid+" (",n=[];return t.columns&&(t.columns.forEach(function(e){var t=e.columnid+" "+e.dbtypeid;e.dbsize&&(t+="("+e.dbsize+")"),e.primarykey&&(t+=" PRIMARY KEY"),n.push(t);}),e+=n.join(", ")),e+=")"}throw new Error('There is no such table "'+this.table.tableid+'"')},k.SetVariable=function(e){return k.extend(this,e)},k.SetVariable.prototype.toString=function(){var e="SET ";return void 0!==this.value&&(e+=this.variable.toUpperCase()+" "+(this.value?"ON":"OFF")),this.expression&&(e+=this.method+this.variable+" = "+this.expression.toString()),e},k.SetVariable.prototype.execute=function(t,e,n){var r;void 0!==this.value?("ON"==(r=this.value)?r=!0:"OFF"==r&&(r=!1),bi.options[this.variable]=r):this.expression&&(this.exists&&(this.existsfn=this.exists.map(function(e){e=e.compile(t);return e.query&&!e.query.modifier&&(e.query.modifier="RECORDSET"),e})),this.queries&&(this.queriesfn=this.queries.map(function(e){e=e.compile(t);return e.query&&!e.query.modifier&&(e.query.modifier="RECORDSET"),e})),s=new Function("params,alasql","return "+this.expression.toJS("({})","",null)).bind(this)(e,bi),bi.declares[this.variable]&&(s=bi.stdfn.CONVERT(s,bi.declares[this.variable])),this.props&&0<this.props.length?(r="@"==this.method?"alasql.vars['"+this.variable+"']":"params['"+this.variable+"']",r+=this.props.map(function(e){return "string"==typeof e?"['"+e+"']":"number"==typeof e?"["+e+"]":"["+e.toJS()+"]"}).join(),new Function("value,params,alasql","var y;"+r+"=value")(s,e,bi)):"@"==this.method?bi.vars[this.variable]=s:e[this.variable]=s);var s=1;return s=n?n(s):s},bi.test=function(e,t,n){if(0!==arguments.length){var r=Date.now();if(1===arguments.length)return n(),void bi.con.log(Date.now()-r);2===arguments.length&&(n=t,t=1);for(var s=0;s<t;s++)n();bi.con.results[e]=Date.now()-r;}else bi.log(bi.con.results);},bi.log=function(e,t){var n,r=bi.useid,s=bi.options.logtarget;if(c.isNode&&(s="console"),n="string"==typeof e?bi(e,t):e,"console"===s||c.isNode)"string"==typeof e&&bi.options.logprompt&&console.log(r+">",e),Array.isArray(n)&&console.table?console.table(n):console.log(Y(n));else {var s="output"===s?document.getElementsByTagName("output")[0]:"string"==typeof s?document.getElementById(s):s,a="";if("string"==typeof e&&bi.options.logprompt&&(a+="<pre><code>"+bi.pretty(e)+"</code></pre>"),Array.isArray(n))if(0===n.length)a+="<p>[ ]</p>";else if("object"!=typeof n[0]||Array.isArray(n[0]))for(var i=0,o=n.length;i<o;i++)a+="<p>"+K(n[i])+"</p>";else a+=K(n);else a+=K(n);s.innerHTML+=a;}},bi.clear=function(){var e=bi.options.logtarget;c.isNode||c.isMeteorServer?console.clear&&console.clear():("output"===e?document.getElementsByTagName("output")[0]:"string"==typeof e?document.getElementById(e):e).innerHTML="";},bi.write=function(e){var t=bi.options.logtarget;c.isNode||c.isMeteorServer?console.log&&console.log(e):("output"===t?document.getElementsByTagName("output")[0]:"string"==typeof t?document.getElementById(t):t).innerHTML+=e;},bi.prompt=function(s,a,t){if(c.isNode)throw new Error("The prompt not realized for Node.js");var i=0;if("string"==typeof s&&(s=document.getElementById(s)),(a="string"==typeof a?document.getElementById(a):a).textContent=bi.useid,t){bi.prompthistory.push(t),i=bi.prompthistory.length;try{var e=Date.now();bi.log(t),bi.write('<p style="color:blue">'+(Date.now()-e)+" ms</p>");}catch(e){bi.write("<p>"+bi.useid+"&gt;&nbsp;<b>"+t+"</b></p>"),bi.write('<p style="color:red">'+e+"<p>");}}var n=s.getBoundingClientRect().top+document.getElementsByTagName("body")[0].scrollTop;Q(document.getElementsByTagName("body")[0],n,500),s.onkeydown=function(e){if(13===e.which){var t=s.value,n=bi.useid;s.value="",bi.prompthistory.push(t),i=bi.prompthistory.length;try{var r=Date.now();bi.log(t),bi.write('<p style="color:blue">'+(Date.now()-r)+" ms</p>");}catch(e){bi.write("<p>"+n+"&gt;&nbsp;"+bi.pretty(t,!1)+"</p>"),bi.write('<p style="color:red">'+e+"<p>");}s.focus(),a.textContent=bi.useid;n=s.getBoundingClientRect().top+document.getElementsByTagName("body")[0].scrollTop;Q(document.getElementsByTagName("body")[0],n,500);}else 38===e.which?(--i<0&&(i=0),bi.prompthistory[i]&&(s.value=bi.prompthistory[i],e.preventDefault())):40===e.which&&(++i>=bi.prompthistory.length?(i=bi.prompthistory.length,s.value=""):bi.prompthistory[i]&&(s.value=bi.prompthistory[i],e.preventDefault()));};},k.BeginTransaction=function(e){return k.extend(this,e)},k.BeginTransaction.prototype.toString=function(){return "BEGIN TRANSACTION"},k.BeginTransaction.prototype.execute=function(e,t,n){return bi.databases[e].engineid?bi.engines[bi.databases[bi.useid].engineid].begin(e,n):(n&&n(1),1)},k.CommitTransaction=function(e){return k.extend(this,e)},k.CommitTransaction.prototype.toString=function(){return "COMMIT TRANSACTION"},k.CommitTransaction.prototype.execute=function(e,t,n){return bi.databases[e].engineid?bi.engines[bi.databases[bi.useid].engineid].commit(e,n):(n&&n(1),1)},k.RollbackTransaction=function(e){return k.extend(this,e)},k.RollbackTransaction.prototype.toString=function(){return "ROLLBACK TRANSACTION"},k.RollbackTransaction.prototype.execute=function(e,t,n){return bi.databases[e].engineid?bi.engines[bi.databases[e].engineid].rollback(e,n):(n&&n(1),1)},bi.options.tsql&&(bi.stdfn.OBJECT_ID=function(e,t){t=(t=void 0===t?"T":t).toUpperCase();var e=e.split("."),n=bi.useid,r=e[0];2==e.length&&(n=e[0],r=e[1]);var s,a=bi.databases[n].tables,n=bi.databases[n].databaseid;for(s in a)if(s==r)return (!a[s].view||"V"!=t)&&(a[s].view||"T"!=t)?void 0:n+"."+s}),bi.options.mysql,(bi.options.mysql||bi.options.sqlite)&&(bi.from.INFORMATION_SCHEMA=function(e,t,n,r,s){if("VIEWS"!=e&&"TABLES"!=e)throw new Error("Unknown INFORMATION_SCHEMA table");var a,i=[];for(a in bi.databases){var o,u=bi.databases[a].tables;for(o in u)(u[o].view&&"VIEWS"==e||!u[o].view&&"TABLES"==e)&&i.push({TABLE_CATALOG:a,TABLE_NAME:o});}return i=n?n(i,r,s):i}),bi.options.postgres,bi.options.oracle,bi.options.sqlite,bi.into.SQL=function(e,t,n,r,s){"object"==typeof e&&(t=e,e=void 0);var a={};if(bi.utils.extend(a,t),void 0===a.tableid)throw new Error("Table for INSERT TO is not defined.");var i="";0===r.length&&"object"==typeof n[0]&&(r=Object.keys(n[0]).map(function(e){return {columnid:e}}));for(var o=0,u=n.length;o<u;o++)i+="INSERT INTO "+t.tableid+"(",i+=r.map(function(e){return e.columnid}).join(","),i+=") VALUES (",i+=r.map(function(e){var t=n[o][e.columnid];return e.typeid?"STRING"!==e.typeid&&"VARCHAR"!==e.typeid&&"NVARCHAR"!==e.typeid&&"CHAR"!==e.typeid&&"NCHAR"!==e.typeid||(t="'"+d(t)+"'"):"string"==typeof t&&(t="'"+d(t)+"'"),t}),i+=");\n";return e=bi.utils.autoExtFilename(e,"sql",t),e=bi.utils.saveFile(e,i),e=s?s(e):e},bi.into.HTML=function(e,t,n,r,s){var a=1;return a=s?s(a):a},bi.into.JSON=function(e,t,n,r,s){var a=1;"object"==typeof e&&(t=e,e=void 0);n=JSON.stringify(n);return e=bi.utils.autoExtFilename(e,"json",t),a=bi.utils.saveFile(e,n),a=s?s(a):a},bi.into.TXT=function(e,t,n,r,s){0===r.length&&0<n.length&&(r=Object.keys(n[0]).map(function(e){return {columnid:e}})),"object"==typeof e&&(t=e,e=void 0);var a,i=n.length,o="";return 0<n.length&&(a=r[0].columnid,o+=n.map(function(e){return e[a]}).join("\n")),e=bi.utils.autoExtFilename(e,"txt",t),i=bi.utils.saveFile(e,o),i=s?s(i):i},bi.into.TAB=bi.into.TSV=function(e,t,n,r,s){var a={};return bi.utils.extend(a,t),a.separator="\t",e=bi.utils.autoExtFilename(e,"tab",t),a.autoExt=!1,bi.into.CSV(e,a,n,r,s)},bi.into.CSV=function(e,t,n,r,s){0===r.length&&0<n.length&&(r=Object.keys(n[0]).map(function(e){return {columnid:e}})),"object"==typeof e&&(t=e,e=void 0);var a={headers:!0,separator:";",quote:'"',utf8Bom:!0};t&&!t.headers&&void 0!==t.headers&&(a.utf8Bom=!1),bi.utils.extend(a,t);var i=n.length,o=a.utf8Bom?"\ufeff":"";return a.headers&&(o+=a.quote+r.map(function(e){return e.columnid.trim()}).join(a.quote+a.separator+a.quote)+a.quote+"\r\n"),n.forEach(function(t){o+=r.map(function(e){e=t[e.columnid];return e=+(e=""!==a.quote?(e+"").replace(new RegExp("\\"+a.quote,"g"),a.quote+a.quote):e)!=e?a.quote+e+a.quote:e}).join(a.separator)+"\r\n";}),e=bi.utils.autoExtFilename(e,"csv",t),i=bi.utils.saveFile(e,o,null,{disableAutoBom:!0}),i=s?s(i):i},bi.into.XLS=function(e,l,t,n,r){"object"==typeof e&&(l=e,e=void 0);var s={};l&&l.sheets&&(s=l.sheets);var h={headers:!0};void 0!==s.Sheet1?h=s[0]:void 0!==l&&(h=l),void 0===h.sheetid&&(h.sheetid="Sheet1");s=function(){var c='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" \t\txmlns="http://www.w3.org/TR/REC-html40"><head> \t\t<meta charset="utf-8" /> \t\t\x3c!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets> ';c+=" <x:ExcelWorksheet><x:Name>"+h.sheetid+"</x:Name><x:WorksheetOptions><x:DisplayGridlines/>     </x:WorksheetOptions> \t\t</x:ExcelWorksheet>",c+="</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--\x3e</head>",c+="<body",void 0!==h.style&&(c+=' style="',"function"==typeof h.style?c+=h.style(h):c+=h.style,c+='"');{var e;c+=">",c+="<table>",void 0!==h.caption&&(e=h.caption,c+="<caption",void 0!==(e="string"==typeof e?{title:e}:e).style&&(c+=' style="',"function"==typeof e.style?c+=e.style(h,e):c+=e.style,c+='" '),c+=">",c+=e.title,c+="</caption>");}void 0!==h.columns?n=h.columns:0==n.length&&0<t.length&&"object"==typeof t[0]&&(n=Array.isArray(t[0])?t[0].map(function(e,t){return {columnid:t}}):Object.keys(t[0]).map(function(e){return {columnid:e}}));n.forEach(function(e,t){void 0!==h.column&&y(e,h.column),void 0===e.width&&(h.column&&"undefined"!=h.column.width?e.width=h.column.width:e.width="120px"),"number"==typeof e.width&&(e.width=e.width+"px"),void 0===e.columnid&&(e.columnid=t),void 0===e.title&&(e.title=""+e.columnid.trim()),h.headers&&Array.isArray(h.headers)&&(e.title=h.headers[t]);}),c+="<colgroups>",n.forEach(function(e){c+='<col style="width: '+e.width+'"></col>';}),c+="</colgroups>",h.headers&&(c+="<thead>",c+="<tr>",n.forEach(function(e,t){c+="<th ",void 0!==e.style&&(c+=' style="',"function"==typeof e.style?c+=e.style(h,e,t):c+=e.style,c+='" '),c+=">",void 0!==e.title&&("function"==typeof e.title?c+=e.title(h,e,t):c+=e.title),c+="</th>";}),c+="</tr>",c+="</thead>");c+="<tbody>",t&&0<t.length&&t.forEach(function(i,o){var u;o>h.limit||(c+="<tr",y(u={},h.row),h.rows&&h.rows[o]&&y(u,h.rows[o]),void 0!==u&&void 0!==u.style&&(c+=' style="',"function"==typeof u.style?c+=u.style(h,i,o):c+=u.style,c+='" '),c+=">",n.forEach(function(e,t){var n={};y(n,h.cell),y(n,u.cell),void 0!==h.column&&y(n,h.column.cell),y(n,e.cell),h.cells&&h.cells[o]&&h.cells[o][t]&&y(n,h.cells[o][t]);var r=i[e.columnid];"function"==typeof n.value&&(r=n.value(r,h,i,e,n,o,t));var s=n.typeid;void 0===(s="function"==typeof s?s(r,h,i,e,n,o,t):s)&&("number"==typeof r?s="number":"string"==typeof r?s="string":"boolean"==typeof r?s="boolean":"object"==typeof r&&r instanceof Date&&(s="date"));var a="";"money"==s?a='mso-number-format:"\\#\\,\\#\\#0\\\\ _р_\\.";white-space:normal;':"number"==s?a=" ":"date"==s?a='mso-number-format:"Short Date";':l.types&&l.types[s]&&l.types[s].typestyle&&(a=l.types[s].typestyle),c+="<td style='"+(a=a||'mso-number-format:"\\@";')+"' ",void 0!==n.style&&(c+=' style="',"function"==typeof n.style?c+=n.style(r,h,i,e,o,t):c+=n.style,c+='" '),c+=">";n=n.format;if(void 0===r)c+="";else if(void 0!==n)if("function"==typeof n)c+=n(r);else {if("string"!=typeof n)throw new Error("Unknown format type. Should be function or string");c+=r;}else c+="number"==s||"date"==s?r.toString():"money"==s?(+r).toFixed(2):r;c+="</td>";}),c+="</tr>");});return c+="</tbody>",c+="</table>",c+="</body>",c+="</html>"}();e=bi.utils.autoExtFilename(e,"xls",l);s=bi.utils.saveFile(e,s);return s=r?r(s):s},bi.into.XLSXML=function(e,f,t,n,r){f=f||{},"object"==typeof e&&(f=e,e=void 0);var u,c={},p=f&&f.sheets?(c=f.sheets,u=t,n):(c.Sheet1=f,u=[t],[n]);e=bi.utils.autoExtFilename(e,"xls",f);e=bi.utils.saveFile(e,function(){var a="",l=" </Styles>",i={},o=62;function h(e){var t,n="";for(t in e){for(var r in n+="<"+t,e[t])n+=" ","x:"==r.substr(0,2)?n+=r:n+="ss:",n+=r+'="'+e[t][r]+'"';n+="/>";}var s=b(n);return i[s]||(i[s]={styleid:o},a+='<Style ss:ID="s'+o+'">',a+=n,a+="</Style>",o++),"s"+i[s].styleid}var e,t=0;for(e in c){var d=c[e],n=void 0!==d.dataidx?d.dataidx:t++,r=function(t){try{return Object.values(t)}catch(e){return Object.keys(t).map(function(e){return t[e]})}}(u[n]),s=void 0;void 0!==d.columns?s=d.columns:(void 0===(s=p[n])||0==s.length&&0<r.length)&&"object"==typeof r[0]&&(s=Array.isArray(r[0])?r[0].map(function(e,t){return {columnid:t}}):Object.keys(r[0]).map(function(e){return {columnid:e}})),s.forEach(function(e,t){void 0!==d.column&&y(e,d.column),void 0===e.width&&(d.column&&void 0!==d.column.width?e.width=d.column.width:e.width=120),"number"==typeof e.width&&(e.width=e.width),void 0===e.columnid&&(e.columnid=t),void 0===e.title&&(e.title=""+e.columnid.trim()),d.headers&&Array.isArray(d.headers)&&(e.title=d.headers[t]);}),l+='<Worksheet ss:Name="'+e+'"> \t  \t\t\t<Table ss:ExpandedColumnCount="'+s.length+'" ss:ExpandedRowCount="'+((d.headers?1:0)+Math.min(r.length,d.limit||r.length))+'" x:FullColumns="1" \t   \t\t\tx:FullRows="1" ss:DefaultColumnWidth="65" ss:DefaultRowHeight="15">',s.forEach(function(e,t){l+='<Column ss:Index="'+(t+1)+'" ss:AutoFitWidth="0" ss:Width="'+e.width+'"/>';}),d.headers&&(l+='<Row ss:AutoFitHeight="0">',s.forEach(function(e,t){var n;l+="<Cell ",void 0!==e.style&&(n={},"function"==typeof e.style?y(n,e.style(d,e,t)):y(n,e.style),l+='ss:StyleID="'+h(n)+'"'),l+='><Data ss:Type="String">',void 0!==e.title&&("function"==typeof e.title?l+=e.title(d,e,t):l+=e.title),l+="</Data></Cell>";}),l+="</Row>"),r&&0<r.length&&r.forEach(function(o,u){var c,e;u>d.limit||(y(c={},d.row),d.rows&&d.rows[u]&&y(c,d.rows[u]),l+="<Row ",void 0!==c&&(e={},void 0!==c.style&&("function"==typeof c.style?y(e,c.style(d,o,u)):y(e,c.style),l+='ss:StyleID="'+h(e)+'"')),l+=">",s.forEach(function(e,t){var n={};y(n,d.cell),y(n,c.cell),void 0!==d.column&&y(n,d.column.cell),y(n,e.cell),d.cells&&d.cells[u]&&d.cells[u][t]&&y(n,d.cells[u][t]);var r=o[e.columnid];"function"==typeof n.value&&(r=n.value(r,d,o,e,n,u,t));var s=n.typeid;void 0===(s="function"==typeof s?s(r,d,o,e,n,u,t):s)&&("number"==typeof r?s="number":"string"==typeof r?s="string":"boolean"==typeof r?s="boolean":"object"==typeof r&&r instanceof Date&&(s="date"));var a="String";"number"==s?a="Number":"date"==s&&(a="Date");var i="";"money"==s?i='mso-number-format:"\\#\\,\\#\\#0\\\\ _р_\\.";white-space:normal;':"number"==s?i=" ":"date"==s?i='mso-number-format:"Short Date";':f.types&&f.types[s]&&f.types[s].typestyle&&(i=f.types[s].typestyle),i=i||'mso-number-format:"\\@";',l+="<Cell ";i={};void 0!==n.style&&("function"==typeof n.style?y(i,n.style(r,d,o,e,u,t)):y(i,n.style),l+='ss:StyleID="'+h(i)+'"'),l+=">",l+='<Data ss:Type="'+a+'">';n=n.format;if(void 0===r)l+="";else if(void 0!==n)if("function"==typeof n)l+=n(r);else {if("string"!=typeof n)throw new Error("Unknown format type. Should be function or string");l+=r;}else l+="number"==s||"date"==s?r.toString():"money"==s?(+r).toFixed(2):r;l+="</Data></Cell>";}),l+="</Row>");}),l+="</Table></Worksheet>";}return '<?xml version="1.0"?> \t\t<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" \t\t xmlns:o="urn:schemas-microsoft-com:office:office" \t\t xmlns:x="urn:schemas-microsoft-com:office:excel" \t\t xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" \t\t xmlns:html="http://www.w3.org/TR/REC-html40"> \t\t <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"> \t\t </DocumentProperties> \t\t <OfficeDocumentSettings xmlns="urn:schemas-microsoft-com:office:office"> \t\t  <AllowPNG/> \t\t </OfficeDocumentSettings> \t\t <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel"> \t\t  <ActiveSheet>0</ActiveSheet> \t\t </ExcelWorkbook> \t\t <Styles> \t\t  <Style ss:ID="Default" ss:Name="Normal"> \t\t   <Alignment ss:Vertical="Bottom"/> \t\t   <Borders/> \t\t   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="12" ss:Color="#000000"/> \t\t   <Interior/> \t\t   <NumberFormat/> \t\t   <Protection/> \t\t  </Style>'+a+(l+="</Workbook>")}());return e=r?r(e):e},bi.into.XLSX=function(t,n,e,r,s){var a=1;n=n||{},A(r,[{columnid:"_"}])&&(e=e.map(function(e){return e._}),r=void 0),t=bi.utils.autoExtFilename(t,"xlsx",n);var i=N();"object"==typeof t&&(n=t,t=void 0);var h={SheetNames:[],Sheets:{}};return n.sourcefilename?bi.utils.loadBinaryFile(n.sourcefilename,!!s,function(e){h=i.read(e,{type:"binary"}),o();}):o(),a=s?s(a):a;function o(){"object"==typeof n&&Array.isArray(n)?e&&0<e.length&&e.forEach(function(e,t){u(n[t],e,void 0,t+1);}):u(n,e,r,1),function(){if(void 0===t)a=h;else if(e=N(),c.isNode||c.isMeteorServer)e.writeFile(h,t);else {var e=e.write(h,{bookType:"xlsx",bookSST:!1,type:"binary"});if(9==p())throw new Error("Cannot save XLSX files in IE9. Please use XLS() export function");ne(new Blob([function(e){for(var t=new ArrayBuffer(e.length),n=new Uint8Array(t),r=0;r!=e.length;++r)n[r]=255&e.charCodeAt(r);return t}(e)],{type:"application/octet-stream"}),t);}}();}function u(e,r,t,n){n={sheetid:"Sheet "+n,headers:!0};bi.utils.extend(n,e);var s=Object.keys(r).length;(!t||0==t.length)&&0<s&&(t=Object.keys(r[0]).map(function(e){return {columnid:e}}));var a={},a=(-1<h.SheetNames.indexOf(n.sheetid)||(h.SheetNames.push(n.sheetid),h.Sheets[n.sheetid]={}),h.Sheets[n.sheetid]),e="A1";n.range&&(e=n.range);var i=bi.utils.xlscn(e.match(/[A-Z]+/)[0]),e=+e.match(/[0-9]+/)[0]-1;u=h.Sheets[n.sheetid]["!ref"]?(u=h.Sheets[n.sheetid]["!ref"],o=bi.utils.xlscn(u.match(/[A-Z]+/)[0]),+u.match(/[0-9]+/)[0]-1):o=1;var o=Math.max(i+t.length,o),u=Math.max(e+s+2,u),c=1+e;h.Sheets[n.sheetid]["!ref"]="A1:"+bi.utils.xlsnc(o)+u,n.headers&&(t.forEach(function(e,t){a[bi.utils.xlsnc(i+t)+""+c]={v:e.columnid.trim()};}),c++);for(var l=0;l<s;l++)t.forEach(function(e,t){var n={v:r[l][e.columnid]};"number"==typeof r[l][e.columnid]?n.t="n":"string"==typeof r[l][e.columnid]?n.t="s":"boolean"==typeof r[l][e.columnid]?n.t="b":"object"==typeof r[l][e.columnid]&&r[l][e.columnid]instanceof Date&&(n.t="d"),a[bi.utils.xlsnc(i+t)+""+c]=n;}),c++;}},bi.from.METEOR=function(e,t,n,r,s){t=e.find(t).fetch();return t=n?n(t,r,s):t},bi.from.TABLETOP=function(e,t,n,r,s){var a=[],e={headers:!0,simpleSheet:!0,key:e};return bi.utils.extend(e,t),e.callback=function(e){a=e,n&&(a=n(a,r,s));},Tabletop.init(e),null},bi.from.HTML=function(e,t,n,r,s){var a={};bi.utils.extend(a,t);e=document.querySelector(e);if(!e&&"TABLE"!==e.tagName)throw new Error("Selected HTML element is not a TABLE");var i=[];if((o=a.headers)&&!Array.isArray(o))for(var o=[],u=e.querySelector("thead tr").children,c=0;c<u.length;c++)u.item(c).style&&"none"===u.item(c).style.display&&a.skipdisplaynone?o.push(void 0):o.push(u.item(c).textContent);for(var l=e.querySelectorAll("tbody tr"),h=0;h<l.length;h++){for(var d=l.item(h).children,f={},c=0;c<d.length;c++)d.item(c).style&&"none"===d.item(c).style.display&&a.skipdisplaynone||(o?f[o[c]]=d.item(c).textContent:f[c]=d.item(c).textContent);i.push(f);}return i=n?n(i,r,s):i},bi.from.RANGE=function(e,t,n,r,s){for(var a=[],i=e;i<=t;i++)a.push(i);return a=n?n(a,r,s):a},bi.from.FILE=function(e,t,n,r,s){if("string"==typeof e)a=e;else {if(!(e instanceof Event))throw new Error("Wrong usage of FILE() function");a=e.target.files[0].name;}var a=a.split("."),a=a[a.length-1].toUpperCase();if(bi.from[a])return bi.from[a](e,t,n,r,s);throw new Error("Cannot recognize file type for loading")},bi.from.JSON=function(e,t,n,r,s){var a;return e=bi.utils.autoExtFilename(e,"json",t),bi.utils.loadFile(e,!!n,function(e){a=JSON.parse(e),n&&(a=n(a,r,s));}),a},bi.from.TXT=function(e,t,r,s,a){var i;return e=bi.utils.autoExtFilename(e,"txt",t),bi.utils.loadFile(e,!!r,function(e){""===(i=e.split(/\r?\n/))[i.length-1]&&i.pop();for(var t=0,n=i.length;t<n;t++)i[t]==+i[t]&&(i[t]=+i[t]),i[t]=[i[t]];r&&(i=r(i,s,a));}),i},bi.from.TAB=bi.from.TSV=function(e,t,n,r,s){return (t=t||{}).separator="\t",e=bi.utils.autoExtFilename(e,"tab",t),t.autoext=!1,bi.from.CSV(e,t,n,r,s)},bi.from.CSV=function(e,t,b,E,g){e=""+e;var m,S={separator:",",quote:'"',headers:!0};bi.utils.extend(S,t);var T=[];function n(s){var e,a,t,i=S.separator.charCodeAt(0),o=S.quote.charCodeAt(0),u={},c={},n=[],l=s.length,h=0,r=0;function d(){if(l<=h)return c;if(a)return a=!1,u;var e=h;if(s.charCodeAt(e)===o){for(var t=e;t++<l;)if(s.charCodeAt(t)===o){if(s.charCodeAt(t+1)!==o)break;++t;}return h=t+2,13===(n=s.charCodeAt(t+1))?(a=!0,10===s.charCodeAt(t+2)&&++h):10===n&&(a=!0),s.substring(e+1,t).replace(/""/g,'"')}for(;h<l;){var n,r=1;if(10===(n=s.charCodeAt(h++)))a=!0;else if(13===n)a=!0,10===s.charCodeAt(h)&&(++h,++r);else if(n!==i)continue;return s.substring(e,h-r)}return s.substring(e)}for(;(e=d())!==c;){for(var f,p=[];e!==u&&e!==c;)p.push(e.trim()),e=d();S.headers?(0===r?"boolean"==typeof S.headers?T=p:Array.isArray(S.headers)&&(T=S.headers,f={},T.forEach(function(e,t){f[e]=p[t],void 0!==f[e]&&0!==f[e].length&&f[e].trim()==+f[e]&&(f[e]=+f[e]);}),n.push(f)):(f={},T.forEach(function(e,t){f[e]=p[t],void 0!==f[e]&&0!==f[e].length&&f[e].trim()==+f[e]&&(f[e]=+f[e]);}),n.push(f)),r++):n.push(p);}m=n,S.headers&&g&&g.sources&&g.sources[E]&&(t=g.sources[E].columns=[],T.forEach(function(e){t.push({columnid:e});})),b&&(m=b(m,E,g));}return new RegExp("\n").test(e)?n(e):(e=bi.utils.autoExtFilename(e,"csv",t),bi.utils.loadFile(e,!!b,n,g.cb)),m},bi.from.XLS=function(e,t,n,r,s){return t=t||{},e=bi.utils.autoExtFilename(e,"xls",t),t.autoExt=!1,z(N(),e,t,n,r,s)},bi.from.XLSX=function(e,t,n,r,s){return t=t||{},e=bi.utils.autoExtFilename(e,"xlsx",t),t.autoExt=!1,z(N(),e,t,n,r,s)},bi.from.ODS=function(e,t,n,r,s){return t=t||{},e=bi.utils.autoExtFilename(e,"ods",t),t.autoExt=!1,z(N(),e,t,n,r,s)},bi.from.XML=function(e,t,n,r,s){var l;return bi.utils.loadFile(e,!!n,function(e){function a(){var e=o(/^([^<]*)/);return e?e[1]:""}function i(){var e=o(/([\w:-]+)\s*=\s*("[^"]*"|'[^']*'|\w+)\s*/);if(e)return {name:e[1],value:e[2].replace(/^['"]|['"]$/g,"")}}function o(e){e=t.match(e);if(e)return t=t.slice(e[0].length),e}function u(){return 0==t.length}function c(e){return 0==t.indexOf(e)}var t;t=(t=(t=e).trim()).replace(/<!--[\s\S]*?-->/g,""),l=function(){return {declaration:function(){if(!o(/^<\?xml\s*/))return;var e={attributes:{}};for(;!u()&&!c("?>");){var t=i();if(!t)return e;e.attributes[t.name]=t.value;}return o(/\?>\s*/),e}(),root:function e(){var t=o(/^<([\w-:.]+)\s*/);if(!t)return;var n={name:t[1],attributes:{},children:[]};for(;!(u()||c(">")||c("?>")||c("/>"));){var r=i();if(!r)return n;n.attributes[r.name]=r.value;}if(o(/^\s*\/>\s*/))return n;o(/\??>\s*/);n.content=a();var s;for(;s=e();)n.children.push(s);o(/^<\/[\w-:.]+>\s*/);return n}()}}().root,n&&(l=n(l,r,s));}),l},bi.from.GEXF=function(e,t,n,r,s){var a;return bi("SEARCH FROM XML("+e+")",[],function(e){a=e,n&&(a=n(a));}),a},k.Print=function(e){return k.extend(this,e)},k.Print.prototype.toString=function(){var e="PRINT";return this.statement&&(e+=" "+this.statement.toString()),e},k.Print.prototype.execute=function(e,t,n){var r,s=this,a=1;return bi.precompile(this,e,t),this.exprs&&0<this.exprs.length?(r=this.exprs.map(function(e){e=new Function("params,alasql,p","var y;return "+e.toJS("({})","",null)).bind(s)(t,bi);return Y(e)}),console.log.apply(console,r)):this.select?(e=this.select.execute(e,t),console.log(Y(e))):console.log(),a=n?n(a):a},k.Source=function(e){return k.extend(this,e)},k.Source.prototype.toString=function(){var e="SOURCE";return this.url&&(e+=" '"+this.url+" '"),e},k.Source.prototype.execute=function(e,t,n){var r;return o(this.url,!!n,function(e){return r=bi(e),r=n?n(r):r},function(e){throw e}),r},k.Require=function(e){return k.extend(this,e)},k.Require.prototype.toString=function(){var e="REQUIRE";return this.paths&&0<this.paths.length&&(e+=this.paths.map(function(e){return e.toString()}).join(",")),this.plugins&&0<this.plugins.length&&(e+=this.plugins.map(function(e){return e.toUpperCase()}).join(",")),e},k.Require.prototype.execute=function(e,n,r){var s=this,a=0,i="";return this.paths&&0<this.paths.length?this.paths.forEach(function(e){o(e.value,!!r,function(e){i+=e,++a<s.paths.length||(new Function("params,alasql",i)(n,bi),r&&(a=r(a)));});}):this.plugins&&0<this.plugins.length?this.plugins.forEach(function(t){bi.plugins[t]||o(bi.path+"/alasql-"+t.toLowerCase()+".js",!!r,function(e){i+=e,++a<s.plugins.length||(new Function("params,alasql",i)(n,bi),bi.plugins[t]=!0,r&&(a=r(a)));});}):r&&(a=r(a)),a},k.Assert=function(e){return k.extend(this,e)},k.Source.prototype.toString=function(){var e="ASSERT";return this.value&&(e+=" "+JSON.stringify(this.value)),e},k.Assert.prototype.execute=function(e){if(!A(bi.res,this.value))throw new Error((this.message||"Assert wrong")+": "+JSON.stringify(bi.res)+" == "+JSON.stringify(this.value));return 1};I=bi.engines.WEBSQL=function(){};I.createDatabase=function(e,t,n,r){var s=openDatabase(e,t[0],t[1],t[2]);if(this.dbid&&((t=bi.createDatabase(this.dbid)).engineid="WEBSQL",t.wdbid=e,t.wdb=t),!s)throw new Error('Cannot create WebSQL database "'+this.dbid+'"');return r&&r(1),1},I.dropDatabase=function(e){throw new Error("This is impossible to drop WebSQL database.")},I.attachDatabase=function(e,t,n,r,s){if(bi.databases[t])throw new Error('Unable to attach database as "'+t+'" because it already exists');return bi.openDatabase(e,n[0],n[1],n[2]),1};var Z=bi.engines.INDEXEDDB=function(){};c.hasIndexedDB&&("function"==typeof c.global.indexedDB.webkitGetDatabaseNames?Z.getDatabaseNames=c.global.indexedDB.webkitGetDatabaseNames.bind(c.global.indexedDB):(Z.getDatabaseNames=function(){var t={},n={contains:function(e){return !0},notsupported:!0};return setTimeout(function(){var e={target:{result:n}};t.onsuccess(e);},0),t},Z.getDatabaseNamesNotSupported=!0)),Z.showDatabases=function(a,i){Z.getDatabaseNames().onsuccess=function(e){var t=e.target.result;if(Z.getDatabaseNamesNotSupported)throw new Error("SHOW DATABASE is not supported in this browser");var n,r=[];a&&(n=new RegExp(a.value.replace(/\%/g,".*"),"g"));for(var s=0;s<t.length;s++)a&&!t[s].match(n)||r.push({databaseid:t[s]});i(r);};},Z.createDatabase=function(t,e,n,r,s){var a=c.global.indexedDB;n?a.open(t,1).onsuccess=function(e){e.target.result.close(),s&&s(1);}:((a=a.open(t,1)).onupgradeneeded=function(e){e.target.transaction.abort();},a.onsuccess=function(e){if(!n)throw new Error('IndexedDB: Cannot create new database "'+t+'" because it already exists');s&&s(0);});},Z.createDatabase=function(t,e,n,r,s){var a,i,o,u=c.global.indexedDB;Z.getDatabaseNamesNotSupported?n?(a=!0,(i=u.open(t)).onupgradeneeded=function(e){a=!1;},i.onsuccess=function(e){e.target.result.close(),a?s&&s(0):s&&s(1);}):((o=u.open(t)).onupgradeneeded=function(e){e.target.transaction.abort();},o.onabort=function(e){s&&s(1);},o.onsuccess=function(e){throw e.target.result.close(),new Error('IndexedDB: Cannot create new database "'+t+'" because it already exists')}):(o=Z.getDatabaseNames()).onsuccess=function(e){if(e.target.result.contains(t)){if(n)return void(s&&s(0));throw new Error('IndexedDB: Cannot create new database "'+t+'" because it already exists')}u.open(t,1).onsuccess=function(e){e.target.result.close(),s&&s(1);};};},Z.dropDatabase=function(t,n,r){var s=c.global.indexedDB;Z.getDatabaseNames().onsuccess=function(e){if(!e.target.result.contains(t)){if(n)return void(r&&r(0));throw new Error('IndexedDB: Cannot drop new database "'+t+'" because it does not exist')}s.deleteDatabase(t).onsuccess=function(e){r&&r(1);};};},Z.attachDatabase=function(a,i,e,t,o){if(!c.hasIndexedDB)throw new Error("The current browser does not support IndexedDB");var n=c.global.indexedDB;Z.getDatabaseNames().onsuccess=function(e){if(!e.target.result.contains(a))throw new Error('IndexedDB: Cannot attach database "'+a+'" because it does not exist');n.open(a).onsuccess=function(e){var t=e.target.result,n=new bi.Database(i||a);n.engineid="INDEXEDDB",n.ixdbid=a,n.tables=[];for(var r=t.objectStoreNames,s=0;s<r.length;s++)n.tables[r[s]]={};e.target.result.close(),o&&o(1);};};},Z.createTable=function(n,r,e,s){var a=c.global.indexedDB,i=bi.databases[n].ixdbid;Z.getDatabaseNames().onsuccess=function(e){if(!e.target.result.contains(i))throw new Error('IndexedDB: Cannot create table in database "'+i+'" because it does not exist');e=a.open(i);e.onversionchange=function(e){e.target.result.close();},e.onsuccess=function(e){var t=e.target.result.version;e.target.result.close();t=a.open(i,t+1);t.onupgradeneeded=function(e){e.target.result.createObjectStore(r,{autoIncrement:!0});},t.onsuccess=function(e){e.target.result.close(),s&&s(1);},t.onerror=function(e){throw e},t.onblocked=function(e){throw new Error('Cannot create table "'+r+'" because database "'+n+'"  is blocked')};};};},Z.dropTable=function(n,r,s,a){var i=c.global.indexedDB,o=bi.databases[n].ixdbid;Z.getDatabaseNames().onsuccess=function(e){if(!e.target.result.contains(o))throw new Error('IndexedDB: Cannot drop table in database "'+o+'" because it does not exist');e=i.open(o);e.onversionchange=function(e){e.target.result.close();},e.onsuccess=function(e){var t=e.target.result.version;e.target.result.close();t=i.open(o,t+1);t.onupgradeneeded=function(e){e=e.target.result;if(e.objectStoreNames.contains(r))e.deleteObjectStore(r),delete bi.databases[n].tables[r];else if(!s)throw new Error('IndexedDB: Cannot drop table "'+r+'" because it does not exist')},t.onsuccess=function(e){e.target.result.close(),a&&a(1);},t.onerror=function(e){throw e},t.onblocked=function(e){throw new Error('Cannot drop table "'+r+'" because database "'+n+'" is blocked')};};};},Z.intoTable=function(e,a,i,t,o){var n=c.global.indexedDB,e=bi.databases[e].ixdbid;n.open(e).onsuccess=function(e){for(var t=e.target.result,e=t.transaction([a],"readwrite"),n=e.objectStore(a),r=0,s=i.length;r<s;r++)n.add(i[r]);e.oncomplete=function(){t.close(),o&&o(s);};};},Z.fromTable=function(e,r,s,a,i){var t=c.global.indexedDB,e=bi.databases[e].ixdbid;t.open(e).onsuccess=function(e){var t=[],n=e.target.result,e=n.transaction([r]).objectStore(r).openCursor();e.onblocked=function(e){},e.onerror=function(e){},e.onsuccess=function(e){e=e.target.result;e?(t.push(e.value),e.continue()):(n.close(),s&&s(t,a,i));};};},Z.deleteFromTable=function(e,r,s,a,i){var t=c.global.indexedDB,e=bi.databases[e].ixdbid;t.open(e).onsuccess=function(e){var t=e.target.result,e=t.transaction([r],"readwrite").objectStore(r).openCursor(),n=0;e.onblocked=function(e){},e.onerror=function(e){},e.onsuccess=function(e){e=e.target.result;e?(s&&!s(e.value,a)||(e.delete(),n++),e.continue()):(t.close(),i&&i(n));};};},Z.updateTable=function(e,t,s,a,i,o){var n=c.global.indexedDB,e=bi.databases[e].ixdbid;n.open(e).onsuccess=function(e){var n=e.target.result,e=n.transaction([t],"readwrite").objectStore(t).openCursor(),r=0;e.onblocked=function(e){},e.onerror=function(e){},e.onsuccess=function(e){var t=e.target.result;t?(a&&!a(t.value,i)||(e=t.value,s(e,i),t.update(e),r++),t.continue()):(n.close(),o&&o(r));};};};var ee=bi.engines.LOCALSTORAGE=function(){};ee.get=function(e){var t,n=localStorage.getItem(e);if(void 0!==n){try{t=JSON.parse(n);}catch(e){throw new Error("Cannot parse JSON object from localStorage"+n)}return t}},ee.set=function(e,t){void 0===t?localStorage.removeItem(e):localStorage.setItem(e,JSON.stringify(t));},ee.storeTable=function(e,t){var n=bi.databases[e],r=n.tables[t],e={};e.columns=r.columns,e.data=r.data,e.identities=r.identities,ee.set(n.lsdbid+"."+t,e);},ee.restoreTable=function(e,t){var n,e=bi.databases[e],r=ee.get(e.lsdbid+"."+t),s=new bi.Table;for(n in r)s[n]=r[n];return (e.tables[t]=s).indexColumns(),s},ee.removeTable=function(e,t){e=bi.databases[e];localStorage.removeItem(e.lsdbid+"."+t);},ee.createDatabase=function(e,t,n,r,s){var a=1,i=ee.get("alasql");if(n&&i&&i.databases&&i.databases[e])a=0;else {if((i=i||{databases:{}}).databases&&i.databases[e])throw new Error('localStorage: Cannot create new database "'+e+'" because it already exists');i.databases[e]=!0,ee.set("alasql",i),ee.set(e,{databaseid:e,tables:{}});}return a=s?s(a):a},ee.dropDatabase=function(e,t,n){var r,s=1,a=ee.get("alasql");if(t&&a&&a.databases&&!a.databases[e])s=0;else {if(!a){if(t)return n?n(0):0;throw new Error("There is no any AlaSQL databases in localStorage")}if(a.databases&&!a.databases[e])throw new Error('localStorage: Cannot drop database "'+e+'" because there is no such database');for(r in delete a.databases[e],ee.set("alasql",a),ee.get(e).tables)localStorage.removeItem(e+"."+r);localStorage.removeItem(e);}return s=n?n(s):s},ee.attachDatabase=function(e,t,n,r,s){var a=1;if(bi.databases[t])throw new Error('Unable to attach database as "'+t+'" because it already exists');t=t||e;var i=new bi.Database(t);if(i.engineid="LOCALSTORAGE",i.lsdbid=e,i.tables=ee.get(e).tables,!bi.options.autocommit&&i.tables)for(var o in i.tables)ee.restoreTable(t,o);return a=s?s(a):a},ee.showDatabases=function(e,t){var n,r=[],s=ee.get("alasql");if(e&&(n=new RegExp(e.value.replace(/%/g,".*"),"g")),s&&s.databases){for(var a in s.databases)r.push({databaseid:a});e&&r&&0<r.length&&(r=r.filter(function(e){return e.databaseid.match(n)}));}return r=t?t(r):r},ee.createTable=function(e,t,n,r){var s=1,a=bi.databases[e].lsdbid;if(ee.get(a+"."+t)&&!n)throw new Error('Table "'+t+'" alsready exists in localStorage database "'+a+'"');n=ee.get(a),bi.databases[e].tables[t];return n.tables[t]=!0,ee.set(a,n),ee.storeTable(e,t),s=r?r(s):s},ee.truncateTable=function(e,t,n,r){var s=1,a=bi.databases[e].lsdbid,a=bi.options.autocommit?ee.get(a):bi.databases[e];if(!n&&!a.tables[t])throw new Error('Cannot truncate table "'+t+'" in localStorage, because it does not exist');return ee.restoreTable(e,t).data=[],ee.storeTable(e,t),s=r?r(s):s},ee.dropTable=function(e,t,n,r){var s=1,a=bi.databases[e].lsdbid,i=bi.options.autocommit?ee.get(a):bi.databases[e];if(!n&&!i.tables[t])throw new Error('Cannot drop table "'+t+'" in localStorage, because it does not exist');return delete i.tables[t],ee.set(a,i),ee.removeTable(e,t),s=r?r(s):s},ee.fromTable=function(e,t,n,r,s){bi.databases[e].lsdbid;t=ee.restoreTable(e,t).data;return t=n?n(t,r,s):t},ee.intoTable=function(e,t,n,r,s){bi.databases[e].lsdbid;var a,i=n.length,o=ee.restoreTable(e,t);for(a in o.identities){var u,c=o.identities[a];for(u in n)n[u][a]=c.value,c.value+=c.step;}return o.data||(o.data=[]),o.data=o.data.concat(n),ee.storeTable(e,t),i=s?s(i):i},ee.loadTableData=function(e,t){bi.databases[e],bi.databases[e].lsdbid;ee.restoreTable(e,t);},ee.saveTableData=function(e,t){var n=bi.databases[e],e=bi.databases[e].lsdbid;ee.storeTable(e,t),n.tables[t].data=void 0;},ee.commit=function(e,t){var n=bi.databases[e],r=bi.databases[e].lsdbid,s={databaseid:r,tables:{}};if(n.tables)for(var a in n.tables)s.tables[a]=!0,ee.storeTable(e,a);return ee.set(r,s),t?t(1):1},ee.begin=ee.commit,ee.rollback=function(e,t){};I=bi.engines.SQLITE=function(){};I.createDatabase=function(e,t,n,r,s){throw new Error("Connot create SQLITE database in memory. Attach it.")},I.dropDatabase=function(e){throw new Error("This is impossible to drop SQLite database. Detach it.")},I.attachDatabase=function(t,r,n,e,s){var a;if(bi.databases[r])throw new Error('Unable to attach database as "'+r+'" because it already exists');if(n[0]&&n[0]instanceof k.StringValue||n[0]instanceof k.ParamValue)return n[0]instanceof k.StringValue?a=n[0].value:n[0]instanceof k.ParamValue&&(a=e[n[0].param]),bi.utils.loadBinaryFile(a,!0,function(e){var n=new bi.Database(r||t);n.engineid="SQLITE",n.sqldbid=t;e=n.sqldb=new SQL.Database(e);n.tables=[],e.exec("SELECT * FROM sqlite_master WHERE type='table'")[0].values.forEach(function(e){n.tables[e[1]]={};var t=n.tables[e[1]].columns=[],e=bi.parse(e[4]).statements[0].columns;e&&0<e.length&&e.forEach(function(e){t.push(e);});}),s(1);},function(e){throw new Error('Cannot open SQLite database file "'+n[0].value+'"')}),1;throw new Error("Cannot attach SQLite database without a file")},I.fromTable=function(e,t,n,r,s){var t=bi.databases[e].sqldb.exec("SELECT * FROM "+t),a=s.sources[r].columns=[];0<t[0].columns.length&&t[0].columns.forEach(function(e){a.push({columnid:e});});var i=[];0<t[0].values.length&&t[0].values.forEach(function(n){var r={};a.forEach(function(e,t){r[e.columnid]=n[t];}),i.push(r);}),n&&n(i,r,s);},I.intoTable=function(e,t,n,r,s){for(var a=bi.databases[e].sqldb,i=0,o=n.length;i<o;i++){var u="INSERT INTO "+t+" (",c=n[i],l=Object.keys(c);u+=l.join(","),u+=") VALUES (",u+=l.map(function(e){e=c[e];return e="string"==typeof e?"'"+e+"'":e}).join(","),u+=")",a.exec(u);}e=o;return s&&s(e),e};var te=bi.engines.FILESTORAGE=bi.engines.FILE=function(){};if(te.createDatabase=function(e,t,n,r,s){var a=1,i=t[0].value;return bi.utils.fileExists(i,function(e){if(e){if(n)return a=0,a=s?s(a):a;throw new Error("Cannot create new database file, because it already exists")}bi.utils.saveFile(i,JSON.stringify({tables:{}}),function(e){s&&(a=s(a));});}),a},te.dropDatabase=function(e,t,n){var r,s="";return "object"==typeof e&&e.value?s=e.value:(s=(bi.databases[e]||{}).filename||"",delete bi.databases[e]),bi.utils.fileExists(s,function(e){if(e)r=1,bi.utils.deleteFile(s,function(){r=1,n&&(r=n(r));});else {if(!t)throw new Error("Cannot drop database file, because it does not exist");r=0,n&&(r=n(r));}}),r},te.attachDatabase=function(e,t,n,r,s){var a=1;if(bi.databases[t])throw new Error('Unable to attach database as "'+t+'" because it already exists');var i=new bi.Database(t||e);return i.engineid="FILESTORAGE",i.filename=n[0].value,o(i.filename,!!s,function(e){try{i.data=JSON.parse(e);}catch(e){throw new Error("Data in FileStorage database are corrupted")}if(i.tables=i.data.tables,!bi.options.autocommit&&i.tables)for(var t in i.tables)i.tables[t].data=i.data[t];s&&(a=s(a));}),a},te.createTable=function(e,t,n,r){var s=bi.databases[e];if(s.data[t]&&!n)throw new Error('Table "'+t+'" alsready exists in the database "'+fsdbid+'"');n=bi.databases[e].tables[t];return s.data.tables[t]={columns:n.columns},s.data[t]=[],te.updateFile(e),r&&r(1),1},te.updateFile=function(e){var t=bi.databases[e];t.issaving?t.postsave=!0:(t.issaving=!0,t.postsave=!1,bi.utils.saveFile(t.filename,JSON.stringify(t.data),function(){t.issaving=!1,t.postsave&&setTimeout(function(){te.updateFile(e);},50);}));},te.dropTable=function(e,t,n,r){var s=bi.databases[e];if(!n&&!s.tables[t])throw new Error('Cannot drop table "'+t+'" in fileStorage, because it does not exist');return delete s.tables[t],delete s.data.tables[t],delete s.data[t],te.updateFile(e),r&&r(1),1},te.fromTable=function(e,t,n,r,s){t=bi.databases[e].data[t];return t=n?n(t,r,s):t},te.intoTable=function(e,t,n,r,s){var a=bi.databases[e],i=n.length,o=(o=a.data[t])||[];return a.data[t]=o.concat(n),te.updateFile(e),s&&s(i),i},te.loadTableData=function(e,t){e=bi.databases[e];e.tables[t].data=e.data[t];},te.saveTableData=function(e,t){var n=bi.databases[e];n.data[t]=n.tables[t].data,n.tables[t].data=null,te.updateFile(e);},te.commit=function(e,t){var n=bi.databases[e];if(n.tables)for(var r in n.tables)n.data.tables[r]={columns:n.tables[r].columns},n.data[r]=n.tables[r].data;return te.updateFile(e),t?t(1):1},te.begin=te.commit,te.rollback=function(r,s){var a=1,i=bi.databases[r];i.dbversion++,function e(){setTimeout(function(){return i.issaving?e():void bi.loadFile(i.filename,!!s,function(e){for(var t in i.data=e,i.tables={},i.data.tables){var n=new bi.Table({columns:i.data.tables[t].columns});y(n,i.data.tables[t]),i.tables[t]=n,bi.options.autocommit||(i.tables[t].data=i.data[t]),i.tables[t].indexColumns();}delete bi.databases[r],bi.databases[r]=new bi.Database(r),y(bi.databases[r],i),bi.databases[r].engineid="FILESTORAGE",bi.databases[r].filename=i.filename,s&&(a=s(a));})},100);}();},c.isBrowser&&!c.isWebWorker){if(!(bi=bi||!1))throw new Error("alasql was not found");bi.worker=function(){throw new Error("Can find webworker in this enviroment")},"undefined"!=typeof Worker&&(bi.worker=function(e,t,n){if(void 0===(e=!0===e?void 0:e))for(var r=document.getElementsByTagName("script"),s=0;s<r.length;s++){if("alasql-worker.js"===r[s].src.substr(-16).toLowerCase()){e=r[s].src.substr(0,r[s].src.length-16)+"alasql.js";break}if("alasql-worker.min.js"===r[s].src.substr(-20).toLowerCase()){e=r[s].src.substr(0,r[s].src.length-20)+"alasql.min.js";break}if("alasql.js"===r[s].src.substr(-9).toLowerCase()){e=r[s].src;break}if("alasql.min.js"===r[s].src.substr(-13).toLowerCase()){e=r[s].src.substr(0,r[s].src.length-13)+"alasql.min.js";break}}if(void 0===e)throw new Error("Path to alasql.js is not specified");var a;!1!==e?(a="importScripts('",a+=e,a+="');self.onmessage = function(event) {alasql(event.data.sql,event.data.params, function(data){postMessage({id:event.data.id, data:data});});}",a=new Blob([a],{type:"text/plain"}),bi.webworker=new Worker(URL.createObjectURL(a)),bi.webworker.onmessage=function(e){var t=e.data.id;bi.buffer[t](e.data.data),delete bi.buffer[t];},bi.webworker.onerror=function(e){throw e},1<arguments.length&&(t="REQUIRE "+t.map(function(e){return '"'+e+'"'}).join(","),bi(t,[],n))):!1===e&&delete bi.webworker;});var ne=ne||function(o){if(!(void 0===o||"undefined"!=typeof navigator&&/MSIE [1-9]\./.test(navigator.userAgent))){var e=o.document,u=function(){return o.URL||o.webkitURL||o},c=e.createElementNS("http://www.w3.org/1999/xhtml","a"),l="download"in c,h=/constructor/i.test(o.HTMLElement)||o.safari,d=/CriOS\/[\d]+/.test(navigator.userAgent),f=function(e){setTimeout(function(){"string"==typeof e?u().revokeObjectURL(e):e.remove();},4e4);},p=function(e,t,n){for(var r=(t=[].concat(t)).length;r--;){var s=e["on"+t[r]];if("function"==typeof s)try{s.call(e,n||e);}catch(e){!function(e){(o.setImmediate||o.setTimeout)(function(){throw e},0);}(e);}}},b=function(e){return /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)?new Blob([String.fromCharCode(65279),e],{type:e.type}):e},r=function(e,n,t){t||(e=b(e));function r(){p(a,"writestart progress write writeend".split(" "));}var s,a=this,i="application/octet-stream"===e.type;if(a.readyState=a.INIT,l)return s=u().createObjectURL(e),void setTimeout(function(){var e,t;c.href=s,c.download=n,e=c,t=new MouseEvent("click"),e.dispatchEvent(t),r(),f(s),a.readyState=a.DONE;});!function(){if((d||i&&h)&&o.FileReader){var t=new FileReader;return t.onloadend=function(){var e=d?t.result:t.result.replace(/^data:[^;]*;/,"data:attachment/file;");o.open(e,"_blank")||(o.location.href=e),e=void 0,a.readyState=a.DONE,r();},t.readAsDataURL(e),a.readyState=a.INIT}s=s||u().createObjectURL(e),!i&&o.open(s,"_blank")||(o.location.href=s),a.readyState=a.DONE,r(),f(s);}();},e=r.prototype;return "undefined"!=typeof navigator&&navigator.msSaveOrOpenBlob?function(e,t,n){return t=t||e.name||"download",n||(e=b(e)),navigator.msSaveOrOpenBlob(e,t)}:(e.abort=function(){},e.readyState=e.INIT=0,e.WRITING=1,e.DONE=2,e.error=e.onwritestart=e.onprogress=e.onwrite=e.onabort=e.onerror=e.onwriteend=null,function(e,t,n){return new r(e,t||e.name||"download",n)})}}("undefined"!=typeof self&&self||"undefined"!=typeof window&&window||this.content);module.exports?module.exports.saveAs=ne:"undefined"!=typeof undefined,(c.isCordova||c.isMeteorServer||c.isNode)&&console.warn("It looks like you are using the browser version of AlaSQL. Please use the alasql.fs.js file instead."),bi.utils.saveAs=ne;}return new n("alasql"),bi.use("alasql"),bi});
}(alasql_min, alasql_min.exports));

var papaparse_min = {exports: {}};

/* @license
Papa Parse
v5.3.1
https://github.com/mholt/PapaParse
License: MIT
*/

(function (module, exports) {
!function(e,t){module.exports=t();}(commonjsGlobal,function s(){var f="undefined"!=typeof self?self:"undefined"!=typeof window?window:void 0!==f?f:{};var n=!f.document&&!!f.postMessage,o=n&&/blob:/i.test((f.location||{}).protocol),a={},h=0,b={parse:function(e,t){var i=(t=t||{}).dynamicTyping||!1;M(i)&&(t.dynamicTypingFunction=i,i={});if(t.dynamicTyping=i,t.transform=!!M(t.transform)&&t.transform,t.worker&&b.WORKERS_SUPPORTED){var r=function(){if(!b.WORKERS_SUPPORTED)return !1;var e=(i=f.URL||f.webkitURL||null,r=s.toString(),b.BLOB_URL||(b.BLOB_URL=i.createObjectURL(new Blob(["(",r,")();"],{type:"text/javascript"})))),t=new f.Worker(e);var i,r;return t.onmessage=_,t.id=h++,a[t.id]=t}();return r.userStep=t.step,r.userChunk=t.chunk,r.userComplete=t.complete,r.userError=t.error,t.step=M(t.step),t.chunk=M(t.chunk),t.complete=M(t.complete),t.error=M(t.error),delete t.worker,void r.postMessage({input:e,config:t,workerId:r.id})}var n=null;b.NODE_STREAM_INPUT,"string"==typeof e?n=t.download?new l(t):new p(t):!0===e.readable&&M(e.read)&&M(e.on)?n=new g(t):(f.File&&e instanceof File||e instanceof Object)&&(n=new c(t));return n.stream(e)},unparse:function(e,t){var n=!1,_=!0,m=",",y="\r\n",s='"',a=s+s,i=!1,r=null,o=!1;!function(){if("object"!=typeof t)return;"string"!=typeof t.delimiter||b.BAD_DELIMITERS.filter(function(e){return -1!==t.delimiter.indexOf(e)}).length||(m=t.delimiter);("boolean"==typeof t.quotes||"function"==typeof t.quotes||Array.isArray(t.quotes))&&(n=t.quotes);"boolean"!=typeof t.skipEmptyLines&&"string"!=typeof t.skipEmptyLines||(i=t.skipEmptyLines);"string"==typeof t.newline&&(y=t.newline);"string"==typeof t.quoteChar&&(s=t.quoteChar);"boolean"==typeof t.header&&(_=t.header);if(Array.isArray(t.columns)){if(0===t.columns.length)throw new Error("Option columns is empty");r=t.columns;}void 0!==t.escapeChar&&(a=t.escapeChar+s);"boolean"==typeof t.escapeFormulae&&(o=t.escapeFormulae);}();var h=new RegExp(j(s),"g");"string"==typeof e&&(e=JSON.parse(e));if(Array.isArray(e)){if(!e.length||Array.isArray(e[0]))return u(null,e,i);if("object"==typeof e[0])return u(r||Object.keys(e[0]),e,i)}else if("object"==typeof e)return "string"==typeof e.data&&(e.data=JSON.parse(e.data)),Array.isArray(e.data)&&(e.fields||(e.fields=e.meta&&e.meta.fields),e.fields||(e.fields=Array.isArray(e.data[0])?e.fields:"object"==typeof e.data[0]?Object.keys(e.data[0]):[]),Array.isArray(e.data[0])||"object"==typeof e.data[0]||(e.data=[e.data])),u(e.fields||[],e.data||[],i);throw new Error("Unable to serialize unrecognized input");function u(e,t,i){var r="";"string"==typeof e&&(e=JSON.parse(e)),"string"==typeof t&&(t=JSON.parse(t));var n=Array.isArray(e)&&0<e.length,s=!Array.isArray(t[0]);if(n&&_){for(var a=0;a<e.length;a++)0<a&&(r+=m),r+=v(e[a],a);0<t.length&&(r+=y);}for(var o=0;o<t.length;o++){var h=n?e.length:t[o].length,u=!1,f=n?0===Object.keys(t[o]).length:0===t[o].length;if(i&&!n&&(u="greedy"===i?""===t[o].join("").trim():1===t[o].length&&0===t[o][0].length),"greedy"===i&&n){for(var d=[],l=0;l<h;l++){var c=s?e[l]:l;d.push(t[o][c]);}u=""===d.join("").trim();}if(!u){for(var p=0;p<h;p++){0<p&&!f&&(r+=m);var g=n&&s?e[p]:p;r+=v(t[o][g],p);}o<t.length-1&&(!i||0<h&&!f)&&(r+=y);}}return r}function v(e,t){if(null==e)return "";if(e.constructor===Date)return JSON.stringify(e).slice(1,25);!0===o&&"string"==typeof e&&null!==e.match(/^[=+\-@].*$/)&&(e="'"+e);var i=e.toString().replace(h,a),r="boolean"==typeof n&&n||"function"==typeof n&&n(e,t)||Array.isArray(n)&&n[t]||function(e,t){for(var i=0;i<t.length;i++)if(-1<e.indexOf(t[i]))return !0;return !1}(i,b.BAD_DELIMITERS)||-1<i.indexOf(m)||" "===i.charAt(0)||" "===i.charAt(i.length-1);return r?s+i+s:i}}};if(b.RECORD_SEP=String.fromCharCode(30),b.UNIT_SEP=String.fromCharCode(31),b.BYTE_ORDER_MARK="\ufeff",b.BAD_DELIMITERS=["\r","\n",'"',b.BYTE_ORDER_MARK],b.WORKERS_SUPPORTED=!n&&!!f.Worker,b.NODE_STREAM_INPUT=1,b.LocalChunkSize=10485760,b.RemoteChunkSize=5242880,b.DefaultDelimiter=",",b.Parser=E,b.ParserHandle=i,b.NetworkStreamer=l,b.FileStreamer=c,b.StringStreamer=p,b.ReadableStreamStreamer=g,f.jQuery){var d=f.jQuery;d.fn.parse=function(o){var i=o.config||{},h=[];return this.each(function(e){if(!("INPUT"===d(this).prop("tagName").toUpperCase()&&"file"===d(this).attr("type").toLowerCase()&&f.FileReader)||!this.files||0===this.files.length)return !0;for(var t=0;t<this.files.length;t++)h.push({file:this.files[t],inputElem:this,instanceConfig:d.extend({},i)});}),e(),this;function e(){if(0!==h.length){var e,t,i,r,n=h[0];if(M(o.before)){var s=o.before(n.file,n.inputElem);if("object"==typeof s){if("abort"===s.action)return e="AbortError",t=n.file,i=n.inputElem,r=s.reason,void(M(o.error)&&o.error({name:e},t,i,r));if("skip"===s.action)return void u();"object"==typeof s.config&&(n.instanceConfig=d.extend(n.instanceConfig,s.config));}else if("skip"===s)return void u()}var a=n.instanceConfig.complete;n.instanceConfig.complete=function(e){M(a)&&a(e,n.file,n.inputElem),u();},b.parse(n.file,n.instanceConfig);}else M(o.complete)&&o.complete();}function u(){h.splice(0,1),e();}};}function u(e){this._handle=null,this._finished=!1,this._completed=!1,this._halted=!1,this._input=null,this._baseIndex=0,this._partialLine="",this._rowCount=0,this._start=0,this._nextChunk=null,this.isFirstChunk=!0,this._completeResults={data:[],errors:[],meta:{}},function(e){var t=w(e);t.chunkSize=parseInt(t.chunkSize),e.step||e.chunk||(t.chunkSize=null);this._handle=new i(t),(this._handle.streamer=this)._config=t;}.call(this,e),this.parseChunk=function(e,t){if(this.isFirstChunk&&M(this._config.beforeFirstChunk)){var i=this._config.beforeFirstChunk(e);void 0!==i&&(e=i);}this.isFirstChunk=!1,this._halted=!1;var r=this._partialLine+e;this._partialLine="";var n=this._handle.parse(r,this._baseIndex,!this._finished);if(!this._handle.paused()&&!this._handle.aborted()){var s=n.meta.cursor;this._finished||(this._partialLine=r.substring(s-this._baseIndex),this._baseIndex=s),n&&n.data&&(this._rowCount+=n.data.length);var a=this._finished||this._config.preview&&this._rowCount>=this._config.preview;if(o)f.postMessage({results:n,workerId:b.WORKER_ID,finished:a});else if(M(this._config.chunk)&&!t){if(this._config.chunk(n,this._handle),this._handle.paused()||this._handle.aborted())return void(this._halted=!0);n=void 0,this._completeResults=void 0;}return this._config.step||this._config.chunk||(this._completeResults.data=this._completeResults.data.concat(n.data),this._completeResults.errors=this._completeResults.errors.concat(n.errors),this._completeResults.meta=n.meta),this._completed||!a||!M(this._config.complete)||n&&n.meta.aborted||(this._config.complete(this._completeResults,this._input),this._completed=!0),a||n&&n.meta.paused||this._nextChunk(),n}this._halted=!0;},this._sendError=function(e){M(this._config.error)?this._config.error(e):o&&this._config.error&&f.postMessage({workerId:b.WORKER_ID,error:e,finished:!1});};}function l(e){var r;(e=e||{}).chunkSize||(e.chunkSize=b.RemoteChunkSize),u.call(this,e),this._nextChunk=n?function(){this._readChunk(),this._chunkLoaded();}:function(){this._readChunk();},this.stream=function(e){this._input=e,this._nextChunk();},this._readChunk=function(){if(this._finished)this._chunkLoaded();else {if(r=new XMLHttpRequest,this._config.withCredentials&&(r.withCredentials=this._config.withCredentials),n||(r.onload=v(this._chunkLoaded,this),r.onerror=v(this._chunkError,this)),r.open(this._config.downloadRequestBody?"POST":"GET",this._input,!n),this._config.downloadRequestHeaders){var e=this._config.downloadRequestHeaders;for(var t in e)r.setRequestHeader(t,e[t]);}if(this._config.chunkSize){var i=this._start+this._config.chunkSize-1;r.setRequestHeader("Range","bytes="+this._start+"-"+i);}try{r.send(this._config.downloadRequestBody);}catch(e){this._chunkError(e.message);}n&&0===r.status&&this._chunkError();}},this._chunkLoaded=function(){4===r.readyState&&(r.status<200||400<=r.status?this._chunkError():(this._start+=this._config.chunkSize?this._config.chunkSize:r.responseText.length,this._finished=!this._config.chunkSize||this._start>=function(e){var t=e.getResponseHeader("Content-Range");if(null===t)return -1;return parseInt(t.substring(t.lastIndexOf("/")+1))}(r),this.parseChunk(r.responseText)));},this._chunkError=function(e){var t=r.statusText||e;this._sendError(new Error(t));};}function c(e){var r,n;(e=e||{}).chunkSize||(e.chunkSize=b.LocalChunkSize),u.call(this,e);var s="undefined"!=typeof FileReader;this.stream=function(e){this._input=e,n=e.slice||e.webkitSlice||e.mozSlice,s?((r=new FileReader).onload=v(this._chunkLoaded,this),r.onerror=v(this._chunkError,this)):r=new FileReaderSync,this._nextChunk();},this._nextChunk=function(){this._finished||this._config.preview&&!(this._rowCount<this._config.preview)||this._readChunk();},this._readChunk=function(){var e=this._input;if(this._config.chunkSize){var t=Math.min(this._start+this._config.chunkSize,this._input.size);e=n.call(e,this._start,t);}var i=r.readAsText(e,this._config.encoding);s||this._chunkLoaded({target:{result:i}});},this._chunkLoaded=function(e){this._start+=this._config.chunkSize,this._finished=!this._config.chunkSize||this._start>=this._input.size,this.parseChunk(e.target.result);},this._chunkError=function(){this._sendError(r.error);};}function p(e){var i;u.call(this,e=e||{}),this.stream=function(e){return i=e,this._nextChunk()},this._nextChunk=function(){if(!this._finished){var e,t=this._config.chunkSize;return t?(e=i.substring(0,t),i=i.substring(t)):(e=i,i=""),this._finished=!i,this.parseChunk(e)}};}function g(e){u.call(this,e=e||{});var t=[],i=!0,r=!1;this.pause=function(){u.prototype.pause.apply(this,arguments),this._input.pause();},this.resume=function(){u.prototype.resume.apply(this,arguments),this._input.resume();},this.stream=function(e){this._input=e,this._input.on("data",this._streamData),this._input.on("end",this._streamEnd),this._input.on("error",this._streamError);},this._checkIsFinished=function(){r&&1===t.length&&(this._finished=!0);},this._nextChunk=function(){this._checkIsFinished(),t.length?this.parseChunk(t.shift()):i=!0;},this._streamData=v(function(e){try{t.push("string"==typeof e?e:e.toString(this._config.encoding)),i&&(i=!1,this._checkIsFinished(),this.parseChunk(t.shift()));}catch(e){this._streamError(e);}},this),this._streamError=v(function(e){this._streamCleanUp(),this._sendError(e);},this),this._streamEnd=v(function(){this._streamCleanUp(),r=!0,this._streamData("");},this),this._streamCleanUp=v(function(){this._input.removeListener("data",this._streamData),this._input.removeListener("end",this._streamEnd),this._input.removeListener("error",this._streamError);},this);}function i(m){var a,o,h,r=Math.pow(2,53),n=-r,s=/^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/,u=/^(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))$/,t=this,i=0,f=0,d=!1,e=!1,l=[],c={data:[],errors:[],meta:{}};if(M(m.step)){var p=m.step;m.step=function(e){if(c=e,_())g();else {if(g(),0===c.data.length)return;i+=e.data.length,m.preview&&i>m.preview?o.abort():(c.data=c.data[0],p(c,t));}};}function y(e){return "greedy"===m.skipEmptyLines?""===e.join("").trim():1===e.length&&0===e[0].length}function g(){if(c&&h&&(k("Delimiter","UndetectableDelimiter","Unable to auto-detect delimiting character; defaulted to '"+b.DefaultDelimiter+"'"),h=!1),m.skipEmptyLines)for(var e=0;e<c.data.length;e++)y(c.data[e])&&c.data.splice(e--,1);return _()&&function(){if(!c)return;function e(e,t){M(m.transformHeader)&&(e=m.transformHeader(e,t)),l.push(e);}if(Array.isArray(c.data[0])){for(var t=0;_()&&t<c.data.length;t++)c.data[t].forEach(e);c.data.splice(0,1);}else c.data.forEach(e);}(),function(){if(!c||!m.header&&!m.dynamicTyping&&!m.transform)return c;function e(e,t){var i,r=m.header?{}:[];for(i=0;i<e.length;i++){var n=i,s=e[i];m.header&&(n=i>=l.length?"__parsed_extra":l[i]),m.transform&&(s=m.transform(s,n)),s=v(n,s),"__parsed_extra"===n?(r[n]=r[n]||[],r[n].push(s)):r[n]=s;}return m.header&&(i>l.length?k("FieldMismatch","TooManyFields","Too many fields: expected "+l.length+" fields but parsed "+i,f+t):i<l.length&&k("FieldMismatch","TooFewFields","Too few fields: expected "+l.length+" fields but parsed "+i,f+t)),r}var t=1;!c.data.length||Array.isArray(c.data[0])?(c.data=c.data.map(e),t=c.data.length):c.data=e(c.data,0);m.header&&c.meta&&(c.meta.fields=l);return f+=t,c}()}function _(){return m.header&&0===l.length}function v(e,t){return i=e,m.dynamicTypingFunction&&void 0===m.dynamicTyping[i]&&(m.dynamicTyping[i]=m.dynamicTypingFunction(i)),!0===(m.dynamicTyping[i]||m.dynamicTyping)?"true"===t||"TRUE"===t||"false"!==t&&"FALSE"!==t&&(function(e){if(s.test(e)){var t=parseFloat(e);if(n<t&&t<r)return !0}return !1}(t)?parseFloat(t):u.test(t)?new Date(t):""===t?null:t):t;var i;}function k(e,t,i,r){var n={type:e,code:t,message:i};void 0!==r&&(n.row=r),c.errors.push(n);}this.parse=function(e,t,i){var r=m.quoteChar||'"';if(m.newline||(m.newline=function(e,t){e=e.substring(0,1048576);var i=new RegExp(j(t)+"([^]*?)"+j(t),"gm"),r=(e=e.replace(i,"")).split("\r"),n=e.split("\n"),s=1<n.length&&n[0].length<r[0].length;if(1===r.length||s)return "\n";for(var a=0,o=0;o<r.length;o++)"\n"===r[o][0]&&a++;return a>=r.length/2?"\r\n":"\r"}(e,r)),h=!1,m.delimiter)M(m.delimiter)&&(m.delimiter=m.delimiter(e),c.meta.delimiter=m.delimiter);else {var n=function(e,t,i,r,n){var s,a,o,h;n=n||[",","\t","|",";",b.RECORD_SEP,b.UNIT_SEP];for(var u=0;u<n.length;u++){var f=n[u],d=0,l=0,c=0;o=void 0;for(var p=new E({comments:r,delimiter:f,newline:t,preview:10}).parse(e),g=0;g<p.data.length;g++)if(i&&y(p.data[g]))c++;else {var _=p.data[g].length;l+=_,void 0!==o?0<_&&(d+=Math.abs(_-o),o=_):o=_;}0<p.data.length&&(l/=p.data.length-c),(void 0===a||d<=a)&&(void 0===h||h<l)&&1.99<l&&(a=d,s=f,h=l);}return {successful:!!(m.delimiter=s),bestDelimiter:s}}(e,m.newline,m.skipEmptyLines,m.comments,m.delimitersToGuess);n.successful?m.delimiter=n.bestDelimiter:(h=!0,m.delimiter=b.DefaultDelimiter),c.meta.delimiter=m.delimiter;}var s=w(m);return m.preview&&m.header&&s.preview++,a=e,o=new E(s),c=o.parse(a,t,i),g(),d?{meta:{paused:!0}}:c||{meta:{paused:!1}}},this.paused=function(){return d},this.pause=function(){d=!0,o.abort(),a=M(m.chunk)?"":a.substring(o.getCharIndex());},this.resume=function(){t.streamer._halted?(d=!1,t.streamer.parseChunk(a,!0)):setTimeout(t.resume,3);},this.aborted=function(){return e},this.abort=function(){e=!0,o.abort(),c.meta.aborted=!0,M(m.complete)&&m.complete(c),a="";};}function j(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function E(e){var S,O=(e=e||{}).delimiter,x=e.newline,I=e.comments,T=e.step,D=e.preview,A=e.fastMode,L=S=void 0===e.quoteChar?'"':e.quoteChar;if(void 0!==e.escapeChar&&(L=e.escapeChar),("string"!=typeof O||-1<b.BAD_DELIMITERS.indexOf(O))&&(O=","),I===O)throw new Error("Comment character same as delimiter");!0===I?I="#":("string"!=typeof I||-1<b.BAD_DELIMITERS.indexOf(I))&&(I=!1),"\n"!==x&&"\r"!==x&&"\r\n"!==x&&(x="\n");var F=0,z=!1;this.parse=function(r,t,i){if("string"!=typeof r)throw new Error("Input must be a string");var n=r.length,e=O.length,s=x.length,a=I.length,o=M(T),h=[],u=[],f=[],d=F=0;if(!r)return C();if(A||!1!==A&&-1===r.indexOf(S)){for(var l=r.split(x),c=0;c<l.length;c++){if(f=l[c],F+=f.length,c!==l.length-1)F+=x.length;else if(i)return C();if(!I||f.substring(0,a)!==I){if(o){if(h=[],k(f.split(O)),R(),z)return C()}else k(f.split(O));if(D&&D<=c)return h=h.slice(0,D),C(!0)}}return C()}for(var p=r.indexOf(O,F),g=r.indexOf(x,F),_=new RegExp(j(L)+j(S),"g"),m=r.indexOf(S,F);;)if(r[F]!==S)if(I&&0===f.length&&r.substring(F,F+a)===I){if(-1===g)return C();F=g+s,g=r.indexOf(x,F),p=r.indexOf(O,F);}else if(-1!==p&&(p<g||-1===g))f.push(r.substring(F,p)),F=p+e,p=r.indexOf(O,F);else {if(-1===g)break;if(f.push(r.substring(F,g)),w(g+s),o&&(R(),z))return C();if(D&&h.length>=D)return C(!0)}else for(m=F,F++;;){if(-1===(m=r.indexOf(S,m+1)))return i||u.push({type:"Quotes",code:"MissingQuotes",message:"Quoted field unterminated",row:h.length,index:F}),E();if(m===n-1)return E(r.substring(F,m).replace(_,S));if(S!==L||r[m+1]!==L){if(S===L||0===m||r[m-1]!==L){-1!==p&&p<m+1&&(p=r.indexOf(O,m+1)),-1!==g&&g<m+1&&(g=r.indexOf(x,m+1));var y=b(-1===g?p:Math.min(p,g));if(r[m+1+y]===O){f.push(r.substring(F,m).replace(_,S)),r[F=m+1+y+e]!==S&&(m=r.indexOf(S,F)),p=r.indexOf(O,F),g=r.indexOf(x,F);break}var v=b(g);if(r.substring(m+1+v,m+1+v+s)===x){if(f.push(r.substring(F,m).replace(_,S)),w(m+1+v+s),p=r.indexOf(O,F),m=r.indexOf(S,F),o&&(R(),z))return C();if(D&&h.length>=D)return C(!0);break}u.push({type:"Quotes",code:"InvalidQuotes",message:"Trailing quote on quoted field is malformed",row:h.length,index:F}),m++;}}else m++;}return E();function k(e){h.push(e),d=F;}function b(e){var t=0;if(-1!==e){var i=r.substring(m+1,e);i&&""===i.trim()&&(t=i.length);}return t}function E(e){return i||(void 0===e&&(e=r.substring(F)),f.push(e),F=n,k(f),o&&R()),C()}function w(e){F=e,k(f),f=[],g=r.indexOf(x,F);}function C(e){return {data:h,errors:u,meta:{delimiter:O,linebreak:x,aborted:z,truncated:!!e,cursor:d+(t||0)}}}function R(){T(C()),h=[],u=[];}},this.abort=function(){z=!0;},this.getCharIndex=function(){return F};}function _(e){var t=e.data,i=a[t.workerId],r=!1;if(t.error)i.userError(t.error,t.file);else if(t.results&&t.results.data){var n={abort:function(){r=!0,m(t.workerId,{data:[],errors:[],meta:{aborted:!0}});},pause:y,resume:y};if(M(i.userStep)){for(var s=0;s<t.results.data.length&&(i.userStep({data:t.results.data[s],errors:t.results.errors,meta:t.results.meta},n),!r);s++);delete t.results;}else M(i.userChunk)&&(i.userChunk(t.results,n,t.file),delete t.results);}t.finished&&!r&&m(t.workerId,t.results);}function m(e,t){var i=a[e];M(i.userComplete)&&i.userComplete(t),i.terminate(),delete a[e];}function y(){throw new Error("Not implemented.")}function w(e){if("object"!=typeof e||null===e)return e;var t=Array.isArray(e)?[]:{};for(var i in e)t[i]=w(e[i]);return t}function v(e,t){return function(){e.apply(t,arguments);}}function M(e){return "function"==typeof e}return o&&(f.onmessage=function(e){var t=e.data;void 0===b.WORKER_ID&&t&&(b.WORKER_ID=t.workerId);if("string"==typeof t.input)f.postMessage({workerId:b.WORKER_ID,results:b.parse(t.input,t.config),finished:!0});else if(f.File&&t.input instanceof File||t.input instanceof Object){var i=b.parse(t.input,t.config);i&&f.postMessage({workerId:b.WORKER_ID,results:i,finished:!0});}}),(l.prototype=Object.create(u.prototype)).constructor=l,(c.prototype=Object.create(u.prototype)).constructor=c,(p.prototype=Object.create(p.prototype)).constructor=p,(g.prototype=Object.create(u.prototype)).constructor=g,b});
}(papaparse_min));

function getUrl(url, dataset, max, fields, api) {
    api = api || "d4c";
    if (api == "d4c") {
        url = url || "https://dev.geograndest.fr/data4citizen/d4c/api/records/1.0/search/";
        url = url + "?dataset=" + dataset;
        url = max ? url + '&rows=' + max : url;
        return url;
    }
    if (api == "wfs") {
        url = url || "https://www.geograndest.fr/geoserver";
        var url = url + "/wfs?service=WFS&version=1.0.0&request=GetFeature&outputFormat=application%2Fjson";
        var properties = [url, "typeName=" + dataset, "maxFeatures=" + max];
        if (fields) properties.push("propertyName=" + fields);
        return properties.join("&");
    }
    if (api == "json" || api == "csv") {
        return dataset ? url + dataset : url;
    }
    return false;
}

function getData(apiUrl, api) {
        return fetch(apiUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("HTTP error " + response.status);
                }
                return api == "csv" ? response.text() : response.json();
            })
            .then(function (data) {
                var json =
                    api == "csv" ? papaparse_min.exports.parse(data, {header: true, dynamicTyping: true}).data : data;
                return getItems(api, json);
            });
    }

function getItems(api, json, filter) {
    var items = [];
    if (api == "d4c") {
        items = json.records.map((record) => {
            return record.fields;
        });
    }
    if (api == "wfs") {
        items = json.features.map((feature) => {
            return feature.properties;
        });
    }
    if (api == "json" || api == "csv") {
        items = json;
    }
    // items = filterItems(items, filter);
    return items;
}

function filterItems(items, filter) {
    if (filter) {
        const sql = "SELECT * FROM ? WHERE 1 AND " + filter;
        items = alasql_min.exports.exec(sql, [items]);
    }
    return items;
}

function addFulltextField(items, itemFields, fieldName) {
    fieldName = fieldName || '_search';
    return items.map((item) => {
        var _search = [];
        for (let i = 0, n = itemFields.length; i < n; i++) {
            _search.push(item[itemFields[i]]);
        }
        item[fieldName] = _search.join(" ");
        return item;
    });
}

var dgeHelpers = {
    getData: getData,
    getUrl: getUrl,
    getItems: getItems,
    filterItems: filterItems,
    addFulltextField: addFulltextField
};

Chart.register(...registerables);

// import ChartDataLabels from 'chartjs-plugin-datalabels';

function dynamicColors(a) {
    a = a || 0.5;
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    const rgba = [r, g, b, a].join(",");
    return "rgba(" + rgba + ")";
}

function poolColors(n) {
    var pool = [];
    for (let i = 0; i < n; i++) {
        pool.push(dynamicColors());
    }
    return pool;
}

function createChart(canvasElement, defaultOptions) {
    // const options = defaultOptions || {
    //     type: "bar",
    //     data: {
    //         labels: [],
    //         datasets: [],
    //     },
    //     options: {
    //         responsive: true,
    //         // scales: {
    //         //     y: {
    //         //         beginAtZero: true,
    //         //     },
    //         // },
    //     },
    // };
    const initOptions = {
        type: "bar",
        data: {
            labels: [],
            datasets: [],
        },
        options: {
            responsive: true,
        },
    };
    const options = {...initOptions, ...defaultOptions};
    var ctx = canvasElement.getContext("2d");
    return new Chart(ctx, options);
}

function updateChart(graph, chart, series, xField, yFields, colors, items, xAxis, yAxis, legend, chartOptions) {

    //  Graph types:
    // start with 'bars': une couleur par barre
    // bar-h / bars-h: horizontal
    // bar-s: séries supperposé (stacked)

    // console.log(graph, chart, series, xField, yFields, colors, items)

    if (graph) {
        var xValues = [];
        var yValues = [];

        // TODO: à remplacer par la ligne suivante (à tester):
        // xValues = items[xField].filter((item) => item[xField]);
        xValues = items[0].filter((item) => {
            return item[xField];
        }).map((item) => {
            return item[xField];
        });

        console.log(4444444, yFields, items);

        for (let f = 0, n = yFields.length; f < n; f++) {
            // TODO: Ligne suivante à tester
            // yValues.push(items[yFields[f]]);
            yValues.push(
                items[f].map((item) => {
                    return item[yFields[f]];
                })
            );
        }

        // console.log(666, xField, xValues, yFields, yValues);

        graph.config.data.labels = xValues;

        let type = chart[0].startsWith('bar') ? 'bar' : chart[0];
        type = chart[0] == 'gauge' ? 'doughnut' : type;
        if (['bar-h', 'bar-s', 'gauge', 'pie', 'doughnut'].includes(chart[0])) {
            graph.config.type = type;
        }
        if (["bar", "line"].includes(type)) {
            if (xAxis) {
                    graph.config.options.scales.x = {
                        beginAtZero: xAxis[i].start == 0 ? true : false,
                        position: xAxis[i].position,
                        grid: {
                            display: xAxis[i].drawGrid == 0 ? false : true,
                            drawBorder: xAxis[i].drawBorder == 0 ? false : true,
                            drawOnChartArea: xAxis[i].drawLines == 0 ? false : true,
                            drawTicks: xAxis[i].drawTicks == 0 ? false : true,
                        }
                    };
            }
            if (yAxis) {
                for (var i = 0, n = yAxis.length; i < n; i++) {
                    graph.config.options.scales['y' + i] = {
                        beginAtZero: yAxis[i].start == 0 ? true : false,
                        position: yAxis[i].position,
                        grid: {
                            display: yAxis[i].drawGrid == 0 ? false : true,
                            drawBorder: yAxis[i].drawBorder == 0 ? false : true,
                            drawOnChartArea: yAxis[i].drawLines == 0 ? false : true,
                            drawTicks: yAxis[i].drawTicks == 0 ? false : true,
                        }
                    };
                }
            }
            if (chart[0].endsWith("-h")) {
                graph.config.options.indexAxis = 'y';
            }
            if (chart[0] == "bar-s") {
                graph.config.options.scales = {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                    }
                };
            }
        }
        
        if (chart[0] == "gauge") {
            graph.config.options.rotation = -90;  // start angle in radians
            graph.config.options.circumference = 180;  // sweep angle in radians
            // graph.config.options.cutoutPercentage = 0; // precent
            graph.config.options.cutout = '80%'; // precent
            graph.config.options.radius = '95%'; // precent
            // graph.config.options.hoverOffset = 50;
            graph.config.options.offset = 5;
        }

        
        graph.config.options.plugins= {
            legend: legend
        };

        chartOptions.plugins.datalabels.formatter = function(value, ctx) {
            const result = chartOptions.plugins.datalabels.formatter == 'label' ? ctx.chart.data.labels[ctx.dataIndex] : ctx.dataset.data[ctx.dataIndex];
            // console.log(result, String(result));
            return String(result.toLocaleString()) + chartOptions.plugins.datalabels.unit;
            // return result;
        };
        if (typeof chartOptions.plugins.datalabels.displayLimit) {
            chartOptions.plugins.datalabels.display = function(ctx) {
                return ctx.dataset.data[ctx.dataIndex] > parseFloat(chartOptions.plugins.datalabels.displayLimit);
            };
        }        // graph.config.options.plugins.datalabels = datalabelsOptions;

        graph.config.options = {...graph.config.options, ...chartOptions};

        graph.config.data.datasets = [];
        for (let f = 0, n = yFields.length; f < n; f++) {
            const datasetChart = chart[f] ? chart[f] : chart[0];
            var color = colors[f];
            const multiColors = ["pie", "doughnut", "polarArea", "gauge"].includes(datasetChart) || datasetChart.startsWith("bars");
            if (color) {
                color = multiColors ? color.split(';') : color;
            }
            else {
                color = multiColors ? poolColors(xValues.length) : dynamicColors(0.5);
            }
            const datasetType = datasetChart.startsWith('bar') ? 'bar' : datasetChart;
            graph.config.data.datasets[f] = {
                data: yValues[f],
                label: series[f] || "Série " + (f + 1),
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1,
                type: ['bar-h', 'bar-s', 'pie', 'doughnut', 'gauge'].includes(datasetChart) ? null : datasetType,
                yAxisID: yAxis ? "y" + f : "y"
            };
        }
        // console.log(graph);
        graph.update();
    }
}

var dgeChart = {
    dynamicColors: dynamicColors,
    poolColors: poolColors,
    createChart: createChart,
    updateChart: updateChart
};

/* src\dataviz-v4\DGE-Chart.svelte generated by Svelte v3.44.1 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i];
	return child_ctx;
}

// (436:8) {#if title}
function create_if_block_4(ctx) {
	let div;
	let h6;
	let t;

	return {
		c() {
			div = element("div");
			h6 = element("h6");
			t = text(/*title*/ ctx[2]);
			attr(div, "class", "text text-center p-2");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, h6);
			append(h6, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (442:8) {#if search}
function create_if_block_3(ctx) {
	let div;
	let input;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			input = element("input");
			attr(input, "class", "form-control form-control-sm");
			attr(input, "type", "search");
			attr(input, "placeholder", /*searchPlaceholder*/ ctx[14]);
			attr(div, "class", "search px-2 pb-2");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, input);
			set_input_value(input, /*searchValue*/ ctx[8]);

			if (!mounted) {
				dispose = listen(input, "input", /*input_input_handler*/ ctx[73]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*searchPlaceholder*/ 16384) {
				attr(input, "placeholder", /*searchPlaceholder*/ ctx[14]);
			}

			if (dirty[0] & /*searchValue*/ 256) {
				set_input_value(input, /*searchValue*/ ctx[8]);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

// (453:8) {#if filter}
function create_if_block_2(ctx) {
	let div;
	let select;
	let option;
	let t;
	let mounted;
	let dispose;
	let each_value = /*filterValues*/ ctx[12];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			div = element("div");
			select = element("select");
			option = element("option");
			t = text(/*filterLabel*/ ctx[13]);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			option.__value = "";
			option.value = option.__value;
			attr(select, "class", "custom-select custom-select-sm");
			attr(select, "id", "filterValue");
			attr(select, "name", "filterValue");
			if (/*filterValue*/ ctx[9] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[74].call(select));
			attr(div, "class", "select px-2 pb-2");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, select);
			append(select, option);
			append(option, t);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(select, null);
			}

			select_option(select, /*filterValue*/ ctx[9]);

			if (!mounted) {
				dispose = listen(select, "change", /*select_change_handler*/ ctx[74]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*filterLabel*/ 8192) set_data(t, /*filterLabel*/ ctx[13]);

			if (dirty[0] & /*filterValues, filterFieldId*/ 4224) {
				each_value = /*filterValues*/ ctx[12];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(select, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty[0] & /*filterValue, filterValues, filterFieldId*/ 4736) {
				select_option(select, /*filterValue*/ ctx[9]);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
			mounted = false;
			dispose();
		}
	};
}

// (462:20) {#each filterValues as filterValue}
function create_each_block(ctx) {
	let option;
	let t_value = /*filterValue*/ ctx[9][/*filterFieldId*/ ctx[7]] + "";
	let t;
	let option_value_value;

	return {
		c() {
			option = element("option");
			t = text(t_value);
			option.__value = option_value_value = /*filterValue*/ ctx[9][/*filterFieldId*/ ctx[7]];
			option.value = option.__value;
		},
		m(target, anchor) {
			insert(target, option, anchor);
			append(option, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*filterValues, filterFieldId*/ 4224 && t_value !== (t_value = /*filterValue*/ ctx[9][/*filterFieldId*/ ctx[7]] + "")) set_data(t, t_value);

			if (dirty[0] & /*filterValues, filterFieldId*/ 4224 && option_value_value !== (option_value_value = /*filterValue*/ ctx[9][/*filterFieldId*/ ctx[7]])) {
				option.__value = option_value_value;
				option.value = option.__value;
			}
		},
		d(detaching) {
			if (detaching) detach(option);
		}
	};
}

// (471:8) {#if attribution[0]}
function create_if_block_1(ctx) {
	let p;
	let small;
	let t0;
	let a0;
	let t1_value = /*attribution*/ ctx[0][0] + "";
	let t1;
	let a0_href_value;
	let t2;
	let a1;
	let t3;
	let t4;

	return {
		c() {
			p = element("p");
			small = element("small");
			t0 = text("Source: ");
			a0 = element("a");
			t1 = text(t1_value);
			t2 = text(" (");
			a1 = element("a");
			t3 = text("data");
			t4 = text(")");
			attr(a0, "href", a0_href_value = /*attribution*/ ctx[0][1]);
			attr(a1, "href", /*url*/ ctx[4]);
			attr(small, "class", "text-muted");
			attr(p, "class", "attribution text-end mt-2");
		},
		m(target, anchor) {
			insert(target, p, anchor);
			append(p, small);
			append(small, t0);
			append(small, a0);
			append(a0, t1);
			append(small, t2);
			append(small, a1);
			append(a1, t3);
			append(small, t4);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*attribution*/ 1 && t1_value !== (t1_value = /*attribution*/ ctx[0][0] + "")) set_data(t1, t1_value);

			if (dirty[0] & /*attribution*/ 1 && a0_href_value !== (a0_href_value = /*attribution*/ ctx[0][1])) {
				attr(a0, "href", a0_href_value);
			}

			if (dirty[0] & /*url*/ 16) {
				attr(a1, "href", /*url*/ ctx[4]);
			}
		},
		d(detaching) {
			if (detaching) detach(p);
		}
	};
}

// (487:0) {:else}
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

// (482:0) {#if localcss}
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
	let div7;
	let div6;
	let div4;
	let div3;
	let div4_hidden_value;
	let t2;
	let div5;
	let t3;
	let t4;
	let t5;
	let canvas;
	let t6;
	let t7;
	let if_block4_anchor;
	let if_block0 = /*title*/ ctx[2] && create_if_block_4(ctx);
	let if_block1 = /*search*/ ctx[5] && create_if_block_3(ctx);
	let if_block2 = /*filter*/ ctx[6] && create_if_block_2(ctx);
	let if_block3 = /*attribution*/ ctx[0][0] && create_if_block_1(ctx);

	function select_block_type(ctx, dirty) {
		if (/*localcss*/ ctx[3]) return create_if_block;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block4 = current_block_type(ctx);

	return {
		c() {
			div7 = element("div");
			div6 = element("div");
			div4 = element("div");
			div3 = element("div");

			div3.innerHTML = `<div class="m-5 text-center"><div class="spinner-grow" role="status"></div> 
                <div><small class="text-muted">Loading...</small></div></div>`;

			t2 = space();
			div5 = element("div");
			if (if_block0) if_block0.c();
			t3 = space();
			if (if_block1) if_block1.c();
			t4 = space();
			if (if_block2) if_block2.c();
			t5 = space();
			canvas = element("canvas");
			t6 = space();
			if (if_block3) if_block3.c();
			t7 = space();
			if_block4.c();
			if_block4_anchor = empty();
			this.c = noop$1;
			attr(div3, "class", "d-flex justify-content-center");
			div4.hidden = div4_hidden_value = !/*loading*/ ctx[10];
			attr(canvas, "id", "myChart");
			attr(canvas, "width", "3");
			attr(canvas, "height", "2");
			div5.hidden = /*loading*/ ctx[10];
			attr(div6, "class", "card-body");
			attr(div7, "id", /*id*/ ctx[1]);
			attr(div7, "class", "mt-3 card table-responsive");
		},
		m(target, anchor) {
			insert(target, div7, anchor);
			append(div7, div6);
			append(div6, div4);
			append(div4, div3);
			append(div6, t2);
			append(div6, div5);
			if (if_block0) if_block0.m(div5, null);
			append(div5, t3);
			if (if_block1) if_block1.m(div5, null);
			append(div5, t4);
			if (if_block2) if_block2.m(div5, null);
			append(div5, t5);
			append(div5, canvas);
			/*canvas_binding*/ ctx[75](canvas);
			append(div5, t6);
			if (if_block3) if_block3.m(div5, null);
			insert(target, t7, anchor);
			if_block4.m(target, anchor);
			insert(target, if_block4_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*loading*/ 1024 && div4_hidden_value !== (div4_hidden_value = !/*loading*/ ctx[10])) {
				div4.hidden = div4_hidden_value;
			}

			if (/*title*/ ctx[2]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_4(ctx);
					if_block0.c();
					if_block0.m(div5, t3);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*search*/ ctx[5]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_3(ctx);
					if_block1.c();
					if_block1.m(div5, t4);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*filter*/ ctx[6]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_2(ctx);
					if_block2.c();
					if_block2.m(div5, t5);
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
					if_block3.m(div5, null);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}

			if (dirty[0] & /*loading*/ 1024) {
				div5.hidden = /*loading*/ ctx[10];
			}

			if (dirty[0] & /*id*/ 2) {
				attr(div7, "id", /*id*/ ctx[1]);
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
		i: noop$1,
		o: noop$1,
		d(detaching) {
			if (detaching) detach(div7);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			/*canvas_binding*/ ctx[75](null);
			if (if_block3) if_block3.d();
			if (detaching) detach(t7);
			if_block4.d(detaching);
			if (detaching) detach(if_block4_anchor);
		}
	};
}

let searchField = "_search";

function getField(field, id, table) {
	if (field) {
		const field_parts = field.split(",");
		let field_object = {};

		// const field_name = table && !field_parts[0].includes(".") ? [table, field_parts[0]].join(".") : field_parts[0];
		const field_name = table && !field_parts[0].includes(".")
		? [table.id, field_parts[0]].join(".")
		: field_parts[0];

		field_object.name = field_name;
		id = id || field_object.name.replace(".", "_");
		field_object.id = field_parts[1] ? field_parts[1] : id;
		return field_object;
	}

	return false;
}

function addField(fields, field) {
	// const index = fields.findIndex((f) => {
	//     return f.name == field.name;
	// });
	// fields.push(index == -1 ? field : false);
	fields.push(field);

	return fields;
}

function getOrderby(orderby) {
	let sql_orderby = orderby ? " ORDER BY" : "";
	const orderby_array = orderby ? orderby.split("|") : [];

	for (let i = 0, n = orderby_array.length; i < n; i++) {
		let order = orderby_array[i].split(",");
		order[1] = order[1] || "ASC";
		sql_orderby += " " + order[0] + " " + order[1];
	}

	return sql_orderby;
}

function getDatasets(datasets) {
	const datasets_array = datasets ? datasets.split("|") : [];
	let datasets_list = [];

	for (let i = 0, n = datasets_array.length; i < n; i++) {
		const dataset_parts = datasets_array[i].split(",");
		let dataset_object = {};
		dataset_object.name = dataset_parts[0];
		dataset_object.id = dataset_parts[1] || dataset_parts[0].replace(/\.[^/.]+$/, "");
		datasets_list.push(dataset_object);
	}

	return datasets_list;
}

function getJsonStringValues(axis) {
	if (axis) {
		let jsonString = '"' + axis.replace(/([:|,])/g, '"$1"') + '"';
		jsonString = jsonString.replace(/(\"0\"|\"false\")/gi, false);
		console.log(axis, jsonString, JSON.parse('{' + jsonString + '}'));
		return JSON.parse('{' + jsonString + '}');
	}

	return false;
}

function getYAxis(yaxis) {
	const result = [];

	if (yaxis) {
		const axis = yaxis.split("|");

		for (var i = 0, n = axis.length; i < n; i++) {
			result[i] = getJsonStringValues(axis[i]);
		}
	}

	return result;
}

function instance($$self, $$props, $$invalidate) {
	let xAxis;
	let yAxis;
	let { id = false } = $$props;
	let { attribution = "" } = $$props;
	let { title = "" } = $$props;
	let { localcss = false } = $$props;
	let { url = false } = $$props;
	let { api = "d4c" } = $$props;
	let { datasets = false } = $$props;
	let { fields = "" } = $$props;
	let { from = false } = $$props;
	let { where = false } = $$props;
	let { groupby = false } = $$props;
	let { having = false } = $$props;
	let { orderby = false } = $$props;
	let { search = "" } = $$props;
	let { filter = "" } = $$props;
	let { max = 50 } = $$props;
	let { x = "" } = $$props;
	let { y = "" } = $$props;
	let { chart = "bar" } = $$props;
	let { series = false } = $$props;
	let { colors = false } = $$props;
	let { xaxis = false } = $$props;
	let { yaxis = false } = $$props;
	let { legend = false } = $$props;
	let { padding = false } = $$props;
	let { dlalign = "center" } = $$props;
	let { dlanchor = "center" } = $$props;
	let { dlbackgroundcolor = 'rgba(0, 0, 0, 0.1)' } = $$props;
	let { dlbordercolor = 'rgba(0, 0, 0, 0.1)' } = $$props;
	let { dlborderradius = 0 } = $$props;
	let { dlborderwidth = 0 } = $$props;
	let { dlclamp = false } = $$props;
	let { dlclip = false } = $$props;
	let { dlcolor = "#666" } = $$props;
	let { dldisplay = true } = $$props;
	let { dldisplaylimit = false } = $$props;
	let { dlfontfamily = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif" } = $$props;
	let { dlfontsize = 12 } = $$props;
	let { dlfontstyle = 'normal' } = $$props;
	let { dlfontweight = undefined } = $$props;
	let { dlfontlineheight = 1.2 } = $$props;
	let { dllabels = undefined } = $$props;
	let { dlformatter = false } = $$props;
	let { dllistener = {} } = $$props;
	let { dloffset = 4 } = $$props;
	let { dlopacity = 1 } = $$props;
	let { dlpaddingtop = 4 } = $$props;
	let { dlpaddingright = 4 } = $$props;
	let { dlpaddingbottom = 4 } = $$props;
	let { dlpaddingleft = 4 } = $$props;
	let { dlrotation = 0 } = $$props;
	let { dltextalign = "start" } = $$props;
	let { dltextstrokecolor = null } = $$props;
	let { dltextstrokewidth = 0 } = $$props;
	let { dltextshadowblur = 0 } = $$props;
	let { dltextshadowcolor = false } = $$props;
	let { dlunit = "" } = $$props;
	let chartOptions = { plugins: {} };

	if (padding) {
		padding = padding.split(",");

		chartOptions.layout = {
			padding: {
				top: padding[0],
				right: padding.length == 1 ? padding[0] : padding[1],
				bottom: padding.length == 1 ? padding[0] : padding[2],
				left: padding.length == 1 ? padding[0] : padding[3]
			}
		};
	}

	chartOptions.plugins.datalabels = {
		align: dlalign,
		anchor: dlanchor,
		backgroundColor: dlbackgroundcolor,
		borderColor: dlbordercolor,
		borderRadius: parseInt(dlborderradius),
		borderwidth: parseInt(dlborderwidth),
		clamp: dlclamp,
		clip: dlclip,
		color: dlcolor,
		display: dldisplay,
		displayLimit: parseFloat(dldisplaylimit),
		font: {
			family: dlfontfamily,
			size: parseFloat(dlfontsize),
			style: dlfontstyle,
			weight: dlfontweight,
			lineheight: parseFloat(dlfontlineheight)
		},
		labels: dllabels,
		formatter: dlformatter,
		listeners: dllistener,
		offset: parseInt(dloffset),
		opacity: parseFloat(dlopacity),
		padding: {
			top: parseInt(dlpaddingtop),
			right: parseInt(dlpaddingright),
			bottom: parseInt(dlpaddingbottom),
			left: parseInt(dlpaddingleft)
		},
		rotation: parseFloat(dlrotation),
		textalign: dltextalign,
		textstrokecolor: dltextstrokecolor,
		textstrokewidth: parseInt(dltextstrokewidth),
		textshadowblur: dltextshadowblur,
		textshadowcolor: dltextshadowcolor,
		unit: dlunit
	};

	let loading = 0;
	let data = false;
	let items = [];
	let filteredItems = [];
	let canvasElement;
	let graph;
	let filterValues = [];
	let filterValue;
	let filterField;
	let filterFieldId;
	let filterLabel;
	let searchPlaceholder = "";
	let searchValue = "";
	let searchFields = [];
	let xField = "";
	let yFields = [];

	function getPromiseData(url, datasets, fields_array, max, api) {
		const datasets_list = datasets
		? getDatasets(datasets)
		: [
				{
					name: url.substring(url.lastIndexOf("/") + 1)
				}
			];

		const url_base = datasets
		? url
		: url.substring(0, url.lastIndexOf("/")) + "/";

		let dataRequests = [];

		for (let i = 0, n = datasets_list.length; i < n; i++) {
			const apiFields = fields_array[i] ? fields_array[i] : false;
			const apiUrl = dgeHelpers.getUrl(url_base, datasets_list[i].name, max, apiFields, api);
			dataRequests.push(dgeHelpers.getData(apiUrl, api));
		}

		$$invalidate(10, loading++, loading);

		Promise.all(dataRequests).then(response => {
			$$invalidate(66, data = response);
			$$invalidate(10, loading--, loading);
		});
	}

	function getFilterValues(filterFieldId, items) {
		if (items.length && items[0].length && filterFieldId) {
			const sql_select = "SELECT DISTINCT " + filterFieldId + " FROM ? ORDER BY " + filterFieldId + " ASC;";
			let result = alasql_min.exports.exec(sql_select, items).filter(item => item[filterFieldId] = item[filterFieldId] ? item[filterFieldId] : "");
			return result;
		}

		return [];
	}

	function getItems(data, datasets, fields, from, where, groupby, orderby, filter, search, x, y) {
		if (data.length) {
			const datasets_list = getDatasets(datasets);

			// Get fields for SQL select request part
			let sql_fields = [];

			// If fields property exists: use it to generate sql_fields base otherwise []
			// fields_list is the list of fields with format for each field: {name: field1} or {name: field1*field2, id: fieldx} or {name: field1, id: fieldx}
			let fields_array = fields ? fields.split("|") : [];

			let fields_list = [];

			for (let i = 0, n = fields_array.length; i < n; i++) {
				const fields = fields_array[i].split(",");

				for (let j = 0, m = fields.length; j < m; j++) {
					const dataset = datasets_list.length > 1 ? datasets_list[i] : "";
					const field = getField(fields[j], false, dataset);
					fields_list = addField(fields_list, field);
				}
			}

			// Get searchField from search property
			let search_array;

			if (search) {
				search_array = search.split("|");
				$$invalidate(14, searchPlaceholder = search_array[0]);
				searchFields = search_array[1].split(",");
			}

			// Get filterField from filter property
			let filter_array;

			if (filter) {
				filter_array = filter.split("|");
				$$invalidate(13, filterLabel = filter_array[0]);
				filterField = filter_array[1];
			}

			// Add x field to fields_list
			const x_field = getField(x);

			fields_list = addField(fields_list, x_field);
			$$invalidate(70, xField = x_field.id);

			// Add filter field to fields_list
			const filter_field = getField(filterField);

			fields_list = addField(fields_list, filter_field);
			$$invalidate(7, filterFieldId = filter_field.id);

			// Add search fields to fields_list
			for (let i = 0, n = searchFields.length; i < n; i++) {
				const field = getField(searchFields[i]);
				fields_list = addField(fields_list, field);
			}

			// Add y field to yFields array for chart generation and to fields_list if not groupby
			let y_array = y.split("|");

			for (let i = 0, n = y_array.length; i < n; i++) {
				const y_field = getField(y_array[i], "y" + i);

				if (!yFields.includes(y_field.id)) {
					yFields.push(y_field.id);
				}

				if (!groupby) {
					fields_list = addField(fields_list, y_field);
				}
			}

			// Generate fields for select SQL request part from fields_list
			for (let i = 0, n = fields_list.length; i < n; i++) {
				if (fields_list[i]) {
					const field_name = fields_list[i].table
					? fields_list[i].table + "." + fields_list[i].name
					: fields_list[i].name;

					const field_id = fields_list[i].id;
					sql_fields.push(field_id ? field_name + " AS " + field_id : field_name);
				}
			}

			sql_fields = sql_fields.join(", ");

			// Get select SQL request part
			const sql_select = "SELECT " + sql_fields;

			// Get from SQL request part
			const sql_from = from ? " FROM " + from : " FROM ?";

			// Get where SQL request part
			const sql_where = where ? " WHERE " + where : " WHERE 1";

			// Get orderby SQL request part
			// Orderby property format: orderby="field1" (defaut = ASC) or orderby="field1|field2" (defaut = ASC) or orderby="field1,DESC|field2" (defaut = ASC for field2)
			const sql_orderby = getOrderby(orderby);

			// Get final SQL request
			const sql_request = sql_select + sql_from + sql_where + sql_orderby;

			// Get result of sql_request request from data
			let result = alasql_min.exports.exec(sql_request, data);

			// Add fulltext search column
			result = search
			? dgeHelpers.addFulltextField(result, searchFields, searchField)
			: result;

			console.log("Result:", data, sql_request, result);
			return result;
		}

		return [];
	}

	function getFilteredItems(items, groupby, having, orderby, filterValue, searchValue, y) {
		if (items.length && items[0].length) {
			// Get select SQL request part
			let sql_select = "SELECT *";

			// If groupby, add y field to fields list for select SQL request part
			if (groupby) {
				let sql_y = [];
				const y_array = y.split("|");

				for (let i = 0, n = y_array.length; i < n; i++) {
					const y_field = getField(y_array[i]);

					sql_y.push(y_field.id
					? y_field.name + " AS " + y_field.id
					: y_field.name);
				}

				sql_select += ", " + sql_y.join(", ");
			}

			// Get from SQL request part
			const sql_from = " FROM ?";

			// Get where SQL request part
			let sql_where = " WHERE 1";

			if (filterValue) {
				sql_where += " AND " + filterFieldId + "=" + "'" + filterValue + "'";
			}

			if (searchValue) {
				sql_where += " AND " + searchField + " LIKE " + "'%" + searchValue + "%'";
			}

			// Get groupby SQL request part
			const sql_groupby = groupby
			? " GROUP BY " + groupby.split("|").join(", ")
			: "";

			// Get having SQL request part
			const sql_having = having ? " HAVING " + having : "";

			// Get orderby SQL request
			// Orderby property format: orderby="field1" (defaut = ASC) or orderby="field1|field2" (defaut = ASC) or orderby="field1,DESC|field2" (defaut = ASC for field2)
			const sql_orderby = getOrderby(orderby);

			// Get final SQL request
			const sql_request = sql_select + sql_from + sql_where + sql_groupby + sql_having + sql_orderby;

			const result = alasql_min.exports.exec(sql_request, items);
			console.log("Result 2", items, sql_request, result);
			return result;
		}

		return [];
	}

	onMount(() => {
		$$invalidate(0, attribution = attribution.split("|"));
		$$invalidate(8, searchValue = search.split("|")[2]);
		$$invalidate(9, filterValue = filter.split("|")[2]);

		// Init empty graphic
		let plugins = [plugin];

		$$invalidate(69, graph = dgeChart.createChart(canvasElement, { plugins }));
		let fields_array = fields.split("|");

		// Get data
		getPromiseData(url, datasets, fields_array, max, api);
	});

	function input_input_handler() {
		searchValue = this.value;
		$$invalidate(8, searchValue);
	}

	function select_change_handler() {
		filterValue = select_value(this);
		$$invalidate(9, filterValue);
		((((((((((((((((((((((((((((($$invalidate(12, filterValues), $$invalidate(7, filterFieldId)), $$invalidate(67, items)), $$invalidate(24, where)), $$invalidate(66, data)), $$invalidate(21, datasets)), $$invalidate(22, fields)), $$invalidate(23, from)), $$invalidate(25, groupby)), $$invalidate(27, orderby)), $$invalidate(6, filter)), $$invalidate(5, search)), $$invalidate(29, x)), $$invalidate(30, y)), $$invalidate(26, having)), $$invalidate(9, filterValue)), $$invalidate(8, searchValue)), $$invalidate(69, graph)), $$invalidate(15, chart)), $$invalidate(16, series)), $$invalidate(70, xField)), $$invalidate(78, yFields)), $$invalidate(17, colors)), $$invalidate(68, filteredItems)), $$invalidate(72, xAxis)), $$invalidate(71, yAxis)), $$invalidate(18, legend)), $$invalidate(65, chartOptions)), $$invalidate(31, xaxis)), $$invalidate(32, yaxis));
		$$invalidate(7, filterFieldId);
	}

	function canvas_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			canvasElement = $$value;
			$$invalidate(11, canvasElement);
		});
	}

	$$self.$$set = $$props => {
		if ('id' in $$props) $$invalidate(1, id = $$props.id);
		if ('attribution' in $$props) $$invalidate(0, attribution = $$props.attribution);
		if ('title' in $$props) $$invalidate(2, title = $$props.title);
		if ('localcss' in $$props) $$invalidate(3, localcss = $$props.localcss);
		if ('url' in $$props) $$invalidate(4, url = $$props.url);
		if ('api' in $$props) $$invalidate(20, api = $$props.api);
		if ('datasets' in $$props) $$invalidate(21, datasets = $$props.datasets);
		if ('fields' in $$props) $$invalidate(22, fields = $$props.fields);
		if ('from' in $$props) $$invalidate(23, from = $$props.from);
		if ('where' in $$props) $$invalidate(24, where = $$props.where);
		if ('groupby' in $$props) $$invalidate(25, groupby = $$props.groupby);
		if ('having' in $$props) $$invalidate(26, having = $$props.having);
		if ('orderby' in $$props) $$invalidate(27, orderby = $$props.orderby);
		if ('search' in $$props) $$invalidate(5, search = $$props.search);
		if ('filter' in $$props) $$invalidate(6, filter = $$props.filter);
		if ('max' in $$props) $$invalidate(28, max = $$props.max);
		if ('x' in $$props) $$invalidate(29, x = $$props.x);
		if ('y' in $$props) $$invalidate(30, y = $$props.y);
		if ('chart' in $$props) $$invalidate(15, chart = $$props.chart);
		if ('series' in $$props) $$invalidate(16, series = $$props.series);
		if ('colors' in $$props) $$invalidate(17, colors = $$props.colors);
		if ('xaxis' in $$props) $$invalidate(31, xaxis = $$props.xaxis);
		if ('yaxis' in $$props) $$invalidate(32, yaxis = $$props.yaxis);
		if ('legend' in $$props) $$invalidate(18, legend = $$props.legend);
		if ('padding' in $$props) $$invalidate(19, padding = $$props.padding);
		if ('dlalign' in $$props) $$invalidate(33, dlalign = $$props.dlalign);
		if ('dlanchor' in $$props) $$invalidate(34, dlanchor = $$props.dlanchor);
		if ('dlbackgroundcolor' in $$props) $$invalidate(35, dlbackgroundcolor = $$props.dlbackgroundcolor);
		if ('dlbordercolor' in $$props) $$invalidate(36, dlbordercolor = $$props.dlbordercolor);
		if ('dlborderradius' in $$props) $$invalidate(37, dlborderradius = $$props.dlborderradius);
		if ('dlborderwidth' in $$props) $$invalidate(38, dlborderwidth = $$props.dlborderwidth);
		if ('dlclamp' in $$props) $$invalidate(39, dlclamp = $$props.dlclamp);
		if ('dlclip' in $$props) $$invalidate(40, dlclip = $$props.dlclip);
		if ('dlcolor' in $$props) $$invalidate(41, dlcolor = $$props.dlcolor);
		if ('dldisplay' in $$props) $$invalidate(42, dldisplay = $$props.dldisplay);
		if ('dldisplaylimit' in $$props) $$invalidate(43, dldisplaylimit = $$props.dldisplaylimit);
		if ('dlfontfamily' in $$props) $$invalidate(44, dlfontfamily = $$props.dlfontfamily);
		if ('dlfontsize' in $$props) $$invalidate(45, dlfontsize = $$props.dlfontsize);
		if ('dlfontstyle' in $$props) $$invalidate(46, dlfontstyle = $$props.dlfontstyle);
		if ('dlfontweight' in $$props) $$invalidate(47, dlfontweight = $$props.dlfontweight);
		if ('dlfontlineheight' in $$props) $$invalidate(48, dlfontlineheight = $$props.dlfontlineheight);
		if ('dllabels' in $$props) $$invalidate(49, dllabels = $$props.dllabels);
		if ('dlformatter' in $$props) $$invalidate(50, dlformatter = $$props.dlformatter);
		if ('dllistener' in $$props) $$invalidate(51, dllistener = $$props.dllistener);
		if ('dloffset' in $$props) $$invalidate(52, dloffset = $$props.dloffset);
		if ('dlopacity' in $$props) $$invalidate(53, dlopacity = $$props.dlopacity);
		if ('dlpaddingtop' in $$props) $$invalidate(54, dlpaddingtop = $$props.dlpaddingtop);
		if ('dlpaddingright' in $$props) $$invalidate(55, dlpaddingright = $$props.dlpaddingright);
		if ('dlpaddingbottom' in $$props) $$invalidate(56, dlpaddingbottom = $$props.dlpaddingbottom);
		if ('dlpaddingleft' in $$props) $$invalidate(57, dlpaddingleft = $$props.dlpaddingleft);
		if ('dlrotation' in $$props) $$invalidate(58, dlrotation = $$props.dlrotation);
		if ('dltextalign' in $$props) $$invalidate(59, dltextalign = $$props.dltextalign);
		if ('dltextstrokecolor' in $$props) $$invalidate(60, dltextstrokecolor = $$props.dltextstrokecolor);
		if ('dltextstrokewidth' in $$props) $$invalidate(61, dltextstrokewidth = $$props.dltextstrokewidth);
		if ('dltextshadowblur' in $$props) $$invalidate(62, dltextshadowblur = $$props.dltextshadowblur);
		if ('dltextshadowcolor' in $$props) $$invalidate(63, dltextshadowcolor = $$props.dltextshadowcolor);
		if ('dlunit' in $$props) $$invalidate(64, dlunit = $$props.dlunit);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*chart*/ 32768) {
			$$invalidate(15, chart = chart ? chart.split("|") : false);
		}

		if ($$self.$$.dirty[0] & /*series*/ 65536) {
			$$invalidate(16, series = series ? series.split("|") : false);
		}

		if ($$self.$$.dirty[0] & /*colors*/ 131072) {
			$$invalidate(17, colors = colors ? colors.split("|") : false);
		}

		if ($$self.$$.dirty[1] & /*xaxis*/ 1) {
			$$invalidate(72, xAxis = xaxis ? getJsonStringValues(xaxis) : false);
		}

		if ($$self.$$.dirty[1] & /*yaxis*/ 2) {
			$$invalidate(71, yAxis = yaxis ? getYAxis(yaxis) : false);
		}

		if ($$self.$$.dirty[0] & /*legend*/ 262144) {
			$$invalidate(18, legend = legend ? getJsonStringValues(legend) : false);
		}

		if ($$self.$$.dirty[0] & /*where, datasets, fields, from, groupby, orderby, filter, search, x, y, having, filterValue, searchValue, chart, series, colors, legend*/ 1877443424 | $$self.$$.dirty[2] & /*data, items, graph, xField, filteredItems, xAxis, yAxis, chartOptions*/ 2040) {
			// $: items = getItems(data, datasets, fields, from, where, groupby, orderby, filter, search, x, y);
			// $: {
			//     filteredItems = getFilteredItems([items], groupby, having, orderby, filterValue, searchValue, y);
			//     dgeChart.updateChart(graph, chart, series, xField, yFields, colors, filteredItems, xAxis, yAxis, legend, chartOptions);
			// }
			{
				let where_array = where ? where.split('|') : ['1=1'];

				for (let i = 0, n = where_array.length; i < n; i++) {
					$$invalidate(67, items[i] = getItems(data, datasets, fields, from, where_array[i], groupby, orderby, filter, search, x, y), items);
					$$invalidate(68, filteredItems[i] = getFilteredItems([items[i]], groupby, having, orderby, filterValue, searchValue, y), filteredItems);
				}

				dgeChart.updateChart(graph, chart, series, xField, yFields, colors, filteredItems, xAxis, yAxis, legend, chartOptions);
			} // items = getItems(data, datasets, fields, from, where, groupby, orderby, filter, search, x, y);
		}

		if ($$self.$$.dirty[0] & /*filterFieldId*/ 128 | $$self.$$.dirty[2] & /*items*/ 32) {
			$$invalidate(12, filterValues = getFilterValues(filterFieldId, [items]));
		}
	};

	return [
		attribution,
		id,
		title,
		localcss,
		url,
		search,
		filter,
		filterFieldId,
		searchValue,
		filterValue,
		loading,
		canvasElement,
		filterValues,
		filterLabel,
		searchPlaceholder,
		chart,
		series,
		colors,
		legend,
		padding,
		api,
		datasets,
		fields,
		from,
		where,
		groupby,
		having,
		orderby,
		max,
		x,
		y,
		xaxis,
		yaxis,
		dlalign,
		dlanchor,
		dlbackgroundcolor,
		dlbordercolor,
		dlborderradius,
		dlborderwidth,
		dlclamp,
		dlclip,
		dlcolor,
		dldisplay,
		dldisplaylimit,
		dlfontfamily,
		dlfontsize,
		dlfontstyle,
		dlfontweight,
		dlfontlineheight,
		dllabels,
		dlformatter,
		dllistener,
		dloffset,
		dlopacity,
		dlpaddingtop,
		dlpaddingright,
		dlpaddingbottom,
		dlpaddingleft,
		dlrotation,
		dltextalign,
		dltextstrokecolor,
		dltextstrokewidth,
		dltextshadowblur,
		dltextshadowcolor,
		dlunit,
		chartOptions,
		data,
		items,
		filteredItems,
		graph,
		xField,
		yAxis,
		xAxis,
		input_input_handler,
		select_change_handler,
		canvas_binding
	];
}

class DGE_Chart extends SvelteElement {
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
				url: 4,
				api: 20,
				datasets: 21,
				fields: 22,
				from: 23,
				where: 24,
				groupby: 25,
				having: 26,
				orderby: 27,
				search: 5,
				filter: 6,
				max: 28,
				x: 29,
				y: 30,
				chart: 15,
				series: 16,
				colors: 17,
				xaxis: 31,
				yaxis: 32,
				legend: 18,
				padding: 19,
				dlalign: 33,
				dlanchor: 34,
				dlbackgroundcolor: 35,
				dlbordercolor: 36,
				dlborderradius: 37,
				dlborderwidth: 38,
				dlclamp: 39,
				dlclip: 40,
				dlcolor: 41,
				dldisplay: 42,
				dldisplaylimit: 43,
				dlfontfamily: 44,
				dlfontsize: 45,
				dlfontstyle: 46,
				dlfontweight: 47,
				dlfontlineheight: 48,
				dllabels: 49,
				dlformatter: 50,
				dllistener: 51,
				dloffset: 52,
				dlopacity: 53,
				dlpaddingtop: 54,
				dlpaddingright: 55,
				dlpaddingbottom: 56,
				dlpaddingleft: 57,
				dlrotation: 58,
				dltextalign: 59,
				dltextstrokecolor: 60,
				dltextstrokewidth: 61,
				dltextshadowblur: 62,
				dltextshadowcolor: 63,
				dlunit: 64
			},
			null,
			[-1, -1, -1]
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
		return [
			"id",
			"attribution",
			"title",
			"localcss",
			"url",
			"api",
			"datasets",
			"fields",
			"from",
			"where",
			"groupby",
			"having",
			"orderby",
			"search",
			"filter",
			"max",
			"x",
			"y",
			"chart",
			"series",
			"colors",
			"xaxis",
			"yaxis",
			"legend",
			"padding",
			"dlalign",
			"dlanchor",
			"dlbackgroundcolor",
			"dlbordercolor",
			"dlborderradius",
			"dlborderwidth",
			"dlclamp",
			"dlclip",
			"dlcolor",
			"dldisplay",
			"dldisplaylimit",
			"dlfontfamily",
			"dlfontsize",
			"dlfontstyle",
			"dlfontweight",
			"dlfontlineheight",
			"dllabels",
			"dlformatter",
			"dllistener",
			"dloffset",
			"dlopacity",
			"dlpaddingtop",
			"dlpaddingright",
			"dlpaddingbottom",
			"dlpaddingleft",
			"dlrotation",
			"dltextalign",
			"dltextstrokecolor",
			"dltextstrokewidth",
			"dltextshadowblur",
			"dltextshadowcolor",
			"dlunit"
		];
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

	get url() {
		return this.$$.ctx[4];
	}

	set url(url) {
		this.$$set({ url });
		flush();
	}

	get api() {
		return this.$$.ctx[20];
	}

	set api(api) {
		this.$$set({ api });
		flush();
	}

	get datasets() {
		return this.$$.ctx[21];
	}

	set datasets(datasets) {
		this.$$set({ datasets });
		flush();
	}

	get fields() {
		return this.$$.ctx[22];
	}

	set fields(fields) {
		this.$$set({ fields });
		flush();
	}

	get from() {
		return this.$$.ctx[23];
	}

	set from(from) {
		this.$$set({ from });
		flush();
	}

	get where() {
		return this.$$.ctx[24];
	}

	set where(where) {
		this.$$set({ where });
		flush();
	}

	get groupby() {
		return this.$$.ctx[25];
	}

	set groupby(groupby) {
		this.$$set({ groupby });
		flush();
	}

	get having() {
		return this.$$.ctx[26];
	}

	set having(having) {
		this.$$set({ having });
		flush();
	}

	get orderby() {
		return this.$$.ctx[27];
	}

	set orderby(orderby) {
		this.$$set({ orderby });
		flush();
	}

	get search() {
		return this.$$.ctx[5];
	}

	set search(search) {
		this.$$set({ search });
		flush();
	}

	get filter() {
		return this.$$.ctx[6];
	}

	set filter(filter) {
		this.$$set({ filter });
		flush();
	}

	get max() {
		return this.$$.ctx[28];
	}

	set max(max) {
		this.$$set({ max });
		flush();
	}

	get x() {
		return this.$$.ctx[29];
	}

	set x(x) {
		this.$$set({ x });
		flush();
	}

	get y() {
		return this.$$.ctx[30];
	}

	set y(y) {
		this.$$set({ y });
		flush();
	}

	get chart() {
		return this.$$.ctx[15];
	}

	set chart(chart) {
		this.$$set({ chart });
		flush();
	}

	get series() {
		return this.$$.ctx[16];
	}

	set series(series) {
		this.$$set({ series });
		flush();
	}

	get colors() {
		return this.$$.ctx[17];
	}

	set colors(colors) {
		this.$$set({ colors });
		flush();
	}

	get xaxis() {
		return this.$$.ctx[31];
	}

	set xaxis(xaxis) {
		this.$$set({ xaxis });
		flush();
	}

	get yaxis() {
		return this.$$.ctx[32];
	}

	set yaxis(yaxis) {
		this.$$set({ yaxis });
		flush();
	}

	get legend() {
		return this.$$.ctx[18];
	}

	set legend(legend) {
		this.$$set({ legend });
		flush();
	}

	get padding() {
		return this.$$.ctx[19];
	}

	set padding(padding) {
		this.$$set({ padding });
		flush();
	}

	get dlalign() {
		return this.$$.ctx[33];
	}

	set dlalign(dlalign) {
		this.$$set({ dlalign });
		flush();
	}

	get dlanchor() {
		return this.$$.ctx[34];
	}

	set dlanchor(dlanchor) {
		this.$$set({ dlanchor });
		flush();
	}

	get dlbackgroundcolor() {
		return this.$$.ctx[35];
	}

	set dlbackgroundcolor(dlbackgroundcolor) {
		this.$$set({ dlbackgroundcolor });
		flush();
	}

	get dlbordercolor() {
		return this.$$.ctx[36];
	}

	set dlbordercolor(dlbordercolor) {
		this.$$set({ dlbordercolor });
		flush();
	}

	get dlborderradius() {
		return this.$$.ctx[37];
	}

	set dlborderradius(dlborderradius) {
		this.$$set({ dlborderradius });
		flush();
	}

	get dlborderwidth() {
		return this.$$.ctx[38];
	}

	set dlborderwidth(dlborderwidth) {
		this.$$set({ dlborderwidth });
		flush();
	}

	get dlclamp() {
		return this.$$.ctx[39];
	}

	set dlclamp(dlclamp) {
		this.$$set({ dlclamp });
		flush();
	}

	get dlclip() {
		return this.$$.ctx[40];
	}

	set dlclip(dlclip) {
		this.$$set({ dlclip });
		flush();
	}

	get dlcolor() {
		return this.$$.ctx[41];
	}

	set dlcolor(dlcolor) {
		this.$$set({ dlcolor });
		flush();
	}

	get dldisplay() {
		return this.$$.ctx[42];
	}

	set dldisplay(dldisplay) {
		this.$$set({ dldisplay });
		flush();
	}

	get dldisplaylimit() {
		return this.$$.ctx[43];
	}

	set dldisplaylimit(dldisplaylimit) {
		this.$$set({ dldisplaylimit });
		flush();
	}

	get dlfontfamily() {
		return this.$$.ctx[44];
	}

	set dlfontfamily(dlfontfamily) {
		this.$$set({ dlfontfamily });
		flush();
	}

	get dlfontsize() {
		return this.$$.ctx[45];
	}

	set dlfontsize(dlfontsize) {
		this.$$set({ dlfontsize });
		flush();
	}

	get dlfontstyle() {
		return this.$$.ctx[46];
	}

	set dlfontstyle(dlfontstyle) {
		this.$$set({ dlfontstyle });
		flush();
	}

	get dlfontweight() {
		return this.$$.ctx[47];
	}

	set dlfontweight(dlfontweight) {
		this.$$set({ dlfontweight });
		flush();
	}

	get dlfontlineheight() {
		return this.$$.ctx[48];
	}

	set dlfontlineheight(dlfontlineheight) {
		this.$$set({ dlfontlineheight });
		flush();
	}

	get dllabels() {
		return this.$$.ctx[49];
	}

	set dllabels(dllabels) {
		this.$$set({ dllabels });
		flush();
	}

	get dlformatter() {
		return this.$$.ctx[50];
	}

	set dlformatter(dlformatter) {
		this.$$set({ dlformatter });
		flush();
	}

	get dllistener() {
		return this.$$.ctx[51];
	}

	set dllistener(dllistener) {
		this.$$set({ dllistener });
		flush();
	}

	get dloffset() {
		return this.$$.ctx[52];
	}

	set dloffset(dloffset) {
		this.$$set({ dloffset });
		flush();
	}

	get dlopacity() {
		return this.$$.ctx[53];
	}

	set dlopacity(dlopacity) {
		this.$$set({ dlopacity });
		flush();
	}

	get dlpaddingtop() {
		return this.$$.ctx[54];
	}

	set dlpaddingtop(dlpaddingtop) {
		this.$$set({ dlpaddingtop });
		flush();
	}

	get dlpaddingright() {
		return this.$$.ctx[55];
	}

	set dlpaddingright(dlpaddingright) {
		this.$$set({ dlpaddingright });
		flush();
	}

	get dlpaddingbottom() {
		return this.$$.ctx[56];
	}

	set dlpaddingbottom(dlpaddingbottom) {
		this.$$set({ dlpaddingbottom });
		flush();
	}

	get dlpaddingleft() {
		return this.$$.ctx[57];
	}

	set dlpaddingleft(dlpaddingleft) {
		this.$$set({ dlpaddingleft });
		flush();
	}

	get dlrotation() {
		return this.$$.ctx[58];
	}

	set dlrotation(dlrotation) {
		this.$$set({ dlrotation });
		flush();
	}

	get dltextalign() {
		return this.$$.ctx[59];
	}

	set dltextalign(dltextalign) {
		this.$$set({ dltextalign });
		flush();
	}

	get dltextstrokecolor() {
		return this.$$.ctx[60];
	}

	set dltextstrokecolor(dltextstrokecolor) {
		this.$$set({ dltextstrokecolor });
		flush();
	}

	get dltextstrokewidth() {
		return this.$$.ctx[61];
	}

	set dltextstrokewidth(dltextstrokewidth) {
		this.$$set({ dltextstrokewidth });
		flush();
	}

	get dltextshadowblur() {
		return this.$$.ctx[62];
	}

	set dltextshadowblur(dltextshadowblur) {
		this.$$set({ dltextshadowblur });
		flush();
	}

	get dltextshadowcolor() {
		return this.$$.ctx[63];
	}

	set dltextshadowcolor(dltextshadowcolor) {
		this.$$set({ dltextshadowcolor });
		flush();
	}

	get dlunit() {
		return this.$$.ctx[64];
	}

	set dlunit(dlunit) {
		this.$$set({ dlunit });
		flush();
	}
}

customElements.define("dge-chart", DGE_Chart);

export { DGE_Chart as default };
