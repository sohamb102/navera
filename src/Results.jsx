import React from 'react';
import { ChevronRight, LogOut, LogIn, Home as HomeIcon, Calendar, Star, Trophy, Medal, Award } from 'lucide-react';

export default function Results({ setMode, handleLogout, user }) {
    return (
        <div className="home-container fade-enter-active">
            {/* Navigation Bar */}
            <nav className="navbar">
                <div className="nav-logo" onClick={() => setMode('home')} style={{ cursor: 'pointer' }}>
                    <img src="/images/navera-logo-transparent.png" alt="Navera Logo" style={{ height: '48px', borderRadius: '8px' }} />
                </div>
                <div className="nav-links">
                    <button className="nav-item" onClick={() => setMode('home')}>
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
                    <button className="nav-item" onClick={() => setMode('results')} style={{ color: '#2BD97F', textShadow: '0 0 12px rgba(43, 217, 127, 0.5)' }}>
                        <Trophy size={24} />
                        Results
                    </button>
                    {user ? (
                        <button
                            className="nav-item"
                            onClick={handleLogout}
                            style={{ color: '#ff6b6b' }}
                        >
                            <LogOut size={24} /> Logout
                        </button>
                    ) : (
                        <button
                            className="nav-item"
                            onClick={() => setMode('login')}
                            style={{ color: 'var(--accent-light)' }}
                        >
                            <LogIn size={24} /> Login
                        </button>
                    )}
                </div>
            </nav>

            <main className="events-main">
                <div className="events-header">
                    <h2 className="title">Event Results</h2>
                    <p className="subtitle">Leaderboards and winners of Navera '26.</p>
                </div>
                
                <div className="events-list-container" style={{ gap: '2rem' }}>
                    <div className="dashboard-card" style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '2rem', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <Trophy size={32} color="#FFF000" style={{ filter: 'drop-shadow(0 0 10px rgba(255,240,0,0.6))' }} />
                            <h3 style={{ fontSize: '1.8rem', margin: 0 }}>Startup Pitch Arena</h3>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'linear-gradient(90deg, rgba(255,240,0,0.15) 0%, transparent 100%)', padding: '1rem 1.5rem', borderRadius: '12px', borderLeft: '4px solid #FFF000' }}>
                                <Medal size={28} color="#FFF000" style={{ marginRight: '1.5rem' }} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '1.2rem', margin: '0 0 0.25rem 0', color: '#fff' }}>Team Innovate</h4>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Project: Quantum Solve</p>
                                </div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#FFF000' }}>1st Place</div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', background: 'linear-gradient(90deg, rgba(192,192,192,0.15) 0%, transparent 100%)', padding: '1rem 1.5rem', borderRadius: '12px', borderLeft: '4px solid #C0C0C0' }}>
                                <Medal size={28} color="#C0C0C0" style={{ marginRight: '1.5rem' }} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '1.2rem', margin: '0 0 0.25rem 0', color: '#fff' }}>FinTech Visionaries</h4>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Project: PayStream</p>
                                </div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#C0C0C0' }}>2nd Place</div>
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-card" style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '2rem', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <Award size={32} color="var(--accent-light)" style={{ filter: 'drop-shadow(0 0 10px rgba(43, 217, 127, 0.6))' }} />
                            <h3 style={{ fontSize: '1.8rem', margin: 0 }}>AI Product Buildathon</h3>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'linear-gradient(90deg, rgba(255,240,0,0.15) 0%, transparent 100%)', padding: '1rem 1.5rem', borderRadius: '12px', borderLeft: '4px solid #FFF000' }}>
                                <Medal size={28} color="#FFF000" style={{ marginRight: '1.5rem' }} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '1.2rem', margin: '0 0 0.25rem 0', color: '#fff' }}>Neural Net Ninjas</h4>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Project: AutoMed AI</p>
                                </div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#FFF000' }}>1st Place</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
