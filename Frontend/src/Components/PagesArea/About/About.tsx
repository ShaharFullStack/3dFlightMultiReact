import React from 'react';
import { useNavigate } from 'react-router-dom';
import './About.css';

const About: React.FC = () => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <div className="about-container">
      <div className="about-content">
        <header className="about-header">
          <h1>About Flight Simulator</h1>
          <button className="back-button" onClick={handleBackClick}>
            Back to Game
          </button>
        </header>

        <section className="about-section">
          <h2>Game Overview</h2>
          <p>
            Flight Simulator is an immersive 3D aerial combat and exploration game
            built using modern web technologies. Players control various aircraft
            to navigate through a detailed environment, engage with targets,
            and compete for high scores in both single-player and multiplayer modes.
          </p>
          <p>
            The game features realistic flight physics, multiple camera perspectives,
            and interactive elements that challenge players' reflexes and strategic thinking.
          </p>
        </section>

        <section className="about-section">
          <h2>Technical Features</h2>
          <div className="features-grid">
            <div className="feature-item">
              <h3>3D Graphics Engine</h3>
              <p>
                Powered by Three.js, the game renders detailed landscapes,
                aircraft models, and special effects with WebGL acceleration.
              </p>
            </div>
            <div className="feature-item">
              <h3>Physics Simulation</h3>
              <p>
                Realistic flight dynamics with customizable aircraft performance
                characteristics and environmental factors.
              </p>
            </div>
            <div className="feature-item">
              <h3>Camera Systems</h3>
              <p>
                Multiple viewing perspectives including first-person cockpit view,
                third-person follow camera, and strategic distant view.
              </p>
            </div>
            <div className="feature-item">
              <h3>Multiplayer Capabilities</h3>
              <p>
                Real-time networking allows players to compete or cooperate
                in shared game environments with low-latency interactions.
              </p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Aircraft Fleet</h2>
          <div className="aircraft-list">
            <div className="aircraft-item">
              <div className="aircraft-image plane-one"></div>
              <div className="aircraft-details">
                <h3>Fighter Jet</h3>
                <p>A balanced aircraft with good maneuverability and moderate weapons systems.</p>
                <div className="aircraft-stats">
                  <div className="stat">
                    <span className="stat-label">Speed</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Handling</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Firepower</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="aircraft-item">
              <div className="aircraft-image plane-two"></div>
              <div className="aircraft-details">
                <h3>Bomber</h3>
                <p>A heavy aircraft with superior weapons but reduced agility.</p>
                <div className="aircraft-stats">
                  <div className="stat">
                    <span className="stat-label">Speed</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Handling</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '55%' }}></div>
                    </div>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Firepower</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="aircraft-item">
              <div className="aircraft-image plane-three"></div>
              <div className="aircraft-details">
                <h3>Interceptor</h3>
                <p>A lightweight, high-speed aircraft designed for quick maneuvers and rapid response.</p>
                <div className="aircraft-stats">
                  <div className="stat">
                    <span className="stat-label">Speed</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Handling</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Firepower</span>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Development Team</h2>
          <div className="team-grid">
            <div className="team-member">
              <div className="team-member-avatar"></div>
              <h3>Lead Developer</h3>
              <p>
                Responsible for core game architecture, 3D rendering systems,
                and physics implementation.
              </p>
            </div>
            <div className="team-member">
              <div className="team-member-avatar"></div>
              <h3>UI/UX Designer</h3>
              <p>
                Created the user interface, visual styling, and interactive
                elements throughout the game.
              </p>
            </div>
            <div className="team-member">
              <div className="team-member-avatar"></div>
              <h3>Game Artist</h3>
              <p>
                Designed aircraft models, environmental assets, and visual effects
                that bring the game world to life.
              </p>
            </div>
            <div className="team-member">
              <div className="team-member-avatar"></div>
              <h3>Network Engineer</h3>
              <p>
                Implemented the multiplayer systems, ensuring smooth synchronization
                across different client instances.
              </p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Technology Stack</h2>
          <div className="tech-stack">
            <div className="tech-item">
              <h3>Frontend</h3>
              <ul>
                <li>React for UI components</li>
                <li>TypeScript for type-safe code</li>
                <li>Three.js for 3D rendering</li>
                <li>CSS for styling and animations</li>
              </ul>
            </div>
            <div className="tech-item">
              <h3>Backend</h3>
              <ul>
                <li>Node.js server for multiplayer</li>
                <li>WebSockets for real-time communication</li>
                <li>MongoDB for player data storage</li>
                <li>Express.js for API endpoints</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Future Development</h2>
          <div className="roadmap">
            <div className="roadmap-item">
              <div className="roadmap-marker planned"></div>
              <div className="roadmap-content">
                <h3>New Aircraft Types</h3>
                <p>Additional aircraft models with unique handling characteristics and weapon systems.</p>
              </div>
            </div>
            <div className="roadmap-item">
              <div className="roadmap-marker in-progress"></div>
              <div className="roadmap-content">
                <h3>Enhanced Environment</h3>
                <p>Weather effects, day/night cycles, and more diverse terrain features.</p>
              </div>
            </div>
            <div className="roadmap-item">
              <div className="roadmap-marker planned"></div>
              <div className="roadmap-content">
                <h3>Mission System</h3>
                <p>Structured gameplay with objectives, challenges, and narrative elements.</p>
              </div>
            </div>
            <div className="roadmap-item">
              <div className="roadmap-marker under-review"></div>
              <div className="roadmap-content">
                <h3>Mobile Support</h3>
                <p>Touch controls and performance optimizations for mobile devices.</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="about-footer">
          <p>&copy; 2025 Flight Simulator Development Team. All rights reserved.</p>
          <button className="back-button" onClick={handleBackClick}>
            Return to Game
          </button>
        </footer>
      </div>
    </div>
  );
};

export default About;