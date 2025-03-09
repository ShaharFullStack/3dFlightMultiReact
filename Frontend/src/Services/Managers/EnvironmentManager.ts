// src/Managers/EnvironmentManager.ts

import * as THREE from 'three';
import { BalloonModel } from '../../Models/GameModels';

/**
 * Manager for creating and handling environment elements
 */
export class EnvironmentManager {
    private scene: THREE.Scene;
    private balloons: THREE.Mesh[] = [];
    private environmentCreated: boolean = false;
    
    /**
     * Constructor
     */
    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }
    
    /**
     * Create the game environment
     */
    public createEnvironment(): void {
        if (this.environmentCreated) return;
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
     * Update environment elements
     */
    public update(): void {
        // Dynamic environment updates can be added here
        // For example, moving clouds, animations, etc.
    }
    
    /**
     * Get the array of balloons
     */
    public getBalloons(): THREE.Mesh[] {
        return this.balloons;
    }
    
    /**
     * Create a basic environment if the full one fails
     */
    private createBasicEnvironment(): void {
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
    
    /**
     * Create houses for the environment
     */
    private createHouses(): void {
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
     * Create a single balloon
     */
    public createBalloon(balloonData: string | BalloonModel): THREE.Mesh | null {
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
}