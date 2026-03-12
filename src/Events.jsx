import React, { useState, useEffect } from 'react';
import { ChevronLeft, LogOut, LogIn, MapPin, Users, Ticket, Award, Mail, Phone, Calendar, Share2, Bookmark, Clock, Image as ImageIcon, Filter, ChevronDown, CheckCircle, Search, PlusCircle, Home as HomeIcon, Star, Trophy, LayoutDashboard } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function Events({ setMode, handleLogout, user, isAdmin }) {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [eventsList, setEventsList] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [userRegs, setUserRegs] = useState(new Set()); // IDs of registered events

    // Modals state
    const [showSoloModal, setShowSoloModal] = useState(false);
    const [showTeamChoiceModal, setShowTeamChoiceModal] = useState(false);
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [showJoinTeamModal, setShowJoinTeamModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Create Team Form State
    const [teamName, setTeamName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Join Team State
    const [teamSearchQuery, setTeamSearchQuery] = useState('');
    const [teamSearchResults, setTeamSearchResults] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoadingEvents(true);
            try {
                const { data, error } = await supabase.from('events').select('*');
                if (error) throw error;

                let normalized = [];
                if (data && data.length > 0) {
                    normalized = data.map(evt => {
                        const categoryValue = evt.category;
                        let categoryArray;
                        if (Array.isArray(categoryValue)) {
                            categoryArray = categoryValue;
                        } else if (typeof categoryValue === 'string') {
                            categoryArray = categoryValue
                                .split(',')
                                .map(c => c.trim())
                                .filter(Boolean);
                        } else {
                            categoryArray = [];
                        }

                        return {
                            ...evt,
                            category: categoryArray
                        };
                    });
                }

                setEventsList(normalized);

                if (user) {
                    const { data: soloRegs } = await supabase.from('event_registrations').select('event_id').eq('user_id', user.id);
                    const { data: teamRegs } = await supabase.from('team_members').select('teams(event_id)').eq('user_id', user.id);

                    const registered = new Set();
                    soloRegs?.forEach(r => registered.add(r.event_id));
                    teamRegs?.forEach(m => {
                        if (m.teams && m.teams.event_id) registered.add(m.teams.event_id);
                    });
                    setUserRegs(registered);
                }
            } catch (err) {
                console.error("Error fetching events:", err);
                setEventsList([]);
            }
            setLoadingEvents(false);
        };
        fetchEvents();
    }, [user]);

    const handleRegisterClick = () => {
        if (!user) {
            alert("Please log in to register.");
            return;
        }
        // Handle missing DB columns gracefully (default to team based if missing)
        const maxTeamSize = selectedEvent.max_team_size || 5;
        if (maxTeamSize === 1) {
            setShowSoloModal(true);
        } else {
            setShowTeamChoiceModal(true);
        }
    };

    const handleConfirmSoloRegistration = async () => {
        setActionLoading(true);
        try {
            const { error } = await supabase.from('event_registrations').insert([{
                event_id: selectedEvent.id,
                user_id: user.id
            }]);
            if (error) throw error;
            alert("Successfully registered for this event.");
            setUserRegs(prev => new Set(prev).add(selectedEvent.id));
            setShowSoloModal(false);
        } catch (err) {
            console.error(err);
            alert("Failed to register: " + err.message);
        }
        setActionLoading(false);
    };

    const handleUserSearch = async (e) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (q.length > 2) {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, email')
                .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
                .neq('id', user.id)
                .limit(5);
            if (!error && data) {
                setSearchResults(data);
            }
        } else {
            setSearchResults([]);
        }
    };

    const handleCreateTeam = async () => {
        if (!teamName.trim()) return alert("Team name required.");

        const maxTeamSize = selectedEvent.max_team_size || 5;
        if (selectedMembers.length + 1 > maxTeamSize) {
            return alert(`Max team size is ${maxTeamSize}.`);
        }

        setActionLoading(true);
        try {
            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .insert([{
                    team_name: teamName,
                    event_id: selectedEvent.id,
                    leader_id: user.id
                }])
                .select()
                .single();
            if (teamError) throw teamError;

            await supabase.from('team_members').insert([{
                team_id: teamData.id,
                user_id: user.id,
                role: 'leader'
            }]);

            if (selectedMembers.length > 0) {
                const invites = selectedMembers.map(m => ({
                    team_id: teamData.id,
                    invited_user: m.id,
                    invited_by: user.id,
                    status: 'pending'
                }));
                await supabase.from('team_invitations').insert(invites);
            }

            alert("Team created and invitations sent!");
            setUserRegs(prev => new Set(prev).add(selectedEvent.id));
            setShowCreateTeamModal(false);
            setTeamName('');
            setSelectedMembers([]);
        } catch (err) {
            console.error(err);
            alert("Failed to create team: " + (err.message || 'Unknown error'));
        }
        setActionLoading(false);
    };

    const handleTeamSearch = async (e) => {
        const q = e.target.value;
        setTeamSearchQuery(q);
        if (q.length > 1) {
            // we probably need an inner join or a distinct way to get team member count, but let's query raw teams and get memberships
            const { data, error } = await supabase
                .from('teams')
                .select('id, team_name')
                .eq('event_id', selectedEvent.id)
                .ilike('team_name', `%${q}%`)
                .limit(5);

            if (!error && data) {
                // Get member counts manually
                const teamIds = data.map(t => t.id);
                if (teamIds.length > 0) {
                    const { data: countData } = await supabase.from('team_members').select('team_id').in('team_id', teamIds);
                    const counts = {};
                    countData?.forEach(c => { counts[c.team_id] = (counts[c.team_id] || 0) + 1; });
                    const enrichedData = data.map(t => ({ ...t, member_count: counts[t.id] || 0 }));
                    setTeamSearchResults(enrichedData);
                } else {
                    setTeamSearchResults([]);
                }
            }
        } else {
            setTeamSearchResults([]);
        }
    };

    const handleRequestJoin = async (teamId) => {
        setActionLoading(true);
        try {
            const { error } = await supabase.from('team_join_requests').insert([{
                team_id: teamId,
                user_id: user.id,
                status: 'pending'
            }]);
            if (error) throw error;
            alert("Join request sent successfully!");
            setShowJoinTeamModal(false);
        } catch (err) {
            console.error(err);
            alert("Failed to send join request: " + (err.message || 'Error'));
        }
        setActionLoading(false);
    };

    // List View
    if (!selectedEvent) {
        return (
            <div className="home-container fade-enter-active">
                {/* Navigation Bar */}
                <nav className="navbar">
                    <div className="nav-logo" onClick={() => setMode('home')} style={{ cursor: 'pointer' }}>
                        <img src="/images/navera-logo-transparent.png" alt="Navera Fest Logo" style={{ height: '48px', borderRadius: '8px' }} />
                    </div>
                    <div className="nav-links">
                        <button className="nav-item" onClick={() => setMode('home')}>
                            <HomeIcon size={24} />
                            Home
                        </button>
                        <button className="nav-item" style={{ color: '#2BD97F', textShadow: '0 0 12px rgba(43, 217, 127, 0.5)' }}>
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

                {/* Events List Content */}
                <main className="events-main">
                    <div className="events-header">
                        <h2 className="title">Navera Events</h2>
                        <p className="subtitle">Discover our lineup of exciting tech, business, and design challenges.</p>
                    </div>

                    {/* Filter Bar */}
                    <div className="filter-bar">
                        <button className="filter-pill active"><Filter size={16} /> Filters</button>
                        <button className="filter-pill">Team Size <ChevronDown size={14} /></button>
                        <button className="filter-pill">Payment <ChevronDown size={14} /></button>
                        <button className="filter-pill">Categories <ChevronDown size={14} /></button>
                        <button className="filter-pill">Sort By <ChevronDown size={14} /></button>
                    </div>

                    <div className="events-list-container">
                        {loadingEvents ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: '#fff' }}>Loading exciting events...</div>
                        ) : eventsList.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: '#fff' }}>
                                No events yet. Please add events from the Admin panel.
                            </div>
                        ) : (
                            eventsList.map(event => (
                                <div
                                    key={event.id}
                                    className="event-list-card fade-enter-active"
                                    onClick={() => setSelectedEvent(event)}
                                    style={{ transitionDelay: `${event.id * 50}ms` }}
                                >
                                    <div className="card-left">
                                        <h3 className="event-title">{event.title || event.name}</h3>
                                        <div className="event-organizer-info">
                                            <span className="organizer-name">{event.organizer}</span>
                                            <span className="dot-separator">•</span>
                                            <span className="participation-type">{event.max_team_size > 1 ? 'Team' : (event.participationType || 'Solo')}</span>
                                            <span className="dot-separator">•</span>
                                            <span className="event-mode">{event.event_mode || event.eventMode || 'Hybrid'}</span>
                                        </div>

                                        <div className="event-metadata">
                                            <div className="meta-item"><Users size={14} /> {event.max_team_size > 1 ? `${event.min_team_size}–${event.max_team_size} Members` : (event.teamSize || '1 Member')}</div>
                                            <div className="meta-item"><MapPin size={14} /> {event.location || 'TBA'}</div>
                                        </div>

                                        <div className="category-tags">
                                            {(event.category || ['Technology', 'Business']).map((cat, idx) => (
                                                <span key={idx} className="category-tag">{cat}</span>
                                            ))}
                                        </div>

                                        <div className="card-bottom-row">
                                            <span className="posted-date">Posted {event.postedDate || new Date(event.created_at || Date.now()).toLocaleDateString()}</span>
                                            <span className="pipe-separator">|</span>
                                            <span className="days-left"><Clock size={12} style={{ marginRight: '4px' }} /> {event.daysLeft || 10} days left</span>
                                        </div>
                                    </div>
                                    <div className="card-right">
                                        <div className="event-logo-box">
                                            {event.logoUrl || event.logo_url ? (
                                                <img src={event.logoUrl || event.logo_url} alt="Event Logo" />
                                            ) : (
                                                <ImageIcon size={32} color="rgba(255,255,255,0.4)" />
                                            )}
                                        </div>
                                        {userRegs.has(event.id) && (
                                            <div className="registered-badge" style={{ marginTop: '0.5rem', background: 'rgba(43, 217, 127, 0.2)', padding: '4px 12px', borderRadius: '12px', border: '1px solid var(--accent-light)', color: 'var(--accent-light)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle size={12} /> Registered
                                            </div>
                                        )}
                                        <div className="card-actions" style={{ marginTop: 'auto' }}>
                                            <button className="action-btn" onClick={(e) => { e.stopPropagation(); }}><Share2 size={18} /></button>
                                            <button className="action-btn" onClick={(e) => { e.stopPropagation(); }}><Bookmark size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>

                {/* Background Decorators */}
                <div className="decorator top-right"></div>
                <div className="decorator bottom-left"></div>
            </div>
        );
    }

    // Detail View
    return (
        <div className="home-container fade-enter-active">
            {/* Navigation Bar */}
            <nav className="navbar">
                <div className="nav-logo" onClick={() => setMode('home')} style={{ cursor: 'pointer' }}>
                    <img src="/images/navera-logo-transparent.png" alt="Navera Fest Logo" style={{ height: '48px', borderRadius: '8px' }} />
                </div>
                <div className="nav-links">
                    <button className="nav-item" onClick={() => setMode('home')}>
                        <HomeIcon size={24} />
                        Home
                    </button>
                    <button className="nav-item" onClick={() => setSelectedEvent(null)} style={{ color: '#2BD97F', textShadow: '0 0 12px rgba(43, 217, 127, 0.5)' }}>
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

            {/* Event Details Content */}
            <main className="event-details-main fade-enter-active">
                <div className="details-header-action" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <button className="back-btn" onClick={() => setSelectedEvent(null)} style={{ margin: 0 }}>
                        <ChevronLeft size={20} /> Back to Events
                    </button>
                    {userRegs.has(selectedEvent.id) ? (
                        <button className="btn" disabled style={{ width: 'auto', padding: '10px 24px', opacity: 0.7, cursor: 'not-allowed' }}>
                            <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> Registered
                        </button>
                    ) : (
                        <button className="btn" onClick={handleRegisterClick} style={{ width: 'auto', padding: '10px 24px' }}>
                            Register Now
                        </button>
                    )}
                </div>

                {/* Banner Section */}
                <div className="event-banner-section">
                    <div className="banner-image-placeholder">
                        <ImageIcon size={48} color="rgba(255,255,255,0.2)" />
                    </div>
                    <div className="banner-content">
                        <h1 className="banner-title">{selectedEvent.title || selectedEvent.name}</h1>
                        <p className="banner-organizer">by {selectedEvent.organizer}</p>
                        <p className="banner-tagline">{selectedEvent.description || selectedEvent.shortDesc || 'Join us for this amazing event!'}</p>
                    </div>
                </div>

                {/* Main Information Layout */}
                <div className="details-main-grid">
                    {/* Left Column */}
                    <div className="details-left">
                        {/* Info Card */}
                        <div className="details-card info-card">
                            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', color: '#fff' }}>{selectedEvent.title || selectedEvent.name}</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Hosted by {selectedEvent.organizer}</p>

                            <div className="info-meta-row">
                                <div className="meta-box">
                                    <span className="meta-label">Event Mode</span>
                                    <span className="meta-value">{selectedEvent.event_mode || selectedEvent.eventMode || 'Hybrid'}</span>
                                </div>
                                <div className="meta-box">
                                    <span className="meta-label">Location</span>
                                    <span className="meta-value">{selectedEvent.location || 'TBA'}</span>
                                </div>
                                <div className="meta-box">
                                    <span className="meta-label">Team Size</span>
                                    <span className="meta-value">{selectedEvent.max_team_size > 1 ? `${selectedEvent.min_team_size}–${selectedEvent.max_team_size} Members` : (selectedEvent.teamSize || '1 Member')}</span>
                                </div>
                            </div>

                            <div className="category-tags" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
                                {(selectedEvent.category || []).map((cat, idx) => (
                                    <span key={idx} className="category-tag">{cat}</span>
                                ))}
                            </div>
                        </div>

                        {/* Overview Section */}
                        <div className="details-section-card">
                            <h3>Overview</h3>
                            <p className="overview-text">
                                Participate in the {selectedEvent.title || selectedEvent.name}, a premier event brought to you by {selectedEvent.organizer}.
                                {selectedEvent.description || selectedEvent.shortDesc} This competition is designed to challenge your skills and provide a platform to showcase your talent in front of industry experts.
                            </p>
                        </div>

                        {/* Eligibility Section */}
                        <div className="details-section-card">
                            <h3>Eligibility</h3>
                            <div className="eligibility-tags">
                                <span className="el-tag">Undergraduate</span>
                                <span className="el-tag">Postgraduate</span>
                                <span className="el-tag">Engineering Students</span>
                                <span className="el-tag">Management</span>
                                <span className="el-tag">Arts / Commerce / Science</span>
                            </div>
                            <p className="overview-text" style={{ marginTop: '1rem' }}>
                                Specific requirement: {selectedEvent.eligibility || 'Open to all students'}
                            </p>
                        </div>

                        {/* Timeline */}
                        <div className="details-section-card">
                            <h3>Stages and Timelines</h3>
                            <div className="timeline-container">
                                <div className="timeline-item">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                        <div className="timeline-date">Oct 10, 2026</div>
                                        <div className="timeline-title">Round 1 – Online Quiz</div>
                                        <div className="timeline-desc">A 30-minute preliminary quiz verifying fundamental concepts.</div>
                                    </div>
                                </div>
                                <div className="timeline-item">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                        <div className="timeline-date">Oct 12, 2026</div>
                                        <div className="timeline-title">Round 2 – Submission Round</div>
                                        <div className="timeline-desc">Shortlisted teams submit their proposals/code repositories.</div>
                                    </div>
                                </div>
                                <div className="timeline-item">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                        <div className="timeline-date">{selectedEvent.date}</div>
                                        <div className="timeline-title">Final Round – Offline Presentation</div>
                                        <div className="timeline-desc">Finalists present live to the judge panel at {selectedEvent.location}.</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guidelines */}
                        <div className="details-section-card">
                            <h3>Guidelines</h3>
                            <ul className="guidelines-list">
                                <li>Anyone interested in {(selectedEvent.category || []).join(' and ')} can participate.</li>
                                <li>Team size must be {selectedEvent.max_team_size > 1 ? `${selectedEvent.min_team_size}–${selectedEvent.max_team_size} Members` : (selectedEvent.teamSize || '1 Member')}.</li>
                                <li>Competition consists of 3 rounds.</li>
                                <li>First two rounds are online, and the final round is offline.</li>
                                {(selectedEvent.rules || []).map((rule, idx) => (
                                    <li key={idx}>{rule}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right Column (Sticky) */}
                    <div className="details-right">
                        {/* Prize Box */}
                        <div className="details-side-card prize-card">
                            <h3>Prize Pool</h3>
                            <div className="master-prize">
                                {selectedEvent.prize_pool ? `₹${selectedEvent.prize_pool.toLocaleString()}` : (selectedEvent.prize?.winner || 'TBA')}
                            </div>
                            <div className="prize-sub">
                                <div className="ps-row"><span>1st Prize:</span> <span>{selectedEvent.prize_pool ? `₹${(selectedEvent.prize_pool * 0.6).toLocaleString()}` : (selectedEvent.prize?.winner || 'TBA')}</span></div>
                                <div className="ps-row"><span>2nd Prize:</span> <span>{selectedEvent.prize_pool ? `₹${(selectedEvent.prize_pool * 0.3).toLocaleString()}` : (selectedEvent.prize?.runnerUp || 'TBA')}</span></div>
                            </div>
                        </div>

                        {/* Rewards Box */}
                        <div className="details-side-card">
                            <h3>Rewards and Prizes</h3>
                            <div className="master-prize" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                                Prize Pool<br />
                                <span style={{ color: 'var(--accent-light)' }}>{selectedEvent.prize_pool ? `₹${selectedEvent.prize_pool.toLocaleString()} Cash` : (selectedEvent.prize?.winner || 'TBA')}</span>
                            </div>
                            <ul className="rewards-list">
                                <li>Networking opportunities</li>
                                <li>Certificates</li>
                                <li>Knowledge sessions</li>
                                <li>Access to workshops</li>
                            </ul>
                        </div>

                        {/* Dates Box */}
                        <div className="details-side-card">
                            <h3>Important Dates & Deadlines</h3>
                            <div className="date-deadline-box">
                                <div className="dd-date">
                                    <Calendar size={20} color="var(--accent-light)" />{
                                        (() => {
                                            if (selectedEvent.registration_deadline) {
                                                const d = new Date(selectedEvent.registration_deadline);
                                                if (!isNaN(d.getTime())) {
                                                    return d.toLocaleDateString('en-IN', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    });
                                                }
                                            }
                                            if (selectedEvent.postedDate) {
                                                return selectedEvent.postedDate;
                                            }
                                            return 'Upcoming';
                                        })()
                                    }
                                </div>
                                <div className="dd-info">
                                    <strong>Registration Deadline</strong>
                                    <span>{selectedEvent.registration_deadline_time || '11:59 PM IST'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Contact Box */}
                        <div className="details-side-card">
                            <h3>Contact the Organisers</h3>
                            <div className="contact-box">
                                <strong>{selectedEvent.organizer} Helpdesk</strong>
                                <a href={`mailto:${(selectedEvent.poc || 'info').toLowerCase().replace(' ', '.')}@naverafest.com`}>
                                    <Mail size={14} /> {(selectedEvent.poc || 'info').toLowerCase().replace(' ', '.')}@naverafest.com
                                </a>
                                <a href={`tel:${selectedEvent.contact || '9999999999'}`}>
                                    <Phone size={14} /> {selectedEvent.contact || '+91 99999 99999'}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <div className="decorator top-right"></div>
            <div className="decorator bottom-left"></div>

            {/* Modals */}
            {showSoloModal && (
                <div className="modal-overlay fade-enter-active" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="details-card" style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#fff' }}>Confirm Registration</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You are about to register for <strong>{selectedEvent.title || selectedEvent.name}</strong> as a solo participant.</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" onClick={handleConfirmSoloRegistration} disabled={actionLoading}>
                                {actionLoading ? 'Registering...' : 'Confirm'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowSoloModal(false)} disabled={actionLoading} style={{ border: 'none' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTeamChoiceModal && (
                <div className="modal-overlay fade-enter-active" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="details-card" style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#fff' }}>Team Participation</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>This event requires a team (Max size: {selectedEvent.max_team_size || 5}).</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button className="btn" onClick={() => { setShowTeamChoiceModal(false); setShowCreateTeamModal(true); }}>
                                <PlusCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Create a New Team
                            </button>
                            <button className="btn btn-secondary" onClick={() => { setShowTeamChoiceModal(false); setShowJoinTeamModal(true); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                <Search size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Join Existing Team
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowTeamChoiceModal(false)} style={{ border: 'none', background: 'transparent' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateTeamModal && (
                <div className="modal-overlay fade-enter-active" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="details-card" style={{ width: '90%', maxWidth: '500px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#fff' }}>Create a Team</h3>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label>Team Name</label>
                            <input type="text" className="input-field" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Code Ninjas" />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label>Invite Members (Optional)</label>
                            <input type="text" className="input-field" value={searchQuery} onChange={handleUserSearch} placeholder="Search by name or email..." />

                            {searchResults.length > 0 && (
                                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                                    {searchResults.map(u => (
                                        <div key={u.id} style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: '#fff', fontSize: '0.9rem' }}>{u.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({u.email})</span></div>
                                            <button
                                                className="btn"
                                                style={{ padding: '4px 12px', fontSize: '0.8rem', background: selectedMembers.some(m => m.id === u.id) ? 'var(--text-secondary)' : 'var(--accent-light)' }}
                                                onClick={() => {
                                                    if (!selectedMembers.some(m => m.id === u.id)) {
                                                        setSelectedMembers([...selectedMembers, u]);
                                                    }
                                                }}
                                                disabled={selectedMembers.some(m => m.id === u.id)}
                                            >
                                                {selectedMembers.some(m => m.id === u.id) ? 'Added' : 'Add'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedMembers.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selected Members:</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {selectedMembers.map(m => (
                                            <span key={m.id} style={{ background: 'rgba(43,217,127,0.2)', color: 'var(--accent-light)', padding: '4px 10px', borderRadius: '16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {m.name}
                                                <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setSelectedMembers(selectedMembers.filter(sm => sm.id !== m.id))}>×</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button className="btn" onClick={handleCreateTeam} disabled={actionLoading}>
                                {actionLoading ? 'Creating...' : 'Create Team'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowCreateTeamModal(false)} disabled={actionLoading} style={{ border: 'none' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showJoinTeamModal && (
                <div className="modal-overlay fade-enter-active" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="details-card" style={{ width: '90%', maxWidth: '500px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#fff' }}>Join Existing Team</h3>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <input type="text" className="input-field" value={teamSearchQuery} onChange={handleTeamSearch} placeholder="Search team by name..." />

                            {teamSearchResults.length > 0 ? (
                                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                    {teamSearchResults.map(t => (
                                        <div key={t.id} style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: 'bold' }}>{t.team_name}</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                    {t.member_count} / {selectedEvent.max_team_size || 5} Members
                                                </div>
                                            </div>
                                            <button
                                                className="btn"
                                                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                                                onClick={() => handleRequestJoin(t.id)}
                                                disabled={t.member_count >= (selectedEvent.max_team_size || 5)}
                                            >
                                                {t.member_count >= (selectedEvent.max_team_size || 5) ? 'Full' : 'Request Join'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : teamSearchQuery.length > 1 ? (
                                <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>No teams found.</p>
                            ) : null}
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                            <button className="btn btn-secondary" onClick={() => setShowJoinTeamModal(false)} disabled={actionLoading} style={{ border: 'none', background: 'transparent' }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
