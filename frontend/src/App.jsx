import './App.css'
import AppHeader from './components/AppHeader.jsx'
import AuthPanels from './components/AuthPanels.jsx'
import SearchPanel from './components/SearchPanel.jsx'
import MediaPanel from './components/MediaPanel.jsx'
import LabelPanel from './components/LabelPanel.jsx'
import RequestLog from './components/RequestLog.jsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { LabelingProvider } from './contexts/LabelingContext.jsx'
import { MediaProvider } from './contexts/MediaContext.jsx'
import { RequestLogProvider } from './contexts/RequestLogContext.jsx'
import { SearchProvider } from './contexts/SearchContext.jsx'

const AppContent = () => {
  const { isAuthenticated } = useAuth()

  return (
    <main className="app">
      <AppHeader />
      <AuthPanels />

      {isAuthenticated ? (
        <>
          <SearchPanel />
          <MediaPanel />
          <LabelPanel />
        </>
      ) : (
        <section className="panel media-panel">
          <div className="media-header">
            <div>
              <h2>Media Uploads</h2>
              <p className="hint">Login is required to view and upload media.</p>
            </div>
          </div>
        </section>
      )}

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
