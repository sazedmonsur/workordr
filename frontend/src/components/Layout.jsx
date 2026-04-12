import { Outlet, NavLink } from 'react-router-dom'

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
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-gray-700">
          <span className="text-white text-xl font-bold tracking-tight">
            Work<span className="text-blue-400">Ordr</span>
          </span>
          <p className="text-gray-500 text-xs mt-0.5">Admin Portal</p>
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
        <div className="px-6 py-4 border-t border-gray-700 space-y-1">
          <a
            href="/book"
            target="_blank"
            rel="noreferrer"
            className="block text-xs text-blue-400 hover:text-blue-300"
          >
            Customer Booking Page ↗
          </a>
          <p className="text-gray-600 text-xs">WorkOrdr v2.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
