# Terrainosaurus

**NOTE**: This is aspirational documentation. Not all functionalities and behaviors described here are actually implemented.

## Overview

**NOTE**: The current alpha state only implements a simple diamond-square displacement out of the box, so the terrain is simple, not complex.

This repository provides a class that registers a custom THREE.js geometry. This geometry represents a complex terrain.
In order to achieve this, Fractal Terrain Generation and Wave Function Collapse Terrain Generation techniques are used.
This novel combination enables a measure of control not usually found with fractal terrain.

This repositoty also includes a function called `registerTerrainosaurusComponent` which registers an a-frame component that uses Terrainosaurus.
See later sections for more information on this `terrainosaurus-terrain` component.

## Installation and usage

Install using

```bash
npm install terrainosaurus
# or
yarn add terrainosaurus
```

Here is an example of using the client.

```javascript
import { registerTerrainosaurusComponent } from "terrainosaurus-terrain";
import * as AFRAME from 'aframe'

// See the Configuring Web Workers section for details.
// Setting vertexWorkerUrl will vary from project to project.
const vertexWorkerUrl = new URL("terrainosaurus/dist/vertex-worker", import.meta.url)
vertexWorkerUrl.searchParams.append("isFile", "true")

registerTerrainosaurusComponent({
  vertexWorkerUrl
}, AFRAME) // Passing the aframe object allows Terrainosaurus to support using aframe via either NPM or a CDN.
```

## Configuring Web Workers

Computing vertices at high levels of detail gets progressively more expensive. To address this, Terrainosaurus provides a Web Worker in `vertex-worker.ts`.
The `terrainosaurus-terrain` component will automatically use Web Workers to perform high LOD computations in the background. To make this possible, a `vertexWorkerUrl` parameter must be passed to `registerTerrainosaurusComponent`. This means the vertex-worker.js file must be hosted on some path by your application. One simple way to do this is to just copy [this file](https://github.com/ScryVR/terrainosaurus/blob/master/dist/vertex-worker.js) into folder that is available to your application. Using a service like UNPKG is not an option due to CORS restrictions with Web Workers.

The sample frontend in the `src` folder adds a slight complication to the method above, but the end result is effectively the same. Instead of manually copying the file, it uses Webpack rules to add the `vertex-worker.js` file to the assets folder. The exact approach may vary slightly from project to project, but it should look something like the following example.

```javascript
// in webpack.config.js
module.exports = {
  entry: [
    './src/scripts/main.ts', 
    './src/styles/main.scss',
    './node_modules/terrainosaurus/dist/vertex-worker.js' // <-- Add the vertex-worker file here so that Webpack does stuff to it.
  ],
  rules: [
    {
      test: /vertex-worker/, // This rule will be used on the vertex-worker.js file
      // This object controls where the file is added.
      // The exact values will depend on your desired project structure.
      // The important thing is that the file is packaged separately instead of in some bundle.
      // These particular values will work for any project bootstrapped using Inframous (https://www.npmjs.com/package/inframous)
      generator: {
        publicPath: "assets/scripts/",
        outputPath: "assets/scripts",
        filename: "vertex-worker.js"
      }
    },
  ]
}
```

Once Webpack is configured such that `vertex-worker.js` appears in the desired folder, use either of the following approaches.

```javascript
// In whatever script should cause the terrainosaurus-terrain component to be registered
const vertexWorkerUrlWithWebpack = new URL("terrainosaurus/dist/vertex-worker", import.meta.url)
const vertexWorkerUrlWithRelativePath = new URL("/some/path/to/vertex-worker.js", window.location.origin)
```

## `terrainosaurus-terrain`

The component created by `registerTerrainosaurusComponent` does a few things worth noting.

* *It creates a map with chunking*
instead of creating one large geometry object it creates 16 smaller ones and adds them as children. **NOTE**: This is relevant when raycasting. Instead of trying to collide with `[terrainosaurus-terrain]`, it may make more sense to collide with `.terrainosaurus-chunk`.
* *It moves up and down so the player is always touching the ground*
The component does some raycasting to find the distance between the camera position and the ground underneath it. The terrain adjusts its position accordingly. By default, the terrain moves itself rather than the camera in order to not conflict with other movement controls that might be in use. This approach also makes AR mode work much more simply.

## Development and publishing

The project structure is a bit goofy because this repository provides both a frontend project for showcasing Terrainosaur and an npm package.
The frontend project results in Webpack output in `/public`, but the NPM package's output lives in `/dist`.

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
