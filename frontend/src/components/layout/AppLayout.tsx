import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import AssessmentIcon from '@mui/icons-material/Assessment'
import DashboardIcon from '@mui/icons-material/Dashboard'
import GroupIcon from '@mui/icons-material/Group'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import PersonIcon from '@mui/icons-material/Person'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import {
  AppBar,
  Avatar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { paths } from '@/router/paths'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store/auth'
import type { Role } from '@/types/domain'

interface NavItem {
  label: string
  to: string
  icon: ReactNode
  roles?: Role[]
}

const drawerWidth = 260

const navItems: NavItem[] = [
  {
    label: 'nav.dashboard',
    to: paths.dashboard,
    icon: <DashboardIcon />,
  },
  {
    label: 'nav.collaborators',
    to: paths.collaborators,
    icon: <GroupIcon />,
    roles: ['MASTER'],
  },
  {
    label: 'nav.modules',
    to: paths.modules,
    icon: <LibraryBooksIcon />,
    roles: ['MASTER'],
  },
  {
    label: 'nav.selfAssessment',
    to: paths.selfAssessment,
    icon: <PersonIcon />,
    roles: ['COLABORADOR'],
  },
  {
    label: 'nav.managerReview',
    to: paths.managerReview,
    icon: <AssessmentIcon />,
    roles: ['MASTER'],
  },
  {
    label: 'nav.reports',
    to: paths.reports,
    icon: <QueryStatsIcon />,
    roles: ['MASTER'],
  },
]

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { enqueueSnackbar } = useSnackbar()
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)

  const availableNavItems = useMemo(() => {
    if (!user) return []
    return navItems.filter((item) => !item.roles || item.roles.includes(user.role))
  }, [user])

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev)
  }

  const handleSignOut = () => {
    signOut()
    queryClient.clear()
    enqueueSnackbar(t('app.signedOut'), { variant: 'info' })
    navigate(paths.login, { replace: true })
  }

  const drawer = (
    <div>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
        }}
      >
        <Typography variant="h6" noWrap>
          {t('app.title')}
        </Typography>
        <IconButton onClick={handleDrawerToggle} sx={{ display: { sm: 'none' } }}>
          <ChevronLeftIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <List>
        {availableNavItems.map((item) => {
          const selected = location.pathname === item.to
          return (
            <ListItem key={item.to} disablePadding>
              <ListItemButton
                selected={selected}
                onClick={() => {
                  navigate(item.to)
                  setMobileOpen(false)
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={t(item.label)} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </div>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">
              {user ? t('app.welcome', { name: user.email }) : t('app.title')}
            </Typography>
          </Box>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar>{user.email.charAt(0).toUpperCase()}</Avatar>
              <IconButton color="inherit" onClick={handleSignOut}>
                <LogoutIcon />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="menu"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  )
}
