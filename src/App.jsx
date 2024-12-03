import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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

    const loader = new GLTFLoader();
    loader.load("/models/saperated_copy.glb", (gltf) => {
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

      const material = new THREE.MeshPhysicalMaterial();
      material.color.set(0.192, 0.592, 1);
      material.transmission = 1;
      material.opacity = 0;
      material.metalness = 0.2;
      material.roughness = 0.3;
      material.ior = 1.75;
      material.thickness = 5;
      material.attenuationDistance = 0.155;
      material.specularIntensity = 0.2;
      material.side = THREE.DoubleSide;
      material.depthWrite = false;

      let index = 100;
      gltf.scene.children.forEach((object) => {
        if (
          object.isMesh &&
          object.name != "Cloth_Backdrop001" &&
          object.name != "box"
        ) {
          console.log(object.name);
          object.material = material;
          object.renderOrder = index;
          index--;
        }
      });
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
