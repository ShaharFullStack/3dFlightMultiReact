// src/Managers/CollisionManager.ts

import * as THREE from 'three';
import { GameSettings } from '../../Models/GameModels';
import { EffectsManager } from './EffectsManager';
import networkClient from '../NetworkClient';

/**
 * Manager for handling collisions between game objects
 */
export class CollisionManager {
    private scene: THREE.Scene;
    private balloons: THREE.Mesh[];
    private gameSettings: GameSettings;
    private effectsManager: EffectsManager;
    private updateDifficultyCallback: () => void;
    
    /**
     * Constructor
     */
    constructor(
        scene: THREE.Scene,
        balloons: THREE.Mesh[],
        gameSettings: GameSettings,
        effectsManager: EffectsManager,
        updateDifficultyCallback: () => void
    ) {
        this.scene = scene;
        this.balloons = balloons;
        this.gameSettings = gameSettings;
        this.effectsManager = effectsManager;
        this.updateDifficultyCallback = updateDifficultyCallback;
    }
    
    /**
     * Check for collisions between bullets and balloons
     */
    public checkCollisions(bullets: THREE.Mesh[], balloonList: THREE.Mesh[]): void {
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
                    
                    this.effectsManager.createExplosion(balloon.position);
                    
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
                    this.updateDifficultyCallback();
                    
                    // In multiplayer, don't immediately recreate balloon - server will do that
                    if (!this.gameSettings.multiplayerEnabled) {
                        // Create a new balloon to replace the popped one
                        // This would be handled by the environment manager
                        this.createReplacementBalloon();
                    }
                    
                    break;
                }
            }
        }
    }
    
    /**
     * Check for bullets hitting remote players
     */
    public checkBulletPlayerCollisions(bullets: THREE.Mesh[], remotePlayers: Record<string, any>): void {
        const COLLISION_THRESHOLD = 15;
        
        for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = bullets[bulletIndex];
            
            // Check against each remote player
            Object.keys(remotePlayers).forEach(remoteId => {
                const remotePlayer = remotePlayers[remoteId];
                
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
                    this.effectsManager.createExplosion(hitPosition);
                    
                    // Let the server know about the hit
                    networkClient.sendPlayerHit(remoteId, hitPosition);
                }
            });
        }
    }
    
    /**
     * Create a replacement balloon
     * This is a placeholder - in a real implementation, this would call the EnvironmentManager
     */
    private createReplacementBalloon(): void {
        // This would be delegated to the EnvironmentManager
        // For now, it's just a placeholder
    }
}