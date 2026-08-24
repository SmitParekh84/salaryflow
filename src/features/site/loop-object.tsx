"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./site.module.css";

/* ---------------------------------------------------------------------------
   The hero object.

   A money bag — "Gold Bag" by Quaternius, from poly.pizza, released under CC0.
   CC0 carries no attribution obligation, so the credit here is a courtesy and a
   record of where the files came from rather than a licence term.

     source  https://poly.pizza/m/vFFblhnHtb
     files   public/models/gold-bag.glb        161 KB  (geometry)
             public/models/gold-bag-atlas.png    9 KB  (colour)

   Two files, and the second one needs explaining, because the obvious version of
   this component renders a plain white bag.

   The .glb declares its texture correctly — a standard `baseColorTexture`, no
   extensions, and a valid PNG embedded in the binary chunk. three's GLTFLoader
   nevertheless builds no texture from it: `parser.getDependency("texture", 0)`
   resolves to `null`, with no error and no warning, so the material arrives with
   `map === null`. Lighting and the material's metalness were both checked first
   and neither was the cause.

   Rather than fight the loader, the atlas was extracted from the .glb's own
   binary chunk and is loaded separately here. It costs 9 KB, it is entirely
   deterministic, and it puts the filtering under our control — which this asset
   turns out to need badly (see NearestFilter below).

   How it loads, because a landing page that costs a second before it paints has
   already lost:

     1. three.js and the loaders are imported dynamically, inside the effect.
        None of it is in the first-load bundle; the page paints without it.
     2. The CSS ring underneath stands in until the model arrives. The fold is
        never empty and never reflows — canvas and stand-in share a grid cell.
     3. Any failure anywhere in the chain leaves `ready` false and the reader
        keeps the ring. A hero object is never worth an error state.
     4. It stops: off screen, under `prefers-reduced-motion`, and in a hidden tab.
   --------------------------------------------------------------------------- */

/** Fits the model to this many world units tall, whatever scale the file uses. */
const TARGET_HEIGHT = 2.6;

export function LoopObject() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/environments/RoomEnvironment.js"),
      ]);
      if (disposed || !mount) return;

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setClearAlpha(0);
      // Tone-mapped for a light studio: the renderer's default linear output
      // crushes the highlights on a pale ground.
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        34,
        mount.clientWidth / mount.clientHeight,
        0.1,
        50,
      );
      camera.position.set(0, 0.25, 6.6);
      camera.lookAt(0, 0, 0);

      /*
       * A procedural environment. The material is authored at metallicFactor
       * 0.4, and a metallic surface with nothing to reflect renders dull and
       * grey — the metallic component takes from the diffuse colour and gives
       * nothing back. RoomEnvironment builds the reflection from geometry in
       * code, so there is no HDR file and nothing extra is downloaded. PMREM
       * pre-filters it once; the generator and the source scene are thrown away
       * immediately and only the cube texture is kept.
       */
      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomScene = new RoomEnvironment();
      const environment = pmrem.fromScene(roomScene, 0.04).texture;
      scene.environment = environment;
      pmrem.dispose();
      roomScene.traverse((node) => {
        const mesh = node as import("three").Mesh;
        if (mesh.isMesh) mesh.geometry?.dispose();
      });

      // Soft, because the environment supplies most of the light now.
      const hemi = new THREE.HemisphereLight(0xffffff, 0xdfe8ec, 0.35);
      const key = new THREE.DirectionalLight(0xffffff, 1.15);
      key.position.set(3.2, 4.2, 3.6);
      const fill = new THREE.DirectionalLight(0xcfe8e0, 0.3);
      fill.position.set(-4, -1.2, 2.4);
      scene.add(hemi, key, fill);

      // A pivot, so the model can be re-centred inside it and the rotation below
      // needs to know nothing about where the exporter left the file's origin.
      const pivot = new THREE.Group();
      scene.add(pivot);

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
        // Eased towards the pointer, never snapped to it: exact tracking is the
        // tell of a cheap mouse-follow effect.
        pointer.x += (target.x - pointer.x) * 0.045;
        pointer.y += (target.y - pointer.y) * 0.045;
        pivot.rotation.x = pointer.y * 0.3;
        pivot.rotation.y = elapsed * 0.00014 + pointer.x * 0.7;
        renderer.render(scene, camera);
      };

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

      const disposables: { dispose: () => void }[] = [];

      const start = () => {
        // One frame synchronously, so the object is there the moment the canvas
        // is. The first animation frame is not guaranteed to be soon, and never
        // arrives at all in a background tab.
        draw(0);
        setReady(true);
        if (still) return;
        frame = requestAnimationFrame(loop);
        window.addEventListener("pointermove", onPointer, { passive: true });
      };

      /*
       * The atlas, loaded and configured by hand.
       *
       * NearestFilter with no mipmaps, and that is not a stylistic choice. The
       * texture is a 1024x1024 palette: a grid of small solid swatches, mostly
       * empty white, with every face UV-mapped onto a single swatch — this
       * model's UVs all land inside a 30-pixel square near the top-left corner.
       * Linear filtering with mipmaps averages neighbouring swatches together,
       * and because most of the sheet is white, each mip level marches closer to
       * white until the model is colourless.
       */
      const texture = await new THREE.TextureLoader()
        .loadAsync("/models/gold-bag-atlas.png")
        .catch(() => null);
      if (disposed) return;

      if (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        // glTF's UV origin is the top-left corner; three's default assumes the
        // bottom-left, which would sample the empty half of the sheet.
        texture.flipY = false;
        disposables.push(texture);
      }

      new GLTFLoader().load(
        "/models/gold-bag.glb",
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;

          /*
           * Normalise the file rather than trusting it. An exported model arrives
           * at whatever scale and origin the artist worked in — this one is
           * scaled 100x — so hard-coding a scale means the hero breaks silently
           * the day the file is swapped. Measuring the bounding box and fitting
           * it to a target height makes any replacement land correctly.
           */
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          const centre = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(centre);

          const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
          model.scale.setScalar(scale);
          // Re-centre on the pivot's origin so it turns about itself rather than
          // orbiting a point somewhere off in the file's own space.
          model.position.copy(centre).multiplyScalar(-scale);

          model.traverse((child) => {
            const mesh = child as import("three").Mesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials) {
              const standard = material as import("three").MeshStandardMaterial;
              // The loader left `map` null — see the header note. This is where
              // the colour actually gets attached.
              if (texture && !standard.map) {
                standard.map = texture;
                standard.needsUpdate = true;
              }
              disposables.push(standard);
            }
            if (mesh.geometry) disposables.push(mesh.geometry);
          });

          pivot.add(model);
          start();
        },
        undefined,
        () => {
          // The model failed. `ready` stays false and the CSS ring remains, which
          // is a designed state rather than a hole in the layout.
        },
      );

      cleanup = () => {
        cancelAnimationFrame(frame);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("pointermove", onPointer);
        // GPU resources are not garbage collected: a geometry, material or
        // texture left behind on every navigation is a leak the browser cannot
        // clear for us.
        for (const item of disposables) item.dispose();
        environment.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        /*
         * Deliberately NOT `WEBGL_lose_context.loseContext()`.
         *
         * Losing the context kills it for the canvas *element*, and React re-runs
         * effects on the same element — StrictMode on every mount in development,
         * Fast Refresh on every edit. The second run then gets `null` from
         * `getContext` and the page silently falls back to the CSS ring, which is
         * the exact bug this comment exists to prevent someone re-introducing.
         */
      };
    })().catch(() => {
      // three.js or a loader failed. The CSS ring is what remains.
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, []);

  return (
    <div className={styles.objectWrap}>
      {/* Painted first, so the fold is never empty while the model is on its way,
          and it is what remains if anything in the chain fails. */}
      <div className={styles.objectGhost} data-ready={ready} aria-hidden />
      <div className={styles.objectCanvas} ref={mountRef} data-ready={ready} aria-hidden />
    </div>
  );
}
