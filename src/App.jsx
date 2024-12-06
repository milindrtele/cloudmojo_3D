import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { SSRPass } from "three/addons/postprocessing/SSRPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const App = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    const hdrEquirect = new RGBELoader()
      .setPath("/models/hdri/")
      .load("royal_esplanade_1k.hdr", function () {});

    hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = hdrEquirect;
    scene.environment = hdrEquirect;

    const light = new THREE.AmbientLight(0xffffff, 5);
    scene.add(light);

    // Create cube render target
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });

    // Create cube camera
    const cubeCamera = new THREE.CubeCamera(1, 100000, cubeRenderTarget);
    scene.add(cubeCamera);

    const params = {
      enableSSR: true,
      autoRotate: true,
      otherMeshes: true,
      groundReflector: true,
    };

    let composer;
    let ssrPass;

    // composer

    composer = new EffectComposer(renderer);
    ssrPass = new SSRPass({
      renderer,
      scene,
      camera,
      width: innerWidth,
      height: innerHeight,
    });

    composer.addPass(ssrPass);
    composer.addPass(new OutputPass());

    const loader = new GLTFLoader();
    loader.load("/models/material_saperated.glb", (gltf) => {
      scene.add(gltf.scene);
      console.log(gltf.scene);
      // const dragon = gltf.scene.getObjectByName("Dragon");
      // dragon.depthWrite = false;
      // dragon.material = new THREE.MeshPhysicalMaterial();
      // dragon.material.color.set(1, 0, 0);
      // dragon.material.transmission = 1;
      // dragon.material.opacity = 0;
      // dragon.material.metalness = 0.2;
      // dragon.material.roughness = 0;
      // dragon.material.ior = 1.5;
      // dragon.material.thickness = 2.27;
      // dragon.material.attenuationDistance = 0.155;
      // dragon.material.specularIntensity = 1;
      // dragon.material.side = THREE.DoubleSide;

      const light_material = new THREE.MeshPhysicalMaterial();
      light_material.color.set(0.62, 0.741, 1);
      light_material.transmission = 0.8;
      //material.opacity = 0;
      light_material.metalness = 0.5;
      light_material.roughness = 0.25;
      light_material.ior = 1.75;
      light_material.thickness = 5;
      light_material.attenuationDistance = 0.155;
      light_material.specularIntensity = 0.2;
      light_material.side = THREE.DoubleSide;
      // light_material.depthWrite = false;
      light_material.envMap = cubeRenderTarget.texture;
      light_material.envMapIntensity = 0.5;

      const dark_material = new THREE.MeshPhysicalMaterial();
      dark_material.color.set(0, 0.31, 1);
      dark_material.transmission = 0.8;
      //dark_material.opacity = 0;
      dark_material.metalness = 0.5;
      dark_material.roughness = 0.25;
      dark_material.ior = 1.75;
       dark_material.thickness = 5;
       dark_material.attenuationDistance = 0.155;
      dark_material.specularIntensity = 0.2;
      dark_material.side = THREE.DoubleSide;
      // dark_material.depthWrite = false;
      dark_material.envMap = cubeRenderTarget.texture;
      dark_material.envMapIntensity = 0.5;

      const light_objects = gltf.scene.getObjectByName("light_material");
      const dark_objects = gltf.scene.getObjectByName("dark_material");

      light_objects.children.forEach((object)=>{
        if (object.isMesh) {
          object.material = light_material;
        }
      })

      dark_objects.children.forEach((object)=>{
        if (object.isMesh) {
          object.material = dark_material;
        }
      })

      // let index = 100;
      // gltf.scene.children.forEach((object) => {
      //   if (object.isMesh && object.name != "Cloth_Backdrop001") {
      //     object.material = material;
      //     // object.renderOrder = index;
      //     // index--;
      //   }
      // });
    });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
      //composer.render();
      controls.update();
    };
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} />;
};

export default App;
