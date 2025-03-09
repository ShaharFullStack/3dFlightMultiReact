import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import {
    BalloonModel,
    BulletModel,
    PlayerModel,
    GameState,
    MessageType,
    validateMessage,
    playerInfoMessageSchema,
    playerUpdateMessageSchema,
    shootMessageSchema,
    balloonHitMessageSchema,
    playerHitMessageSchema,
    chatMessageSchema,
} from "../3-models/game-model";

class NetworkService {
    private static instance: NetworkService;
    private wss: WebSocket.Server | null = null;
    private players: Record<string, PlayerModel> = {};
    private balloons: BalloonModel[] = [];
    private MAX_PLAYERS = 10;
    private BULLET_LIFESPAN = 5000;
    private BALLOON_RESPAWN_TIME = 2000;
    private clientSockets: Map<string, WebSocket> = new Map();

    private constructor() {}

    public static getInstance(): NetworkService {
        if (!NetworkService.instance) {
            NetworkService.instance = new NetworkService();
        }
        return NetworkService.instance;
    }

    public initialize(server: any): void {
        this.wss = new WebSocket.Server({ server });
        this.createInitialBalloons();
        this.wss.on("connection", this.handleConnection.bind(this));
        setInterval(this.cleanupExpiredBullets.bind(this), 1000);
        console.log("Network service initialized");
    }

    private createInitialBalloons(): void {
        for (let i = 0; i < 50; i++) {
            this.balloons.push({
                id: `balloon-${i}`,
                position: {
                    x: (Math.random() - 0.5) * 2500,
                    y: 10 + Math.random() * 1500,
                    z: (Math.random() - 0.5) * 1000,
                },
                color: Math.random() * 0xffffff,
                active: true,
            });
        }
    }

    private handleConnection(ws: WebSocket): void {
        const playerId = uuidv4();
        this.players[playerId] = {
            id: playerId,
            name: `Player ${Object.keys(this.players).length + 1}`,
            position: { x: 2, y: 8, z: 50 },
            quaternion: { _x: 0, _y: 0, _z: 0, _w: 1 },
            planeType: "planeOne",
            planeConfig: null,
            score: 0,
            health: 100,
            bullets: [],
        };
        this.clientSockets.set(playerId, ws);
        this.sendToClient(ws, {
            type: MessageType.INIT,
            playerId: playerId,
            gameState: this.getGameState(),
        });
        this.broadcastToAll({
            type: MessageType.NEW_PLAYER,
            playerId: playerId,
            player: this.players[playerId],
        });
        console.log(`Player ${playerId} connected. Total players: ${Object.keys(this.players).length}`);
        ws.on("message", (message: WebSocket.Data) => {
            try {
                const data = JSON.parse(message.toString());
                this.handleClientMessage(playerId, data);
            } catch (error) {
                console.error("Error parsing message:", error);
            }
        });
        ws.on("close", () => {
            this.handleDisconnection(playerId);
        });
        (ws as any).playerId = playerId;
    }

    private handleClientMessage(playerId: string, data: any): void {
        let validationResult;
        switch (data.type) {
            case MessageType.PLAYER_INFO:
                validationResult = validateMessage(data, playerInfoMessageSchema);
                if (validationResult.error) {
                    console.error(`Invalid player info message: ${validationResult.error}`);
                    return;
                }
                this.handlePlayerInfo(playerId, data);
                break;
            case MessageType.PLAYER_UPDATE:
                validationResult = validateMessage(data, playerUpdateMessageSchema);
                if (validationResult.error) {
                    console.error(`Invalid player update message: ${validationResult.error}`);
                    return;
                }
                this.handlePlayerUpdate(playerId, data);
                break;
            case MessageType.SHOOT:
                validationResult = validateMessage(data, shootMessageSchema);
                if (validationResult.error) {
                    console.error(`Invalid shoot message: ${validationResult.error}`);
                    return;
                }
                this.handleShoot(playerId, data);
                break;
            case MessageType.BALLOON_HIT:
                validationResult = validateMessage(data, balloonHitMessageSchema);
                if (validationResult.error) {
                    console.error(`Invalid balloon hit message: ${validationResult.error}`);
                    return;
                }
                this.handleBalloonHit(playerId, data);
                break;
            case MessageType.PLAYER_HIT:
                validationResult = validateMessage(data, playerHitMessageSchema);
                if (validationResult.error) {
                    console.error(`Invalid player hit message: ${validationResult.error}`);
                    return;
                }
                this.handlePlayerHit(playerId, data);
                break;
            case MessageType.CHAT_MESSAGE:
                validationResult = validateMessage(data, chatMessageSchema);
                if (validationResult.error) {
                    console.error(`Invalid chat message: ${validationResult.error}`);
                    return;
                }
                this.handleChatMessage(playerId, data);
                break;
            default:
                console.log(`Unhandled message type: ${data.type}`);
                break;
        }
    }

    private handlePlayerInfo(playerId: string, data: any): void {
        if (!this.players[playerId]) return;
        this.players[playerId].name = data.name || this.players[playerId].name;
        this.players[playerId].planeType = data.planeType || this.players[playerId].planeType;
        this.players[playerId].planeConfig = data.planeConfig || this.players[playerId].planeConfig;
        this.broadcastToAll({
            type: MessageType.PLAYER_UPDATE,
            playerId: playerId,
            name: this.players[playerId].name,
            planeType: this.players[playerId].planeType,
            planeConfig: this.players[playerId].planeConfig,
        });
        console.log(`Player ${playerId} set name to: ${this.players[playerId].name}`);
    }

    private handlePlayerUpdate(playerId: string, data: any): void {
        if (!this.players[data.playerId]) return;
        this.players[data.playerId].position = data.position;
        this.players[data.playerId].quaternion = data.quaternion;
        this.players[data.playerId].planeType = data.planeType;
        this.players[data.playerId].planeConfig = data.planeConfig;
        this.players[data.playerId].health = data.health;
        this.broadcastToAllExcept(data, data.playerId);
    }

    private handleShoot(playerId: string, data: any): void {
        if (!this.players[data.playerId]) return;
        const bulletId = `bullet-${data.playerId}-${Date.now()}`;
        const bullet: BulletModel = {
            id: bulletId,
            playerId: data.playerId,
            position: data.position,
            velocity: data.velocity,
            createdAt: Date.now(),
        };
        this.players[data.playerId].bullets.push(bullet);
        this.broadcastToAll({
            type: MessageType.NEW_BULLET,
            bulletId: bulletId,
            bullet: bullet,
        });
    }

    private handleBalloonHit(playerId: string, data: any): void {
        const balloonIndex = this.balloons.findIndex((b) => b.id === data.balloonId);
        if (balloonIndex !== -1 && this.balloons[balloonIndex].active) {
            this.balloons[balloonIndex].active = false;
            if (this.players[data.playerId]) {
                this.players[data.playerId].score += 10;
                this.broadcastToAll({
                    type: MessageType.BALLOON_HIT,
                    balloonId: data.balloonId,
                    playerId: data.playerId,
                    position: data.position,
                    newScore: this.players[data.playerId].score,
                    playerName: this.players[data.playerId].name,
                });
                setTimeout(() => {
                    this.respawnBalloon(balloonIndex);
                }, this.BALLOON_RESPAWN_TIME);
            }
        }
    }

    private respawnBalloon(balloonIndex: number): void {
        this.balloons[balloonIndex] = {
            id: `balloon-${Date.now()}`,
            position: {
                x: (Math.random() - 0.5) * 2500,
                y: 10 + Math.random() * 1500,
                z: (Math.random() - 0.5) * 1000,
            },
            color: Math.random() * 0xffffff,
            active: true,
        };
        this.broadcastToAll({
            type: MessageType.NEW_BALLOON,
            balloon: this.balloons[balloonIndex],
        });
    }

    private handlePlayerHit(playerId: string, data: any): void {
        const targetPlayerId = data.targetId;
        const shooterId = data.shooterId;
        if (!this.players[targetPlayerId] || !this.players[shooterId]) return;
        this.players[targetPlayerId].health -= 5;
        if (this.players[targetPlayerId].health < 0) {
            this.players[targetPlayerId].health = 0;
        }
        const targetName = this.players[targetPlayerId].name;
        const shooterName = this.players[shooterId].name;
        this.broadcastToAll({
            type: MessageType.PLAYER_HIT,
            targetId: targetPlayerId,
            shooterId: shooterId,
            position: data.position,
            newHealth: this.players[targetPlayerId].health,
            targetName: targetName,
            shooterName: shooterName,
        });
        console.log(`Player ${shooterId} hit player ${targetPlayerId}. New health: ${this.players[targetPlayerId].health}`);
        if (this.players[targetPlayerId].health <= 0) {
            console.log(`Player ${targetPlayerId} was destroyed by ${shooterId}`);
            this.players[targetPlayerId].health = 100;
            this.broadcastToAll({
                type: MessageType.PLAYER_KILLED,
                targetId: targetPlayerId,
                shooterId: shooterId,
                position: data.position,
                targetName: targetName,
                shooterName: shooterName,
            });
        }
    }

    private handleChatMessage(playerId: string, data: any): void {
        if (!this.players[playerId]) return;
        this.broadcastToAll({
            type: MessageType.CHAT_MESSAGE,
            playerId: playerId,
            playerName: this.players[playerId].name,
            message: data.message,
            timestamp: data.timestamp || Date.now(),
        });
    }

    private handleDisconnection(playerId: string): void {
        console.log(`Player ${playerId} disconnected`);
        this.broadcastToAll({
            type: MessageType.PLAYER_DISCONNECTED,
            playerId: playerId,
        });
        this.clientSockets.delete(playerId);
        delete this.players[playerId];
    }

    private cleanupExpiredBullets(): void {
        const now = Date.now();
        Object.keys(this.players).forEach((playerId) => {
            const player = this.players[playerId];
            const initialBulletCount = player.bullets.length;
            player.bullets = player.bullets.filter((bullet) => {
                return now - bullet.createdAt < this.BULLET_LIFESPAN;
            });
            if (initialBulletCount !== player.bullets.length) {
                this.broadcastToAll({
                    type: MessageType.BULLETS_UPDATE,
                    playerId: playerId,
                    bullets: player.bullets,
                });
            }
        });
    }

    private getGameState(): GameState {
        return {
            players: this.players,
            balloons: this.balloons,
        };
    }

    private sendToClient(ws: WebSocket, data: any): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    private broadcastToAll(data: any): void {
        if (!this.wss) return;
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }

    private broadcastToAllExcept(data: any, excludePlayerId: string): void {
        if (!this.wss) return;
        this.wss.clients.forEach((client) => {
            const clientPlayerId = (client as any).playerId;
            if (client.readyState === WebSocket.OPEN && clientPlayerId !== excludePlayerId) {
                client.send(JSON.stringify(data));
            }
        });
    }
}

export default NetworkService.getInstance();