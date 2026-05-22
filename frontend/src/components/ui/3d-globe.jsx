"use client";
/**
 * Globe3D — vanilla three.js + three-globe renderer.
 *
 * This deliberately avoids @react-three/fiber JSX intrinsics to sidestep
 * React 19 + CRA reconciler mismatch. We imperatively build the scene in a
 * useEffect, keep a ref to the container, and update props via a second
 * effect when markers/arcs change.
 */
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { cn } from "@/lib/utils";

const DEFAULT_EARTH_TEXTURE = "https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg";
const DEFAULT_BUMP_TEXTURE = "https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png";

export function Globe3D({ markers = [], arcs = [], className, onMarkerHover, onMarkerClick }) {
  const mountRef = useRef(null);
  const globeRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = null;

    // Camera
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 400);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(300, 200, 300);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.4);
    fillLight.position.set(-200, 100, -150);
    scene.add(fillLight);

    // Globe
    const globe = new ThreeGlobe({ waitForGlobeReady: true, animateIn: true })
      .globeImageUrl(DEFAULT_EARTH_TEXTURE)
      .bumpImageUrl(DEFAULT_BUMP_TEXTURE)
      .showAtmosphere(true)
      .atmosphereColor("#4da6ff")
      .atmosphereAltitude(0.18);

    scene.add(globe);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.enablePan = false;
    controls.minDistance = 180;
    controls.maxDistance = 700;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;

    // Stop auto-rotation instantly when the user starts dragging the globe
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
    });

    globeRef.current = globe;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    sceneRef.current = scene;
    cameraRef.current = camera;

    // Raycaster-based marker hover/click (via three-globe's built-in points)
    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();
    setReady(true);

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);

  // Update markers & arcs when data changes
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) return;

    globe
      .pointsData(markers)
      .pointLat((d) => d.lat)
      .pointLng((d) => d.lng)
      .pointColor((d) => d.accent || "#10b981")
      .pointAltitude(0.02)
      .pointRadius(0.55)
      .pointsMerge(false)
      .pointsTransitionDuration(800);

    globe
      .labelsData(markers)
      .labelLat((d) => d.lat)
      .labelLng((d) => d.lng)
      .labelText((d) => d.iata || "")
      .labelSize(0.7)
      .labelDotRadius(0.35)
      .labelColor(() => "rgba(255,255,255,0.92)")
      .labelResolution(2)
      .labelAltitude(0.04);

    const arcData = (arcs || []).map((a) => ({
      startLat: a.from.lat,
      startLng: a.from.lng,
      endLat: a.to.lat,
      endLng: a.to.lng,
      color: a.color || "#10b981",
      count: a.count || 1,
    }));
    globe
      .arcsData(arcData)
      .arcColor((a) => [a.color, a.color])
      .arcDashLength(0.4)
      .arcDashGap(0.15)
      .arcDashAnimateTime(3500)
      .arcStroke((a) => Math.min(1.8, 0.45 + (a.count || 1) * 0.22))
      .arcAltitudeAutoScale(0.4);
  }, [markers, arcs, ready]);

  // Expose hover via raycasting on points with custom pointer cursor toggles
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) return;

    globe.onPointHover((point, prevPoint) => {
      const container = mountRef.current;
      if (container) {
        container.style.cursor = point ? "pointer" : "grab";
      }
      if (onMarkerHover) {
        onMarkerHover(point, prevPoint);
      }
    });

    globe.onLabelHover((label, prevLabel) => {
      const container = mountRef.current;
      if (container) {
        container.style.cursor = label ? "pointer" : "grab";
      }
    });

    if (onMarkerClick) {
      globe.onPointClick(onMarkerClick);
      globe.onLabelClick(onMarkerClick);
    }
  }, [ready, onMarkerHover, onMarkerClick]);

  return (
    <div
      ref={mountRef}
      className={cn("relative h-full w-full", className)}
      data-testid="globe3d-canvas"
      style={{ cursor: "grab" }}
    />
  );
}

export default Globe3D;
