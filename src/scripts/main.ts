import { Terrainosaurus } from "./classes/Terrainosaurus";
import { registerGeometry } from "aframe";

const terrainClient = new Terrainosaurus({
  size: 20,
  seed: 0,
  lowDetailRecursions: 0,
  highDetailRecursions: 0
})

terrainClient.recursivelyGenerate(0)
terrainClient.recursivelyGenerate(0)
terrainClient.recursivelyGenerate(0)
terrainClient.recursivelyGenerate(12)
terrainClient.recursivelyGenerate(24)
terrainClient.recursivelyGenerate(24)

const geometry = terrainClient.createGeometry()
registerGeometry("terrainosaurus-terrain", {
  init() {
    geometry.computeBoundingSphere();
    geometry.computeVertexNormals();
    console.log("initializing custom geometry", geometry)
    this.geometry = geometry
  }
})