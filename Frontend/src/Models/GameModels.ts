// src/Models/GameModels.ts

import * as THREE from 'three';

export interface Position {
    x: number;
    y: number;
    z: number;
}

export interface Quaternion {
    _x: number;
    _y: number;
    _z: number;
    _w: number;
}

export interface Velocity {
    x: number;
    y: number;
    z: number;
}

export interface BulletModel {
    id: string;
    playerId: string;
    position: Position;
    velocity: Velocity;
    createdAt: number;
}

export interface BalloonModel {
    id: string;
    position: Position;
    color: number | string;
    active: boolean;
}

export interface PlayerModel {
    id: string;
    name: string;
    position: Position;
    quaternion: Quaternion;
    planeType: string;
    planeConfig: PlaneConfig | null;
    score: number;
    health: number;
    bullets: BulletModel[];
    object?: THREE.Object3D;
    plane?: PlaneObject;
    healthBar?: THREE.Sprite;
}

export interface RemotePlayerModel {
    object: THREE.Object3D;
    plane: PlaneObject;
    name: string;
    health: number;
    healthBar: THREE.Sprite;
    bullets: THREE.Mesh[];
}

export interface PlaneObject {
    group: THREE.Group;
    type: string;
    config: PlaneConfig;
    health: number;
    speed: number;
    isInvulnerable: boolean;
    healthBar: THREE.Sprite;
    bullets: THREE.Mesh[];
    
    update: (keys: Record<string, boolean>) => void;
    shootBullet: () => void;
    takeDamage: (amount: number) => void;
    updateHealthBar: () => void;
}

export interface GameState {
    players: Record<string, PlayerModel>;
    balloons: BalloonModel[];
}

export interface ServerMessageData {
    type: string;
    [key: string]: any;
}

export enum CameraView {
    TPS = 'TPS',
    FPS = 'FPS',
    TPS_FAR = 'TPS Far'
}

export interface GameSettings {
    multiplayerEnabled: boolean;
    currentCameraView: CameraView;
    gameStarted: boolean;
    score: number;
    difficultyLevel: number;
}

export interface MessageOptions {
    duration?: number;
    position?: 'top' | 'middle' | 'bottom';
    color?: string;
}

// ===== PLANE CONFIGURATION MODELS =====

export interface PlaneElementConfig {
    width: number;
    height: number;
    length: number;
    color?: number;
    opacity?: number;
    position?: {
        x: number;
        y: number;
        z: number;
    };
    rotationZ?: number;
}

export interface PlaneWheelPosition {
    x: number;
    y: number;
    z: number;
}

export interface PlaneConfig {
    body: PlaneElementConfig;
    nose: PlaneElementConfig;
    guns: PlaneElementConfig[];
    wing: PlaneElementConfig;
    tailWing: PlaneElementConfig;
    stabilizer: PlaneElementConfig;
    windows: PlaneElementConfig;
    wheels: PlaneWheelPosition[];
    scale: {
        x: number;
        y: number;
        z: number;
    };
}

export interface PlaneConfigDictionary {
    [key: string]: PlaneConfig;
}

// ===== CHAT MODELS =====

export interface ChatMessage {
    sender: string;
    senderId: string;
    message: string;
    timestamp: number;
}