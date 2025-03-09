// src/Managers/SceneManager.ts

import * as THREE from 'three';

/**
 * Manager for THREE.js scene, camera, and renderer
 */
export class SceneManager {
    /**
     * Set up THREE.js scene, camera, renderer and player
     */
    public setupScene(container: HTMLElement): {
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        player: THREE.Object3D;
    } {
        try {
            console.log("Setting up THREE.js scene");

            // Check if container is valid
            if (!container) {
                throw new Error("Container element is null or undefined");
            }

            // Clear any existing canvas
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }

            // Create scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87CEEB);
            console.log("Scene created");

            // Create camera
            const camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                10000
            );
            // Position the camera initially
            camera.position.set(0, 30, 50);
            camera.lookAt(new THREE.Vector3(0, 0, 0));
            console.log("Camera created");

            // Create renderer
            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x87CEEB, 1);
            container.appendChild(renderer.domElement);
            console.log("Renderer created and added to container");

            // Add debug info
            console.log("Renderer capabilities:", {
                isWebGL2: renderer.capabilities.isWebGL2,
                maxTextures: renderer.capabilities.maxTextures,
                precision: renderer.capabilities.precision
            });

            // Force a test render to detect errors
            try {
                renderer.render(scene, camera);
                console.log("Initial render test successful");
            } catch (error) {
                console.error("Error in initial render test:", error);
            }

            // Create player object
            const player = new THREE.Object3D();
            player.position.set(2, 8, 50);
            scene.add(player);
            console.log("Player object created");

            // Create lighting
            this.setupLighting(scene);
            console.log("Lighting setup complete");

            // Create fog
            const fog = new THREE.FogExp2(0x87CEEB, 0.0005);
            scene.fog = fog;
            console.log("Fog created");

            // Add a simple test object to verify rendering
            const testGeometry = new THREE.BoxGeometry(20, 20, 20);
            const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const testCube = new THREE.Mesh(testGeometry, testMaterial);
            testCube.position.set(0, 20, 0);
            scene.add(testCube);
            console.log("Added test cube to scene");

            // Create ground
            this.createGround(scene);
            console.log("Ground created");

            // Create runway
            const runwayGroup = this.createRunway();
            scene.add(runwayGroup);
            console.log("Runway created");

            return { scene, camera, renderer, player };
        } catch (error) {
            console.error("Error setting up scene:", error);
            throw error;
        }
    }

    /**
     * Set up scene lighting
     */
    private setupLighting(scene: THREE.Scene): void {
        try {
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(100, 200, 100);
            directionalLight.castShadow = true;
            scene.add(directionalLight);

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);
        } catch (error) {
            console.error("Error setting up lighting:", error);

            // Add a basic hemispheric light if directional light fails
            const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
            scene.add(hemisphereLight);
        }
    }

    /**
     * Create the ground plane
     */
    private createGround(scene: THREE.Scene): void {
        try {
            console.log("Creating ground...");
            const textureLoader = new THREE.TextureLoader();

            // Add loading handler with multiple path options
            const tryPaths = [
                '/assets/images/grass_top.jpg',
                './assets/images/grass_top.jpg',
                '../assets/images/grass_top.jpg',
                'assets/images/grass_top.jpg'
            ];

            let textureLoaded = false;

            for (let i = 0; i < tryPaths.length; i++) {
                if (textureLoaded) break;

                const path = tryPaths[i];

                textureLoader.load(
                    path,
                    (groundTexture) => {
                        if (textureLoaded) return;
                        textureLoaded = true;

                        console.log("Ground texture loaded successfully from", path);
                        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
                        groundTexture.repeat.set(50, 100);
                        groundTexture.anisotropy = 16;

                        const ground = new THREE.Mesh(
                            new THREE.PlaneGeometry(10000, 10000),
                            new THREE.MeshLambertMaterial({ map: groundTexture, side: THREE.DoubleSide })
                        );
                        ground.rotation.x = -Math.PI / 2;
                        ground.receiveShadow = true;
                        scene.add(ground);
                        console.log("Ground created successfully");
                    },
                    undefined,
                    () => {
                        console.log(`Failed to load texture from ${path}, trying next path`);

                        // If last path failed, create a fallback ground
                        if (i === tryPaths.length - 1 && !textureLoaded) {
                            this.createFallbackGround(scene);
                        }
                    }
                );
            }

            // Create a fallback immediately as a placeholder until texture loads
            this.createFallbackGround(scene);

        } catch (error) {
            console.error("Error in createGround:", error);
            this.createFallbackGround(scene);
        }
    }

    /**
     * Create a fallback ground with solid color
     */
    private createFallbackGround(scene: THREE.Scene): void {
        console.log("Creating fallback ground with solid color");
        try {
            const fallbackGround = new THREE.Mesh(
                new THREE.PlaneGeometry(10000, 10000),
                new THREE.MeshBasicMaterial({ color: 0x7CFC00, side: THREE.DoubleSide })
            );
            fallbackGround.rotation.x = -Math.PI / 2;
            fallbackGround.receiveShadow = true;
            scene.add(fallbackGround);
            console.log("Fallback ground created successfully");
        } catch (innerError) {
            console.error("Failed to create fallback ground:", innerError);
        }
    }

    /**
     * Create the runway
     */
    private createRunway(): THREE.Group {
        const runwayGroup = new THREE.Group();
        const runwayMainGeometry = new THREE.BoxGeometry(12, 0.02, 1200);
        const runwayMainMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const runwayMain = new THREE.Mesh(runwayMainGeometry, runwayMainMaterial);
        runwayMain.receiveShadow = true;
        runwayMain.position.set(0, 1, 0);
        runwayGroup.add(runwayMain);

        const stripeCount = 12;
        const stripeWidth = 0.8;
        const stripeLength = 12;
        const gapBetweenStripes = 70;
        const stripeGeometry = new THREE.PlaneGeometry(stripeWidth, stripeLength);
        const stripeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const firstStripeZ = -(stripeCount - 1) * gapBetweenStripes * 0.5;

        for (let i = 0; i < stripeCount; i++) {
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.rotation.x = -Math.PI / 2;
            stripe.position.set(0, 1.01, firstStripeZ + i * gapBetweenStripes);
            runwayGroup.add(stripe);
        }

        const coneGeometry = new THREE.ConeGeometry(0.5, 1, 8);
        const coneMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00, emissive: 0x444400 });
        const xOffsets = [-5.5, 5.5];
        xOffsets.forEach(xPos => {
            const cone1 = new THREE.Mesh(coneGeometry, coneMaterial);
            cone1.position.set(xPos, 1, -550);
            cone1.rotation.x = -Math.PI / 2;
            runwayGroup.add(cone1);

            const cone2 = new THREE.Mesh(coneGeometry, coneMaterial);
            cone2.position.set(xPos, 1, 550);
            cone2.rotation.x = -Math.PI / 2;
            runwayGroup.add(cone2);
        });

        return runwayGroup;
    }

    /**
     * Clean up resources
     */
    public cleanup(scene: THREE.Scene | null, renderer: THREE.WebGLRenderer | null): void {
        if (scene) {
            // Dispose of geometries and materials
            scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    if (object.geometry) {
                        object.geometry.dispose();
                    }

                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => this.disposeMaterial(material));
                        } else {
                            this.disposeMaterial(object.material);
                        }
                    }
                }
            });

            // Clear scene
            while (scene.children.length > 0) {
                scene.remove(scene.children[0]);
            }
        }

        // Dispose of renderer
        if (renderer) {
            renderer.dispose();
        }
    }

    /**
     * Dispose of a THREE.js material
     */
    private disposeMaterial(material: THREE.Material): void {
        if (material instanceof THREE.MeshBasicMaterial) {
            if (material.map) material.map.dispose();
            if (material.alphaMap) material.alphaMap.dispose();
            if (material.envMap) material.envMap.dispose();
        } else if (material instanceof THREE.MeshPhongMaterial) {
            if (material.map) material.map.dispose();
            if (material.bumpMap) material.bumpMap.dispose();
            if (material.normalMap) material.normalMap.dispose();
            if (material.specularMap) material.specularMap.dispose();
            if (material.emissiveMap) material.emissiveMap.dispose();
        } else if (material instanceof THREE.MeshLambertMaterial) {
            if (material.map) material.map.dispose();
            if (material.aoMap) material.aoMap.dispose();
            if (material.envMap) material.envMap.dispose();
        }

        material.dispose();
    }
}