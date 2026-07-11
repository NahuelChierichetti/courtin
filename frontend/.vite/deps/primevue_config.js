import { Ft as onMounted, Gn as readonly, Kn as ref, Ot as nextTick, Wn as reactive, gn as watch, ut as getCurrentInstance, xt as inject } from "./vue.runtime.esm-bundler-dM5W6Okq.js";
import { B as tt, H as Y, L as A, R as T, U as m, V as H, W as s, m as S, s as E, u as N, v as ar, z as _t } from "./dist-BMWr24c2.js";
import { t as s$1 } from "./eventbus-Cij-nrXf.js";
//#region node_modules/@primevue/core/api/index.mjs
var FilterMatchMode = {
	STARTS_WITH: "startsWith",
	CONTAINS: "contains",
	NOT_CONTAINS: "notContains",
	ENDS_WITH: "endsWith",
	EQUALS: "equals",
	NOT_EQUALS: "notEquals",
	IN: "in",
	LESS_THAN: "lt",
	LESS_THAN_OR_EQUAL_TO: "lte",
	GREATER_THAN: "gt",
	GREATER_THAN_OR_EQUAL_TO: "gte",
	BETWEEN: "between",
	DATE_IS: "dateIs",
	DATE_IS_NOT: "dateIsNot",
	DATE_BEFORE: "dateBefore",
	DATE_AFTER: "dateAfter"
};
//#endregion
//#region node_modules/@primeuix/styles/dist/base/index.mjs
var style = "\n    *,\n    ::before,\n    ::after {\n        box-sizing: border-box;\n    }\n\n    .p-collapsible-enter-active {\n        animation: p-animate-collapsible-expand 0.2s ease-out;\n        overflow: hidden;\n    }\n\n    .p-collapsible-leave-active {\n        animation: p-animate-collapsible-collapse 0.2s ease-out;\n        overflow: hidden;\n    }\n\n    @keyframes p-animate-collapsible-expand {\n        from {\n            grid-template-rows: 0fr;\n        }\n        to {\n            grid-template-rows: 1fr;\n        }\n    }\n\n    @keyframes p-animate-collapsible-collapse {\n        from {\n            grid-template-rows: 1fr;\n        }\n        to {\n            grid-template-rows: 0fr;\n        }\n    }\n\n    .p-disabled,\n    .p-disabled * {\n        cursor: default;\n        pointer-events: none;\n        user-select: none;\n    }\n\n    .p-disabled,\n    .p-component:disabled {\n        opacity: dt('disabled.opacity');\n    }\n\n    .pi {\n        font-size: dt('icon.size');\n    }\n\n    .p-icon {\n        width: dt('icon.size');\n        height: dt('icon.size');\n    }\n\n    .p-overlay-mask {\n        background: var(--px-mask-background, dt('mask.background'));\n        color: dt('mask.color');\n        position: fixed;\n        top: 0;\n        left: 0;\n        width: 100%;\n        height: 100%;\n    }\n\n    .p-overlay-mask-enter-active {\n        animation: p-animate-overlay-mask-enter dt('mask.transition.duration') forwards;\n    }\n\n    .p-overlay-mask-leave-active {\n        animation: p-animate-overlay-mask-leave dt('mask.transition.duration') forwards;\n    }\n\n    @keyframes p-animate-overlay-mask-enter {\n        from {\n            background: transparent;\n        }\n        to {\n            background: var(--px-mask-background, dt('mask.background'));\n        }\n    }\n    @keyframes p-animate-overlay-mask-leave {\n        from {\n            background: var(--px-mask-background, dt('mask.background'));\n        }\n        to {\n            background: transparent;\n        }\n    }\n\n    .p-anchored-overlay-enter-active {\n        animation: p-animate-anchored-overlay-enter 300ms cubic-bezier(.19,1,.22,1);\n    }\n\n    .p-anchored-overlay-leave-active {\n        animation: p-animate-anchored-overlay-leave 300ms cubic-bezier(.19,1,.22,1);\n    }\n\n    @keyframes p-animate-anchored-overlay-enter {\n        from {\n            opacity: 0;\n            transform: scale(0.93);\n        }\n    }\n\n    @keyframes p-animate-anchored-overlay-leave {\n        to {\n            opacity: 0;\n            transform: scale(0.93);\n        }\n    }\n";
//#endregion
//#region node_modules/@primevue/core/usestyle/index.mjs
function _typeof$2(o) {
	"@babel/helpers - typeof";
	return _typeof$2 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
		return typeof o;
	} : function(o) {
		return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	}, _typeof$2(o);
}
function ownKeys$2(e, r) {
	var t = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var o = Object.getOwnPropertySymbols(e);
		r && (o = o.filter(function(r) {
			return Object.getOwnPropertyDescriptor(e, r).enumerable;
		})), t.push.apply(t, o);
	}
	return t;
}
function _objectSpread$2(e) {
	for (var r = 1; r < arguments.length; r++) {
		var t = null != arguments[r] ? arguments[r] : {};
		r % 2 ? ownKeys$2(Object(t), true).forEach(function(r) {
			_defineProperty$2(e, r, t[r]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$2(Object(t)).forEach(function(r) {
			Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
		});
	}
	return e;
}
function _defineProperty$2(e, r, t) {
	return (r = _toPropertyKey$2(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: true,
		configurable: true,
		writable: true
	}) : e[r] = t, e;
}
function _toPropertyKey$2(t) {
	var i = _toPrimitive$2(t, "string");
	return "symbol" == _typeof$2(i) ? i : i + "";
}
function _toPrimitive$2(t, r) {
	if ("object" != _typeof$2(t) || !t) return t;
	var e = t[Symbol.toPrimitive];
	if (void 0 !== e) {
		var i = e.call(t, r);
		if ("object" != _typeof$2(i)) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === r ? String : Number)(t);
}
function tryOnMounted(fn) {
	var sync = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : true;
	if (getCurrentInstance() && getCurrentInstance().components) onMounted(fn);
	else if (sync) fn();
	else nextTick(fn);
}
var _id = 0;
function useStyle(css) {
	var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
	var isLoaded = ref(false);
	var cssRef = ref(css);
	var styleRef = ref(null);
	var defaultDocument = tt() ? window.document : void 0;
	var _options$document = options.document, document = _options$document === void 0 ? defaultDocument : _options$document, _options$immediate = options.immediate, immediate = _options$immediate === void 0 ? true : _options$immediate, _options$manual = options.manual, manual = _options$manual === void 0 ? false : _options$manual, _options$name = options.name, name = _options$name === void 0 ? "style_".concat(++_id) : _options$name, _options$id = options.id, id = _options$id === void 0 ? void 0 : _options$id, _options$media = options.media, media = _options$media === void 0 ? void 0 : _options$media, _options$nonce = options.nonce, nonce = _options$nonce === void 0 ? void 0 : _options$nonce, _options$first = options.first, first = _options$first === void 0 ? false : _options$first, _options$onMounted = options.onMounted, onStyleMounted = _options$onMounted === void 0 ? void 0 : _options$onMounted, _options$onUpdated = options.onUpdated, onStyleUpdated = _options$onUpdated === void 0 ? void 0 : _options$onUpdated, _options$onLoad = options.onLoad, onStyleLoaded = _options$onLoad === void 0 ? void 0 : _options$onLoad, _options$props = options.props, props = _options$props === void 0 ? {} : _options$props;
	var stop = function stop() {};
	var load = function load(_css) {
		var _props = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
		if (!document) return;
		var _styleProps = _objectSpread$2(_objectSpread$2({}, props), _props);
		var _name = _styleProps.name || name, _id = _styleProps.id || id, _nonce = _styleProps.nonce || nonce;
		styleRef.value = document.querySelector("style[data-primevue-style-id=\"".concat(_name, "\"]")) || document.getElementById(_id) || document.createElement("style");
		if (!styleRef.value.isConnected) {
			cssRef.value = _css || css;
			A(styleRef.value, {
				type: "text/css",
				id: _id,
				media,
				nonce: _nonce
			});
			first ? document.head.prepend(styleRef.value) : document.head.appendChild(styleRef.value);
			_t(styleRef.value, "data-primevue-style-id", _name);
			A(styleRef.value, _styleProps);
			styleRef.value.onload = function(event) {
				return onStyleLoaded === null || onStyleLoaded === void 0 ? void 0 : onStyleLoaded(event, { name: _name });
			};
			onStyleMounted === null || onStyleMounted === void 0 || onStyleMounted(_name);
		}
		if (isLoaded.value) return;
		stop = watch(cssRef, function(value) {
			styleRef.value.textContent = value;
			onStyleUpdated === null || onStyleUpdated === void 0 || onStyleUpdated(_name);
		}, { immediate: true });
		isLoaded.value = true;
	};
	var unload = function unload() {
		if (!document || !isLoaded.value) return;
		stop();
		T(styleRef.value) && document.head.removeChild(styleRef.value);
		isLoaded.value = false;
		styleRef.value = null;
	};
	if (immediate && !manual) tryOnMounted(load);
	return {
		id,
		name,
		el: styleRef,
		css: cssRef,
		unload,
		load,
		isLoaded: readonly(isLoaded)
	};
}
//#endregion
//#region node_modules/@primevue/core/base/style/index.mjs
function _typeof$1(o) {
	"@babel/helpers - typeof";
	return _typeof$1 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
		return typeof o;
	} : function(o) {
		return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	}, _typeof$1(o);
}
var _templateObject, _templateObject2, _templateObject3, _templateObject4;
function _slicedToArray(r, e) {
	return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
}
function _nonIterableRest() {
	throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _unsupportedIterableToArray(r, a) {
	if (r) {
		if ("string" == typeof r) return _arrayLikeToArray(r, a);
		var t = {}.toString.call(r).slice(8, -1);
		return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
	}
}
function _arrayLikeToArray(r, a) {
	(null == a || a > r.length) && (a = r.length);
	for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
	return n;
}
function _iterableToArrayLimit(r, l) {
	var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
	if (null != t) {
		var e, n, i, u, a = [], f = true, o = false;
		try {
			if (i = (t = t.call(r)).next, 0 === l);
			else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0);
		} catch (r) {
			o = true, n = r;
		} finally {
			try {
				if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
			} finally {
				if (o) throw n;
			}
		}
		return a;
	}
}
function _arrayWithHoles(r) {
	if (Array.isArray(r)) return r;
}
function ownKeys$1(e, r) {
	var t = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var o = Object.getOwnPropertySymbols(e);
		r && (o = o.filter(function(r) {
			return Object.getOwnPropertyDescriptor(e, r).enumerable;
		})), t.push.apply(t, o);
	}
	return t;
}
function _objectSpread$1(e) {
	for (var r = 1; r < arguments.length; r++) {
		var t = null != arguments[r] ? arguments[r] : {};
		r % 2 ? ownKeys$1(Object(t), true).forEach(function(r) {
			_defineProperty$1(e, r, t[r]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$1(Object(t)).forEach(function(r) {
			Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
		});
	}
	return e;
}
function _defineProperty$1(e, r, t) {
	return (r = _toPropertyKey$1(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: true,
		configurable: true,
		writable: true
	}) : e[r] = t, e;
}
function _toPropertyKey$1(t) {
	var i = _toPrimitive$1(t, "string");
	return "symbol" == _typeof$1(i) ? i : i + "";
}
function _toPrimitive$1(t, r) {
	if ("object" != _typeof$1(t) || !t) return t;
	var e = t[Symbol.toPrimitive];
	if (void 0 !== e) {
		var i = e.call(t, r);
		if ("object" != _typeof$1(i)) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === r ? String : Number)(t);
}
function _taggedTemplateLiteral(e, t) {
	return t || (t = e.slice(0)), Object.freeze(Object.defineProperties(e, { raw: { value: Object.freeze(t) } }));
}
var BaseStyle = {
	name: "base",
	css: function css(_ref) {
		var dt = _ref.dt;
		return "\n.p-hidden-accessible {\n    border: 0;\n    clip: rect(0 0 0 0);\n    height: 1px;\n    margin: -1px;\n    opacity: 0;\n    overflow: hidden;\n    padding: 0;\n    pointer-events: none;\n    position: absolute;\n    white-space: nowrap;\n    width: 1px;\n}\n\n.p-overflow-hidden {\n    overflow: hidden;\n    padding-right: ".concat(dt("scrollbar.width"), ";\n}\n");
	},
	style,
	classes: {},
	inlineStyles: {},
	load: function load(style) {
		var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
		var computedStyle = (arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : function(cs) {
			return cs;
		})(ar(_templateObject || (_templateObject = _taggedTemplateLiteral(["", ""])), style));
		return s(computedStyle) ? useStyle(Y(computedStyle), _objectSpread$1({ name: this.name }, options)) : {};
	},
	loadCSS: function loadCSS() {
		var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
		return this.load(this.css, options);
	},
	loadStyle: function loadStyle() {
		var _this = this;
		var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
		var style = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "";
		return this.load(this.style, options, function() {
			var computedStyle = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
			return S.transformCSS(options.name || _this.name, "".concat(computedStyle).concat(ar(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["", ""])), style)));
		});
	},
	getCommonTheme: function getCommonTheme(params) {
		return S.getCommon(this.name, params);
	},
	getComponentTheme: function getComponentTheme(params) {
		return S.getComponent(this.name, params);
	},
	getDirectiveTheme: function getDirectiveTheme(params) {
		return S.getDirective(this.name, params);
	},
	getPresetTheme: function getPresetTheme(preset, selector, params) {
		return S.getCustomPreset(this.name, preset, selector, params);
	},
	getLayerOrderThemeCSS: function getLayerOrderThemeCSS() {
		return S.getLayerOrderCSS(this.name);
	},
	getStyleSheet: function getStyleSheet() {
		var extendedCSS = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
		var props = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
		if (this.css) {
			var _css = m(this.css, { dt: E }) || "";
			var _style = Y(ar(_templateObject3 || (_templateObject3 = _taggedTemplateLiteral([
				"",
				"",
				""
			])), _css, extendedCSS));
			var _props = Object.entries(props).reduce(function(acc, _ref2) {
				var _ref3 = _slicedToArray(_ref2, 2), k = _ref3[0], v = _ref3[1];
				return acc.push("".concat(k, "=\"").concat(v, "\"")) && acc;
			}, []).join(" ");
			return s(_style) ? "<style type=\"text/css\" data-primevue-style-id=\"".concat(this.name, "\" ").concat(_props, ">").concat(_style, "</style>") : "";
		}
		return "";
	},
	getCommonThemeStyleSheet: function getCommonThemeStyleSheet(params) {
		var props = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
		return S.getCommonStyleSheet(this.name, params, props);
	},
	getThemeStyleSheet: function getThemeStyleSheet(params) {
		var props = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
		var css = [S.getStyleSheet(this.name, params, props)];
		if (this.style) {
			var name = this.name === "base" ? "global-style" : "".concat(this.name, "-style");
			var _css = ar(_templateObject4 || (_templateObject4 = _taggedTemplateLiteral(["", ""])), m(this.style, { dt: E }));
			var _style = Y(S.transformCSS(name, _css));
			var _props = Object.entries(props).reduce(function(acc, _ref4) {
				var _ref5 = _slicedToArray(_ref4, 2), k = _ref5[0], v = _ref5[1];
				return acc.push("".concat(k, "=\"").concat(v, "\"")) && acc;
			}, []).join(" ");
			s(_style) && css.push("<style type=\"text/css\" data-primevue-style-id=\"".concat(name, "\" ").concat(_props, ">").concat(_style, "</style>"));
		}
		return css.join("");
	},
	extend: function extend(inStyle) {
		return _objectSpread$1(_objectSpread$1({}, this), {}, {
			css: void 0,
			style: void 0
		}, inStyle);
	}
};
//#endregion
//#region node_modules/@primevue/core/service/index.mjs
var PrimeVueService = s$1();
//#endregion
//#region node_modules/@primevue/core/config/index.mjs
function _typeof(o) {
	"@babel/helpers - typeof";
	return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
		return typeof o;
	} : function(o) {
		return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	}, _typeof(o);
}
function ownKeys(e, r) {
	var t = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var o = Object.getOwnPropertySymbols(e);
		r && (o = o.filter(function(r) {
			return Object.getOwnPropertyDescriptor(e, r).enumerable;
		})), t.push.apply(t, o);
	}
	return t;
}
function _objectSpread(e) {
	for (var r = 1; r < arguments.length; r++) {
		var t = null != arguments[r] ? arguments[r] : {};
		r % 2 ? ownKeys(Object(t), true).forEach(function(r) {
			_defineProperty(e, r, t[r]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
			Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
		});
	}
	return e;
}
function _defineProperty(e, r, t) {
	return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: true,
		configurable: true,
		writable: true
	}) : e[r] = t, e;
}
function _toPropertyKey(t) {
	var i = _toPrimitive(t, "string");
	return "symbol" == _typeof(i) ? i : i + "";
}
function _toPrimitive(t, r) {
	if ("object" != _typeof(t) || !t) return t;
	var e = t[Symbol.toPrimitive];
	if (void 0 !== e) {
		var i = e.call(t, r);
		if ("object" != _typeof(i)) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === r ? String : Number)(t);
}
var defaultOptions = {
	ripple: false,
	inputStyle: null,
	inputVariant: null,
	locale: {
		startsWith: "Starts with",
		contains: "Contains",
		notContains: "Not contains",
		endsWith: "Ends with",
		equals: "Equals",
		notEquals: "Not equals",
		noFilter: "No Filter",
		lt: "Less than",
		lte: "Less than or equal to",
		gt: "Greater than",
		gte: "Greater than or equal to",
		dateIs: "Date is",
		dateIsNot: "Date is not",
		dateBefore: "Date is before",
		dateAfter: "Date is after",
		clear: "Clear",
		apply: "Apply",
		matchAll: "Match All",
		matchAny: "Match Any",
		addRule: "Add Rule",
		removeRule: "Remove Rule",
		accept: "Yes",
		reject: "No",
		choose: "Choose",
		upload: "Upload",
		cancel: "Cancel",
		completed: "Completed",
		pending: "Pending",
		fileSizeTypes: [
			"B",
			"KB",
			"MB",
			"GB",
			"TB",
			"PB",
			"EB",
			"ZB",
			"YB"
		],
		dayNames: [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday"
		],
		dayNamesShort: [
			"Sun",
			"Mon",
			"Tue",
			"Wed",
			"Thu",
			"Fri",
			"Sat"
		],
		dayNamesMin: [
			"Su",
			"Mo",
			"Tu",
			"We",
			"Th",
			"Fr",
			"Sa"
		],
		monthNames: [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December"
		],
		monthNamesShort: [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec"
		],
		chooseYear: "Choose Year",
		chooseMonth: "Choose Month",
		chooseDate: "Choose Date",
		prevDecade: "Previous Decade",
		nextDecade: "Next Decade",
		prevYear: "Previous Year",
		nextYear: "Next Year",
		prevMonth: "Previous Month",
		nextMonth: "Next Month",
		prevHour: "Previous Hour",
		nextHour: "Next Hour",
		prevMinute: "Previous Minute",
		nextMinute: "Next Minute",
		prevSecond: "Previous Second",
		nextSecond: "Next Second",
		am: "am",
		pm: "pm",
		today: "Today",
		weekHeader: "Wk",
		firstDayOfWeek: 0,
		showMonthAfterYear: false,
		dateFormat: "mm/dd/yy",
		weak: "Weak",
		medium: "Medium",
		strong: "Strong",
		passwordPrompt: "Enter a password",
		emptyFilterMessage: "No results found",
		searchMessage: "{0} results are available",
		selectionMessage: "{0} items selected",
		emptySelectionMessage: "No selected item",
		emptySearchMessage: "No results found",
		fileChosenMessage: "{0} files",
		noFileChosenMessage: "No file chosen",
		emptyMessage: "No available options",
		aria: {
			trueLabel: "True",
			falseLabel: "False",
			nullLabel: "Not Selected",
			star: "1 star",
			stars: "{star} stars",
			selectAll: "All items selected",
			unselectAll: "All items unselected",
			close: "Close",
			previous: "Previous",
			next: "Next",
			navigation: "Navigation",
			scrollTop: "Scroll Top",
			moveTop: "Move Top",
			moveUp: "Move Up",
			moveDown: "Move Down",
			moveBottom: "Move Bottom",
			moveToTarget: "Move to Target",
			moveToSource: "Move to Source",
			moveAllToTarget: "Move All to Target",
			moveAllToSource: "Move All to Source",
			pageLabel: "Page {page}",
			firstPageLabel: "First Page",
			lastPageLabel: "Last Page",
			nextPageLabel: "Next Page",
			prevPageLabel: "Previous Page",
			rowsPerPageLabel: "Rows per page",
			jumpToPageDropdownLabel: "Jump to Page Dropdown",
			jumpToPageInputLabel: "Jump to Page Input",
			selectRow: "Row Selected",
			unselectRow: "Row Unselected",
			expandRow: "Row Expanded",
			collapseRow: "Row Collapsed",
			showFilterMenu: "Show Filter Menu",
			hideFilterMenu: "Hide Filter Menu",
			filterOperator: "Filter Operator",
			filterConstraint: "Filter Constraint",
			editRow: "Row Edit",
			saveEdit: "Save Edit",
			cancelEdit: "Cancel Edit",
			listView: "List View",
			gridView: "Grid View",
			slide: "Slide",
			slideNumber: "{slideNumber}",
			zoomImage: "Zoom Image",
			zoomIn: "Zoom In",
			zoomOut: "Zoom Out",
			rotateRight: "Rotate Right",
			rotateLeft: "Rotate Left",
			listLabel: "Option List"
		}
	},
	filterMatchModeOptions: {
		text: [
			FilterMatchMode.STARTS_WITH,
			FilterMatchMode.CONTAINS,
			FilterMatchMode.NOT_CONTAINS,
			FilterMatchMode.ENDS_WITH,
			FilterMatchMode.EQUALS,
			FilterMatchMode.NOT_EQUALS
		],
		numeric: [
			FilterMatchMode.EQUALS,
			FilterMatchMode.NOT_EQUALS,
			FilterMatchMode.LESS_THAN,
			FilterMatchMode.LESS_THAN_OR_EQUAL_TO,
			FilterMatchMode.GREATER_THAN,
			FilterMatchMode.GREATER_THAN_OR_EQUAL_TO
		],
		date: [
			FilterMatchMode.DATE_IS,
			FilterMatchMode.DATE_IS_NOT,
			FilterMatchMode.DATE_BEFORE,
			FilterMatchMode.DATE_AFTER
		]
	},
	zIndex: {
		modal: 1100,
		overlay: 1e3,
		menu: 1e3,
		tooltip: 1100
	},
	theme: void 0,
	unstyled: false,
	pt: void 0,
	ptOptions: {
		mergeSections: true,
		mergeProps: false
	},
	csp: { nonce: void 0 }
};
var PrimeVueSymbol = Symbol();
function usePrimeVue() {
	var PrimeVue = inject(PrimeVueSymbol);
	if (!PrimeVue) throw new Error("PrimeVue is not installed!");
	return PrimeVue;
}
function setup(app, options) {
	var PrimeVue = { config: reactive(options) };
	app.config.globalProperties.$primevue = PrimeVue;
	app.provide(PrimeVueSymbol, PrimeVue);
	clearConfig();
	setupConfig(app, PrimeVue);
	return PrimeVue;
}
var stopWatchers = [];
function clearConfig() {
	N.clear();
	stopWatchers.forEach(function(fn) {
		return fn === null || fn === void 0 ? void 0 : fn();
	});
	stopWatchers = [];
}
function setupConfig(app, PrimeVue) {
	var isThemeChanged = ref(false);
	/*** Methods and Services ***/
	var loadCommonTheme = function loadCommonTheme() {
		var _PrimeVue$config;
		if (((_PrimeVue$config = PrimeVue.config) === null || _PrimeVue$config === void 0 ? void 0 : _PrimeVue$config.theme) === "none") return;
		if (!S.isStyleNameLoaded("common")) {
			var _BaseStyle$getCommonT, _PrimeVue$config2;
			var _ref = ((_BaseStyle$getCommonT = BaseStyle.getCommonTheme) === null || _BaseStyle$getCommonT === void 0 ? void 0 : _BaseStyle$getCommonT.call(BaseStyle)) || {}, primitive = _ref.primitive, semantic = _ref.semantic, global = _ref.global, style = _ref.style;
			var styleOptions = { nonce: (_PrimeVue$config2 = PrimeVue.config) === null || _PrimeVue$config2 === void 0 || (_PrimeVue$config2 = _PrimeVue$config2.csp) === null || _PrimeVue$config2 === void 0 ? void 0 : _PrimeVue$config2.nonce };
			BaseStyle.load(primitive === null || primitive === void 0 ? void 0 : primitive.css, _objectSpread({ name: "primitive-variables" }, styleOptions));
			BaseStyle.load(semantic === null || semantic === void 0 ? void 0 : semantic.css, _objectSpread({ name: "semantic-variables" }, styleOptions));
			BaseStyle.load(global === null || global === void 0 ? void 0 : global.css, _objectSpread({ name: "global-variables" }, styleOptions));
			BaseStyle.loadStyle(_objectSpread({ name: "global-style" }, styleOptions), style);
			S.setLoadedStyleName("common");
		}
	};
	N.on("theme:change", function(newTheme) {
		if (!isThemeChanged.value) {
			app.config.globalProperties.$primevue.config.theme = newTheme;
			isThemeChanged.value = true;
		}
	});
	/*** Watchers ***/
	var stopConfigWatcher = watch(PrimeVue.config, function(newValue, oldValue) {
		PrimeVueService.emit("config:change", {
			newValue,
			oldValue
		});
	}, {
		immediate: true,
		deep: true
	});
	var stopRippleWatcher = watch(function() {
		return PrimeVue.config.ripple;
	}, function(newValue, oldValue) {
		PrimeVueService.emit("config:ripple:change", {
			newValue,
			oldValue
		});
	}, {
		immediate: true,
		deep: true
	});
	var stopThemeWatcher = watch(function() {
		return PrimeVue.config.theme;
	}, function(newValue, oldValue) {
		if (!isThemeChanged.value) S.setTheme(newValue);
		if (!PrimeVue.config.unstyled) loadCommonTheme();
		isThemeChanged.value = false;
		PrimeVueService.emit("config:theme:change", {
			newValue,
			oldValue
		});
	}, {
		immediate: true,
		deep: false
	});
	var stopUnstyledWatcher = watch(function() {
		return PrimeVue.config.unstyled;
	}, function(newValue, oldValue) {
		if (!newValue && PrimeVue.config.theme) loadCommonTheme();
		PrimeVueService.emit("config:unstyled:change", {
			newValue,
			oldValue
		});
	}, {
		immediate: true,
		deep: true
	});
	stopWatchers.push(stopConfigWatcher);
	stopWatchers.push(stopRippleWatcher);
	stopWatchers.push(stopThemeWatcher);
	stopWatchers.push(stopUnstyledWatcher);
}
var PrimeVue = { install: function install(app, options) {
	setup(app, H(defaultOptions, options));
} };
//#endregion
export { clearConfig, PrimeVue as default, defaultOptions, setup, setupConfig, usePrimeVue };

//# sourceMappingURL=primevue_config.js.map