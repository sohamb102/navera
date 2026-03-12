import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { GraduationCap, Briefcase, ChevronRight, CheckCircle, AlertCircle, LogIn, Mail } from 'lucide-react'
import { supabase } from './supabaseClient'
import Home from './Home'
import Events from './Events'
import Results from './Results';
import Sponsors from './Sponsors';
import Admin from './Admin';

export default function App() {
    const navigate = useNavigate();
    const location = useLocation();
    const [authMode, setAuthMode] = useState('login');
    const [mode, _setMode] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('mode') || 'home';
    });

    const setMode = (m) => {
        if (m === 'home') navigate('/');
        else if (m === 'admin_login') navigate('/admin-login');
        else if (['events', 'results', 'sponsors', 'admin', 'dashboard'].includes(m)) navigate(`/${m}`);
        else {
            // Auth-related modes (login, login_otp, signup) use dedicated /auth route
            setAuthMode(m);
            if (location.pathname !== '/auth') navigate('/auth');
        }
    };
    const [step, setStep] = useState(1); // Used for signup wizard
    const [userType, setUserType] = useState('');
    const [formData, setFormData] = useState({});
    const [globalError, setGlobalError] = useState('');
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);


    useEffect(() => {
        // Handle URL-based routing (e.g., ?mode=admin)
        const params = new URLSearchParams(window.location.search);
        const urlMode = params.get('mode');
        let authListenerSubscription = null;
        
        const checkUserSession = async () => {
            setIsCheckingSession(true);
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    setUser(session.user);
                    // Only redirect to home if we are not specifically asking for admin mode
                    if (urlMode !== 'admin') {
                        setMode('home');
                    } else {
                        setMode('admin');
                    }
                } else {
                    if (urlMode === 'admin') {
                        setMode('admin');
                    }
                    // Handle OAuth errors...
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    if (hashParams.get('error')) {
                        setGlobalError("Google login failed. Please try again.");
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                }
            } catch (err) {
                console.error("Session check error:", err);
                if (urlMode !== 'admin') setMode('login');
                else setMode('admin');
            } finally {
                setIsCheckingSession(false);
            }
        };

        checkUserSession();

        // Listen for auth state changes (e.g. after Google redirect, or session expiry)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setUser(session.user);
                
                // Use a helper or check state logic
                const params = new URLSearchParams(window.location.search);
                const isUrlAdmin = params.get('mode') === 'admin';
                
                setMode(currentMode => {
                    if (isUrlAdmin || currentMode === 'admin') return 'admin';
                    return 'home';
                });
            } else if (event === 'SIGNED_OUT') {
                // Handle logout or session expiry (e.g. cleared cookies, token revoked)
                setUser(null);
                setFormData({});
                setMode('login');
                // Don't show error if user manually clicked logout (we handle that in handleLogout)
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('Session token refreshed successfully');
            }
        });

        authListenerSubscription = authListener.subscription;

        return () => {
            if (authListenerSubscription) {
                authListenerSubscription.unsubscribe();
            }
        };
    }, []);

    const handleOAuthSuccess = async (authUser) => {
        setIsCheckingSession(true);
        setGlobalError('');
        try {
            const email = authUser.email;

            // 1. Check undergraduate table
            let { data: ugData, error: ugError } = await supabase
                .from('undergraduate')
                .select('*')
                .eq('Email_Id', email)
                .limit(1);

            let userRecord = ugData && ugData.length > 0 ? ugData[0] : null;

            // 2. Check postgraduate table if not found
            if (!userRecord) {
                const { data: pgData, error: pgError } = await supabase
                    .from('postgraduate')
                    .select('*')
                    .eq('Email_Id', email)
                    .limit(1);

                userRecord = pgData && pgData.length > 0 ? pgData[0] : null;
            }

            if (userRecord) {
                // User exists in our DB, log them in
                setFormData({
                    ...userRecord,
                    loginMethod: 'oauth',
                    loginInputValue: email
                });
                setMode('home');
                // Clear URL hash
                window.history.replaceState(null, '', window.location.pathname);
            } else {
                // User authenticated via Google, but not in our DB
                await supabase.auth.signOut(); // Immediately sign them out of Supabase auth
                setGlobalError("User does not exist. Please sign up first.");
                setMode('login');
                // Clear URL hash
                window.history.replaceState(null, '', window.location.pathname);
            }

        } catch (error) {
            console.error("OAuth verification error:", error);
            setGlobalError("An error occurred during Google sign in.");
            await supabase.auth.signOut();
            setMode('login');
        } finally {
            setIsCheckingSession(false);
        }
    };

    const handleNextSignUp = () => setStep(s => s + 1);
    const handleBackSignUp = () => {
        setGlobalError('');
        setStep(s => s - 1);
    };

    const switchToSignUp = () => {
        setGlobalError('');
        setFormData({});
        setStep(1);
        setMode('signup');
    };

    const switchToLogin = () => {
        setGlobalError('');
        setFormData({});
        setMode('login');
    };

    const handleLogout = async () => {
        setIsCheckingSession(true);
        try {
            // Scope 'global' signs out from all devices the user is logged into
            await supabase.auth.signOut({ scope: 'global' });
        } catch (error) {
            console.error("Error signing out:", error);
        }
        setFormData({});
        setAuthMode('login'); // Default back to user login
        navigate('/');
        setGlobalError("You have been signed out successfully.");
        setIsCheckingSession(false);
    };

    // Update isAdmin when user changes (using database whitelist)
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setIsAdmin(false);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from('admins')
                    .select('email')
                    .eq('email', user.email)
                    .maybeSingle();
                
                if (data) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error("Admin check error:", err);
                setIsAdmin(false);
            }
        };
        checkAdminStatus();
    }, [user]);

    return (
        <Routes>
            <Route
                path="/"
                element={
                    <Home
                        setMode={setMode}
                        handleLogout={handleLogout}
                        user={user}
                        isAdmin={isAdmin}
                    />
                }
            />
            <Route
                path="/auth"
                element={
                    <div className="center-wrapper">
                    <div className="app-container">
                        <div className="header">
                            <h1>Navera Fest</h1>
                            <p>Join the biggest tech fest of the year</p>
                        </div>
                        {globalError && (
                            <div className="global-error fade-enter-active">
                                <AlertCircle size={20} />
                                <span>{globalError}</span>
                            </div>
                        )}
                        {isCheckingSession ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <p>Verifying session...</p>
                            </div>
                        ) : (
                            <div className="fade-enter-active">
                                {authMode === 'login' && (
                                    <LoginView
                                        setMode={setMode}
                                        setFormData={setFormData}
                                        setGlobalError={setGlobalError}
                                        switchToSignUp={switchToSignUp}
                                    />
                                )}
                                {authMode === 'login_otp' && (
                                    <LoginOTPView
                                        formData={formData}
                                        setMode={setMode}
                                        setGlobalError={setGlobalError}
                                        switchToLogin={switchToLogin}
                                    />
                                )}
                                {authMode === 'signup' && (
                                    <>
                                        {step === 1 && (
                                            <Step1TypeSelection
                                                userType={userType}
                                                setUserType={setUserType}
                                                onNext={handleNextSignUp}
                                                switchToLogin={switchToLogin}
                                            />
                                        )}
                                        {step === 2 && (
                                            <Step2Form
                                                userType={userType}
                                                formData={formData}
                                                setFormData={setFormData}
                                                onNext={handleNextSignUp}
                                                onBack={handleBackSignUp}
                                                setGlobalError={setGlobalError}
                                            />
                                        )}
                                        {step === 3 && (
                                            <Step3OTP
                                                userType={userType}
                                                formData={formData}
                                                onNext={(targetMode) => setMode(targetMode || 'login')}
                                                onBack={handleBackSignUp}
                                                setGlobalError={setGlobalError}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                }
            />
            <Route path="/events" element={<Events setMode={setMode} handleLogout={handleLogout} user={user} isAdmin={isAdmin} />} />
            <Route path="/sponsors" element={<Sponsors setMode={setMode} handleLogout={handleLogout} user={user} isAdmin={isAdmin} />} />
            <Route path="/results" element={<Results setMode={setMode} handleLogout={handleLogout} user={user} isAdmin={isAdmin} />} />
            <Route path="/dashboard" element={<Step4Dashboard user={user} setMode={setMode} handleLogout={handleLogout} />} />
            <Route path="/admin" element={<Admin setMode={setMode} handleLogout={handleLogout} user={user} isAdmin={isAdmin} />} />
            <Route path="/admin-login" element={<AdminLoginView setMode={setMode} setGlobalError={setGlobalError} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function LoginView({ setMode, setFormData, setGlobalError, switchToSignUp }) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    // Dynamic validation
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    const isValidPhone = /^\d{10}$/.test(input);
    const isValid = isValidEmail || isValidPhone;

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setGlobalError('');
        if (!isValid) return;

        setLoading(true);

        try {
            // MOCKED: Skip actual Supabase OTP sending so we can test locally without Twilio errors
            // const { error } = await supabase.auth.signInWithOtp(
            //     isValidEmail ? { email: input } : { phone: input }
            // );

            // if (error) {
            //     setGlobalError(error.message || "Failed to send OTP. Please try again.");
            //     setLoading(false);
            //     return;
            // }

            // Move to OTP screen
            setFormData({
                loginMethod: isValidEmail ? 'email' : 'phone',
                loginInputValue: input
            });
            setTimeout(() => {
                setMode('login_otp');
                setLoading(false);
            }, 500); // Small artificial delay

        } catch (err) {
            console.error(err);
            setGlobalError("Error connecting to the database.");
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGlobalError('');
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        prompt: 'select_account'
                    }
                }
            });

            if (error) {
                setGlobalError("Google login failed. Please try again.");
                setLoading(false);
            }
            // Supabase handles the redirection here
        } catch (err) {
            console.error("Google Auth error:", err);
            setGlobalError("Google login failed. Please try again.");
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSendOTP} className="fade-enter-active">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', textAlign: 'center' }}>Login</h2>

            <div className="form-group">
                <label>Email ID or Mobile Number</label>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="john@example.com or 9876543210"
                    required
                />
                {input.length > 0 && !isValid && (
                    <span style={{ color: 'var(--error-color)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                        Enter a valid email or 10-digit number
                    </span>
                )}
            </div>

            <button type="submit" className="btn" disabled={!isValid || loading}>
                {loading ? 'Processing...' : 'Send OTP'} <LogIn size={18} />
            </button>

            <div style={{ margin: '1rem 0', display: 'flex', alignItems: 'center' }}>
                <hr style={{ flex: 1, borderTop: '1px solid var(--border-color)', borderBottom: 'none' }} />
                <span style={{ padding: '0 10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>OR</span>
                <hr style={{ flex: 1, borderTop: '1px solid var(--border-color)', borderBottom: 'none' }} />
            </div>

            <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGoogleLogin}
                disabled={loading}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    backgroundColor: 'white',
                    color: '#333',
                    border: '1px solid #ddd'
                }}
            >
                <Mail size={18} color="#EA4335" />
                Login with Gmail
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>New to Navera Fest?</p>
                <button type="button" className="btn btn-secondary" onClick={switchToSignUp}>
                    Sign Up
                </button>
            </div>
        </form>
    );
}

function LoginOTPView({ formData, setMode, setGlobalError, switchToLogin }) {
    const [otp, setOtp] = useState(['', '', '', '']);
    const [mockOtp, setMockOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(600); // 10 mins
    const [attempts, setAttempts] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const generated = Math.floor(1000 + Math.random() * 9000).toString();
        setMockOtp(generated);
        console.log(`Mock Login OTP for ${formData.loginInputValue}: ${generated}`);
    }, []);

    useEffect(() => {
        if (timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timerId);
        }
    }, [timeLeft]);

    const handleResend = async () => {
        if (timeLeft === 0) {
            setLoading(true);
            setGlobalError('');
            try {
                // Mock resend logic
                const generated = Math.floor(1000 + Math.random() * 9000).toString();
                setMockOtp(generated);
                console.log(`Mock Login OTP for ${formData.loginInputValue} (Resend): ${generated}`);
                setTimeLeft(600);
                setAttempts(0);
                setOtp(['', '', '', '']);
            } catch (err) {
                setGlobalError("Failed to resend OTP.");
            }
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 3) document.getElementById(`login-opt-${index + 1}`).focus();
    };

    const handleVerify = async () => {
        setGlobalError('');
        const otpStr = otp.join('');

        if (timeLeft === 0) {
            setGlobalError("OTP expired. Please request a new OTP.");
            return;
        }

        if (attempts >= 5) {
            setGlobalError("Maximum attempts reached. Please request a new OTP.");
            return;
        }

        setLoading(true);
        try {
            // Mock OTP verification since we generated it locally
            if (otpStr === mockOtp) {
                setGlobalError('');
                setMode('home');
            } else {
                setAttempts(prev => prev + 1);
                setGlobalError("Invalid OTP. Please try again.");
                if (attempts + 1 >= 5) {
                    setGlobalError("Maximum attempts reached. Please request a new OTP.");
                }
            }
        } catch (err) {
            setGlobalError("Error verifying OTP.");
        }
        setLoading(false);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="fade-enter-active">
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', textAlign: 'center' }}>Secure Login</h2>
            <p style={{ color: 'var(--success-color)', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
                OTP sent successfully to {formData.loginInputValue}
            </p>

            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Expires in: <strong style={{ color: timeLeft < 60 ? 'var(--error-color)' : 'var(--text-primary)' }}>{formatTime(timeLeft)}</strong></span>
            </div>

            <div className="form-group">
                <label>Enter 4-digit OTP</label>
                <div className="otp-container">
                    {otp.map((digit, i) => (
                        <input
                            key={`login-opt-${i}`} id={`login-opt-${i}`} type="number"
                            className="otp-input" value={digit}
                            onChange={(e) => handleOtpChange(i, e.target.value)}
                        />
                    ))}
                </div>
            </div>

            <button className="btn" onClick={handleVerify} disabled={loading || otp.join('').length < 4 || timeLeft === 0 || attempts >= 5}>
                {loading ? 'Authenticating...' : 'Verify OTP'}
            </button>

            <button
                className="btn btn-secondary"
                onClick={handleResend}
                disabled={timeLeft > 0}
            >
                {timeLeft > 0 ? `Resend OTP in ${formatTime(timeLeft)}` : 'Resend OTP'}
            </button>

            <button className="btn btn-secondary" onClick={switchToLogin} style={{ marginTop: '0.5rem', border: 'none' }}>
                Change Login Info
            </button>
        </div>
    );
}

function Step1TypeSelection({ userType, setUserType, onNext, switchToLogin }) {
    const types = [
        { id: 'Undergraduate', icon: <GraduationCap />, desc: 'For students pursuing a bachelor degree' },
        { id: 'Postgraduate', icon: <Briefcase />, desc: 'For masters or doctoral students' }
    ];

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Select User Type</h2>
            {types.map(type => (
                <div
                    key={type.id}
                    className={`type-card ${userType === type.id ? 'selected' : ''}`}
                    onClick={() => setUserType(type.id)}
                >
                    <div className="type-icon">{type.icon}</div>
                    <div className="type-content">
                        <h3>{type.id}</h3>
                        <p>{type.desc}</p>
                    </div>
                </div>
            ))}
            <button
                className="btn"
                onClick={onNext}
                disabled={!userType}
                style={{ marginTop: '1rem' }}
            >
                Continue <ChevronRight size={18} />
            </button>
            <button
                className="btn btn-secondary"
                onClick={switchToLogin}
                style={{ marginTop: '0.5rem', border: 'none' }}
            >
                Back to Login
            </button>
        </div>
    );
}

function Step2Form({ userType, formData, setFormData, onNext, onBack, setGlobalError }) {
    const [loading, setLoading] = useState(false);
    const [localData, setLocalData] = useState({
        Full_Name: formData.Full_Name || '',
        Email_Id: formData.Email_Id || '',
        Phone_Number: formData.Phone_Number || '',
        DOB: formData.DOB || '',
        College_Name: formData.College_Name || '',
        Emergency_Contact: formData.Emergency_Contact || '',
        Graduation_Year: formData.Graduation_Year || ''
    });

    const handleChange = (e) => {
        setLocalData({ ...localData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGlobalError('');

        // Validate Phone Length
        if (localData.Phone_Number.length !== 10) {
            setGlobalError('Phone Number must be exactly 10 digits.');
            return;
        }
        if (localData.Emergency_Contact.length !== 10) {
            setGlobalError('Emergency Contact must be exactly 10 digits.');
            return;
        }

        setLoading(true);

        try {
            if (userType !== 'Admin') {
                // Check for duplicates
                const { data: ugData, error: ugError } = await supabase
                    .from('undergraduate')
                    .select('Email_Id')
                    .eq('Email_Id', localData.Email_Id);

                const { data: pgData, error: pgError } = await supabase
                    .from('postgraduate')
                    .select('Email_Id')
                    .eq('Email_Id', localData.Email_Id);

                if ((ugData && ugData.length > 0) || (pgData && pgData.length > 0)) {
                    setGlobalError("Account already exists. Please log in.");
                    setLoading(false);
                    return;
                }
            }

            setFormData(localData);
            onNext();
        } catch (err) {
            setGlobalError("Error connecting to database.");
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>{userType} Details</h2>

            <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="Full_Name" required value={localData.Full_Name} onChange={handleChange} placeholder="John Doe" />
            </div>

            <div className="form-group">
                <label>Email ID</label>
                <input type="email" name="Email_Id" required value={localData.Email_Id} onChange={handleChange} placeholder="john@example.com" />
            </div>

            <div className="form-group">
                <label>Phone Number</label>
                <input type="number" name="Phone_Number" required value={localData.Phone_Number} onChange={handleChange} placeholder="9876543210" />
            </div>

            <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" name="DOB" required value={localData.DOB} onChange={handleChange} />
            </div>

            <div className="form-group">
                <label>College Name</label>
                <input type="text" name="College_Name" required value={localData.College_Name} onChange={handleChange} placeholder="Institute of Technology" />
            </div>

            {userType === 'Undergraduate' && (
                <div className="form-group">
                    <label>Graduation Year</label>
                    <select name="Graduation_Year" required value={localData.Graduation_Year} onChange={handleChange}>
                        <option value="">Select Year</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                        <option value="2028">2028</option>
                    </select>
                </div>
            )}

            <div className="form-group">
                <label>Emergency Contact Number</label>
                <input type="number" name="Emergency_Contact" required value={localData.Emergency_Contact} onChange={handleChange} placeholder="9876543210" />
            </div>

            <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Validating...' : 'Next'} <ChevronRight size={18} />
            </button>
            <button type="button" className="btn btn-secondary" onClick={onBack}>
                Back
            </button>
        </form>
    );
}

function Step3OTP({ userType, formData, onNext, onBack, setGlobalError }) {
    const [emailOtp, setEmailOtp] = useState(['', '', '', '']);
    const [phoneOtp, setPhoneOtp] = useState(['', '', '', '']);
    const [generatedEmailOtp, setGeneratedEmailOtp] = useState('');
    const [generatedPhoneOtp, setGeneratedPhoneOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(300); // 5 mins
    const [resendTimer, setResendTimer] = useState(30);
    const [loading, setLoading] = useState(false);

    const generateOtps = () => {
        const eOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const pOtp = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedEmailOtp(eOtp);
        setGeneratedPhoneOtp(pOtp);
        console.log(`Email OTP: ${eOtp}, Phone OTP: ${pOtp}`);
        // Mock sending OTP logic here
    };

    useEffect(() => {
        generateOtps();
    }, []);

    useEffect(() => {
        if (timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timerId);
        }
    }, [timeLeft]);

    useEffect(() => {
        if (resendTimer > 0) {
            const timerId = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timerId);
        }
    }, [resendTimer]);

    const handleResend = () => {
        if (resendTimer === 0) {
            generateOtps();
            setResendTimer(30);
            setTimeLeft(300);
            setGlobalError('');
        }
    };

    const handleOtpChange = (type, index, value) => {
        if (value.length > 1) value = value.slice(-1); // Only allow 1 char

        if (type === 'email') {
            const newOtp = [...emailOtp];
            newOtp[index] = value;
            setEmailOtp(newOtp);
            if (value && index < 3) document.getElementById(`e-${index + 1}`).focus();
        } else {
            const newOtp = [...phoneOtp];
            newOtp[index] = value;
            setPhoneOtp(newOtp);
            if (value && index < 3) document.getElementById(`p-${index + 1}`).focus();
        }
    };

    const handleVerify = async () => {
        setGlobalError('');
        const eOtpStr = emailOtp.join('');
        const pOtpStr = phoneOtp.join('');

        if (timeLeft === 0) {
            setGlobalError("OTP has expired. Please resend.");
            return;
        }

        if (eOtpStr !== generatedEmailOtp || pOtpStr !== generatedPhoneOtp) {
            setGlobalError("Incorrect OTP. Please try again.");
            return;
        }

        setLoading(true);

        try {
            let result;
            if (userType === 'Undergraduate') {
                result = await supabase.from('undergraduate').insert([{
                    Full_Name: formData.Full_Name,
                    Email_Id: formData.Email_Id,
                    Phone_Number: formData.Phone_Number,
                    DOB: formData.DOB,
                    Graduation_Year: formData.Graduation_Year,
                    Emergency_Contact: formData.Emergency_Contact
                }]);
            } else if (userType === 'Postgraduate') {
                result = await supabase.from('postgraduate').insert([{
                    Full_Name: formData.Full_Name,
                    Email_Id: formData.Email_Id,
                    Phone_Number: formData.Phone_Number,
                    DOB: formData.DOB,
                    College_Name: formData.College_Name,
                    Emergency_Contact_Number: formData.Emergency_Contact
                }]);
            } else {
                // Admin mock insertion or bypass
                result = { error: null };
            }

            if (result.error) {
                setGlobalError(result.error.message || "Failed to create account.");
            } else {
                // Return user to home screen after successful signup
                setGlobalError('');
                onNext('home');
            }
        } catch (err) {
            setGlobalError("Submission failed.");
        }
        setLoading(false);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Verification Check</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                We have sent a 4-digit code to your email and phone. For testing, check console for the codes!
            </p>

            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Expires in: <strong style={{ color: timeLeft < 60 ? 'var(--error-color)' : 'var(--text-primary)' }}>{formatTime(timeLeft)}</strong></span>
            </div>

            <div className="form-group">
                <label>Email OTP</label>
                <div className="otp-container">
                    {emailOtp.map((digit, i) => (
                        <input
                            key={`e-${i}`} id={`e-${i}`} type="number"
                            className="otp-input" value={digit}
                            onChange={(e) => handleOtpChange('email', i, e.target.value)}
                        />
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label>Phone OTP</label>
                <div className="otp-container">
                    {phoneOtp.map((digit, i) => (
                        <input
                            key={`p-${i}`} id={`p-${i}`} type="number"
                            className="otp-input" value={digit}
                            onChange={(e) => handleOtpChange('phone', i, e.target.value)}
                        />
                    ))}
                </div>
            </div>

            <button className="btn" onClick={handleVerify} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Submit'}
            </button>

            <button
                className="btn btn-secondary"
                onClick={handleResend}
                disabled={resendTimer > 0}
            >
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
            </button>

            <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '0.5rem', border: 'none' }}>
                Change Details
            </button>
        </div>
    );
}

function Step4Dashboard({ user, setMode, handleLogout }) {
    const [registeredEvents, setRegisteredEvents] = useState([]);
    const [teamData, setTeamData] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [joinRequests, setJoinRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            // 1. Fetch Solo Registrations
            const { data: soloData, error: soloError } = await supabase
                .from('event_registrations')
                .select(`
                    id, 
                    created_at,
                    events (id, name, max_team_size)
                `)
                .eq('user_id', user.id);
            if (soloError) throw soloError;

            // 2. Fetch Team Memberships
            const { data: members, error: membersError } = await supabase
                .from('team_members')
                .select(`
                    team_id,
                    role,
                    teams (
                        id,
                        team_name,
                        events (id, name, max_team_size)
                    )
                `)
                .eq('user_id', user.id);
            if (membersError) throw membersError;

            // 3. Fetch Invitations
            const { data: invites, error: invitesError } = await supabase
                .from('team_invitations')
                .select(`
                    id,
                    status,
                    teams (id, team_name, events(name))
                `)
                .eq('invited_user', user.id)
                .eq('status', 'pending');
            if (invitesError) throw invitesError;

            // 4. Fetch Join Requests (where user is leader of the team)
            // First get teams where user is leader
            const leaderTeams = members.filter(m => m.role === 'leader').map(m => m.team_id);
            let requests = [];
            if (leaderTeams.length > 0) {
                const { data: reqs, error: reqsError } = await supabase
                    .from('team_join_requests')
                    .select(`
                        id,
                        user_id,
                        status,
                        teams (id, team_name, events(name)),
                        profiles:user_id (name, email)
                    `)
                    .in('team_id', leaderTeams)
                    .eq('status', 'pending');
                if (reqsError) throw reqsError;
                requests = reqs || [];
            }

            setRegisteredEvents(soloData || []);
            setTeamData(members || []);
            setInvitations(invites || []);
            setJoinRequests(requests);
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            setErrorMsg("Failed to load dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    const handleInviteResponse = async (id, status) => {
        try {
            const { error: updateError } = await supabase
                .from('team_invitations')
                .update({ status })
                .eq('id', id);
            if (updateError) throw updateError;

            if (status === 'accepted') {
                // Find the invite to get the team_id
                const invite = invitations.find(inv => inv.id === id);
                if (invite) {
                    const { error: insertError } = await supabase
                        .from('team_members')
                        .insert([{ team_id: invite.teams.id, user_id: user.id }]);
                    if (insertError) throw insertError;
                }
            }
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            alert("Failed to update invitation status.");
        }
    };

    const handleJoinRequestResponse = async (id, status, team_id, user_id) => {
        try {
            const { error: updateError } = await supabase
                .from('team_join_requests')
                .update({ status })
                .eq('id', id);
            if (updateError) throw updateError;

            if (status === 'accepted') {
                const { error: insertError } = await supabase
                    .from('team_members')
                    .insert([{ team_id, user_id }]);
                if (insertError) throw insertError;
            }
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            alert("Failed to update join request status.");
        }
    };

    return (
        <div className="home-container fade-enter-active">
            {/* Nav */}
            <nav className="navbar">
                <div className="nav-logo" onClick={() => setMode('home')}>
                    <h1>Navera Fest</h1>
                </div>
                <div className="nav-links">
                    <button className="nav-item" onClick={() => setMode('home')}>Home</button>
                    <button className="nav-item" onClick={() => setMode('events')}>Events</button>
                    <button className="nav-item" style={{ color: '#2BD97F', textShadow: '0 0 12px rgba(43, 217, 127, 0.5)' }}>Dashboard</button>
                    <button
                        className="nav-item"
                        onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff6b6b' }}
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </nav>

            <main className="events-main">
                <div className="events-header">
                    <h2 className="title">My Dashboard</h2>
                    <p className="subtitle">Manage your registered events, teams, and invitations.</p>
                </div>

                {errorMsg && <div className="error-banner" style={{ marginBottom: '2rem' }}>{errorMsg}</div>}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#fff' }}>Loading data...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Section: My Registered Events */}
                        <div className="details-section-card">
                            <h3>My Registered Events</h3>
                            {registeredEvents.length === 0 && teamData.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)' }}>You haven't registered for any events yet.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <th style={{ padding: '12px' }}>Event Name</th>
                                            <th style={{ padding: '12px' }}>Participation Type</th>
                                            <th style={{ padding: '12px' }}>Team Name</th>
                                            <th style={{ padding: '12px' }}>Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Solo Registrations */}
                                        {registeredEvents.map(reg => (
                                            <tr key={reg.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '12px' }}>{reg.events?.name}</td>
                                                <td style={{ padding: '12px' }}><span className="el-tag">Solo</span></td>
                                                <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>N/A</td>
                                                <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>N/A</td>
                                            </tr>
                                        ))}
                                        {/* Team Registrations */}
                                        {teamData.map(member => (
                                            <tr key={member.team_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '12px' }}>{member.teams?.events?.name}</td>
                                                <td style={{ padding: '12px' }}><span className="el-tag">Team</span></td>
                                                <td style={{ padding: '12px' }}>{member.teams?.team_name}</td>
                                                <td style={{ padding: '12px' }}><span style={{ color: member.role === 'leader' ? 'var(--accent-light)' : '#cbd5e1' }}>{member.role || 'member'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Section: Pending Invitations */}
                        {invitations.length > 0 && (
                            <div className="details-section-card" style={{ borderColor: 'rgba(255,165,0,0.3)' }}>
                                <h3>Pending Invitations</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {invitations.map(inv => (
                                        <div key={inv.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong style={{ color: '#fff' }}>{inv.teams?.team_name}</strong>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>For Event: {inv.teams?.events?.name}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleInviteResponse(inv.id, 'accepted')} className="btn" style={{ padding: '6px 16px', outline: 'none', border: 'none', background: 'var(--accent-light)', color: '#000', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Accept</button>
                                                <button onClick={() => handleInviteResponse(inv.id, 'declined')} className="btn-secondary" style={{ padding: '6px 16px', outline: 'none', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>Decline</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section: Pending Join Requests (Leader View) */}
                        {joinRequests.length > 0 && (
                            <div className="details-section-card" style={{ borderColor: 'rgba(43,217,127,0.3)' }}>
                                <h3>Team Join Requests</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {joinRequests.map(req => (
                                        <div key={req.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong style={{ color: '#fff' }}>{req.profiles?.name || 'A user'}</strong> wants to join <strong style={{ color: 'var(--accent-light)' }}>{req.teams?.team_name}</strong>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email: {req.profiles?.email} | Event: {req.teams?.events?.name}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleJoinRequestResponse(req.id, 'accepted', req.teams.id, req.user_id)} className="btn" style={{ padding: '6px 16px', outline: 'none', border: 'none', background: 'var(--accent-light)', color: '#000', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Approve</button>
                                                <button onClick={() => handleJoinRequestResponse(req.id, 'rejected', req.teams.id, req.user_id)} className="btn-secondary" style={{ padding: '6px 16px', outline: 'none', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>Reject</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </main>
        </div>
    );
}

function AdminLoginView({ setMode, setGlobalError }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setGlobalError('');
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                setGlobalError(error.message);
            } else {
                // After login, navigate to admin. Admin.jsx handles the isAdmin check.
                setMode('admin');
            }
        } catch (err) {
            console.error("Admin login error:", err);
            setGlobalError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="center-wrapper">
            <div className="app-container">
                <div className="header">
                    <h1>Admin Login</h1>
                    <p>Secure access for Navera Management</p>
                </div>

                <form onSubmit={handleLogin} className="fade-enter-active">
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@navera.in"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Sign In'} <LogIn size={18} />
                    </button>

                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => setMode('home')}
                        style={{ border: 'none' }}
                    >
                        Back to Home
                    </button>
                </form>
            </div>
        </div>
    );
}
