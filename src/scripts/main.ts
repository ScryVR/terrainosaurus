import { Terrainosaurus } from "./classes/Terrainosaurus";
import { registerGeometry } from "aframe";

const terrainClient = new Terrainosaurus({
  size: 20,
  seed: 0,
  lowDetailRecursions: 0,
  highDetailRecursions: 0
})

evenlyRecurseTerrain(terrainClient, 4)
terrainClient.recursivelyGenerate(18)
terrainClient.recursivelyGenerate(12)
terrainClient.recursivelyGenerate(6)
terrainClient.recursivelyGenerate(0)

function evenlyRecurseTerrain(client: Terrainosaurus, levels = 1) {
  for (let level = 0; level < levels; level++) {
    // Adds one level of recursion across the entire terrain map
    for (let i = terrainClient.vertices.length - 6; i > -1; i -= 6) {
      client.recursivelyGenerate(i)
    }
  }
}

const geometry = terrainClient.createGeometry()
registerGeometry("terrainosaurus-terrain", {
  init() {
    geometry.computeBoundingSphere();
    geometry.computeVertexNormals();
    console.log("initializing custom geometry", geometry)
    this.geometry = geometry
  }
})