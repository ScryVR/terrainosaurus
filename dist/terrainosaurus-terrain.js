/**
 * This function registers a component called terrainosaurus-terrain.
 * This component contains a reference to an instance of the Terrainosaurus class.
 * The component DOM contains 64 chunks, each representing a portion of the entire Terrainosaurus map.
 * This chunking approach allows for a deeper level of recursion before hitting three.js performance limits,
 *  such as BufferGeometry creation time.
 *
 */
import { registerComponent, registerGeometry } from "aframe";
import { Raycaster, Vector3 } from "three";
import { Terrainosaurus } from "./Terrainosaurus";
const _terrainosaurusMap = {};
export function registerTerrainosaurusComponent(props) {
    registerComponent("terrainosaurus-terrain", {
        schema: {
            size: { type: "int", default: 20 },
            destroyClientOnRemoval: { type: "boolean", default: false },
            src: { type: "string" },
            wrapper: { type: "string" },
        },
        init() {
            // Initialize the terrainosaurus client in such a way that the memory-intensive
            // Terrainosaurus object is not bound directly to the component state.
            const terrainosarusProps = {
                ...props,
                size: this.data.size,
                seed: 0,
            };
            this.terrainosaurusId = addTerrainosaurusObjectToMap(terrainosarusProps);
            // Initialize chunks. For now, there is no control over the number of recursions, whether they happen in the background, etc.
            // Recurse until we get 8 chunks per side.
            const terrainClient = _terrainosaurusMap[this.terrainosaurusId];
            terrainClient.recurseFullMap(3);
            // Create separate entities for each chunk
            this.chunks = [];
            for (let i = 0; i < 16; i++) {
                this.chunks.push(document.createElement("a-entity"));
                const chunkGeometry = createGeometryComponent(terrainClient, getQuadrantPath(i));
                this.chunks[i].classList.add("terrainosaurus-chunk");
                this.chunks[i].setAttribute("geometry", { primitive: chunkGeometry });
                this.chunks[i].setAttribute("material", {
                    side: "double",
                    vertexColors: "none",
                    shader: "standard",
                    roughness: 1,
                });
                // This logic might get more complicated later as we support proper texturing
                if (this.data.src) {
                    this.chunks[i].setAttribute("material", {
                        src: this.data.src,
                    });
                }
                this.el.appendChild(this.chunks[i]);
            }
            terrainClient
                .recurseSectionInBackground({ vertices: terrainClient.vertices, absoluteIndex: 0 }, 2)
                .then(() => {
                this.updateChunkGeometries();
                terrainClient
                    .recurseSectionInBackground({ vertices: terrainClient.vertices, absoluteIndex: 0 }, 1)
                    .then(() => {
                    this.updateChunkGeometries();
                    terrainClient
                        .recurseSectionInBackground(terrainClient.getSection([1]))
                        .then(() => {
                        console.log(terrainClient.getSection([1, 1]));
                        this.updateChunkGeometries();
                    });
                });
            });
            // Set up stuff for terrain navigation
            this.camera = document.querySelector("[camera]");
            this.cameraWorldPosition = new Vector3();
            this.UP_VECTOR = new Vector3(0, 1, 0);
            this.DOWN_VECTOR = new Vector3(0, -1, 0);
            this.intersections = [];
            this.raycaster = new Raycaster(this.cameraWorldPosition, this.DOWN_VECTOR, 0, 100);
            this.displacementTarget = this.el;
            if (this.data.wrapper) {
                this.displacementTarget = document.querySelector(this.data.wrapper);
                if (!this.displacementTarget) {
                    console.warn("Terrainosaurus: Specified an invalid wrapper attribute - defaulting to moving self");
                }
            }
        },
        tick() {
            this.camera.object3D.getWorldPosition(this.cameraWorldPosition);
            this.cameraWorldPosition.y += 1;
            this.raycaster.set(this.cameraWorldPosition, this.DOWN_VECTOR);
            this.raycaster.intersectObject(this.el.object3D, true, this.intersections);
            this.handleIntersection();
        },
        updateChunkGeometries() {
            // Should be called after new vertices are calculated.
            // Creates new geometries and assigns them to the chunks.
            const terrainClient = _terrainosaurusMap[this.terrainosaurusId];
            for (let i = 0; i < 16; i++) {
                const chunkGeometry = createGeometryComponent(terrainClient, getQuadrantPath(i));
                this.chunks[i].setAttribute("geometry", { primitive: chunkGeometry });
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
                this.displacementTarget.object3D.position.y =
                    this.displacementTarget.object3D.position.y - controlInput;
                this.intersections = [];
                return true;
            }
            return false;
        },
        // Clean up the Terrainosaurus client if the compnent gets deleted
        remove() {
            if (this.data.destroyClientOnRemoval) {
                delete _terrainosaurusMap[this.terrainosaurusId];
            }
        },
    });
}
function addTerrainosaurusObjectToMap(props) {
    const randomId = getRandomId();
    _terrainosaurusMap[randomId] = new Terrainosaurus(props);
    return randomId;
}
// Returns a random 8-digit number.
// Using Math.random() should be fine since this isn't a cryptographically-sensitive use case.
function getRandomId() {
    return Math.floor(1 + Math.random() * 10000000).toString();
}
function createGeometryComponent(terrainClient, path) {
    const name = `terrainosaurus-${Math.floor(Math.random() * 100000)}`;
    registerGeometry(name, {
        init() {
            // if (path[0] === 2 && path[1] === 2) {
            //   console.log("aefof", terrainClient.getSection(path))
            // }
            const geometry = terrainClient.createGeometry(terrainClient.getSection(path).vertices);
            geometry.computeBoundingSphere();
            geometry.computeVertexNormals();
            this.geometry = geometry;
        },
    });
    return name;
}
// There should be a way to reduce this to a single expression, but I can't be bothered right now.
function getQuadrantPath(chunkIndex) {
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
        [4, 4],
    ][chunkIndex];
}
