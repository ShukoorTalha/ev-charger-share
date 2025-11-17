import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Menu, MenuItem } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleMenuClose();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            EvChargerShare
          </Link>
        </Typography>
        {!loading && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {isAuthenticated ? (
              <>
                <Button color="inherit" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </Button>
                {user?.role === 'admin' && (
                  <Button color="inherit" onClick={() => navigate('/admin')}>
                    Admin
                  </Button>
                )}
                <Button
                  color="inherit"
                  startIcon={<Avatar sx={{ width: 24, height: 24 }} src={user?.avatarUrl} >{user?.firstName?.[0]}</Avatar>}
                  onClick={handleMenuOpen}
                >
                  {user?.firstName}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={() => { handleMenuClose(); navigate('/dashboard'); }}>Profile</MenuItem>
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button color="inherit" onClick={() => navigate('/login')}>
                  Login
                </Button>
                <Button color="inherit" onClick={() => navigate('/register')}>
                  Register
                </Button>
              </>
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;