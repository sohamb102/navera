import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  LayoutDashboard, 
  Calendar, 
  Trophy, 
  Star, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  ChevronLeft,
  LogOut,
  ShieldCheck,
  Image as ImageIcon,
  Users,
  Ticket,
  TrendingUp,
  Activity
} from 'lucide-react';

export default function Admin({ setMode, handleLogout, user, isAdmin }) {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'events', 'results', 'sponsors', 'admins'
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalEvents: 0,
        totalRegistrations: 0,
        totalSponsors: 0
    });

    useEffect(() => {
        if (isAdmin) {
            if (activeTab === 'overview') {
                fetchStats();
            } else {
                fetchItems();
            }
        }
    }, [activeTab, isAdmin]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Fetch counts from various tables
            const [
                { count: ugCount },
                { count: pgCount },
                { count: eventCount },
                { count: regCount },
                { count: teamMemberCount },
                { count: sponsorCount }
            ] = await Promise.all([
                supabase.from('undergraduate').select('*', { count: 'exact', head: true }),
                supabase.from('postgraduate').select('*', { count: 'exact', head: true }),
                supabase.from('events').select('*', { count: 'exact', head: true }),
                supabase.from('event_registrations').select('*', { count: 'exact', head: true }),
                supabase.from('team_members').select('*', { count: 'exact', head: true }),
                supabase.from('sponsors').select('*', { count: 'exact', head: true })
            ]);

            setStats({
                totalUsers: (ugCount || 0) + (pgCount || 0),
                totalEvents: eventCount || 0,
                totalRegistrations: (regCount || 0) + (teamMemberCount || 0),
                totalSponsors: sponsorCount || 0
            });
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
        setLoading(false);
    };

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from(activeTab).select('*');
            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error(`Error fetching ${activeTab}:`, err);
            setItems([]);
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (currentItem.id) {
                // Update
                const { error } = await supabase.from(activeTab).update(currentItem).eq('id', currentItem.id);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase.from(activeTab).insert([currentItem]);
                if (error) throw error;
            }
            setIsEditing(false);
            setCurrentItem(null);
            fetchItems();
        } catch (err) {
            alert(`Error saving ${activeTab}: ` + err.message);
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete this ${activeTab.slice(0, -1)}?`)) return;
        setLoading(true);
        try {
            const { error } = await supabase.from(activeTab).delete().eq('id', id);
            if (error) throw error;
            fetchItems();
        } catch (err) {
            alert(`Error deleting ${activeTab}: ` + err.message);
        }
        setLoading(false);
    };

    const openEdit = (item = null) => {
        setCurrentItem(item || {});
        setIsEditing(true);
    };

    if (!isAdmin) {
        return (
            <div className="admin-portal" style={{ justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(circle at center, #111 0%, #000 100%)' }}>
                <div className="admin-login-card" style={{ background: '#0f0f0f', border: '1px solid #2BD97F', borderRadius: '24px', padding: '3rem', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 0 30px rgba(43, 217, 127, 0.15)' }}>
                    <div style={{ color: '#2BD97F', marginBottom: '1.5rem' }}>
                        <LayoutDashboard size={48} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Management Access</h2>
                    <p style={{ color: '#888', marginBottom: '2rem' }}>Please log in with an administrator account to continue.</p>
                    
                    <button 
                        className="btn" 
                        onClick={() => setMode('admin_login')}
                        style={{ width: '100%', padding: '14px', background: '#2BD97F', color: '#000', fontWeight: '700' }}
                    >
                        Log In to Dashboard
                    </button>
                    
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => setMode('home')}
                        style={{ width: '100%', marginTop: '1rem', border: 'none', color: '#888' }}
                    >
                        Back to Site
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-portal fade-enter-active">
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <h2>Admin Panel</h2>
                </div>
                <nav className="sidebar-nav">
                    <button 
                        className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <Activity size={20} /> Overview
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveTab('events')}
                    >
                        <Calendar size={20} /> Events
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'results' ? 'active' : ''}`}
                        onClick={() => setActiveTab('results')}
                    >
                        <Trophy size={20} /> Results
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'sponsors' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sponsors')}
                    >
                        <Star size={20} /> Sponsors
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'admins' ? 'active' : ''}`}
                        onClick={() => setActiveTab('admins')}
                    >
                        <ShieldCheck size={20} /> Admins
                    </button>
                    <hr />
                    <button className="nav-btn exit-btn" onClick={() => setMode('home')}>
                        <ChevronLeft size={20} /> Back to Site
                    </button>
                    <button className="nav-btn exit-btn" onClick={handleLogout} style={{ color: '#ff6b6b', borderColor: '#300' }}>
                        <LogOut size={20} /> Logout
                    </button>
                </nav>
            </aside>

            <main className="admin-content">
                <header className="content-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h1>{activeTab === 'overview' ? 'Dashboard Overview' : `Manage ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}</h1>
                        <p style={{ color: '#888' }}>Logged in as <span style={{ color: '#2BD97F' }}>{user?.email}</span></p>
                    </div>
                    {activeTab !== 'overview' && activeTab !== 'admins' && (
                        <button className="btn create-btn" style={{ background: '#2BD97F', color: '#000', width: 'auto' }} onClick={() => openEdit()}>
                            <Plus size={18} /> Add New {activeTab.slice(0, -1)}
                        </button>
                    )}
                </header>

                {loading ? (
                    <div className="admin-loader">
                        <div className="spinner"></div>
                        <p>Loading {activeTab}...</p>
                    </div>
                ) : activeTab === 'overview' ? (
                    <div className="admin-stats-container fade-enter-active">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(43, 217, 127, 0.1)', color: '#2BD97F' }}>
                                <Users size={24} />
                            </div>
                            <div className="stat-info">
                                <h3>Total Users</h3>
                                <div className="stat-value">{stats.totalUsers}</div>
                                <p className="stat-label">Registered students</p>
                            </div>
                            <TrendingUp size={16} className="trend-icon" />
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00F0FF' }}>
                                <Calendar size={24} />
                            </div>
                            <div className="stat-info">
                                <h3>Active Events</h3>
                                <div className="stat-value">{stats.totalEvents}</div>
                                <p className="stat-label">Across all categories</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(255, 107, 107, 0.1)', color: '#FF6B6B' }}>
                                <Ticket size={24} />
                            </div>
                            <div className="stat-info">
                                <h3>Registrations</h3>
                                <div className="stat-value">{stats.totalRegistrations}</div>
                                <p className="stat-label">Solo + Team members</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(255, 240, 0, 0.1)', color: '#FFF000' }}>
                                <Star size={24} />
                            </div>
                            <div className="stat-info">
                                <h3>Sponsors</h3>
                                <div className="stat-value">{stats.totalSponsors}</div>
                                <p className="stat-label">Corporate partners</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    {activeTab === 'events' && (
                                        <>
                                            <th>Title</th>
                                            <th>Organizer</th>
                                            <th>Location</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </>
                                    )}
                                    {activeTab === 'results' && (
                                        <>
                                            <th>Event</th>
                                            <th>Winner</th>
                                            <th>Runner Up</th>
                                            <th>Actions</th>
                                        </>
                                    )}
                                    {activeTab === 'sponsors' && (
                                        <>
                                            <th>Name</th>
                                            <th>Level</th>
                                            <th>Website</th>
                                            <th>Actions</th>
                                        </>
                                    )}
                                    {activeTab === 'admins' && (
                                        <>
                                            <th>Email</th>
                                            <th>Added On</th>
                                            <th>Actions</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id}>
                                        {activeTab === 'events' && (
                                            <>
                                                <td>{item.title || item.name}</td>
                                                <td>{item.organizer}</td>
                                                <td>{item.location}</td>
                                                <td>{item.date}</td>
                                            </>
                                        )}
                                        {activeTab === 'results' && (
                                            <>
                                                <td>{item.event_id}</td>
                                                <td>{item.winner_name}</td>
                                                <td>{item.runner_up_name}</td>
                                            </>
                                        )}
                                        {activeTab === 'sponsors' && (
                                            <>
                                                <td>{item.name}</td>
                                                <td>{item.level}</td>
                                                <td>{item.website_url}</td>
                                            </>
                                        )}
                                        {activeTab === 'admins' && (
                                            <>
                                                <td>{item.email}</td>
                                                <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                            </>
                                        )}
                                        <td className="actions-cell">
                                            {activeTab !== 'admins' && (
                                                <button className="action-btn edit" onClick={() => openEdit(item)}>
                                                    <Edit size={16} />
                                                </button>
                                            )}
                                            <button className="action-btn delete" onClick={() => handleDelete(item.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {isEditing && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal">
                        <div className="modal-header">
                            <h3>{currentItem.id ? 'Edit' : 'Create'} {activeTab.slice(0, -1)}</h3>
                            <button className="close-btn" onClick={() => setIsEditing(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="admin-form">
                            {activeTab === 'events' && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Title</label>
                                            <input 
                                                type="text" 
                                                value={currentItem.title || currentItem.name || ''} 
                                                onChange={e => setCurrentItem({ ...currentItem, title: e.target.value, name: e.target.value })} 
                                                required 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Organizer</label>
                                            <input 
                                                type="text" 
                                                value={currentItem.organizer || ''} 
                                                onChange={e => setCurrentItem({ ...currentItem, organizer: e.target.value })} 
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Event Mode</label>
                                            <input 
                                                type="text" 
                                                placeholder="Online / Offline / Hybrid"
                                                value={currentItem.event_mode || ''} 
                                                onChange={e => setCurrentItem({ ...currentItem, event_mode: e.target.value })} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Location</label>
                                            <input 
                                                type="text" 
                                                value={currentItem.location || ''} 
                                                onChange={e => setCurrentItem({ ...currentItem, location: e.target.value })} 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Date / Final Round</label>
                                            <input 
                                                type="text" 
                                                placeholder="Oct 17, 2026"
                                                value={currentItem.date || ''} 
                                                onChange={e => setCurrentItem({ ...currentItem, date: e.target.value })} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Registration Deadline (date)</label>
                                            <input 
                                                type="date" 
                                                value={currentItem.registration_deadline || ''} 
                                                onChange={e => setCurrentItem({ ...currentItem, registration_deadline: e.target.value })} 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Registration Deadline Time</label>
                                            <input 
                                                type="text" 
                                                placeholder="11:59 PM IST"
                                                value={currentItem.registration_deadline_time || ''} 
                                                onChange={e => setCurrentItem({ ...currentItem, registration_deadline_time: e.target.value })} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Prize Pool (₹)</label>
                                            <input 
                                                type="number" 
                                                value={currentItem.prize_pool || ''} 
                                                onChange={e => setCurrentItem({ ...currentItem, prize_pool: e.target.value ? parseInt(e.target.value) : null })} 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Min Team Size</label>
                                            <input 
                                                type="number" 
                                                value={currentItem.min_team_size || 1} 
                                                onChange={e => setCurrentItem({ ...currentItem, min_team_size: e.target.value ? parseInt(e.target.value) : null })} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Max Team Size</label>
                                            <input 
                                                type="number" 
                                                value={currentItem.max_team_size || 1} 
                                                onChange={e => setCurrentItem({ ...currentItem, max_team_size: e.target.value ? parseInt(e.target.value) : null })} 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Categories / Tags (comma-separated)</label>
                                        <input 
                                            type="text" 
                                            placeholder="Product Management, Strategy"
                                            value={currentItem.category || ''} 
                                            onChange={e => setCurrentItem({ ...currentItem, category: e.target.value })} 
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Eligibility</label>
                                        <textarea 
                                            placeholder="MBA and senior undergraduate engineering students preferred."
                                            value={currentItem.eligibility || ''} 
                                            onChange={e => setCurrentItem({ ...currentItem, eligibility: e.target.value })} 
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Short / Overview Description</label>
                                        <textarea 
                                            value={currentItem.description || ''} 
                                            onChange={e => setCurrentItem({ ...currentItem, description: e.target.value })} 
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Guidelines / Rules (one per line)</label>
                                        <textarea 
                                            value={Array.isArray(currentItem.rules) ? currentItem.rules.join('\n') : (currentItem.rules || '')}
                                            onChange={e => {
                                                const lines = e.target.value.split('\n').map(r => r.trim()).filter(Boolean);
                                                setCurrentItem({ ...currentItem, rules: lines });
                                            }} 
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>POC Name</label>
                                            <input 
                                                type="text" 
                                                value={currentItem.poc || ''} 
                                                onChange={e => setCurrentItem({ ...currentItem, poc: e.target.value })} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>POC Contact Number</label>
                                            <input 
                                                type="text" 
                                                value={currentItem.contact || ''} 
                                                onChange={e => setCurrentItem({ ...currentItem, contact: e.target.value })} 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Logo URL (optional)</label>
                                        <input 
                                            type="text" 
                                            value={currentItem.logo_url || ''} 
                                            onChange={e => setCurrentItem({ ...currentItem, logo_url: e.target.value })} 
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'results' && (
                                <>
                                    <div className="form-group">
                                        <label>Event ID</label>
                                        <input 
                                            type="number" 
                                            value={currentItem.event_id || ''} 
                                            onChange={e => setCurrentItem({...currentItem, event_id: parseInt(e.target.value)})} 
                                            required 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Winner Name</label>
                                        <input 
                                            type="text" 
                                            value={currentItem.winner_name || ''} 
                                            onChange={e => setCurrentItem({...currentItem, winner_name: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Runner Up Name</label>
                                        <input 
                                            type="text" 
                                            value={currentItem.runner_up_name || ''} 
                                            onChange={e => setCurrentItem({...currentItem, runner_up_name: e.target.value})} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Result Summary</label>
                                        <textarea 
                                            value={currentItem.description || ''} 
                                            onChange={e => setCurrentItem({...currentItem, description: e.target.value})} 
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'sponsors' && (
                                <>
                                    <div className="form-group">
                                        <label>Sponsor Name</label>
                                        <input 
                                            type="text" 
                                            value={currentItem.name || ''} 
                                            onChange={e => setCurrentItem({...currentItem, name: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Level (e.g., Diamond, Gold, Silver)</label>
                                        <input 
                                            type="text" 
                                            value={currentItem.level || ''} 
                                            onChange={e => setCurrentItem({...currentItem, level: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Website URL</label>
                                        <input 
                                            type="url" 
                                            value={currentItem.website_url || ''} 
                                            onChange={e => setCurrentItem({...currentItem, website_url: e.target.value})} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Logo URL</label>
                                        <input 
                                            type="text" 
                                            value={currentItem.logo_url || ''} 
                                            onChange={e => setCurrentItem({...currentItem, logo_url: e.target.value})} 
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'admins' && (
                                <>
                                    <div className="form-group">
                                        <label>Admin Email Address</label>
                                        <input 
                                            type="email" 
                                            placeholder="colleague@navera.in"
                                            value={currentItem.email || ''} 
                                            onChange={e => setCurrentItem({...currentItem, email: e.target.value})} 
                                            required 
                                        />
                                        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
                                            They will be able to access this dashboard once they log in with this email.
                                        </p>
                                    </div>
                                </>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                                <button type="submit" className="btn" style={{ background: '#2BD97F', color: '#000' }} disabled={loading}>
                                    <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
