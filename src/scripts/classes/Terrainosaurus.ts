import { BufferGeometry, Float32BufferAttribute } from "three";

export interface ITerrainosaurusProps {
  size: number;
  lowDetailRecursions: number;
  highDetailRecursions: number;
  seed: any;
}

export interface IVertex {
  pos: Array<number>;
  norm: Array<number>;
  uv: Array<number>;
  color?: Array<number>;
  recursions: number;
}

export class Terrainosaurus {
  size: number;
  offset: number;
  lowDetailRecursions: number;
  highDetailRecursions: number;
  vertices: Array<IVertex>;
  indices: Array<number>;
  constructor(props: ITerrainosaurusProps) {
    this.vertices = [];
    this.indices = [];
    this.size = props.size;
    this.offset = props.size / 2;
    this.setInitialVertices(this.offset)
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
    console.log("created initial vertices", this.vertices)
  }
  recursivelyGenerate(vertexIndex: number) {
    /**
     * Replaces a given square with 4 smaller squares.
     * Each square is represented by 6 vertices, so we can get a slice from the vertices array, create a new one, and insert it.
     */
    if (vertexIndex % 6) {
      throw new Error("The given vertex does not represent the start of a cell")
    }
    if (!this.vertices[vertexIndex]) {
      console.warn(`Skipping recursion: Index ${vertexIndex + 6} exceeds bounds (${this.vertices.length})`)
      return
    }
    const verticesToReplace = this.vertices.slice(vertexIndex, vertexIndex + 6)
    const recursions = this.vertices[vertexIndex].recursions
    // Get 4 corners of the square to compute the centroid.
    let replacementVertices = getSubSquares({ vertices: verticesToReplace, recursions })
    
    this.vertices.splice(vertexIndex, 6, ...replacementVertices)
  }
  createGeometry() {
    // When called, generates a BufferGeometry out of the current vertices
    const geometry = new BufferGeometry();
    const positionNumComponents = 3;
    const normalNumComponents = 3;
    const uvNumComponents = 2;
    // Get vertex data in nice parallel arrays
    const { positions, normals, uvs } = this.vertices.reduce(
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
    console.log("in createGeometry", { positions, normals, uvs })
    // Use parallel arrays to create BufferGeometry
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(positions), positionNumComponents)
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

interface IGetSquareProps {
  vertices: Array<IVertex>
  recursions: number
}

/**
 * 
 * @param props The set of vertices that need to be replaced
 * @returns An array of vertices that represent 4 squares that cover the same area as the original vertices
 */
function getSubSquares(props: IGetSquareProps): Array<IVertex> {
  const { recursions } = props
  const [bottomRight, bottomLeft, topRight, _, __, topLeft] = props.vertices

  const center = bilinearInterpolation({
    p1: bottomRight,
    p2: bottomLeft,
    p3: topRight,
    p4: topLeft
  })

  const maxDisplacement = (bottomRight.pos[0] - bottomLeft.pos[0]) / 1.5
  center.y += Math.random() * maxDisplacement - maxDisplacement / 2
  
  const baseVertex = { norm: [0,1,0], uv: [0,1], recursions }
  const newVertices = [
    // Top left square
    { pos: [center.x, center.y, center.z], ...baseVertex },
    { pos: [topLeft.pos[0], (topLeft.pos[1] + bottomLeft.pos[1]) / 2, center.z], ...baseVertex },
    { pos: [center.x, (topLeft.pos[1] + topRight.pos[1]) / 2, topLeft.pos[2]], ...baseVertex },

    { pos: [center.x, (topLeft.pos[1] + topRight.pos[1]) / 2, topLeft.pos[2]], ...baseVertex },
    { pos: [topLeft.pos[0], (topLeft.pos[1] + bottomLeft.pos[1]) / 2, center.z], ...baseVertex },
    topLeft,
    
    // Top right square
    { pos: [topRight.pos[0], (topRight.pos[1] + bottomRight.pos[1]) / 2, center.z], ...baseVertex },
    { pos: [center.x, center.y, center.z], ...baseVertex },
    topRight,

    topRight,
    { pos: [center.x, center.y, center.z], ...baseVertex },
    { pos: [center.x, (topLeft.pos[1] + topRight.pos[1]) / 2, topRight.pos[2]], ...baseVertex },


    // Bottom left square
    { pos: [center.x, (bottomLeft.pos[1] + bottomRight.pos[1]) / 2, bottomLeft.pos[2]], ...baseVertex },
    bottomLeft,
    { pos: [center.x, center.y, center.z], ...baseVertex },

    { pos: [center.x, center.y, center.z], ...baseVertex },
    bottomLeft,
    { pos: [topLeft.pos[0], (topLeft.pos[1] + bottomLeft.pos[1]) / 2, center.z], ...baseVertex },


    // Bottom right square
    bottomRight,
    { pos: [center.x, (bottomLeft.pos[1] + bottomRight.pos[1]) / 2, bottomLeft.pos[2]], ...baseVertex },
    { pos: [topRight.pos[0], (topRight.pos[1] + bottomRight.pos[1]) / 2, center.z], ...baseVertex },
    
    { pos: [topRight.pos[0], (topRight.pos[1] + bottomRight.pos[1]) / 2, center.z], ...baseVertex },
    { pos: [center.x, (bottomLeft.pos[1] + bottomRight.pos[1]) / 2, bottomLeft.pos[2]], ...baseVertex },
    { pos: [center.x, center.y, center.z], ...baseVertex },
  ]

  return newVertices
}

function getSquare(topLeft: IVertex, size: number, recursions: number): Array<IVertex> {
  const baseVertex = { norm: [0,1,0], uv: [0,1], recursions: recursions + 1 }
  return [
    { pos: [], ...baseVertex } // bottom right
  ]
}

interface IBilinearInterpolationProps {
  p1: IVertex;
  p2: IVertex;
  p3: IVertex;
  p4: IVertex;
  isCentroid?: boolean
}
function bilinearInterpolation(props: IBilinearInterpolationProps): { x: number, y: number, z: number } {
  /** 
   * Get bilinear interpolated y-value using weighted mean method.
   * Calculate distances from each point and normalize to get weights.
   * Return weighted average.
   */
  const {p1, p2, p3, p4, isCentroid = true} = props
  if (isCentroid) {
    // We expect to always do the bilinear interpolation for the centroid.
    // This means the weights will all be 0.25 - no need for expensive distance calculations
    const x = (p1.pos[0] + p2.pos[0] + p3.pos[0] + p4.pos[0]) / 4
    const y = (p1.pos[1] + p2.pos[1] + p3.pos[1] + p4.pos[1]) / 4
    const z = (p1.pos[2] + p2.pos[2] + p3.pos[2] + p4.pos[2]) / 4
    return { x, y, z }
  } else {
    throw new Error("Oops, someone had better implement non-centroid bilinear interpolation")
  }
}