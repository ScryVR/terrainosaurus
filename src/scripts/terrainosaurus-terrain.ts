/**
 * This function registers a component called terrainosaurus-terrain.
 * This component contains a reference to an instance of the Terrainosaurus class.
 * The component DOM contains 64 chunks, each representing a portion of the entire Terrainosaurus map.
 * This chunking approach allows for a deeper level of recursion before hitting three.js performance limits,
 *  such as BufferGeometry creation time.
 *
 */

import { AFrame, utils } from "aframe";
import { Raycaster, Vector3 } from "three";
import { IRegisterProps, ITerrainosaurusProps, IVertex } from "./interfaces";
import { Terrainosaurus } from "./Terrainosaurus";

export const terrainosaurusMap: Record<string, Terrainosaurus> = {};
const CHUNKS_NUM = 16 * 16

export function registerTerrainosaurusComponent(
  props: IRegisterProps,
  aframe: AFrame
) {
  const { registerComponent, registerGeometry } = aframe;
  registerComponent("terrainosaurus-terrain", {
    schema: {
      seed: { type: "int", default: 1 },
      size: { type: "int", default: 20 },
      cameraHeight: { type: "int", default: 1.5 },
      destroyClientOnRemoval: { type: "boolean", default: false },
      src: { type: "string" },
      wrapper: { type: "string", default: "a-scene" },
      lowDetail: { type: "boolean", default: false },
      grassColor: { type: "vec3", default: new Vector3(0.4, 0.8, 0.3) },
      dirtColor: { type: "vec3", default: new Vector3(0.7, 0.5, 0.3) },
      stoneColor: { type: "vec3", default: new Vector3(0.6, 0.6, 0.6) },
      sandColor: { type: "vec3", default: new Vector3(1, 0.8, 0.6) },
      gravityEnabled: { type: "boolean", default: true },
      waterLevel: { type: "number" },
      noCollisionWrapper: { type: "string" },
      pVal: { type: "number", default: 0.4 },
    },
    applyTerraform(event: CustomEvent) {
      // TODO: Figure out which chunks need to be rerendered and only rerender those.
      //       For now, I'm just rerendering the entire geometry :O
      const transformFilter = (x: number, z: number) => {
        const shouldTransform = event.detail.vertices.some((v: IVertex) => {
          return v.pos[0] === x && v.pos[2] === z
        })
        return shouldTransform
      }
      const transformer = ([x, y, z]: Array<number>) => {
        const { xShift, yShift, zShift } = event.detail
        return [x + xShift, y + yShift, z + zShift]
      }
      this.updateChunkGeometries(
        transformFilter,
        transformer
      )
    },
    init() {
      // Initialize the terrainosaurus client in such a way that the memory-intensive
      // Terrainosaurus object is not bound directly to the component state.
      const terrainosarusProps = {
        ...props,
        colors: {
          GRASS: vectorToNumberArray(this.data.grassColor),
          DIRT: vectorToNumberArray(this.data.dirtColor),
          STONE: vectorToNumberArray(this.data.stoneColor),
          SAND: vectorToNumberArray(this.data.sandColor),
        },
        size: this.data.size,
        seed: this.data.seed,
        waterLevel: this.data.waterLevel
      };
      this.terrainosaurusId = addTerrainosaurusObjectToMap(terrainosarusProps);

      // Initialize chunks. For now, there is no control over the number of recursions, whether they happen in the background, etc.
      // Recurse until we get 8 chunks per side.
      const terrainClient = terrainosaurusMap[this.terrainosaurusId];
      terrainClient.recurseFullMap(4);
      // Create separate entities for each chunk
      this.chunks = [];
      for (let i = 0; i < CHUNKS_NUM; i++) {
        this.chunks.push(document.createElement("a-entity"));
        let chunkGeometry;
        chunkGeometry = this.createGeometryComponent(
          terrainClient,
          chunkIndexToQuadrantPath(i)
          );
        this.chunks[i].classList.add("terrainosaurus-chunk");
        if (terrainClient.vertices[0].recursions > 3 || !i) {
          this.chunks[i].setAttribute("geometry", { primitive: chunkGeometry });
        }
        if (this.data.src) {
          this.chunks[i].setAttribute("material", {
            side: "double",
            src: this.data.src,
            shader: "standard",
            roughness: 1,
          });
        } else {
          this.chunks[i].setAttribute("material", {
            side: "double",
            vertexColorsEnabled: true,
            shader: "standard",
            roughness: 1,
          });
        }
        this.chunks[i].addEventListener("click", (event: CustomEvent) => {
          this.el.dispatchEvent(new CustomEvent("chunkClicked", { detail: event.detail }))
        })
        this.el.appendChild(this.chunks[i]);
      }
      if (!this.data.lowDetail) {
        terrainClient
          .recurseSectionInBackground(
            { vertices: terrainClient.vertices, absoluteIndex: 0 },
            2
          ).then(() => {
            this.updateChunkGeometries();
            terrainClient.recurseSectionInBackground(
              { vertices: terrainClient.vertices, absoluteIndex: 0 },
              1
            ).then(() => {
              this.updateChunkGeometries();
              this.el.dispatchEvent(new CustomEvent("terrainInitialized", { detail: { terrainClient }}))
            });
          })
      } else {
        this.el.dispatchEvent(new CustomEvent("terrainInitialized", { detail: { terrainClient }}))
      }
      
      this.el.addEventListener("terraform", (event: CustomEvent) => this.applyTerraform(event))

      // Set up stuff for terrain navigation
      this.camera = document.querySelector("[camera]");
      this.cameraWorldPosition = new Vector3();
      this.camera.object3D.getWorldPosition(this.cameraWorldPosition);
      this.nominalCameraHeight = this.cameraWorldPosition.y

      this.cameraRig = document.querySelector("#cameraRig")
      this.cameraRigWorldPosition = new Vector3()

      this.UP_VECTOR = new Vector3(0, 2, 0);
      this.DOWN_VECTOR = new Vector3(0, -1, 0);
      this.intersections = [];
      this.raycaster = new Raycaster(
        this.cameraWorldPosition,
        this.DOWN_VECTOR,
        0,
        4
      );
      this.displacementTarget = this.el;
      this.fallSpeed = 0
      if (this.data.wrapper) {
        this.displacementTarget = document.querySelector(this.data.wrapper);
        if (!this.displacementTarget) {
          console.warn(
          "Terrainosaurus: Specified an invalid wrapper attribute - defaulting to moving self"
          );
          this.displacementTarget = this.el
        }
      }
      if (this.data.noCollisionWrapper) {
        this.raycasterExclusion = document.querySelector(this.data.noCollisionWrapper)
      }
      this.tick = utils.throttleTick(this.tick, 17, this)
    },
    tick() {
      this.camera.object3D.getWorldPosition(this.cameraWorldPosition);
      this.cameraRig.object3D.getWorldPosition(this.cameraRigWorldPosition)
      this.raycaster.set(this.cameraWorldPosition, this.DOWN_VECTOR);
      this.raycaster.intersectObject(
        this.displacementTarget.object3D,
        true,
        this.intersections
      );
      this.handleIntersection();
    },
    updateChunkGeometries(transformFilter: Function, transformer: Function) {
      // Should be called after new vertices are calculated.
      // Creates new geometries and assigns them to the chunks.
      const terrainClient = terrainosaurusMap[this.terrainosaurusId];
      for (let i = 0; i < CHUNKS_NUM; i++) {
        setTimeout(() => {
          const chunkGeometry = this.createGeometryComponent(
            terrainClient,
            chunkIndexToQuadrantPath(i),
            transformFilter,
            transformer
          );
          if (terrainClient.vertices[0].recursions > 3 || !i) {
            this.chunks[i].setAttribute("geometry", { primitive: chunkGeometry });
          }
        }, i * 2)
      }
    },
    createGeometryComponent(
      terrainClient: Terrainosaurus,
      path: Array<1 | 2 | 3 | 4>,
      transformFilter: Function,
      transformer: Function
    ) {
      const name = `terrainosaurus-${getRandomId()}`;
      registerGeometry(name, {
        init() {
          let section = terrainClient.getSection(path)
          if (terrainClient.vertices[0].recursions < 4) {
            section = { vertices: terrainClient.vertices, absoluteIndex: 0 }
          }
          const geometry = terrainClient.createGeometry(
            section,
            transformFilter,
            transformer
          );
          geometry.computeBoundingSphere();
          geometry.computeVertexNormals();
          this.geometry = geometry;
        },
      });
      return name;
    },
    handleIntersection() {
      // For now, for performance reasons, assume we'll only have a single plane where collisions shouldn't occur
      if (this.raycasterExclusion?.contains(this.intersections[0]?.object.el)) {
        this.intersections.shift()
      }
      if (this.intersections.length) {
        this.fallSpeed = 0
        // Basic PD control - not a proper physics sim with gravity
        // TODO: Consider how to handle IRL changes in elevation when in AR mode.
        const yGround = this.intersections[0].point.y;
        const yRig = this.cameraRigWorldPosition.y
        // Use the nominal camera height because AR mode is a sneaky little guy (I want to be able to get low to look closely at the ground)
        const controlInput = this.data.pVal * (yGround - (yRig) + this.data.cameraHeight);

        // Note that we shift the ground, not camera. This makes AR mode work better
        this.displacementTarget.object3D.position.y =
          this.displacementTarget.object3D.position.y - controlInput;
        this.intersections = [];
        return true;
      } else if(this.data.gravityEnabled) {
        this.fallSpeed = Math.min(this.fallSpeed + 0.01, 1)
        this.displacementTarget.object3D.position.y = Math.min(this.displacementTarget.object3D.position.y + this.fallSpeed, 200)
      }
      this.intersections = [];
      return false;
    },
    // Clean up the Terrainosaurus client if the compnent gets deleted
    remove() {
      if (this.data.destroyClientOnRemoval) {
        delete terrainosaurusMap[this.terrainosaurusId];
      }
    },
  });
}

function addTerrainosaurusObjectToMap(props: ITerrainosaurusProps) {
  const randomId = getRandomId();
  terrainosaurusMap[randomId] = new Terrainosaurus(props);
  return randomId;
}

function getRandomId() {
  const typedArray = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
  crypto.getRandomValues(typedArray)
  return typedArray.join("")
}

function chunkIndexToQuadrantPath(chunkIndex: number, chunkLevels: number = 4) {
  const chunksPerSide = 2 ** chunkLevels;
  const gridPos = [
    Math.floor(chunkIndex % chunksPerSide),
    Math.floor(chunkIndex / chunksPerSide),
  ];
  const path = [];
  let midPoints = {
    x: chunksPerSide / 2,
    y: chunksPerSide / 2
  }
  const transformations = {
    left: {
      midPointShift: -1,
      up: {
        quadrant: 2,
        midPointShift: -1
      },
      down: {
        quadrant: 3,
        midPointShift: 1
      },
    },
    right: {
      midPointShift: 1,
      up: {
        quadrant: 1,
        midPointShift: -1
      },
      down: {
        quadrant: 4,
        midPointShift: 1
      },
    }
  }
  let shiftMagnitude = chunksPerSide / 4
  for (let i = 0; i < chunkLevels; i++) {
    const xDirection = gridPos[0] < midPoints.x ? "left" : "right"
    const yDirection = gridPos[1] < midPoints.y ? "up" : "down"
    const transformation = transformations[xDirection][yDirection]
    path.push(transformation.quadrant)
    midPoints.x += transformations[xDirection].midPointShift * shiftMagnitude
    midPoints.y += transformation.midPointShift * shiftMagnitude
    shiftMagnitude /= 2
  }
  return path;
}

function vectorToNumberArray(vector: Vector3) {
  return [vector.x, vector.y, vector.z]
}