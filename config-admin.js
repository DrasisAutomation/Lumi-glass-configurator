const ADMIN_CONFIG = {
    passwordHash: "4ee52e0cb94418d5ea2470b835acc1072b47e5dcde93a29e60a5c1bb15299a62", 
    sessionTimeout: 5 * 60 * 1000, // 5 minutes (short session)
    sessionKey: 'lumi_admin_authenticated',
    maxFailedAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
};