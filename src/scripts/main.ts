import { Terrainosaurus } from "./classes/Terrainosaurus";
import { registerGeometry } from "aframe";

const terrainClient = new Terrainosaurus({
  size: 20,
  seed: 0,
  lowDetailRecursions: 0,
  highDetailRecursions: 0
})

terrainClient.recurseFullMap()

terrainClient.recurseSection(terrainClient.getSection([3]))
terrainClient.recurseSection(terrainClient.getSection([3, 1]))

const geometry = terrainClient.createGeometry()
registerGeometry("terrainosaurus-terrain", {
  init() {
    geometry.computeBoundingSphere();
    geometry.computeVertexNormals();
    this.geometry = geometry
  }
})