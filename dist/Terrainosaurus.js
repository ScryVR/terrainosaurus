import {
    BufferGeometry,
    Float32BufferAttribute,
    Vector3
} from "three";

import {
    defaultGenerators,
    defaultGeneratorSelector
} from "./generators";

import {
    SimplexNoise
} from "simplex-noise-esm";

const VERTICES_PER_SQUARE = 6;

class Terrainosaurus {
    THREE;
    size;
    seed;
    offset;
    vertices;
    indices;
    state;
    colors;
    waterLevel;
    generators;
    generatorSelector;
    vertexWorker;
    vertexWorkerUrl;
    constructor(e) {
        this.vertices = [], this.state = e.state || {}, this.indices = [], this.size = e.size, 
        this.offset = e.size / 2, this.generatorSelector = e.generatorSelector || defaultGeneratorSelector, 
        this.generators = e.generators || defaultGenerators, this.vertexWorkerUrl = e.vertexWorkerUrl, 
        this.seed = (e.seed || Math.random()).toString(), this.colors = e.colors, 
        this.waterLevel = e.waterLevel, this.state.simplex = new SimplexNoise(this.seed), 
        this.setInitialVertices(this.offset), this.THREE = {
            Vector3: Vector3
        };
    }
    setInitialVertices(t) {
        this.vertices = this.vertices.concat([ {
            pos: [ 1, 0, 1 ],
            norm: [ 0, 1, 0 ],
            uv: [ 0, 1 ],
            recursions: 0
        }, {
            pos: [ -1, 0, 1 ],
            norm: [ 0, 1, 0 ],
            uv: [ 1, 1 ],
            recursions: 0
        }, {
            pos: [ 1, 0, -1 ],
            norm: [ 0, 1, 0 ],
            uv: [ 0, 0 ],
            recursions: 0
        }, {
            pos: [ 1, 0, -1 ],
            norm: [ 0, 1, 0 ],
            uv: [ 0, 0 ],
            recursions: 0
        }, {
            pos: [ -1, 0, 1 ],
            norm: [ 0, 1, 0 ],
            uv: [ 1, 1 ],
            recursions: 0
        }, {
            pos: [ -1, 0, -1 ],
            norm: [ 0, 1, 0 ],
            uv: [ 1, 0 ],
            recursions: 0
        } ]).map(e => ({
            ...e,
            pos: e.pos.map(e => e * t)
        }));
    }
    recurseFullMap(t = 1) {
        for (let e = 0; e < t; e++) for (let e = this.vertices.length - 6; -1 < e; e -= 6) this.recursivelyGenerate(e);
    }
    recurseSection({
        vertices: t,
        absoluteIndex: r
    }, s = 1) {
        for (let e = 0; e < s; e++) for (let e = t.length - 6; -1 < e; e -= 6) this.recursivelyGenerate(e + r);
    }
    async recurseSectionInBackground(s, o = 1) {
        return new Promise((t, e) => {
            this.vertexWorkerUrl || e("Cannot recurse in background - vertexWorkerUrl not provided in constructor");
            e = new Worker(this.vertexWorkerUrl, {
                type: "module"
            });
            const r = {
                start: s.absoluteIndex,
                end: s.vertices.length
            };
            e.onmessage = e => {
                this.vertices.splice(r.start, r.end, ...e.data.vertices), t(e.data.geometry);
            }, e.postMessage({
                action: "recurseSection",
                seed: this.seed,
                colors: this.colors,
                waterLevel: this.waterLevel,
                section: {
                    vertices: s.vertices,
                    absoluteIndex: 0
                },
                generatorSelector: this.generatorSelector.toString(),
                generators: this.generators.map(e => e.toString()),
                levels: o
            });
        });
    }
    recursivelyGenerate(e) {
        if (e % VERTICES_PER_SQUARE) throw new Error("The given vertex does not represent the start of a cell");
        var t, r;
        this.vertices[e] ? (r = this.vertices.slice(e, e + VERTICES_PER_SQUARE), 
        t = this.vertices[e].recursions + 1, r = this.getSubSquares({
            vertices: r,
            recursions: t,
            vertexIndex: e
        }), this.vertices.splice(e, VERTICES_PER_SQUARE, ...r)) : console.warn(`Skipping recursion: Index ${e} exceeds bounds (${this.vertices.length})`);
    }
    getSection(e, t) {
        return t = t || {
            vertices: this.vertices,
            absoluteIndex: 0
        }, e.reduce((e, t, r) => {
            var r = r + 1, s = Math.pow(4, e.vertices[0].recursions - r) * VERTICES_PER_SQUARE, o = s + Math.pow(4, e.vertices[s].recursions - r) * VERTICES_PER_SQUARE, n = o + Math.pow(4, e.vertices[o].recursions - r) * VERTICES_PER_SQUARE, s = [ 0, s, o, n, n + Math.pow(4, e.vertices[o].recursions - r) * VERTICES_PER_SQUARE ];
            return e.vertices = e.vertices.slice(s[(t = t < 3 ? t % 2 + 1 : t) - 1], s[t]), 
            e.absoluteIndex += s[t - 1], e;
        }, t);
    }
    getSubSquares(e) {
        var t = e["recursions"], [ r, s, o, , , n ] = e.vertices, i = bilinearInterpolation({
            p1: r,
            p2: s,
            p3: o,
            p4: n
        }), t = vertexGenerator(t), i = [ {
            pos: [ i.x, i.y, i.z ],
            ...t.next().value
        }, {
            pos: [ n.pos[0], (n.pos[1] + s.pos[1]) / 2, i.z ],
            ...t.next().value
        }, {
            pos: [ i.x, (n.pos[1] + o.pos[1]) / 2, n.pos[2] ],
            ...t.next().value
        }, {
            pos: [ i.x, (n.pos[1] + o.pos[1]) / 2, n.pos[2] ],
            ...t.next().value
        }, {
            pos: [ n.pos[0], (n.pos[1] + s.pos[1]) / 2, i.z ],
            ...t.next().value
        }, {
            ...n,
            ...t.next().value
        }, {
            pos: [ o.pos[0], (o.pos[1] + r.pos[1]) / 2, i.z ],
            ...t.next().value
        }, {
            pos: [ i.x, i.y, i.z ],
            ...t.next().value
        }, {
            ...o,
            ...t.next().value
        }, {
            ...o,
            ...t.next().value
        }, {
            pos: [ i.x, i.y, i.z ],
            ...t.next().value
        }, {
            pos: [ i.x, (n.pos[1] + o.pos[1]) / 2, o.pos[2] ],
            ...t.next().value
        }, {
            pos: [ i.x, (s.pos[1] + r.pos[1]) / 2, s.pos[2] ],
            ...t.next().value
        }, {
            ...s,
            ...t.next().value
        }, {
            pos: [ i.x, i.y, i.z ],
            ...t.next().value
        }, {
            pos: [ i.x, i.y, i.z ],
            ...t.next().value
        }, {
            ...s,
            ...t.next().value
        }, {
            pos: [ n.pos[0], (n.pos[1] + s.pos[1]) / 2, i.z ],
            ...t.next().value
        }, {
            ...r,
            ...t.next().value
        }, {
            pos: [ i.x, (s.pos[1] + r.pos[1]) / 2, s.pos[2] ],
            ...t.next().value
        }, {
            pos: [ o.pos[0], (o.pos[1] + r.pos[1]) / 2, i.z ],
            ...t.next().value
        }, {
            pos: [ o.pos[0], (o.pos[1] + r.pos[1]) / 2, i.z ],
            ...t.next().value
        }, {
            pos: [ i.x, (s.pos[1] + r.pos[1]) / 2, s.pos[2] ],
            ...t.next().value
        }, {
            pos: [ i.x, i.y, i.z ],
            ...t.next().value
        } ];
        return this.generators[this.generatorSelector({
            topLeft: n,
            topRight: o,
            bottomLeft: s,
            bottomRight: r,
            vertexIndex: e.vertexIndex
        })].call(this, i, i.map(e => this.state.simplex.noise2D(e.pos[0], e.pos[2]))), 
        i;
    }
    createGeometry(e = this.vertices) {
        var t = new BufferGeometry(), {
            positions: e,
            normals: r,
            uvs: s,
            colors: o
        } = e.reduce((e, t) => (e.positions = e.positions.concat(t.pos), e.normals = e.normals.concat(t.norm), 
        e.uvs = e.uvs.concat(t.uv), e.colors = e.colors.concat(t.color), e), {
            positions: [],
            normals: [],
            uvs: [],
            colors: []
        });
        return t.setAttribute("position", new Float32BufferAttribute(new Float32Array(e), 3)), 
        t.setAttribute("normal", new Float32BufferAttribute(new Float32Array(r), 3)), 
        t.setAttribute("uv", new Float32BufferAttribute(new Float32Array(s), 2)), 
        t.setAttribute("color", new Float32BufferAttribute(new Float32Array(o), 3)), 
        t;
    }
}

function bilinearInterpolation(e) {
    var {
        p1: e,
        p2: t,
        p3: r,
        p4: s,
        isCentroid: o = !0
    } = e;
    if (o) return {
        x: (e.pos[0] + t.pos[0] + r.pos[0] + s.pos[0]) / 4,
        y: (e.pos[1] + t.pos[1] + r.pos[1] + s.pos[1]) / 4,
        z: (e.pos[2] + t.pos[2] + r.pos[2] + s.pos[2]) / 4
    };
    throw new Error("Oops, someone had better implement non-centroid bilinear interpolation");
}

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

export {
    Terrainosaurus
};