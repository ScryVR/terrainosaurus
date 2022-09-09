// TODO: Figure out how to do proper module imports in a web worker. This works for now, but it's messy
// // @ts-ignore
// import { BufferGeometry, Float32BufferAttribute } from "https://unpkg.com/three@0.144.0/build/three.min.js";
// // @ts-ignore
// import { SimplexNoise } from "https://unpkg.com/simplex-noise-esm@2.5.0-esm.0/dist-esm/simplex-noise.js";

// @ts-ignore
import "https://unpkg.com/three@0.144.0/build/three.min.js";
// @ts-ignore
import { SimplexNoise } from "https://unpkg.com/simplex-noise-esm@2.5.0-esm.0/dist-esm/simplex-noise.js";

// @ts-ignore
const { BufferGeometry, Float32BufferAttribute } = THREE

const simplex = new SimplexNoise("seed")

const VERTICES_PER_SQUARE = 6;

addEventListener("message", ({ data }) => {
  if (data.action === "recurseSection") {
    const context = {
      state: { simplex },
      vertices: data.section.vertices,
      generators: data.generators.map((f: string) => reconstructFunction(f)),
      generatorSelector: reconstructFunction(data.generatorSelector),
    };
    const levels = data.levels || 1;
    recurseSection.call(context, data.section, levels);
    postMessage({
      vertices: context.vertices,
      geometry: createGeometry(context.vertices),
    });
  }
});

function reconstructFunction(functionString: string) {
  // console.log("Before reconstruction", functionString)
  functionString = functionString.replace(
    /\S*__WEBPACK_IMPORTED_MODULE_\d+__./g,
    ""
  );
  // console.log("After reconstruction", functionString)
  let functionCode: string[] | string = functionString.split("\n");
  functionCode.pop();
  let functionSignature = functionCode.shift();
  functionCode = functionCode.join("\n");
  let args: string[] | string = functionSignature.match(/\([^)]*\)/)[0];
  args = args.replace("(", "").replace(")", "").split(",");
  return Function(...args, functionCode);
}

// TODO: Fix code duplication with Terrainosaurus by importing these functions from a single place

function recurseSection({ vertices, absoluteIndex }: any, levels = 1) {
  for (let level = 0; level < levels; level++) {
    // Adds one level of recursion across the entire terrain map
    for (let i = vertices.length - 6; i > -1; i -= 6) {
      recursivelyGenerate.call(this, i + absoluteIndex);
    }
  }
}

function recursivelyGenerate(vertexIndex: number) {
  /**
   * Replaces a given square with 4 smaller squares.
   * Each square is represented by 6 vertices, so we can get a slice from the vertices array, create a new one, and insert it.
   */
  if (vertexIndex % VERTICES_PER_SQUARE) {
    throw new Error("The given vertex does not represent the start of a cell");
  }
  if (!this.vertices[vertexIndex]) {
    console.warn(
      `Skipping recursion: Index ${vertexIndex} exceeds bounds (${this.vertices.length})`
    );
    return;
  }
  const verticesToReplace = this.vertices.slice(
    vertexIndex,
    vertexIndex + VERTICES_PER_SQUARE
  );
  const recursions = this.vertices[vertexIndex].recursions + 1;
  // Get 4 corners of the square to compute the centroid.
  let replacementVertices = getSubSquares.call(this, {
    vertices: verticesToReplace,
    recursions,
    vertexIndex,
  });

  this.vertices.splice(
    vertexIndex,
    VERTICES_PER_SQUARE,
    ...replacementVertices
  );
}

function createGeometry(section = this.vertices) {
  // When called, generates a BufferGeometry out of the current vertices
  const geometry = new BufferGeometry();
  const positionNumComponents = 3;
  const normalNumComponents = 3;
  const uvNumComponents = 2;
  const colorNumComponents = 3;
  // Get vertex data in nice parallel arrays
  const { positions, normals, uvs, colors } = section.reduce(
    (acc: Record<string, any>, vertex: any) => {
      acc.positions = acc.positions.concat(vertex.pos);
      acc.normals = acc.normals.concat(vertex.norm);
      acc.uvs = acc.uvs.concat(vertex.uv);
      return acc;
    },
    { positions: [], normals: [], uvs: [], colors: [] }
  );
  // Use parallel arrays to create BufferGeometry
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      new Float32Array(positions),
      positionNumComponents
    )
  );
  geometry.setAttribute(
    "normal",
    new Float32BufferAttribute(new Float32Array(normals), normalNumComponents)
  );
  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute(new Float32Array(uvs), uvNumComponents)
  );
  geometry.setAttribute(
    "color",
    new Float32BufferAttribute(new Float32Array(colors), colorNumComponents)
  );
  // geometry.setIndex(this.indices);
  geometry.computeBoundingSphere();
  geometry.computeVertexNormals();
  return geometry;
}

function getSubSquares(props: any) {
  const { recursions } = props;
  const [bottomRight, bottomLeft, topRight, _, __, topLeft] = props.vertices;

  let center = bilinearInterpolation({
    p1: bottomRight,
    p2: bottomLeft,
    p3: topRight,
    p4: topLeft,
  });

  const generator =
    this.generators[
      this.generatorSelector({
        topLeft,
        topRight,
        bottomLeft,
        bottomRight,
        vertexIndex: props.vertexIndex,
      })
    ];
  center = generator.call(this, center, {
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
  });

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
  return newVertices;
}

function bilinearInterpolation(props: any) {
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
  } else {
    throw new Error(
      "Oops, someone had better implement non-centroid bilinear interpolation"
    );
  }
}

const vertexGenerator = function* (recursions: number) {
  while (1) {
    yield { norm: [0, 1, 0], uv: [0, 1], recursions };
    yield { norm: [0, 1, 0], uv: [1, 1], recursions };
    yield { norm: [0, 1, 0], uv: [0, 0], recursions };

    yield { norm: [0, 1, 0], uv: [0, 0], recursions };
    yield { norm: [0, 1, 0], uv: [1, 1], recursions };
    yield { norm: [0, 1, 0], uv: [1, 0], recursions };
  }
};
