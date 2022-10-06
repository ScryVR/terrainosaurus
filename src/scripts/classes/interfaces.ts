export interface IRegisterProps {
  generators?: Array<(...args: any) => any>;
  generatorSelector?: (...args: any) => number;
  vertexWorkerUrl?: string | URL;
  caveWorkerUrl?: string | URL;
  state?: any;
}

export interface ITerrainosaurusProps extends IRegisterProps {
  size: number;
  seed: any;
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
