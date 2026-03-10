import React from 'react';
import { ChevronRight, LogOut } from 'lucide-react';

export default function Home({ setMode, handleLogout }) {
    return (
        <div className="home-container fade-enter-active">
            {/* Top Navigation Bar */}
            <nav className="navbar">
                <div className="nav-logo">
                    <h1>Navera</h1>
                </div>
                <div className="nav-links">
                    <button className="nav-item">About Navera</button>
                    <button className="nav-item" onClick={() => setMode('events')}>Events</button>
                    <button className="nav-item">Sponsorship</button>
                    <button
                        className="nav-item"
                        onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff6b6b' }}
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="hero-section">
                <h1 className="fade-enter-active" style={{ transitionDelay: '100ms' }}>
                    Welcome to Navera Fest
                </h1>
                <p className="fade-enter-active" style={{ transitionDelay: '200ms' }}>
                    Discover exciting events, connect with innovators, and be part of the Navera experience.
                </p>
                <div className="fade-enter-active" style={{ transitionDelay: '300ms', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn hero-btn">
                        Explore Events <ChevronRight size={20} />
                    </button>
                </div>
            </main>

            {/* Background elements for depth */}
            <div className="decorator top-right"></div>
            <div className="decorator bottom-left"></div>
        </div>
    );
}
