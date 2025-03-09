// src/Components/LayoutArea/Menu/Menu.tsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import './Menu.css';

function Menu(): JSX.Element {
  
  return (
    <div className="menu">
      <NavLink to="/home" className={({ isActive }) => isActive ? "active" : ""}>
        Home
      </NavLink>
      
      <NavLink to="/game" className={({ isActive }) => isActive ? "active" : ""}>
        Play Game
      </NavLink>
      
      <NavLink to="/leaderboard" className={({ isActive }) => isActive ? "active" : ""}>
        Leaderboard
      </NavLink>
      
      <NavLink to="/settings" className={({ isActive }) => isActive ? "active" : ""}>
        Settings
      </NavLink>
      
      <NavLink to="/about" className={({ isActive }) => isActive ? "active" : ""}>
        About
      </NavLink>
    </div>
  );
}

export default Menu;