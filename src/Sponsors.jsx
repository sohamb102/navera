import React, { useEffect, useState } from 'react';
import { Calendar, Home as HomeIcon, LayoutDashboard, LogIn, LogOut, Star, Trophy } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function Sponsors({ setMode, handleLogout, user, isAdmin }) {
    const [sponsors, setSponsors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSponsors = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('sponsors')
                    .select('*')
                    .order('level', { ascending: true })
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setSponsors(data || []);
            } catch (err) {
                console.error('Error fetching sponsors:', err);
                setSponsors([]);
            }
            setLoading(false);
        };

        fetchSponsors();
    }, []);

    return (
        <div className="home-container fade-enter-active">
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
                    <button className="nav-item" onClick={() => setMode('sponsors')} style={{ color: '#2BD97F', textShadow: '0 0 12px rgba(43, 217, 127, 0.5)' }}>
                        <Star size={24} />
                        Sponsors
                    </button>
                    <button className="nav-item" onClick={() => setMode('results')}>
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
                    <h2 className="title">Sponsors</h2>
                    <p className="subtitle">Partners supporting Navera Fest.</p>
                </div>

                <div className="events-list-container" style={{ gap: '1.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: '#fff' }}>Loading sponsors...</div>
                    ) : sponsors.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: '#fff' }}>
                            No sponsors yet. Please add sponsors from the Admin panel.
                        </div>
                    ) : (
                        sponsors.map((s) => (
                            <div
                                key={s.id}
                                className="dashboard-card fade-enter-active"
                                style={{
                                    background: 'rgba(0, 0, 0, 0.6)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '20px',
                                    padding: '1.5rem',
                                    textAlign: 'left',
                                    display: 'flex',
                                    gap: '1rem',
                                    alignItems: 'center'
                                }}
                            >
                                <div
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 16,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        background: 'rgba(255,255,255,0.04)',
                                        overflow: 'hidden',
                                        flexShrink: 0
                                    }}
                                >
                                    {s.logo_url ? (
                                        <img src={s.logo_url} alt={`${s.name} logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <Star size={28} color="rgba(255,255,255,0.5)" />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>{s.name}</h3>
                                        {s.level && (
                                            <span className="category-tag" style={{ opacity: 0.9 }}>
                                                {s.level}
                                            </span>
                                        )}
                                    </div>
                                    {s.website_url && (
                                        <a
                                            href={s.website_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: 'var(--accent-light)', textDecoration: 'none', fontSize: '0.95rem' }}
                                        >
                                            {s.website_url}
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}

