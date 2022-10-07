import { registerTerrainosaurusComponent } from "./classes/terrainosaurus-terrain";
import * as AFRAME from 'aframe'
import { orthogonalDisplacer } from "./classes/generators";

const workerUrl = new URL("./classes/vertex-worker", import.meta.url)
workerUrl.searchParams.append("isFile", "true")
registerTerrainosaurusComponent({
  vertexWorkerUrl: workerUrl,
}, AFRAME)

