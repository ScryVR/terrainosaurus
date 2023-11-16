// from https://github.com/hughsk/glsl-noise/blob/master/periodic/3d.glsl
const noise = `
float N (vec2 st) { // https://thebookofshaders.com/10/
        return fract( sin( dot( st.xy, vec2(12.9898,78.233 ) ) ) *  43758.5453123);
    }
    
    float smoothNoise( vec2 ip ){ // https://www.youtube.com/watch?v=zXsWftRdsvU
    	vec2 lv = fract( ip );
      vec2 id = floor( ip );
      
      lv = lv * lv * ( 3. - 2. * lv );
      
      float bl = N( id );
      float br = N( id + vec2( 1, 0 ));
      float b = mix( bl, br, lv.x );
      
      float tl = N( id + vec2( 0, 1 ));
      float tr = N( id + vec2( 1, 1 ));
      float t = mix( tl, tr, lv.x );
      
      return mix( b, t, lv.y );
    }

`;

const vertexShader = `
#define STANDARD

  varying vec3 vViewPosition;
  varying vec2 vUv;
  uniform float timeMsec;

  #ifdef USE_TRANSMISSION

    varying vec3 vWorldPosition;

  #endif

  #include <common>
  #include <uv_pars_vertex>
  #include <displacementmap_pars_vertex>
  #include <color_pars_vertex>
  #include <fog_pars_vertex>
  #include <normal_pars_vertex>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  #include <shadowmap_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  #include <clipping_planes_pars_vertex>

  ${noise}

  void main() {

    #include <uv_vertex>
    #include <color_vertex>
    #include <morphcolor_vertex>

    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <normal_vertex>

    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <displacementmap_vertex>
    #include <project_vertex>
    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>

    vViewPosition = - mvPosition.xyz;

    #include <worldpos_vertex>
    #include <shadowmap_vertex>
    #include <fog_vertex>

    #ifdef USE_TRANSMISSION

      vWorldPosition = worldPosition.xyz;

    #endif
    vUv = uv;
    float t = timeMsec / 400.;
    
    // VERTEX POSITION
    
    mvPosition = vec4( position, 1.0 );
    #ifdef USE_INSTANCING
    	mvPosition = instanceMatrix * mvPosition;
    #endif
    
    // DISPLACEMENT
    
    float noise = smoothNoise(mvPosition.xz * 10. + vec2(0., t - mvPosition.z * 10.));
    noise = pow(noise * 0.5 + 0.5, 2.) * 2.;
    
    // here the displacement is made stronger on the blades tips.
    float dispPower = 1. - cos( uv.y * 3.1416 * 0.5 );
    
    float displacement = noise * ( 0.3 * dispPower );
    mvPosition.z -= displacement;
    
    //
    
    vec4 modelViewPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * modelViewPosition;
}
`

AFRAME.registerShader('grass', {
  schema: {
    timeMsec: {type:'time', is:'uniform'},
    color: {type: 'color'},
    emissive: {type: 'color', default: '#0f0'},
    normalMap: {type: 'map'},
    roughness: {default: 0.5, min: 0.0, max: 1.0},
  },
  // init(data) {
  //   this.attributes = this.initVariables(data, 'attribute');
  //   this.uniforms = this.initVariables(data, 'uniform');
    // this.material = new GrassMaterial({
    //   // @ts-ignore
    //   color: data.color,
    //   vertexShader: vertexShader
    // });
  // },
  vertexShader,
  // fragmentShader: THREE.ShaderLib.physical.fragmentShader
  fragmentShader: `
  varying vec2 vUv;
  
  void main() {
  	vec3 baseColor = vec3( 0.4, 0.9, 0.4 );
    float clarity = ( vUv.y * 0.3 ) + 0.5;
    gl_FragColor = vec4( baseColor * clarity, 0.85 );
  }
  `
});

class GrassMaterial extends THREE.MeshStandardMaterial {
  constructor(parameters: any) {
    super(parameters)
    return this
  }
}