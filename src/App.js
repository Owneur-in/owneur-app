/**
 * App.js — Root component.
 * Manages all screen routing and shared app state.
 * To add a new screen: import it, add to shared props, add render line.
 */
import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Landing from './pages/Landing'
import Login from './pages/Login'
import OTP from './pages/OTP'
import KYC from './pages/KYC'
import Dashboard from './pages/Dashboard'
import CreateListing from './pages/CreateListing'
import SellerProfile from './pages/SellerProfile'
import Catalogue from './pages/Catalogue'
import Home from './pages/Home'
import Search from './pages/Search'
import BizDetail from './pages/BizDetail'
import WriteReview from './pages/WriteReview'
import Saved from './pages/Saved'
import FAQ from './pages/FAQ'
import Terms from './pages/Terms'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'
import Suspended from './pages/Suspended'

function Toast({ show, msg }) {
  return <div className={`toast ${show ? 'show' : ''}`}>{msg}</div>
}

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [prevScreen, setPrevScreen] = useState('home')
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState({ show: false, msg: '' })
  const [selectedBiz, setSelectedBiz] = useState(null)
  const [mobileNumber, setMobileNumber] = useState('')
  const [sellerName, setSellerName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  function nav(to) {
    setPrevScreen(screen)
    setScreen(to)
    window.scrollTo(0, 0)
  }

  function showToast(msg) {
    setToast({ show: true, msg })
    setTimeout(() => setToast({ show: false, msg: '' }), 2800)
  }

  const shared = {
    nav,
    prevScreen,
    user,
    setUser,
    showToast,
    selectedBiz,
    setSelectedBiz,
    mobileNumber,
    setMobileNumber,
    sellerName,
    setSellerName
  }

  return (
    <div className="app-container">
      {screen === 'landing'        && <Landing {...shared} />}
      {screen === 'login'          && <Login {...shared} />}
      {screen === 'otp'            && <OTP {...shared} />}
      {screen === 'kyc'            && <KYC {...shared} />}
      {screen === 'dashboard'      && <Dashboard {...shared} />}
      {screen === 'create'         && <CreateListing {...shared} />}
      {screen === 'seller-profile' && <SellerProfile {...shared} />}
      {screen === 'catalogue'      && <Catalogue {...shared} />}
      {screen === 'home'           && <Home {...shared} />}
      {screen === 'search'         && <Search {...shared} />}
      {screen === 'biz-detail'     && <BizDetail {...shared} />}
      {screen === 'write-review'   && <WriteReview {...shared} />}
      {screen === 'saved'          && <Saved {...shared} />}
      {screen === 'faq'            && <FAQ {...shared} />}
      {screen === 'terms'          && <Terms {...shared} />}
      {screen === 'admin-login'    && <AdminLogin {...shared} />}
      {screen === 'admin'          && <Admin {...shared} />}
      {screen === 'suspended'      && <Suspended {...shared} />}
      <Toast show={toast.show} msg={toast.msg} />
    </div>
  )
}
