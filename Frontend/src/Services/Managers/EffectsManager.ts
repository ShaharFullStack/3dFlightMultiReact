// src/Managers/EffectsManager.ts

import * as THREE from 'three';

/**
 * Manager for handling visual effects in the game
 */
export class EffectsManager {
    private scene: THREE.Scene;
    
    /**
     * Constructor
     */
    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }
    
    /**
     * Create an enhanced explosion effect
     */
    public createExplosion(position: THREE.Vector3): void {
        // Get an active camera to look at for ring orientation
        // This would normally come from the player
        let cameraPosition = new THREE.Vector3(0, 100, 100);
        const players = this.scene.children.filter(obj => obj.userData && obj.userData.isPlayer);
        if (players.length > 0) {
            cameraPosition = players[0].position;
        }
        
        // Ring effect
        const ringGeometry = new THREE.RingGeometry(0.1, 0.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.lookAt(cameraPosition);
        this.scene.add(ring);
        
        const expandRing = () => {
            if (ring.scale.x < 20) {
                ring.scale.x += 0.5;
                ring.scale.y += 0.5;
                ring.material.opacity -= 0.02;
                requestAnimationFrame(expandRing);
            } else {
                this.scene.remove(ring);
            }
        };
        expandRing();
        
        // Colored particles
        const particleCount = 30; // Reduced from 50 to 30 for performance
        const particleColors = [
            Math.random() * 0xffffff,
            Math.random() * 0xffffff,
            Math.random() * 0xffffff
        ];
        const colors = particleColors.map(color => new THREE.Color(color));
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(position);
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.7,
                (Math.random() - 0.5) * 0.7,
                (Math.random() - 0.5) * 0.7
            );
            this.scene.add(particle);
            
            let frame = 0;
            const animateParticle = () => {
                frame++;
                particle.position.add(velocity);
                particle.material.opacity -= 0.02;
                particle.scale.multiplyScalar(0.98);
                
                if (frame < 60 && particle.material.opacity > 0) {
                    requestAnimationFrame(animateParticle);
                } else {
                    this.scene.remove(particle);
                }
            };
            animateParticle();
        }
        
        // Flash light effect
        const flashLight = new THREE.PointLight(0xffff00, 5, 50);
        flashLight.position.copy(position);
        this.scene.add(flashLight);
        
        let intensity = 5;
        const animateFlash = () => {
            intensity -= 0.2;
            flashLight.intensity = intensity;
            if (intensity > 0) {
                requestAnimationFrame(animateFlash);
            } else {
                this.scene.remove(flashLight);
            }
        };
        animateFlash();
    }
}