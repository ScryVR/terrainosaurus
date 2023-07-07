// @ts-ignore
import "https://unpkg.com/three@0.144.0/build/three.min.js";
// @ts-ignore
import { SimplexNoise } from "https://unpkg.com/simplex-noise-esm@2.5.0-esm.0/dist-esm/simplex-noise.js";

let simplex: SimplexNoise | null = null;

const VERTICES_PER_SQUARE = 6;

self.addEventListener("message", ({ data }) => {
  if (data.action === "recurseSection") {
    const context = {
      colors: data.colors,
      waterLevel: data.waterLevel,
      vertices: data.section.vertices,
      genParams: data.genParams,
      generators: data.generators.map((f: string) => reconstructFunction(f)),
      generatorSelector: reconstructFunction(data.generatorSelector),
      // @ts-ignore
      THREE,
    };
    if (!simplex) {
      simplex = new SimplexNoise(data.seed || Math.random().toString());
    }
    const levels = data.levels || 1;
    recurseSection.call(context, data.section, levels);
    postMessage({
      vertices: context.vertices,
    });
  }
});

function reconstructFunction(functionString: string) {
  functionString = functionString.replace(
    /\S*__WEBPACK_IMPORTED_MODULE_\d+__./g,
    ""
  );
  // Some silliness to account for how webpack makes all functions single-line. Just go with it for now.
  functionString = functionString.replace("){", "){\n");
  functionString = functionString.replace(/}$/g, "\n}");
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

function getSubSquares(props: any) {
  const { recursions } = props;
  const [bottomRight, bottomLeft, topRight, _, __, topLeft] = props.vertices;

  let center = bilinearInterpolation({
    p1: bottomRight,
    p2: bottomLeft,
    p3: topRight,
    p4: topLeft,
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
  const compositeNoise = (v: any) => {
    const sampleNoise = (scale: number, offset: number = 0) => {
      const noise = simplex.noise2D(
        v.pos[0] / scale + offset,
        v.pos[2] / scale + offset
      );
      return noise
    };

    const spline = (input: number, slope: number, bounds = 1) => {
      return Math.min(bounds, Math.max(-bounds, Math.atan(input) / slope));
    };

    
    const continentNoise =
    spline(
      sampleNoise(this.genParams.islandSize, 100),
      this.genParams.landmassSlope
      );
      
    const plateauNoise = this.genParams.maxHeight * sampleNoise(this.genParams.maxHeight * 20, 200)

    const rockyNoise = 0.2 * sampleNoise(this.genParams.smoothness, 100) * sampleNoise(this.genParams.smoothness * 5, 300)

    return continentNoise * plateauNoise + this.genParams.elevation + rockyNoise;
  };
  center = generator.call(this, newVertices, newVertices.map(compositeNoise));
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
