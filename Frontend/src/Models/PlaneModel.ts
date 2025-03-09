// src/Models/PlaneModel.ts

import * as THREE from 'three';
import { PlaneConfig, PlaneObject } from './GameModels';

export class Plane implements PlaneObject {
    public type: string;
    public config: PlaneConfig;
    public group: THREE.Group;
    public speed: number;
    public maxSpeed: number;
    public speedIncrement: number;
    public liftCoefficient: number;
    public dragCoefficient: number;
    public minSpeedForLift: number;
    public gravity: number;
    public orientation: THREE.Quaternion;
    public euler: THREE.Euler;
    public isDoingBarrelRoll: boolean;
    public barrelRollStartTime: number;
    public barrelRollDuration: number;
    public bullets: THREE.Mesh[];
    public lastShotTime: number;
    public shootCooldown: number;
    public bulletSpeed: number;
    public health: number;
    public isInvulnerable: boolean;
    public respawnProtectionTime: number;
    public healthBar: THREE.Sprite;
    public respawnTime: number;
    public player: THREE.Object3D;
    public scene: THREE.Scene;
    public sendBulletCreation: (position: THREE.Vector3, velocity: THREE.Vector3) => void;
    public showMessage: (message: string) => void;
    public createEnhancedExplosion: (position: THREE.Vector3) => void;

    constructor(
        type: string, 
        config: PlaneConfig, 
        player: THREE.Object3D,
        scene: THREE.Scene,
        sendBulletCreation: (position: THREE.Vector3, velocity: THREE.Vector3) => void,
        showMessage: (message: string) => void,
        createEnhancedExplosion: (position: THREE.Vector3) => void
    ) {
        this.type = type;
        this.config = config;
        this.player = player;
        this.scene = scene;
        this.sendBulletCreation = sendBulletCreation;
        this.showMessage = showMessage;
        this.createEnhancedExplosion = createEnhancedExplosion;
        
        this.group = this.createPlane(config);
        this.speed = 0;
        this.maxSpeed = 2.0;
        this.speedIncrement = 0.1;
        this.liftCoefficient = 0.08;
        this.dragCoefficient = 0.004;
        this.minSpeedForLift = 0.5;
        this.gravity = 0.0098;
        this.orientation = new THREE.Quaternion();
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.isDoingBarrelRoll = false;
        this.barrelRollStartTime = 0;
        this.barrelRollDuration = 1000;
        this.bullets = [];
        this.lastShotTime = 0;
        this.shootCooldown = 100;
        this.bulletSpeed = 5;
        
        // Health system
        this.health = 100;
        this.isInvulnerable = false;
        this.respawnProtectionTime = 3000; // 3 seconds of invulnerability after respawn
        this.respawnTime = 0;
        this.healthBar = this.createHealthBar();
        this.group.add(this.healthBar);
        this.healthBar.position.set(0, 10, 0);
    }

    createPlane(config: PlaneConfig): THREE.Group {
        const planeGroup = new THREE.Group();

        // Plane body
        const bodyGeo = new THREE.BoxGeometry(config.body.width, config.body.height, config.body.length);
        const bodyMat = new THREE.MeshPhongMaterial({ color: config.body.color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        planeGroup.add(body);

        // Nose
        const noseGeo = new THREE.BoxGeometry(config.nose.width, config.nose.height, config.nose.length);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.position.set(
            config.nose.position?.x || 0,
            config.nose.position?.y || 0,
            config.nose.position?.z || 0
        );
        planeGroup.add(nose);

        // Guns
        config.guns.forEach(gunConfig => {
            const gunGeo = new THREE.BoxGeometry(gunConfig.width, gunConfig.height, gunConfig.length);
            const gunMat = new THREE.MeshPhongMaterial({ color: gunConfig.color });
            const gun = new THREE.Mesh(gunGeo, gunMat);
            gun.position.set(
                gunConfig.position?.x || 0,
                gunConfig.position?.y || 0,
                gunConfig.position?.z || 0
            );
            if (gunConfig.rotationZ) gun.rotation.z = gunConfig.rotationZ;
            planeGroup.add(gun);
        });

        // Wings
        const wingGeo = new THREE.BoxGeometry(config.wing.width, config.wing.height, config.wing.length);
        const wingMat = new THREE.MeshPhongMaterial({ color: config.wing.color });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.set(
            config.wing.position?.x || 0,
            config.wing.position?.y || 0,
            config.wing.position?.z || 0
        );
        planeGroup.add(wings);

        // Tail
        const tailWingGeo = new THREE.BoxGeometry(config.tailWing.width, config.tailWing.height, config.tailWing.length);
        const tailWing = new THREE.Mesh(tailWingGeo, wingMat);
        tailWing.position.set(
            config.tailWing.position?.x || 0,
            config.tailWing.position?.y || 0,
            config.tailWing.position?.z || 0
        );
        planeGroup.add(tailWing);

        // Stabilizers
        const stabilizerGeo = new THREE.BoxGeometry(config.stabilizer.width, config.stabilizer.height, config.stabilizer.length);
        const stabilizer = new THREE.Mesh(stabilizerGeo, wingMat);
        stabilizer.position.set(
            config.stabilizer.position?.x || 0,
            config.stabilizer.position?.y || 0,
            config.stabilizer.position?.z || 0
        );
        planeGroup.add(stabilizer);

        // Windows
        const windowGeo = new THREE.BoxGeometry(config.windows.width, config.windows.height, config.windows.length);
        const windowMat = new THREE.MeshPhongMaterial({
            color: config.windows.color,
            transparent: true,
            opacity: config.windows.opacity
        });
        const windows = new THREE.Mesh(windowGeo, windowMat);
        windows.position.set(
            config.windows.position?.x || 0,
            config.windows.position?.y || 0,
            config.windows.position?.z || 0
        );
        planeGroup.add(windows);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
        const wheelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        config.wheels.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, pos.y, pos.z);
            planeGroup.add(wheel);
        });

        // Scale the plane
        planeGroup.scale.set(config.scale.x, config.scale.y, config.scale.z);

        return planeGroup;
    }

    // Create a health bar for the plane
    createHealthBar(): THREE.Sprite {
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
    }

    // Update the health bar based on current health
    updateHealthBar(): void {
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
            if (this.health > 60) {
                fillColor = '#00ff00'; // Green
            } else if (this.health > 30) {
                fillColor = '#ffff00'; // Yellow
            } else {
                fillColor = '#ff0000'; // Red
            }
            
            context.fillStyle = fillColor;
            context.fillRect(2, 2, Math.max(0, this.health * 0.96), 6); // Width based on health percentage
        }
        
        // Update the texture
        const texture = new THREE.CanvasTexture(canvas);
        this.healthBar.material.map?.dispose();
        this.healthBar.material.map = texture;
        this.healthBar.material.needsUpdate = true;
    }

    update(keys: Record<string, boolean>): void {
        if (this.isDoingBarrelRoll) {
            this.updateBarrelRoll();
        } else {
            if (keys['w'] || keys['W']) this.euler.x -= 0.005;
            if (keys['s'] || keys['S']) this.euler.x += 0.005;
            if (keys['a'] || keys['A']) {
                this.euler.z += 0.005;
                this.euler.y += 0.005;
            }
            if (keys['d'] || keys['D']) {
                this.euler.z -= 0.005;
                this.euler.y -= 0.005;
            }
            if (keys['q'] || keys['Q']) this.euler.y += 0.015;
            if (keys['e'] || keys['E']) this.euler.y -= 0.015;
            this.updateQuaternion();
        }
    
        if (keys['ArrowUp']) this.speed = Math.min(this.maxSpeed, this.speed + this.speedIncrement);
        if (keys['ArrowDown']) this.speed = Math.max(0, this.speed - this.speedIncrement);
        if (keys['ArrowLeft']) this.euler.z += 0.01;
        if (keys['ArrowRight']) this.euler.z -= 0.01;
    
        const now = Date.now();
        if ((keys[' '] || keys['Spacebar']) && (!this.lastShotTime || now - this.lastShotTime > this.shootCooldown)) {
            this.shootBullet();
            this.lastShotTime = now;
        }
    
        const angleOfAttack = this.euler.x;
        const lift = this.speed > this.minSpeedForLift ? this.liftCoefficient * this.speed * Math.sin(angleOfAttack) : 0;
        const drag = this.dragCoefficient * this.speed * this.speed;
        this.speed = Math.max(0, this.speed - drag);
    
        const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(this.orientation);
        this.player.position.add(forwardVector.multiplyScalar(this.speed));
        this.player.position.y += lift - this.gravity;
    
        if (this.player.position.y < 0.5) {
            this.player.position.y = 0.5;
            this.speed = 0;
        }
    
        this.updateBullets();
    
        // Update invulnerability status
        if (this.isInvulnerable && now - this.respawnTime > this.respawnProtectionTime) {
            this.isInvulnerable = false;
    
            // Remove visual effects for invulnerability
            this.group.traverse(child => {
                if ((child as THREE.Mesh).isMesh) {
                    const material = (child as THREE.Mesh).material;
                    if (Array.isArray(material)) {
                        material.forEach(mat => {
                            mat.transparent = false;
                            mat.opacity = 1.0;
                        });
                    } else {
                        material.transparent = false;
                        material.opacity = 1.0;
                    }
                }
            });
        }
    }

    updateQuaternion(): void {
        this.orientation.setFromEuler(this.euler);
        this.player.quaternion.copy(this.orientation);
    }

    startBarrelRoll(): void {
        if (!this.isDoingBarrelRoll && this.speed > 0.5) {
            this.isDoingBarrelRoll = true;
            this.barrelRollStartTime = Date.now();
            this.showMessage("סיבוב חבית!");
        }
    }

    updateBarrelRoll(): void {
        const elapsedTime = Date.now() - this.barrelRollStartTime;
        const progress = Math.min(elapsedTime / this.barrelRollDuration, 1);
        const startQuat = this.orientation.clone();
        const endQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 2);
        
        // Create a temporary quaternion and use slerp
        const tempQuat = startQuat.clone();
        tempQuat.slerp(endQuat, progress);
        
        // Update the player's quaternion
        this.player.quaternion.copy(tempQuat);
        
        if (progress >= 1) {
            this.isDoingBarrelRoll = false;
            this.orientation.copy(this.player.quaternion);
        }
    }

    shootBullet(): void {
        const bulletGeometry = new THREE.SphereGeometry(1, 8, 5);
        const bulletMaterial = new THREE.MeshLambertMaterial({ color: 0xffe400, emissive: 0xff0000 });

        const leftGunPosition = new THREE.Vector3(-12, 1, 1).applyQuaternion(this.orientation).add(this.player.position);
        const rightGunPosition = new THREE.Vector3(12, 1, 1).applyQuaternion(this.orientation).add(this.player.position);

        const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(this.orientation);
        
        // Left bullet
        const leftBullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        leftBullet.position.copy(leftGunPosition);
        (leftBullet as any).velocity = forwardVector.clone().multiplyScalar(this.bulletSpeed);
        this.scene.add(leftBullet);
        this.bullets.push(leftBullet);

        // Right bullet
        const rightBullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        rightBullet.position.copy(rightGunPosition);
        (rightBullet as any).velocity = forwardVector.clone().multiplyScalar(this.bulletSpeed);
        this.scene.add(rightBullet);
        this.bullets.push(rightBullet);
        
        // Notify the server about bullets for multiplayer
        this.sendBulletCreation(leftGunPosition, (leftBullet as any).velocity);
        this.sendBulletCreation(rightGunPosition, (rightBullet as any).velocity);
    }

    updateBullets(): void {
        for (let index = this.bullets.length - 1; index >= 0; index--) {
            const bullet = this.bullets[index];
            bullet.position.add((bullet as any).velocity);
            if (bullet.position.distanceTo(this.player.position) > 1200) {
                this.scene.remove(bullet);
                this.bullets.splice(index, 1);
            }
        }
    }
    
    // Method for handling damage in multiplayer
    takeDamage(amount: number): void {
        if (this.isInvulnerable) return;
        
        this.health -= amount;
        
        // Update health bar
        this.updateHealthBar();
        
        // Visual feedback
        this.flashDamage();
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    // Visual feedback for taking damage
    flashDamage(): void {
        interface OriginalMaterial {
            mesh: THREE.Mesh;
            material: THREE.Material;
        }
        
        const originalMaterials: OriginalMaterial[] = [];
        
        // Store original materials and change to red
        this.group.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
                originalMaterials.push({
                    mesh: child as THREE.Mesh,
                    material: (child as THREE.Mesh).material as THREE.Material
                });
                
                (child as THREE.Mesh).material = new THREE.MeshPhongMaterial({
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.8
                });
            }
        });
        
        // Restore original materials after a short delay
        setTimeout(() => {
            originalMaterials.forEach(item => {
                item.mesh.material = item.material;
            });
        }, 200);
    }
    
    // Handle player death and respawn
    die(): void {
        this.showMessage("Aircraft destroyed! Respawning...");
        
        // Create explosion at player position
        const explosionPosition = this.player.position.clone();
        
        // Call the explosion function 3 times for a bigger effect
        for (let i = 0; i < 3; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            this.createEnhancedExplosion(explosionPosition.clone().add(offset));
        }
        
        // Reset plane position - find a safe spawn point
        this.player.position.set(
            (Math.random() - 0.5) * 1000,
            100 + Math.random() * 100,
            (Math.random() - 0.5) * 1000
        );
        
        // Reset health and speed
        this.health = 100;
        this.speed = 0;
        
        // Update health bar
        this.updateHealthBar();
        
        // Set invulnerability
        this.isInvulnerable = true;
        this.respawnTime = Date.now();
        
        // Visual effect for invulnerability - semi-transparent
        this.group.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const material = mesh.material as THREE.Material;
                material.transparent = true;
                material.opacity = 0.6;
            }
        });
    }
}