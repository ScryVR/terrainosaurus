/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/aframe/dist/aframe-master.js":
/*!***************************************************!*\
  !*** ./node_modules/aframe/dist/aframe-master.js ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/***/ }),

/***/ "./src/styles/main.scss":
/*!******************************!*\
  !*** ./src/styles/main.scss ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n// extracted by mini-css-extract-plugin\n\n\n//# sourceURL=webpack://terrainosaurus/./src/styles/main.scss?");

/***/ }),

/***/ "./src/scripts/classes/Terrainosaurus.ts":
/*!***********************************************!*\
  !*** ./src/scripts/classes/Terrainosaurus.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"Terrainosaurus\": () => (/* binding */ Terrainosaurus)\n/* harmony export */ });\n/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ \"./node_modules/three/build/three.module.js\");\n\nclass Terrainosaurus {\n    constructor(props) {\n        this.vertices = [];\n        this.indices = [];\n        this.size = props.size;\n        this.offset = props.size / 2;\n    }\n    setInitialVertices(offset) {\n        // Initialize such that we can use diamond-square displacement\n        // TODO: Remove the duplicate vertices and update the indices instead\n        this.vertices = this.vertices\n            .concat([\n            { pos: [1, -1, 1], norm: [0, -1, 0], uv: [0, 1] },\n            { pos: [-1, -1, 1], norm: [0, -1, 0], uv: [1, 1] },\n            { pos: [1, -1, -1], norm: [0, -1, 0], uv: [0, 0] },\n            { pos: [1, -1, -1], norm: [0, -1, 0], uv: [0, 0] },\n            { pos: [-1, -1, 1], norm: [0, -1, 0], uv: [1, 1] },\n            { pos: [-1, -1, -1], norm: [0, -1, 0], uv: [1, 0] },\n        ])\n            // This is technically less performant, but it's easier to visualize the plane this way.\n            .map((v) => (Object.assign({ pos: v.pos.map((p) => p * offset) }, v)));\n    }\n    recursivelyGenerate() {\n        // Add new interstitial vertices using bilinear interpolation\n        // Displace randomly\n        // Update indices\n    }\n    createGeometry() {\n        // When called, generates a BufferGeometry out of the current vertices\n        const geometry = new three__WEBPACK_IMPORTED_MODULE_0__.BufferGeometry();\n        const positionNumComponents = 3;\n        const normalNumComponents = 3;\n        const uvNumComponents = 2;\n        // Get vertex data in nice parallel arrays\n        const { positions, normals, uvs } = this.vertices.reduce((acc, vertex) => {\n            acc.positions = acc.positions.concat(vertex.pos);\n            acc.normals = acc.normals.concat(vertex.norm);\n            acc.uvs = acc.uvs.concat(vertex.uv);\n            if (vertex.color) {\n                acc.color = acc.color.concat(vertex.color);\n            }\n            return acc;\n        }, { positions: [], normals: [], uvs: [], color: [] });\n        // Use parallel arrays to create BufferGeometry\n        geometry.setAttribute(\"position\", new three__WEBPACK_IMPORTED_MODULE_0__.BufferAttribute(new Float32Array(positions), positionNumComponents));\n        geometry.setAttribute(\"normal\", new three__WEBPACK_IMPORTED_MODULE_0__.BufferAttribute(new Float32Array(normals), normalNumComponents));\n        geometry.setAttribute(\"uv\", new three__WEBPACK_IMPORTED_MODULE_0__.BufferAttribute(new Float32Array(uvs), uvNumComponents));\n        geometry.setIndex(this.indices);\n        return geometry;\n    }\n}\n\n\n//# sourceURL=webpack://terrainosaurus/./src/scripts/classes/Terrainosaurus.ts?");

/***/ }),

/***/ "./src/scripts/main.ts":
/*!*****************************!*\
  !*** ./src/scripts/main.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _classes_Terrainosaurus__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./classes/Terrainosaurus */ \"./src/scripts/classes/Terrainosaurus.ts\");\n/* harmony import */ var aframe__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! aframe */ \"./node_modules/aframe/dist/aframe-master.js\");\n/* harmony import */ var aframe__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(aframe__WEBPACK_IMPORTED_MODULE_1__);\n\n\nconst terrainClient = new _classes_Terrainosaurus__WEBPACK_IMPORTED_MODULE_0__.Terrainosaurus({\n    size: 2,\n    seed: 0,\n    lowDetailRecursions: 0,\n    highDetailRecursions: 0\n});\nconst geometry = terrainClient.createGeometry();\n(0,aframe__WEBPACK_IMPORTED_MODULE_1__.registerGeometry)(\"terrainosaurus-terrain\", {\n    init() {\n        geometry.computeBoundingBox();\n        geometry.computeVertexNormals();\n        console.log(\"initializing custom geometry\", geometry);\n        this.geometry = geometry;\n    }\n});\n\n\n//# sourceURL=webpack://terrainosaurus/./src/scripts/main.ts?");

/***/ }),

/***/ "./node_modules/three/build/three.module.js":
/*!**************************************************!*\
  !*** ./node_modules/three/build/three.module.js ***!
  \**************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	__webpack_require__("./src/scripts/main.ts");
/******/ 	var __webpack_exports__ = __webpack_require__("./src/styles/main.scss");
/******/ 	
/******/ })()
;