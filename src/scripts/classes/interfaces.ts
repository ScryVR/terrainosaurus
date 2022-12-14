import { Vector3 } from "three";

export interface IRegisterProps {
  generators?: Array<(...args: any) => any>;
  generatorSelector?: (...args: any) => number;
  vertexWorkerUrl?: string | URL;
  state?: any;
}

export interface ITerrainosaurusProps extends IRegisterProps {
  size: number;
  seed: any;
  colors?: Record<string, Array<number>>;
  waterLevel?: number;
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
