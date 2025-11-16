import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Payment as PaymentIcon,
  BookOnline as BookingIcon,
  People as UserIcon,
  ElectricCar as ChargerIcon,
  Notifications as NotificationIcon,
  Computer as SystemIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import adminAPI from '../services/adminAPI';
import AdminLayout from '../components/AdminLayout';

const AdminSystemSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [originalSettings, setOriginalSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    // Check if there are any changes
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSystemSettings();
      const settingsData = response.data.data;
      setSettings(settingsData);
      setOriginalSettings(JSON.parse(JSON.stringify(settingsData)));
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleNestedSettingChange = (category, parentKey, subKey, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [parentKey]: {
          ...prev[category][parentKey],
          [subKey]: value
        }
      }
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      // Flatten settings for API - preserve nested objects as they are
      const flatSettings = {};
      Object.entries(settings).forEach(([category, categorySettings]) => {
        Object.entries(categorySettings).forEach(([key, value]) => {
          // Keep the value as is - the backend expects nested objects for complex settings
          flatSettings[key] = value;
        });
      });

      await adminAPI.updateSystemSettings({ settings: flatSettings });
      
      // Update original settings to reflect saved state
      setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      setHasChanges(false);
      
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    setSettings(JSON.parse(JSON.stringify(originalSettings)));
    setHasChanges(false);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'payment':
        return <PaymentIcon />;
      case 'booking':
        return <BookingIcon />;
      case 'user':
        return <UserIcon />;
      case 'charger':
        return <ChargerIcon />;
      case 'notification':
        return <NotificationIcon />;
      case 'system':
        return <SystemIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  const getCategoryTitle = (category) => {
    switch (category) {
      case 'payment':
        return 'Payment Settings';
      case 'booking':
        return 'Booking Settings';
      case 'user':
        return 'User Settings';
      case 'charger':
        return 'Charger Settings';
      case 'notification':
        return 'Notification Settings';
      case 'system':
        return 'System Settings';
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  const renderSettingField = (category, key, value) => {
    const settingKey = key;
    
    // Handle object values by rendering nested fields
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return (
        <Card key={settingKey} variant="outlined" sx={{ mb: 2, bgcolor: 'grey.50' }}>
          <CardContent sx={{ pb: 2 }}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom color="primary">
              {getSettingLabel(key)}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {Object.entries(value).map(([subKey, subValue]) => (
                <Grid item xs={12} sm={6} key={subKey}>
                  {renderNestedSettingField(category, key, subKey, subValue)}
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      );
    }
    
    // Determine field type based on key name and value
    if (typeof value === 'boolean') {
      return (
        <FormControlLabel
          key={settingKey}
          control={
            <Switch
              checked={value}
              onChange={(e) => handleSettingChange(category, key, e.target.checked)}
              color="primary"
            />
          }
          label={getSettingLabel(key)}
          sx={{ mb: 2 }}
        />
      );
    }
    
    if (typeof value === 'number') {
      return (
        <TextField
          key={settingKey}
          fullWidth
          label={getSettingLabel(key)}
          type="number"
          value={value}
          onChange={(e) => handleSettingChange(category, key, parseFloat(e.target.value) || 0)}
          margin="normal"
          variant="outlined"
          InputProps={getInputProps(key)}
        />
      );
    }
    
    if (key.includes('email') || key.includes('Email')) {
      return (
        <TextField
          key={settingKey}
          fullWidth
          label={getSettingLabel(key)}
          type="email"
          value={value || ''}
          onChange={(e) => handleSettingChange(category, key, e.target.value)}
          margin="normal"
          variant="outlined"
        />
      );
    }
    
    if (key.includes('url') || key.includes('Url') || key.includes('URL')) {
      return (
        <TextField
          key={settingKey}
          fullWidth
          label={getSettingLabel(key)}
          type="url"
          value={value || ''}
          onChange={(e) => handleSettingChange(category, key, e.target.value)}
          margin="normal"
          variant="outlined"
        />
      );
    }
    
    if (key.includes('password') || key.includes('secret') || key.includes('key')) {
      return (
        <TextField
          key={settingKey}
          fullWidth
          label={getSettingLabel(key)}
          type="password"
          value={value || ''}
          onChange={(e) => handleSettingChange(category, key, e.target.value)}
          margin="normal"
          variant="outlined"
          helperText="Leave blank to keep current value"
        />
      );
    }
    
    // Default to text field
    return (
      <TextField
        key={settingKey}
        fullWidth
        label={getSettingLabel(key)}
        value={value || ''}
        onChange={(e) => handleSettingChange(category, key, e.target.value)}
        margin="normal"
        variant="outlined"
        multiline={value && value.length > 50}
        rows={value && value.length > 50 ? 3 : 1}
      />
    );
  };

  const renderNestedSettingField = (category, parentKey, subKey, subValue) => {
    const fullKey = `${parentKey}.${subKey}`;
    
    if (typeof subValue === 'boolean') {
      return (
        <FormControlLabel
          control={
            <Switch
              checked={subValue}
              onChange={(e) => handleNestedSettingChange(category, parentKey, subKey, e.target.checked)}
              color="primary"
              size="small"
            />
          }
          label={getSettingLabel(subKey)}
        />
      );
    }
    
    if (typeof subValue === 'number') {
      return (
        <TextField
          fullWidth
          label={getSettingLabel(subKey)}
          type="number"
          value={subValue}
          onChange={(e) => handleNestedSettingChange(category, parentKey, subKey, parseFloat(e.target.value) || 0)}
          size="small"
          variant="outlined"
          InputProps={getInputProps(subKey)}
        />
      );
    }
    
    return (
      <TextField
        fullWidth
        label={getSettingLabel(subKey)}
        value={subValue || ''}
        onChange={(e) => handleNestedSettingChange(category, parentKey, subKey, e.target.value)}
        size="small"
        variant="outlined"
      />
    );
  };

  const getSettingLabel = (key) => {
    // Convert camelCase to readable label
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2');
  };

  const getInputProps = (key) => {
    if (key.includes('fee') || key.includes('Fee') || key.includes('rate') || key.includes('Rate')) {
      return {
        startAdornment: <InputAdornment position="start">%</InputAdornment>
      };
    }
    if (key.includes('amount') || key.includes('Amount') || key.includes('price') || key.includes('Price')) {
      return {
        startAdornment: <InputAdornment position="start">$</InputAdornment>
      };
    }
    if (key.includes('duration') || key.includes('Duration') || key.includes('time') || key.includes('Time')) {
      return {
        endAdornment: <InputAdornment position="end">min</InputAdornment>
      };
    }
    return {};
  };

  if (loading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            System Settings
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchSettings}
              disabled={saving}
            >
              Refresh
            </Button>
            {hasChanges && (
              <Button
                variant="outlined"
                onClick={handleResetSettings}
                disabled={saving}
              >
                Reset Changes
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveSettings}
              disabled={!hasChanges || saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>

        {hasChanges && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You have unsaved changes. Don't forget to save your settings.
          </Alert>
        )}

        <Grid container spacing={3}>
          {Object.entries(settings).map(([category, categorySettings]) => (
            <Grid item xs={12} key={category}>
              <Accordion defaultExpanded={category === 'system'}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`${category}-content`}
                  id={`${category}-header`}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    {getCategoryIcon(category)}
                    <Typography variant="h6">
                      {getCategoryTitle(category)}
                    </Typography>
                    <Chip 
                      label={`${Object.keys(categorySettings).length} settings`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {Object.entries(categorySettings).map(([key, value]) => {
                      // For object settings, use full width
                      const isObjectSetting = typeof value === 'object' && value !== null && !Array.isArray(value);
                      return (
                        <Grid item xs={12} md={isObjectSetting ? 12 : 6} key={key}>
                          {renderSettingField(category, key, value)}
                        </Grid>
                      );
                    })}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
        </Grid>

        {Object.keys(settings).length === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" color="textSecondary" align="center">
                No settings found
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
                System settings will be initialized automatically when the application starts.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </AdminLayout>
  );
};

export default AdminSystemSettingsPage;
