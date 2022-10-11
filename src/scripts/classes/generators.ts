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

type Color = "GRASS" | "DIRT" | "STONE"
type ColorArray = Array<Color>


export const defaultGenerators: Array<(...args: any) => any> = [
  function (vertices, randomValues) {
    const VERTEX_INDICES = {
      CENTER: [0, 7, 10, 14, 15, 23],
      TOP_MIDDLE: [2, 3, 11],
      BOTTOM_MIDDLE: [12, 19, 22],
      LEFT_MIDDLE: [1, 4, 17],
      RIGHT_MIDDLE: [6, 20, 21],
      TOP_RIGHT: [8, 9],
      TOP_LEFT: [5],
      BOTTOM_RIGHT: [18],
      BOTTOM_LEFT: [13, 16]
    }
    // Wave Function Collapse Stuff (coloring)
    const TERRAIN_NAMES: Array<Color> = ["GRASS", "DIRT", "STONE"]
    const COLORS = {
      GRASS: [0.4, 0.8, 0.3],
      DIRT: [0.8, 0.4, 0.3],
      STONE: [0.6, 0.6, 0.6]
    }
    if (!this.waveFunctionState) {
      this.waveFunctionState = {}
    }
    // Add new cells to the wave function state as needed
    vertices.forEach((v: IVertex) => {
      if (!this.waveFunctionState[v.pos[0]]) {
        this.waveFunctionState[v.pos[0]] = {}
      }
      if (!this.waveFunctionState[v.pos[0]][v.pos[2]]) {
        let initialValue = TERRAIN_NAMES
        this.waveFunctionState[v.pos[0]][v.pos[2]] = initialValue
      }
    })
    // This isn't real wave function collapse for now.
    // It just has a chance of grouping colors
    // Set center color based on neighbors
    const stepSize = (vertices[0].pos[0] - vertices[1].pos[0])
    vertices.forEach((vertex: IVertex) => {
      if (!vertex.color) {
        const color = chooseColor.call(this, vertex.pos[0], vertex.pos[2], stepSize)
        // @ts-ignore
        vertex.color = COLORS[color]
      }
    })

    // Displacement stuff
    const squareSize = (vertices[1].pos[0] - vertices[0].pos[0])
    Object.entries(VERTEX_INDICES).forEach(([key, indices]) => {
      if (["CENTER", "TOP_MIDDLE", "BOTTOM_MIDDLE", "LEFT_MIDDLE", "RIGHT_MIDDLE"].includes(key)) {
        const displacement = randomValues[indices[0]] * squareSize / Math.pow(vertices[0].recursions + 1, 0.7)
        indices.forEach(index => {
          vertices[index].pos[1] += displacement
        })
      }
    })
    return vertices

    function chooseColor(x: number, z: number, stepSize: number) {
      let neighborColors = getNeighbors.call(this, x, z, stepSize)
      if (!neighborColors.length) {
        neighborColors = TERRAIN_NAMES
      }
      // Select which neighbor colors are relevant
      let flattenedColors = []
      if (neighborColors.some((c: ColorArray) => c.length === 1)) {
        flattenedColors = neighborColors.find((c: ColorArray) => c.length === 1)
        // flattenedColors = neighborColors.filter((c: ColorArray) => c.length === 1).reduce((acc: ColorArray, arr: ColorArray) => {
        //   acc = acc.concat(arr)
        //   return acc
        // }, [])
      } else {
        flattenedColors = neighborColors.reduce((acc: ColorArray, arr: ColorArray) => {
          acc = acc.concat(arr)
          return acc
        }, [])
      }
      const choice = flattenedColors[Math.floor(Math.random() * flattenedColors.length)]
      this.waveFunctionState[x][z] = [choice]
      // Update all neighbors based on the choice
      for (let i = x - stepSize; i < x + 2 * stepSize; i += stepSize) {
        for (let j = z - stepSize; j < z + 2 * stepSize; j += stepSize) {
          try {
            if (i !== x && j !== z && this.waveFunctionState[i][j]) {
              this.waveFunctionState[i][j] = [choice]
            }
          } catch(_) {}
        }
      }
      return choice
    }

    function getNeighbors(x: number, z: number, stepSize: number) {
      const neighbors = []
      for (let i = x - stepSize; i < x + 2 * stepSize; i += stepSize) {
        for (let j = z - stepSize; j < z + 2 * stepSize; j += stepSize) {
          try {
            if (i !== x && j !== z && this.waveFunctionState[i][j]) {
              neighbors.push(this.waveFunctionState[i][j])
            }
          } catch(_) {}
        }
      }
      return neighbors
    }
  }
]
