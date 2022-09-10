import { Vector3} from 'three'
import { IVertex } from "./interfaces";
// @ts-ignore
import { SimplexNoise } from 'simplex-noise-esm'

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
  (center: IPoint, corners: ICorners, randomNumber: number) => {
    const maxDisplacement = (corners.topRight.pos[0] - corners.topLeft.pos[0]) / 2
    return {
      x: center.x,
      y: center.y + randomNumber * maxDisplacement,
      z: center.z
    }
  }
]

export function orthogonalDisplacer (center: IPoint, corners: ICorners) {
  let normalVector = new Vector3()
  let crossVector = new Vector3()
  /**
   * Compute normal vector by taking the cross product of the 
   * vectors from the center to the bottom right corner and the top right corner.
   * Modify the magnitude of this vector randomly.
   **/
  normalVector.set(
    corners.bottomRight.pos[0] - center.x,
    corners.bottomRight.pos[1] - center.y, 
    corners.bottomRight.pos[2] - center.z
  )
  crossVector.set(
    corners.topRight.pos[0] - center.x,
    corners.topRight.pos[1] - center.y, 
    corners.topRight.pos[2] - center.z
  )
  normalVector.cross(crossVector).normalize()
  
  const maxDisplacement = (corners.topRight.pos[0] - corners.topLeft.pos[0]) / 1.2
  const scalingFactor = Math.random() * maxDisplacement - 3 * maxDisplacement / 4

  normalVector.multiplyScalar(scalingFactor)
  
  return {
    x: center.x + normalVector.x,
    y: center.y + normalVector.y,
    z: center.z + normalVector.z
  }
}
 