import React, { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUserInfo, type UserResponse, UserRole } from '../api/users'

interface AuthContextType {
  isAuthenticated: boolean
  user: UserResponse | null
  isAdmin: boolean
  login: (token: string, refreshToken: string) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [user, setUser] = useState<UserResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchUserInfo = async () => {
    try {
      const userInfo = await getCurrentUserInfo()
      setUser(userInfo)
      setIsAuthenticated(true)
    } catch (error) {
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      fetchUserInfo()
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (token: string, refreshToken: string) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('refresh_token', refreshToken)
    await fetchUserInfo()
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setIsAuthenticated(false)
    setUser(null)
  }

  const isAdmin = user?.role === UserRole.ADMIN

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isAdmin, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
