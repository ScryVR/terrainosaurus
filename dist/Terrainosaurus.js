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
    genParams;
    constructor(e) {
        this.vertices = [], this.state = e.state || {}, this.indices = [], this.size = e.size, 
        this.offset = e.size / 2, this.generatorSelector = e.generatorSelector || defaultGeneratorSelector, 
        this.generators = e.generators || defaultGenerators, this.vertexWorkerUrl = e.vertexWorkerUrl, 
        this.seed = e.seed, this.setGenerationParameters(), this.colors = e.colors, 
        this.waterLevel = e.waterLevel, this.state.simplex = new SimplexNoise(this.seed), 
        this.setInitialVertices(this.offset), this.THREE = {
            Vector3: Vector3
        };
    }
    setGenerationParameters() {
        this.seed || (this.seed = Math.random().toString().replace("0.", ""));
        let e = this.seed.toString().replace(/[a-z]/g, "");
        for (;e.length < 10; ) e += e;
        this.genParams = {
            islandSize: 6 * Number("" + e[0]) + 5 || 20,
            landmassSlope: 4 * Number("" + e[1]) + 5 || 25,
            maxHeight: Number("" + e[2]) / 15 || .2,
            smoothness: .2 * (Number("" + e[3]) + 1) || 1,
            plateauFactor: 6 * Number("" + e[4]) + 5 || 20,
            noiseSampleCoeff: Math.ceil(Number("" + e[5]) / 4) + 1
        };
    }
    setInitialVertices(s) {
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
            pos: e.pos.map(e => e * s)
        }));
    }
    recurseFullMap(s = 1) {
        for (let e = 0; e < s; e++) for (let e = this.vertices.length - 6; -1 < e; e -= 6) this.recursivelyGenerate(e);
    }
    recurseSection({
        vertices: s,
        absoluteIndex: t
    }, r = 1) {
        for (let e = 0; e < r; e++) for (let e = s.length - 6; -1 < e; e -= 6) this.recursivelyGenerate(e + t);
    }
    async recurseSectionInBackground(r, o = 1) {
        return new Promise((s, e) => {
            this.vertexWorkerUrl || e("Cannot recurse in background - vertexWorkerUrl not provided in constructor");
            e = new Worker(this.vertexWorkerUrl, {
                type: "module"
            });
            const t = {
                start: r.absoluteIndex,
                end: r.vertices.length
            };
            e.onmessage = e => {
                this.vertices.splice(t.start, t.end, ...e.data.vertices), s(e.data.geometry);
            }, e.postMessage({
                action: "recurseSection",
                seed: this.seed,
                colors: this.colors,
                waterLevel: this.waterLevel,
                section: {
                    vertices: r.vertices,
                    absoluteIndex: 0
                },
                generatorSelector: this.generatorSelector.toString(),
                generators: this.generators.map(e => e.toString()),
                genParams: this.genParams,
                levels: o
            });
        });
    }
    recursivelyGenerate(e) {
        if (e % VERTICES_PER_SQUARE) throw new Error("The given vertex does not represent the start of a cell");
        var s, t;
        this.vertices[e] ? (t = this.vertices.slice(e, e + VERTICES_PER_SQUARE), 
        s = this.vertices[e].recursions + 1, t = this.getSubSquares({
            vertices: t,
            recursions: s,
            vertexIndex: e
        }), this.vertices.splice(e, VERTICES_PER_SQUARE, ...t)) : console.warn(`Skipping recursion: Index ${e} exceeds bounds (${this.vertices.length})`);
    }
    getSection(e, s) {
        return s = s || {
            vertices: this.vertices,
            absoluteIndex: 0
        }, e.reduce((e, s, t) => {
            var t = t + 1, r = Math.pow(4, e.vertices[0].recursions - t) * VERTICES_PER_SQUARE, o = r + Math.pow(4, e.vertices[r].recursions - t) * VERTICES_PER_SQUARE, n = o + Math.pow(4, e.vertices[o].recursions - t) * VERTICES_PER_SQUARE, r = [ 0, r, o, n, n + Math.pow(4, e.vertices[o].recursions - t) * VERTICES_PER_SQUARE ];
            return e.vertices = e.vertices.slice(r[(s = s < 3 ? s % 2 + 1 : s) - 1], r[s]), 
            e.absoluteIndex += r[s - 1], e;
        }, s);
    }
    getSubSquares(e) {
        var s = e["recursions"], [ t, r, o, , , n ] = e.vertices, i = bilinearInterpolation({
            p1: t,
            p2: r,
            p3: o,
            p4: n
        }), s = vertexGenerator(s), i = [ {
            pos: [ i.x, i.y, i.z ],
            ...s.next().value
        }, {
            pos: [ n.pos[0], (n.pos[1] + r.pos[1]) / 2, i.z ],
            ...s.next().value
        }, {
            pos: [ i.x, (n.pos[1] + o.pos[1]) / 2, n.pos[2] ],
            ...s.next().value
        }, {
            pos: [ i.x, (n.pos[1] + o.pos[1]) / 2, n.pos[2] ],
            ...s.next().value
        }, {
            pos: [ n.pos[0], (n.pos[1] + r.pos[1]) / 2, i.z ],
            ...s.next().value
        }, {
            ...n,
            ...s.next().value
        }, {
            pos: [ o.pos[0], (o.pos[1] + t.pos[1]) / 2, i.z ],
            ...s.next().value
        }, {
            pos: [ i.x, i.y, i.z ],
            ...s.next().value
        }, {
            ...o,
            ...s.next().value
        }, {
            ...o,
            ...s.next().value
        }, {
            pos: [ i.x, i.y, i.z ],
            ...s.next().value
        }, {
            pos: [ i.x, (n.pos[1] + o.pos[1]) / 2, o.pos[2] ],
            ...s.next().value
        }, {
            pos: [ i.x, (r.pos[1] + t.pos[1]) / 2, r.pos[2] ],
            ...s.next().value
        }, {
            ...r,
            ...s.next().value
        }, {
            pos: [ i.x, i.y, i.z ],
            ...s.next().value
        }, {
            pos: [ i.x, i.y, i.z ],
            ...s.next().value
        }, {
            ...r,
            ...s.next().value
        }, {
            pos: [ n.pos[0], (n.pos[1] + r.pos[1]) / 2, i.z ],
            ...s.next().value
        }, {
            ...t,
            ...s.next().value
        }, {
            pos: [ i.x, (r.pos[1] + t.pos[1]) / 2, r.pos[2] ],
            ...s.next().value
        }, {
            pos: [ o.pos[0], (o.pos[1] + t.pos[1]) / 2, i.z ],
            ...s.next().value
        }, {
            pos: [ o.pos[0], (o.pos[1] + t.pos[1]) / 2, i.z ],
            ...s.next().value
        }, {
            pos: [ i.x, (r.pos[1] + t.pos[1]) / 2, r.pos[2] ],
            ...s.next().value
        }, {
            pos: [ i.x, i.y, i.z ],
            ...s.next().value
        } ];
        return this.generators[this.generatorSelector({
            topLeft: n,
            topRight: o,
            bottomLeft: r,
            bottomRight: t,
            vertexIndex: e.vertexIndex
        })].call(this, i, i.map(e => this.state.simplex.noise2D(e.pos[0] / this.genParams.noiseSampleCoeff, e.pos[2] / this.genParams.noiseSampleCoeff))), 
        i;
    }
    createGeometry(e = this.vertices) {
        var s = new BufferGeometry(), {
            positions: e,
            normals: t,
            uvs: r,
            colors: o
        } = e.reduce((e, s) => (e.positions = e.positions.concat(s.pos), e.normals = e.normals.concat(s.norm), 
        e.uvs = e.uvs.concat(s.uv), e.colors = e.colors.concat(s.color), e), {
            positions: [],
            normals: [],
            uvs: [],
            colors: []
        });
        return s.setAttribute("position", new Float32BufferAttribute(new Float32Array(e), 3)), 
        s.setAttribute("normal", new Float32BufferAttribute(new Float32Array(t), 3)), 
        s.setAttribute("uv", new Float32BufferAttribute(new Float32Array(r), 2)), 
        s.setAttribute("color", new Float32BufferAttribute(new Float32Array(o), 3)), 
        s;
    }
}

function bilinearInterpolation(e) {
    var {
        p1: e,
        p2: s,
        p3: t,
        p4: r,
        isCentroid: o = !0
    } = e;
    if (o) return {
        x: (e.pos[0] + s.pos[0] + t.pos[0] + r.pos[0]) / 4,
        y: (e.pos[1] + s.pos[1] + t.pos[1] + r.pos[1]) / 4,
        z: (e.pos[2] + s.pos[2] + t.pos[2] + r.pos[2]) / 4
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