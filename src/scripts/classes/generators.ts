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

type Color = "GRASS" | "DIRT" | "STONE" | "SAND";
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
    const TERRAIN_NAMES: Array<Color> = ["GRASS", "STONE", "SAND", "DIRT"];
    const TERRAIN_CONNECTIONS: Record<Color, ColorArray> = {
      GRASS: ["GRASS", "GRASS", "GRASS", "DIRT", "SAND", "STONE"],
      DIRT: ["DIRT", "DIRT", "DIRT", "GRASS", "STONE", "STONE"],
      STONE: ["STONE", "STONE", "STONE", "STONE", "STONE", "STONE", "STONE", "DIRT", "GRASS"],
      SAND: ["SAND", "GRASS", "GRASS", "GRASS", "STONE"],
    };
    const COLORS = {
      GRASS: [0.4, 0.8, 0.3],
      DIRT: [0.5, 0.5, 0.3],
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
        this.accum = 0
      }
      if (!this.waveFunctionState[v.pos[0]][v.pos[2]]) {
        let initialValue = v.pos[1] < 1 ? ["SAND"] : ["GRASS", "DIRT", "STONE", "STONE"];
        this.waveFunctionState[v.pos[0]][v.pos[2]] = initialValue;
      }
    });
    // This isn't real wave function collapse for now.
    // It just has a chance of grouping colors
    // Set center color based on neighbors
    let stepSize = vertices[0].pos[0] - vertices[1].pos[0];
    vertices.forEach((vertex: IVertex, index: number) => {
      if (!vertex.color) {
        const randomValue = Math.abs(randomValues[index]);
        const color = chooseColor.call(
          this,
          vertex.pos[0],
          vertex.pos[2],
          stepSize,
          vertex.pos[1],
          randomValue
        );
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

    function chooseColor(
      x: number,
      z: number,
      stepSize: number,
      y: number,
      randomValue: number
    ) {
      let choice: Color;
      // const neighborColors = getNeighbors.call(this, x, z, stepSize);
      if (this.waveFunctionState[x][z].length === 1) {
        // choice = y < 0.2 + randomValue ? "SAND" : this.waveFunctionState[x][z][0];
        choice = this.waveFunctionState[x][z][0]
      } else {
        // const flattenedColors = neighborColors.reduce(
        //   (acc: ColorArray, colors: ColorArray) => {
        //     return acc.concat(colors);
        //   },
        //   []
        // );
        // const allowedColors = getWaveFunction(flattenedColors);
        let choices = this.waveFunctionState[x][z] //.filter((c: Color) => allowedColors.includes(c));
        // If the most recent choice is valid, high chance to choose it again
        if (this.mostRecentChoice !== "SAND" && choices.includes(this.mostRecentChoice) && this.accum < randomValue) {
          this.accum += 0.01
          choice = this.mostRecentChoice
        } else {
          if (this.accum >= randomValue) {
            this.accum = 0
            console.log("resetti")
          }
          choices = choices.filter((c: Color) => c !== this.mostRecentChoice)
          choice = choices[Math.floor(randomValue * choices.length)];
        }
        // choice = this.mostRecentChoice !== "SAND" && choices.includes(this.mostRecentChoice)
        //   ? this.mostRecentChoice
        //   : choices[Math.floor(randomValue * choices.length)];
        this.waveFunctionState[x][z] = [choice];
        this.mostRecentChoice = choice;
      }
      // Update all neighbors based on the choice
      restrictColors.call(this, x, y, stepSize);
      let averageColor = getAverageNeighborColors.call(this, x, z, stepSize, [
        ...COLORS[choice],
      ]);
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
              const neighborColors = getNeighbors.call(this, x, z, stepSize)
              neighborColors.concat(newChoice).forEach((colors: ColorArray) => {
                const waveFunction = getWaveFunction(colors)
                this.waveFunctionState[i][j] = this.waveFunctionState[i][j].filter((c: string) =>
                  waveFunction.includes(c)
                );
              })
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

    function getAverageNeighborColors(
      x: number,
      z: number,
      stepSize: number,
      initialColor?: Array<number>
    ) {
      const neighborColors = getNeighbors
        .call(this, x, z, stepSize)
        .filter((waveFunction: ColorArray) => waveFunction.length === 1);
      if (!neighborColors.length && !initialColor) {
        throw new Error("Cannot get average color - no collapsed neighbors");
      }
      let denominator = neighborColors.length;
      if (initialColor) {
        denominator++;
      }
      let averageColor = neighborColors
        .reduce((acc: Array<number>, colors: ColorArray) => {
          acc[0] += COLORS[colors[0]][0];
          acc[1] += COLORS[colors[0]][1];
          acc[2] += COLORS[colors[0]][2];
          return acc;
        }, initialColor || [0, 0, 0])
        .map((rgbVal: number) => rgbVal / denominator);
      return averageColor;
    }

    function getWaveFunction(colors: ColorArray) {
      return colors.reduce((acc, color) => {
        return acc.concat(TERRAIN_CONNECTIONS[color]);
      }, []);
    }
  },
];
