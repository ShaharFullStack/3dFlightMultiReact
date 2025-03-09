// src/Components/PagesArea/GameUI/GameUI.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameSettings } from '../../../Models/GameModels';
import networkClient from '../../../Services/NetworkClient';
import './GameUi.css';

interface GameUIProps {
  settings: GameSettings;
  playerName: string;
  onToggleMultiplayer: () => void;
  onAddChatMessage?: (message: string) => void;
  onUpdatePlayerStatus?: (altitude: number, health: number) => void;
  onUpdateRemotePlayerScore?: (playerId: string, score: number) => void;
}

interface GameUIRef {
  addChatMessage: (message: string) => void;
}

const GameUI = React.forwardRef<GameUIRef, GameUIProps>(
  ({ settings, playerName, onToggleMultiplayer, onAddChatMessage, onUpdatePlayerStatus, onUpdateRemotePlayerScore }, ref) => {
    const [showControls, setShowControls] = useState<boolean>(true);
    const [showChat, setShowChat] = useState<boolean>(false);
    const [chatMessage, setChatMessage] = useState<string>("");
    const [chatMessages, setChatMessages] = useState<string[]>([]);
    const [playerScore, setPlayerScore] = useState<number>(0);
    const [remotePlayerScores, setRemotePlayerScores] = useState<Record<string, number>>({});
    const [altitude, setAltitude] = useState<number>(0);
    const [health, setHealth] = useState<number>(100);
    const chatInputRef = useRef<HTMLInputElement>(null);
    
    // Function to toggle chat
    const toggleChat = useCallback(() => {
      const newShowChat = !showChat;
      setShowControls(prev => prev); // preserve controls state
      setShowChat(newShowChat);
      
      if (newShowChat && chatInputRef.current) {
        // Focus chat input when opened
        setTimeout(() => {
          chatInputRef.current?.focus();
        }, 100);
      }
    }, [showChat]);
    
    useEffect(() => {
      // Update score from settings
      setPlayerScore(settings.score);
      
      // Listen for keyboard events
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'h' || e.key === 'H') {
          setShowControls(prev => !prev);
        }
        
        if (settings.multiplayerEnabled && (e.key === 't' || e.key === 'T')) {
          toggleChat();
        }
        
        if (showChat && e.key === 'Escape') {
          setShowChat(false);
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [settings.score, settings.multiplayerEnabled, showChat, toggleChat]);
    
    // Handle chat message submission
    const handleChatSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!chatMessage.trim()) return;
      
      // Send message to server
      if (settings.multiplayerEnabled) {
        networkClient.sendChatMessage(chatMessage);
        
        // Add to local chat
        setChatMessages(prev => [...prev, `You: ${chatMessage}`]);
      }
      
      setChatMessage("");
    };

    // Add a chat message from another player
    const addChatMessage = (message: string) => {
      setChatMessages(prev => [...prev, message]);
      // Call the prop if it exists
      if (onAddChatMessage) {
        onAddChatMessage(message);
      }
    };
    
    // Update player and game status
    const updatePlayerStatus = (newAltitude: number, newHealth: number) => {
      setAltitude(newAltitude);
      setHealth(newHealth);
      // Call the prop if it exists
      if (onUpdatePlayerStatus) {
        onUpdatePlayerStatus(newAltitude, newHealth);
      }
    };
    
    // Update remote player score
    const updateRemotePlayerScore = (playerId: string, score: number) => {
      setRemotePlayerScores(prev => ({
        ...prev,
        [playerId]: score
      }));
      // Call the prop if it exists
      if (onUpdateRemotePlayerScore) {
        onUpdateRemotePlayerScore(playerId, score);
      }
    };

    // Expose functions through ref
    React.useImperativeHandle(ref, () => ({
      addChatMessage,
      updatePlayerStatus,
      updateRemotePlayerScore
    }));

    return (
      <div className="game-ui">
        {/* HUD elements */}
        <div className="hud">
          <div className="altitude-indicator">
            <span>גובה:</span> {altitude.toFixed(1)} מ'
          </div>
          
          <div className="score-indicator">
            <span>ניקוד:</span> {playerScore}
          </div>
          
          <div className="difficulty-indicator">
            <span>רמת קושי:</span> {settings.difficultyLevel}
          </div>
          
          {settings.multiplayerEnabled && (
            <div className="connection-status connected">
              <span>סטטוס:</span> מחובר
            </div>
          )}
        </div>
        
        {/* Health bar */}
        <div className="health-bar-container">
          <div 
            className={`health-bar ${health <= 30 ? 'danger' : health <= 60 ? 'warning' : ''}`}
            style={{ width: `${health}%` }}
          ></div>
        </div>
        
        {/* Controls info */}
        {showControls && (
          <div className="controls-info">
            <h3>בקרות:</h3>
            <p>W/S - הטייה למעלה/למטה (Pitch)</p>
            <p>A/D - גלגול שמאלה/ימינה (Roll)</p>
            <p>Q/E - פנייה שמאלה/ימינה (Yaw)</p>
            <p>חצים למעלה/למטה - האצה/האטה</p>
            <p>חצים שמאלה/ימינה - כיוון עדין של גלגול</p>
            <p>רווח - ירי</p>
            <p>C - החלפת מצלמה</p>
            <p>P - החלפת מטוס</p>
            <p>R - ביצוע סיבוב חבית (Barrel Roll)</p>
            <p>[ / ] - החלפת שיר קודם/הבא</p>
            <p>M - הפעלת/ביטול מצב מרובה משתתפים</p>
            <p>T - פתיחת צ'אט (במצב מרובה משתתפים)</p>
            <p>H - הסתרת/הצגת בקרות</p>
          </div>
        )}
        
        {/* Multiplayer scoreboard */}
        {settings.multiplayerEnabled && (
          <div className="multiplayer-scoreboard">
            <h3>טבלת ניקוד</h3>
            <table>
              <thead>
                <tr>
                  <th>שחקן</th>
                  <th>ניקוד</th>
                </tr>
              </thead>
              <tbody>
                <tr className="local-player">
                  <td>{playerName}</td>
                  <td>{playerScore}</td>
                </tr>
                {Object.entries(remotePlayerScores).map(([playerId, score]) => (
                  <tr key={playerId}>
                    <td>{playerId.substring(0, 8)}</td>
                    <td>{score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Multiplayer indicator */}
        {settings.multiplayerEnabled && (
          <div className="multiplayer-badge">
            מצב מרובה משתתפים פעיל
          </div>
        )}

        {/* Multiplayer chat */}
        {settings.multiplayerEnabled && showChat && (
          <div className="chat-overlay">
            <div className="chat-messages">
              {chatMessages.map((msg, index) => (
                <div key={index} className="chat-message">
                  {msg}
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit}>
              <input
                ref={chatInputRef}
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="הקלד הודעה ולחץ Enter..."
                className="chat-input"
              />
            </form>
          </div>
        )}

        {/* Game buttons */}
        <div className="game-buttons">
          <button
            className={`multiplayer-toggle ${settings.multiplayerEnabled ? 'active' : ''}`}
            onClick={onToggleMultiplayer}
          >
            {settings.multiplayerEnabled ? 'ביטול מצב מרובה משתתפים' : 'הפעלת מצב מרובה משתתפים'}
          </button>
          
          {settings.multiplayerEnabled && (
            <button
              className="chat-toggle"
              onClick={toggleChat}
            >
              {showChat ? 'סגור צ\'אט' : 'פתח צ\'אט'}
            </button>
          )}
        </div>
      </div>
    );
  }
);

export default GameUI;