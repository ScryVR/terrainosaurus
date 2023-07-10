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
    // vertices.forEach((vertex: IVertex, index: number) => {
    //   if (!vertex.color) {
    //     const randomValue = Math.abs(randomValues[index]);
    //     const color = chooseColor.call(
    //       this,
    //       vertex.pos[0],
    //       vertex.pos[2],
    //       stepSize,
    //       vertex.pos[1],
    //       randomValue
    //     );
    //     vertex.color = color;
    //   }
    // });

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
        // const fractalDisplacement =
        //   (randomValues[indices[0]] * squareSize) /
        //   Math.pow(vertices[0].recursions + 1, 0.6);
        const fractalDisplacement = randomValues[indices[0]] * Math.pow(Math.abs(squareSize), 0.8) / this.genParams.smoothness / 2
        indices.forEach((index) => {
          const noise = compositeNoise(vertices[index], this.state.simplex, this.genParams)
          vertices[index].pos[1] += noise * fractalDisplacement

          vertices[index].color = COLORS.GRASS
          if (randomValues[indices[0]] > 0.4) {
            vertices[index].color = COLORS.DIRT
          }
          if (vertices[index].pos[1] < 0.2) {
            vertices[index].color = COLORS.SAND
          }
          if (noise * randomValues[indices[0]] > 0.48) {
            vertices[index].color = COLORS.STONE
          }
          vertices[index].color = vertices[index].color.map((c: number) => {
            return c * (1 - 0.08 + 0.16 * Math.random())
          })
          // vertices[index].pos[1] = Math.pow(vertices[index].pos[1], 0.8)
        });
      }
    });
    return vertices;

    function compositeNoise(v: any, simplex: any, genParams: Record<string, any>) {
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
  
      let continentNoise = sampleNoise(genParams.islandSize, 100);
      continentNoise = spline(
        continentNoise,
        genParams.landmassSlope *
          sampleNoise(genParams.islandSize / 2, 100),
        genParams.maxHeight
      );
  
      const plateauNoise = genParams.smoothness * sampleNoise(genParams.plateauFactor * 5, -200);
      return continentNoise * plateauNoise + 0.2 * genParams.plateauFactor * plateauNoise
    }
  },
];
