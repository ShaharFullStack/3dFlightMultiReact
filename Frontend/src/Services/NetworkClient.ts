// src/Services/NetworkClient.ts

import * as THREE from 'three';
import { BalloonModel, BulletModel, GameState, PlayerModel, Position, Quaternion } from '../Models/GameModels';

export interface NetworkCallbacks {
    onConnected: (playerId: string, gameState: GameState) => void;
    onDisconnected: () => void;
    onPlayerJoined: (playerId: string, player: PlayerModel) => void;
    onPlayerLeft: (playerId: string) => void;
    onPlayerUpdated: (playerId: string, position: Position, quaternion: Quaternion, planeType: string, planeConfig: any) => void;
    onBulletCreated: (bullet: BulletModel) => void;
    onBalloonHit: (balloonId: string, playerId: string, position: Position, newScore: number) => void;
    onPlayerHit: (targetId: string, shooterId: string, position: Position, newHealth: number) => void;
    onPlayerKilled: (targetId: string, shooterId: string, position: Position) => void;
    onNewBalloon: (balloon: BalloonModel) => void;
    onBulletsUpdated: (playerId: string, bullets: BulletModel[]) => void;
    onMessage: (message: string) => void;
    onChatMessage: (senderId: string, senderName: string, message: string) => void;
}

class NetworkClient {
    private socket: WebSocket | null = null;
    private playerId: string = '';
    private playerName: string = '';
    private isConnected: boolean = false;
    private pingInterval: number | null = null;
    private reconnectTimeout: number | null = null;
    private lastUpdateTime: number = Date.now();
    private manualDisconnect: boolean = false;
    private readonly UPDATE_RATE: number = 50; // ms between updates
    private callbacks: NetworkCallbacks | null = null;
    private serverUrl: string = '';

    /**
     * Initialize network client with callbacks
     */
    public initialize(callbacks: NetworkCallbacks): void {
        this.callbacks = callbacks;
        this.serverUrl = this.getServerUrl();
    }

    /**
     * Set player name
     */
    public setPlayerName(name: string): void {
        this.playerName = name;
        
        // If already connected, update the server
        if (this.isConnected && this.playerId && this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.sendPlayerInfo();
        }
    }

    /**
     * Connect to multiplayer server
     */
    public connect(): void {
        // Clear any existing reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        try {
            // Close any existing connection first
            if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
                this.manualDisconnect = true; // Mark this as a manual disconnect
                this.socket.close();
                // Reset the flag after a short delay
                setTimeout(() => {
                    this.manualDisconnect = false;
                }, 100);
            }
            
            this.socket = new WebSocket(this.serverUrl);
            
            this.socket.onopen = () => {
                console.log('Connected to server');
                this.isConnected = true;
                
                if (this.callbacks) {
                    this.callbacks.onMessage('Connected to multiplayer server');
                }
                
                // Send player info to server once connected
                this.sendPlayerInfo();
                
                // Send position updates to the server AFTER connection is established
                if (this.pingInterval) clearInterval(this.pingInterval); // Clear any existing interval
                this.pingInterval = window.setInterval(() => this.sendPositionUpdate(), this.UPDATE_RATE);
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleServerMessage(data);
                } catch (error) {
                    console.error('Error parsing server message:', error);
                }
            };
            
            this.socket.onclose = () => {
                console.log('Disconnected from server');
                this.isConnected = false;
                
                // Clean up resources
                if (this.pingInterval) {
                    clearInterval(this.pingInterval);
                    this.pingInterval = null;
                }
                
                // Only show message and clean up if not a manual disconnect for reconnection
                if (!this.manualDisconnect) {
                    if (this.callbacks) {
                        this.callbacks.onMessage('Disconnected from server');
                        this.callbacks.onDisconnected();
                    }
                    
                    // Try to reconnect after a delay, but only if not manually disconnected
                    this.reconnectTimeout = window.setTimeout(() => this.connect(), 5000);
                }
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnected = false;
                // Don't close here, let the onclose handler handle it
            };
        } catch (error) {
            console.error('Error initializing network:', error);
            // Only set up reconnect if there's not already one pending
            if (!this.reconnectTimeout) {
                this.reconnectTimeout = window.setTimeout(() => this.connect(), 5000);
            }
        }
    }

    /**
     * Disconnect from the server
     */
    public disconnect(): void {
        // Clear any pending reconnections
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        // Clear update interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        // Set manual disconnect flag
        this.manualDisconnect = true;
        
        // Close the connection if it exists
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
            this.socket.close();
        }
        
        // Clean up state
        this.isConnected = false;
        
        console.log('Manually disconnected from server');
        
        // Reset the flag after a short delay
        setTimeout(() => {
            this.manualDisconnect = false;
        }, 100);

        if (this.callbacks) {
            this.callbacks.onDisconnected();
        }
    }

    /**
     * Send player information to server
     */
    private sendPlayerInfo(): void {
        if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        try {
            const playerInfo = {
                type: 'playerInfo',
                name: this.playerName,
                planeType: window.currentPlane?.type || 'planeOne',
                planeConfig: window.currentPlane?.config || null
            };
            
            this.socket.send(JSON.stringify(playerInfo));
        } catch (error) {
            console.error('Error sending player info:', error);
        }
    }

    /**
     * Send player position update to server
     */
    public sendPositionUpdate(player?: THREE.Object3D, planeType?: string, planeConfig?: any, health?: number): void {
        if (!this.isConnected || !this.playerId || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        try {
            const now = Date.now();
            if (now - this.lastUpdateTime < this.UPDATE_RATE) return;
            this.lastUpdateTime = now;
            
            if (!player) {
                if (!window.player) return;
                player = window.player;
            }

            const update = {
                type: 'playerUpdate',
                playerId: this.playerId,
                position: {
                    x: player.position.x,
                    y: player.position.y,
                    z: player.position.z
                },
                quaternion: {
                    _x: player.quaternion.x,
                    _y: player.quaternion.y,
                    _z: player.quaternion.z,
                    _w: player.quaternion.w
                },
                planeType: planeType || window.currentPlane?.type || 'planeOne',
                planeConfig: planeConfig || window.currentPlane?.config || null,
                health: health || window.currentPlane?.health || 100
            };
            
            this.socket.send(JSON.stringify(update));
        } catch (error) {
            console.error('Error sending position update:', error);
        }
    }

    /**
     * Send bullet creation to server
     */
    public sendBulletCreation(bulletPosition: THREE.Vector3, bulletVelocity: THREE.Vector3): void {
        if (!this.isConnected || !this.playerId || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        try {
            const bulletData = {
                type: 'shoot',
                playerId: this.playerId,
                position: {
                    x: bulletPosition.x,
                    y: bulletPosition.y,
                    z: bulletPosition.z
                },
                velocity: {
                    x: bulletVelocity.x,
                    y: bulletVelocity.y,
                    z: bulletVelocity.z
                }
            };
            
            this.socket.send(JSON.stringify(bulletData));
        } catch (error) {
            console.error('Error sending bullet creation:', error);
        }
    }

    /**
     * Send balloon hit to server
     */
    public sendBalloonHit(balloonId: string, position: THREE.Vector3): void {
        if (!this.isConnected || !this.playerId || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        try {
            const hitData = {
                type: 'balloonHit',
                playerId: this.playerId,
                balloonId: balloonId,
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                }
            };
            
            this.socket.send(JSON.stringify(hitData));
        } catch (error) {
            console.error('Error sending balloon hit:', error);
        }
    }

    /**
     * Send chat message to server
     */
    public sendChatMessage(message: string): void {
        if (!this.isConnected || !this.playerId || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        try {
            const chatData = {
                type: 'chatMessage',
                playerId: this.playerId,
                playerName: this.playerName,
                message: message,
                timestamp: Date.now()
            };
            
            this.socket.send(JSON.stringify(chatData));
        } catch (error) {
            console.error('Error sending chat message:', error);
        }
    }

    /**
     * Send player hit to server
     */
    public sendPlayerHit(targetId: string, position: THREE.Vector3): void {
        if (!this.isConnected || !this.playerId || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        try {
            const hitData = {
                type: 'playerHit',
                shooterId: this.playerId,
                targetId: targetId,
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                }
            };
            
            this.socket.send(JSON.stringify(hitData));
        } catch (error) {
            console.error('Error sending player hit:', error);
        }
    }

    /**
     * Handle messages from server
     */
    private handleServerMessage(data: any): void {
        if (!data || !data.type || !this.callbacks) {
            console.error('Invalid message format or no callbacks registered:', data);
            return;
        }
        
        switch (data.type) {
            case 'init':
                // Initialize with server data
                this.playerId = data.playerId;
                
                if (this.callbacks) {
                    this.callbacks.onConnected(data.playerId, data.gameState);
                    this.callbacks.onMessage(`Joined as Player: ${this.playerName || data.playerId.substring(0, 8)}`);
                }
                break;
                
            case 'newPlayer':
                // New player joined
                if (data.playerId !== this.playerId && data.player && this.callbacks) {
                    this.callbacks.onPlayerJoined(data.playerId, data.player);
                    this.callbacks.onMessage(`Player ${data.player.name || data.playerId.substring(0, 8)} joined`);
                }
                break;
                
            case 'playerUpdate':
                // Update remote player position
                if (data.playerId && this.callbacks) {
                    this.callbacks.onPlayerUpdated(
                        data.playerId, 
                        data.position || { x: 0, y: 0, z: 0 }, 
                        data.quaternion || { _x: 0, _y: 0, _z: 0, _w: 1 }, 
                        data.planeType, 
                        data.planeConfig
                    );
                }
                break;
                
            case 'playerDisconnected':
                // Player disconnected
                if (data.playerId && this.callbacks) {
                    this.callbacks.onPlayerLeft(data.playerId);
                }
                break;
                
            case 'newBullet':
                // Create a bullet from another player
                if (data.bullet && data.bullet.playerId !== this.playerId && this.callbacks) {
                    this.callbacks.onBulletCreated(data.bullet);
                }
                break;
                
            case 'balloonHit':
                // Balloon hit by any player
                if (this.callbacks) {
                    if (data.playerId === this.playerId) {
                        this.callbacks.onMessage(`You hit a balloon! Score: ${data.newScore}`);
                    } else if (data.playerId) {
                        this.callbacks.onMessage(`Player ${data.playerName || data.playerId.substring(0, 8)} hit a balloon! Score: ${data.newScore}`);
                    }
                    
                    if (data.position) {
                        this.callbacks.onBalloonHit(data.balloonId, data.playerId, data.position, data.newScore);
                    }
                }
                break;
                
            case 'playerHit':
                // Player hit by bullet
                if (!data.targetId || !data.shooterId || !this.callbacks) break;
                
                if (data.targetId === this.playerId) {
                    // Local player was hit
                    this.callbacks.onMessage(`You were hit by ${data.shooterName || data.shooterId.substring(0, 8)}!`);
                } else if (data.shooterId === this.playerId) {
                    // You hit someone else
                    this.callbacks.onMessage(`You hit ${data.targetName || data.targetId.substring(0, 8)}!`);
                }
                
                if (data.position && this.callbacks) {
                    this.callbacks.onPlayerHit(data.targetId, data.shooterId, data.position, data.newHealth || 0);
                }
                break;
                
            case 'bulletsUpdate':
                // Update bullets for a remote player
                if (data.playerId && data.bullets && this.callbacks) {
                    this.callbacks.onBulletsUpdated(data.playerId, data.bullets);
                }
                break;
                
            case 'newBalloon':
                // Add new balloon to the scene
                if (data.balloon && this.callbacks) {
                    this.callbacks.onNewBalloon(data.balloon);
                }
                break;
                
            case 'playerKilled':
                // Handle player death
                if (!data.targetId || !data.shooterId || !this.callbacks) break;
                
                if (data.targetId === this.playerId) {
                    // Local player was killed
                    this.callbacks.onMessage(`You were destroyed by ${data.shooterName || data.shooterId.substring(0, 8)}!`);
                } else if (data.shooterId === this.playerId) {
                    // You killed another player
                    this.callbacks.onMessage(`You destroyed ${data.targetName || data.targetId.substring(0, 8)}!`);
                } else {
                    // Someone killed someone else
                    this.callbacks.onMessage(`${data.shooterName || data.shooterId.substring(0, 8)} destroyed ${data.targetName || data.targetId.substring(0, 8)}!`);
                }
                
                if (data.position) {
                    this.callbacks.onPlayerKilled(data.targetId, data.shooterId, data.position);
                }
                break;
                
            case 'chatMessage':
                // Handle chat message
                if (data.playerId && data.message && this.callbacks) {
                    this.callbacks.onChatMessage(data.playerId, data.playerName || data.playerId.substring(0, 8), data.message);
                }
                break;
                
            default:
                console.log('Unhandled message type:', data.type);
                break;
        }
    }

    /**
     * Get server URL based on environment
     */
    private getServerUrl(): string {
        if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
            // For local development
            return 'ws://localhost:4000';
        } else {
            // For server deployment
            return `ws://${window.location.hostname}:4000`;
        }
    }

    /**
     * Check if connected to server
     */
    public isMultiplayerConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Get current player ID
     */
    public getPlayerId(): string {
        return this.playerId;
    }
}

// Create a singleton instance
const networkClient = new NetworkClient();
export default networkClient;

// Add types to window object for TypeScript
declare global {
    interface Window {
        player: THREE.Object3D;
        currentPlane: any;
        socket: WebSocket | null;
    }
}