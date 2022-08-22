# Terrainosaurus

**NOTE**: This is aspirational documentation. Not all functionalities and behaviors described here are actually implemented.

## Overview

This repository provides a class that registers a custom THREE.js geometry. This geometry represents a complex terrain.
In order to achieve this, Fractal Terrain Generation and Wave Function Collapse Terrain Generation techniques are used.
This novel combination enables a measure of control not usually found with fractal terrain.

## Implementation Details

(This section contains technical information not related to how the actual generation algorithm works.)

The `Terrainosaurus` class is intended to be used with `three.js` `BufferGeometry` class. As such, it produces a set of parallel arrays that are easily compatible with `BufferGeometry`. This may introduce a slight amount of coupling, but the performance benefits make this well worth it.

The `Terrainosaurus` class is designed to enable some basic chunking behavior. Upon its construction, it creates a series of Promises, each representing a chunk of the map. When it recursively generates terrain, it does so in an order that enables the chunks nearest to the camera to render first. Once each chunk is ready, it resolves the corresponding promise. Using this class may look something like this:

```javascript
const terrainClient = new Terrainosaurus(terrainConfigObject)
const currentChunk = await terrainClient.currentChunk() // Promise will resolve when the first geometry is ready at a high LOD
renderChunk(currentChunk) // Once the new geometry is available, create an entity that uses it and insert it into the scene
```

Note that `Terrainosaurus` is not responsible for anything related to scene management. Its only concern is generating the geometries. This is intended to improve separation of concerns and improve modularity.
