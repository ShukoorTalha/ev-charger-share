import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Paper,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as UsersIcon,
  ElectricCar as ChargersIcon,
  BookOnline as BookingsIcon,
  Payment as PaymentsIcon,
  Settings as SettingsIcon,
  Assessment as AnalyticsIcon,
  Security as SecurityIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 280;

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/admin/dashboard',
      description: 'Overview and statistics'
    },
    {
      text: 'User Management',
      icon: <UsersIcon />,
      path: '/admin/users',
      description: 'Manage users and roles'
    },
    {
      text: 'Charger Management',
      icon: <ChargersIcon />,
      path: '/admin/chargers',
      description: 'Approve and manage chargers'
    },
    {
      text: 'Booking Management',
      icon: <BookingsIcon />,
      path: '/admin/bookings',
      description: 'Monitor and resolve bookings'
    },
    {
      text: 'Payment Management',
      icon: <PaymentsIcon />,
      path: '/admin/payments',
      description: 'Handle payments and refunds'
    },
    {
      text: 'Analytics',
      icon: <AnalyticsIcon />,
      path: '/admin/analytics',
      description: 'System analytics and reports'
    },
    {
      text: 'Security & Moderation',
      icon: <SecurityIcon />,
      path: '/admin/moderation',
      description: 'Content moderation and security'
    },
    {
      text: 'System Settings',
      icon: <SettingsIcon />,
      path: '/admin/settings',
      description: 'Configure system settings'
    }
  ];

  const isActive = (path) => {
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Admin', path: '/admin' }
    ];

    if (pathSegments.length > 1) {
      const adminPath = pathSegments[1];
      const menuItem = menuItems.find(item => item.path.includes(adminPath));
      if (menuItem) {
        breadcrumbs.push({ label: menuItem.text, path: menuItem.path });
      }
    }

    return breadcrumbs;
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            position: 'relative',
            height: 'calc(100vh - 64px)', // Account for header height
            mt: '64px' // Header height
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Admin Panel
          </Typography>
          <Typography variant="body2" color="textSecondary">
            System Administration
          </Typography>
        </Box>
        <Divider />
        
        <List sx={{ px: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  secondary={item.description}
                  secondaryTypographyProps={{
                    variant: 'caption',
                    sx: { 
                      color: isActive(item.path) ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                      fontSize: '0.7rem'
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ mt: 'auto' }} />
        <Box sx={{ p: 2 }}>
          <ListItemButton
            onClick={() => navigate('/')}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Back to Main Site" />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${drawerWidth}px)`,
          minHeight: 'calc(100vh - 64px)' // Account for header
        }}
      >
        {/* Breadcrumbs */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Breadcrumbs>
            {getBreadcrumbs().map((crumb, index) => (
              <Link
                key={index}
                color={index === getBreadcrumbs().length - 1 ? 'text.primary' : 'inherit'}
                href={crumb.path}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(crumb.path);
                }}
                sx={{
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                {crumb.label}
              </Link>
            ))}
          </Breadcrumbs>
        </Paper>

        {/* Page Content */}
        {children}
      </Box>
    </Box>
  );
};

export default AdminLayout;
