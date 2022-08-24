import { IVertex } from "./Terrainosaurus";

export function defaultGeneratorSelector() {
  return Math.floor(Math.random() * this.generators.length)
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
  (center: IPoint, corners: ICorners) => {
    const maxDisplacement = (corners.topRight.pos[0] - corners.topLeft.pos[0]) / 1.2
    return {
      x: center.x,
      y: center.y + Math.random() * maxDisplacement - maxDisplacement / 2,
      z: center.z
    }
  }
]