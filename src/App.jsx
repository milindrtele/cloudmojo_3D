import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

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
    camera.position.set(0, 4, 8);

    const renderer = new THREE.WebGLRenderer({antialias:true});
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

    // const light = new THREE.AmbientLight(0xffffff, 5);
    // scene.add(light);

    const texture = new THREE.TextureLoader().load('/models/thickness.png' ); 
    texture.flipY = false;

    // Light Material
    const lightMaterial = new THREE.MeshPhysicalMaterial({
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
    });

    // Dark Material
    const darkMaterial = new THREE.MeshPhysicalMaterial({
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
      //side: THREE.DoubleSide,
      thicknessMap: texture, 
    });

    const gltfLoader = new GLTFLoader();
    gltfLoader.load("/models/material_saperated_2.glb", (gltf) => {
      const lightObjects = gltf.scene.getObjectByName("light_material");
      const darkObjects = gltf.scene.getObjectByName("dark_material");

      if (lightObjects && lightObjects.children) {
        lightObjects.children.forEach((child) => {
          if (child.isMesh) {
            child.material = lightMaterial;
          }
        });
      }

      if (darkObjects && darkObjects.children) {
        darkObjects.children.forEach((child) => {
          if (child.isMesh) {
            child.material = darkMaterial;
          }
        });
      }

      scene.add(gltf.scene);
    });

    // Initialize GUI
    const gui = new GUI();

    // Add common controls function
    const addMaterialControls = (folder, material) => {
      folder.addColor({ color: `#${material.color.getHexString()}` }, "color").name("Color").onChange((value) => {
        material.color.set(value);
      });
      folder.add(material, "transmission", 0, 1).name("Transmission");
      folder.add(material, "opacity", 0, 1).name("Opacity");
      folder.add(material, "metalness", 0, 1).name("Metalness");
      folder.add(material, "roughness", 0, 1).name("Roughness");
      folder.add(material, "ior", 1, 2.5).name("IOR");
      folder.add(material, "thickness", 0, 5).name("Thickness");
      folder
        .addColor({ attenuationColor: `#${material.attenuationColor.getHexString()}` }, "attenuationColor")
        .name("Attenuation Color")
        .onChange((value) => {
          material.attenuationColor.set(value);
        });
      folder.add(material, "attenuationDistance", 0, 5).name("Attenuation Distance");
      folder.add(material, "specularIntensity", 0, 5).name("Specular Intensity");
      folder
        .addColor({ specularColor: `#${material.specularColor.getHexString()}` }, "specularColor")
        .name("Specular Color")
        .onChange((value) => {
          material.specularColor.set(value);
        });
      folder.add(material, "envMapIntensity", 0, 2).name("Env Map Intensity");
    };

    // Light Material GUI
    const lightMaterialFolder = gui.addFolder("Light Material");
    addMaterialControls(lightMaterialFolder, lightMaterial);
    lightMaterialFolder.open();

    // Dark Material GUI
    const darkMaterialFolder = gui.addFolder("Dark Material");
    addMaterialControls(darkMaterialFolder, darkMaterial);
    darkMaterialFolder.open();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      mountRef.current.removeChild(renderer.domElement);
      gui.destroy(); // Clean up the GUI
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100vh" }} />;
};

export default App;
