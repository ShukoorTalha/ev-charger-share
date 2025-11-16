import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { chargerAPI } from '../services/api';
import { geocodeAddress } from '../services/geocodingService';
import ChargerMap from '../components/ChargerMap';
import LocationSearchInput from '../components/LocationSearchInput';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Divider,
  Chip,
  Rating,
  CircularProgress,
  Alert,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Search,
  FilterList,
  LocationOn,
  EvStation,
  AttachMoney,
  Power,
  Close,
  Sort
} from '@mui/icons-material';

const ChargerSearchPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  
  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  
  // State for chargers and loading
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalChargers, setTotalChargers] = useState(0);
  
  // State for filters
  const [searchLocation, setSearchLocation] = useState(queryParams.get('location') || '');
  const [chargerType, setChargerType] = useState(queryParams.get('type') || '');
  const [connectorType, setConnectorType] = useState(queryParams.get('connector') || '');
  const [minPower, setMinPower] = useState(queryParams.get('minPower') ? Number(queryParams.get('minPower')) : 0);
  const [maxPrice, setMaxPrice] = useState(queryParams.get('maxPrice') ? Number(queryParams.get('maxPrice')) : 50);
  const [availableNow, setAvailableNow] = useState(queryParams.get('availableNow') === 'true');
  const [sortBy, setSortBy] = useState(queryParams.get('sortBy') || 'distance');
  
  // Map state
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]); // Default to San Francisco
  const [mapZoom, setMapZoom] = useState(12);
  const [viewMode, setViewMode] = useState(queryParams.get('view') || 'list'); // 'list' or 'map'
  
  // Mobile filter drawer state
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
  // Fetch chargers based on filters
  useEffect(() => {
    const fetchChargers = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (searchLocation) params.append('location', searchLocation);
        if (chargerType) params.append('type', chargerType);
        if (connectorType) params.append('connector', connectorType);
        if (minPower > 0) params.append('minPower', minPower);
        if (maxPrice < 50) params.append('maxPrice', maxPrice);
        if (availableNow) params.append('availableNow', true);
        params.append('sortBy', sortBy);
        params.append('view', viewMode);
        
        // Update URL with filters
        navigate(`/chargers?${params.toString()}`, { replace: true });
        
        // Make API request
        const response = await chargerAPI.search(Object.fromEntries(params));
        
        if (response.data.success) {
          setChargers(response.data.data.chargers);
          setTotalChargers(response.data.data.pagination.total);
          
          // If we have chargers with location data, update map center
          if (response.data.data.chargers.length > 0 && response.data.data.chargers[0].location) {
            const firstCharger = response.data.data.chargers[0];
            setMapCenter([firstCharger.location.coordinates[1], firstCharger.location.coordinates[0]]);
          } else if (searchLocation) {
            // If no chargers but we have a search location, try to geocode it
            try {
              const geoResult = await geocodeAddress(searchLocation);
              if (geoResult) {
                setMapCenter([geoResult.lat, geoResult.lon]);
              }
            } catch (geoError) {
              console.error('Error geocoding search location:', geoError);
            }
          }
        } else {
          setError('Failed to load chargers');
        }
      } catch (err) {
        setError('Error loading chargers. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchChargers();
  }, [searchLocation, chargerType, connectorType, minPower, maxPrice, availableNow, sortBy, viewMode, navigate]);
  
  const handleFilterReset = () => {
    setSearchLocation('');
    setChargerType('');
    setConnectorType('');
    setMinPower(0);
    setMaxPrice(50);
    setAvailableNow(false);
    setSortBy('distance');
    
    // Close filter drawer on mobile
    if (isMobile) {
      setFilterDrawerOpen(false);
    }
  };
  
  const renderFilters = () => (
    <Box sx={{ p: isMobile ? 2 : 0 }}>
      {isMobile && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Filters</Typography>
          <IconButton onClick={() => setFilterDrawerOpen(false)}>
            <Close />
          </IconButton>
        </Box>
      )}
      
      <Typography variant="h6" gutterBottom={!isMobile}>
        Search Filters
      </Typography>
      
      <LocationSearchInput
        value={searchLocation}
        onChange={(value) => setSearchLocation(value)}
        onSelect={(location) => {
          setSearchLocation(location.displayName);
          setMapCenter([location.lat, location.lon]);
          setMapZoom(13);
        }}
      />
      
      <FormControl fullWidth margin="normal">
        <InputLabel id="charger-type-label">Charger Type</InputLabel>
        <Select
          labelId="charger-type-label"
          value={chargerType}
          onChange={(e) => setChargerType(e.target.value)}
          label="Charger Type"
        >
          <MenuItem value="">Any Type</MenuItem>
          <MenuItem value="Level 1">Level 1 (120V)</MenuItem>
          <MenuItem value="Level 2">Level 2 (240V)</MenuItem>
          <MenuItem value="DC Fast Charging">DC Fast Charging</MenuItem>
          <MenuItem value="Tesla Supercharger">Tesla Supercharger</MenuItem>
        </Select>
      </FormControl>
      
      <FormControl fullWidth margin="normal">
        <InputLabel id="connector-type-label">Connector Type</InputLabel>
        <Select
          labelId="connector-type-label"
          value={connectorType}
          onChange={(e) => setConnectorType(e.target.value)}
          label="Connector Type"
        >
          <MenuItem value="">Any Connector</MenuItem>
          <MenuItem value="J1772">J1772 (Type 1)</MenuItem>
          <MenuItem value="CCS1">CCS1 (Combo 1)</MenuItem>
          <MenuItem value="CCS2">CCS2 (Combo 2)</MenuItem>
          <MenuItem value="CHAdeMO">CHAdeMO</MenuItem>
          <MenuItem value="Tesla">Tesla</MenuItem>
          <MenuItem value="Type 2">Type 2 (Mennekes)</MenuItem>
        </Select>
      </FormControl>
      
      <Box sx={{ mt: 3 }}>
        <Typography id="power-slider" gutterBottom>
          Minimum Power: {minPower} kW
        </Typography>
        <Slider
          value={minPower}
          onChange={(e, newValue) => setMinPower(newValue)}
          aria-labelledby="power-slider"
          valueLabelDisplay="auto"
          step={5}
          marks
          min={0}
          max={150}
        />
      </Box>
      
      <Box sx={{ mt: 3 }}>
        <Typography id="price-slider" gutterBottom>
          Maximum Price: ${maxPrice}/hour
        </Typography>
        <Slider
          value={maxPrice}
          onChange={(e, newValue) => setMaxPrice(newValue)}
          aria-labelledby="price-slider"
          valueLabelDisplay="auto"
          step={5}
          marks
          min={0}
          max={50}
        />
      </Box>
      
      <FormControlLabel
        control={
          <Checkbox 
            checked={availableNow}
            onChange={(e) => setAvailableNow(e.target.checked)}
          />
        }
        label="Available Now"
        sx={{ mt: 2 }}
      />
      
      <FormControl fullWidth margin="normal">
        <InputLabel id="sort-by-label">Sort By</InputLabel>
        <Select
          labelId="sort-by-label"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          label="Sort By"
        >
          <MenuItem value="distance">Distance</MenuItem>
          <MenuItem value="price_low">Price: Low to High</MenuItem>
          <MenuItem value="price_high">Price: High to Low</MenuItem>
          <MenuItem value="rating">Rating</MenuItem>
          <MenuItem value="power">Power Output</MenuItem>
        </Select>
      </FormControl>
      
      <Button 
        variant="outlined" 
        color="secondary" 
        fullWidth 
        onClick={handleFilterReset}
        sx={{ mt: 2 }}
      >
        Reset Filters
      </Button>
      
      {isMobile && (
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth 
          onClick={() => setFilterDrawerOpen(false)}
          sx={{ mt: 2 }}
        >
          Apply Filters
        </Button>
      )}
    </Box>
  );
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        <EvStation sx={{ mr: 1, verticalAlign: 'middle' }} />
        Find Chargers
      </Typography>
      
      {/* View toggle buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Button
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('list')}
            sx={{ mr: 1 }}
          >
            List View
          </Button>
          <Button
            variant={viewMode === 'map' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('map')}
          >
            Map View
          </Button>
        </Box>
        
        {/* Mobile filter button */}
        {isMobile && (
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setFilterDrawerOpen(true)}
          >
            Filters
          </Button>
        )}
      </Box>
      
      {/* Mobile search bar and filter button */}
      {isMobile && (
        <Box sx={{ mb: 2 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <TextField
              label="Search Location"
              variant="outlined"
              fullWidth
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant="outlined" 
                startIcon={<FilterList />}
                onClick={() => setFilterDrawerOpen(true)}
              >
                Filters
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<Sort />}
                onClick={() => {
                  // Simple sort toggle for mobile
                  setSortBy(sortBy === 'distance' ? 'price_low' : 'distance');
                }}
              >
                Sort: {sortBy === 'distance' ? 'Distance' : 
                       sortBy === 'price_low' ? 'Price: Low to High' : 
                       sortBy === 'price_high' ? 'Price: High to Low' : 
                       sortBy === 'rating' ? 'Rating' : 'Power'}
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
      
      <Grid container spacing={3}>
        {/* Filters sidebar for desktop */}
        {!isMobile && (
          <Grid item xs={12} md={3}>
            <Paper elevation={2} sx={{ p: 2 }}>
              {renderFilters()}
            </Paper>
          </Grid>
        )}
        
        {/* Charger listings */}
        <Grid item xs={12} md={isMobile ? 12 : 9}>
          {/* Results summary */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {loading ? 'Searching...' : `${totalChargers} chargers found`}
            </Typography>
            
            {!isMobile && (
              <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="desktop-sort-label">Sort By</InputLabel>
                <Select
                  labelId="desktop-sort-label"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="distance">Distance</MenuItem>
                  <MenuItem value="price_low">Price: Low to High</MenuItem>
                  <MenuItem value="price_high">Price: High to Low</MenuItem>
                  <MenuItem value="rating">Rating</MenuItem>
                  <MenuItem value="power">Power Output</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
          
          {/* Error message */}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {/* Loading indicator */}
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : chargers.length === 0 ? (
            <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No chargers found
              </Typography>
              <Typography variant="body1" paragraph>
                Try adjusting your search filters to find more results.
              </Typography>
              <Button variant="contained" color="primary" onClick={handleFilterReset}>
                Reset Filters
              </Button>
            </Paper>
          ) : viewMode === 'map' ? (
            <Box sx={{ height: 'calc(100vh - 250px)', minHeight: 500, mb: 3 }}>
              <ChargerMap 
                chargers={chargers} 
                center={mapCenter} 
                zoom={mapZoom} 
                height="100%"
              />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {chargers.map((charger) => (
                <Grid item xs={12} sm={6} md={6} lg={4} key={charger._id}>
                  <Card elevation={3}>
                    <CardMedia
                      component="img"
                      height="140"
                      image={charger.images && charger.images.length > 0 
                        ? charger.images[0] 
                        : 'https://via.placeholder.com/300x140?text=EV+Charger'}
                      alt={charger.title}
                    />
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="h6" component="div" gutterBottom>
                          {charger.title}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={charger.status === 'approved' ? "Available" : "Unavailable"}
                          color={charger.status === 'approved' ? "success" : "default"}
                        />
                      </Box>
                      
                      <Box display="flex" alignItems="center" mb={1}>
                        <LocationOn fontSize="small" color="action" sx={{ mr: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">
                          {charger.location?.address}
                          {charger.distance && (
                            <span> • {charger.distance.toFixed(1)} miles</span>
                          )}
                        </Typography>
                      </Box>
                      
                      <Box display="flex" alignItems="center" mb={1}>
                        <Rating 
                          value={charger.ratings?.average || 0} 
                          precision={0.5} 
                          readOnly 
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          ({charger.ratings?.count || 0})
                        </Typography>
                      </Box>
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Type: {charger.specifications?.type}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Power: {charger.specifications?.power} kW
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" mt={1}>
                            <AttachMoney fontSize="small" color="primary" />
                            <Typography variant="body1" fontWeight="bold">
                              ${charger.pricing?.hourlyRate?.toFixed(2) || '0.00'}/hour
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        color="primary"
                        component={Link}
                        to={`/chargers/${charger._id}`}
                      >
                        View Details
                      </Button>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="primary"
                        component={Link}
                        to={`/chargers/${charger._id}`}
                        sx={{ ml: 'auto' }}
                      >
                        Book Now
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>
      </Grid>
      
      {/* Mobile filter drawer */}
      <Drawer
        anchor="right"
        open={isMobile && filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        PaperProps={{
          sx: { width: '80%', maxWidth: '350px' }
        }}
      >
        {renderFilters()}
      </Drawer>
    </Box>
  );
};

export default ChargerSearchPage;
