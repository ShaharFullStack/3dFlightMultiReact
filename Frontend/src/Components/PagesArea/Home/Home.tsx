// src/Components/PagesArea/Home/Home.tsx

import './Home.css';

function Home(): JSX.Element {


  return (
    <div className="Home">
      <div className="hero">
        <div className="hero-content">
          <h1>Welcome to Balloon Fighter</h1>
          <p>Take to the skies and pop those balloons in this exciting multiplayer aerial combat game!</p>
       
          
          <div className="cta-buttons">
            

          </div>
        </div>
      </div>
      
      <div className="features">
        <div className="feature-card">
          <h3>Multiplayer Combat</h3>
          <p>Challenge other players in real-time aerial combat! Shoot down balloons and compete for the highest score.</p>
        </div>
        
        <div className="feature-card">
          <h3>Multiple Aircraft</h3>
          <p>Choose from different planes with unique characteristics. Find the one that fits your playing style!</p>
        </div>
        
        <div className="feature-card">
          <h3>Dynamic Environment</h3>
          <p>Navigate through a detailed world with rivers, buildings, and changing weather conditions.</p>
        </div>
      </div>
      
      <div className="game-info">
        <h2>How to Play</h2>
        <div className="controls-info">
          <div className="controls-section">
            <h3>Basic Controls</h3>
            <ul>
              <li><strong>W/S</strong> - Pitch up/down</li>
              <li><strong>A/D</strong> - Roll left/right</li>
              <li><strong>Q/E</strong> - Yaw left/right</li>
              <li><strong>Arrow Up/Down</strong> - Increase/decrease speed</li>
              <li><strong>Space</strong> - Fire weapons</li>
            </ul>
          </div>
          
          <div className="controls-section">
            <h3>Special Moves</h3>
            <ul>
              <li><strong>R</strong> - Perform barrel roll</li>
              <li><strong>C</strong> - Change camera view</li>
              <li><strong>M</strong> - Toggle multiplayer mode</li>
              <li><strong>T</strong> - Open chat (in multiplayer mode)</li>
              <li><strong>[ / ]</strong> - Previous/next music track</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;