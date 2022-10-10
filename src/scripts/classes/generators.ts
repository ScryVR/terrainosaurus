import { Vector3 } from "three";
import { IVertex } from "./interfaces";

export function defaultGeneratorSelector(props: any) {
  if (this.state.isDigging) {
    return 1; // Hole digger
  }
  return 0; // Diamond-square displacer
}

export interface IPoint {
  x: number;
  y: number;
  z: number;
}

export interface ICorners {
  topLeft: IVertex;
  topRight: IVertex;
  bottomLeft: IVertex;
  bottomRight: IVertex;
}

export const defaultGenerators: Array<(...args: any) => any> = [
  function (vertices, randomValues) {
    const VERTEX_INDICES = {
      CENTER: [0, 7, 10, 14, 15, 23],
      TOP_MIDDLE: [2, 3, 11],
      BOTTOM_MIDDLE: [12, 19, 22],
      LEFT_MIDDLE: [1, 4, 17],
      RIGHT_MIDDLE: [6, 20, 21],
    };
    const squareSize = vertices[1].pos[0] - vertices[0].pos[0];
    Object.values(VERTEX_INDICES).forEach((indices) => {
      const displacement =
        (randomValues[indices[0]] * squareSize) /
        Math.pow(vertices[0].recursions + 1, 0.7);
      indices.forEach((index) => (vertices[index].pos[1] += displacement * 0));
    });
    return vertices;
  },
  function (vertices, randomValues) {
    if (
      this.state.center &&
      !(this.state.center instanceof this.THREE.Vector3)
    ) {
      this.state.center = new this.THREE.Vector3(
        this.state.center[0],
        this.state.center[1],
        this.state.center[2]
      );
      return;
    }
    const point = new this.THREE.Vector3();
    const { center, radius } = this.state;
    vertices.forEach((v: IVertex) => {
      point.set(v.pos[0], v.pos[1], v.pos[2]);
      if (point.distanceTo(center) <= radius) {
        const xDisplacement = Math.sqrt(
          Math.abs(
            radius ** 2 -
              (v.pos[1] - center.y) ** 2 -
              (v.pos[2] - center.z) ** 2
          )
        );
        const yDisplacement = Math.sqrt(
          Math.abs(
            radius ** 2 -
              (v.pos[0] - center.x) ** 2 -
              (v.pos[2] - center.z) ** 2
          )
        );
        const zDisplacement = Math.sqrt(
          Math.abs(
            radius ** 2 -
              (v.pos[0] - center.x) ** 2 -
              (v.pos[1] - center.y) ** 2
          )
        );
        const centerModifiable = new this.THREE.Vector3(
          center.x - xDisplacement,
          center.y - yDisplacement,
          center.z - zDisplacement
        );
        point.sub(centerModifiable);
        centerModifiable.normalize().multiplyScalar(radius);
        
        // if (v.pos[0] < center.x) {
        //   v.pos[0] -= point.x;
        // } else {
        //   v.pos[0] += point.x;
        // }

        // if (v.pos[1] < center.y) {
          v.pos[1] -= point.y;
        // } else {
        //   v.pos[1] += point.y;
        // }

        // if (v.pos[2] < center.z) {
        //   v.pos[2] -= point.z;
        // } else {
        //   v.pos[2] += point.z;
        // }

        v.color = [0.8, 0.2, 0.2];
      } else {
        v.color = [0.4, 0.8, 0.2];
      }
    });
    return vertices;
  },
];
