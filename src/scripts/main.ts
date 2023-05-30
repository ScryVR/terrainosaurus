import * as AFRAME from 'aframe'
import { registerTerrainosaurusComponent } from "./classes/terrainosaurus-terrain";

const workerUrl = new URL("./classes/vertex-worker", import.meta.url)
workerUrl.searchParams.append("isFile", "true")
registerTerrainosaurusComponent({
  vertexWorkerUrl: workerUrl,
}, AFRAME)


