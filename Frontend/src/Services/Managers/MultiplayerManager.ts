// src/Managers/MultiplayerManager.ts

import * as THREE from 'three';
import { BulletModel, GameSettings, GameState, PlayerModel } from '../../Models/GameModels';
import { EffectsManager } from './EffectsManager';
import networkClient from '../NetworkClient';
import { Plane } from '../../Models/PlaneModel';

/**
 * Manager for handling multiplayer functionality
 */
export class MultiplayerManager {
    private scene: THREE.Scene;
    private player: THREE.Object3D;
    private gameSettings: GameSettings;
    private effectsManager: EffectsManager;
    private showMessageCallback: (message: string) => void;
    
    // Remote players
    private remotePlayers: Record<string, PlayerModel> = {};
    
    /**
     * Constructor
     */
    constructor(
        scene: THREE.Scene,
        player: THREE.Object3D,
        gameSettings: GameSettings,
        effectsManager: EffectsManager,
        showMessageCallback: (message: string) => void
    ) {
        this.scene = scene;
        this.player = player;
        this.gameSettings = gameSettings;
        this.effectsManager = effectsManager;
        this.showMessageCallback = showMessageCallback;
    }
    
    /**
     * Initialize multiplayer with game state from server
     */
    public initialize(gameState: GameState): void {
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
        // This would be delegated to the EnvironmentManager in a real implementation
    }
    
    /**
     * Update remote players and bullets
     */
    public update(): void {
        // Update remote bullets
        Object.keys(this.remotePlayers).forEach(playerId => {
            this.updateRemoteBullets(playerId, this.remotePlayers[playerId].bullets);
        });
    }
    
    /**
     * Add a remote player
     */
    public addRemotePlayer(id: string, playerData: PlayerModel): void {
        try {
            // Use the plane type sent from the remote player
            const planeType = playerData.planeType || 'planeOne';
            const planeConfig = playerData.planeConfig;
            
            // Create a new plane for the remote player
            const remotePlane = new Plane(
                planeType,
                planeConfig,
                new THREE.Object3D(), // Temporary object
                this.scene,
                () => { }, // No-op for sendBulletCreation
                () => { }, // No-op for showMessage
                this.effectsManager.createExplosion.bind(this.effectsManager)
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
                    // Remove the old plane
                    remotePlayerObj.remove(remotePlayer.plane.group);
                    
                    // Create a new plane with updated properties
                    const newPlane = new Plane(
                        planeType || remotePlayer.planeType,
                        planeConfig || currentPlaneConfig,
                        remotePlayerObj,
                        this.scene,
                        () => { }, // No-op for sendBulletCreation
                        () => { }, // No-op for showMessage
                        this.effectsManager.createExplosion.bind(this.effectsManager)
                    );
                    
                    // Update the remote player's plane reference
                    remotePlayer.plane = newPlane;
                    remotePlayer.planeType = planeType || remotePlayer.planeType;
                    remotePlayer.planeConfig = planeConfig || currentPlaneConfig;
                    
                    // Add the new plane to the remote player object
                    remotePlayerObj.add(newPlane.group);
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
                    if (bullet) {
                        // Remove any bullet meshes
                        this.scene.traverse((object) => {
                            if (object instanceof THREE.Mesh && object.userData.id === bullet.id) {
                                this.scene.remove(object);
                            }
                        });
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
        if (!bullet) return;
        
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
    private updateRemoteBullets(playerId: string, bullets: BulletModel[]): void {
        if (!playerId || !this.remotePlayers[playerId]) return;
        
        try {
            const remotePlayer = this.remotePlayers[playerId];
            
            // Remove old bullets from scene
            if (remotePlayer.bullets && remotePlayer.bullets.length > 0) {
                remotePlayer.bullets.forEach(bullet => {
                    if (bullet && bullet.id) {
                        this.scene.traverse((object) => {
                            if (object instanceof THREE.Mesh && object.userData.id === bullet.id) {
                                this.scene.remove(object);
                            }
                        });
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
        if (!bullet) return;
        
        const checkCollisions = () => {
            if (!bullet || !this.scene.getObjectById(bullet.id)) return;
            
            try {
                if (bullet.userData.playerId !== networkClient.getPlayerId()) {
                    const distance = bullet.position.distanceTo(this.player.position);
                    
                    if (distance < 15) {
                        this.scene.remove(bullet);
                        this.effectsManager.createExplosion(bullet.position);
                        return;
                    }
                }
                
                if (bullet && this.scene.getObjectById(bullet.id)) {
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
        // This would be delegated to environment manager
        // For now, just create an explosion
        const hitPosition = new THREE.Vector3(position.x, position.y, position.z);
        this.effectsManager.createExplosion(hitPosition);
        
        // Update player score
        if (playerId === networkClient.getPlayerId()) {
            this.gameSettings.score = newScore;
        } else if (this.remotePlayers[playerId]) {
            this.remotePlayers[playerId].score = newScore;
        }
    }
    
    /**
     * Handle a player hit
     */
    public handlePlayerHit(targetId: string, shooterId: string, position: any, newHealth: number): void {
        // Create explosion at hit position
        const hitPosition = new THREE.Vector3(position.x, position.y, position.z);
        this.effectsManager.createExplosion(hitPosition);
        
        if (targetId === networkClient.getPlayerId()) {
            // Local player was hit
            // This would update the local player's health
            this.showMessageCallback(`Hit by ${shooterId}! Health: ${newHealth}`);
        } else if (this.remotePlayers[targetId]) {
            // Remote player was hit - update health
            this.remotePlayers[targetId].health = newHealth;
            this.updateRemotePlayerHealthBar(targetId);
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
    
    /**
     * Clean up multiplayer resources
     */
    public cleanup(): void {
        // Remove remote players
        Object.keys(this.remotePlayers).forEach(id => {
            this.removeRemotePlayer(id);
        });
        
        // Reset remote players object
        this.remotePlayers = {};
    }
}