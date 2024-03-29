import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { defaultGenerators, defaultGeneratorSelector } from "./generators";
// @ts-ignore
import { SimplexNoise } from "simplex-noise-esm";
import {
  IVertex,
  ITerrainosaurusProps,
  ISection,
  IGetSquareProps,
} from "./interfaces";

const VERTICES_PER_SQUARE = 6; // This will change to 4 if/when we do some memory optimizations

export class Terrainosaurus {
  size: number;
  seed: string;
  offset: number;
  vertices: Array<IVertex>;
  transformedVertices: Array<IVertex>;
  indices: Array<number>;
  state: any;
  colors?: Record<string, Array<number>>;
  waterLevel?: number;
  generators: Array<(args: any) => any>;
  generatorSelector: (...args: any) => number;
  vertexWorker?: Worker;
  vertexWorkerUrl?: string | URL;
  genParams: Record<string, number>;

  constructor(props: ITerrainosaurusProps) {
    this.vertices = [];
    this.transformedVertices = [];
    this.state = props.state || {};
    this.indices = [];
    this.size = props.size;
    this.offset = props.size / 2;
    this.generatorSelector =
      props.generatorSelector || defaultGeneratorSelector;
    this.generators = props.generators || defaultGenerators;
    this.vertexWorkerUrl = props.vertexWorkerUrl;
    this.seed = props.seed;
    this.setGenerationParameters();
    this.colors = props.colors;
    this.waterLevel = props.waterLevel;
    this.state.simplex = new SimplexNoise(this.seed);
    this.setInitialVertices(this.offset);
  }

  setGenerationParameters() {
    // Sets island size, landmass slope, max landmass height, and smoothness
    if (!this.seed) {
      this.seed = Math.random().toString().replace("0.", "");
    }
    let paramSeed = this.seed.toString().replace(/[a-z]/g, "");
    while (paramSeed.length < 10) {
      paramSeed += paramSeed;
    }
    this.genParams = {
      islandSize: Number(`${paramSeed[0]}`) * 6 + 5 || 10,
      landmassSlope: Number(`${paramSeed[1]}`) * 4 + 50 || 25,
      maxHeight: Number(`${paramSeed[2]}`) / 15 || 0.2,
      smoothness: (Number(`${paramSeed[3]}`) + 1) * 0.2 || 1,
      plateauFactor: Number(`${paramSeed[4]}`) * 6 + 5 || 10,
      noiseSampleCoeff: 3
      // noiseSampleCoeff: Math.ceil(Number(`${paramSeed[5]}`) / 4) + 1 || 3,
    };
  }

  setInitialVertices(offset: number) {
    // Initialize such that we can use diamond-square displacement
    // TODO: Remove the duplicate vertices and update the indices instead
    this.vertices = this.vertices
      .concat([
        { pos: [1, 0, 1], norm: [0, 1, 0], uv: [0, 1], recursions: 0 }, // bottom right
        { pos: [-1, 0, 1], norm: [0, 1, 0], uv: [1, 1], recursions: 0 }, // bottom left
        { pos: [1, 0, -1], norm: [0, 1, 0], uv: [0, 0], recursions: 0 }, // top right

        { pos: [1, 0, -1], norm: [0, 1, 0], uv: [0, 0], recursions: 0 }, // top right
        { pos: [-1, 0, 1], norm: [0, 1, 0], uv: [1, 1], recursions: 0 }, // bottom left
        { pos: [-1, 0, -1], norm: [0, 1, 0], uv: [1, 0], recursions: 0 }, // top left
      ])
      // This is technically less performant, but it's easier to visualize the plane this way.
      .map((v) => ({ ...v, pos: v.pos.map((p) => p * offset) }));
  }
  recurseFullMap(levels = 1) {
    for (let level = 0; level < levels; level++) {
      // Adds one level of recursion across the entire terrain map
      for (let i = this.vertices.length - 6; i > -1; i -= 6) {
        this.recursivelyGenerate(i);
      }
    }
  }
  recurseSection({ vertices, absoluteIndex }: ISection, levels: number = 1) {
    for (let level = 0; level < levels; level++) {
      // Adds one level of recursion across the entire terrain map
      for (let i = vertices.length - 6; i > -1; i -= 6) {
        this.recursivelyGenerate(i + absoluteIndex);
      }
    }
  }
  async recurseSectionInBackground(section: ISection, levels: number = 1) {
    if (typeof Worker === undefined) {
      throw new Error(
        "Unable to initialize Web Workers in the current context"
      );
    }
    return new Promise((resolve, reject) => {
      if (!this.vertexWorkerUrl) {
        reject(
          "Cannot recurse in background - vertexWorkerUrl not provided in constructor"
        );
      }
      this.vertexWorker = new Worker(this.vertexWorkerUrl, { type: "module" });
      const spliceParams = {
        start: section.absoluteIndex,
        end: section.vertices.length,
      };
      this.vertexWorker.onmessage = (event) => {
        if (event.data.vertices) {
          this.vertices.splice(
            spliceParams.start,
            spliceParams.end,
            ...event.data.vertices
          );
        }
        resolve(true);
      };
      this.vertexWorker.postMessage({
        action: "recurseSection",
        seed: this.seed,
        colors: this.colors,
        waterLevel: this.waterLevel,
        section: { vertices: section.vertices, absoluteIndex: 0 },
        generatorSelector: this.generatorSelector.toString(),
        generators: this.generators.map((gen) => gen.toString()),
        genParams: this.genParams,
        levels,
      });
    });
  }

  recursivelyGenerate(vertexIndex: number) {
    /**
     * Replaces a given square with 4 smaller squares.
     * Each square is represented by 6 vertices, so we can get a slice from the vertices array, create a new one, and insert it.
     */
    if (vertexIndex % VERTICES_PER_SQUARE) {
      throw new Error(
        "The given vertex does not represent the start of a cell"
      );
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
    let replacementVertices = this.getSubSquares({
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
  getSection(path: Array<1 | 2 | 3 | 4>, section?: ISection): ISection {
    section = section || { vertices: this.vertices, absoluteIndex: 0 };
    return path.reduce((acc, quadrant: number, index) => {
      let level = index + 1;
      const q1Index = 0; // Top left
      const q2Index =
        Math.pow(4, acc.vertices[0].recursions - level) * VERTICES_PER_SQUARE; // Top right
      const q3Index =
        q2Index +
        Math.pow(4, acc.vertices[q2Index].recursions - level) *
          VERTICES_PER_SQUARE; // Bottom left
      const q4Index =
        q3Index +
        Math.pow(4, acc.vertices[q3Index].recursions - level) *
          VERTICES_PER_SQUARE; // Bottom left
      const endIndex =
        q4Index +
        Math.pow(4, acc.vertices[q3Index].recursions - level) *
          VERTICES_PER_SQUARE; // End of quadrant
      const quadrantIndices: Array<number> = [
        q1Index,
        q2Index,
        q3Index,
        q4Index,
        endIndex,
      ];
      // Weird step to account for the fact that the vertex rendering order doesn't match
      // conventional quadrant order in mathematics
      if (quadrant < 3) {
        quadrant = (quadrant % 2) + 1; // 1 -> 2, 2 -> 1
      }
      acc.vertices = acc.vertices.slice(
        quadrantIndices[quadrant - 1],
        quadrantIndices[quadrant]
      );
      acc.absoluteIndex += quadrantIndices[quadrant - 1];
      return acc;
    }, section);
  }
  getSubSquares(props: IGetSquareProps): Array<IVertex> {
    const { recursions } = props;
    const [bottomRight, bottomLeft, topRight, _, __, topLeft] = props.vertices;

    let center = bilinearInterpolation({
      p1: bottomRight,
      p2: bottomLeft,
      p3: topRight,
      p4: topLeft,
    });

    const baseVertex = vertexGenerator(recursions);
    const newVertices: any = [
      // Top left square
      { pos: [center.x, center.y, center.z], ...baseVertex.next().value },
      {
        pos: [
          topLeft.pos[0],
          (topLeft.pos[1] + bottomLeft.pos[1]) / 2,
          center.z,
        ],
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
        pos: [
          topLeft.pos[0],
          (topLeft.pos[1] + bottomLeft.pos[1]) / 2,
          center.z,
        ],
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
        pos: [
          center.x,
          (topLeft.pos[1] + topRight.pos[1]) / 2,
          topRight.pos[2],
        ],
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
        pos: [
          topLeft.pos[0],
          (topLeft.pos[1] + bottomLeft.pos[1]) / 2,
          center.z,
        ],
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
    generator.call(
      this,
      newVertices,
      newVertices.map((v: any) =>
        this.state.simplex.noise2D(
          v.pos[0] / this.genParams.noiseSampleCoeff,
          v.pos[2] / this.genParams.noiseSampleCoeff
        )
      )
    );
    return newVertices;
  }
  createGeometry(section: ISection = { vertices: this.vertices, absoluteIndex: 0 }, transformerFilter?: Function, transformer?: Function) {
    transformerFilter ||= () => false
    transformer ||= (v: any) => v
    // When called, generates a BufferGeometry out of the current vertices
    const geometry = new BufferGeometry();
    const positionNumComponents = 3;
    const normalNumComponents = 3;
    const uvNumComponents = 2;
    const colorNumComponents = 3;
    // Get vertex data in nice parallel arrays
    const { positions, normals, uvs, colors } = section.vertices.reduce(
      (acc: any, vertex, index) => {
        const _vertex = this.transformedVertices[index + section.absoluteIndex] || vertex
        const transformation = transformerFilter(_vertex.pos[0], _vertex.pos[1], _vertex.pos[2])
        if (transformation) {
          const transformedPos = transformer(_vertex.pos, transformation)
          this.transformedVertices[index + section.absoluteIndex] = { ..._vertex, pos: transformedPos }
          acc.positions = acc.positions.concat(transformedPos);
        } else {
          acc.positions = acc.positions.concat(_vertex.pos);
        }
        acc.normals = acc.normals.concat(vertex.norm);
        acc.uvs = acc.uvs.concat(vertex.uv);
        acc.colors = acc.colors.concat(vertex.color);
        // if (vertex.pos[1] > 3) {
        //   acc.colors = acc.colors.concat(0.6, 0.6, 0.6);
        // } else if (vertex.pos[1] < 1.2) {
        //   acc.colors = acc.colors.concat(0.8, 0.7, 0.5);
        // } else {
        //   acc.colors = acc.colors.concat(0.5, 0.9, 0.5);
        // }
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
    return geometry;
  }
}

interface IBilinearInterpolationProps {
  p1: IVertex;
  p2: IVertex;
  p3: IVertex;
  p4: IVertex;
  isCentroid?: boolean;
}
function bilinearInterpolation(props: IBilinearInterpolationProps): {
  x: number;
  y: number;
  z: number;
} {
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
