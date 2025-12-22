import { NavLink } from 'react-router-dom'

const AppNav = () => {
  const navClass = ({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`

  return (
    <nav className="app-nav">
      <NavLink to="/auth" className={navClass}>
        Auth
      </NavLink>
      <NavLink to="/media" className={navClass}>
        Media
      </NavLink>
      <NavLink to="/search" className={navClass}>
        Search
      </NavLink>
      <NavLink to="/labeling" className={navClass}>
        Labeling
      </NavLink>
    </nav>
  )
}

export default AppNav
