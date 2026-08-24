"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./site.module.css";

/* ---------------------------------------------------------------------------
   The hero object: the salary cycle, as a real object.

   A torus, because that is what the product is about. The whole argument is
   that a month is a loop that starts on payday rather than a row of calendar
   squares, and a ring is that idea with nothing added. It is also the one thing
   on this page that genuinely wants a renderer: a smooth, softly lit, slightly
   translucent surface is exactly what CSS 3D cannot do, and there is no text on
   it to be turned into a blurry texture.

   Three commitments this file has to keep, because a landing page that costs a
   second of loading has already lost:

     1. three.js is imported dynamically, inside the effect. It is never part of
        the first-load bundle — Turbopack splits it out, the page paints without
        it, and the CSS ring below stands in until it arrives. Nothing about the
        page waits for it.
     2. No assets. No HDR environment, no textures, no loaders — lighting is
        three lights and a material. There is nothing to download but the code.
     3. It stops. Off-screen it stops rendering, on `prefers-reduced-motion` it
        renders one frame and never starts a loop, and a hidden tab stops it via
        `requestAnimationFrame` on its own.
   --------------------------------------------------------------------------- */

export function LoopObject() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Everything below is disposed through this list, in reverse. GPU resources
    // are not garbage collected — a geometry and a material left behind on every
    // navigation is a leak the browser cannot clean up for us.
    let disposed = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (disposed || !mount) return;

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      // Capped at 2: past that the fill cost doubles again for a smooth surface
      // nobody can resolve the extra samples on.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setClearAlpha(0);
      // The page is white, so the object has to be tone-mapped for a light
      // studio rather than the renderer's default linear output, which crushes
      // the highlights on a pale material into flat grey.
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(
        34,
        mount.clientWidth / mount.clientHeight,
        0.1,
        50,
      );
      // Far enough back that the knot never clips its own frame as it turns:
      // at fov 34 and z 7 the visible height at the origin is 4.3 units against
      // the knot's 3.3, which leaves a margin at every rotation.
      camera.position.set(0, 0.5, 7);
      camera.lookAt(0, 0, 0);

      /*
       * A torus knot rather than a plain torus.
       *
       * A plain ring read as a doughnut — flat, and slightly comic. The knot is
       * still one continuous closed loop, which is the whole metaphor, but it
       * folds through itself so the light has something to do: you get real
       * self-shadowing and a highlight that travels, which is what makes it look
       * like an object rather than a shape.
       */
      const geometry = new THREE.TorusKnotGeometry(1.28, 0.38, 220, 32, 2, 3);

      const material = new THREE.MeshPhysicalMaterial({
        // Deeper and less saturated than the brand fill. On a page this quiet a
        // neon green object is the loudest thing on screen and undoes the
        // restraint everything else is built on; this sits with the ink instead
        // of shouting over it.
        color: new THREE.Color("#13796a"),
        roughness: 0.28,
        metalness: 0,
        // A ceramic, not a chrome. Clearcoat gives the tight specular highlight
        // that reads as a glazed surface; metalness would demand an environment
        // map to reflect, and there is no environment to load.
        clearcoat: 0.9,
        clearcoatRoughness: 0.22,
        sheen: 0.4,
        sheenColor: new THREE.Color("#a9e6d5"),
      });

      const knot = new THREE.Mesh(geometry, material);
      scene.add(knot);

      // Three lights, no environment. Hemisphere for the ambient bounce a white
      // page would really throw back, a warm key from the upper right, and a
      // cool fill from the left so the shadow side never goes to mud.
      const hemi = new THREE.HemisphereLight(0xffffff, 0xdfe8ec, 1.15);
      const key = new THREE.DirectionalLight(0xffffff, 2.1);
      key.position.set(3.2, 4.2, 3.6);
      const fill = new THREE.DirectionalLight(0x9fe8d8, 0.85);
      fill.position.set(-4, -1.4, 2.2);
      scene.add(hemi, key, fill);

      const pointer = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };

      const onPointer = (event: PointerEvent) => {
        const box = mount.getBoundingClientRect();
        target.x = (event.clientX - (box.left + box.width / 2)) / box.width;
        target.y = (event.clientY - (box.top + box.height / 2)) / box.height;
      };

      const resize = () => {
        if (!mount.clientWidth || !mount.clientHeight) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };

      const draw = (elapsed: number) => {
        // Eased towards the pointer, never snapped to it: tracking the cursor
        // exactly is the tell of a cheap mouse-follow effect.
        pointer.x += (target.x - pointer.x) * 0.045;
        pointer.y += (target.y - pointer.y) * 0.045;
        knot.rotation.x = -0.24 + pointer.y * 0.5 + Math.sin(elapsed * 0.00013) * 0.06;
        knot.rotation.y = elapsed * 0.00016 + pointer.x * 0.75;
        renderer.render(scene, camera);
      };

      // Only render while it is actually on screen. A hero object that keeps
      // drawing while the reader is at the footer is spending their battery on
      // something nobody is looking at.
      let visible = true;
      const io = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
        },
        { rootMargin: "120px" },
      );
      io.observe(mount);

      const loop = (time: number) => {
        if (visible) draw(time);
        frame = requestAnimationFrame(loop);
      };

      const ro = new ResizeObserver(() => {
        resize();
        if (still) draw(0);
      });
      ro.observe(mount);

      // One frame immediately, so the object is there the moment the canvas is,
      // rather than a blank rectangle until the first animation frame lands.
      draw(0);
      setReady(true);

      if (!still) {
        frame = requestAnimationFrame(loop);
        window.addEventListener("pointermove", onPointer, { passive: true });
      }

      cleanup = () => {
        cancelAnimationFrame(frame);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("pointermove", onPointer);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => {
      // A hero object is never worth an error boundary. If three.js fails to
      // load or the GPU refuses a context, `ready` stays false and the CSS ring
      // underneath simply remains what the reader sees.
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, []);

  return (
    <div className={styles.objectWrap}>
      {/*
        The stand-in, and the fallback. It is painted first, so the fold is never
        empty while three.js is still arriving, and it is what remains if the
        import or the GPU context fails. `data-ready` fades it out once the real
        object has drawn a frame.
      */}
      <div className={styles.objectGhost} data-ready={ready} aria-hidden />
      <div className={styles.objectCanvas} ref={mountRef} data-ready={ready} aria-hidden />
    </div>
  );
}
