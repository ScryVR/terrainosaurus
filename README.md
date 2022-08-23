# Terrainosaurus

**NOTE**: This is aspirational documentation. Not all functionalities and behaviors described here are actually implemented.

## Overview

This repository provides a class that registers a custom THREE.js geometry. This geometry represents a complex terrain.
In order to achieve this, Fractal Terrain Generation and Wave Function Collapse Terrain Generation techniques are used.
This novel combination enables a measure of control not usually found with fractal terrain.

## Installation and usage

Install using

```bash
npm install terrainosaurus
# or
yarn add terrainosaurus
```

Here is an example of using the client

```javascript
import { Terrainosaurus } from 'terrainosaurus'
import { registerGeometry } from 'aframe' // Terrainosaurus can be used with three.js directly, but using a-frame results in less code

const terrainClient = new Terrainosaurus({
  size: 20,
  seed: 0,
  lowDetailRecursions: 0,
  highDetailRecursions: 0
})

// Increase the resolution of the top left of the map 2 times
terrainClient.recursivelyGenerate(0)
terrainClient.recursivelyGenerate(0)
const lowResGeometry = terrainClient.createGeometry()

// Increase the resolution of the top left another 2 times and create a higher-res geometry
terrainClient.recursivelyGenerate(0)
terrainClient.recursivelyGenerate(0)
const highResGeometry = terrainClient.createGeometry()

// Terrainosaurus doesn't care how you use the three.js BufferGeometry.
// This example arbitrarily chooses to use it to register a custom a-frame geometry.
registerGeometry("terrainosaurus-terrain", {
  init() {
    highResGeometry.computeBoundingSphere();
    highResGeometry.computeVertexNormals();
    console.log("initializing custom geometry", highResGeometry)
    this.geometry = highResGeometry
  }
})

```

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

## Development and publishing

The project structure is a bit goofy because this repository provides both a frontend project for showcasing Terrainosaur and an npm package.
The frontend project results in Webpack output in `/public`, but the NPM package just consists of a file called `index.js`.

The frontend project gets built with

```bash
yarn dev
```

The NPM package should be published with

```bash
npm publish
# or
yarn publish
```
