import * as AFRAME from 'aframe'
import { registerTerrainosaurusComponent } from "./terrainosaurus-terrain";
import "./terrainosaurus-grass"
import "./terraformer"

const workerUrl = new URL("./vertex-worker", import.meta.url)
workerUrl.searchParams.append("isFile", "true")
registerTerrainosaurusComponent({
  vertexWorkerUrl: workerUrl,
}, AFRAME)


