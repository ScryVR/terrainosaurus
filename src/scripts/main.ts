import { Terrainosaurus } from "./classes/Terrainosaurus";
import { registerComponent, registerGeometry } from "aframe";
import { Raycaster, Vector3 } from "three";

const terrainClient = new Terrainosaurus({
  size: 20,
  seed: 0,
  lowDetailRecursions: 0,
  highDetailRecursions: 0,
});

terrainClient.recurseFullMap();

terrainClient.recurseSection(terrainClient.getSection([3]));
terrainClient.recurseSection(terrainClient.getSection([3, 1]));

const geometry = terrainClient.createGeometry();
registerGeometry("terrainosaurus-terrain", {
  init() {
    geometry.computeBoundingSphere();
    geometry.computeVertexNormals();
    this.geometry = geometry;
  },
});

registerComponent("navigable-terrain", {
  init() {
    this.camera = document.querySelector("[camera]");
    this.cameraWorldPosition = new Vector3();
    this.UP_VECTOR = new Vector3(0, 1, 0);
    this.DOWN_VECTOR = new Vector3(0, -1, 0);
    this.intersections = [];
    this.raycaster = new Raycaster(this.cameraWorldPosition, this.DOWN_VECTOR, 0, 100);
  },
  tick() {
    this.camera.object3D.getWorldPosition(this.cameraWorldPosition);
    this.raycaster.set(this.cameraWorldPosition, this.DOWN_VECTOR);
    this.raycaster.intersectObject(this.el.object3D, true, this.intersections);
    this.handleIntersection()
  },
  handleIntersection() {
    if (this.intersections.length) {
      // Basic PD control - not a proper physics sim with gravity
      const yGround = this.intersections[0].point.y
      const yCamera = this.cameraWorldPosition.y
      const controlInput = 0.2 * (yGround - yCamera + 1.2)
      
      // Note that we shift the ground, not camera. This makes AR mode work better
      this.el.object3D.position.y = this.el.object3D.position.y - controlInput
    
      this.intersections = []
      return true
    }
    return false
  }
});
