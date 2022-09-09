import { Terrainosaurus } from "./classes/Terrainosaurus";
import { registerComponent, registerGeometry } from "aframe";
import { Raycaster, Vector3, BufferGeometry } from "three";
import { orthogonalDisplacer, defaultGenerators, ICorners, IPoint } from "./classes/generators";
// @ts-ignore
import { SimplexNoise } from 'simplex-noise-esm'
// import { defaultGenerators } from "../../generators";

const simplex = new SimplexNoise()

const terrainClient = new Terrainosaurus({
  size: 20,
  seed: 0,
  state: {
    simplex
  },
  lowDetailRecursions: 0,
  highDetailRecursions: 0,
  generators: [
    function (center: IPoint, corners: ICorners) {
      // @ts-ignore
      const displacementCoeff = (corners.topRight.pos[0] - corners.bottomLeft.pos[0]) / 2.5
      const yDisplacement = this.state.simplex.noise2D(center.x, center.z) * displacementCoeff
      return {
        x: center.x,
        y: center.y + yDisplacement,
        z: center.z
      }
    }
  ]
});

function createGeometryComponent(path: Array<1 | 2 | 3 | 4>) {
    const name = `terrainosaurus-${Math.floor(Math.random() * 100000)}`;
    registerGeometry(name, {
      init() {
        // if (path[0] === 2 && path[1] === 2) {
        //   console.log("aefof", terrainClient.getSection(path))
        // }
        const geometry = terrainClient.createGeometry(terrainClient.getSection(path).vertices)
        geometry.computeBoundingSphere();
        geometry.computeVertexNormals();
        this.geometry = geometry;
      },
    });
    return name;
}

registerComponent("terrainosaurus-terrain", {
  init() {
    // Recurse until we get 8 chunks per side.
    terrainClient.recurseFullMap(3);

    // Create separate entities for each chunk
    this.chunks = []
    for(let i = 0; i < 16; i++) {
      this.chunks.push(document.createElement("a-entity"))
      const chunkGeometry = createGeometryComponent(getQuadrantPath(i))
      this.chunks[i].classList.add("terrainosaurus-chunk")
      this.chunks[i].setAttribute("geometry", { primitive: chunkGeometry })
      this.chunks[i].setAttribute("material", { side: "double", vertexColors: "none", src: "#grassTexture", shader: "standard", roughness: 1 })
      this.el.appendChild(this.chunks[i])
    }
    // terrainClient.recurseFullMap(2)
    // this.updateChunkGeometries()
    terrainClient.recurseSectionInBackground({ vertices: terrainClient.vertices, absoluteIndex: 0 }, 2)
    .then(() => {
      this.updateChunkGeometries()
      terrainClient.recurseSectionInBackground({ vertices: terrainClient.vertices, absoluteIndex: 0 }, 1)
      .then(() => {
        // console.log("time for a mini recursion")
        this.updateChunkGeometries()
        // const { absoluteIndex, vertices } = terrainClient.getSection([1, 1, 1])
        // console.log({ absoluteIndex, vertices: vertices.length }, terrainClient.vertices.length)
        // terrainClient.recurseSectionInBackground({ vertices, absoluteIndex })
        // .then((event) => {
        //   console.log("oh wow", event)
        //   console.log(terrainClient.getSection([1, 1]))
        //   this.updateChunkGeometries()
        // })
      })
    })

    this.camera = document.querySelector("[camera]");
    this.cameraWorldPosition = new Vector3();
    this.UP_VECTOR = new Vector3(0, 1, 0);
    this.DOWN_VECTOR = new Vector3(0, -1, 0);
    this.intersections = [];
    this.raycaster = new Raycaster(
      this.cameraWorldPosition,
      this.DOWN_VECTOR,
      0,
      100
    );
  },
  tick() {
    this.camera.object3D.getWorldPosition(this.cameraWorldPosition);
    this.cameraWorldPosition.y += 1
    this.raycaster.set(this.cameraWorldPosition, this.DOWN_VECTOR);
    this.raycaster.intersectObject(this.el.object3D, true, this.intersections);
    this.handleIntersection();
  },
  updateChunkGeometries() {
    // Should be called after new vertices are calculated.
    // Creates new geometries and assigns them to the chunks.
    for(let i = 0; i < 16; i++) {
      const chunkGeometry = createGeometryComponent(getQuadrantPath(i))
      this.chunks[i].setAttribute("geometry", { primitive: chunkGeometry })
    }
  },
  handleIntersection() {
    if (this.intersections.length) {
      // Basic PD control - not a proper physics sim with gravity
      // TODO: Consider how to handle IRL changes in elevation when in AR mode.
      const yGround = this.intersections[0].point.y;
      const yCamera = this.cameraWorldPosition.y;
      const controlInput = 0.4 * (yGround - yCamera + 2.2);

      // Note that we shift the ground, not camera. This makes AR mode work better
      this.el.object3D.position.y = this.el.object3D.position.y - controlInput;

      this.intersections = [];
      return true;
    }
    return false;
  },
});

// There should be a way to reduce this to a single expression, but I can't be bothered right now.
function getQuadrantPath(chunkIndex: number): Array<1 | 2 | 3 | 4> {
  // @ts-ignore
  return [
    [2, 2],
    [2, 1],
    [1, 2],
    [1, 1],
    [2, 3],
    [2, 4],
    [1, 3],
    [1, 4],
    [3, 2],
    [3, 1],
    [4, 2],
    [4, 1],
    [3, 3],
    [3, 4],
    [4, 3],
    [4, 4]
  ][chunkIndex]
}
