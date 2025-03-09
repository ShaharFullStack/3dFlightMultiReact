// src/Services/GameService.ts - Critical Rendering Fixes

import * as THREE from 'three';
import { BalloonModel, CameraView, GameSettings, GameState, PlayerModel, PlaneConfigDictionary, BulletModel } from '../Models/GameModels';
import { Plane } from '../Models/PlaneModel';
import networkClient from './NetworkClient';

/**
 * Service for managing game state and logic
 */
export class GameService {
    // Game state
    private gameSettings: GameSettings = {
        multiplayerEnabled: false,
        currentCameraView: CameraView.TPS,
        gameStarted: false,
        score: 0,
        difficultyLevel: 1
    };
    private mousePosition: { x: number, y: number } = { x: 0, y: 0 };
    private mouseLookEnabled: boolean = false;
    private mouseSensitivity: number = 0.2;
    private targetCameraRotation: THREE.Euler = new THREE.Euler();
    private currentCameraRotation: THREE.Euler = new THREE.Euler();
    private rotationSmoothing: number = 0.1;

    // THREE.js objects
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private player: THREE.Object3D | null = null;

    // Game objects
    private currentPlane: Plane | null = null;
    private balloons: THREE.Mesh[] = [];
    private remotePlayers: Record<string, PlayerModel> = {};
    private cameraOffsets: Record<string, THREE.Vector3> = {
        [CameraView.FPS]: new THREE.Vector3(0, 2, -1),    // Front cockpit view
        [CameraView.TPS]: new THREE.Vector3(0, 10, 30),   // Third-person view
        [CameraView.TPS_FAR]: new THREE.Vector3(0, 40, 80) // Far third-person view
    };

    private setupMouseControls(): void {
        const gameContainer = this.renderer?.domElement.parentElement;
        
        if (!gameContainer) {
            console.error("Cannot set up mouse controls: game container not found");
            return;
        }
        
        // Track mouse movement when pointer is locked
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === gameContainer) {
                this.mousePosition.x += e.movementX;
                this.mousePosition.y += e.movementY;
                
                // Update target rotation based on mouse movement
                this.targetCameraRotation.y -= e.movementX * this.mouseSensitivity * 0.01;
                this.targetCameraRotation.x -= e.movementY * this.mouseSensitivity * 0.01;
                
                // Clamp vertical rotation to prevent camera flipping
                this.targetCameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetCameraRotation.x));
            }
        });
        // Toggle pointer lock on container click
        gameContainer.addEventListener('click', () => {
            if (!this.mouseLookEnabled) return;
            
            if (document.pointerLockElement !== gameContainer) {
                gameContainer.requestPointerLock();
            }
        });
        
        // Handle pointer lock change
        document.addEventListener('pointerlockchange', () => {
            this.mouseLookEnabled = document.pointerLockElement === gameContainer;
        });
        
        // Add key handler for enabling/disabling mouse look
        window.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') {
                this.toggleMouseLook();
            }
        });
        
        console.log("Mouse controls initialized");
    }

    public toggleMouseLook(): void {
        this.mouseLookEnabled = !this.mouseLookEnabled;
        
        const gameContainer = this.renderer?.domElement.parentElement;
        
        if (this.mouseLookEnabled && gameContainer) {
            gameContainer.requestPointerLock();
            this.showMessage("Mouse look enabled - Click game to capture mouse");
        } else {
            document.exitPointerLock();
            this.showMessage("Mouse look disabled");
        }
    }

    private switchCamera(): void {
        const views = Object.keys(this.cameraOffsets) as CameraView[];
        const currentIndex = views.indexOf(this.gameSettings.currentCameraView);
        const nextIndex = (currentIndex + 1) % views.length;
    
        this.gameSettings.currentCameraView = views[nextIndex];
        
        // Reset camera rotation when switching modes
        this.targetCameraRotation.set(0, 0, 0);
        this.currentCameraRotation.set(0, 0, 0);
        this.mousePosition = { x: 0, y: 0 };
    
        // Update HUD
        if (this.updateHUDCallback) {
            this.updateHUDCallback(this.gameSettings);
        }
    
        // Show message
        this.showMessage(`Camera: ${this.gameSettings.currentCameraView}`);
    }

    // Keyboard state
    private keys: Record<string, boolean> = {};

    // Animation frame ID for game loop
    private animationFrameId: number | null = null;

    // Chat messages for multiplayer
    private chatMessages: string[] = [];

    // Environment state
    private environmentCreated: boolean = false;

    // Debugging elements
    private debugCube: THREE.Mesh | null = null;

    // Callbacks
    private showMessageCallback: ((message: string) => void) | null = null;
    private updateHUDCallback: ((settings: GameSettings) => void) | null = null;

    /**
     * Standard plane configurations
     */
    public readonly planeConfigs: PlaneConfigDictionary = this.generatePlaneConfigs();

    /**
     * Initialize the game
     */
    public initialize(
        showMessageCallback: (message: string) => void,
        updateHUDCallback: (settings: GameSettings) => void
    ): void {
        try {
            console.log("Initializing game service");
            this.showMessageCallback = showMessageCallback;
            this.updateHUDCallback = updateHUDCallback;

            // Set up keyboard event listeners
            this.setupKeyboardListeners();
            console.log("Keyboard listeners initialized");
        } catch (error) {
            console.error("Error initializing game service:", error);
            throw error;
        }
    }

    /**
     * Set up THREE.js scene, camera, renderer and player
     */
    public setupScene(container: HTMLElement): void {
        try {
            console.log("Setting up THREE.js scene");

            // Force WebGL detection check
            if (!window.WebGLRenderingContext) {
                console.error("WebGL is not supported by your browser");
                this.showMessage("WebGL is not supported by your browser");
                return;
            }

            // Check if container is valid
            if (!container) {
                console.error("Container element is null or undefined");
                return;
            }

            // Clear any existing canvas
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }

            // Create scene first
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB); // Set sky blue background
            console.log("Scene created");

            // Add simple ambient light immediately for visibility
            const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
            this.scene.add(ambientLight);

            // Create camera with proper positioning
            this.camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                10000
            );
            // Position the camera initially for visibility
            this.camera.position.set(0, 30, 50);
            this.camera.lookAt(0, 0, 0);
            console.log("Camera created");

            // Create renderer with explicit parameters
            try {
                this.renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: false,
                    powerPreference: 'default',
                    canvas: undefined,
                    context: undefined,
                    precision: 'highp',
                    premultipliedAlpha: true,
                    preserveDrawingBuffer: false,
                    logarithmicDepthBuffer: false
                });

                // Set renderer size explicitly to match container
                this.renderer.setSize(
                    container.clientWidth || window.innerWidth,
                    container.clientHeight || window.innerHeight
                );
                this.renderer.setPixelRatio(window.devicePixelRatio);

                // Set clear color to ensure visibility
                this.renderer.setClearColor(0x87CEEB, 1);

                // Append canvas to container
                container.appendChild(this.renderer.domElement);
                console.log("Renderer created and added to container");

                // Make sure the renderer canvas has the correct size
                this.renderer.domElement.style.width = '100%';
                this.renderer.domElement.style.height = '100%';
                this.renderer.domElement.style.display = 'block';

                // Add debug info
                console.log("Renderer capabilities:", {
                    isWebGL2: this.renderer.capabilities.isWebGL2,
                    maxTextures: this.renderer.capabilities.maxTextures,
                    precision: this.renderer.capabilities.precision
                });
            } catch (error) {
                console.error("Failed to create WebGL renderer:", error);
                this.showMessage("Failed to create 3D renderer. Try a different browser.");
                return;
            }

            // Create a large visible debug cube to ensure rendering works
            const cubeGeometry = new THREE.BoxGeometry(20, 20, 20);
            const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            this.debugCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            this.debugCube.position.set(0, 10, 0);
            this.scene.add(this.debugCube);
            console.log("Added debug cube to scene");

            // Perform a single render to test
            if (this.renderer && this.scene && this.camera) {
                console.log("Performing initial render test");
                this.renderer.render(this.scene, this.camera);
            }

            // Create player object
            this.player = new THREE.Object3D();
            this.player.position.set(2, 8, 50);
            if (this.scene) this.scene.add(this.player);
            console.log("Player object created");

            // Create ground
            this.createBasicGround();
            console.log("Basic ground created");

            // Make player object available globally
            window.player = this.player;

            // Handle window resize
            window.addEventListener('resize', this.handleResize.bind(this));
            console.log("Window resize handler attached");

            // Create the initial plane
            this.createInitialPlane();
            console.log("Initial plane created");

            // FIX: Add createEnvironment call here
            this.createEnvironment();
            console.log("Environment created");
        } catch (error) {
            console.error("Error setting up scene:", error);
            // FIX: Add fallback ground if scene setup fails
            this.createFallbackGround();
            throw error;
        }
    }

    /**
     * Create a basic flat ground
     */
    private createBasicGround(): void {
        if (!this.scene) return;

        try {
            // Create a simple green ground plane
            const groundGeometry = new THREE.PlaneGeometry(10000, 10000);
            const groundMaterial = new THREE.MeshBasicMaterial({
                color: 0x7CFC00,
                side: THREE.DoubleSide
            });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = 0;
            this.scene.add(ground);
        } catch (error) {
            console.error("Error creating basic ground:", error);
            // FIX: Call fallback ground creation if basic ground fails
            this.createFallbackGround();
        }
    }

    /**
     * Create the initial plane for the player
     */
    private createInitialPlane(): void {
        if (!this.scene || !this.player) return;

        try {
            // Create a basic visible box as a fallback plane
            const planeBox = new THREE.Mesh(
                new THREE.BoxGeometry(5, 2, 10),
                new THREE.MeshBasicMaterial({ color: 0x00ff00 })
            );
            this.player.add(planeBox);

            // Try to create the actual plane
            const planeType = 'planeOne';
            this.currentPlane = new Plane(
                planeType,
                this.planeConfigs[planeType],
                this.player,
                this.scene,
                this.sendBulletCreation.bind(this),
                this.showMessage.bind(this),
                this.createEnhancedExplosion.bind(this)
            );

            // Remove the fallback if real plane creation succeeded
            if (this.currentPlane) {
                this.player.remove(planeBox);
                this.player.add(this.currentPlane.group);
                window.currentPlane = this.currentPlane;
            }
        } catch (error) {
            console.error("Error creating initial plane:", error);
            // Fallback plane already added
        }
    }
    /**
     * Create a fallback ground with solid color
     */
    private createFallbackGround(): void {
        if (!this.scene) return;

        console.log("Creating fallback ground with solid color");
        try {
            const fallbackGround = new THREE.Mesh(
                new THREE.PlaneGeometry(10000, 10000),
                new THREE.MeshBasicMaterial({ color: 0x7CFC00, side: THREE.DoubleSide })
            );
            fallbackGround.rotation.x = -Math.PI / 2;
            fallbackGround.receiveShadow = true;
            this.scene.add(fallbackGround);
            console.log("Fallback ground created successfully");
        } catch (innerError) {
            console.error("Failed to create fallback ground:", innerError);
        }
    }

    /**
     * Create the runway
     */
    // private createRunway(): THREE.Group {
    //     const runwayGroup = new THREE.Group();
    //     const runwayMainGeometry = new THREE.BoxGeometry(12, 0.02, 1200);
    //     const runwayMainMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    //     const runwayMain = new THREE.Mesh(runwayMainGeometry, runwayMainMaterial);
    //     runwayMain.receiveShadow = true;
    //     runwayMain.position.set(0, 1, 0);
    //     runwayGroup.add(runwayMain);

    //     const stripeCount = 12;
    //     const stripeWidth = 0.8;
    //     const stripeLength = 12;
    //     const gapBetweenStripes = 70;
    //     const stripeGeometry = new THREE.PlaneGeometry(stripeWidth, stripeLength);
    //     const stripeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    //     const firstStripeZ = -(stripeCount - 1) * gapBetweenStripes * 0.5;

    //     for (let i = 0; i < stripeCount; i++) {
    //         const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    //         stripe.rotation.x = -Math.PI / 2;
    //         stripe.position.set(0, 1.01, firstStripeZ + i * gapBetweenStripes);
    //         runwayGroup.add(stripe);
    //     }

    //     const coneGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    //     const coneMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00, emissive: 0x444400 });
    //     const xOffsets = [-5.5, 5.5];
    //     xOffsets.forEach(xPos => {
    //         const cone1 = new THREE.Mesh(coneGeometry, coneMaterial);
    //         cone1.position.set(xPos, 1, -550);
    //         cone1.rotation.x = -Math.PI / 2;
    //         runwayGroup.add(cone1);

    //         const cone2 = new THREE.Mesh(coneGeometry, coneMaterial);
    //         cone2.position.set(xPos, 1, 550);
    //         cone2.rotation.x = -Math.PI / 2;
    //         runwayGroup.add(cone2);
    //     });

    //     return runwayGroup;
    // }

    /**
     * Handle window resize
     */
    private handleResize(): void {
        if (!this.camera || !this.renderer) {
            console.error("Cannot handle resize: camera or renderer is null");
            return;
        }

        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        console.log(`Resized renderer to ${width}x${height}`);

        // Force a render after resize
        if (this.scene) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Set up keyboard event listeners
     */
    private setupKeyboardListeners(): void {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    /**
     * Handle special key presses
     */
    private handleSpecialKeys(key: string): void {
        if (!this.currentPlane) return;

        switch (key) {
            case 'p':
            case 'P':
                this.switchPlane();
                break;

            case 'c':
            case 'C':
                this.switchCamera();
                break;

            case 'r':
            case 'R':
                this.currentPlane.startBarrelRoll();
                break;

            case 'm':
            case 'M':
                // Toggle multiplayer handled in Game component
                break;
        }
    }

    /**
     * Switch to next plane type
     */
    public switchPlane(): void {
        if (!this.player || !this.currentPlane || !this.scene) return;

        // Remove current plane
        this.player.remove(this.currentPlane.group);

        // Determine next plane type
        let nextType: string;
        switch (this.currentPlane.type) {
            case 'planeOne':
                nextType = 'planeTwo';
                break;
            case 'planeTwo':
                nextType = 'planeThree';
                break;
            case 'planeThree':
                nextType = 'planeOne';
                break;
            default:
                nextType = 'planeOne';
        }

        // Create new plane
        this.currentPlane = new Plane(
            nextType,
            this.planeConfigs[nextType],
            this.player,
            this.scene,
            this.sendBulletCreation.bind(this),
            this.showMessage.bind(this),
            this.createEnhancedExplosion.bind(this)
        );

        // Add new plane to player
        this.player.add(this.currentPlane.group);

        // Update global reference
        window.currentPlane = this.currentPlane;

        // Show message
        this.showMessage(`מטוס: ${nextType}`);
    }

    /**
     * Show in-game message
     */
    private showMessage(message: string): void {
        if (this.showMessageCallback) {
            this.showMessageCallback(message);
        }
    }

    /**
     * Start the main game loop
     */
    public startGameLoop(): void {
        // Set game as started
        this.gameSettings.gameStarted = true;

        // Update HUD
        if (this.updateHUDCallback) {
            this.updateHUDCallback(this.gameSettings);
        }

        console.log("Starting animation loop");
        // Start animation loop
        this.animate();
    }

    /**
     * Main animation loop
     */
    private animate = (): void => {
        // Cancel any existing animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Request next frame
        this.animationFrameId = requestAnimationFrame(this.animate);

        try {
            // Rotate debug cube if it exists
            if (this.debugCube) {
                this.debugCube.rotation.x += 0.01;
                this.debugCube.rotation.y += 0.01;
            }

            // Update player and camera if they exist
            if (this.player && this.camera) {
                // Simple movement for testing
                if (this.keys['ArrowUp']) this.player.position.z -= 1;
                if (this.keys['ArrowDown']) this.player.position.z += 1;
                if (this.keys['ArrowLeft']) this.player.position.x -= 1;
                if (this.keys['ArrowRight']) this.player.position.x += 1;

                // Update camera position
                const cameraOffset = this.cameraOffsets[this.gameSettings.currentCameraView];
                this.camera.position.copy(this.player.position).add(cameraOffset);
                this.camera.lookAt(this.player.position);
            }

            // Update current plane if it exists
            if (this.currentPlane) {
                this.currentPlane.update(this.keys);

                // FIX: Add collision detection for bullets and balloons
                if (this.currentPlane.bullets.length > 0 && this.balloons.length > 0) {
                    this.checkCollisions(this.currentPlane.bullets, this.balloons);
                }
            }

            // FIX: Add environment updates
            this.updateEnvironment();

            // Render scene
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            } else {
                console.error("Cannot render: renderer, scene, or camera is missing");
            }
        } catch (error) {
            console.error("Error in animation loop:", error);
        }
    }
    /**
     * Create game environment
     */
    private createEnvironment(): void {
        if (this.environmentCreated || !this.scene) return;
        this.environmentCreated = true;

        try {
            const textureLoader = new THREE.TextureLoader();

            // Create river
            this.createRiver(textureLoader);

            // Create houses
            this.createHouses();

            // Create clouds
            this.createClouds();

            // Create balloons
            this.createBalloons();
        } catch (error) {
            console.error("Error creating environment:", error);

            // Create some basic placeholder objects if environment creation fails
            this.createBasicEnvironment();
        }
    }

    /**
     * Create a basic environment if the full one fails
     */
    private createBasicEnvironment(): void {
        if (!this.scene) return;

        // Create some simple balloons
        for (let i = 0; i < 20; i++) {
            const balloon = new THREE.Mesh(
                new THREE.SphereGeometry(6, 8, 8),
                new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff })
            );
            balloon.position.set(
                (Math.random() - 0.5) * 1000,
                100 + Math.random() * 200,
                (Math.random() - 0.5) * 1000
            );
            balloon.userData.id = `balloon-${i}`;
            balloon.userData.active = true;
            this.scene.add(balloon);
            this.balloons.push(balloon);
        }
    }

    /**
     * Create river for the environment
     */
    private createRiver(textureLoader: THREE.TextureLoader): void {
        if (!this.scene) return;

        try {
            // Define river curve
            const riverCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-4000, 1, -2000),
                new THREE.Vector3(-3000, 1, -1000),
                new THREE.Vector3(-2000, 1, 0),
                new THREE.Vector3(-1000, 1, 1000),
                new THREE.Vector3(0, 1, 2000),
                new THREE.Vector3(1000, 1, 3000),
                new THREE.Vector3(2000, 1, 4000)
            ]);

            const riverRadius = 80;
            const points = riverCurve.getPoints(300);
            const positions = [];
            const uvs = [];

            for (let i = 0; i < points.length - 1; i++) {
                const current = points[i];
                const next = points[i + 1];
                const tangent = new THREE.Vector3().subVectors(next, current).normalize();
                const up = new THREE.Vector3(0, 1, 0);
                const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

                const leftCurrent = new THREE.Vector3().copy(current).addScaledVector(side, -riverRadius);
                const rightCurrent = new THREE.Vector3().copy(current).addScaledVector(side, riverRadius);
                const leftNext = new THREE.Vector3().copy(next).addScaledVector(side, -riverRadius);
                const rightNext = new THREE.Vector3().copy(next).addScaledVector(side, riverRadius);

                positions.push(leftCurrent.x, leftCurrent.y, leftCurrent.z);
                positions.push(rightCurrent.x, rightCurrent.y, rightCurrent.z);
                positions.push(rightNext.x, rightNext.y, rightNext.z);
                positions.push(leftCurrent.x, leftCurrent.y, leftCurrent.z);
                positions.push(rightNext.x, rightNext.y, rightNext.z);
                positions.push(leftNext.x, leftNext.y, leftNext.z);

                const t1 = i / points.length;
                const t2 = (i + 1) / points.length;
                uvs.push(0, t1, 1, t1, 1, t2);
                uvs.push(0, t1, 1, t2, 0, t2);
            }

            const riverGeometry = new THREE.BufferGeometry();
            riverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            riverGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            riverGeometry.computeVertexNormals();

            // Use a basic color instead of texture
            const riverMaterial = new THREE.MeshPhongMaterial({ color: 0x3333ff, shininess: 100 });
            const riverMesh = new THREE.Mesh(riverGeometry, riverMaterial);
            riverMesh.receiveShadow = true;
            this.scene.add(riverMesh);
        } catch (error) {
            console.error("Error creating river:", error);
            // If river creation fails, skip it
        }
    }

    // Other methods from the original class remain the same

    /**
     * Create houses for the environment
     */
    private createHouses(): void {
        if (!this.scene) return;

        try {
            for (let i = 0; i < 500; i++) { // Reduced from 2000 to 500 for performance
                let x, z;
                do {
                    x = (Math.random() - 0.5) * 9000;
                    z = (Math.random() - 0.5) * 9000;
                } while (this.isInRunwayZone(x, z) || this.isInRiverZone(x, z));

                const size = 50 + Math.random() * 100;
                const color = new THREE.Color(Math.random(), Math.random(), Math.random());
                const houseGeometry = new THREE.BoxGeometry(size, size, size);
                const houseMaterial = new THREE.MeshPhongMaterial({ color });
                const house = new THREE.Mesh(houseGeometry, houseMaterial);
                house.position.set(x, size / 2, z);
                this.scene.add(house);
            }
        } catch (error) {
            console.error("Error creating houses:", error);
        }
    }

    /**
     * Create clouds for the environment
     */
    private createClouds(): void {
        if (!this.scene) return;

        try {
            const cloudGeometry = new THREE.SphereGeometry(20, 8, 8);
            const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });

            for (let i = 0; i < 100; i++) { // Reduced from 500 to 100 for performance
                const cloud = new THREE.Group();
                const numBlobs = 6 + Math.floor(Math.random() * 5);

                for (let j = 0; j < numBlobs; j++) {
                    const blob = new THREE.Mesh(cloudGeometry, cloudMaterial);
                    blob.position.set(
                        Math.random() * 30 - 10,
                        Math.random() * 20,
                        Math.random() * 25 - 10
                    );
                    blob.scale.set(
                        0.8 + Math.random() * 0.9,
                        0.8 + Math.random() * 0.8,
                        0.8 + Math.random() * 0.4
                    );
                    cloud.add(blob);
                }

                cloud.position.set(
                    (Math.random() - 0.5) * 5000,
                    600 + Math.random() * 200,
                    (Math.random() - 0.5) * 5000
                );

                this.scene.add(cloud);
            }
        } catch (error) {
            console.error("Error creating clouds:", error);
        }
    }

    /**
     * Create balloons for the game
     */
    private createBalloons(): void {
        if (!this.scene) return;

        try {
            for (let i = 0; i < 50; i++) {
                this.createBalloon(`balloon-${i}`);
            }
        } catch (error) {
            console.error("Error creating balloons:", error);
            // Create basic balloons if the regular creation fails
            this.createBasicBalloons();
        }
    }

    /**
     * Create basic balloons if the regular method fails
     */
    private createBasicBalloons(): void {
        if (!this.scene) return;

        for (let i = 0; i < 50; i++) {
            const balloon = new THREE.Mesh(
                new THREE.SphereGeometry(6, 8, 8),
                new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff })
            );
            balloon.position.set(
                (Math.random() - 0.5) * 1000,
                100 + Math.random() * 200,
                (Math.random() - 0.5) * 1000
            );
            balloon.userData.id = `balloon-${i}`;
            balloon.userData.active = true;
            this.scene.add(balloon);
            this.balloons.push(balloon);
        }
    }

    /**
     * Check if a position is in the river zone
     */
    private isInRiverZone(x: number, z: number): boolean {
        const riverCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-4000, 1, -2000),
            new THREE.Vector3(-3000, 1, -1000),
            new THREE.Vector3(-2000, 1, 0),
            new THREE.Vector3(-1000, 1, 1000),
            new THREE.Vector3(0, 1, 2000),
            new THREE.Vector3(1000, 1, 3000),
            new THREE.Vector3(2000, 1, 4000)
        ]);

        const riverRadius = 80;
        const samples = 100;
        let minDist = Infinity;

        // Continuing GameService.ts from where it left off
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const cp = riverCurve.getPoint(t);
            const dist = new THREE.Vector2(x, z).distanceTo(new THREE.Vector2(cp.x, cp.z));
            if (dist < minDist) minDist = dist;
        }

        return minDist < riverRadius * 1.2;
    }

    /**
    * Check if a position is in the runway zone
    */
    private isInRunwayZone(x: number, z: number): boolean {
        const runwayMinX = -100;
        const runwayMaxX = 100;
        const runwayMinZ = -600;
        const runwayMaxZ = 600;

        return (x >= runwayMinX && x <= runwayMaxX && z >= runwayMinZ && z <= runwayMaxZ);
    }

    /**
    * Update environment
    */
    private updateEnvironment(): void {
        // Dynamic environment updates can be added here in the future

        // Check for bullets hitting remote players in multiplayer mode
        if (this.gameSettings.multiplayerEnabled) {
            this.checkBulletPlayerCollisions();
        }
    }

    /**
    * Check for collisions between bullets and balloons
    */
    private checkCollisions(bullets: THREE.Mesh[], balloonList: THREE.Mesh[]): void {
        for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = bullets[bulletIndex];

            for (let balloonIndex = balloonList.length - 1; balloonIndex >= 0; balloonIndex--) {
                const balloon = balloonList[balloonIndex];
                if (!balloon.userData.active) continue;

                const distance = bullet.position.distanceTo(balloon.position);

                if (distance < 15) {
                    // In multiplayer, notify the server about this hit
                    if (this.gameSettings.multiplayerEnabled) {
                        networkClient.sendBalloonHit(balloon.userData.id, balloon.position);
                    }

                    this.createEnhancedExplosion(balloon.position);

                    if (this.scene) {
                        this.scene.remove(balloon);
                    }

                    balloonList.splice(balloonIndex, 1);

                    if (this.scene) {
                        this.scene.remove(bullet);
                    }

                    bullets.splice(bulletIndex, 1);

                    // Increase score
                    this.gameSettings.score += 10;
                    this.updateDifficulty();

                    // Update HUD
                    if (this.updateHUDCallback) {
                        this.updateHUDCallback(this.gameSettings);
                    }

                    // In multiplayer, don't immediately recreate balloon - server will do that
                    if (!this.gameSettings.multiplayerEnabled) {
                        // Create a new balloon to replace the popped one
                        this.createBalloon(`balloon-${Date.now()}`);
                    }

                    break;
                }
            }
        }
    }

    /**
    * Check for bullets hitting remote players
    */
    private checkBulletPlayerCollisions(): void {
        if (!this.currentPlane || !this.remotePlayers) return;

        const bullets = this.currentPlane.bullets;
        const COLLISION_THRESHOLD = 15;

        for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = bullets[bulletIndex];

            // Check against each remote player
            Object.keys(this.remotePlayers).forEach(remoteId => {
                const remotePlayer = this.remotePlayers[remoteId];

                if (!remotePlayer || !remotePlayer.object) return;

                const remotePlayerObj = remotePlayer.object;
                const distance = bullet.position.distanceTo(remotePlayerObj.position);

                if (distance < COLLISION_THRESHOLD) {
                    // Hit detected!
                    const hitPosition = bullet.position.clone();

                    // Remove the bullet
                    if (this.scene) {
                        this.scene.remove(bullet);
                    }

                    bullets.splice(bulletIndex, 1);

                    // Create hit effect
                    this.createEnhancedExplosion(hitPosition);

                    // Show message
                    this.showMessage(`Hit player ${remotePlayer.name || remoteId.substring(0, 8)}`);

                    // Let the server know about the hit
                    networkClient.sendPlayerHit(remoteId, hitPosition);
                }
            });
        }
    }

    /**
    * Update game difficulty based on score
    */
    private updateDifficulty(): void {
        if (this.gameSettings.score >= 100 && this.gameSettings.difficultyLevel < 2) {
            this.gameSettings.difficultyLevel = 2;
            this.showMessage("רמת קושי עלתה ל-2!");
        } else if (this.gameSettings.score >= 200 && this.gameSettings.difficultyLevel < 3) {
            this.gameSettings.difficultyLevel = 3;
            this.showMessage("רמת קושי עלתה ל-3!");
        }
    }

    /**
     * Create enhanced explosion effect
     */
    public createEnhancedExplosion(position: THREE.Vector3): void {
        if (!this.scene) return;

        try {
            // Simple explosion effect
            const explosionGeometry = new THREE.SphereGeometry(5, 16, 16);
            const explosionMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.8
            });
            const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
            explosion.position.copy(position);
            this.scene.add(explosion);

            // Animate the explosion
            let scale = 1.0;
            const expandExplosion = () => {
                scale += 0.1;
                explosion.scale.set(scale, scale, scale);
                explosion.material.opacity -= 0.05;

                if (explosion.material.opacity > 0) {
                    requestAnimationFrame(expandExplosion);
                } else {
                    this.scene?.remove(explosion);
                }
            };
            expandExplosion();
        } catch (error) {
            console.error("Error creating explosion:", error);
        }
    }

    /**
    * Send bullet creation to server
    */

    private sendBulletCreation(bulletPosition: THREE.Vector3, bulletVelocity: THREE.Vector3): void {
        if (this.gameSettings.multiplayerEnabled) {
            networkClient.sendBulletCreation(bulletPosition, bulletVelocity);
        }
    }

    /**
    * A single balloon
    */
    public createBalloon(balloonData: string | BalloonModel): THREE.Mesh | null {
        if (!this.scene) return null;

        try {
            const balloonGeometry = new THREE.SphereGeometry(6, 16, 16);

            // Use the balloon color from server data or generate a random one
            const balloonColor = (typeof balloonData === 'object' && balloonData.color)
                ? balloonData.color
                : new THREE.Color(Math.random(), Math.random(), Math.random());

            const balloonMaterial = new THREE.MeshLambertMaterial({
                color: balloonColor
            });

            const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
            balloon.castShadow = true;

            // Use position from server data or generate random position
            if (typeof balloonData === 'object' && balloonData.position) {
                balloon.position.set(
                    balloonData.position.x,
                    balloonData.position.y,
                    balloonData.position.z
                );
            } else {
                balloon.position.set(
                    (Math.random() - 0.5) * 2500,
                    10 + Math.random() * 1500,
                    (Math.random() - 0.5) * 1000
                );
            }

            // Add unique ID to the balloon for multiplayer tracking
            const balloonId = (typeof balloonData === 'object' && balloonData.id)
                ? balloonData.id
                : (typeof balloonData === 'string' ? balloonData : `balloon-${Date.now()}-${Math.random()}`);

            balloon.userData.id = balloonId;

            // Set active state if provided
            if (typeof balloonData === 'object' && balloonData.hasOwnProperty('active')) {
                balloon.userData.active = balloonData.active;
            } else {
                balloon.userData.active = true;
            }

            this.scene.add(balloon);
            this.balloons.push(balloon);

            return balloon;
        } catch (error) {
            console.error("Error creating balloon:", error);
            return null;
        }
    }

    /**
    * Initialize multiplayer
    */
    public initializeMultiplayer(gameState: GameState): void {
        // Set players from the server
        if (gameState && gameState.players) {
            // Create remote player objects
            Object.keys(gameState.players).forEach(id => {
                if (id !== networkClient.getPlayerId()) {
                    this.addRemotePlayer(id, gameState.players[id]);
                }
            });
        }

        // Set balloons from the server
        if (gameState && gameState.balloons) {
            // Clear current balloons
            this.balloons.forEach(balloon => {
                if (this.scene) {
                    this.scene.remove(balloon);
                }
            });
            this.balloons = [];

            // Create balloons from server data
            gameState.balloons.forEach(balloon => {
                this.createBalloon(balloon);
            });
        }
    }

    /**
    * Clean up multiplayer resources
    */
    public cleanupMultiplayer(): void {
        // Remove remote players
        Object.keys(this.remotePlayers).forEach(id => {
            this.removeRemotePlayer(id);
        });

        // Reset remote players object
        this.remotePlayers = {};
    }

    /**
    * Add a remote player
    */
    public addRemotePlayer(id: string, playerData: PlayerModel): void {
        if (!this.scene) return;

        try {
            // Use the plane type sent from the remote player
            const planeType = playerData.planeType || 'planeOne';
            const planeConfig = playerData.planeConfig || this.planeConfigs[planeType];

            // Create a new plane for the remote player
            const remotePlane = new Plane(
                planeType,
                planeConfig,
                new THREE.Object3D(), // Temporary object
                this.scene,
                () => { }, // No-op for sendBulletCreation
                () => { }, // No-op for showMessage
                this.createEnhancedExplosion.bind(this)
            );

            // Create remote player object
            const remotePlayerObj = new THREE.Object3D();
            remotePlayerObj.add(remotePlane.group);

            // Set position from server data
            if (playerData.position) {
                remotePlayerObj.position.set(
                    playerData.position.x || 0,
                    playerData.position.y || 0,
                    playerData.position.z || 0
                );
            }

            // Set orientation from server data
            if (playerData.quaternion) {
                remotePlayerObj.quaternion.set(
                    playerData.quaternion._x || 0,
                    playerData.quaternion._y || 0,
                    playerData.quaternion._z || 0,
                    playerData.quaternion._w || 1
                );
            }

            // Create a name tag for the remote player
            const displayName = playerData.name || id.substring(0, 8);
            const nameTag = this.createPlayerNameTag(displayName);
            nameTag.position.set(0, 10, 0);
            remotePlayerObj.add(nameTag);

            // Create health bar for the remote player
            const healthBar = this.createHealthBar();
            healthBar.position.set(0, 12, 0);
            remotePlayerObj.add(healthBar);

            // Add to scene
            this.scene.add(remotePlayerObj);

            // Store remote player data
            this.remotePlayers[id] = {
                id: id,
                name: displayName,
                position: playerData.position,
                quaternion: playerData.quaternion,
                planeType: planeType,
                planeConfig: planeConfig,
                score: playerData.score || 0,
                health: playerData.health || 100,
                bullets: [],
                object: remotePlayerObj,
                plane: remotePlane,
                healthBar: healthBar
            };

            console.log(`Created remote player: ${displayName}`);
        } catch (error) {
            console.error('Error creating remote player:', error);
        }
    }

    /**
    * Create a player name tag
    */
    private createPlayerNameTag(name: string): THREE.Sprite {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;

            if (context) {
                context.fillStyle = 'rgba(0, 0, 0, 0.5)';
                context.fillRect(0, 0, canvas.width, canvas.height);

                context.font = 'Bold 24px Arial';
                context.fillStyle = '#ffffff';
                context.textAlign = 'center';
                context.fillText(name, canvas.width / 2, canvas.height / 2 + 8);
            }

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(20, 5, 1);

            return sprite;
        } catch (error) {
            console.error('Error creating player name tag:', error);
            // Return a default sprite if there's an error
            const material = new THREE.SpriteMaterial({ color: 0xffffff });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(10, 2, 1);
            return sprite;
        }
    }

    /**
    * Create a health bar
    */
    private createHealthBar(): THREE.Sprite {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 100;
            canvas.height = 10;

            if (context) {
                // Background
                context.fillStyle = 'rgba(0, 0, 0, 0.5)';
                context.fillRect(0, 0, canvas.width, canvas.height);

                // Health fill
                context.fillStyle = '#00ff00';
                context.fillRect(2, 2, 96, 6);
            }

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(15, 2, 1);

            return sprite;
        } catch (error) {
            console.error('Error creating health bar:', error);
            // Return a default sprite if there's an error
            const material = new THREE.SpriteMaterial({ color: 0x00ff00 });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(15, 2, 1);
            return sprite;
        }
    }

    /**
    * Update a remote player's health bar
    */
    private updateRemotePlayerHealthBar(playerId: string): void {
        const remotePlayer = this.remotePlayers[playerId];
        if (!remotePlayer || !remotePlayer.healthBar) return;

        try {
            const health = remotePlayer.health;
            const healthBar = remotePlayer.healthBar;

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 100;
            canvas.height = 10;

            if (context) {
                // Background
                context.fillStyle = 'rgba(0, 0, 0, 0.5)';
                context.fillRect(0, 0, canvas.width, canvas.height);

                // Health fill - color changes based on health level
                let fillColor;
                if (health > 60) {
                    fillColor = '#00ff00'; // Green
                } else if (health > 30) {
                    fillColor = '#ffff00'; // Yellow
                } else {
                    fillColor = '#ff0000'; // Red
                }

                context.fillStyle = fillColor;
                context.fillRect(2, 2, Math.max(0, health * 0.96), 6); // Width based on health percentage
            }

            // Update the texture
            const texture = new THREE.CanvasTexture(canvas);
            healthBar.material.map?.dispose();
            healthBar.material.map = texture;
            healthBar.material.needsUpdate = true;
        } catch (error) {
            console.error('Error updating health bar:', error);
        }
    }

    /**
    * Update a remote player's position and properties
    */
    public updateRemotePlayer(id: string, position: any, quaternion: any, planeType: string, planeConfig: any): void {
        if (!id || !this.remotePlayers[id] || !this.remotePlayers[id].object) return;

        try {
            const remotePlayer = this.remotePlayers[id];
            const remotePlayerObj = remotePlayer.object;

            // Update position - with safety checks
            if (position) {
                remotePlayerObj.position.set(
                    position.x !== undefined ? position.x : remotePlayerObj.position.x,
                    position.y !== undefined ? position.y : remotePlayerObj.position.y,
                    position.z !== undefined ? position.z : remotePlayerObj.position.z
                );
            }

            // Update orientation - with safety checks
            if (quaternion) {
                remotePlayerObj.quaternion.set(
                    quaternion._x !== undefined ? quaternion._x : remotePlayerObj.quaternion.x,
                    quaternion._y !== undefined ? quaternion._y : remotePlayerObj.quaternion.y,
                    quaternion._z !== undefined ? quaternion._z : remotePlayerObj.quaternion.z,
                    quaternion._w !== undefined ? quaternion._w : remotePlayerObj.quaternion.w
                );
            }

            // Update plane type if changed
            const currentPlaneConfig = remotePlayer.planeConfig;
            if ((planeType && remotePlayer.planeType !== planeType) ||
                (planeConfig && JSON.stringify(currentPlaneConfig) !== JSON.stringify(planeConfig))) {

                try {
                    if (this.scene) {
                        // Remove the old plane
                        remotePlayerObj.remove(remotePlayer.plane.group);

                        // Create a new plane with updated properties
                        const newPlane = new Plane(
                            planeType || remotePlayer.planeType,
                            planeConfig || this.planeConfigs[planeType || remotePlayer.planeType],
                            remotePlayerObj,
                            this.scene,
                            () => { }, // No-op for sendBulletCreation
                            () => { }, // No-op for showMessage
                            this.createEnhancedExplosion.bind(this)
                        );

                        // Update the remote player's plane reference
                        remotePlayer.plane = newPlane;
                        remotePlayer.planeType = planeType || remotePlayer.planeType;
                        remotePlayer.planeConfig = planeConfig || currentPlaneConfig;

                        // Add the new plane to the remote player object
                        remotePlayerObj.add(newPlane.group);
                    }
                } catch (error) {
                    console.error('Error updating remote player plane:', error);
                }
            }
        } catch (error) {
            console.error('Error updating remote player:', error);
        }
    }

    /**
    * Remove a remote player
    */
    public removeRemotePlayer(id: string): void {
        if (!id || !this.remotePlayers[id]) return;

        try {
            const remotePlayer = this.remotePlayers[id];

            if (this.scene && remotePlayer.object) {
                this.scene.remove(remotePlayer.object);
            }

            if (remotePlayer.bullets && remotePlayer.bullets.length > 0) {
                remotePlayer.bullets.forEach(bullet => {
                    if (bullet && this.scene && bullet instanceof THREE.Object3D) {
                        this.scene.remove(bullet);
                    }
                });
            }
            delete this.remotePlayers[id];
            console.log(`Removed remote player: ${id}`);
        } catch (error) {
            console.error('Error removing remote player:', error);
        }
    }

    /**
    * Create a bullet fired by a remote player
    */
    public createRemoteBullet(bullet: BulletModel): void {
        if (!bullet || !this.scene) return;

        try {
            const bulletMesh = this.createBulletMesh(bullet.position);

            // Add unique ID to the bullet
            bulletMesh.userData.id = bullet.id;
            bulletMesh.userData.playerId = bullet.playerId;
            bulletMesh.userData.velocity = bullet.velocity;
            bulletMesh.userData.createdAt = bullet.createdAt;

            // Add to scene
            this.scene.add(bulletMesh);

            if (bullet.playerId && this.remotePlayers[bullet.playerId]) {
                if (!this.remotePlayers[bullet.playerId].bullets) {
                    this.remotePlayers[bullet.playerId].bullets = [];
                }
                const bulletModel: BulletModel = {
                    id: bullet.id,
                    playerId: bullet.playerId,
                    position: bullet.position,
                    velocity: bullet.velocity,
                    createdAt: bullet.createdAt
                };
                this.remotePlayers[bullet.playerId].bullets.push(bulletModel);
            }

            this.detectBulletCollisions(bulletMesh);
        } catch (error) {
            console.error('Error creating remote bullet:', error);
        }
    }

    /**
    * Update remote bullets array for a player
    */
    public updateRemoteBullets(playerId: string, bullets: any[]): void {
        if (!this.scene || !playerId || !this.remotePlayers[playerId]) return;

        try {
            const remotePlayer = this.remotePlayers[playerId];

            // Remove old bullets from scene
            if (remotePlayer.bullets && remotePlayer.bullets.length > 0) {
                remotePlayer.bullets.forEach(bullet => {
                    if (bullet) {
                        this.scene?.remove();
                    }
                });
            }

            // Reset bullets array
            remotePlayer.bullets = [];

            // Create new bullets based on updated data
            bullets.forEach(bulletData => {
                if (bulletData) {
                    this.createRemoteBullet({
                        id: bulletData.id,
                        playerId: playerId,
                        position: bulletData.position,
                        velocity: bulletData.velocity,
                        createdAt: bulletData.createdAt
                    });
                }
            });
        } catch (error) {
            console.error('Error updating remote bullets:', error);
        }
    }

    /**
    * Check if a bullet hits any player
    */
    private detectBulletCollisions(bullet: THREE.Mesh): void {
        if (!bullet || !this.player) return;

        const checkCollisions = () => {
            if (!bullet || !this.scene?.getObjectById(bullet.id)) return;

            try {
                if (bullet.userData.playerId !== networkClient.getPlayerId()) {
                    const distance = bullet.position.distanceTo(this.player!.position);

                    if (distance < 15) {
                        if (this.scene) {
                            this.scene.remove(bullet);
                        }
                        this.createEnhancedExplosion(bullet.position);
                        return;
                    }
                }

                if (bullet && this.scene?.getObjectById(bullet.id)) {
                    requestAnimationFrame(checkCollisions);
                }
            } catch (error) {
                console.error('Error in bullet collision detection:', error);
            }
        };

        requestAnimationFrame(checkCollisions);
    }

    /**
    * Handle a balloon hit
    */
    public handleBalloonHit(balloonId: string, playerId: string, position: any, newScore: number): void {
        // Find the balloon by ID
        const balloonIndex = this.balloons.findIndex(balloon => balloon.userData.id === balloonId);

        if (balloonIndex !== -1) {
            // Create explosion at balloon position
            this.createEnhancedExplosion(this.balloons[balloonIndex].position);

            // Remove the balloon
            if (this.scene) {
                this.scene.remove(this.balloons[balloonIndex]);
            }

            this.balloons.splice(balloonIndex, 1);

            // Update player score
            if (playerId === networkClient.getPlayerId()) {
                this.gameSettings.score = newScore;

                // Update HUD
                if (this.updateHUDCallback) {
                    this.updateHUDCallback(this.gameSettings);
                }
            } else if (this.remotePlayers[playerId]) {
                this.remotePlayers[playerId].score = newScore;
            }
        }
    }

    /**
    * Handle a player hit
    */
    public handlePlayerHit(targetId: string, shooterId: string, position: any, newHealth: number): void {
        // Create explosion at hit position
        const hitPosition = new THREE.Vector3(position.x, position.y, position.z);
        this.createEnhancedExplosion(hitPosition);

        if (targetId === networkClient.getPlayerId() && this.currentPlane) {
            // Local player was hit - update health
            this.currentPlane.health = newHealth;
            this.currentPlane.updateHealthBar();
            this.currentPlane.flashDamage();
        } else if (this.remotePlayers[targetId]) {
            // Remote player was hit - update health
            this.remotePlayers[targetId].health = newHealth;
            this.updateRemotePlayerHealthBar(targetId);
        }
    }

    /**
    * Handle a player being killed
    */
    public handlePlayerKilled(targetId: string, shooterId: string, position: any): void {
        // Create explosion at death position
        const deathPosition = new THREE.Vector3(position.x, position.y, position.z);

        // Create multiple explosions for bigger effect
        for (let i = 0; i < 3; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            this.createEnhancedExplosion(deathPosition.clone().add(offset));
        }

        if (targetId === networkClient.getPlayerId() && this.currentPlane) {
            // Local player was killed - handle respawn (done on the client)
            this.currentPlane.die();
        } else if (this.remotePlayers[targetId]) {
            // Remote player was killed - reset health
            this.remotePlayers[targetId].health = 100;
            this.updateRemotePlayerHealthBar(targetId);
        }
    }

    /**
    * Add a chat message
    */
    public addChatMessage(message: string): void {
        this.chatMessages.push(message);

        // Limit the number of chat messages stored
        if (this.chatMessages.length > 50) {
            this.chatMessages.shift();
        }
    }

    /**
    * Get the chat messages
    */
    public getChatMessages(): string[] {
        return this.chatMessages;
    }

    /**
    * Generate plane configurations
    */
    private generatePlaneConfigs(): PlaneConfigDictionary {
        const randomColor1 = Math.random() * 0xffffff;
        const randomColor2 = Math.random() * 0xffffff;

        return {
            planeOne: {
                body: { width: 0.8, height: 0.8, length: 4, color: randomColor1 },
                nose: { width: 0.6, height: 0.6, length: 0.8, position: { x: 0, y: -0.1, z: -0.4 } },
                guns: [
                    { width: 0.2, height: 0.1, length: 1.2, color: randomColor1, position: { x: 0, y: 0, z: 0 } },
                    { width: 0.2, height: 0.1, length: 1.2, color: randomColor1, position: { x: -2, y: 0.2, z: 0 }, rotationZ: Math.PI / 2 },
                    { width: 0.2, height: 0.1, length: 1.2, color: randomColor1, position: { x: 2, y: 0.2, z: 0 }, rotationZ: Math.PI / 2 }
                ],
                wing: { width: 7, height: 0.1, length: 1.2, color: randomColor2, position: { x: 0, y: 0.3, z: 0 } },
                tailWing: { width: 2.2, height: 0.1, length: 0.8, position: { x: 0, y: 0.2, z: 1.8 } },
                stabilizer: { width: 0.1, height: 0.8, length: 1.2, position: { x: 0, y: 0.5, z: 1.8 } },
                windows: { width: 0.9, height: 1.2, length: 0.5, color: randomColor2, opacity: 0.5, position: { x: 0, y: 0.5, z: -0.6 } },
                wheels: [
                    { x: -1, y: -0.2, z: 0 },
                    { x: 1, y: -0.2, z: 0 },
                    { x: 0, y: -0.2, z: -1.5 }
                ],
                scale: { x: 5, y: 5, z: 5 }
            },
            planeTwo: {
                body: { width: 0.6, height: 0.6, length: 3, color: randomColor2 },
                nose: { width: 0.7, height: 0.7, length: 0.3, position: { x: 0, y: -0.1, z: -0.4 } },
                guns: [
                    { width: 0.3, height: 0.3, length: 1.2, color: randomColor2, position: { x: 0, y: 0, z: 0 } },
                    { width: 0.3, height: 0.3, length: 1.2, color: randomColor2, position: { x: -2.5, y: 0.2, z: 0 }, rotationZ: Math.PI / 2 },
                    { width: 0.3, height: 0.3, length: 1.2, color: randomColor2, position: { x: 2.5, y: 0.2, z: 0 }, rotationZ: Math.PI / 2 }
                ],
                wing: { width: 8, height: 0.05, length: 1.2, color: randomColor1, position: { x: 0, y: 0.3, z: 0 } },
                tailWing: { width: 2.2, height: 0.1, length: 0.8, position: { x: 0, y: 0.2, z: 1.8 } },
                stabilizer: { width: 0.1, height: 0.8, length: 1.2, position: { x: 0, y: 0.5, z: 1.8 } },
                windows: { width: 0.9, height: 1.2, length: 0.5, color: randomColor2, opacity: 0.5, position: { x: 0, y: 0.5, z: -0.6 } },
                wheels: [
                    { x: -1, y: -0.2, z: 0 },
                    { x: 1, y: -0.2, z: 0 },
                    { x: 0, y: -0.2, z: -1.5 }
                ],
                scale: { x: 5, y: 5, z: 5 }
            },
            planeThree: {
                body: { width: 0.9, height: 0.5, length: 3.5, color: 0x5588ff },
                nose: { width: 0.5, height: 0.5, length: 1.0, position: { x: 0, y: -0.1, z: -0.4 } },
                guns: [
                    { width: 0.15, height: 0.15, length: 1.5, color: 0xff0000, position: { x: -1, y: 0, z: -1 } },
                    { width: 0.15, height: 0.15, length: 1.5, color: 0xff0000, position: { x: 1, y: 0, z: -1 } }
                ],
                wing: { width: 6, height: 0.08, length: 1.5, color: 0x555555, position: { x: 0, y: 0.2, z: 0.5 } },
                tailWing: { width: 3, height: 0.08, length: 0.7, position: { x: 0, y: 0.2, z: 1.8 } },
                stabilizer: { width: 0.08, height: 1.2, length: 0.7, position: { x: 0, y: 0.5, z: 1.8 } },
                windows: { width: 0.7, height: 0.7, length: 0.6, color: 0x88aaff, opacity: 0.6, position: { x: 0, y: 0.4, z: -0.6 } },
                wheels: [
                    { x: -1.2, y: -0.2, z: 0.2 },
                    { x: 1.2, y: -0.2, z: 0.2 },
                    { x: 0, y: -0.2, z: -1.2 }
                ],
                scale: { x: 5, y: 5, z: 5 }
            }
        };
    }

    /**
    * Clean up resources when exiting the game
    */
    /**
     * Clean up resources when exiting the game
     */
    public cleanup(): void {
        // Cancel animation frame
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove event listeners
        window.removeEventListener('resize', this.handleResize.bind(this));

        // Clean up THREE.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }

        // Reset state
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.currentPlane = null;
        this.balloons = [];
        this.remotePlayers = {};
        this.keys = {};
        this.gameSettings.gameStarted = false;
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
        // Add more material types as needed

        material.dispose();
    }

    /**
    * Create bullet mesh
    */
    private createBulletMesh(position: { x: number, y: number, z: number }): THREE.Mesh {
        const bulletGeometry = new THREE.SphereGeometry(1, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);

        bulletMesh.position.set(position.x, position.y, position.z);

        // Add physics properties
        bulletMesh.userData.velocity = { x: 0, y: 0, z: 0 };
        bulletMesh.userData.createdAt = Date.now();

        return bulletMesh;
    }
}

// Create a singleton instance
// Create a singleton instance
const gameService = new GameService();
export default gameService;

// Add types to window object for TypeScript
declare global {
    interface Window {
        player: THREE.Object3D;
        currentPlane: any;
    }
}