import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppHeader from './components/AppHeader.jsx'
import AppNav from './components/AppNav.jsx'
import RequestLog from './components/RequestLog.jsx'
import AuthPage from './pages/AuthPage.jsx'
import MediaPage from './pages/MediaPage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import LabelingPage from './pages/LabelingPage.jsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { LabelingProvider } from './contexts/LabelingContext.jsx'
import { MediaProvider } from './contexts/MediaContext.jsx'
import { RequestLogProvider } from './contexts/RequestLogContext.jsx'
import { SearchProvider } from './contexts/SearchContext.jsx'

const RequireAuth = ({ children }) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }
  return children
}

const AppContent = () => {
  const { isAuthenticated } = useAuth()

  return (
    <main className="app">
      <AppHeader />
      <AppNav />
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/media" replace /> : <Navigate to="/auth" replace />
          }
        />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/media"
          element={
            <RequireAuth>
              <MediaPage />
            </RequireAuth>
          }
        />
        <Route
          path="/search"
          element={
            <RequireAuth>
              <SearchPage />
            </RequireAuth>
          }
        />
        <Route
          path="/labeling"
          element={
            <RequireAuth>
              <LabelingPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* TODO: remove request log panel before production release */}
      <RequestLog />
    </main>
  )
}

const AppProviders = ({ children }) => {
  const { isAuthenticated } = useAuth()

  return (
    <MediaProvider isAuthenticated={isAuthenticated}>
      <SearchProvider isAuthenticated={isAuthenticated}>
        <LabelingProvider isAuthenticated={isAuthenticated}>{children}</LabelingProvider>
      </SearchProvider>
    </MediaProvider>
  )
}

function App() {
  return (
    <RequestLogProvider>
      <AuthProvider>
        <AppProviders>
          <AppContent />
        </AppProviders>
      </AuthProvider>
    </RequestLogProvider>
  )
}

export default App
