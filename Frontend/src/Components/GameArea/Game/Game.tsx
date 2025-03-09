import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CameraView, GameSettings } from '../../../Models/GameModels';
import networkClient from '../../../Services/NetworkClient';
import gameService from '../../../Services/GameService'; // <-- וודא שזה העותק המתוקן של GameService
import audioService from '../../../Services/AudioService';
import LoadingScreen from '../../PagesArea/LoadingScreen/LoadingScreen';
import GameUI from '../GameUi/GameUi';
import './Game.css';

function Game(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [assetLoadingFailed, setAssetLoadingFailed] = useState(false);
  const gameInitializedRef = useRef(false);

  // הגדרות משחק ראשוניות
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    multiplayerEnabled: false,
    currentCameraView: CameraView.TPS, // מצלמה התחלתית = TPS
    gameStarted: false,
    score: 0,
    difficultyLevel: 1
  });

  // משתמש Mock אם אין Redux
  const [mockUser] = useState({
    firstName: "Guest",
    lastName: "Player",
  });

  const navigate = useNavigate();

  // Access current user from Redux store
  const user = useSelector((state: any) => state.user?.user);

  // Log user state for debugging
  useEffect(() => {
    console.log("Current user state:", user);
  }, [user]);

  // ------------------------------------------------
  // 1. טיפול בטעינת נכסים + מסך טעינה (LoadingScreen)
  // ------------------------------------------------
  useEffect(() => {
    // בוחרים משתמש מה-Redux או MOCK
    const currentUser = user || mockUser;
    // מגדירים את שם השחקן
    setPlayerName(`${currentUser.firstName} ${currentUser.lastName}`);
    console.log("Setting player name:", `${currentUser.firstName} ${currentUser.lastName}`);

    // פונקציה לבדיקת קיום של Asset
    const checkAssetExists = (path: string, type: 'image' | 'audio'): Promise<boolean> => {
      return new Promise(resolve => {
        if (type === 'image') {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = path;
        } else { // audio
          const audio = new Audio();
          audio.oncanplaythrough = () => resolve(true);
          audio.onerror = () => resolve(false);
          audio.src = path;
        }
      });
    };

    // נתיבי קבצים לבדיקה
    const assetsToCheck = [
      { path: '/assets/images/grass_top.jpg', type: 'image' as const },
      { path: '/assets/music/Scratch Dog.mp3', type: 'audio' as const }
    ];

    // ננסה למקם כל Asset בכמה Prefix-ים שונים
    const tryAssetWithAlternatives = async (asset: { path: string, type: 'image' | 'audio' }): Promise<boolean> => {
      const prefixes = ['', './', '../', '/public/', 'public/'];
      
      for (const prefix of prefixes) {
        const fullPath = prefix + asset.path;
        console.log(`Checking ${asset.type} at ${fullPath}`);
        const exists = await checkAssetExists(fullPath, asset.type);
        if (exists) {
          console.log(`Found ${asset.type} at: ${fullPath}`);
          return true;
        }
      }
      
      console.error(`Could not find ${asset.type} ${asset.path} with any prefix`);
      return false;
    };

    // טעינת אחוזי התקדמות (Fake) + בדיקת נכסים
    let loadingTimerId: NodeJS.Timeout | null = null;
    let currentProgress = 0;
    
    const advanceLoading = async () => {
      // עלייה ראשונה, בודקים אם כל הנכסים תקינים
      if (currentProgress === 0) {
        let assetCheckPromises = assetsToCheck.map(asset => tryAssetWithAlternatives(asset));
        const assetResults = await Promise.all(assetCheckPromises);
        
        // אם לא מצאנו אפילו אחד תקין, נגדיר assetLoadingFailed
        if (!assetResults.some(result => result)) {
          console.warn("All assets failed to load, using fallbacks");
          setAssetLoadingFailed(true);
        }
      }
      
      // נעדכן את ה-Progress עד 100
      if (currentProgress < 100) {
        currentProgress += 4;
        setLoadingProgress(Math.min(currentProgress, 100));
      }
      
      // אם הגענו ל-100%, מפסיקים
      if (currentProgress >= 100) {
        if (loadingTimerId) {
          clearTimeout(loadingTimerId);
          loadingTimerId = null;
        }
        return;
      }
      
      loadingTimerId = setTimeout(advanceLoading, 200);
    };
    
    // התחלת התהליך
    advanceLoading();
    
    // פונקציית נקיון
    return () => {
      if (loadingTimerId) {
        clearTimeout(loadingTimerId);
      }

      // אם הקומפוננטה יורדת (unmount) והמשחק רץ, ננקה משאבים
      if (gameStarted) {
        console.log("Cleaning up game resources...");
        if (gameSettings.multiplayerEnabled) {
          networkClient.disconnect();
        }
        audioService.stopTrack();
        gameService.cleanup();
      }
    };
  }, [navigate, gameStarted, gameSettings.multiplayerEnabled, user, mockUser]);

  // כאשר הטעינה הגיעה ל-100%, נחכה שניה ואז נסיר את מסך הטעינה
  useEffect(() => {
    if (loadingProgress === 100) {
      console.log("Loading complete, preparing to start game...");
      setTimeout(() => {
        console.log("Setting isLoading to false");
        setIsLoading(false);
      }, 1000);
    }
  }, [loadingProgress]);

  // ------------------------------------------------
  // 2. פונקציה שתפעיל את המשחק ממש (אחרי שהמסך ירד)
  // ------------------------------------------------
  const handleStartGame = useCallback(() => {
    if (!containerRef.current) {
      console.error("Container ref is null, cannot start game");
      return;
    }

    // למנוע ריצה כפולה
    if (gameInitializedRef.current) {
      console.log("Game already initialized, skipping");
      return;
    }

    try {
      gameInitializedRef.current = true;
      console.log("Initializing game...");
      // 1) אתחול gameService (setupMouseListeners וכו')
      gameService.initialize(showMessage, updateGameSettings);

      console.log("Setting up game scene...");
      // 2) יצירת סצנה
      gameService.setupScene(containerRef.current);

      console.log("Starting game loop...");
      // 3) לולאת עדכון
      gameService.startGameLoop();

      console.log("Starting audio...");
      // 4) מוזיקה
      audioService.setMessageCallback(showMessage);
      audioService.playMusic();

      // סמן שהמשחק החל
      setGameStarted(true);
      console.log("Game started successfully");

      // אם נכשל הטעינה (דגל assetLoadingFailed), מציגים אזהרה
      if (assetLoadingFailed) {
        setTimeout(() => {
          showMessage("Some assets couldn't be loaded. Using fallback graphics and audio.");
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to start game:", error);
      showMessage("Error starting game. Check console for details.");
      
      // אם נכשל, אפשר לנסות שוב
      gameInitializedRef.current = false;

      // נחזור למסך טעינה
      setIsLoading(true);
      setLoadingProgress(0);
    }
  }, [containerRef, assetLoadingFailed]);

  // ------------------------------------------------
  // 3. פונקציות עזר להודעות / עידכון מצב / מולטיפלייר
  // ------------------------------------------------
  const showMessage = (message: string) => {
    console.log("Game message:", message);

    // יצירת div צף למסרים
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '20%';
    messageDiv.style.left = '10%';
    messageDiv.style.backgroundColor = 'black';
    messageDiv.style.color = 'white'; 
    messageDiv.style.padding = '30px';
    messageDiv.style.fontSize = '34px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.opacity = '0.8';
    messageDiv.style.zIndex = '1000';
    messageDiv.innerText = message;

    document.body.appendChild(messageDiv);
    setTimeout(() => {
      if (document.body.contains(messageDiv)) {
        document.body.removeChild(messageDiv);
      }
    }, 2000);
  };

  const updateGameSettings = (settings: GameSettings) => {
    console.log("Updating game settings:", settings);
    setGameSettings(settings);
  };

  // כפתור Toggle בממשק (מפעיל / מכבה Multiplayer)
  const handleToggleMultiplayer = () => {
    if (!gameStarted) return;

    const newMultiplayerState = !gameSettings.multiplayerEnabled;
    console.log("Toggling multiplayer:", newMultiplayerState);

    if (newMultiplayerState) {
      networkClient.setPlayerName(playerName);
      networkClient.initialize({
        onConnected: handleConnected,
        onDisconnected: handleDisconnected,
        onPlayerJoined: handlePlayerJoined,
        onPlayerLeft: handlePlayerLeft,
        onPlayerUpdated: handlePlayerUpdated,
        onBulletCreated: handleBulletCreated,
        onBalloonHit: handleBalloonHit,
        onPlayerHit: handlePlayerHit,
        onPlayerKilled: handlePlayerKilled,
        onNewBalloon: handleNewBalloon,
        onBulletsUpdated: handleBulletsUpdated,
        onMessage: showMessage,
        onChatMessage: handleChatMessage
      });
      networkClient.connect();
    } else {
      networkClient.disconnect();
    }

    setGameSettings(prev => ({
      ...prev,
      multiplayerEnabled: newMultiplayerState
    }));

    showMessage(newMultiplayerState ? "מצב מרובה משתתפים: מופעל" : "מצב מרובה משתתפים: מבוטל");
  };

  // ------------------------------------------------
  // 4. האזנה לאירועי Multiplayer (כניסה, יציאה, יריות וכו')
  // ------------------------------------------------
  const handleConnected = (playerId: string, gameState: any) => {
    console.log("Connected to server, player ID:", playerId);
    gameService.initializeMultiplayer(gameState);
  };

  const handleDisconnected = () => {
    console.log("Disconnected from server");
    gameService.cleanupMultiplayer();
    setGameSettings(prev => ({
      ...prev,
      multiplayerEnabled: false
    }));
  };

  const handlePlayerJoined = (playerId: string, player: any) => {
    console.log("Player joined:", playerId);
    gameService.addRemotePlayer(playerId, player);
  };

  const handlePlayerLeft = (playerId: string) => {
    console.log("Player left:", playerId);
    gameService.removeRemotePlayer(playerId);
  };

  const handlePlayerUpdated = (playerId: string, position: any, quaternion: any, planeType: string, planeConfig: any) => {
    gameService.updateRemotePlayer(playerId, position, quaternion, planeType, planeConfig);
  };

  const handleBulletCreated = (bullet: any) => {
    gameService.createRemoteBullet(bullet);
  };

  const handleBalloonHit = (balloonId: string, playerId: string, position: any, newScore: number) => {
    console.log("Balloon hit:", balloonId, "by player:", playerId);
    gameService.handleBalloonHit(balloonId, playerId, position, newScore);
  };

  const handlePlayerHit = (targetId: string, shooterId: string, position: any, newHealth: number) => {
    console.log("Player hit:", targetId, "by shooter:", shooterId);
    gameService.handlePlayerHit(targetId, shooterId, position, newHealth);
  };

  const handlePlayerKilled = (targetId: string, shooterId: string, position: any) => {
    console.log("Player killed:", targetId, "by shooter:", shooterId);
    gameService.handlePlayerKilled(targetId, shooterId, position);
  };

  const handleNewBalloon = (balloon: any) => {
    gameService.createBalloon(balloon);
  };

  const handleBulletsUpdated = (playerId: string, bullets: any[]) => {
    gameService.updateRemoteBullets(playerId, bullets);
  };

  const handleChatMessage = (_playerId: string, playerName: string, message: string) => {
    console.log("Chat message from", playerName, ":", message);
    gameService.addChatMessage(`${playerName}: ${message}`);
  };

  // ------------------------------------------------
  // 5. אם המסך כבר לא ב-Loading והמשחק לא התחיל עדיין,
  //    נפעיל את handleStartGame() אוטומטית
  // ------------------------------------------------
  useEffect(() => {
    if (!isLoading && !gameStarted && containerRef.current && !gameInitializedRef.current) {
      console.log("Auto-starting game after loading screen closed");
      handleStartGame();
    }
  }, [isLoading, gameStarted, handleStartGame]);

  console.log("Rendering Game component, isLoading:", isLoading, "gameStarted:", gameStarted);

  // ------------------------------------------------
  // 6. JSX סופי
  // ------------------------------------------------
  return (
    <div className="game-page">
      {isLoading ? (
        // מסך טעינה
        <LoadingScreen
          progress={loadingProgress}
          onStart={() => {
            console.log("Start button clicked");
            setIsLoading(false);
          }}
          showStartButton={loadingProgress === 100}
        />
      ) : (
        // אם לא בטעינה, מציגים את קנבס ה-3D ואת ה-UI
        <>
          {/* אלמנט DIV שה-Renderer של Three.js מוחדר אליו */}
          <div ref={containerRef} className="game-container"></div>

          {/* ממשק המשחק (כפתורים, מידע, וכו') */}
          <GameUI
            settings={gameSettings}
            playerName={playerName}
            onToggleMultiplayer={handleToggleMultiplayer}
          />
        </>
      )}
    </div>
  );
}

export default Game;
