import { registerComponent } from "aframe";
import { terrainosaurusMap } from "./terrainosaurus-terrain";

// Should be added to terrainosaurus-terrain
registerComponent("terraformer", {
  dependencies: ["terrainosaurus-terrain"],
  schema: {
    gestureHandler: { type: "selector", default: ".a-dom-overlay" },
    doneBtn: { type: "selector", default: ".a-dom-overlay button" },
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
      this.el.dispatchEvent(
        new CustomEvent("terraform", {
          detail: {
            vertices: Object.keys(this.activeVertices).map((key: string) => {
              const { x, z } = JSON.parse(key)
              // We don't use the y-coordinate when finding which vertices need to be transformed
              return { pos: [x / this.el.object3D.scale.x, null, z / this.el.object3D.scale.z] }
            }
            ),
            xShift: this.displacement.x / this.el.object3D.scale.x,
            yShift: -this.displacement.y / this.el.object3D.scale.y,
            zShift: this.displacement.z / this.el.object3D.scale.z
          },
        })
      );
      setTimeout(() => {
        Object.keys(this.activeVertices).forEach((k: string) => this.deactivateVertex(JSON.parse(k)))
      }, 600)
      this.displacement = { x: 0, y: 0, z: 0 }
      this.data.gestureHandler.style.display = "none"
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
  },
  addDisplacementIndicators(initialPos: { x: number; y: number; z: number }) {
    const p1Indicator = document.createElement("a-sphere");
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

    const p2Indicator = document.createElement("a-sphere");
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
        this.initialTouch = event.touches[0];
      }
    );
    this.data.gestureHandler.addEventListener(
      "touchmove",
      (event: TouchEvent) => {
        this.displacement.y =
          (event.touches[0].clientY - this.initialTouch.clientY) / 100;
        Object.values(this.activeVertices).forEach(([p1, p2]) => {
          p2.object3D.position.y = p1.object3D.position.y - this.displacement.y;
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
