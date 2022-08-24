import { Terrainosaurus } from "./classes/Terrainosaurus";
import { registerComponent, registerGeometry } from "aframe";
import { Raycaster, Vector3 } from "three";
import { ICorners, IPoint } from "./classes/generators";
const terrainClient = new Terrainosaurus({
  size: 20,
  seed: 0,
  lowDetailRecursions: 0,
  highDetailRecursions: 0,
  generators: [
    (center: IPoint, corners: ICorners): IPoint => {
      const maxDisplacement = (corners.topRight.pos[0] - corners.topLeft.pos[0]) / 1.4
      const getDisplacement = () => Math.random() * maxDisplacement - maxDisplacement / 2
      let minRandom = getDisplacement()
      // for (let i = 0; i < 0; i++) {
      //   const displacement = getDisplacement()
      //   minRandom = Math.abs(minRandom) > Math.abs(displacement) ? displacement : minRandom
      // }
      return {
        x: center.x,
        y: center.y + minRandom,
        z: center.z
      }
    }
  ]
});

const generateGeometryComponent = function*() {
  while (true) {
    const name = `terrainosaurus-${Math.floor(Math.random() * 10000)}`
    registerGeometry(name, {
      init() {
        terrainClient.recurseFullMap()
        const geometry = terrainClient.createGeometry()
        geometry.computeBoundingSphere()
        geometry.computeVertexNormals()
        this.geometry = geometry
      }
    })
    yield name
  }
}

const generator = generateGeometryComponent()

registerComponent("terrainosaurus-terrain", {
  init() {
    terrainClient.recurseFullMap(4)
    const geometry = generator.next()
    this.el.setAttribute("geometry", { primitive: geometry.value })

    this.camera = document.querySelector("[camera]");
    this.cameraWorldPosition = new Vector3();
    this.UP_VECTOR = new Vector3(0, 1, 0);
    this.DOWN_VECTOR = new Vector3(0, -1, 0);
    this.intersections = [];
    this.raycaster = new Raycaster(this.cameraWorldPosition, this.DOWN_VECTOR, 0, 100);

    // setInterval(() => {
    //   if (terrainClient.vertices[0].recursions > 5) {
    //     return
    //   }
    //   const geometry = generator.next()
    //   this.el.setAttribute("geometry", { primitive: geometry.value })
    // }, 1000)
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
      // TODO: Consider how to handle IRL changes in elevation when in AR mode.
      const yGround = this.intersections[0].point.y
      const yCamera = this.cameraWorldPosition.y
      const controlInput = 0.4 * (yGround - yCamera + 1.2)
      
      // Note that we shift the ground, not camera. This makes AR mode work better
      this.el.object3D.position.y = this.el.object3D.position.y - controlInput
    
      this.intersections = []
      return true
    }
    return false
  }
});
