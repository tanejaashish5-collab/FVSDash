import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { AuthContextType, UserProfile } from '../types';
import { DEFAULT_USER_PROFILE, ADMIN_PROFILE } from '../constants';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [adminUser, setAdminUser] = useState<UserProfile | null>(null);
    const [isImpersonating, setIsImpersonating] = useState(false);

    const login = useCallback(() => {
        // Client login
        setUser(DEFAULT_USER_PROFILE);
        setAdminUser(null);
        setIsImpersonating(false);
    }, []);

    const loginAsAdmin = useCallback(() => {
        setUser(ADMIN_PROFILE);
        setAdminUser(ADMIN_PROFILE);
        setIsImpersonating(false);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setAdminUser(null);
        setIsImpersonating(false);
    }, []);
    
    const impersonate = useCallback((clientProfile: UserProfile) => {
        if (adminUser) { // Can only impersonate if logged in as admin
            setUser(clientProfile);
            setIsImpersonating(true);
        }
    }, [adminUser]);
    
    const stopImpersonating = useCallback(() => {
        if (adminUser) {
            setUser(adminUser);
            setIsImpersonating(false);
        }
    }, [adminUser]);

    const value: AuthContextType = {
        user,
        isAdmin: !!adminUser && !isImpersonating,
        isImpersonating,
        adminUser,
        login,
        loginAsAdmin,
        logout,
        impersonate,
        stopImpersonating,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
