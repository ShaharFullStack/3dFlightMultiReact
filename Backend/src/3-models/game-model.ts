// Backend/src/3-models/game-model.ts

import Joi from 'joi';

// Position Interface & Schema
export interface Position {
    x: number;
    y: number;
    z: number;
}

export const positionSchema = Joi.object({
    x: Joi.number().required(),
    y: Joi.number().required(),
    z: Joi.number().required()
});

// Quaternion Interface & Schema
export interface Quaternion {
    _x: number;
    _y: number;
    _z: number;
    _w: number;
}

export const quaternionSchema = Joi.object({
    _x: Joi.number().required(),
    _y: Joi.number().required(),
    _z: Joi.number().required(),
    _w: Joi.number().required()
});

// Velocity Interface & Schema
export interface Velocity {
    x: number;
    y: number;
    z: number;
}

export const velocitySchema = Joi.object({
    x: Joi.number().required(),
    y: Joi.number().required(),
    z: Joi.number().required()
});

// Plane Configuration Interfaces & Schemas
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

export const planeElementConfigSchema = Joi.object({
    width: Joi.number().required(),
    height: Joi.number().required(),
    length: Joi.number().required(),
    color: Joi.number().optional(),
    opacity: Joi.number().min(0).max(1).optional(),
    position: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        z: Joi.number().required()
    }).optional(),
    rotationZ: Joi.number().optional()
});

export interface PlaneWheelPosition {
    x: number;
    y: number;
    z: number;
}

export const planeWheelPositionSchema = Joi.object({
    x: Joi.number().required(),
    y: Joi.number().required(),
    z: Joi.number().required()
});

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

export const planeConfigSchema = Joi.object({
    body: planeElementConfigSchema.required(),
    nose: planeElementConfigSchema.required(),
    guns: Joi.array().items(planeElementConfigSchema).required(),
    wing: planeElementConfigSchema.required(),
    tailWing: planeElementConfigSchema.required(),
    stabilizer: planeElementConfigSchema.required(),
    windows: planeElementConfigSchema.required(),
    wheels: Joi.array().items(planeWheelPositionSchema).required(),
    scale: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        z: Joi.number().required()
    }).required()
});

// Bullet Interface & Schema
export interface BulletModel {
    id: string;
    playerId: string;
    position: Position;
    velocity: Velocity;
    createdAt: number;
}

export const bulletModelSchema = Joi.object({
    id: Joi.string().required(),
    playerId: Joi.string().required(),
    position: positionSchema.required(),
    velocity: velocitySchema.required(),
    createdAt: Joi.number().required()
});

// Balloon Interface & Schema
export interface BalloonModel {
    id: string;
    position: Position;
    color: number | string;
    active: boolean;
}

export const balloonModelSchema = Joi.object({
    id: Joi.string().required(),
    position: positionSchema.required(),
    color: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    active: Joi.boolean().required()
});

// Player Interface & Schema
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
}

export const playerModelSchema = Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    position: positionSchema.required(),
    quaternion: quaternionSchema.required(),
    planeType: Joi.string().required(),
    planeConfig: Joi.alternatives().try(planeConfigSchema, Joi.allow(null)).required(),
    score: Joi.number().min(0).required(),
    health: Joi.number().min(0).max(100).required(),
    bullets: Joi.array().items(bulletModelSchema).required()
});

// Game State Interface & Schema
export interface GameState {
    players: Record<string, PlayerModel>;
    balloons: BalloonModel[];
}

export const gameStateSchema = Joi.object({
    players: Joi.object().pattern(
        Joi.string(),
        playerModelSchema
    ).required(),
    balloons: Joi.array().items(balloonModelSchema).required()
});

// Message Types
export enum MessageType {
    INIT = 'init',
    PLAYER_INFO = 'playerInfo',
    PLAYER_UPDATE = 'playerUpdate',
    NEW_PLAYER = 'newPlayer',
    PLAYER_DISCONNECTED = 'playerDisconnected',
    SHOOT = 'shoot',
    NEW_BULLET = 'newBullet',
    BULLETS_UPDATE = 'bulletsUpdate',
    BALLOON_HIT = 'balloonHit',
    PLAYER_HIT = 'playerHit',
    PLAYER_KILLED = 'playerKilled',
    NEW_BALLOON = 'newBalloon',
    CHAT_MESSAGE = 'chatMessage'
}

// Base Message Interface & Schema
export interface BaseMessage {
    type: MessageType;
}

export const baseMessageSchema = Joi.object({
    type: Joi.string().valid(...Object.values(MessageType)).required()
});

// Player Info Message
export interface PlayerInfoMessage extends BaseMessage {
    type: MessageType.PLAYER_INFO;
    name: string;
    planeType: string;
    planeConfig: PlaneConfig | null;
}

export const playerInfoMessageSchema = baseMessageSchema.keys({
    type: Joi.string().valid(MessageType.PLAYER_INFO).required(),
    name: Joi.string().required(),
    planeType: Joi.string().required(),
    planeConfig: Joi.alternatives().try(planeConfigSchema, Joi.allow(null)).required()
});

// Player Update Message
export interface PlayerUpdateMessage extends BaseMessage {
    type: MessageType.PLAYER_UPDATE;
    playerId: string;
    position: Position;
    quaternion: Quaternion;
    planeType: string;
    planeConfig: PlaneConfig | null;
    health: number;
}

export const playerUpdateMessageSchema = baseMessageSchema.keys({
    type: Joi.string().valid(MessageType.PLAYER_UPDATE).required(),
    playerId: Joi.string().required(),
    position: positionSchema.required(),
    quaternion: quaternionSchema.required(),
    planeType: Joi.string().required(),
    planeConfig: Joi.alternatives().try(planeConfigSchema, Joi.allow(null)).required(),
    health: Joi.number().min(0).max(100).required()
});

// Shoot Message
export interface ShootMessage extends BaseMessage {
    type: MessageType.SHOOT;
    playerId: string;
    position: Position;
    velocity: Velocity;
}

export const shootMessageSchema = baseMessageSchema.keys({
    type: Joi.string().valid(MessageType.SHOOT).required(),
    playerId: Joi.string().required(),
    position: positionSchema.required(),
    velocity: velocitySchema.required()
});

// Balloon Hit Message
export interface BalloonHitMessage extends BaseMessage {
    type: MessageType.BALLOON_HIT;
    playerId: string;
    balloonId: string;
    position: Position;
}

export const balloonHitMessageSchema = baseMessageSchema.keys({
    type: Joi.string().valid(MessageType.BALLOON_HIT).required(),
    playerId: Joi.string().required(),
    balloonId: Joi.string().required(),
    position: positionSchema.required()
});

// Player Hit Message
export interface PlayerHitMessage extends BaseMessage {
    type: MessageType.PLAYER_HIT;
    shooterId: string;
    targetId: string;
    position: Position;
}

export const playerHitMessageSchema = baseMessageSchema.keys({
    type: Joi.string().valid(MessageType.PLAYER_HIT).required(),
    shooterId: Joi.string().required(),
    targetId: Joi.string().required(),
    position: positionSchema.required()
});

// Chat Message
export interface ChatMessage extends BaseMessage {
    type: MessageType.CHAT_MESSAGE;
    playerId: string;
    message: string;
    timestamp: number;
}

export const chatMessageSchema = baseMessageSchema.keys({
    type: Joi.string().valid(MessageType.CHAT_MESSAGE).required(),
    playerId: Joi.string().required(),
    message: Joi.string().required(),
    timestamp: Joi.number().required()
});

// Message validator function
export function validateMessage(message: any, schema: Joi.ObjectSchema): { error?: string; value: any } {
    const validation = schema.validate(message);
    if (validation.error) {
        return { error: validation.error.message, value: message };
    }
    return { value: validation.value };
}