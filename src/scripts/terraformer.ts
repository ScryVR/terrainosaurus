//@ts-ignore
import { terrainosaurusMap } from "./terrainosaurus-terrain";

// Should be added to terrainosaurus-terrain
AFRAME.registerComponent("terraformer", {
  // dependencies: ["terrainosaurus-terrain"],
  schema: {
    gestureHandler: { type: "selector", default: ".a-dom-overlay" },
    doneBtn: {
      type: "selector",
      default: ".a-dom-overlay button:nth-child(1)",
    },
    cancelBtn: {
      type: "selector",
      default: ".a-dom-overlay button:nth-child(2)",
    },
  },
  init() {
    this.activeVertices = {};
    this.addGestureHandlers();
    this.displacement = { x: 0, y: 0, z: 0 };
    this.el.addEventListener("chunkClicked", (event: CustomEvent) => {
      this.data.gestureHandler.style.display = "flex";
      const vertex = this.getNearestVertex(event);
      const isAlreadyActive = this.activeVertices[getKey(vertex)];
      if (!isAlreadyActive) {
        this.addNewVertex(vertex);
      } else {
        this.deactivateVertex(vertex);
      }
    });
    this.data.doneBtn?.addEventListener("click", (event: Event) => {
      const terraformEvent = {
        vertices: Object.entries(this.activeVertices).map(([key, value]: [string, Array<any>]) => {
          const { x, z } = JSON.parse(key);
          const [p1, p2] = value
          // We don't use the y-coordinate when finding which vertices need to be transformed
          return {
            pos: [
              x / this.el.object3D.scale.x,
              null,
              z / this.el.object3D.scale.z,
            ],
            transformation: [
              (p2.object3D.position.x - p1.object3D.position.x) / this.el.object3D.scale.x,
              (p2.object3D.position.y - p1.object3D.position.y) / this.el.object3D.scale.y,
              (p2.object3D.position.z - p1.object3D.position.z) / this.el.object3D.scale.z,
            ]
          };
        }),
      }

      document.querySelector("[terrainosaurus-terrain]").dispatchEvent(new CustomEvent("terraform", { detail: terraformEvent }))

      // Deactivate terraforming UI
      setTimeout(() => {
        Object.keys(this.activeVertices).forEach((k: string) =>
          this.deactivateVertex(JSON.parse(k))
        );
      }, 600);
      this.displacement = { x: 0, y: 0, z: 0 };
      this.maxY = null
      this.minY = null
      this.initialTouch = null
      this.data.gestureHandler.style.display = "none";
      event.stopImmediatePropagation();
    });
    this.data.cancelBtn.addEventListener("click", () => {
      Object.keys(this.activeVertices).forEach((k: string) =>
        this.deactivateVertex(JSON.parse(k))
      );
      this.displacement = { x: 0, y: 0, z: 0 };
      this.data.gestureHandler.style.display = "none";
      event.stopImmediatePropagation();
    });
  },
  getNearestVertex(event: CustomEvent) {
    // Compute the position of the vertex nearest the click position
    this.terrainosaurus ||=
      terrainosaurusMap[
        this.el.components["terrainosaurus-terrain"].terrainosaurusId
      ];
    const squaresPerRow = 2 ** this.terrainosaurus.vertices[0].recursions;
    const edgeLength =
      (this.terrainosaurus.size / squaresPerRow) * this.el.object3D.scale.x;
    const { x, y, z } = event.detail.intersection.point;
    return {
      x: Math.round(x / edgeLength) * edgeLength,
      y: Math.round(y * 10) / 10,
      z: Math.round(z / edgeLength) * edgeLength,
    };
  },
  addNewVertex(vertex: { x: number; y: number; z: number }) {
    // Check if the user is selecting or deselecting the vertex
    const indicators = this.addDisplacementIndicators(vertex);
    this.activeVertices[getKey(vertex)] = indicators;
    if (!this.minY || indicators[0].object3D.position.y < this.minY) {
      this.minY = indicators[0].object3D.position.y
    }
    if (!this.maxY || indicators[0].object3D.position.y > this.maxY) {
      this.maxY = indicators[0].object3D.position.y
    }
  },
  addDisplacementIndicators(initialPos: { x: number; y: number; z: number }) {
    const p1Indicator = document.createElement("a-dodecahedron");
    p1Indicator.object3D.scale.set(0.1, 0.1, 0.1);
    p1Indicator.setAttribute("material", { emissive: "#f0f" });
    const displacementTarget =
      this.el.components["terrainosaurus-terrain"].displacementTarget;
    p1Indicator.object3D.position.set(
      initialPos.x,
      initialPos.y - displacementTarget.object3D.position.y,
      initialPos.z
    );
    displacementTarget.appendChild(p1Indicator);

    const p2Indicator = document.createElement("a-dodecahedron");
    p2Indicator.setAttribute("material", { emissive: "#0ff" });
    p2Indicator.object3D.copy(p1Indicator.object3D);
    p2Indicator.object3D.position.y += this.displacement.y;
    displacementTarget.appendChild(p2Indicator);
    return [p1Indicator, p2Indicator];
  },
  deactivateVertex(vertex: { x: number; y: number; z: number }) {
    const indicators = this.activeVertices[getKey(vertex)];
    indicators.forEach((indicator: HTMLElement) => indicator.remove());
    delete this.activeVertices[getKey(vertex)];
  },
  addGestureHandlers() {
    this.data.gestureHandler.addEventListener(
      "touchstart",
      (event: TouchEvent) => {
        this.touchStartEvent = event;
        this.currentTouch = event.touches[0];
      }
    );
    this.data.gestureHandler.addEventListener(
      "touchmove",
      (event: TouchEvent) => {
        const increment = event.touches[0].clientY - this.currentTouch.clientY;
        this.displacement.y += increment / 100;
        this.currentTouch = event.touches[0];
        Object.values(this.activeVertices).forEach(([p1, p2]: Array<any>) => {
          if (increment > 0) {
            p2.object3D.position.y = Math.min(this.maxY - this.displacement.y, p2.object3D.position.y);
          } else {
            p2.object3D.position.y = Math.max(this.minY - this.displacement.y, p2.object3D.position.y);
          }
        });
      }
    );
    // If the user touches the gesture handler, propagate the event to the scene
    this.data.gestureHandler.addEventListener("click", (event: Event) => {
      const cursor = document.querySelector("[cursor]").components.cursor;
      if (cursor) {
        cursor.onCursorDown.call(cursor, this.touchStartEvent);
        // There are some weird things that happen if using mouse clicks instead of touch events :/
        cursor.twoWayEmit("click");
      }
    });
  },
});
function getKey(vertex: { x: number; y: number; z: number }) {
  return JSON.stringify({ x: vertex.x, z: vertex.z });
}
