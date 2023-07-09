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
    const TERRAIN_CONNECTIONS: Record<Color, ColorArray> = {
      GRASS: ["GRASS", "GRASS", "GRASS", "DIRT", "STONE"],
      DIRT: ["DIRT", "DIRT", "DIRT", "GRASS", "STONE", "STONE"],
      STONE: ["STONE", "STONE", "STONE", "STONE", "DIRT", "GRASS", "SAND"],
      SAND: ["SAND", "GRASS", "GRASS", "GRASS", "STONE"],
    };
    let COLORS = this.colors || {
      GRASS: [0.4, 0.8, 0.3],
      DIRT: [0.7, 0.5, 0.3],
      STONE: [0.6, 0.6, 0.6],
      SAND: [1, 0.8, 0.6],
    };
    if (!this.waveFunctionState) {
      this.waveFunctionState = {};
      this.waterLevel = this.waterLevel || 0
    }
    // Add new cells to the wave function state as needed
    vertices.forEach((v: IVertex, index: number) => {
      if (!this.waveFunctionState[v.pos[0]]) {
        this.waveFunctionState[v.pos[0]] = {};
        this.accum = 0
      }
      if (!this.waveFunctionState[v.pos[0]][v.pos[2]]) {
        let initialValue = ["GRASS", "GRASS", "DIRT", "STONE"];
        if (v.pos[1] < this.waterLevel + Math.abs(randomValues[index] * 0.2)) {
          initialValue = ["SAND"]
        } else if (v.pos[1] > this.waterLevel + 1 + Math.abs(randomValues[index]) * 0.2) {
          initialValue = ["STONE", "STONE", "STONE", "DIRT"]
        }
        this.waveFunctionState[v.pos[0]][v.pos[2]] = initialValue;
      }
    });
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
    const simplex = this.state.simplex
    const compositeNoise = (v: any) => {
      const sampleNoise = (scale: number, offset: number = 0) => {
        const noise = simplex.noise2D(
          v.pos[0] / scale + offset,
          v.pos[2] / scale + offset
        );
        return noise;
      };
  
      /**
       *
       * @param input A noise value
       * @param stops An array of arrays where each element represents an inflection point of a piecewise function
       */
      const spline = (input: number, steepness: number, scale: number = 0.5) => {
        let splinedValue = 0;
        for (let i = 0; i < 4; i++) {
          // splinedValue += 0.4 * Math.atan(input * 40 - 10 * i)
          splinedValue +=
            scale *
              Math.atan(
                input * (steepness - 0.5 * steepness * i) - (steepness / 4) * i
              ) +
            scale;
        }
        return splinedValue;
      };
  
      let continentNoise = sampleNoise(this.genParams.islandSize, 100);
      // continentNoise = spline(continentNoise, this.genParams.landmassSlope, this.genParams.maxHeight)
      continentNoise = spline(
        continentNoise,
        this.genParams.landmassSlope *
          sampleNoise(this.genParams.islandSize / 2, 200),
        this.genParams.maxHeight
      );
  
      const plateauNoise = 0.03 * sampleNoise(1, -200);
      return continentNoise + plateauNoise
    };
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
        const fractalDisplacement =
          (randomValues[indices[0]] * squareSize) /
          Math.pow(vertices[0].recursions + 1, 0.7);
        indices.forEach((index) => {
          vertices[index].pos[1] += compositeNoise(vertices[index]) * fractalDisplacement// randomValues[index];
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
      if (this.waveFunctionState[x][z].length === 1) {
        choice = this.waveFunctionState[x][z][0]
      } else {
        let choices = this.waveFunctionState[x][z]
        // If the most recent choice is valid, high chance to choose it again
        if (this.mostRecentChoice !== "SAND" && choices.includes(this.mostRecentChoice) && this.accum < randomValue) {
          this.accum += 0.005
          choice = this.mostRecentChoice || "SAND"
        } else {
          if (this.accum >= randomValue) {
            this.accum = 0
          }
          choices = choices.filter((c: Color) => c !== this.mostRecentChoice)
          let choiceNoise = randomValue
          while(Math.abs(choiceNoise) > 1) {
            choiceNoise /= 2
          }
          choice = choices[Math.floor(choiceNoise * choices.length)]
        }
        this.waveFunctionState[x][z] = [choice];
        this.mostRecentChoice = choice || this.mostRecentChoice;
      }
      // Update all neighbors based on the choice
      restrictColors.call(this, x, y, stepSize);
      let averageColor = getAverageNeighborColors.call(this, x, z, stepSize, [
        ...COLORS[choice],
      ]);
      // Noise step - each channel can change by +-10%
      averageColor = averageColor.map((c: number) => {
        return c * (1 - 0.08 + 0.16 * Math.random())
      })
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
            if (i !== x && j !== z && this.waveFunctionState[i][j]?.length > 1) {
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
