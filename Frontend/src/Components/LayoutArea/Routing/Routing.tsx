// src/Components/LayoutArea/Routing/Routing.tsx

import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from '../../PagesArea/Home/Home';
import { Page404 } from '../Page404/Page404';
import './Routing.css';
import { Login } from '../../UserArea/Login/Login';


// Lazy-loaded components
const Leaderboard = lazy(() => import('../../GameArea/Leaderboard/Leaderboard').then(module => ({ default: module.Leaderboard })));
const Game = lazy(() => import('../../GameArea/Game/Game'));
const Settings = lazy(() => import('../../GameArea/Settings/Settings'));
const About = lazy(() => import('../../PagesArea/About/About').then(module => ({ default: module.About })));
const Register = lazy(() => import('../../UserArea/Register/Register').then(module => ({ default: module.Register })));

function Routing(): JSX.Element {
  return (
    <div className="routing">
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Routes>
          {/* Default route */}
          <Route path="/" element={<Navigate to="/home" />} />
          
          {/* Main routes */}
          <Route path="/home" element={<Home />} />
          <Route path="/game" element={<Game />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Catch all other routes */}
          <Route path="*" element={<Page404 />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default Routing;
