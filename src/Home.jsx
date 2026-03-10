import React from 'react';
import { ChevronRight, LogOut, LogIn, Home as HomeIcon, Calendar, Star, Trophy } from 'lucide-react';

export default function Home({ setMode, handleLogout, user }) {
    return (
        <div className="home-container fade-enter-active">
            {/* Top Navigation Bar */}
            <nav className="navbar">
                <div className="nav-logo">
                    <img src="/images/navera-logo-transparent.png" alt="Navera Logo" style={{ height: '48px', borderRadius: '8px' }} />
                </div>
                <div className="nav-links">
                    <button className="nav-item">
                        <HomeIcon size={24} />
                        Home
                    </button>
                    <button className="nav-item" onClick={() => setMode('events')}>
                        <Calendar size={24} />
                        Events
                    </button>
                    <button className="nav-item">
                        <Star size={24} />
                        Sponsors
                    </button>
                    <button className="nav-item" onClick={() => setMode('results')}>
                        <Trophy size={24} />
                        Results
                    </button>
                    {user ? (
                        <button
                            className="nav-item"
                            onClick={handleLogout}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff6b6b' }}
                        >
                            <LogOut size={24} /> Logout
                        </button>
                    ) : (
                        <button
                            className="nav-item"
                            onClick={() => setMode('login')}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-light)' }}
                        >
                            <LogIn size={24} /> Login
                        </button>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="hero-section">
                <div className="hero-title fade-enter-active" style={{ transitionDelay: '100ms' }}>
                    <span className="text-glow-yellow">THE BUILDERS'</span><br/>
                    <span className="text-glow-pink">ERA.</span>
                </div>
                <h2 className="hero-subtitle fade-enter-active" style={{ transitionDelay: '150ms' }}>
                    Navera '26
                </h2>
                <div className="fade-enter-active" style={{ transitionDelay: '300ms', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn hero-btn" style={{ background: '#FF0055', boxShadow: '0 0 15px rgba(255,0,85,0.4)' }} onClick={() => setMode('events')}>
                        Explore Events <ChevronRight size={20} />
                    </button>
                    <button className="btn btn-secondary hero-btn" style={{ marginTop: 0, borderColor: '#FFF000', color: '#FFF000' }} onClick={() => setMode('login')}>
                        Register Now
                    </button>
                </div>
            </main>

            {/* Background elements for depth */}
            <div className="decorator top-right"></div>
            <div className="decorator bottom-left"></div>
        </div>
    );
}
