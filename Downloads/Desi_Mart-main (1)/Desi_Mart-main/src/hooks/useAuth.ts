import { useState, useEffect } from 'react';
import { User } from '../types';

// Mock authentication hook
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for existing session
    const savedUser = localStorage.getItem('desibazaar_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Mock login - in real app, this would call your API
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (email === 'demo@desibazaar.com' && password === 'demo123') {
      const mockUser: User = {
        id: '1',
        email,
        name: 'Demo User',
        phone: '+91 98765 43210'
      };
      
      setUser(mockUser);
      localStorage.setItem('desibazaar_user', JSON.stringify(mockUser));
      setLoading(false);
      return { success: true };
    } else {
      setLoading(false);
      return { success: false, error: 'Invalid credentials. Use demo@desibazaar.com / demo123' };
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser: User = {
      id: Date.now().toString(),
      email,
      name,
      phone
    };
    
    setUser(mockUser);
    localStorage.setItem('desibazaar_user', JSON.stringify(mockUser));
    setLoading(false);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('desibazaar_user');
  };

  return {
    user,
    loading,
    login,
    register,
    logout
  };
};