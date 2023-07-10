# Terrainosaurus


## Overview

This repository provides an [a-frame](https://aframe.io/docs/1.4.0/introduction/) component called `terrainosaurus-terrain`. This component is intended to be used as a ground surface in VR applications. It provides some default terrain generators, but custom generators can be provided. The terrain generator uses Web Workers and chunking to significantly improve performance.

![Terrainosaurus example output inside Pocket Dimension](/public/assets/images/terrainosaurus_v1.png)

🔌🔌🔌 **Shameless plug**: I built Terrainosaurus for [Pocket Dimension](https://about.pocketdimension.io), which is a cool app that you should check out. 🔌🔌🔌

[Click here to see some examples](#examples)

## Installation and usage

Install using

```bash
npm install terrainosaurus
# or
yarn add terrainosaurus
```

Here is an example of initializing the component.

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

Here is an example of including Terrainosaurus in a scene.

```html
<a-scene>
  <a-enity id="terrain-wrapper">
    <a-entity scale="12 12 12" terrainosaurus="seed: 123456; wrapper: #terrain-wrapper;"></a-entity>
    <a-box></a-box>
  </a-entity>
</a-scene>
```

The following table contains descriptions of the available `terrainosaurus` attributes.

| Attribute | Details | Default |
|-----------|---------|---------|
| `seed`    | Used to initialize the seeded random number generator. Using the same number results in the same terrain being generated. | 1 |
| `cameraHeight` | Adjusts the distance between the camera and the ground. Adjusting the position of the camera itself won't work by default due to how Terrainosaurus calculates the terrain position. | 1.5  |
| `wrapper`      | Used to indicate which element should be targeted when anchoring the ground to the camera. Useful when including other entities in a scene that should be anchored to the ground. **NOTE:** Any other entities included in the wrapper element are also counted in collision detection. | `undefined` |
| `noCollisionWrapper`  | Used to indicate an element whose children should not be included in collision detection. | `undefined` |
| `gravityEnabled` | Whether or not Terrainosaurus will change its position so the camera stays at ground level | `true` |
| `dirtColor` | Normalized RGB vector used to color the terrain. Current terrain coloring approach is very basic | [0.4, 0.8, 0.3] |
| `grassColor` | Normalized RGB vector used to color the terrain. Current terrain coloring approach is very basic | [0.7, 0.5, 0.3] |
| `stoneColor` | Normalized RGB vector used to color the terrain. Current terrain coloring approach is very basic | [0.6, 0.6, 0.6] |
| `sandColor` | Normalized RGB vector used to color the terrain. Current terrain coloring approach is very basic | [1, 0.8, 0.6] |
| `lowDetail` | If true, stops terrain generation at 4 levels of recursion. | `false` |

## Configuring Web Workers

Computing vertices at high levels of detail gets progressively more expensive. To address this, Terrainosaurus provides a Web Worker in `vertex-worker.ts`.
The `terrainosaurus-terrain` component will automatically use Web Workers to perform high LOD computations in the background. To make this possible, a `vertexWorkerUrl` parameter must be passed to `registerTerrainosaurusComponent`. This means the vertex-worker.js file must be hosted on some path by your application. One simple way to do this is to just copy [this file](https://github.com/ScryVR/terrainosaurus/blob/master/dist/vertex-worker.js) into folder that is available to your application. Using a service like UNPKG is not an option due to CORS restrictions with Web Workers.

The sample frontend in the `src` folder adds a slight complication to the method above, but the end result is effectively the same. Instead of manually copying the file, it uses Webpack rules to add the `vertex-worker.js` file to the assets folder. The exact approach may vary slightly from project to project, but it should look something like the following example.

Add the following to whatever script should register `terrainosaurus-terrain`. Referencing the `vertex-worker` script this way ensures that it is seen as a dependency by Webpack, and will therefore be included in the bundling process.

```javascript
const vertexWorkerUrlWithWebpack = new URL("terrainosaurus/dist/vertex-worker", import.meta.url)
```

 Modify your `webpack.config.js` file so that the vertex-worker script is placed in its own separate file, as shown below.

```javascript
// in webpack.config.js
module.exports = {
  entry: [
    './src/scripts/main.ts', // This assumes that main.ts or one of its dependencies references vertex-worker
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

## `terrainosaurus-terrain`

The component created by `registerTerrainosaurusComponent` does a few things worth noting.

* **It creates a map with chunking.**
Instead of creating one large geometry object, it creates 256 smaller ones and adds them as children. This is relevant when raycasting. Instead of trying to collide with `[terrainosaurus-terrain]`, it may make more sense to collide with `.terrainosaurus-chunk`.
* **It moves up and down so the player stays on the ground.**
The component does some raycasting to find the distance between the camera position and the ground underneath it. The terrain adjusts its position accordingly. By default, the terrain moves itself rather than the camera in order to not conflict with other movement controls that might be in use. This approach also makes AR mode work much more simply. If the distance between the camera and the ground is greater than 1m, a very simple gravity force vector is applied.

## Development and publishing

The project structure is a bit goofy because this repository provides both a frontend project for showcasing Terrainosaurus and an npm package.
The frontend project results in Webpack output in `/public`, but the NPM package's output lives in `/dist`.

The frontend project gets built with

```bash
yarn dev
```

## (#Examples)

![Terrainosaurus example output](/public/assets/images/composite_noise_fractal_terrain.png)
![Terrainosaurus example 2](/public/assets/images/terrainosaurus_example2.png)
![Terrainosaurus example 3](/public/assets/images/terrainosaurus_example3.png)
![Terrainosaurus example 4](/public/assets/images/terrainosaurus_example4.png)
