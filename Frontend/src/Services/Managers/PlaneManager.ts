// src/Managers/PlaneManager.ts

import * as THREE from 'three';
import { Plane } from '../../Models/PlaneModel';
import { PlaneConfigDictionary } from '../../Models/GameModels';
import networkClient from '../NetworkClient';

/**
 * Manager for creating and handling plane models
 */
export class PlaneManager {
    private scene: THREE.Scene;
    private player: THREE.Object3D;
    private showMessageCallback: (message: string) => void;
    private explosionCallback: (position: THREE.Vector3) => void;
    
    // Plane configurations
    public readonly planeConfigs: PlaneConfigDictionary;
    
    /**
     * Constructor
     */
    constructor(
        scene: THREE.Scene,
        player: THREE.Object3D,
        showMessageCallback: (message: string) => void,
        explosionCallback: (position: THREE.Vector3) => void
    ) {
        this.scene = scene;
        this.player = player;
        this.showMessageCallback = showMessageCallback;
        this.explosionCallback = explosionCallback;
        
        // Initialize plane configurations
        this.planeConfigs = this.generatePlaneConfigs();
    }
    
    /**
     * Create the initial plane for the player
     */
    public createInitialPlane(): Plane {
        try {
            // Create a plane with a specific config
            const planeType = 'planeOne';
            const plane = new Plane(
                planeType,
                this.planeConfigs[planeType],
                this.player,
                this.scene,
                this.sendBulletCreation.bind(this),
                this.showMessageCallback,
                this.explosionCallback
            );
            
            // Add plane to player
            this.player.add(plane.group);
            
            return plane;
        } catch (error) {
            console.error("Error creating initial plane:", error);
            
            // Create a simple placeholder if the plane creation fails
            const planeBox = new THREE.Mesh(
                new THREE.BoxGeometry(5, 2, 10),
                new THREE.MeshBasicMaterial({ color: 0x00ff00 })
            );
            this.player.add(planeBox);
            
            // Return a minimal plane object to prevent crashes
            return new Plane(
                'fallback',
                this.planeConfigs['planeOne'],
                this.player,
                this.scene,
                this.sendBulletCreation.bind(this),
                this.showMessageCallback,
                this.explosionCallback
            );
        }
    }
    
    /**
     * Switch to the next plane type
     */
    public switchPlane(currentPlane: Plane | null): Plane {
        if (!currentPlane) {
            return this.createInitialPlane();
        }
        
        // Remove current plane
        this.player.remove(currentPlane.group);
        
        // Determine next plane type
        let nextType: string;
        switch (currentPlane.type) {
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
        const newPlane = new Plane(
            nextType,
            this.planeConfigs[nextType],
            this.player,
            this.scene,
            this.sendBulletCreation.bind(this),
            this.showMessageCallback,
            this.explosionCallback
        );
        
        // Add new plane to player
        this.player.add(newPlane.group);
        
        return newPlane;
    }
    
    /**
     * Send bullet creation to server
     */
    private sendBulletCreation(bulletPosition: THREE.Vector3, bulletVelocity: THREE.Vector3): void {
        // This would normally forward to the network client
        networkClient.sendBulletCreation(bulletPosition, bulletVelocity);
    }
    
    /**
     * Create bullet mesh
     */
    public createBulletMesh(position: { x: number, y: number, z: number }): THREE.Mesh {
        const bulletGeometry = new THREE.SphereGeometry(1, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        bulletMesh.position.set(position.x, position.y, position.z);
        
        // Add physics properties
        bulletMesh.userData.velocity = { x: 0, y: 0, z: 0 };
        bulletMesh.userData.createdAt = Date.now();
        
        return bulletMesh;
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
}