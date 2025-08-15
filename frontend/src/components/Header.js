import React from 'react';
import { Box, Typography, Avatar, Card, CardContent } from '@mui/material';
import { motion } from 'framer-motion';
import { Stars, AccountBalanceWallet } from '@mui/icons-material';

const Header = ({ user }) => {
  const getInitials = (user) => {
    if (!user) return '👤';
    return user.first_name ? user.first_name.charAt(0).toUpperCase() : '👤';
  };

  const getUserName = (user) => {
    if (!user) return 'Loading...';
    return user.first_name || 'User';
  };

  const getUserHandle = (user) => {
    if (!user) return '@loading';
    return user.username ? `@${user.username}` : `@user${user.id}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card 
        sx={{ 
          mb: 3, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />

        <CardContent sx={{ position: 'relative', zIndex: 1 }}>
          {/* User Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  mr: 2,
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#333',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}
              >
                {getInitials(user)}
              </Avatar>
            </motion.div>
            
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {getUserName(user)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {getUserHandle(user)}
              </Typography>
            </Box>
          </Box>

          {/* App Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Stars sx={{ mr: 1, color: '#FFD700' }} />
            </motion.div>
            
            <Typography variant="h4" sx={{ fontWeight: 600, textAlign: 'center' }}>
              Aura Wallet
            </Typography>
            
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: 1 }}
            >
              <AccountBalanceWallet sx={{ ml: 1, color: '#FFD700' }} />
            </motion.div>
          </Box>
          
          <Typography 
            variant="body2" 
            sx={{ 
              textAlign: 'center', 
              opacity: 0.9, 
              mt: 1 
            }}
          >
            Manage your crypto assets & complete quests
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Header;
