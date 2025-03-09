import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import gameService from '../../../Services/GameService';
import { CameraView, GameSettings } from '../../../Models/GameModels';
import { AppState } from '../../../Redux/Store';
import './Home.css';

// Define user roles enum for type safety
enum UserRole {
  GUEST = "GUEST",
  USER = "USER",
  ADMIN = "ADMIN"
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const gameContainerRef = useRef<HTMLDivElement>(null);
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
  
  // Get user from Redux store
  const user = useSelector((state: AppState) => state.user);
  
  // Determine user role - default to GUEST if not logged in
  const userRole = user ? user.roleId : UserRole.GUEST;
  
  // Role-specific states and settings
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);

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
    if (userRole === UserRole.GUEST) {
      // For guests, prompt to login or continue with limited access
      setMessage('התחבר או הירשם לשחק במשחק המלא');
      setMessageVisible(true);
      setTimeout(() => {
        setMessageVisible(false);
      }, 3000);
    }
    
    gameService.startGameLoop();
    setGameSettings(prev => ({...prev, gameStarted: true}));
  };

  // Handle login navigation
  const handleLogin = () => {
    navigate('/login');
  };

  // Handle registration navigation
  const handleRegister = () => {
    navigate('/register');
  };

  // Handle navigation to settings page
  const handleOpenSettings = () => {
    navigate('/settings');
  };

  // Handle navigation to admin panel (Admin only)
  const handleOpenAdminPanel = () => {
    setShowAdminPanel(!showAdminPanel);
  };

  // Handle navigation to leaderboard
  const handleOpenLeaderboard = () => {
    navigate('/leaderboard');
  };

  // Toggle instructions panel
  const toggleInstructions = () => {
    setShowInstructions(!showInstructions);
  };

  // Renders menu buttons based on user role
  const renderMenuButtons = () => {
    // Common buttons for all roles
    const commonButtons = (
      <>
        <button className="menu-button" onClick={toggleInstructions}>
          הוראות
        </button>
        <button className="menu-button" onClick={handleOpenLeaderboard}>
          טבלת התוצאות
        </button>
      </>
    );

    // Guest-specific buttons
    if (userRole === UserRole.GUEST) {
      return (
        <>
          <button className="menu-button primary" onClick={handleStartGame}>
            התחל משחק מוגבל
          </button>
          <button className="menu-button highlighted" onClick={handleLogin}>
            התחברות
          </button>
          <button className="menu-button" onClick={handleRegister}>
            הרשמה
          </button>
          {commonButtons}
        </>
      );
    }

    // User-specific buttons
    if (userRole === 1) {
      return (
        <>
          <button className="menu-button primary" onClick={handleStartGame}>
            התחל משחק
          </button>
          <button className="menu-button" onClick={handleOpenSettings}>
            הגדרות
          </button>
          {commonButtons}
        </>
      );
    }

    // Admin-specific buttons
    if (userRole === 2) {
      return (
        <>
          <button className="menu-button primary" onClick={handleStartGame}>
            התחל משחק
          </button>
          <button className="menu-button admin" onClick={handleOpenAdminPanel}>
            פאנל ניהול
          </button>
          <button className="menu-button" onClick={handleOpenSettings}>
            הגדרות
          </button>
          {commonButtons}
        </>
      );
    }
  };

  // Admin Panel Component
  const AdminPanel = () => {
    if (!showAdminPanel || userRole !== 2) return null;
    
    return (
      <div className="admin-panel">
        <h2>פאנל ניהול</h2>
        <div className="admin-stats">
          <div className="stat-card">
            <h3>משחקים פעילים</h3>
            <p className="stat-value">42</p>
          </div>
          <div className="stat-card">
            <h3>משתמשים מחוברים</h3>
            <p className="stat-value">187</p>
          </div>
          <div className="stat-card">
            <h3>משתמשים רשומים</h3>
            <p className="stat-value">1,243</p>
          </div>
        </div>
        <div className="admin-actions">
          <button className="admin-button">איפוס נתוני המשחקים</button>
          <button className="admin-button">ניהול משתמשים</button>
          <button className="admin-button">שינוי הגדרות שרת</button>
        </div>
        <button className="close-button" onClick={handleOpenAdminPanel}>סגור</button>
      </div>
    );
  };

  // Welcome message based on user role
  const getWelcomeMessage = () => {
    if (userRole === 2) {
      return `ברוך הבא, מנהל ${user.firstName}!`;
    } else if (userRole === 1) {
      return `ברוך הבא, ${user.firstName}!`;
    } else {
      return 'ברוך הבא למשחק!';
    }
  };

  return (
    <div className="home-container" dir="rtl">
      <div className="game-overlay">
        {!gameSettings.gameStarted && (
          <div className="start-menu">
            <h1>סימולטור טיסה</h1>
            <p className="welcome-message">{getWelcomeMessage()}</p>
            <div className="menu-buttons">
              {renderMenuButtons()}
            </div>
            {userRole === UserRole.GUEST && (
              <p className="guest-notice">המשך כאורח מגביל את הגישה לחלק מתכונות המשחק</p>
            )}
          </div>
        )}

        {gameSettings.gameStarted && (
          <div className="game-hud">
            <div className="hud-top">
              <div className="hud-score">
                ניקוד: {gameSettings.score}
              </div>
              <div className="hud-level">
                רמה: {gameSettings.difficultyLevel}
              </div>
              <div className="hud-camera">
                מצלמה: {gameSettings.currentCameraView}
              </div>
              {userRole === 2 && (
                <div className="hud-admin">
                  מצב אדמין
                </div>
              )}
            </div>
            <div className="hud-controls">
              <button className="control-button" onClick={toggleInstructions}>
                ?
              </button>
              {userRole === 2 && (
                <button className="control-button admin" onClick={handleOpenAdminPanel}>
                  A
                </button>
              )}
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
            <h2>הוראות משחק</h2>
            <div className="instructions-content">
              <div className="instruction">
                <div className="key">חיצי מקלדת</div>
                <div className="description">שליטה בתזוזת המטוס</div>
              </div>
              <div className="instruction">
                <div className="key">רווח</div>
                <div className="description">ירי</div>
              </div>
              <div className="instruction">
                <div className="key">C</div>
                <div className="description">החלפת תצוגת מצלמה</div>
              </div>
              <div className="instruction">
                <div className="key">P</div>
                <div className="description">החלפת סוג מטוס</div>
              </div>
              <div className="instruction">
                <div className="key">R</div>
                <div className="description">ביצוע גלגול חבית</div>
              </div>
              <div className="instruction">
                <div className="key">M</div>
                <div className="description">שליטה במצלמה עם העכבר</div>
              </div>
              {userRole === 2 && (
                <div className="instruction admin">
                  <div className="key">A</div>
                  <div className="description">פתיחת פאנל ניהול</div>
                </div>
              )}
            </div>
            <button className="close-button" onClick={toggleInstructions}>
              סגור
            </button>
          </div>
        )}

        {/* Admin Panel */}
        <AdminPanel />
      </div>

      <div className="game-container" ref={gameContainerRef}></div>
    </div>
  );
};

export default Home;