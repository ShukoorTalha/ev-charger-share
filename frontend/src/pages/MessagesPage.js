import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { messageAPI } from '../services/api';
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  Button,
  IconButton,
  Badge,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Send,
  Search,
  MoreVert,
  Report,
  Block,
  ArrowBack,
  Message,
  Circle
} from '@mui/icons-material';
import LoadingSpinner from '../components/LoadingSpinner';

const MessagesPage = () => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Conversations and messages
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Message input
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);
  
  // Menu for message actions
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    fetchConversations();
    fetchUnreadCount();
    
    // Set up polling for new messages
    const interval = setInterval(() => {
      if (selectedConversation) {
        const bookingId = selectedConversation.bookingId || selectedConversation._id || selectedConversation.id;
        if (bookingId) {
          fetchMessages(bookingId);
        }
      }
      fetchUnreadCount();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [selectedConversation]);

  useEffect(() => {
    // Filter conversations based on search query
    if (searchQuery.trim()) {
      const filtered = conversations.filter(conv => {
        const otherUser = getOtherUser(conv);
        const fullName = `${otherUser?.profile?.firstName || ''} ${otherUser?.profile?.lastName || ''}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase()) ||
               conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await messageAPI.getUserConversations();
      
      if (response.data.success) {
        setConversations(response.data.data);
        setFilteredConversations(response.data.data);
      }
    } catch (err) {
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await messageAPI.getBookingMessages(conversationId);
      
      if (response.data.success) {
        const messagesData = response.data.data.messages || [];
        setMessages(messagesData);
        
        // Mark messages as read (backend already marks them, but we can filter for UI)
        const unreadMessages = messagesData.filter(
          msg => !msg.readAt && msg.sender._id !== user._id
        );
        
        // Note: Backend already marks messages as read, so we don't need to call markAsRead again
        fetchUnreadCount();
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages');
      setMessages([]); // Ensure messages is always an array
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await messageAPI.getUnreadCount();
      if (response.data.success) {
        setUnreadCount(response.data.data.count);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const handleConversationSelect = (conversation) => {
    const bookingId = conversation.bookingId || conversation._id || conversation.id;
    setSelectedConversation(conversation);
    fetchMessages(bookingId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSendingMessage(true);
    
    try {
      const bookingId = selectedConversation.bookingId || selectedConversation._id || selectedConversation.id;
      const response = await messageAPI.sendMessage({
        bookingId: bookingId,
        content: newMessage.trim()
      });
      
      if (response.data.success) {
        setMessages(prev => [...prev, response.data.data]);
        setNewMessage('');
        
        // Update conversation's latest message
        const selectedBookingId = selectedConversation.bookingId || selectedConversation._id || selectedConversation.id;
        setConversations(prev =>
          prev.map(conv => {
            const convBookingId = conv.bookingId || conv._id || conv.id;
            return convBookingId === selectedBookingId
              ? { ...conv, latestMessage: response.data.data }
              : conv;
          })
        );
      }
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleMenuOpen = (event, message) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessage(null);
  };

  const handleReportMessage = async () => {
    try {
      await messageAPI.reportMessage(selectedMessage._id, {
        reason: 'inappropriate_content'
      });
      setError(''); // Clear any existing errors
      // You might want to show a success message here
    } catch (err) {
      setError('Failed to report message');
    } finally {
      handleMenuClose();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherUser = (conversation) => {
    // Backend returns otherParty directly
    return conversation.otherParty;
  };

  const formatTime = (dateString) => {
    if (!dateString) {
      return 'No messages';
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) {
      return '';
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return <LoadingSpinner message="Loading messages..." />;
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Button
              component={Link}
              to="/dashboard"
              startIcon={<ArrowBack />}
              sx={{ mr: 2 }}
            >
              Back
            </Button>
            <Typography variant="h5" component="h1">
              Messages
            </Typography>
            {unreadCount > 0 && (
              <Badge badgeContent={unreadCount} color="primary" sx={{ ml: 2 }}>
                <Message />
              </Badge>
            )}
          </Box>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Conversations List */}
        <Paper sx={{ width: 350, display: 'flex', flexDirection: 'column' }}>
          {/* Search */}
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Conversations */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  {searchQuery ? 'No conversations found' : 'No messages yet'}
                </Typography>
                {!searchQuery && (
                  <Button
                    component={Link}
                    to="/chargers"
                    variant="outlined"
                    sx={{ mt: 2 }}
                  >
                    Book a Charger
                  </Button>
                )}
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {filteredConversations.map((conversation) => {
                  const otherUser = getOtherUser(conversation);
                  const selectedBookingId = selectedConversation?.bookingId || selectedConversation?._id || selectedConversation?.id;
                  const conversationBookingId = conversation.bookingId || conversation._id || conversation.id;
                  const isSelected = selectedBookingId === conversationBookingId;
                  const hasUnread = conversation.unreadCount > 0;
                  
                  return (
                    <ListItem
                      key={conversationBookingId}
                      button
                      selected={isSelected}
                      onClick={() => handleConversationSelect(conversation)}
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&.Mui-selected': {
                          backgroundColor: 'primary.light',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                          },
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            hasUnread ? (
                              <Circle sx={{ color: 'primary.main', fontSize: 12 }} />
                            ) : null
                          }
                        >
                          <Avatar src={otherUser?.profile?.avatarUrl || otherUser?.profile?.avatar}>
                            {otherUser?.profile?.firstName?.[0]}{otherUser?.profile?.lastName?.[0]}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: hasUnread ? 'bold' : 'normal' }}
                            >
                              {otherUser?.profile?.firstName} {otherUser?.profile?.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTime(conversation.latestMessage?.createdAt)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            {conversation.charger && (
                              <Chip
                                label={conversation.charger?.title}
                                size="small"
                                variant="outlined"
                                sx={{ mb: 0.5, fontSize: '0.7rem', height: 20 }}
                              />
                            )}
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontWeight: hasUnread ? 'bold' : 'normal',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {conversation.latestMessage?.content || 'No messages yet'}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        </Paper>

        {/* Messages Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Messages Header */}
              <Paper sx={{ p: 2, borderRadius: 0 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center">
                    <Avatar
                      src={getOtherUser(selectedConversation)?.profile?.avatarUrl || getOtherUser(selectedConversation)?.profile?.avatar}
                      sx={{ mr: 2 }}
                    >
                      {getOtherUser(selectedConversation)?.profile?.firstName?.[0]}
                      {getOtherUser(selectedConversation)?.profile?.lastName?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {getOtherUser(selectedConversation)?.profile?.firstName}{' '}
                        {getOtherUser(selectedConversation)?.profile?.lastName}
                      </Typography>
                      {selectedConversation.booking && (
                        <Typography variant="body2" color="text.secondary">
                          Booking: {selectedConversation.booking.charger?.title}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  
                  {selectedConversation.booking && (
                    <Button
                      component={Link}
                      to={`/bookings/${selectedConversation.booking._id}`}
                      variant="outlined"
                      size="small"
                    >
                      View Booking
                    </Button>
                  )}
                </Box>
              </Paper>

              {/* Messages */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {!Array.isArray(messages) || messages.length === 0 ? (
                  <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No messages yet. Start the conversation!
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {Array.isArray(messages) && messages.map((message, index) => {
                      const isOwn = message.sender._id === user._id;
                      const showDate = index === 0 || 
                        new Date(message.createdAt).toDateString() !== 
                        new Date(messages[index - 1].createdAt).toDateString();
                      
                      return (
                        <Box key={message._id}>
                          {showDate && (
                            <Box sx={{ textAlign: 'center', my: 2 }}>
                              <Chip
                                label={new Date(message.createdAt).toLocaleDateString()}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          )}
                          
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: isOwn ? 'flex-end' : 'flex-start',
                              mb: 1,
                            }}
                          >
                            <Box
                              sx={{
                                maxWidth: '70%',
                                position: 'relative',
                              }}
                            >
                              <Paper
                                sx={{
                                  p: 1.5,
                                  backgroundColor: isOwn ? 'primary.main' : 'grey.100',
                                  color: isOwn ? 'primary.contrastText' : 'text.primary',
                                }}
                              >
                                <Typography variant="body1">
                                  {message.content}
                                </Typography>
                                
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mt: 0.5,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: isOwn ? 'primary.contrastText' : 'text.secondary',
                                      opacity: 0.7,
                                    }}
                                  >
                                    {formatMessageTime(message.createdAt)}
                                  </Typography>
                                  
                                  {!isOwn && (
                                    <IconButton
                                      size="small"
                                      onClick={(e) => handleMenuOpen(e, message)}
                                      sx={{ ml: 1, p: 0.5 }}
                                    >
                                      <MoreVert fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              </Paper>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </Box>
                )}
              </Box>

              {/* Message Input */}
              <Paper sx={{ p: 2, borderRadius: 0 }}>
                <Box display="flex" alignItems="flex-end" gap={1}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sendingMessage}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    sx={{ minWidth: 'auto', p: 1.5 }}
                  >
                    {sendingMessage ? (
                      <CircularProgress size={20} />
                    ) : (
                      <Send />
                    )}
                  </Button>
                </Box>
              </Paper>
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <Message sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Select a conversation to start messaging
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Message Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleReportMessage}>
          <Report sx={{ mr: 1 }} />
          Report Message
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default MessagesPage;
