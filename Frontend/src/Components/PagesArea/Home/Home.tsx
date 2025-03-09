import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gameService from '../../../Services/GameService';
import { CameraView, GameSettings } from '../../../Models/GameModels';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageVisible, setMessageVisible] = useState<boolean>(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    multiplayerEnabled: false,
    currentCameraView: CameraView.TPS,
    gameStarted: false,
    score: 0,
    difficultyLevel: 1
  });
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  // Initialize game when component mounts
  useEffect(() => {
    // Initialize game service
    gameService.initialize(
      handleShowMessage,
      handleUpdateHUD
    );

    // Clean up when component unmounts
    return () => {
      gameService.cleanup();
    };
  }, []);

  // Set up game scene when container ref is available
  useEffect(() => {
    if (gameContainerRef.current) {
      gameService.setupScene(gameContainerRef.current);
    }
  }, [gameContainerRef]);

  // Handle showing in-game messages
  const handleShowMessage = (message: string) => {
    setMessage(message);
    setMessageVisible(true);

    // Hide message after 3 seconds
    setTimeout(() => {
      setMessageVisible(false);
    }, 3000);
  };

  // Handle updating game HUD
  const handleUpdateHUD = (settings: GameSettings) => {
    setGameSettings(settings);
  };

  // Handle starting the game
  const handleStartGame = () => {
    gameService.startGameLoop();
    setGameStarted(true);
  };

  // Handle multiplayer toggle
  const toggleMultiplayer = () => {
    const newSettings = { ...gameSettings };
    newSettings.multiplayerEnabled = !newSettings.multiplayerEnabled;
    setGameSettings(newSettings);
    handleShowMessage(`Multiplayer: ${newSettings.multiplayerEnabled ? 'Enabled' : 'Disabled'}`);
  };

  // Handle navigation to settings page
  const handleOpenSettings = () => {
    navigate('/settings');
  };

  // Toggle instructions panel
  const toggleInstructions = () => {
    setShowInstructions(!showInstructions);
  };

  return (
    <div className="home-container">
      <div className="game-overlay">
        {!gameStarted && (
          <div className="start-menu">
            <h1>Flight Simulator</h1>
            <div className="menu-buttons">
              <button className="menu-button primary" onClick={handleStartGame}>
                Start Game
              </button>
              <button className="menu-button" onClick={toggleMultiplayer}>
                {gameSettings.multiplayerEnabled ? 'Disable Multiplayer' : 'Enable Multiplayer'}
              </button>
              <button className="menu-button" onClick={handleOpenSettings}>
                Settings
              </button>
              <button className="menu-button" onClick={toggleInstructions}>
                Instructions
              </button>
            </div>
          </div>
        )}

        {gameStarted && (
          <div className="game-hud">
            <div className="hud-top">
              <div className="hud-score">
                Score: {gameSettings.score}
              </div>
              <div className="hud-level">
                Level: {gameSettings.difficultyLevel}
              </div>
              <div className="hud-camera">
                Camera: {gameSettings.currentCameraView}
              </div>
            </div>
            <div className="hud-controls">
              <button className="control-button" onClick={toggleInstructions}>
                ?
              </button>
            </div>
          </div>
        )}

        {messageVisible && (
          <div className="game-message">
            {message}
          </div>
        )}

        {showInstructions && (
          <div className="instructions-panel">
            <h2>Game Controls</h2>
            <div className="instructions-content">
              <div className="instruction">
                <div className="key">Arrow Keys</div>
                <div className="description">Control aircraft movement</div>
              </div>
              <div className="instruction">
                <div className="key">Space</div>
                <div className="description">Fire weapons</div>
              </div>
              <div className="instruction">
                <div className="key">C</div>
                <div className="description">Switch camera view</div>
              </div>
              <div className="instruction">
                <div className="key">P</div>
                <div className="description">Switch aircraft</div>
              </div>
              <div className="instruction">
                <div className="key">R</div>
                <div className="description">Barrel roll</div>
              </div>
              <div className="instruction">
                <div className="key">M</div>
                <div className="description">Toggle mouse look</div>
              </div>
            </div>
            <button className="close-button" onClick={toggleInstructions}>
              Close
            </button>
          </div>
        )}
      </div>

      <div className="game-container" ref={gameContainerRef}></div>
    </div>
  );
};

export default Home;