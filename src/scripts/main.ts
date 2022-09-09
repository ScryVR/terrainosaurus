import { registerTerrainosaurusComponent } from "./classes/registerTerrainosaurusComponent";

const workerUrl = new URL("./classes/vertex-worker", import.meta.url)
workerUrl.searchParams.append("isFile", "true")

registerTerrainosaurusComponent({
  vertexWorkerUrl: workerUrl
})

