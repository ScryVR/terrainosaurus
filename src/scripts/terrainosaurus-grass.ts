import "aframe-instanced-mesh/src/instanced-mesh";
import "./grass-shader-2";
import { registerComponent, registerGeometry } from "aframe";
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import {
  CHUNKS_NUM,
  chunkIndexToQuadrantPath,
  terrainosaurusMap,
} from "./terrainosaurus-terrain";

type chunkGrid = Array<Array<chunkData>>;
type chunkData = {
  index: number;
  initialized: boolean;
  meshInstance: any;
  meshMembers: Array<any>;
  sliceParams?: [number, number]
}

registerComponent("terrainosaurus-grass", {
  schema: {
    terrainosaurusId: { type: "string" },
    player: { type: "selector", default: "[camera]" },
    density: { type: "number", default: 16 }
  },
  init() {
    this.geometryInitialized = false;
    this.initializeGrid()
    this.registerGrassGeometry()
    this.currentlyLoadedChunks = new Set()
    // Render grass if terrain data is available
    if (this.data.terrainosaurusId) {
      this.onTerrainInitialized()
    }
    this.createMeshInstance()
  },
  update(oldData) {
    if (
      this.data.terrainosaurusId !== oldData.terrainosaurusId &&
      oldData.terrainosaurusId
      ) {
      this.onTerrainInitialized()
    }
  },
  // Once the terrain is available, start tracking what chunk the camera is in
  onTerrainInitialized() {
    this.terrainClient = terrainosaurusMap[this.data.terrainosaurusId];
    this.camera = document.querySelector("[camera]")
    this.cameraWorldPosition = new Vector3()
    const terrainObject3D = document.querySelector("[terrainosaurus-terrain]").object3D
    this.worldTerrainScale = {
      x: this.terrainClient.size * terrainObject3D.scale.x,
      z: this.terrainClient.size * terrainObject3D.scale.z,
      
    }
    this.currentChunk = {}
    const chunksPerSide = Math.sqrt(CHUNKS_NUM)
    // Run a check every once in a while to see if the camera is in a new chunk
    // The frequency doesn't have to be very high as long as the camera can't move very fast
    setInterval(() => {
      this.camera.object3D.getWorldPosition(this.cameraWorldPosition)
      const gridX = Math.floor(this.cameraWorldPosition.x / this.worldTerrainScale.x * chunksPerSide + chunksPerSide / 2)
      const gridZ = Math.floor(this.cameraWorldPosition.z / this.worldTerrainScale.z * chunksPerSide + chunksPerSide / 2)
      if (this.currentChunk.x !== gridX || this.currentChunk.z !== gridZ) {
        this.currentChunk.x = gridX
        this.currentChunk.z = gridZ
        this.loadChunks(gridZ, gridX)
      }
    }, 200)
    // this.loadChunks(4, 8)
  },
  loadChunks(row: number, col: number) {
    const chunkRadius = 2
    const chunksPerSide = Math.sqrt(CHUNKS_NUM)
    const chunksToLoad: Set<chunkData> = new Set()
    for (let i = -chunkRadius; i <= chunkRadius; i++) {
      for (let j = -chunkRadius; j <= chunkRadius; j++) {
        if (row + i > -1 && row + i < chunksPerSide && col + j > -1 && col + j < chunksPerSide) {
          const chunkData = this.chunkGrid[row + i][col + j]
          chunksToLoad.add(chunkData)
        }
      }
    }
    const currentlyLoadedChunks: Set<chunkData> = this.currentlyLoadedChunks
    const chunksToUnload: Array<chunkData> = []
    currentlyLoadedChunks.forEach(c => {
      if (!chunksToLoad.has(c)) {
        chunksToUnload.push(c)
      }
    })
    chunksToLoad.forEach(c => {
      if (!currentlyLoadedChunks.has(c)) {
        const unloadChunk = chunksToUnload.pop()
        this.renderGrassInChunk(c, unloadChunk)
        this.currentlyLoadedChunks.delete(unloadChunk)
        this.currentlyLoadedChunks.add(c)
      }
    });
  },
  // Terrainosaurus uses the chunk grid to keep references to
  // scene data like meshes indexed by chunk.
  initializeGrid() {
    this.chunkGrid = [[]] as chunkGrid;
    let chunkIndex = 0;
    const gridSize = Math.sqrt(CHUNKS_NUM);
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const data: chunkData = {
          index: chunkIndex,
          initialized: false,
          meshInstance: null,
          meshMembers: []
        }
        this.chunkGrid[i].push(data);
        chunkIndex++;
      }
      this.chunkGrid.push([]);
    }
  },
  // Creates an instanced mesh and associates it with a chunk
  // Each chunk gets its own instance since this optimizes culling and LOD
  createMeshInstance(gridX: number, gridY: number) {
    // const chunkData = this.chunkGrid[gridX][gridY] as chunkData
    if (this.meshInstance) {
      return
    }
    const meshInstance = document.createElement("a-entity")
    meshInstance.setAttribute("geometry", {
      primitive: "terrainosaurus-grass"
    })
    meshInstance.setAttribute("material", {
      vertexColorsEnabled: true,
      side: "double",
      // shader: "grass",
      // emissive: "0.4 0.9, 0.4",
      // emissiveIntensity: 0.1
    });
    meshInstance.setAttribute("instanced-mesh", {
      capacity: 15000,
    });
    meshInstance.setAttribute("id", `terrGrassMesh`);
    this.meshInstance = meshInstance
    this.el.appendChild(meshInstance);
  },
  // An idempotent function for registering the grass primitive
  registerGrassGeometry() {
    if (!this.geometryInitialized) {
      registerGeometry("terrainosaurus-grass", {
        init() {
          const geometry = getGrassGeometry();
          geometry.computeBoundingSphere();
          geometry.computeVertexNormals();
          this.geometry = geometry;
        },
      });
      this.geometryInitialized = true
    }
  },
  // Adds a bunch of grass member meshes to a specified chunk
  // Handles interpolation, checking if a position is valid, etc.
  renderGrassInChunk(chunk: chunkData, oldChunk?: chunkData) {
    // console.log("Going to load", chunk.index, oldChunk?.index)
    const { index } = chunk
    const pathToMiddle = chunkIndexToQuadrantPath(index);
    const { vertices } = this.terrainClient?.getSection(pathToMiddle)
    const edgeLength = Math.abs(vertices[0].pos[0] - vertices[5].pos[0]);
    const interpolatedBlades = this.data.density
    for (let i = 0; i < vertices.length; i += 6) {
      const [r, g, b] = vertices[i + 5].color;
      const isGreen = g / r > 1.2 && g / b > 1.2;
      if (isGreen) {
        for (let j = 0; j < interpolatedBlades; j++) {
          let grassBlade: any = oldChunk?.meshMembers.pop()
          let isNew = false
          if (!grassBlade) {
            isNew = true
            grassBlade = document.createElement("a-entity");
            grassBlade.setAttribute("instanced-mesh-member", {
              mesh: `#terrGrassMesh`,
            });
            // grassBlade.setAttribute("geometry", { primitive: "terrainosaurus-grass" })
            // grassBlade.setAttribute("material", {
            //   vertexColorsEnabled: true,
            //   side: "double"
            // })
          }
          chunk.meshMembers.push(grassBlade)
          const randomOffset = [
            Math.random() * edgeLength,
            null,
            Math.random() * edgeLength,
          ] as position;
          const corners: Array<any> = [
            vertices[i + 5].pos,
            vertices[i + 3].pos,
            vertices[i + 1].pos,
            vertices[i].pos,
          ];
          const [x, y, z] = interpolate(randomOffset, corners);
          grassBlade.object3D.position.set(x, y, z);
          grassBlade.object3D.scale.y = 0.4 + Math.random() * 0.8;
          grassBlade.object3D.rotation.y = Math.PI * Math.random() / 2;
          grassBlade.object3D.rotation.x = Math.random() * 0.5 - 0.25;
          grassBlade.object3D.rotation.z = Math.random() * 0.5 - 0.25;
          if (isNew) {
            this.el.appendChild(grassBlade);
          }
        }
      }
    }
  },
});

type position = [number, number, number];
function interpolate(offset: position, [tl, tr, bl, br]: Array<position>) {
  const leftEdgeSlope = (bl[1] - tl[1]) / (bl[2] - tl[2]);
  const rightEdgeSlope = (br[1] - tr[1]) / (br[2] - tr[2]);

  const leftY = tl[1] + leftEdgeSlope * offset[2];
  const rightY = tr[1] + rightEdgeSlope * offset[2];

  const interpolatedSlope = (rightY - leftY) / (br[0] - bl[0]);
  const interpolatedY = leftY + interpolatedSlope * offset[0];

  return [tl[0] + offset[0], interpolatedY, tl[2] + offset[2]];
}

export function getGrassGeometry() {
  const grassGeometry = new BufferGeometry();
  const positionNumComponents = 3;
  const normalNumComponents = 3;
  const uvNumComponents = 2;
  const colorNumComponents = 3;
  const WIDTH = 0.006;
  const MIDPOINT = 0.04;
  const HEIGHT = 0.14;
  grassGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      [
        -WIDTH,
        MIDPOINT,
        0, // bottom left, mapped to left middle
        0.0,
        0,
        0, // bottom right, mapped to bottom middle
        WIDTH,
        MIDPOINT,
        0, // top right, mapped to right middle

        WIDTH,
        MIDPOINT,
        0, // top right, mapped to right middle
        0,
        HEIGHT,
        0, // top left, mapped to top middle
        -WIDTH,
        MIDPOINT,
        0, // bottom left, mapped to left middle
      ],
      positionNumComponents
    )
  );
  grassGeometry.setAttribute(
    "normal",
    new Float32BufferAttribute([
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
    ], normalNumComponents)
  )
  const normalizedMiddleHeight = MIDPOINT / HEIGHT
  grassGeometry.setAttribute(
    "uv",
    new Float32BufferAttribute([
      -1, MIDPOINT, // left middle
      0, 0, // bottom middle
      1, MIDPOINT, // right middle
      1, MIDPOINT, // right middle
      0, HEIGHT, // top middle
      -1, MIDPOINT// left middle
    ], uvNumComponents)
  )
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

/**
 * 
        { pos: [1, 0, 1], norm: [0, 1, 0], uv: [0, 1], recursions: 0 }, // bottom right
        { pos: [-1, 0, 1], norm: [0, 1, 0], uv: [1, 1], recursions: 0 }, // bottom left
        { pos: [1, 0, -1], norm: [0, 1, 0], uv: [0, 0], recursions: 0 }, // top right

        { pos: [1, 0, -1], norm: [0, 1, 0], uv: [0, 0], recursions: 0 }, // top right
        { pos: [-1, 0, 1], norm: [0, 1, 0], uv: [1, 1], recursions: 0 }, // bottom left
        { pos: [-1, 0, -1], norm: [0, 1, 0], uv: [1, 0], recursions: 0 }, // top left
      ])
 */