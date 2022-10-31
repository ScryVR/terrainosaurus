import * as AFRAME from 'aframe'
import { registerTerrainosaurusComponent } from "./classes/terrainosaurus-terrain";
import { Arborithm } from "arborithm"

const workerUrl = new URL("./classes/vertex-worker", import.meta.url)
workerUrl.searchParams.append("isFile", "true")
registerTerrainosaurusComponent({
  vertexWorkerUrl: workerUrl,
}, AFRAME)

window.addEventListener("message", ({data}) => {
  if (data.type === "sceneInitialized") {
    const terrain = document.querySelector("#terrain")
    terrain.addEventListener("terrainInitialized", (event: any) => {
      const { detail: { terrainClient: { vertices, seed } } } = event
      const arborithm = new Arborithm({
        vertices,
        seed,
        waterLevel: 0
      })
      const wrapper = document.querySelector("#wrapper")
      arborithm.trees.forEach((treeData) => {
        arborithm.spawnTree(wrapper, treeData, [6, 6, 6])
      })
    })
  }
})

