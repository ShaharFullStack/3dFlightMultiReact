import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink } from "react-router-dom";
import { AppState } from "../../../Redux/Store";
import { userActions } from "../../../Redux/UserSlice";
import { userService } from "../../../Services/UserService";
import "./Header.css";

function Header(): JSX.Element {
    const user = useSelector((state: AppState) => state.user);
    const dispatch = useDispatch();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        // Check for logged-in user on mount
        const checkUser = async () => {
            try {
                if (!user && sessionStorage.getItem("token")) {
                    const currentUser = await userService.getUser();
                    dispatch(userActions.initUser(currentUser));
                }
            } catch (err) {
                console.error("Error fetching user:", err);
            }
        };
        checkUser();
    }, [dispatch, user]);

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const handleLogout = () => {
        userService.logout();
        dispatch(userActions.logoutUser());
        setMobileMenuOpen(false);
    };

    return (
        <header className="header">
            <div className="header-container">
                <div className="logo-section">
                    <Link to="/" className="logo-link">
                        <div className="logo-container">
                            <div className="logo-icon">🎈</div>
                            <h1>Balloon Fighter</h1>
                        </div>
                    </Link>
                    <button 
                        className="mobile-menu-toggle" 
                        onClick={toggleMobileMenu}
                        aria-label="Toggle menu"
                    >
                        <span className={`hamburger ${mobileMenuOpen ? "active" : ""}`}></span>
                    </button>
                </div>

                <nav className={`main-nav ${mobileMenuOpen ? "open" : ""}`}>
                    <NavLink 
                        to="/home" 
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        Home
                    </NavLink>
                    <NavLink 
                        to="/game" 
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        Play Game
                    </NavLink>
                    <NavLink 
                        to="/leaderboard" 
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        Leaderboard
                    </NavLink>
                    <NavLink 
                        to="/settings" 
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        Settings
                    </NavLink>
                    <NavLink 
                        to="/about" 
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        About
                    </NavLink>

                    <div className="user-section">
                        {user ? (
                            <div className="user-info logged-in">
                                <div className="user-avatar">
                                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                </div>
                                <div className="user-details">
                                    <span className="user-name">{user.firstName} {user.lastName}</span>
                                    <button className="logout-button" onClick={handleLogout}>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="user-info logged-out">
                                <Link to="/login" className="auth-link" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                                <Link to="/register" className="auth-link register" onClick={() => setMobileMenuOpen(false)}>Register</Link>
                            </div>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
}

export default Header;