"use client";
import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsMenuOpen(false);
      setShowUserMenu(false);
    };
    if (isMenuOpen || showUserMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen, showUserMenu]);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20' 
          : 'bg-white/60 backdrop-blur-md shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            {/* Enhanced Logo/Brand */}
            <Link href="/mainmenu" className="flex items-center space-x-3 flex-shrink-0 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <Image 
                  src="/ccib-logo.png" 
                  alt="CCIB Logo" 
                  width={44} 
                  height={44} 
                  className="relative rounded-full ring-2 ring-white/50 group-hover:ring-blue-400/50 group-hover:scale-110 transition-all duration-300" 
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                  SMS-Sender
                </h1>
                <p className="text-xs text-gray-500 font-medium tracking-wide">Platform</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {session?.user ? (
                <>
                  {/* Navigation Links */}
                  <div className="flex items-center space-x-1 mr-6">
                    <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-all duration-200">
                      Dashboard
                    </Link>
                    <Link href="/support-letter" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-all duration-200">
                      หนังสือตรวจรออนุมัติ
                    </Link>
                    <Link href="/all-data" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-all duration-200">
                      ค้นหาข้อมูลทั้งหมด
                    </Link>
                  </div>

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUserMenu(!showUserMenu);
                      }}
                      className="flex items-center space-x-3 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border border-blue-200/50 hover:border-blue-300/50 transition-all duration-200 group"
                    >
                      <div className="relative">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                          {session.user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="hidden lg:block text-left">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {session.user.name}
                        </p>
                        <p className="text-xs text-gray-500">Online</p>
                      </div>
                      <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* User Dropdown */}
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 py-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                              {session.user.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{session.user.name}</p>
                              {session.user.email && (
                                <p className="text-sm text-gray-500">{session.user.email}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="py-2">
                          <Link href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150">
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Profile Settings
                          </Link>
                          <Link href="/billing" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150">
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            (InDevelopment)
                          </Link>
                          <div className="border-t border-gray-100 mt-2 pt-2">
                            <button
                              onClick={handleSignOut}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150"
                            >
                              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Sign Out
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link href="/login" className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-all duration-200">
                    Sign In
                  </Link>
                  <Link href="/signup" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Enhanced Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="relative inline-flex items-center justify-center p-2 rounded-xl text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-200"
              >
                <span className="sr-only">Open main menu</span>
                <div className="relative w-6 h-6">
                  <span className={`absolute block h-0.5 w-6 bg-current transform transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : 'translate-y-0'}`}></span>
                  <span className={`absolute block h-0.5 w-6 bg-current transform transition-all duration-300 mt-2 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`absolute block h-0.5 w-6 bg-current transform transition-all duration-300 mt-4 ${isMenuOpen ? '-rotate-45 -translate-y-2' : 'translate-y-0'}`}></span>
                </div>
              </button>
            </div>
          </div>

          {/* Enhanced Mobile Navigation Menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute left-0 right-0 top-full bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-2xl animate-in slide-in-from-top-2 duration-200">
              <div className="px-4 pt-4 pb-6 space-y-3">
                {session?.user ? (
                  <>
                    {/* Mobile User Info */}
                    <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                          {session.user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-gray-900 font-semibold">{session.user.name}</p>
                        {session.user.email && (
                          <p className="text-gray-500 text-sm">{session.user.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Mobile Navigation Links */}
                    <div className="space-y-2">
                      <Link href="/dashboard" className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 font-medium transition-all duration-200">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        </svg>
                        Dashboard
                      </Link>
                      <Link href="/campaigns" className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 font-medium transition-all duration-200">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Campaigns
                      </Link>
                      <Link href="/analytics" className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 font-medium transition-all duration-200">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Analytics
                      </Link>
                      <Link href="/profile" className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 font-medium transition-all duration-200">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </Link>
                    </div>
                    
                    {/* Mobile Logout Button */}
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-3 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 font-medium transition-all duration-200 border-t border-gray-200/50 mt-4 pt-4"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <Link href="/login" className="flex items-center justify-center w-full px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 font-medium transition-all duration-200 border border-gray-300/50">
                      Sign In
                    </Link>
                    <Link href="/signup" className="flex items-center justify-center w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200">
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content with top padding to account for fixed navbar */}
      <main className="pt-20">
        {children}
      </main>
    </div>
  );
}