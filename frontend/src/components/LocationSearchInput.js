import React, { useState, useEffect } from 'react';
import { Box, TextField, List, ListItem, ListItemIcon, ListItemText, Paper, CircularProgress } from '@mui/material';
import { LocationOn } from '@mui/icons-material';
import { searchLocations } from '../services/geocodingService';

const LocationSearchInput = ({ value, onChange, onSelect }) => {
  const [searchText, setSearchText] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Update internal state when external value changes
  useEffect(() => {
    if (value !== searchText) {
      setSearchText(value || '');
    }
  }, [value]);

  // Handle search text change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchText(newValue);
    onChange(newValue);
    
    if (newValue.length > 2) {
      fetchSuggestions(newValue);
    } else {
      setSuggestions([]);
    }
  };

  // Fetch location suggestions
  const fetchSuggestions = async (query) => {
    setLoading(true);
    try {
      const results = await searchLocations(query);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    setSearchText(suggestion.displayName);
    onChange(suggestion.displayName);
    onSelect && onSelect({
      displayName: suggestion.displayName,
      lat: suggestion.lat,
      lon: suggestion.lon
    });
    setShowSuggestions(false);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        fullWidth
        label="Location"
        value={searchText}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => {
          // Delay hiding suggestions to allow clicking on them
          setTimeout(() => setShowSuggestions(false), 200);
        }}
        placeholder="Enter city, address, or zip code"
        variant="outlined"
        InputProps={{
          startAdornment: (
            <LocationOn color="action" sx={{ mr: 1 }} />
          ),
          endAdornment: loading && <CircularProgress size={20} />,
        }}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <Paper 
          elevation={3} 
          sx={{ 
            position: 'absolute', 
            width: '100%', 
            maxHeight: 300, 
            overflowY: 'auto',
            zIndex: 1000,
            mt: 0.5
          }}
        >
          <List dense>
            {suggestions.map((suggestion, index) => (
              <ListItem 
                button 
                key={index} 
                onClick={() => handleSuggestionClick(suggestion)}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)' 
                  } 
                }}
              >
                <ListItemIcon>
                  <LocationOn fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary={suggestion.displayName.split(',')[0]} 
                  secondary={suggestion.displayName.substring(suggestion.displayName.indexOf(',') + 1)} 
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default LocationSearchInput;
