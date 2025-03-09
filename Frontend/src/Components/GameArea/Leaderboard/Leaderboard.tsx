import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Leaderboard.css';

// Define interfaces for our data structures
interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  date: string;
  planeType: string;
  playTime: number;
  balloonsPopped: number;
}

interface LeaderboardProps {
  currentPlayerId?: string; // Optional: to highlight the current player
}

// Mock data service - replace with actual API calls in production
const fetchLeaderboardData = async (): Promise<LeaderboardEntry[]> => {
  // In a real implementation, this would be an API call
  // For now, we'll return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: '1',
          playerName: 'AcePilot',
          score: 9850,
          date: '2025-03-07',
          planeType: 'planeThree',
          playTime: 1243,
          balloonsPopped: 98
        },
        {
          id: '2',
          playerName: 'SkyKing',
          score: 8720,
          date: '2025-03-08',
          planeType: 'planeTwo',
          playTime: 985,
          balloonsPopped: 87
        },
        {
          id: '3',
          playerName: 'CloudRider',
          score: 7640,
          date: '2025-03-05',
          planeType: 'planeOne',
          playTime: 1102,
          balloonsPopped: 76
        },
        {
          id: '4',
          playerName: 'NightHawk',
          score: 6950,
          date: '2025-03-06',
          planeType: 'planeThree',
          playTime: 879,
          balloonsPopped: 69
        },
        {
          id: '5',
          playerName: 'ThunderJet',
          score: 6240,
          date: '2025-03-09',
          planeType: 'planeTwo',
          playTime: 756,
          balloonsPopped: 62
        },
        {
          id: '6',
          playerName: 'StormChaser',
          score: 5890,
          date: '2025-03-04',
          planeType: 'planeOne',
          playTime: 645,
          balloonsPopped: 58
        },
        {
          id: '7',
          playerName: 'StarPilot',
          score: 5470,
          date: '2025-03-03',
          planeType: 'planeThree',
          playTime: 598,
          balloonsPopped: 54
        },
        {
          id: '8',
          playerName: 'WindRunner',
          score: 4980,
          date: '2025-03-02',
          planeType: 'planeTwo',
          playTime: 543,
          balloonsPopped: 49
        },
        {
          id: '9',
          playerName: 'SonicFlyer',
          score: 4320,
          date: '2025-03-01',
          planeType: 'planeOne',
          playTime: 489,
          balloonsPopped: 43
        },
        {
          id: '10',
          playerName: 'GalaxyWing',
          score: 3950,
          date: '2025-02-28',
          planeType: 'planeThree',
          playTime: 412,
          balloonsPopped: 39
        }
      ]);
    }, 500); // Simulate network delay
  });
};

const Leaderboard: React.FC<LeaderboardProps> = ({ currentPlayerId }) => {
  const navigate = useNavigate();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof LeaderboardEntry>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterPlane, setFilterPlane] = useState<string>('all');

  // Load leaderboard data
  useEffect(() => {
    const loadLeaderboardData = async () => {
      try {
        setIsLoading(true);
        const data = await fetchLeaderboardData();
        setLeaderboardData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load leaderboard data. Please try again later.');
        console.error('Error loading leaderboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboardData();
  }, []);

  // Handle sorting
  const handleSort = (field: keyof LeaderboardEntry) => {
    if (field === sortField) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending for scores, ascending for names
      setSortField(field);
      setSortDirection(field === 'playerName' ? 'asc' : 'desc');
    }
  };

  // Apply sorting and filtering
  const getSortedAndFilteredData = () => {
    let filteredData = [...leaderboardData];
    
    // Apply plane type filter
    if (filterPlane !== 'all') {
      filteredData = filteredData.filter(entry => entry.planeType === filterPlane);
    }
    
    // Apply sorting
    filteredData.sort((a, b) => {
      const fieldA = a[sortField];
      const fieldB = b[sortField];
      
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        return sortDirection === 'asc' 
          ? fieldA.localeCompare(fieldB) 
          : fieldB.localeCompare(fieldA);
      } else {
        // Handle numeric comparisons
        return sortDirection === 'asc' 
          ? (fieldA as number) - (fieldB as number) 
          : (fieldB as number) - (fieldA as number);
      }
    });
    
    return filteredData;
  };

  // Format play time from seconds to mm:ss
  const formatPlayTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get plane type display name
  const getPlaneTypeName = (type: string): string => {
    switch (type) {
      case 'planeOne': return 'Fighter Jet';
      case 'planeTwo': return 'Bomber';
      case 'planeThree': return 'Interceptor';
      default: return type;
    }
  };

  // Navigate back to home
  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h1>Flight Simulator Leaderboard</h1>
        <button className="back-button" onClick={handleBackClick}>
          Back to Game
        </button>
      </div>
      
      <div className="leaderboard-controls">
        <div className="filter-controls">
          <label htmlFor="plane-filter">Filter by Plane:</label>
          <select
            id="plane-filter"
            value={filterPlane}
            onChange={(e) => setFilterPlane(e.target.value)}
          >
            <option value="all">All Planes</option>
            <option value="planeOne">Fighter Jet</option>
            <option value="planeTwo">Bomber</option>
            <option value="planeThree">Interceptor</option>
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading leaderboard data...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <div className="leaderboard-table-container">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th 
                  onClick={() => handleSort('playerName')}
                  className={sortField === 'playerName' ? 'sortable active' : 'sortable'}
                >
                  Player Name
                  {sortField === 'playerName' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th 
                  onClick={() => handleSort('score')}
                  className={sortField === 'score' ? 'sortable active' : 'sortable'}
                >
                  Score
                  {sortField === 'score' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th>Plane Type</th>
                <th 
                  onClick={() => handleSort('balloonsPopped')}
                  className={sortField === 'balloonsPopped' ? 'sortable active' : 'sortable'}
                >
                  Balloons
                  {sortField === 'balloonsPopped' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th 
                  onClick={() => handleSort('playTime')}
                  className={sortField === 'playTime' ? 'sortable active' : 'sortable'}
                >
                  Play Time
                  {sortField === 'playTime' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th 
                  onClick={() => handleSort('date')}
                  className={sortField === 'date' ? 'sortable active' : 'sortable'}
                >
                  Date
                  {sortField === 'date' && (
                    <span className="sort-arrow">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedAndFilteredData().map((entry, index) => (
                <tr 
                  key={entry.id}
                  className={entry.id === currentPlayerId ? 'current-player' : ''}
                >
                  <td className="rank">{index + 1}</td>
                  <td className="player-name">{entry.playerName}</td>
                  <td className="score">{entry.score.toLocaleString()}</td>
                  <td className="plane-type">{getPlaneTypeName(entry.planeType)}</td>
                  <td className="balloons">{entry.balloonsPopped}</td>
                  <td className="play-time">{formatPlayTime(entry.playTime)}</td>
                  <td className="date">{new Date(entry.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="leaderboard-footer">
        <p>Compete for the highest score and earn your place in the hall of fame!</p>
        <div className="legend">
          <div className="legend-item">
            <span className="legend-color current-player-color"></span>
            <span>Current Player</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;