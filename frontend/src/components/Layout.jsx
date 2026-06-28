import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/dashboard',     label: 'Dashboard',      icon: '▤'  },
  { to: '/dispatch',      label: 'Dispatch Board',  icon: '⊞'  },
  { to: '/jobs',          label: 'Jobs',            icon: '⚙'  },
  { to: '/customers',     label: 'Customers',       icon: '◉'  },
  { to: '/technicians',   label: 'Technicians',     icon: '◈'  },
  { to: '/services',      label: 'Services',        icon: '◆'  },
  { to: '/invoices',      label: 'Invoices',        icon: '◧'  },
  { to: '/notifications', label: 'Notifications',   icon: '◻'  },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-gray-900 flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-gray-700">
          <span className="text-white text-xl font-bold tracking-tight">
            Work<span className="text-blue-400">Ordr</span>
          </span>
          <p className="text-gray-400 text-xs mt-0.5 truncate">
            {user?.company_name || 'Admin Portal'}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span className="text-base w-4 text-center">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-700 space-y-2">
          <a
            href="/book"
            target="_blank"
            rel="noreferrer"
            className="block text-xs text-blue-400 hover:text-blue-300 px-2"
          >
            Customer Booking Page ↗
          </a>
          <div className="flex items-center justify-between px-2">
            <p className="text-gray-500 text-xs truncate max-w-[120px]">{user?.email}</p>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-white text-xs transition-colors"
              title="Sign out"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
