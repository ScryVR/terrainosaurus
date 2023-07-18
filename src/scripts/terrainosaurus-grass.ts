import "aframe-instanced-mesh/src/instanced-mesh"
import { registerComponent, registerGeometry } from "aframe";
import { BufferGeometry, Float32BufferAttribute } from "three";
import {
  CHUNKS_NUM,
  chunkIndexToQuadrantPath,
  terrainosaurusMap,
} from "./terrainosaurus-terrain";

registerComponent("terrainosaurus-grass", {
  schema: {
    terrainosaurusId: { type: "string" },
    player: { type: "selector", default: "[camera]" },
  },
  init() {
    this.gridSize = Math.sqrt(CHUNKS_NUM);
    this.chunkGrid = [[]];
    this.geometryInitialized = false;
    let chunkIndex = 0;
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        this.chunkGrid[i].push(chunkIndex);
        chunkIndex++;
      }
      this.chunkGrid.push([]);
    }
    // Create instanced mesh
    if (!this.geometryInitialized) {
      registerGeometry("terrainosaurus-grass", {
        init() {
          const geometry = getGrassGeometry();
          geometry.computeBoundingSphere();
          geometry.computeVertexNormals();
          this.geometry = geometry
        },
      });
      this.instancedGrassMesh = document.createElement("a-entity")
      this.instancedGrassMesh.setAttribute("geometry", {
        primitive: "terrainosaurus-grass",
      });
      this.instancedGrassMesh.setAttribute("material", {
        vertexColorsEnabled: true,
        side: "double",
        emissive: "#aaf4aa",
        emissiveIntensity: 0.1,
      })
      this.instancedGrassMesh.setAttribute("instanced-mesh", {
        capacity: 10000,
        fcradius: 2,
        fccenter: [0, 0, 0]
      })
      this.instancedGrassMesh.setAttribute("id", "terrainosaurusGrassMesh")
      this.el.appendChild(this.instancedGrassMesh)

      this.geometryInitialized = true;
    }
    // Render grass if terrain data is available
    if (this.data.terrainosaurusId) {
      this.setClient();
      this.spawnGrass();
    }
  },
  update(oldData) {
    // Render grass is terrain data is available
    if (
      this.data.terrainosaurusId !== oldData.terrainosaurusId &&
      oldData.terrainosaurusId
    ) {
      this.setClient();
      this.spawnGrass();
    }
  },
  setClient() {
    this.terrainClient = terrainosaurusMap[this.data.terrainosaurusId];
  },
  spawnGrass() {
    // very rudimentary for now
    // Just spawn some grass blades in the center of the map
    // No dynamic updating
    const gridMiddle = Math.floor(this.gridSize / 2);
    for (let i = gridMiddle - 2; i < gridMiddle + 2; i++) {
      for (let j = gridMiddle - 2; j < gridMiddle + 2; j++) {
        const chunkIndex = this.chunkGrid[i][j]
        this.renderGrassInChunk(chunkIndex)
      }
    }
  },
  renderGrassInChunk(index: number) {
    const pathToMiddle = chunkIndexToQuadrantPath(index);
    const { vertices } = this.terrainClient?.getSection(pathToMiddle) || [];
    const edgeLength = Math.abs(vertices[0].pos[0] - vertices[5].pos[0])
    const interpolatedBlades = 32
    for (let i = 0; i < vertices.length; i += 6) {
      for (let j = 0; j < interpolatedBlades; j++) {
        const grassBlade = document.createElement("a-entity");
        grassBlade.setAttribute("instanced-mesh-member", {
          mesh: "#terrainosaurusGrassMesh",
        });
        const randomOffset = [Math.random() * edgeLength, null, Math.random() * edgeLength] as position
        const corners = [vertices[i + 5].pos, vertices[i + 3].pos, vertices[i + 1].pos, vertices[i].pos]
        const [x, y, z] = interpolate(randomOffset, corners)
        const [r, g, b] = vertices[i + 5].color
        const isGreen = g / r > 1.2 && g / b > 1.2
        if (isGreen) {
          grassBlade.object3D.position.set(x, y, z);
          grassBlade.object3D.scale.y = 0.4 + Math.random() * 0.8
          grassBlade.object3D.rotation.y = (Math.PI * Math.random());
          grassBlade.object3D.rotation.x = Math.random() * 0.1
          this.el.appendChild(grassBlade);
        }
      }
    }
  }
});

type position = [number, number, number];
function interpolate(
  offset: position,
  [tl, tr, bl, br]: Array<position>
) {
  const leftEdgeSlope = (bl[1] - tl[1]) / (bl[2] - tl[2])
  const rightEdgeSlope = (br[1] - tr[1]) / (br[2] - tr[2])
  
  const leftY = tl[1] + leftEdgeSlope * offset[2]
  const rightY = tr[1] + rightEdgeSlope * offset[2]

  const interpolatedSlope = (rightY - leftY) / (br[0] - bl[0])
  const interpolatedY = leftY + interpolatedSlope * offset[0]

  return [tl[0] + offset[0], interpolatedY, tl[2] + offset[2]];
}

export function getGrassGeometry() {
  const grassGeometry = new BufferGeometry();
  const positionNumComponents = 3;
  // const normalNumComponents = 3;
  // const uvNumComponents = 2;
  const colorNumComponents = 3;
  const WIDTH = 0.01
  const MIDPOINT = 0.06
  const HEIGHT = 0.14
  grassGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      [
        -WIDTH,
        MIDPOINT,
        0, // bottom left
        0.0,
        0,
        0, // bottom right
        WIDTH,
        MIDPOINT,
        0, // top right

        WIDTH,
        MIDPOINT,
        0, // top right
        0,
        HEIGHT,
        0, // top left
        -WIDTH,
        MIDPOINT,
        0, // bottom left
      ],
      positionNumComponents
    )
  );
  // grassGeometry.setAttribute(
  //   "normal",
  //   new Float32BufferAttribute([

  //   ], normalNumComponents)
  // )
  // grassGeometry.setAttribute(
  //   "uv",
  //   new Float32BufferAttribute([

  //   ], uvNumComponents)
  // )
  grassGeometry.setAttribute(
    "color",
    new Float32BufferAttribute(
      new Float32Array([
        0.4, 0.9, 0.4, 0.4, 0.9, 0.4, 0.4, 0.9, 0.4, 0.4, 0.9, 0.4, 0.4, 0.9,
        0.4, 0.4, 0.9, 0.4,
      ]),
      colorNumComponents
    )
  );
  return grassGeometry;
}
