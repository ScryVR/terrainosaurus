import { BufferGeometry, BufferAttribute } from "three";

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
  }
  setInitialVertices(offset: number) {
    // Initialize such that we can use diamond-square displacement
    // TODO: Remove the duplicate vertices and update the indices instead
    this.vertices = this.vertices
      .concat([
        { pos: [1, -1, 1], norm: [0, -1, 0], uv: [0, 1] },
        { pos: [-1, -1, 1], norm: [0, -1, 0], uv: [1, 1] },
        { pos: [1, -1, -1], norm: [0, -1, 0], uv: [0, 0] },

        { pos: [1, -1, -1], norm: [0, -1, 0], uv: [0, 0] },
        { pos: [-1, -1, 1], norm: [0, -1, 0], uv: [1, 1] },
        { pos: [-1, -1, -1], norm: [0, -1, 0], uv: [1, 0] },
      ])
      // This is technically less performant, but it's easier to visualize the plane this way.
      .map((v) => ({ pos: v.pos.map((p) => p * offset), ...v }));
  }
  recursivelyGenerate() {
    // Add new interstitial vertices using bilinear interpolation
    // Displace randomly
    // Update indices
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
    // Use parallel arrays to create BufferGeometry
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), positionNumComponents)
    );
    geometry.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array(normals), normalNumComponents)
    );
    geometry.setAttribute(
      "uv",
      new BufferAttribute(new Float32Array(uvs), uvNumComponents)
    );
    geometry.setIndex(this.indices);
    return geometry;
  }
}
