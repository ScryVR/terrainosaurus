
export interface ITerrainosaurusProps {
  size: number;
  lowDetailRecursions: number;
  highDetailRecursions: number;
  seed: any;
  state: any;
  generators?: Array<(...args: any) => any>;
  generatorSelector?: (...args: any) => number;
}

export interface ISection {
  vertices: Array<IVertex>;
  absoluteIndex: number;
}

export interface IVertex {
  pos: Array<number>;
  norm: Array<number>;
  uv: Array<number>;
  color?: Array<number>;
  recursions: number;
}
export interface IGetSquareProps {
  vertices: Array<IVertex>;
  recursions: number;
  vertexIndex: number;
}
