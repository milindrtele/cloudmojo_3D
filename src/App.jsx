import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { SSRPass } from "three/addons/postprocessing/SSRPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const App = () => {
  const mountRef = useRef(null);
  const paramsRef = useRef(null);

  const darkMaterialRef = useRef(null);
  const lightMaterialRef = useRef(null);

  const cubeRenderTargetRef = useRef(null);

  //const sphereRef = useRef(null);

  const lightObjectsRef = useRef(null);
  const darkObjectsRef = useRef(null);

  useEffect(() => {
    paramsRef.current = {
      enableSSR: false,
      enableCubeCamera: false,
      enableThicknessMap: true,
    };

    const stats = Stats();
    document.body.appendChild(stats.dom);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 4, 8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      stencil: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    const hdrEquirect = new RGBELoader()
      .setPath("/models/hdri/")
      .load("royal_esplanade_1k.hdr", () => {
        hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = hdrEquirect;
        scene.environment = hdrEquirect;
      });

    const light = new THREE.DirectionalLight(0xffffff, 5);
    light.castShadow = true;
    scene.add(light);

    // renderer.shadowMap.enabled = true;
    // renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    // light.shadow.mapSize.width = 512; // default is 1024
    // light.shadow.mapSize.height = 512; // default is 1024
    // light.shadow.camera.near = 0.1;
    // light.shadow.camera.far = 50;
    // light.shadow.camera.right = 5;
    // light.shadow.camera.left = - 5;
    // light.shadow.camera.top	= 5;
    // light.shadow.camera.bottom = - 5;
    // light.shadow.mapSize.width = 2048;
    // light.shadow.mapSize.height = 2048;
    // light.shadow.radius = 4;
    // light.shadow.bias = -0.0005;

    const texture = new THREE.TextureLoader().load("/models/thickness.png");
    texture.flipY = false;

    cubeRenderTargetRef.current = new THREE.WebGLCubeRenderTarget(256);
    cubeRenderTargetRef.current.texture.type = THREE.HalfFloatType;

    const cubeCamera = new THREE.CubeCamera(
      1,
      1000,
      cubeRenderTargetRef.current
    );

    // Light Material
    lightMaterialRef.current = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 1,
      opacity: 1,
      metalness: 0,
      roughness: 0.35,
      ior: 1.75,
      thickness: 1,
      attenuationColor: new THREE.Color(0xdbf6ff),
      attenuationDistance: 0.4,
      specularIntensity: 1,
      specularColor: new THREE.Color(0xffffff),
      envMapIntensity: 1,
      //side: THREE.DoubleSide,
      thicknessMap: texture,
      //envMap: cubeRenderTargetRef.current.texture,
    });

    // Dark Material
    darkMaterialRef.current = new THREE.MeshPhysicalMaterial({
      transparent: false,
      color: 0xffffff,
      transmission: 1,
      opacity: 1,
      metalness: 0,
      roughness: 0.35,
      ior: 1.75,
      thickness: 1,
      attenuationColor: new THREE.Color(0x1cbcf2),
      attenuationDistance: 0.4,
      specularIntensity: 1,
      specularColor: new THREE.Color(0xffffff),
      envMapIntensity: 1,
      side: THREE.DoubleSide,
      thicknessMap: texture,
      //envMap: cubeRenderTargetRef.current.texture,
    });



    const gltfLoader = new GLTFLoader();
    gltfLoader.load("/models/material_saperated_2.glb", (gltf) => {
      console.log(gltf.scene);

      gltf.scene.children.forEach((object) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      lightObjectsRef.current = gltf.scene.getObjectByName("light_material");
      darkObjectsRef.current = gltf.scene.getObjectByName("dark_material");

      const monitor = gltf.scene.getObjectByName("Cube077");
      cubeCamera.position.copy(monitor.position);

      if (lightObjectsRef.current && lightObjectsRef.current.children) {
        lightObjectsRef.current.children.forEach((child) => {
          if (child.isMesh) {
            child.material = lightMaterialRef.current;
          }
        });
      }

      if (darkObjectsRef.current && darkObjectsRef.current.children) {
        darkObjectsRef.current.children.forEach((child) => {
          if (child.isMesh) {
            child.material = darkMaterialRef.current.clone();
            if(child.name == "Cube097"){
              console.log("found");
              child.material.side = THREE.DoubleSide;
            }else if(child.name == "Cube093"){
              child.material.side = THREE.DoubleSide;
            }
          }
        });
      }

      scene.add(gltf.scene);

      // sphereRef.current = gltf.scene.getObjectByName("Sphere");
      // // Stencil setup for the target object
      // const stencilMaterial = new THREE.MeshBasicMaterial({
      //   color: 0xff0000,
      //   depthWrite: false,
      //   stencilWrite: true,
      //   stencilFunc: THREE.AlwaysStencilFunc,
      //   stencilRef: 1,
      //   stencilZPass: THREE.ReplaceStencilOp,
      // });
      // sphereRef.current.material = stencilMaterial;
    });

    // Initialize GUI
    const gui = new GUI();

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
      roughnessFade: 1.0, // Adjust for better response to roughness
    });

    composer.addPass(ssrPass);
    composer.addPass(new OutputPass());

    const addParameterControls = (folder, parameters) => {
      folder.add(parameters, "enableSSR").name("Enable SSR");
      folder.add(parameters, "enableCubeCamera").name("Enable CubeCamera");
      // folder.add(parameters, "enableThicknessMap").name("Enable Thickness Map").onChange((value)=>{
      //   console.log(value);
      //   if(value){
      //     darkMaterialRef.current.thicknessMap = texture;
      //     lightMaterialRef.current.thicknessMap = texture;
      //     console.log(darkMaterialRef.current);
      //   }else{
      //     darkMaterialRef.current.thicknessMap = null;
      //     lightMaterialRef.current.thicknessMap = null;
      //     console.log(darkMaterialRef.current);
      //   }
      // });
    };

    // Add common controls function
    const addMaterialControls = (folder, material) => {
      folder
        .addColor({ color: `#${material.color.getHexString()}` }, "color")
        .name("Color")
        .onChange((value) => {
          material.color.set(value);
        });
      folder.add(material, "transmission", 0, 1).name("Transmission");
      folder.add(material, "opacity", 0, 1).name("Opacity");
      folder.add(material, "metalness", 0, 1).name("Metalness");
      folder.add(material, "roughness", 0, 1).name("Roughness");
      folder.add(material, "ior", 1, 2.5).name("IOR");
      folder.add(material, "thickness", 0, 5).name("Thickness");
      folder
        .addColor(
          { attenuationColor: `#${material.attenuationColor.getHexString()}` },
          "attenuationColor"
        )
        .name("Attenuation Color")
        .onChange((value) => {
          material.attenuationColor.set(value);
        });
      folder
        .add(material, "attenuationDistance", 0, 5)
        .name("Attenuation Distance");
      folder
        .add(material, "specularIntensity", 0, 5)
        .name("Specular Intensity");
      folder
        .addColor(
          { specularColor: `#${material.specularColor.getHexString()}` },
          "specularColor"
        )
        .name("Specular Color")
        .onChange((value) => {
          material.specularColor.set(value);
        });
      folder.add(material, "envMapIntensity", 0, 2).name("Env Map Intensity");
    };

    // Light Material GUI
    const otherParameters = gui.addFolder("Other Parameters");
    addParameterControls(otherParameters, paramsRef.current);
    otherParameters.open();

    // Light Material GUI
    const lightMaterialFolder = gui.addFolder("Light Material");
    addMaterialControls(lightMaterialFolder, lightMaterialRef.current);
    //lightMaterialFolder.open();

    // Dark Material GUI
    const darkMaterialFolder = gui.addFolder("Dark Material");
    addMaterialControls(darkMaterialFolder, darkMaterialRef.current);
    //darkMaterialFolder.open();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    const animate = () => {
      stats.update();
      requestAnimationFrame(animate);

      // Temporarily disable HDRI for CubeCamera updates
      scene.environment = null;
      if (paramsRef.current.enableCubeCamera)
        cubeCamera.update(renderer, scene);
      scene.environment = hdrEquirect; // Re-enable HDRI

      controls.update();
      if (paramsRef.current.enableSSR) {
        composer.render();
      } else  {
        renderer.render(scene, camera);
        // renderer.clearStencil(); // Clear stencil before rendering
        // renderer.clear(); // Clear the canvas
        // renderer.autoClear = false; // Prevent clearing between renders

        // // Render occluding objects to stencil buffer
        // darkObjectsRef.current.children.forEach((object) => {
        //   object.material.stencilWrite = true;
        //   object.material.stencilRef = 1;
        //   object.material.stencilFunc = THREE.AlwaysStencilFunc;
        //   object.material.stencilZPass = THREE.ReplaceStencilOp;
        // });
        // renderer.render(scene, camera);

        // // Render the sphere only where stencil test passes
        // sphereRef.current.material.stencilWrite = true;
        // sphereRef.current.material.stencilFunc = THREE.EqualStencilFunc;
        // sphereRef.current.material.stencilRef = 1;
        // renderer.render(scene, camera);

        // renderer.autoClear = true; // Restore autoClear behavior
      }
    };
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      mountRef.current.removeChild(renderer.domElement);
      gui.destroy(); // Clean up the GUI
    };
  }, []);

  useEffect(() => {
    if (paramsRef.current.enableCubeCamera) {
      darkMaterialRef.current.envMap = cubeRenderTargetRef.current.texture;
      lightMaterialRef.current.envMap = cubeRenderTargetRef.current.texture;
    }
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100vh" }} />;
};

export default App;
