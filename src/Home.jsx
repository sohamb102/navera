import { ChevronRight, LogOut, LogIn, Home as HomeIcon, Calendar, Star, Trophy, LayoutDashboard } from 'lucide-react';

export default function Home({ setMode, handleLogout, user, isAdmin }) {
    return (
        <div className="home-container fade-enter-active">
            {/* Top Navigation Bar */}
            <nav className="navbar">
                <div className="nav-logo">
                    <img src="/images/navera-logo-transparent.png" alt="Navera Logo" style={{ height: '48px', borderRadius: '8px' }} />
                </div>
                <div className="nav-links">
                    <button className="nav-item" onClick={() => setMode('home')} style={{ color: '#2BD97F', textShadow: '0 0 12px rgba(43, 217, 127, 0.5)' }}>
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

            {/* Hero Section */}
            <main className="hero-section">
                <img src="/images/navera-logo-transparent.png" className="hero-logo fade-enter-active" alt="Navera Logo" style={{ transitionDelay: '50ms' }} />
                <div className="fade-enter-active" style={{ transitionDelay: '300ms', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn hero-btn" style={{ background: '#D22B3D', boxShadow: '0 0 15px rgba(210,43,61,0.4)' }} onClick={() => setMode('events')}>
                        Explore Events <ChevronRight size={20} />
                    </button>
                    <button className="btn btn-secondary hero-btn" style={{ marginTop: 0, borderColor: '#D22B3D', color: '#D22B3D', boxShadow: '0 0 15px rgba(210,43,61,0.2)' }} onClick={() => setMode('login')}>
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
