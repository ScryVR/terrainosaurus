import { Vector3} from 'three'
import { IVertex } from "./interfaces";

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
  (vertices, randomValues) => {
    const VERTEX_INDICES = {
      CENTER: [0, 7, 10, 14, 15, 23],
      TOP_MIDDLE: [2, 3, 11],
      BOTTOM_MIDDLE: [12, 19, 22],
      LEFT_MIDDLE: [1, 4, 17],
      RIGHT_MIDDLE: [6, 20, 21]
    }
    const squareSize = (vertices[1].pos[0] - vertices[0].pos[0])
    Object.values(VERTEX_INDICES).forEach(indices => {
      const displacement = randomValues[indices[0]] * squareSize / Math.pow(vertices[0].recursions + 1, 0.7)
      indices.forEach(index => vertices[index].pos[1] += displacement)
    })
    return vertices
    // const topLeftSquare = vertices.slice(0, 3)
    // const [
    //   center,
    //   leftMiddle,
    //   topMiddle,
    // ] = topLeftSquare.pos
    // const bottomRightSquare = vertices.slice(vertices.length - 3, vertices.length)
    // const [
    //   _,
    //   bottomMiddle,
    //   rightMiddle
    // ] = bottomRightSquare.pos

    // const displacement = randomNumber * (corners.topRight.pos[0] - corners.topLeft.pos[0]) / (corners.topRight.recursions + 1)
    // return {
    //   x: center.x,
    //   y: center.y + displacement,
    //   z: center.z
    // }
  }
]

export function orthogonalDisplacer (center: IPoint, corners: ICorners, randomNumber: number) {
  const VERTEX_INDICES = {
    CENTER: [0, 7, 10, 14, 15, 23],
    TOP_MIDDLE: [2, 3, 11],
    BOTTOM_MIDDLE: [12, 19, 22],
    LEFT_MIDDLE: [1, 4, 17],
    RIGHT_MIDDLE: [6, 20, 21]
  }
  let normalVector = new this.THREE.Vector3()
  let crossVector = new this.THREE.Vector3()
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
  
  const scalingFactor = Math.abs(randomNumber * (corners.topRight.pos[0] - corners.topLeft.pos[0]) / (corners.topLeft.recursions + 1))

  normalVector.multiplyScalar(scalingFactor)
  
  return {
    x: center.x + normalVector.x,
    y: center.y + normalVector.y,
    z: center.z + normalVector.z
  }
}
 