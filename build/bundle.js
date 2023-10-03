
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
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
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
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
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
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
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
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
            ctx: [],
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
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
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
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Projects.svelte generated by Svelte v3.55.1 */

    const file$1 = "src\\components\\Projects.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let p0;
    	let t0;
    	let t1;
    	let a;
    	let i0;
    	let br;
    	let t2;
    	let span0;
    	let i1;
    	let t3;
    	let t4_value = new Date(/*date*/ ctx[3]).getDate() + "";
    	let t4;
    	let t5;
    	let t6_value = new Date(/*date*/ ctx[3]).getUTCMonth() + 1 + "";
    	let t6;
    	let t7;
    	let t8_value = new Date(/*date*/ ctx[3]).getFullYear() + "";
    	let t8;
    	let t9;
    	let p1;

    	let t10_value = (/*description*/ ctx[4]
    	? /*description*/ ctx[4]
    	: 'No Description created!') + "";

    	let t10;
    	let t11;
    	let span1;
    	let t12_value = (/*language*/ ctx[2] ? /*language*/ ctx[2] : 'Svelte') + "";
    	let t12;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			t0 = text(/*name*/ ctx[0]);
    			t1 = space();
    			a = element("a");
    			i0 = element("i");
    			br = element("br");
    			t2 = space();
    			span0 = element("span");
    			i1 = element("i");
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = text("/");
    			t6 = text(t6_value);
    			t7 = text("/");
    			t8 = text(t8_value);
    			t9 = space();
    			p1 = element("p");
    			t10 = text(t10_value);
    			t11 = space();
    			span1 = element("span");
    			t12 = text(t12_value);
    			attr_dev(i0, "class", "fas fa-external-link-alt");
    			add_location(i0, file$1, 8, 106, 376);
    			attr_dev(a, "href", /*url*/ ctx[1]);
    			attr_dev(a, "style", ";float:right");
    			add_location(a, file$1, 8, 69, 339);
    			add_location(br, file$1, 8, 150, 420);
    			attr_dev(i1, "class", "fas fa-calendar-alt");
    			add_location(i1, file$1, 8, 197, 467);
    			set_style(span0, "font-size", "14px");
    			set_style(span0, "color", "white");
    			add_location(span0, file$1, 8, 155, 425);
    			set_style(p0, "font-size", "20px");
    			set_style(p0, "font-weight", "bold");
    			attr_dev(p0, "class", "name svelte-1jacn2");
    			add_location(p0, file$1, 8, 4, 274);
    			set_style(p1, "max-height", "50px");
    			set_style(p1, "word-break", "break-all");
    			set_style(p1, "font-weight", "500");
    			set_style(p1, "font-size", "15px");
    			add_location(p1, file$1, 9, 4, 612);
    			add_location(span1, file$1, 10, 4, 752);
    			attr_dev(div, "class", "card-project up svelte-1jacn2");
    			attr_dev(div, "style", ";border-radius:3px;padding:10px;display:inline-block;width:350px;margin-top:20px;margin-right:20px");
    			add_location(div, file$1, 7, 0, 131);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(p0, a);
    			append_dev(a, i0);
    			append_dev(p0, br);
    			append_dev(p0, t2);
    			append_dev(p0, span0);
    			append_dev(span0, i1);
    			append_dev(span0, t3);
    			append_dev(span0, t4);
    			append_dev(span0, t5);
    			append_dev(span0, t6);
    			append_dev(span0, t7);
    			append_dev(span0, t8);
    			append_dev(div, t9);
    			append_dev(div, p1);
    			append_dev(p1, t10);
    			append_dev(div, t11);
    			append_dev(div, span1);
    			append_dev(span1, t12);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data_dev(t0, /*name*/ ctx[0]);

    			if (dirty & /*url*/ 2) {
    				attr_dev(a, "href", /*url*/ ctx[1]);
    			}

    			if (dirty & /*date*/ 8 && t4_value !== (t4_value = new Date(/*date*/ ctx[3]).getDate() + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*date*/ 8 && t6_value !== (t6_value = new Date(/*date*/ ctx[3]).getUTCMonth() + 1 + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*date*/ 8 && t8_value !== (t8_value = new Date(/*date*/ ctx[3]).getFullYear() + "")) set_data_dev(t8, t8_value);

    			if (dirty & /*description*/ 16 && t10_value !== (t10_value = (/*description*/ ctx[4]
    			? /*description*/ ctx[4]
    			: 'No Description created!') + "")) set_data_dev(t10, t10_value);

    			if (dirty & /*language*/ 4 && t12_value !== (t12_value = (/*language*/ ctx[2] ? /*language*/ ctx[2] : 'Svelte') + "")) set_data_dev(t12, t12_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Projects', slots, []);
    	let { name } = $$props;
    	let { url } = $$props;
    	let { language } = $$props;
    	let { date } = $$props;
    	let { description } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (name === undefined && !('name' in $$props || $$self.$$.bound[$$self.$$.props['name']])) {
    			console.warn("<Projects> was created without expected prop 'name'");
    		}

    		if (url === undefined && !('url' in $$props || $$self.$$.bound[$$self.$$.props['url']])) {
    			console.warn("<Projects> was created without expected prop 'url'");
    		}

    		if (language === undefined && !('language' in $$props || $$self.$$.bound[$$self.$$.props['language']])) {
    			console.warn("<Projects> was created without expected prop 'language'");
    		}

    		if (date === undefined && !('date' in $$props || $$self.$$.bound[$$self.$$.props['date']])) {
    			console.warn("<Projects> was created without expected prop 'date'");
    		}

    		if (description === undefined && !('description' in $$props || $$self.$$.bound[$$self.$$.props['description']])) {
    			console.warn("<Projects> was created without expected prop 'description'");
    		}
    	});

    	const writable_props = ['name', 'url', 'language', 'date', 'description'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Projects> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('url' in $$props) $$invalidate(1, url = $$props.url);
    		if ('language' in $$props) $$invalidate(2, language = $$props.language);
    		if ('date' in $$props) $$invalidate(3, date = $$props.date);
    		if ('description' in $$props) $$invalidate(4, description = $$props.description);
    	};

    	$$self.$capture_state = () => ({ name, url, language, date, description });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('url' in $$props) $$invalidate(1, url = $$props.url);
    		if ('language' in $$props) $$invalidate(2, language = $$props.language);
    		if ('date' in $$props) $$invalidate(3, date = $$props.date);
    		if ('description' in $$props) $$invalidate(4, description = $$props.description);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, url, language, date, description];
    }

    class Projects extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			name: 0,
    			url: 1,
    			language: 2,
    			date: 3,
    			description: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Projects",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get name() {
    		throw new Error("<Projects>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Projects>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Projects>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Projects>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get language() {
    		throw new Error("<Projects>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set language(value) {
    		throw new Error("<Projects>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get date() {
    		throw new Error("<Projects>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set date(value) {
    		throw new Error("<Projects>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get description() {
    		throw new Error("<Projects>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<Projects>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\App.svelte generated by Svelte v3.55.1 */
    const file = "src\\components\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (59:5) {:else}
    function create_else_block_2(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Loading...";
    			add_location(span, file, 59, 5, 2858);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(59:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (52:5) {:else}
    function create_else_block_1(ctx) {
    	let t;
    	let i_1;
    	let i_1_title_value;
    	let i_1_class_value;
    	let if_block = /*language*/ ctx[6] === "c++" && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			i_1 = element("i");
    			attr_dev(i_1, "data-toggle", "tooltip");
    			attr_dev(i_1, "data-placement", "right");
    			attr_dev(i_1, "title", i_1_title_value = /*language*/ ctx[6]);
    			set_style(i_1, "margin", "5px");
    			set_style(i_1, "font-size", "25px");
    			attr_dev(i_1, "class", i_1_class_value = "devicon-" + /*language*/ ctx[6] + "-plain colored" + " svelte-n8iaf5");
    			add_location(i_1, file, 56, 5, 2679);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, i_1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*language*/ ctx[6] === "c++") {
    				if (if_block) ; else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*i*/ 2 && i_1_title_value !== (i_1_title_value = /*language*/ ctx[6])) {
    				attr_dev(i_1, "title", i_1_title_value);
    			}

    			if (dirty & /*i*/ 2 && i_1_class_value !== (i_1_class_value = "devicon-" + /*language*/ ctx[6] + "-plain colored" + " svelte-n8iaf5")) {
    				attr_dev(i_1, "class", i_1_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(i_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(52:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (50:5) {#if language === "ejs"}
    function create_if_block(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "EJS";
    			attr_dev(span, "data-toggle", "tooltip");
    			attr_dev(span, "data-placement", "right");
    			attr_dev(span, "title", "ejs");
    			set_style(span, "margin", "5px");
    			set_style(span, "color", "#f3db4c");
    			set_style(span, "font-size", "25px");
    			set_style(span, "font-weight", "bold");
    			add_location(span, file, 50, 5, 2285);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(50:5) {#if language === \\\"ejs\\\"}",
    		ctx
    	});

    	return block;
    }

    // (53:5) {#if language === "c++"}
    function create_if_block_1(ctx) {
    	let span;
    	let i_1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			i_1 = element("i");
    			attr_dev(i_1, "class", "devicon-cplusplus-plain-wordmark");
    			add_location(i_1, file, 53, 133, 2603);
    			attr_dev(span, "data-toggle", "tooltip");
    			attr_dev(span, "data-placement", "right");
    			attr_dev(span, "title", "c++");
    			set_style(span, "margin", "5px");
    			set_style(span, "color", "#348feb");
    			set_style(span, "font-size", "25px");
    			set_style(span, "font-weight", "bold");
    			add_location(span, file, 53, 5, 2475);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i_1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(53:5) {#if language === \\\"c++\\\"}",
    		ctx
    	});

    	return block;
    }

    // (49:5) {#each i as language}
    function create_each_block_1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*language*/ ctx[6] === "ejs") return create_if_block;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(49:5) {#each i as language}",
    		ctx
    	});

    	return block;
    }

    // (129:4) {:else}
    function create_else_block(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Loading...";
    			add_location(span, file, 129, 4, 5342);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(129:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (127:4) {#each projects as repo}
    function create_each_block(ctx) {
    	let projects_1;
    	let current;

    	projects_1 = new Projects({
    			props: {
    				description: /*repo*/ ctx[3].description,
    				name: /*repo*/ ctx[3].name,
    				url: /*repo*/ ctx[3].html_url,
    				language: /*repo*/ ctx[3].language,
    				date: /*repo*/ ctx[3].created_at
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(projects_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(projects_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const projects_1_changes = {};
    			if (dirty & /*projects*/ 1) projects_1_changes.description = /*repo*/ ctx[3].description;
    			if (dirty & /*projects*/ 1) projects_1_changes.name = /*repo*/ ctx[3].name;
    			if (dirty & /*projects*/ 1) projects_1_changes.url = /*repo*/ ctx[3].html_url;
    			if (dirty & /*projects*/ 1) projects_1_changes.language = /*repo*/ ctx[3].language;
    			if (dirty & /*projects*/ 1) projects_1_changes.date = /*repo*/ ctx[3].created_at;
    			projects_1.$set(projects_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(projects_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(projects_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(projects_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(127:4) {#each projects as repo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div25;
    	let div3;
    	let div0;
    	let h20;
    	let p0;
    	let t1;
    	let t2;
    	let p1;
    	let t4;
    	let p2;
    	let t6;
    	let div1;
    	let t7;
    	let div2;
    	let t8;
    	let div6;
    	let div4;
    	let h21;
    	let t10;
    	let p3;
    	let t11;
    	let br0;
    	let t12;
    	let t13;
    	let span1;
    	let t14;
    	let br1;
    	let t15;
    	let t16;
    	let span0;
    	let i0;
    	let t17;
    	let div5;
    	let img;
    	let img_src_value;
    	let t18;
    	let br2;
    	let t19;
    	let hr0;
    	let t20;
    	let div22;
    	let h22;
    	let t22;
    	let div21;
    	let div7;
    	let h40;
    	let t24;
    	let ul1;
    	let li5;
    	let t25;
    	let ul0;
    	let li0;
    	let t27;
    	let li1;
    	let t29;
    	let li2;
    	let t31;
    	let li3;
    	let t33;
    	let li4;
    	let t34;
    	let a0;
    	let t36;
    	let t37;
    	let div20;
    	let h41;
    	let t39;
    	let ul2;
    	let li6;
    	let t40;
    	let div9;
    	let div8;
    	let t41;
    	let li7;
    	let t42;
    	let div11;
    	let div10;
    	let t43;
    	let li8;
    	let t44;
    	let div13;
    	let div12;
    	let t45;
    	let li9;
    	let t46;
    	let div15;
    	let div14;
    	let t47;
    	let li10;
    	let t48;
    	let div17;
    	let div16;
    	let t49;
    	let li11;
    	let t50;
    	let div19;
    	let div18;
    	let t51;
    	let hr1;
    	let t52;
    	let div23;
    	let h23;
    	let t54;
    	let t55;
    	let div24;
    	let a1;
    	let i1;
    	let t56;
    	let a2;
    	let i2;
    	let current;
    	let each_value_1 = /*i*/ ctx[1];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each0_else = null;

    	if (!each_value_1.length) {
    		each0_else = create_else_block_2(ctx);
    	}

    	let each_value = /*projects*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let each1_else = null;

    	if (!each_value.length) {
    		each1_else = create_else_block(ctx);
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div25 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			h20 = element("h2");
    			p0 = element("p");
    			p0.textContent = "Hi, There 👋 I'm ";
    			t1 = text("Bruno Bianchi.");
    			t2 = space();
    			p1 = element("p");
    			p1.textContent = "I Code Awesome Stuff for Internet.";
    			t4 = space();
    			p2 = element("p");
    			p2.textContent = "I am a Computer Engineering Student at Unifei (Federal university of Itajuba) . Currently, I'm focused on learning new languages and starting new projects on my own.";
    			t6 = space();
    			div1 = element("div");
    			t7 = space();
    			div2 = element("div");
    			t8 = space();
    			div6 = element("div");
    			div4 = element("div");
    			h21 = element("h2");
    			h21.textContent = "About Me";
    			t10 = space();
    			p3 = element("p");
    			t11 = text("Hello! My Name is Bruno Bianchi and I love creating projects from my creativity.");
    			br0 = element("br");
    			t12 = text("My interest in programming languages started back in 2014 when I code a minecraft server, since then my mind changed and I start learning javascript. Today I am focused in my University and Learning deeper other Langagues, such Pyhton, C ...");
    			t13 = space();
    			span1 = element("span");
    			t14 = text("Here are a few technologies I’ve been working with recently:");
    			br1 = element("br");
    			t15 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			if (each0_else) {
    				each0_else.c();
    			}

    			t16 = space();
    			span0 = element("span");
    			i0 = element("i");
    			t17 = space();
    			div5 = element("div");
    			img = element("img");
    			t18 = space();
    			br2 = element("br");
    			t19 = space();
    			hr0 = element("hr");
    			t20 = space();
    			div22 = element("div");
    			h22 = element("h2");
    			h22.textContent = "My Resume:";
    			t22 = space();
    			div21 = element("div");
    			div7 = element("div");
    			h40 = element("h4");
    			h40.textContent = "Education";
    			t24 = space();
    			ul1 = element("ul");
    			li5 = element("li");
    			t25 = text("2023\r\n\t\t\t\t\t\t\t  ");
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "UNIFEI - Computer Engeneering";
    			t27 = space();
    			li1 = element("li");
    			li1.textContent = "Course Git e Github Essencial para o Desenvolvedor";
    			t29 = space();
    			li2 = element("li");
    			li2.textContent = "Course Completo de Linguagem C e C++";
    			t31 = space();
    			li3 = element("li");
    			li3.textContent = "Course Algoritmos e Lógica de Programação 2023";
    			t33 = space();
    			li4 = element("li");
    			t34 = text("Desktop Dev Treinee at ");
    			a0 = element("a");
    			a0.textContent = "Asimov Jr";
    			t36 = text(".");
    			t37 = space();
    			div20 = element("div");
    			h41 = element("h4");
    			h41.textContent = "Programning Skill";
    			t39 = space();
    			ul2 = element("ul");
    			li6 = element("li");
    			t40 = text("C\r\n\t\t\t\t\t\t\t  ");
    			div9 = element("div");
    			div8 = element("div");
    			t41 = space();
    			li7 = element("li");
    			t42 = text("C ++\r\n\t\t\t\t\t\t\t  ");
    			div11 = element("div");
    			div10 = element("div");
    			t43 = space();
    			li8 = element("li");
    			t44 = text("Node js\r\n\t\t\t\t\t\t\t  ");
    			div13 = element("div");
    			div12 = element("div");
    			t45 = space();
    			li9 = element("li");
    			t46 = text("Pyhton\r\n\t\t\t\t\t\t\t  ");
    			div15 = element("div");
    			div14 = element("div");
    			t47 = space();
    			li10 = element("li");
    			t48 = text("Svelte\r\n\t\t\t\t\t\t\t  ");
    			div17 = element("div");
    			div16 = element("div");
    			t49 = space();
    			li11 = element("li");
    			t50 = text("HTML/CSS\r\n\t\t\t\t\t\t\t  ");
    			div19 = element("div");
    			div18 = element("div");
    			t51 = space();
    			hr1 = element("hr");
    			t52 = space();
    			div23 = element("div");
    			h23 = element("h2");
    			h23.textContent = "Some Of My Projects:";
    			t54 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each1_else) {
    				each1_else.c();
    			}

    			t55 = space();
    			div24 = element("div");
    			a1 = element("a");
    			i1 = element("i");
    			t56 = space();
    			a2 = element("a");
    			i2 = element("i");
    			set_style(p0, "padding", "6px");
    			set_style(p0, "background-color", "#358580");
    			set_style(p0, "width", "170px");
    			set_style(p0, "border-radius", "3px");
    			set_style(p0, "font-size", "20px");
    			set_style(p0, "margin-bottom", "-2px");
    			add_location(p0, file, 32, 49, 1004);
    			set_style(h20, "font-weight", "bold");
    			set_style(h20, "font-size", "75px");
    			add_location(h20, file, 32, 4, 959);
    			set_style(p1, "font-weight", "bold");
    			set_style(p1, "font-size", "50px");
    			set_style(p1, "line-height", "45px");
    			set_style(p1, "color", "#7f91ba");
    			add_location(p1, file, 33, 4, 1162);
    			set_style(p2, "font-weight", "500");
    			set_style(p2, "font-size", "20px");
    			add_location(p2, file, 34, 4, 1280);
    			attr_dev(div0, "data-aos", "fade-in");
    			attr_dev(div0, "class", "col-md-9");
    			add_location(div0, file, 31, 3, 911);
    			attr_dev(div1, "class", "col-md-3");
    			add_location(div1, file, 36, 3, 1507);
    			attr_dev(div2, "class", "scroll svelte-n8iaf5");
    			add_location(div2, file, 38, 3, 1545);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file, 30, 2, 889);
    			set_style(h21, "border-bottom", "2px solid white");
    			set_style(h21, "color", "#7f91ba");
    			set_style(h21, "font-weight", "bold");
    			add_location(h21, file, 44, 5, 1691);
    			add_location(br0, file, 46, 111, 1892);
    			set_style(p3, "margin-top", "15px");
    			add_location(p3, file, 46, 4, 1785);
    			add_location(br1, file, 47, 70, 2215);
    			set_style(i0, "margin", "5px");
    			set_style(i0, "font-size", "25px");
    			attr_dev(i0, "class", "devicon-nodejs-plain colored");
    			add_location(i0, file, 61, 72, 2970);
    			attr_dev(span0, "data-toggle", "tooltip");
    			attr_dev(span0, "data-placement", "right");
    			attr_dev(span0, "title", "node.js");
    			add_location(span0, file, 61, 5, 2903);
    			add_location(span1, file, 47, 4, 2149);
    			attr_dev(div4, "class", "col-md-7");
    			add_location(div4, file, 42, 3, 1657);
    			if (!src_url_equal(img.src, img_src_value = "https://avatars.githubusercontent.com/u/81328873?v=4")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Github");
    			attr_dev(img, "width", "200px;");
    			attr_dev(img, "height", "200px;");
    			set_style(img, "border-radius", "5%");
    			add_location(img, file, 65, 4, 3116);
    			attr_dev(div5, "class", "col-md-5");
    			add_location(div5, file, 64, 3, 3084);
    			attr_dev(div6, "data-aos", "fade-right");
    			set_style(div6, "margin-top", "90px");
    			attr_dev(div6, "class", "row");
    			add_location(div6, file, 41, 2, 1587);
    			add_location(br2, file, 68, 3, 3277);
    			add_location(hr0, file, 69, 3, 3286);
    			set_style(h22, "color", "#7f91ba");
    			set_style(h22, "font-weight", "bold");
    			add_location(h22, file, 71, 5, 3375);
    			set_style(h40, "margin-top", "30px");
    			add_location(h40, file, 74, 7, 3496);
    			attr_dev(li0, "class", "svelte-n8iaf5");
    			add_location(li0, file, 78, 8, 3632);
    			attr_dev(li1, "class", "svelte-n8iaf5");
    			add_location(li1, file, 79, 10, 3683);
    			attr_dev(li2, "class", "svelte-n8iaf5");
    			add_location(li2, file, 80, 10, 3754);
    			attr_dev(li3, "class", "svelte-n8iaf5");
    			add_location(li3, file, 81, 10, 3812);
    			set_style(a0, "margin-left", "10px");
    			attr_dev(a0, "href", "https://www.linkedin.com/company/asimovjr/mycompany/");
    			add_location(a0, file, 82, 37, 3907);
    			attr_dev(li4, "class", "svelte-n8iaf5");
    			add_location(li4, file, 82, 10, 3880);
    			attr_dev(ul0, "class", "svelte-n8iaf5");
    			add_location(ul0, file, 77, 9, 3618);
    			attr_dev(li5, "class", "year svelte-n8iaf5");
    			add_location(li5, file, 76, 9, 3586);
    			attr_dev(ul1, "class", "listexperience svelte-n8iaf5");
    			add_location(ul1, file, 75, 7, 3548);
    			attr_dev(div7, "class", "col-md-6");
    			add_location(div7, file, 73, 6, 3465);
    			set_style(h41, "margin-top", "30px");
    			add_location(h41, file, 87, 7, 4098);
    			attr_dev(div8, "class", "value p70 svelte-n8iaf5");
    			add_location(div8, file, 91, 8, 4236);
    			attr_dev(div9, "class", "bar svelte-n8iaf5");
    			add_location(div9, file, 90, 9, 4209);
    			attr_dev(li6, "class", "svelte-n8iaf5");
    			add_location(li6, file, 89, 9, 4193);
    			attr_dev(div10, "class", "value p70 svelte-n8iaf5");
    			add_location(div10, file, 96, 8, 4355);
    			attr_dev(div11, "class", "bar svelte-n8iaf5");
    			add_location(div11, file, 95, 9, 4328);
    			attr_dev(li7, "class", "svelte-n8iaf5");
    			add_location(li7, file, 94, 9, 4309);
    			attr_dev(div12, "class", "value p80 svelte-n8iaf5");
    			add_location(div12, file, 101, 8, 4477);
    			attr_dev(div13, "class", "bar svelte-n8iaf5");
    			add_location(div13, file, 100, 9, 4450);
    			attr_dev(li8, "class", "svelte-n8iaf5");
    			add_location(li8, file, 99, 9, 4428);
    			attr_dev(div14, "class", "value p20 svelte-n8iaf5");
    			add_location(div14, file, 106, 8, 4598);
    			attr_dev(div15, "class", "bar svelte-n8iaf5");
    			add_location(div15, file, 105, 9, 4571);
    			attr_dev(li9, "class", "svelte-n8iaf5");
    			add_location(li9, file, 104, 9, 4550);
    			attr_dev(div16, "class", "value p10 svelte-n8iaf5");
    			add_location(div16, file, 111, 8, 4719);
    			attr_dev(div17, "class", "bar svelte-n8iaf5");
    			add_location(div17, file, 110, 9, 4692);
    			attr_dev(li10, "class", "svelte-n8iaf5");
    			add_location(li10, file, 109, 9, 4671);
    			attr_dev(div18, "class", "value p40 svelte-n8iaf5");
    			add_location(div18, file, 116, 8, 4842);
    			attr_dev(div19, "class", "bar svelte-n8iaf5");
    			add_location(div19, file, 115, 9, 4815);
    			attr_dev(li11, "class", "svelte-n8iaf5");
    			add_location(li11, file, 114, 9, 4792);
    			attr_dev(ul2, "class", "listProgram svelte-n8iaf5");
    			add_location(ul2, file, 88, 7, 4158);
    			attr_dev(div20, "class", "col-md-6");
    			add_location(div20, file, 86, 6, 4067);
    			attr_dev(div21, "class", "row");
    			add_location(div21, file, 72, 5, 3440);
    			attr_dev(div22, "data-aos", "fade-right");
    			attr_dev(div22, "class", "container");
    			set_style(div22, "margin-top", "100px");
    			add_location(div22, file, 70, 4, 3296);
    			add_location(hr1, file, 123, 4, 4970);
    			attr_dev(h23, "style", ";color:#7f91ba;font-weight:bold;padding:10px;");
    			add_location(h23, file, 125, 4, 5056);
    			attr_dev(div23, "data-aos", "fade-right");
    			set_style(div23, "margin-top", "200px");
    			attr_dev(div23, "class", "projects");
    			add_location(div23, file, 124, 4, 4980);
    			attr_dev(i1, "class", "fab fa-github");
    			add_location(i1, file, 133, 64, 5484);
    			attr_dev(a1, "class", "socials up svelte-n8iaf5");
    			attr_dev(a1, "href", "https://github.com/BrunoBianchi");
    			add_location(a1, file, 133, 3, 5423);
    			attr_dev(i2, "class", "fab fa-linkedin");
    			add_location(i2, file, 134, 85, 5604);
    			attr_dev(a2, "class", "socials up svelte-n8iaf5");
    			attr_dev(a2, "href", "https://www.linkedin.com/in/bruno-bianchi-65a442268/");
    			add_location(a2, file, 134, 3, 5522);
    			attr_dev(div24, "id", "fixedsocial");
    			attr_dev(div24, "class", "svelte-n8iaf5");
    			add_location(div24, file, 132, 4, 5396);
    			attr_dev(div25, "class", "container");
    			add_location(div25, file, 29, 1, 862);
    			attr_dev(main, "class", "svelte-n8iaf5");
    			add_location(main, file, 28, 1, 853);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div25);
    			append_dev(div25, div3);
    			append_dev(div3, div0);
    			append_dev(div0, h20);
    			append_dev(h20, p0);
    			append_dev(h20, t1);
    			append_dev(div0, t2);
    			append_dev(div0, p1);
    			append_dev(div0, t4);
    			append_dev(div0, p2);
    			append_dev(div3, t6);
    			append_dev(div3, div1);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div25, t8);
    			append_dev(div25, div6);
    			append_dev(div6, div4);
    			append_dev(div4, h21);
    			append_dev(div4, t10);
    			append_dev(div4, p3);
    			append_dev(p3, t11);
    			append_dev(p3, br0);
    			append_dev(p3, t12);
    			append_dev(div4, t13);
    			append_dev(div4, span1);
    			append_dev(span1, t14);
    			append_dev(span1, br1);
    			append_dev(span1, t15);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(span1, null);
    			}

    			if (each0_else) {
    				each0_else.m(span1, null);
    			}

    			append_dev(span1, t16);
    			append_dev(span1, span0);
    			append_dev(span0, i0);
    			append_dev(div6, t17);
    			append_dev(div6, div5);
    			append_dev(div5, img);
    			append_dev(div25, t18);
    			append_dev(div25, br2);
    			append_dev(div25, t19);
    			append_dev(div25, hr0);
    			append_dev(div25, t20);
    			append_dev(div25, div22);
    			append_dev(div22, h22);
    			append_dev(div22, t22);
    			append_dev(div22, div21);
    			append_dev(div21, div7);
    			append_dev(div7, h40);
    			append_dev(div7, t24);
    			append_dev(div7, ul1);
    			append_dev(ul1, li5);
    			append_dev(li5, t25);
    			append_dev(li5, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t27);
    			append_dev(ul0, li1);
    			append_dev(ul0, t29);
    			append_dev(ul0, li2);
    			append_dev(ul0, t31);
    			append_dev(ul0, li3);
    			append_dev(ul0, t33);
    			append_dev(ul0, li4);
    			append_dev(li4, t34);
    			append_dev(li4, a0);
    			append_dev(li4, t36);
    			append_dev(div21, t37);
    			append_dev(div21, div20);
    			append_dev(div20, h41);
    			append_dev(div20, t39);
    			append_dev(div20, ul2);
    			append_dev(ul2, li6);
    			append_dev(li6, t40);
    			append_dev(li6, div9);
    			append_dev(div9, div8);
    			append_dev(ul2, t41);
    			append_dev(ul2, li7);
    			append_dev(li7, t42);
    			append_dev(li7, div11);
    			append_dev(div11, div10);
    			append_dev(ul2, t43);
    			append_dev(ul2, li8);
    			append_dev(li8, t44);
    			append_dev(li8, div13);
    			append_dev(div13, div12);
    			append_dev(ul2, t45);
    			append_dev(ul2, li9);
    			append_dev(li9, t46);
    			append_dev(li9, div15);
    			append_dev(div15, div14);
    			append_dev(ul2, t47);
    			append_dev(ul2, li10);
    			append_dev(li10, t48);
    			append_dev(li10, div17);
    			append_dev(div17, div16);
    			append_dev(ul2, t49);
    			append_dev(ul2, li11);
    			append_dev(li11, t50);
    			append_dev(li11, div19);
    			append_dev(div19, div18);
    			append_dev(div25, t51);
    			append_dev(div25, hr1);
    			append_dev(div25, t52);
    			append_dev(div25, div23);
    			append_dev(div23, h23);
    			append_dev(div23, t54);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div23, null);
    			}

    			if (each1_else) {
    				each1_else.m(div23, null);
    			}

    			append_dev(div25, t55);
    			append_dev(div25, div24);
    			append_dev(div24, a1);
    			append_dev(a1, i1);
    			append_dev(div24, t56);
    			append_dev(div24, a2);
    			append_dev(a2, i2);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*i*/ 2) {
    				each_value_1 = /*i*/ ctx[1];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(span1, t16);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;

    				if (!each_value_1.length && each0_else) {
    					each0_else.p(ctx, dirty);
    				} else if (!each_value_1.length) {
    					each0_else = create_else_block_2(ctx);
    					each0_else.c();
    					each0_else.m(span1, t16);
    				} else if (each0_else) {
    					each0_else.d(1);
    					each0_else = null;
    				}
    			}

    			if (dirty & /*projects*/ 1) {
    				each_value = /*projects*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div23, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();

    				if (!each_value.length && each1_else) {
    					each1_else.p(ctx, dirty);
    				} else if (!each_value.length) {
    					each1_else = create_else_block(ctx);
    					each1_else.c();
    					each1_else.m(div23, null);
    				} else if (each1_else) {
    					each1_else.d(1);
    					each1_else = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks_1, detaching);
    			if (each0_else) each0_else.d();
    			destroy_each(each_blocks, detaching);
    			if (each1_else) each1_else.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let projects = [];
    	let languages = [];
    	let i = [];

    	onMount(async () => {
    		await fetch(`https://api.github.com/users/BrunoBianchi/repos`).then(r => r.json()).then(data => {
    			$$invalidate(0, projects = data.filter(repo => repo.name != "BrunoBianchi" && !repo.name.includes("-fiver") && !repo.name.includes('-Aprendizado') && !repo.name.includes('-aprendizado')).sort((a, b) => {
    				return b.stargazers_count - a.stargazers_count || new Date(b.created_at) - new Date(a.created_at);
    			}));

    			data.forEach(repo => {
    				if (repo.language != null && !languages.includes(repo.language.toLowerCase())) {
    					languages.push(repo.language.toLowerCase());
    				}
    			});
    		});

    		$$invalidate(1, i = languages);
    	});

    	AOS.init();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Projects,
    		onMount,
    		projects,
    		languages,
    		i
    	});

    	$$self.$inject_state = $$props => {
    		if ('projects' in $$props) $$invalidate(0, projects = $$props.projects);
    		if ('languages' in $$props) languages = $$props.languages;
    		if ('i' in $$props) $$invalidate(1, i = $$props.i);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [projects, i];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
