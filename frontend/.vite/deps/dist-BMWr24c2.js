import { t as s$1 } from "./eventbus-Cij-nrXf.js";
//#region node_modules/@primeuix/utils/dist/object/index.mjs
var ie$1 = Object.defineProperty;
var K = Object.getOwnPropertySymbols;
var se = Object.prototype.hasOwnProperty, ae$1 = Object.prototype.propertyIsEnumerable;
var N$1 = (e, t, n) => t in e ? ie$1(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, d = (e, t) => {
	for (var n in t || (t = {})) se.call(t, n) && N$1(e, n, t[n]);
	if (K) for (var n of K(t)) ae$1.call(t, n) && N$1(e, n, t[n]);
	return e;
};
function l(e) {
	return e == null || e === "" || Array.isArray(e) && e.length === 0 || !(e instanceof Date) && typeof e == "object" && Object.keys(e).length === 0;
}
function c$1(e) {
	return typeof e == "function" && "call" in e && "apply" in e;
}
function s(e) {
	return !l(e);
}
function i(e, t = !0) {
	return e instanceof Object && e.constructor === Object && (t || Object.keys(e).length !== 0);
}
function $$1(e = {}, t = {}) {
	let n = d({}, e);
	return Object.keys(t).forEach((o) => {
		let r = o;
		i(t[r]) && r in e && i(e[r]) ? n[r] = $$1(e[r], t[r]) : n[r] = t[r];
	}), n;
}
function w$1(...e) {
	return e.reduce((t, n, o) => o === 0 ? n : $$1(t, n), {});
}
function m(e, ...t) {
	return c$1(e) ? e(...t) : e;
}
function a(e, t = !0) {
	return typeof e == "string" && (t || e !== "");
}
function g$1(e) {
	return a(e) ? e.replace(/(-|_)/g, "").toLowerCase() : e;
}
function F$1(e, t = "", n = {}) {
	let o = g$1(t).split("."), r = o.shift();
	if (r) {
		if (i(e)) return F$1(m(e[Object.keys(e).find((f) => g$1(f) === r) || ""], n), o.join("."), n);
		return;
	}
	return m(e, n);
}
function C$1(e, t = !0) {
	return Array.isArray(e) && (t || e.length !== 0);
}
function z(e) {
	return s(e) && !isNaN(e);
}
function G(e, t) {
	if (t) {
		let n = t.test(e);
		return t.lastIndex = 0, n;
	}
	return !1;
}
function H(...e) {
	return w$1(...e);
}
function Y$1(e) {
	return e && e.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g, "").replace(/ {2,}/g, " ").replace(/ ([{:}]) /g, "$1").replace(/([;,]) /g, "$1").replace(/ !/g, "!").replace(/: /g, ":").trim();
}
function re(e) {
	return a(e) ? e.replace(/(_)/g, "-").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase() : e;
}
//#endregion
//#region node_modules/@primeuix/utils/dist/dom/index.mjs
function y(t) {
	if (t) {
		let e = t.parentNode;
		return e && e instanceof ShadowRoot && e.host && (e = e.host), e;
	}
	return null;
}
function T(t) {
	return !!(t !== null && typeof t != "undefined" && t.nodeName && y(t));
}
function c(t) {
	return typeof Element != "undefined" ? t instanceof Element : t !== null && typeof t == "object" && t.nodeType === 1 && typeof t.nodeName == "string";
}
function A(t, e = {}) {
	if (c(t)) {
		let o = (n, r) => {
			var l, d;
			let i = (l = t == null ? void 0 : t.$attrs) != null && l[n] ? [(d = t == null ? void 0 : t.$attrs) == null ? void 0 : d[n]] : [];
			return [r].flat().reduce((s, a) => {
				if (a != null) {
					let u = typeof a;
					if (u === "string" || u === "number") s.push(a);
					else if (u === "object") {
						let p = Array.isArray(a) ? o(n, a) : Object.entries(a).map(([f, g]) => n === "style" && (g || g === 0) ? `${f.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}:${g}` : g ? f : void 0);
						s = p.length ? s.concat(p.filter((f) => !!f)) : s;
					}
				}
				return s;
			}, i);
		};
		Object.entries(e).forEach(([n, r]) => {
			if (r != null) {
				let i = n.match(/^on(.+)/);
				i ? t.addEventListener(i[1].toLowerCase(), r) : n === "p-bind" || n === "pBind" ? A(t, r) : (r = n === "class" ? [...new Set(o("class", r))].join(" ").trim() : n === "style" ? o("style", r).join(";").trim() : r, (t.$attrs = t.$attrs || {}) && (t.$attrs[n] = r), t.setAttribute(n, r));
			}
		});
	}
}
function q(t, e = {}) {
	return t ? `<style${Object.entries(e).reduce((o, [n, r]) => o + ` ${n}="${r}"`, "")}>${t}</style>` : "";
}
function tt() {
	return !!(typeof window != "undefined" && window.document && window.document.createElement);
}
function _t(t, e = "", o) {
	c(t) && o !== null && o !== void 0 && t.setAttribute(e, o);
}
//#endregion
//#region node_modules/@primeuix/styled/dist/index.mjs
var rt = Object.defineProperty, st = Object.defineProperties;
var nt = Object.getOwnPropertyDescriptors;
var F = Object.getOwnPropertySymbols;
var xe = Object.prototype.hasOwnProperty, be = Object.prototype.propertyIsEnumerable;
var _e = (e, t, r) => t in e ? rt(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: r
}) : e[t] = r, h = (e, t) => {
	for (var r in t || (t = {})) xe.call(t, r) && _e(e, r, t[r]);
	if (F) for (var r of F(t)) be.call(t, r) && _e(e, r, t[r]);
	return e;
}, $ = (e, t) => st(e, nt(t));
var v = (e, t) => {
	var r = {};
	for (var s in e) xe.call(e, s) && t.indexOf(s) < 0 && (r[s] = e[s]);
	if (e != null && F) for (var s of F(e)) t.indexOf(s) < 0 && be.call(e, s) && (r[s] = e[s]);
	return r;
};
function ke(...e) {
	return w$1(...e);
}
var N = s$1();
var k = /{([^}]*)}/g, ne = /(\d+\s+[\+\-\*\/]\s+\d+)/g, ie = /var\([^)]+\)/g;
function oe(e) {
	return a(e) ? e.replace(/[A-Z]/g, (t, r) => r === 0 ? t : "." + t.toLowerCase()).toLowerCase() : e;
}
function Lt(e, t) {
	C$1(e) ? e.push(...t || []) : i(e) && Object.assign(e, t);
}
function ve(e) {
	return i(e) && e.hasOwnProperty("$value") && e.hasOwnProperty("$type") ? e.$value : e;
}
function At(e, t = "") {
	return [
		"opacity",
		"z-index",
		"line-height",
		"font-weight",
		"flex",
		"flex-grow",
		"flex-shrink",
		"order"
	].some((s) => t.endsWith(s)) ? e : `${e}`.trim().split(" ").map((a) => z(a) ? `${a}px` : a).join(" ");
}
function dt(e) {
	return e.replaceAll(/ /g, "").replace(/[^\w]/g, "-");
}
function Q(e = "", t = "") {
	return dt(`${a(e, !1) && a(t, !1) ? `${e}-` : e}${t}`);
}
function ae(e = "", t = "") {
	return `--${Q(e, t)}`;
}
function ht(e = "") {
	return ((e.match(/{/g) || []).length + (e.match(/}/g) || []).length) % 2 !== 0;
}
function Y(e, t = "", r = "", s$2 = [], i) {
	if (a(e)) {
		let a = e.trim();
		if (ht(a)) return;
		if (G(a, k)) {
			let n = a.replaceAll(k, (l) => {
				return `var(${ae(r, re(l.replace(/{|}/g, "").split(".").filter((m) => !s$2.some((d) => G(m, d))).join("-")))}${s(i) ? `, ${i}` : ""})`;
			});
			return G(n.replace(ie, "0"), ne) ? `calc(${n})` : n;
		}
		return a;
	} else if (z(e)) return e;
}
function Dt(e = {}, t) {
	if (a(t)) {
		let r = t.trim();
		return G(r, k) ? r.replaceAll(k, (s) => F$1(e, s.replace(/{|}/g, ""))) : r;
	} else if (z(t)) return t;
}
function Re(e, t, r) {
	a(t, !1) && e.push(`${t}:${r};`);
}
function C(e, t) {
	return e ? `${e}{${t}}` : "";
}
function le(e, t) {
	if (e.indexOf("dt(") === -1) return e;
	function r(n, l) {
		let o = [], c = 0, m = "", d = null, u = 0;
		for (; c <= n.length;) {
			let g = n[c];
			if ((g === "\"" || g === "'" || g === "`") && n[c - 1] !== "\\" && (d = d === g ? null : g), !d && (g === "(" && u++, g === ")" && u--, (g === "," || c === n.length) && u === 0)) {
				let f = m.trim();
				f.startsWith("dt(") ? o.push(le(f, l)) : o.push(s(f)), m = "", c++;
				continue;
			}
			g !== void 0 && (m += g), c++;
		}
		return o;
	}
	function s(n) {
		let l = n[0];
		if ((l === "\"" || l === "'" || l === "`") && n[n.length - 1] === l) return n.slice(1, -1);
		let o = Number(n);
		return isNaN(o) ? n : o;
	}
	let i = [], a = [];
	for (let n = 0; n < e.length; n++) if (e[n] === "d" && e.slice(n, n + 3) === "dt(") a.push(n), n += 2;
	else if (e[n] === ")" && a.length > 0) {
		let l = a.pop();
		a.length === 0 && i.push([l, n]);
	}
	if (!i.length) return e;
	for (let n = i.length - 1; n >= 0; n--) {
		let [l, o] = i[n], d = t(...r(e.slice(l + 3, o), t));
		e = e.slice(0, l) + d + e.slice(o + 1);
	}
	return e;
}
function Te(e) {
	return e.length === 4 ? `#${e[1]}${e[1]}${e[2]}${e[2]}${e[3]}${e[3]}` : e;
}
function Ne(e) {
	let t = parseInt(e.substring(1), 16);
	return {
		r: t >> 16 & 255,
		g: t >> 8 & 255,
		b: t & 255
	};
}
function gt(e, t, r) {
	return `#${e.toString(16).padStart(2, "0")}${t.toString(16).padStart(2, "0")}${r.toString(16).padStart(2, "0")}`;
}
var D = (e, t, r) => {
	e = Te(e), t = Te(t);
	let a = (r / 100 * 2 - 1 + 1) / 2, n = 1 - a, l = Ne(e), o = Ne(t);
	return gt(Math.round(l.r * a + o.r * n), Math.round(l.g * a + o.g * n), Math.round(l.b * a + o.b * n));
};
var ce = (e, t) => D("#000000", e, t);
var me = (e, t) => D("#ffffff", e, t);
var Ce = [
	50,
	100,
	200,
	300,
	400,
	500,
	600,
	700,
	800,
	900,
	950
], ft = (e) => {
	if (G(e, k)) {
		let t = e.replace(/{|}/g, "");
		return Ce.reduce((r, s) => (r[s] = `{${t}.${s}}`, r), {});
	}
	return typeof e == "string" ? Ce.reduce((t, r, s) => (t[r] = s <= 5 ? me(e, (5 - s) * 19) : ce(e, (s - 5) * 15), t), {}) : e;
};
var rr = (e) => {
	var a;
	let t = S.getTheme(), r = ue(t, e, void 0, "variable");
	return {
		name: (a = r == null ? void 0 : r.match(/--[\w-]+/g)) == null ? void 0 : a[0],
		variable: r,
		value: ue(t, e, void 0, "value")
	};
}, E = (...e) => ue(S.getTheme(), ...e), ue = (e = {}, t, r, s) => {
	if (t) {
		let { variable: i, options: a } = S.defaults || {}, { prefix: n, transform: l$2 } = (e == null ? void 0 : e.options) || a || {}, o = G(t, k) ? t : `{${t}}`;
		return s === "value" || l(s) && l$2 === "strict" ? S.getTokenValue(t) : Y(o, void 0, n, [i.excludedKeyRegex], r);
	}
	return "";
};
function ar(e, ...t) {
	if (e instanceof Array) return le(e.reduce((s, i, a) => {
		var n;
		return s + i + ((n = m(t[a], { dt: E })) != null ? n : "");
	}, ""), E);
	return m(e, { dt: E });
}
var w = (e = {}) => {
	let { preset: t, options: r } = e;
	return {
		preset(s) {
			return t = t ? H(t, s) : s, this;
		},
		options(s) {
			return r = r ? h(h({}, r), s) : s, this;
		},
		primaryPalette(s) {
			let { semantic: i } = t || {};
			return t = $(h({}, t), { semantic: $(h({}, i), { primary: s }) }), this;
		},
		surfacePalette(s) {
			var o, c;
			let { semantic: i } = t || {}, a = s && Object.hasOwn(s, "light") ? s.light : s, n = s && Object.hasOwn(s, "dark") ? s.dark : s, l = { colorScheme: {
				light: h(h({}, (o = i == null ? void 0 : i.colorScheme) == null ? void 0 : o.light), !!a && { surface: a }),
				dark: h(h({}, (c = i == null ? void 0 : i.colorScheme) == null ? void 0 : c.dark), !!n && { surface: n })
			} };
			return t = $(h({}, t), { semantic: h(h({}, i), l) }), this;
		},
		define({ useDefaultPreset: s = !1, useDefaultOptions: i = !1 } = {}) {
			return {
				preset: s ? S.getPreset() : t,
				options: i ? S.getOptions() : r
			};
		},
		update({ mergePresets: s = !0, mergeOptions: i = !0 } = {}) {
			let a = {
				preset: s ? H(S.getPreset(), t) : t,
				options: i ? h(h({}, S.getOptions()), r) : r
			};
			return S.setTheme(a), a;
		},
		use(s) {
			let i = this.define(s);
			return S.setTheme(i), i;
		}
	};
};
function de(e, t = {}) {
	let r = S.defaults.variable, { prefix: s = r.prefix, selector: i$4 = r.selector, excludedKeyRegex: a = r.excludedKeyRegex } = t, n = [], l = [], o = [{
		node: e,
		path: s
	}];
	for (; o.length;) {
		let { node: m, path: d } = o.pop();
		for (let u in m) {
			let g = m[u], f = ve(g), p = G(u, a) ? Q(d) : Q(d, re(u));
			if (i(f)) o.push({
				node: f,
				path: p
			});
			else {
				Re(l, ae(p), Y(f, p, s, [a]));
				let T = p;
				s && T.startsWith(s + "-") && (T = T.slice(s.length + 1)), n.push(T.replace(/-/g, "."));
			}
		}
	}
	let c = l.join("");
	return {
		value: l,
		tokens: n,
		declarations: c,
		css: C(i$4, c)
	};
}
var b = {
	regex: {
		rules: {
			class: {
				pattern: /^\.([a-zA-Z][\w-]*)$/,
				resolve(e) {
					return {
						type: "class",
						selector: e,
						matched: this.pattern.test(e.trim())
					};
				}
			},
			attr: {
				pattern: /^\[(.*)\]$/,
				resolve(e) {
					return {
						type: "attr",
						selector: `:root${e},:host${e}`,
						matched: this.pattern.test(e.trim())
					};
				}
			},
			media: {
				pattern: /^@media (.*)$/,
				resolve(e) {
					return {
						type: "media",
						selector: e,
						matched: this.pattern.test(e.trim())
					};
				}
			},
			system: {
				pattern: /^system$/,
				resolve(e) {
					return {
						type: "system",
						selector: "@media (prefers-color-scheme: dark)",
						matched: this.pattern.test(e.trim())
					};
				}
			},
			custom: { resolve(e) {
				return {
					type: "custom",
					selector: e,
					matched: !0
				};
			} }
		},
		resolve(e) {
			let t = Object.keys(this.rules).filter((r) => r !== "custom").map((r) => this.rules[r]);
			return [e].flat().map((r) => {
				var s;
				return (s = t.map((i) => i.resolve(r)).find((i) => i.matched)) != null ? s : this.rules.custom.resolve(r);
			});
		}
	},
	_toVariables(e, t) {
		return de(e, { prefix: t == null ? void 0 : t.prefix });
	},
	getCommon({ name: e = "", theme: t = {}, params: r, set: s$3, defaults: i }) {
		var R, T, j, O, M, z, V;
		let { preset: a, options: n } = t, l, o, c, m$1, d, u, g;
		if (s(a) && n.transform !== "strict") {
			let { primitive: L, semantic: te, extend: re } = a, f = te || {}, { colorScheme: K } = f, A = v(f, ["colorScheme"]), x = re || {}, { colorScheme: X } = x, G = v(x, ["colorScheme"]), p = K || {}, { dark: U } = p, B = v(p, ["dark"]), y = X || {}, { dark: I } = y, H = v(y, ["dark"]), W = s(L) ? this._toVariables({ primitive: L }, n) : {}, q = s(A) ? this._toVariables({ semantic: A }, n) : {}, Z = s(B) ? this._toVariables({ light: B }, n) : {}, pe = s(U) ? this._toVariables({ dark: U }, n) : {}, fe = s(G) ? this._toVariables({ semantic: G }, n) : {}, ye = s(H) ? this._toVariables({ light: H }, n) : {}, Se = s(I) ? this._toVariables({ dark: I }, n) : {}, [Me, ze] = [(R = W.declarations) != null ? R : "", W.tokens], [Ke, Xe] = [(T = q.declarations) != null ? T : "", q.tokens || []], [Ge, Ue] = [(j = Z.declarations) != null ? j : "", Z.tokens || []], [Be, Ie] = [(O = pe.declarations) != null ? O : "", pe.tokens || []], [He, We] = [(M = fe.declarations) != null ? M : "", fe.tokens || []], [qe, Ze] = [(z = ye.declarations) != null ? z : "", ye.tokens || []], [Fe, Je] = [(V = Se.declarations) != null ? V : "", Se.tokens || []];
			l = this.transformCSS(e, Me, "light", "variable", n, s$3, i), o = ze;
			c = `${this.transformCSS(e, `${Ke}${Ge}`, "light", "variable", n, s$3, i)}${this.transformCSS(e, `${Be}`, "dark", "variable", n, s$3, i)}`, m$1 = [...new Set([
				...Xe,
				...Ue,
				...Ie
			])];
			d = `${this.transformCSS(e, `${He}${qe}color-scheme:light`, "light", "variable", n, s$3, i)}${this.transformCSS(e, `${Fe}color-scheme:dark`, "dark", "variable", n, s$3, i)}`, u = [...new Set([
				...We,
				...Ze,
				...Je
			])], g = m(a.css, { dt: E });
		}
		return {
			primitive: {
				css: l,
				tokens: o
			},
			semantic: {
				css: c,
				tokens: m$1
			},
			global: {
				css: d,
				tokens: u
			},
			style: g
		};
	},
	getPreset({ name: e = "", preset: t = {}, options: r, params: s$4, set: i, defaults: a, selector: n }) {
		var f, x, p;
		let l, o, c;
		if (s(t) && r.transform !== "strict") {
			let y = e.replace("-directive", ""), m$2 = t, { colorScheme: R, extend: T, css: j } = m$2, O = v(m$2, [
				"colorScheme",
				"extend",
				"css"
			]), d = T || {}, { colorScheme: M } = d, z = v(d, ["colorScheme"]), u = R || {}, { dark: V } = u, L = v(u, ["dark"]), g = M || {}, { dark: te } = g, re = v(g, ["dark"]), K = s(O) ? this._toVariables({ [y]: h(h({}, O), z) }, r) : {}, A = s(L) ? this._toVariables({ [y]: h(h({}, L), re) }, r) : {}, X = s(V) ? this._toVariables({ [y]: h(h({}, V), te) }, r) : {}, [G, U] = [(f = K.declarations) != null ? f : "", K.tokens || []], [B, I] = [(x = A.declarations) != null ? x : "", A.tokens || []], [H, W] = [(p = X.declarations) != null ? p : "", X.tokens || []];
			l = `${this.transformCSS(y, `${G}${B}`, "light", "variable", r, i, a, n)}${this.transformCSS(y, H, "dark", "variable", r, i, a, n)}`, o = [...new Set([
				...U,
				...I,
				...W
			])], c = m(j, { dt: E });
		}
		return {
			css: l,
			tokens: o,
			style: c
		};
	},
	getPresetC({ name: e = "", theme: t = {}, params: r, set: s, defaults: i }) {
		var o;
		let { preset: a, options: n } = t, l = (o = a == null ? void 0 : a.components) == null ? void 0 : o[e];
		return this.getPreset({
			name: e,
			preset: l,
			options: n,
			params: r,
			set: s,
			defaults: i
		});
	},
	getPresetD({ name: e = "", theme: t = {}, params: r, set: s, defaults: i }) {
		var c, m;
		let a = e.replace("-directive", ""), { preset: n, options: l } = t, o = ((c = n == null ? void 0 : n.components) == null ? void 0 : c[a]) || ((m = n == null ? void 0 : n.directives) == null ? void 0 : m[a]);
		return this.getPreset({
			name: a,
			preset: o,
			options: l,
			params: r,
			set: s,
			defaults: i
		});
	},
	applyDarkColorScheme(e) {
		return !(e.darkModeSelector === "none" || e.darkModeSelector === !1);
	},
	getColorSchemeOption(e, t) {
		var r;
		return this.applyDarkColorScheme(e) ? this.regex.resolve(e.darkModeSelector === !0 ? t.options.darkModeSelector : (r = e.darkModeSelector) != null ? r : t.options.darkModeSelector) : [];
	},
	getLayerOrder(e, t = {}, r, s) {
		let { cssLayer: i } = t;
		return i ? `@layer ${m(i.order || i.name || "primeui", r)}` : "";
	},
	getCommonStyleSheet({ name: e = "", theme: t = {}, params: r, props: s = {}, set: i$1, defaults: a }) {
		let n = this.getCommon({
			name: e,
			theme: t,
			params: r,
			set: i$1,
			defaults: a
		}), l = Object.entries(s).reduce((o, [c, m]) => o.push(`${c}="${m}"`) && o, []).join(" ");
		return Object.entries(n || {}).reduce((o, [c, m]) => {
			if (i(m) && Object.hasOwn(m, "css")) {
				let d = Y$1(m.css), u = `${c}-variables`;
				o.push(`<style type="text/css" data-primevue-style-id="${u}" ${l}>${d}</style>`);
			}
			return o;
		}, []).join("");
	},
	getStyleSheet({ name: e = "", theme: t = {}, params: r, props: s = {}, set: i, defaults: a }) {
		var c;
		let n = {
			name: e,
			theme: t,
			params: r,
			set: i,
			defaults: a
		}, l = (c = e.includes("-directive") ? this.getPresetD(n) : this.getPresetC(n)) == null ? void 0 : c.css, o = Object.entries(s).reduce((m, [d, u]) => m.push(`${d}="${u}"`) && m, []).join(" ");
		return l ? `<style type="text/css" data-primevue-style-id="${e}-variables" ${o}>${Y$1(l)}</style>` : "";
	},
	createTokens(e = {}, t, r = "", s = "", i$2 = {}) {
		let a = function(l$1, o = {}, c = []) {
			if (c.includes(this.path)) return console.warn(`Circular reference detected at ${this.path}`), {
				colorScheme: l$1,
				path: this.path,
				paths: o,
				value: void 0
			};
			c.push(this.path), o.name = this.path, o.binding || (o.binding = {});
			let m = this.value;
			if (typeof this.value == "string" && k.test(this.value)) {
				let u = this.value.trim().replace(k, (g) => {
					var y;
					let f = g.slice(1, -1), x = this.tokens[f];
					if (!x) return console.warn(`Token not found for path: ${f}`), "__UNRESOLVED__";
					let p = x.computed(l$1, o, c);
					return Array.isArray(p) && p.length === 2 ? `light-dark(${p[0].value},${p[1].value})` : (y = p == null ? void 0 : p.value) != null ? y : "__UNRESOLVED__";
				});
				m = ne.test(u.replace(ie, "0")) ? `calc(${u})` : u;
			}
			return l(o.binding) && delete o.binding, c.pop(), {
				colorScheme: l$1,
				path: this.path,
				paths: o,
				value: m.includes("__UNRESOLVED__") ? void 0 : m
			};
		}, n = (l, o, c) => {
			Object.entries(l).forEach(([m, d]) => {
				let u = G(m, t.variable.excludedKeyRegex) ? o : o ? `${o}.${oe(m)}` : oe(m), g = c ? `${c}.${m}` : m;
				i(d) ? n(d, u, g) : (i$2[u] || (i$2[u] = {
					paths: [],
					computed: (f, x = {}, p = []) => {
						if (i$2[u].paths.length === 1) return i$2[u].paths[0].computed(i$2[u].paths[0].scheme, x.binding, p);
						if (f && f !== "none") for (let y = 0; y < i$2[u].paths.length; y++) {
							let R = i$2[u].paths[y];
							if (R.scheme === f) return R.computed(f, x.binding, p);
						}
						return i$2[u].paths.map((y) => y.computed(y.scheme, x[y.scheme], p));
					}
				}), i$2[u].paths.push({
					path: g,
					value: d,
					scheme: g.includes("colorScheme.light") ? "light" : g.includes("colorScheme.dark") ? "dark" : "none",
					computed: a,
					tokens: i$2
				}));
			});
		};
		return n(e, r, s), i$2;
	},
	getTokenValue(e, t, r) {
		var l;
		let i = ((o) => o.split(".").filter((m) => !G(m.toLowerCase(), r.variable.excludedKeyRegex)).join("."))(t), a = t.includes("colorScheme.light") ? "light" : t.includes("colorScheme.dark") ? "dark" : void 0, n = [(l = e[i]) == null ? void 0 : l.computed(a)].flat().filter((o) => o);
		return n.length === 1 ? n[0].value : n.reduce((o = {}, c) => {
			let u = c, { colorScheme: m } = u;
			return o[m] = v(u, ["colorScheme"]), o;
		}, void 0);
	},
	getSelectorRule(e, t, r, s$5) {
		return r === "class" || r === "attr" ? C(s(t) ? `${e}${t},${e} ${t}` : e, s$5) : C(e, C(t != null ? t : ":root,:host", s$5));
	},
	transformCSS(e, t, r, s$6, i$3 = {}, a, n, l) {
		if (s(t)) {
			let { cssLayer: o } = i$3;
			if (s$6 !== "style") {
				let c = this.getColorSchemeOption(i$3, n);
				t = r === "dark" ? c.reduce((m, { type: d, selector: u }) => (s(u) && (m += u.includes("[CSS]") ? u.replace("[CSS]", t) : this.getSelectorRule(u, l, d, t)), m), "") : C(l != null ? l : ":root,:host", t);
			}
			if (o) {
				let c = {
					name: "primeui",
					order: "primeui"
				};
				i(o) && (c.name = m(o.name, {
					name: e,
					type: s$6
				})), s(c.name) && (t = C(`@layer ${c.name}`, t), a?.layerNames(c.name));
			}
			return t;
		}
		return "";
	}
};
var S = {
	defaults: {
		variable: {
			prefix: "p",
			selector: ":root,:host",
			excludedKeyRegex: /^(primitive|semantic|components|directives|variables|colorscheme|light|dark|common|root|states|extend|css)$/gi
		},
		options: {
			prefix: "p",
			darkModeSelector: "system",
			cssLayer: !1
		}
	},
	_theme: void 0,
	_layerNames: /* @__PURE__ */ new Set(),
	_loadedStyleNames: /* @__PURE__ */ new Set(),
	_loadingStyles: /* @__PURE__ */ new Set(),
	_tokens: {},
	update(e = {}) {
		let { theme: t } = e;
		t && (this._theme = $(h({}, t), { options: h(h({}, this.defaults.options), t.options) }), this._tokens = b.createTokens(this.preset, this.defaults), this.clearLoadedStyleNames());
	},
	get theme() {
		return this._theme;
	},
	get preset() {
		var e;
		return ((e = this.theme) == null ? void 0 : e.preset) || {};
	},
	get options() {
		var e;
		return ((e = this.theme) == null ? void 0 : e.options) || {};
	},
	get tokens() {
		return this._tokens;
	},
	getTheme() {
		return this.theme;
	},
	setTheme(e) {
		this.update({ theme: e }), N.emit("theme:change", e);
	},
	getPreset() {
		return this.preset;
	},
	setPreset(e) {
		this._theme = $(h({}, this.theme), { preset: e }), this._tokens = b.createTokens(e, this.defaults), this.clearLoadedStyleNames(), N.emit("preset:change", e), N.emit("theme:change", this.theme);
	},
	getOptions() {
		return this.options;
	},
	setOptions(e) {
		this._theme = $(h({}, this.theme), { options: e }), this.clearLoadedStyleNames(), N.emit("options:change", e), N.emit("theme:change", this.theme);
	},
	getLayerNames() {
		return [...this._layerNames];
	},
	setLayerNames(e) {
		this._layerNames.add(e);
	},
	getLoadedStyleNames() {
		return this._loadedStyleNames;
	},
	isStyleNameLoaded(e) {
		return this._loadedStyleNames.has(e);
	},
	setLoadedStyleName(e) {
		this._loadedStyleNames.add(e);
	},
	deleteLoadedStyleName(e) {
		this._loadedStyleNames.delete(e);
	},
	clearLoadedStyleNames() {
		this._loadedStyleNames.clear();
	},
	getTokenValue(e) {
		return b.getTokenValue(this.tokens, e, this.defaults);
	},
	getCommon(e = "", t) {
		return b.getCommon({
			name: e,
			theme: this.theme,
			params: t,
			defaults: this.defaults,
			set: { layerNames: this.setLayerNames.bind(this) }
		});
	},
	getComponent(e = "", t) {
		let r = {
			name: e,
			theme: this.theme,
			params: t,
			defaults: this.defaults,
			set: { layerNames: this.setLayerNames.bind(this) }
		};
		return b.getPresetC(r);
	},
	getDirective(e = "", t) {
		let r = {
			name: e,
			theme: this.theme,
			params: t,
			defaults: this.defaults,
			set: { layerNames: this.setLayerNames.bind(this) }
		};
		return b.getPresetD(r);
	},
	getCustomPreset(e = "", t, r, s) {
		let i = {
			name: e,
			preset: t,
			options: this.options,
			selector: r,
			params: s,
			defaults: this.defaults,
			set: { layerNames: this.setLayerNames.bind(this) }
		};
		return b.getPreset(i);
	},
	getLayerOrderCSS(e = "") {
		return b.getLayerOrder(e, this.options, { names: this.getLayerNames() }, this.defaults);
	},
	transformCSS(e = "", t, r = "style", s) {
		return b.transformCSS(e, t, s, r, this.options, { layerNames: this.setLayerNames.bind(this) }, this.defaults);
	},
	getCommonStyleSheet(e = "", t, r = {}) {
		return b.getCommonStyleSheet({
			name: e,
			theme: this.theme,
			params: t,
			props: r,
			defaults: this.defaults,
			set: { layerNames: this.setLayerNames.bind(this) }
		});
	},
	getStyleSheet(e, t, r = {}) {
		return b.getStyleSheet({
			name: e,
			theme: this.theme,
			params: t,
			props: r,
			defaults: this.defaults,
			set: { layerNames: this.setLayerNames.bind(this) }
		});
	},
	onStyleMounted(e) {
		this._loadingStyles.add(e);
	},
	onStyleUpdated(e) {
		this._loadingStyles.add(e);
	},
	onStyleLoaded(e, { name: t }) {
		this._loadingStyles.size && (this._loadingStyles.delete(t), N.emit(`theme:${t}:load`, e), !this._loadingStyles.size && N.emit("theme:load"));
	}
};
function Ve(...e) {
	let t = w$1(S.getPreset(), ...e);
	return S.setPreset(t), t;
}
function Le(e) {
	return w().primaryPalette(e).update().preset;
}
function Ae(e) {
	return w().surfacePalette(e).update().preset;
}
function De(...e) {
	let t = w$1(...e);
	return S.setPreset(t), t;
}
function je(e) {
	return w(e).update({ mergePresets: !1 });
}
var ge = class {
	constructor({ attrs: t } = {}) {
		this._styles = /* @__PURE__ */ new Map(), this._attrs = t || {};
	}
	get(t) {
		return this._styles.get(t);
	}
	has(t) {
		return this._styles.has(t);
	}
	delete(t) {
		this._styles.delete(t);
	}
	clear() {
		this._styles.clear();
	}
	add(t, r) {
		if (s(r)) {
			let s = {
				name: t,
				css: r,
				attrs: this._attrs,
				markup: q(r, this._attrs)
			};
			this._styles.set(t, $(h({}, s), { element: this.createStyleElement(s) }));
		}
	}
	update() {}
	getStyles() {
		return this._styles;
	}
	getAllCSS() {
		return [...this._styles.values()].map((t) => t.css).filter(String);
	}
	getAllMarkup() {
		return [...this._styles.values()].map((t) => t.markup).filter(String);
	}
	getAllElements() {
		return [...this._styles.values()].map((t) => t.element);
	}
	createStyleElement(t = {}) {}
}, Nt = ge;
//#endregion
export { me as A, tt as B, ft as C, k as D, je as E, ve as F, Y$1 as H, w as I, A as L, oe as M, rr as N, ke as O, ue as P, T as R, dt as S, ie as T, m as U, H as V, s as W, ae as _, De as a, ce as b, Le as c, Nt as d, Q as f, Y as g, Ve as h, D as i, ne as j, le as k, Lt as l, S as m, At as n, Dt as o, Re as p, C as r, E as s, Ae as t, N as u, ar as v, ht as w, de as x, b as y, _t as z };

//# sourceMappingURL=dist-BMWr24c2.js.map