import {
    SimplexNoise
} from "https://unpkg.com/simplex-noise-esm@2.5.0-esm.0/dist-esm/simplex-noise.js";

let simplex = null;

const VERTICES_PER_SQUARE = 6;

function reconstructFunction(e) {
    let s = (e = (e = (e = e.replace(/\S*__WEBPACK_IMPORTED_MODULE_\d+__./g, "")).replace("){", "){\n")).replace(/}$/g, "\n}")).split("\n");
    s.pop();
    e = s.shift();
    s = s.join("\n");
    let o = e.match(/\([^)]*\)/)[0];
    return o = o.replace("(", "").replace(")", "").split(","), Function(...o, s);
}

function recurseSection({
    vertices: s,
    absoluteIndex: o
}, t = 1) {
    for (let e = 0; e < t; e++) for (let e = s.length - 6; -1 < e; e -= 6) recursivelyGenerate.call(this, e + o);
}

function recursivelyGenerate(e) {
    if (e % VERTICES_PER_SQUARE) throw new Error("The given vertex does not represent the start of a cell");
    var s, o;
    this.vertices[e] ? (o = this.vertices.slice(e, e + VERTICES_PER_SQUARE), s = this.vertices[e].recursions + 1, 
    o = getSubSquares.call(this, {
        vertices: o,
        recursions: s,
        vertexIndex: e
    }), this.vertices.splice(e, VERTICES_PER_SQUARE, ...o)) : console.warn(`Skipping recursion: Index ${e} exceeds bounds (${this.vertices.length})`);
}

function getSubSquares(e) {
    var s = e["recursions"], [ o, t, n, , , r ] = e.vertices, p = bilinearInterpolation({
        p1: o,
        p2: t,
        p3: n,
        p4: r
    }), s = vertexGenerator(s), p = [ {
        pos: [ p.x, p.y, p.z ],
        ...s.next().value
    }, {
        pos: [ r.pos[0], (r.pos[1] + t.pos[1]) / 2, p.z ],
        ...s.next().value
    }, {
        pos: [ p.x, (r.pos[1] + n.pos[1]) / 2, r.pos[2] ],
        ...s.next().value
    }, {
        pos: [ p.x, (r.pos[1] + n.pos[1]) / 2, r.pos[2] ],
        ...s.next().value
    }, {
        pos: [ r.pos[0], (r.pos[1] + t.pos[1]) / 2, p.z ],
        ...s.next().value
    }, {
        ...r,
        ...s.next().value
    }, {
        pos: [ n.pos[0], (n.pos[1] + o.pos[1]) / 2, p.z ],
        ...s.next().value
    }, {
        pos: [ p.x, p.y, p.z ],
        ...s.next().value
    }, {
        ...n,
        ...s.next().value
    }, {
        ...n,
        ...s.next().value
    }, {
        pos: [ p.x, p.y, p.z ],
        ...s.next().value
    }, {
        pos: [ p.x, (r.pos[1] + n.pos[1]) / 2, n.pos[2] ],
        ...s.next().value
    }, {
        pos: [ p.x, (t.pos[1] + o.pos[1]) / 2, t.pos[2] ],
        ...s.next().value
    }, {
        ...t,
        ...s.next().value
    }, {
        pos: [ p.x, p.y, p.z ],
        ...s.next().value
    }, {
        pos: [ p.x, p.y, p.z ],
        ...s.next().value
    }, {
        ...t,
        ...s.next().value
    }, {
        pos: [ r.pos[0], (r.pos[1] + t.pos[1]) / 2, p.z ],
        ...s.next().value
    }, {
        ...o,
        ...s.next().value
    }, {
        pos: [ p.x, (t.pos[1] + o.pos[1]) / 2, t.pos[2] ],
        ...s.next().value
    }, {
        pos: [ n.pos[0], (n.pos[1] + o.pos[1]) / 2, p.z ],
        ...s.next().value
    }, {
        pos: [ n.pos[0], (n.pos[1] + o.pos[1]) / 2, p.z ],
        ...s.next().value
    }, {
        pos: [ p.x, (t.pos[1] + o.pos[1]) / 2, t.pos[2] ],
        ...s.next().value
    }, {
        pos: [ p.x, p.y, p.z ],
        ...s.next().value
    } ];
    this.generators[this.generatorSelector({
        topLeft: r,
        topRight: n,
        bottomLeft: t,
        bottomRight: o,
        vertexIndex: e.vertexIndex
    })].call(this, p, p.map(e => this.state.simplex.noise2D(e.pos[0] / this.genParams.noiseSampleCoeff, e.pos[2] / this.genParams.noiseSampleCoeff)));
    return p;
}

function bilinearInterpolation(e) {
    var {
        p1: e,
        p2: s,
        p3: o,
        p4: t,
        isCentroid: n = !0
    } = e;
    if (n) return {
        x: (e.pos[0] + s.pos[0] + o.pos[0] + t.pos[0]) / 4,
        y: (e.pos[1] + s.pos[1] + o.pos[1] + t.pos[1]) / 4,
        z: (e.pos[2] + s.pos[2] + o.pos[2] + t.pos[2]) / 4
    };
    throw new Error("Oops, someone had better implement non-centroid bilinear interpolation");
}

self.addEventListener("message", ({
    data: e
}) => {
    var s, o;
    "recurseSection" === e.action && (s = {
        colors: e.colors,
        waterLevel: e.waterLevel,
        vertices: e.section.vertices,
        genParams: e.genParams,
        generators: e.generators.map(e => reconstructFunction(e)),
        generatorSelector: reconstructFunction(e.generatorSelector)
    }, simplex || (simplex = new SimplexNoise(e.seed || Math.random().toString()), 
    s.state = {
        simplex: simplex
    }), o = e.levels || 1, recurseSection.call(s, e.section, o), postMessage({
        vertices: s.vertices
    }));
});

const vertexGenerator = function*(e) {
    for (;;) yield {
        norm: [ 0, 1, 0 ],
        uv: [ 0, 1 ],
        recursions: e
    }, yield {
        norm: [ 0, 1, 0 ],
        uv: [ 1, 1 ],
        recursions: e
    }, yield {
        norm: [ 0, 1, 0 ],
        uv: [ 0, 0 ],
        recursions: e
    }, yield {
        norm: [ 0, 1, 0 ],
        uv: [ 0, 0 ],
        recursions: e
    }, yield {
        norm: [ 0, 1, 0 ],
        uv: [ 1, 1 ],
        recursions: e
    }, yield {
        norm: [ 0, 1, 0 ],
        uv: [ 1, 0 ],
        recursions: e
    };
};