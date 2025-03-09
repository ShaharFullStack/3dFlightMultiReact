import React, { useEffect } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  progress: number;
  onStart: () => void;
  showStartButton: boolean;
}

function LoadingScreen({ progress, onStart, showStartButton }: LoadingScreenProps): JSX.Element {
  useEffect(() => {
    console.log("Loading screen rendered with progress:", progress);
  }, [progress]);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <h1 className="game-title">Balloon Fighter</h1>
        
        <div className="loading-bar-container">
          <div 
            className="loading-bar"
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
        
        <p className="loading-text">
          {progress < 100 ? `טוען משחק... ${Math.floor(progress)}%` : 'המשחק מוכן!'}
        </p>
        
        {showStartButton && (
          <button className="start-button pulse" onClick={onStart}>
            התחל משחק
          </button>
        )}
      </div>
      
      <div className="loading-tips">
        <h2>טיפים למשחק:</h2>
        <div className="tips-container">
          <div className="tip">
            <h3>בקרת טיסה</h3>
            <p>השתמש במקשים W/S כדי לשלוט בזווית העלייה והירידה של המטוס.</p>
          </div>
          
          <div className="tip">
            <h3>מצב מרובה משתתפים</h3>
            <p>לחץ על M כדי להפעיל מצב מרובה משתתפים ולהתחרות עם שחקנים אחרים.</p>
          </div>
          
          <div className="tip">
            <h3>סיבוב חבית</h3>
            <p>לחץ R כדי לבצע סיבוב חבית - תמרון הגנתי שיכול לעזור לך להתחמק מירי.</p>
          </div>
          
          <div className="tip">
            <h3>חדר שיחות</h3>
            <p>במצב מרובה משתתפים, לחץ על T כדי לפתוח את חדר השיחות ולתקשר עם שחקנים אחרים.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;