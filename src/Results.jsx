import React, { useState, useEffect } from 'react';
import { ChevronRight, LogOut, LogIn, Home as HomeIcon, Calendar, Star, Trophy, Medal, Award, LayoutDashboard } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function Results({ setMode, handleLogout, user, isAdmin }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                // Fetch results and join with event titles if possible
                const { data, error } = await supabase
                    .from('results')
                    .select('*, events(title)');
                
                if (error) throw error;
                setResults(data || []);
            } catch (err) {
                console.error("Error fetching results:", err);
                // Fallback to empty if table missing, we keep the static ones below for now if list is 0
            }
            setLoading(false);
        };
        fetchResults();
    }, []);

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
                    <button className="nav-item" onClick={() => setMode('sponsors')}>
                        <Star size={24} />
                        Sponsors
                    </button>
                    <button className="nav-item" onClick={() => setMode('results')} style={{ color: '#2BD97F', textShadow: '0 0 12px rgba(43, 217, 127, 0.5)' }}>
                        <Trophy size={24} />
                        Results
                    </button>
                    {isAdmin && (
                        <button className="nav-item" onClick={() => setMode('admin')} style={{ color: '#FFF000' }}>
                            <LayoutDashboard size={24} />
                            Admin
                        </button>
                    )}
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

            <main className="events-main">
                <div className="events-header">
                    <h2 className="title">Event Results</h2>
                    <p className="subtitle">Leaderboards and winners of Navera '26.</p>
                </div>
                
                <div
                    className="events-list-container"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '1.25rem',
                        alignItems: 'start'
                    }}
                >
                    {loading ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#fff' }}>Loading results...</div>
                    ) : results.length > 0 ? (
                        results.map(res => (
                            <div
                                key={res.id}
                                className="dashboard-card fade-enter-active"
                                style={{
                                    background: 'rgba(0, 0, 0, 0.6)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '20px',
                                    padding: '1.25rem',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <Trophy size={22} color="#FFF000" style={{ filter: 'drop-shadow(0 0 10px rgba(255,240,0,0.35))' }} />
                                    <div style={{ minWidth: 0 }}>
                                        <h3 style={{ fontSize: '1.15rem', margin: 0, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {res.events?.title || `Event #${res.event_id}`}
                                        </h3>
                                        <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            Result published
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'linear-gradient(90deg, rgba(255,240,0,0.12) 0%, transparent 100%)', padding: '0.85rem 1rem', borderRadius: '14px', borderLeft: '4px solid #FFF000' }}>
                                        <Medal size={20} color="#FFF000" />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.15rem' }}>Winner</div>
                                            <div style={{ color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {res.winner_name || '—'}
                                            </div>
                                            {res.description && (
                                                <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                    {res.description}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FFF000' }}>1st</div>
                                    </div>

                                    {res.runner_up_name && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'linear-gradient(90deg, rgba(192,192,192,0.12) 0%, transparent 100%)', padding: '0.85rem 1rem', borderRadius: '14px', borderLeft: '4px solid #C0C0C0' }}>
                                            <Medal size={20} color="#C0C0C0" />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.15rem' }}>Runner Up</div>
                                                <div style={{ color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {res.runner_up_name}
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#C0C0C0' }}>2nd</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#fff' }}>
                            No results published yet.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
