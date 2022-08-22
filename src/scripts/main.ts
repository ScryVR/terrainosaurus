import { Terrainosaurus } from "./classes/Terrainosaurus";
import { registerGeometry } from "aframe";

const terrainClient = new Terrainosaurus({
  size: 2,
  seed: 0,
  lowDetailRecursions: 0,
  highDetailRecursions: 0
})

const geometry = terrainClient.createGeometry()
registerGeometry("terrainosaurus-terrain", {
  init() {
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    console.log("initializing custom geometry", geometry)
    this.geometry = geometry
  }
})