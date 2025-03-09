// src/Components/PagesArea/Settings/Settings.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {userService} from '../../../Services/UserService';
import audioService from '../../../Services/AudioService';
import './Settings.css';
import { useSelector } from 'react-redux';
import { AppState } from '../../../Redux/Store';

function Settings(): JSX.Element {
  const navigate = useNavigate();
  
  // Player settings
  const user = useSelector((state: AppState) => state.user);
  const [playerName, setPlayerName] = useState(`${user.firstName} ${user.lastName}`);
  
  // Audio settings
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  
  // Graphics settings
  const [graphicsQuality, setGraphicsQuality] = useState('medium');
  const [showFPS, setShowFPS] = useState(false);
  
  // Controls settings
  const [invertY, setInvertY] = useState(false);
  const [mouseSensitivity, setMouseSensitivity] = useState(50);
  
  // Network settings
  const [serverRegion, setServerRegion] = useState('auto');
  
  // Load settings on component mount
  useEffect(() => {
    // Load player name - using async/await inside a function to handle the Promise
    const loadPlayerName = async () => {
      try {
        const savedName = await userService.getPlayerName(playerName);
        if (savedName) {
          setPlayerName(savedName);
        }
      } catch (error) {
        console.error('Error loading player name:', error);
      }
    };
    
    loadPlayerName();
    
    // Load other settings from localStorage
    const savedSettings = localStorage.getItem('balloonFighterSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setVolume(settings.volume || 50);
        setIsMuted(settings.isMuted || false);
        setGraphicsQuality(settings.graphicsQuality || 'medium');
        setShowFPS(settings.showFPS || false);
        setInvertY(settings.invertY || false);
        setMouseSensitivity(settings.mouseSensitivity || 50);
        setServerRegion(settings.serverRegion || 'auto');
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, [playerName]); // Added playerName as a dependency
  
  // Save settings
  const saveSettings = async () => {
    try {
      // Save player name - assuming we need to implement this method in UserService
      // You'll need to add this method to your UserService
      await userService.savePlayerName(playerName);
      
      // Update audio service
      audioService.setVolume(volume / 100);
      if (isMuted) {
        audioService.toggleMute();
      }
      
      // Save all settings to localStorage
      const settings = {
        volume,
        isMuted,
        graphicsQuality,
        showFPS,
        invertY,
        mouseSensitivity,
        serverRegion
      };
      
      localStorage.setItem('balloonFighterSettings', JSON.stringify(settings));
      
      // Show success message
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };
  
  // Reset settings to default
  const resetSettings = () => {
    setVolume(50);
    setIsMuted(false);
    setGraphicsQuality('medium');
    setShowFPS(false);
    setInvertY(false);
    setMouseSensitivity(50);
    setServerRegion('auto');
  };
  
  // Save message state
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  
  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>Settings</h1>
        
        <div className="settings-section">
          <h2>Player Settings</h2>
          
          <div className="setting-item">
            <label htmlFor="playerName">Player Name:</label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={15}
              placeholder="Enter your name"
            />
          </div>
        </div>
        
        <div className="settings-section">
          <h2>Audio Settings</h2>
          
          <div className="setting-item">
            <label htmlFor="volume">Volume:</label>
            <div className="slider-container">
              <input
                type="range"
                id="volume"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
              />
              <span>{volume}%</span>
            </div>
          </div>
          
          <div className="setting-item">
            <label htmlFor="mute">Mute Audio:</label>
            <label className="toggle">
              <input
                type="checkbox"
                id="mute"
                checked={isMuted}
                onChange={() => setIsMuted(!isMuted)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div className="settings-section">
          <h2>Graphics Settings</h2>
          
          <div className="setting-item">
            <label htmlFor="graphicsQuality">Graphics Quality:</label>
            <select
              id="graphicsQuality"
              value={graphicsQuality}
              onChange={(e) => setGraphicsQuality(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </div>
          
          <div className="setting-item">
            <label htmlFor="showFPS">Show FPS Counter:</label>
            <label className="toggle">
              <input
                type="checkbox"
                id="showFPS"
                checked={showFPS}
                onChange={() => setShowFPS(!showFPS)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div className="settings-section">
          <h2>Controls Settings</h2>
          
          <div className="setting-item">
            <label htmlFor="invertY">Invert Y-Axis:</label>
            <label className="toggle">
              <input
                type="checkbox"
                id="invertY"
                checked={invertY}
                onChange={() => setInvertY(!invertY)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <label htmlFor="mouseSensitivity">Mouse Sensitivity:</label>
            <div className="slider-container">
              <input
                type="range"
                id="mouseSensitivity"
                min="1"
                max="100"
                value={mouseSensitivity}
                onChange={(e) => setMouseSensitivity(parseInt(e.target.value))}
              />
              <span>{mouseSensitivity}%</span>
            </div>
          </div>
        </div>
        
        <div className="settings-section">
          <h2>Network Settings</h2>
          
          <div className="setting-item">
            <label htmlFor="serverRegion">Server Region:</label>
            <select
              id="serverRegion"
              value={serverRegion}
              onChange={(e) => setServerRegion(e.target.value)}
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="eu">Europe</option>
              <option value="na">North America</option>
              <option value="asia">Asia</option>
              <option value="sa">South America</option>
              <option value="oc">Oceania</option>
            </select>
          </div>
        </div>
        
        <div className="settings-buttons">
          <button className="settings-button save" onClick={saveSettings}>
            Save Settings
          </button>
          
          <button className="settings-button reset" onClick={resetSettings}>
            Reset to Default
          </button>
          
          <button className="settings-button back" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </div>
        
        {showSaveMessage && (
          <div className="save-message">
            Settings saved successfully!
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;