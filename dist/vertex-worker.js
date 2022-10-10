// @ts-ignore
import "https://unpkg.com/three@0.144.0/build/three.min.js";
// @ts-ignore
import { SimplexNoise } from "https://unpkg.com/simplex-noise-esm@2.5.0-esm.0/dist-esm/simplex-noise.js";
let simplex = null;
const VERTICES_PER_SQUARE = 6;
self.addEventListener("message", ({ data }) => {
    if (data.action === "recurseSection") {
        const context = {
            vertices: data.section.vertices,
            generators: data.generators.map((f) => reconstructFunction(f)),
            generatorSelector: reconstructFunction(data.generatorSelector),
            // @ts-ignore
            THREE
        };
        if (!simplex) {
            simplex = new SimplexNoise(data.seed || Math.random().toString());
        }
        const levels = data.levels || 1;
        recurseSection.call(context, data.section, levels);
        postMessage({
            vertices: context.vertices
        });
    }
});
function reconstructFunction(functionString) {
    functionString = functionString.replace(/\S*__WEBPACK_IMPORTED_MODULE_\d+__./g, "");
    let functionCode = functionString.split("\n");
    functionCode.pop();
    let functionSignature = functionCode.shift();
    functionCode = functionCode.join("\n");
    let args = functionSignature.match(/\([^)]*\)/)[0];
    args = args.replace("(", "").replace(")", "").split(",");
    return Function(...args, functionCode);
}
// TODO: Fix code duplication with Terrainosaurus by importing these functions from a single place
function recurseSection({ vertices, absoluteIndex }, levels = 1) {
    for (let level = 0; level < levels; level++) {
        // Adds one level of recursion across the entire terrain map
        for (let i = vertices.length - 6; i > -1; i -= 6) {
            recursivelyGenerate.call(this, i + absoluteIndex);
        }
    }
}
function recursivelyGenerate(vertexIndex) {
    /**
     * Replaces a given square with 4 smaller squares.
     * Each square is represented by 6 vertices, so we can get a slice from the vertices array, create a new one, and insert it.
     */
    if (vertexIndex % VERTICES_PER_SQUARE) {
        throw new Error("The given vertex does not represent the start of a cell");
    }
    if (!this.vertices[vertexIndex]) {
        console.warn(`Skipping recursion: Index ${vertexIndex} exceeds bounds (${this.vertices.length})`);
        return;
    }
    const verticesToReplace = this.vertices.slice(vertexIndex, vertexIndex + VERTICES_PER_SQUARE);
    const recursions = this.vertices[vertexIndex].recursions + 1;
    // Get 4 corners of the square to compute the centroid.
    let replacementVertices = getSubSquares.call(this, {
        vertices: verticesToReplace,
        recursions,
        vertexIndex,
    });
    this.vertices.splice(vertexIndex, VERTICES_PER_SQUARE, ...replacementVertices);
}
function getSubSquares(props) {
    const { recursions } = props;
    const [bottomRight, bottomLeft, topRight, _, __, topLeft] = props.vertices;
    let center = bilinearInterpolation({
        p1: bottomRight,
        p2: bottomLeft,
        p3: topRight,
        p4: topLeft,
    });
    // const generator =
    //   this.generators[
    //     this.generatorSelector({
    //       topLeft,
    //       topRight,
    //       bottomLeft,
    //       bottomRight,
    //       vertexIndex: props.vertexIndex,
    //     })
    //   ];
    // center = generator.call(this, center, {
    //   topLeft,
    //   topRight,
    //   bottomLeft,
    //   bottomRight,
    // }, simplex.noise2D(center.x + 10, center.z + 10)); // Offset since simplex noise is always 0 at 0, 0
    const baseVertex = vertexGenerator(recursions);
    const newVertices = [
        // Top left square
        { pos: [center.x, center.y, center.z], ...baseVertex.next().value },
        {
            pos: [topLeft.pos[0], (topLeft.pos[1] + bottomLeft.pos[1]) / 2, center.z],
            ...baseVertex.next().value,
        },
        {
            pos: [center.x, (topLeft.pos[1] + topRight.pos[1]) / 2, topLeft.pos[2]],
            ...baseVertex.next().value,
        },
        {
            pos: [center.x, (topLeft.pos[1] + topRight.pos[1]) / 2, topLeft.pos[2]],
            ...baseVertex.next().value,
        },
        {
            pos: [topLeft.pos[0], (topLeft.pos[1] + bottomLeft.pos[1]) / 2, center.z],
            ...baseVertex.next().value,
        },
        { ...topLeft, ...baseVertex.next().value },
        // Top right square
        {
            pos: [
                topRight.pos[0],
                (topRight.pos[1] + bottomRight.pos[1]) / 2,
                center.z,
            ],
            ...baseVertex.next().value,
        },
        { pos: [center.x, center.y, center.z], ...baseVertex.next().value },
        { ...topRight, ...baseVertex.next().value },
        { ...topRight, ...baseVertex.next().value },
        { pos: [center.x, center.y, center.z], ...baseVertex.next().value },
        {
            pos: [center.x, (topLeft.pos[1] + topRight.pos[1]) / 2, topRight.pos[2]],
            ...baseVertex.next().value,
        },
        // Bottom left square
        {
            pos: [
                center.x,
                (bottomLeft.pos[1] + bottomRight.pos[1]) / 2,
                bottomLeft.pos[2],
            ],
            ...baseVertex.next().value,
        },
        { ...bottomLeft, ...baseVertex.next().value },
        { pos: [center.x, center.y, center.z], ...baseVertex.next().value },
        { pos: [center.x, center.y, center.z], ...baseVertex.next().value },
        { ...bottomLeft, ...baseVertex.next().value },
        {
            pos: [topLeft.pos[0], (topLeft.pos[1] + bottomLeft.pos[1]) / 2, center.z],
            ...baseVertex.next().value,
        },
        // Bottom right square
        { ...bottomRight, ...baseVertex.next().value },
        {
            pos: [
                center.x,
                (bottomLeft.pos[1] + bottomRight.pos[1]) / 2,
                bottomLeft.pos[2],
            ],
            ...baseVertex.next().value,
        },
        {
            pos: [
                topRight.pos[0],
                (topRight.pos[1] + bottomRight.pos[1]) / 2,
                center.z,
            ],
            ...baseVertex.next().value,
        },
        {
            pos: [
                topRight.pos[0],
                (topRight.pos[1] + bottomRight.pos[1]) / 2,
                center.z,
            ],
            ...baseVertex.next().value,
        },
        {
            pos: [
                center.x,
                (bottomLeft.pos[1] + bottomRight.pos[1]) / 2,
                bottomLeft.pos[2],
            ],
            ...baseVertex.next().value,
        },
        { pos: [center.x, center.y, center.z], ...baseVertex.next().value },
    ];
    const generator = this.generators[this.generatorSelector({
        topLeft,
        topRight,
        bottomLeft,
        bottomRight,
        vertexIndex: props.vertexIndex,
    })];
    center = generator.call(this, newVertices, newVertices.map(v => simplex.noise2D(v.pos[0], v.pos[2])));
    return newVertices;
}
function bilinearInterpolation(props) {
    /**
     * Get bilinear interpolated y-value using weighted mean method.
     * Calculate distances from each point and normalize to get weights.
     * Return weighted average.
     */
    const { p1, p2, p3, p4, isCentroid = true } = props;
    if (isCentroid) {
        // We expect to always do the bilinear interpolation for the centroid.
        // This means the weights will all be 0.25 - no need for expensive distance calculations
        const x = (p1.pos[0] + p2.pos[0] + p3.pos[0] + p4.pos[0]) / 4;
        const y = (p1.pos[1] + p2.pos[1] + p3.pos[1] + p4.pos[1]) / 4;
        const z = (p1.pos[2] + p2.pos[2] + p3.pos[2] + p4.pos[2]) / 4;
        return { x, y, z };
    }
    else {
        throw new Error("Oops, someone had better implement non-centroid bilinear interpolation");
    }
}
const vertexGenerator = function* (recursions) {
    while (1) {
        yield { norm: [0, 1, 0], uv: [0, 1], recursions };
        yield { norm: [0, 1, 0], uv: [1, 1], recursions };
        yield { norm: [0, 1, 0], uv: [0, 0], recursions };
        yield { norm: [0, 1, 0], uv: [0, 0], recursions };
        yield { norm: [0, 1, 0], uv: [1, 1], recursions };
        yield { norm: [0, 1, 0], uv: [1, 0], recursions };
    }
};
