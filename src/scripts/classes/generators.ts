import { IVertex } from "./interfaces";

export function defaultGeneratorSelector() {
  return Math.floor(Math.random() * this.generators.length);
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

type Color = "GRASS" | "DIRT" | "STONE" | "BORDER_DIRT" | "SAND";
type ColorArray = Array<Color>;

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
      BOTTOM_LEFT: [13, 16],
    };
    // Wave Function Collapse Stuff (coloring)
    const TERRAIN_NAMES: Array<Color> = [
      "GRASS",
      "BORDER_DIRT",
      "STONE",
      "SAND",
    ];
    const TERRAIN_CONNECTIONS: Record<Color, ColorArray> = {
      GRASS: ["GRASS", "GRASS", "BORDER_DIRT", "STONE"],
      DIRT: ["BORDER_DIRT", "DIRT"],
      BORDER_DIRT: ["DIRT", "BORDER_DIRT", "GRASS"],
      STONE: ["STONE", "STONE", "GRASS"],
      SAND: ["SAND", "GRASS", "GRASS"],
    };
    const COLORS = {
      GRASS: [0.4, 0.8, 0.3],
      DIRT: [0.8, 0.4, 0.3],
      BORDER_DIRT: [0.8, 0.4, 0.3],
      STONE: [0.6, 0.6, 0.6],
      SAND: [1, 0.8, 0.6],
    };
    if (!this.waveFunctionState) {
      this.waveFunctionState = {};
    }
    // Add new cells to the wave function state as needed
    vertices.forEach((v: IVertex) => {
      if (!this.waveFunctionState[v.pos[0]]) {
        this.waveFunctionState[v.pos[0]] = {};
      }
      if (!this.waveFunctionState[v.pos[0]][v.pos[2]]) {
        let initialValue = TERRAIN_NAMES;
        this.waveFunctionState[v.pos[0]][v.pos[2]] = initialValue;
      }
    });
    // This isn't real wave function collapse for now.
    // It just has a chance of grouping colors
    // Set center color based on neighbors
    const stepSize = vertices[0].pos[0] - vertices[1].pos[0];
    vertices.forEach((vertex: IVertex) => {
      if (!vertex.color) {
        const color = chooseColor.call(
          this,
          vertex.pos[0],
          vertex.pos[2],
          stepSize,
          vertex.pos[1]
        );
        // @ts-ignore
        vertex.color = color;
      }
    });

    // Displacement stuff
    const squareSize = vertices[1].pos[0] - vertices[0].pos[0];
    Object.entries(VERTEX_INDICES).forEach(([key, indices]) => {
      if (
        [
          "CENTER",
          "TOP_MIDDLE",
          "BOTTOM_MIDDLE",
          "LEFT_MIDDLE",
          "RIGHT_MIDDLE",
        ].includes(key)
      ) {
        const displacement =
          (randomValues[indices[0]] * squareSize) /
          Math.pow(vertices[0].recursions + 1, 0.7);
        indices.forEach((index) => {
          vertices[index].pos[1] += displacement;
        });
      }
    });
    return vertices;

    function chooseColor(x: number, z: number, stepSize: number, y: number) {
      let choice: Color;
      const neighborColors = getNeighbors.call(this, x, z, stepSize);
      if (this.waveFunctionState[x][z].length === 1) {
        choice = y < 0 ? "SAND" : this.waveFunctionState[x][z][0];
      } else {
        const flattenedColors = neighborColors.reduce(
          (acc: ColorArray, colors: ColorArray) => {
            return acc.concat(colors);
          },
          []
        );
        const allowedColors = getWaveFunction(flattenedColors);
        const choices = allowedColors;
        // If the most recent choice is valid, high chance to choose it again
        choice = choices.includes(this.mostRecentChoice)
          ? this.mostRecentChoice
          : choices[Math.floor(Math.random() * choices.length)];
        // Handle below water level
        if (y < 0) {
          choice = "SAND";
        } else if (choice === "SAND" && Math.random() < 0.7) {
          const noSandChoices = choices.filter((c) => c !== "SAND");
          choice =
            noSandChoices[Math.floor(Math.random() * noSandChoices.length)];
        }
        this.waveFunctionState[x][z] = [choice];
      }
      this.mostRecentChoice = choice;
      // Update all neighbors based on the choice
      restrictColors.call(this, x, y, stepSize);
      // Calculate weighted average color of all neighbors and choice
      const averageColorData = neighborColors.reduce(
        (acc: any, colors: ColorArray) => {
          if (colors.length === 1) {
            const color = COLORS[colors[0]];
            acc.sum[0] += color[0];
            acc.sum[1] += color[1];
            acc.sum[2] += color[2];
            acc.num += 1;
          }
          return acc;
        },
        { sum: [0, 0, 0], num: 0 }
      );
      const averageColor = averageColorData.sum.map(
        (rgb: number, index: number) =>
          (rgb + COLORS[choice][index]) / (averageColorData.num + 1)
      );
      return averageColor;
    }

    function restrictColors(
      x: number,
      z: number,
      stepSize: number,
      newChoice: Color
    ) {
      // Iterate over every neighbor
      for (let i = x - stepSize; i < x + 2 * stepSize; i += stepSize) {
        for (let j = z - stepSize; j < z + 2 * stepSize; j += stepSize) {
          try {
            if (i !== x && j !== z && this.waveFunctionState[i][j]) {
              // At each neighbor, get all neighbor colors and restrict wave function to intersection of current function and what the neighbor allows
              const allowedColors = getWaveFunction([newChoice]);
              this.waveFunctionState[i][j] = allowedColors.filter((c: string) =>
                this.waveFunctionState[i][j].includes(c)
              );
            }
          } catch (_) {}
        }
      }
    }

    function getNeighbors(x: number, z: number, stepSize: number) {
      let neighbors: any = [];
      for (let i = x - stepSize; i < x + 2 * stepSize; i += stepSize) {
        for (let j = z - stepSize; j < z + 2 * stepSize; j += stepSize) {
          try {
            if (!(i === x && j === z) && this.waveFunctionState[i][j]) {
              neighbors.push(this.waveFunctionState[i][j]);
            }
          } catch (_) {}
        }
      }
      return neighbors;
    }

    function getWaveFunction(colors: ColorArray) {
      return colors.reduce((acc, color) => {
        return acc.concat(TERRAIN_CONNECTIONS[color]);
      }, []);
    }
  },
];
