import { BufferGeometry, Float32BufferAttribute } from "three";
import { defaultGenerators, defaultGeneratorSelector } from "./generators";

const VERTICES_PER_SQUARE = 6; // This will change to 4 if/when we do some memory optimizations

export interface ITerrainosaurusProps {
  size: number;
  lowDetailRecursions: number;
  highDetailRecursions: number;
  seed: any;
  generators?: Array<(args: any) => any>;
  generatorSelector?: (args: any) => number;
}

export interface ISection {
  vertices: Array<IVertex>;
  absoluteIndex: number;
}

export interface IVertex {
  pos: Array<number>;
  norm: Array<number>;
  uv: Array<number>;
  color?: Array<number>;
  recursions: number;
}

interface IGetSquareProps {
  vertices: Array<IVertex>;
  recursions: number;
}

export class Terrainosaurus {
  size: number;
  offset: number;
  lowDetailRecursions: number;
  highDetailRecursions: number;
  vertices: Array<IVertex>;
  indices: Array<number>;
  generators: Array<(args: any) => any>;
  generatorSelector: (args: any) => number;
  constructor(props: ITerrainosaurusProps) {
    this.vertices = [];
    this.indices = [];
    this.size = props.size;
    this.offset = props.size / 2;
    this.generatorSelector = props.generatorSelector || defaultGeneratorSelector;
    this.generators = props.generators || defaultGenerators;
    this.setInitialVertices(this.offset);
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
    });

    this.vertices.splice(
      vertexIndex,
      VERTICES_PER_SQUARE,
      ...replacementVertices
    );
  }
  getSection(path: Array<1 | 2 | 3 | 4>, section?: ISection): ISection {
    section = section || { vertices: this.vertices, absoluteIndex: 0 };
    return path.reduce((acc, quadrant: number, level) => {
      const q1Index = 0; // Top left
      const q2Index =
        Math.pow(acc.vertices[0].recursions - level, 2) * VERTICES_PER_SQUARE; // Top right
      const q3Index =
        q2Index +
        Math.pow(acc.vertices[q2Index].recursions - level, 2) *
          VERTICES_PER_SQUARE; // Bottom left
      const q4Index =
        q3Index +
        Math.pow(acc.vertices[q3Index].recursions - level, 2) *
          VERTICES_PER_SQUARE; // Bottom left
      const endIndex =
        q4Index +
        Math.pow(acc.vertices[q3Index].recursions - level, 2) *
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
    const { recursions} = props;
    const [bottomRight, bottomLeft, topRight, _, __, topLeft] = props.vertices;

    let center = bilinearInterpolation({
      p1: bottomRight,
      p2: bottomLeft,
      p3: topRight,
      p4: topLeft,
    });

    const generator = this.generators[this.generatorSelector({ topLeft, topRight, bottomLeft, bottomRight })]
    center = generator.call(this, center, { topLeft, topRight, bottomLeft, bottomRight });

    const baseVertex = { norm: [0, 1, 0], uv: [0, 1], recursions };
    const newVertices = [
      // Top left square
      { pos: [center.x, center.y, center.z], ...baseVertex },
      {
        pos: [
          topLeft.pos[0],
          (topLeft.pos[1] + bottomLeft.pos[1]) / 2,
          center.z,
        ],
        ...baseVertex,
      },
      {
        pos: [center.x, (topLeft.pos[1] + topRight.pos[1]) / 2, topLeft.pos[2]],
        ...baseVertex,
      },

      {
        pos: [center.x, (topLeft.pos[1] + topRight.pos[1]) / 2, topLeft.pos[2]],
        ...baseVertex,
      },
      {
        pos: [
          topLeft.pos[0],
          (topLeft.pos[1] + bottomLeft.pos[1]) / 2,
          center.z,
        ],
        ...baseVertex,
      },
      topLeft,

      // Top right square
      {
        pos: [
          topRight.pos[0],
          (topRight.pos[1] + bottomRight.pos[1]) / 2,
          center.z,
        ],
        ...baseVertex,
      },
      { pos: [center.x, center.y, center.z], ...baseVertex },
      topRight,

      topRight,
      { pos: [center.x, center.y, center.z], ...baseVertex },
      {
        pos: [
          center.x,
          (topLeft.pos[1] + topRight.pos[1]) / 2,
          topRight.pos[2],
        ],
        ...baseVertex,
      },

      // Bottom left square
      {
        pos: [
          center.x,
          (bottomLeft.pos[1] + bottomRight.pos[1]) / 2,
          bottomLeft.pos[2],
        ],
        ...baseVertex,
      },
      bottomLeft,
      { pos: [center.x, center.y, center.z], ...baseVertex },

      { pos: [center.x, center.y, center.z], ...baseVertex },
      bottomLeft,
      {
        pos: [
          topLeft.pos[0],
          (topLeft.pos[1] + bottomLeft.pos[1]) / 2,
          center.z,
        ],
        ...baseVertex,
      },

      // Bottom right square
      bottomRight,
      {
        pos: [
          center.x,
          (bottomLeft.pos[1] + bottomRight.pos[1]) / 2,
          bottomLeft.pos[2],
        ],
        ...baseVertex,
      },
      {
        pos: [
          topRight.pos[0],
          (topRight.pos[1] + bottomRight.pos[1]) / 2,
          center.z,
        ],
        ...baseVertex,
      },

      {
        pos: [
          topRight.pos[0],
          (topRight.pos[1] + bottomRight.pos[1]) / 2,
          center.z,
        ],
        ...baseVertex,
      },
      {
        pos: [
          center.x,
          (bottomLeft.pos[1] + bottomRight.pos[1]) / 2,
          bottomLeft.pos[2],
        ],
        ...baseVertex,
      },
      { pos: [center.x, center.y, center.z], ...baseVertex },
    ];

    return newVertices;
  }
  createGeometry(section: Array<IVertex> = this.vertices) {
    // When called, generates a BufferGeometry out of the current vertices
    const geometry = new BufferGeometry();
    const positionNumComponents = 3;
    const normalNumComponents = 3;
    const uvNumComponents = 2;
    // Get vertex data in nice parallel arrays
    const { positions, normals, uvs } = section.reduce(
      (acc: any, vertex) => {
        acc.positions = acc.positions.concat(vertex.pos);
        acc.normals = acc.normals.concat(vertex.norm);
        acc.uvs = acc.uvs.concat(vertex.uv);
        if (vertex.color) {
          acc.color = acc.color.concat(vertex.color);
        }
        return acc;
      },
      { positions: [], normals: [], uvs: [], color: [] }
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
