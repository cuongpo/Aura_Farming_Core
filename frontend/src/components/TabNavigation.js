import React from 'react';
import { Box, Button, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { 
  AccountBalanceWallet, 
  Send, 
  EmojiEvents 
} from '@mui/icons-material';

const TabNavigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: 'wallet',
      label: 'Wallet',
      icon: <AccountBalanceWallet />,
      color: '#007AFF'
    },
    {
      id: 'transfer',
      label: 'Transfer',
      icon: <Send />,
      color: '#34C759'
    },
    {
      id: 'quest',
      label: 'Quest',
      icon: <EmojiEvents />,
      color: '#FF6B6B'
    }
  ];

  return (
    <Paper
      elevation={3}
      sx={{
        p: 1,
        borderRadius: 3,
        background: (theme) => theme.palette.mode === 'dark'
          ? 'rgba(30,30,30,0.95)'
          : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
        border: (theme) => theme.palette.mode === 'dark' ? '1px solid' : 'none',
        borderColor: 'grey.700'
      }}
    >
      <Box sx={{ display: 'flex', gap: 1 }}>
        {tabs.map((tab) => (
          <motion.div
            key={tab.id}
            style={{ flex: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              fullWidth
              variant={activeTab === tab.id ? 'contained' : 'text'}
              onClick={() => onTabChange(tab.id)}
              startIcon={tab.icon}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '0.9rem',
                background: activeTab === tab.id 
                  ? `linear-gradient(135deg, ${tab.color}, ${tab.color}dd)` 
                  : 'transparent',
                color: activeTab === tab.id ? 'white' : 'text.primary',
                '&:hover': {
                  background: activeTab === tab.id
                    ? `linear-gradient(135deg, ${tab.color}, ${tab.color}dd)`
                    : (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.04)',
                },
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Active tab indicator */}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(135deg, ${tab.color}, ${tab.color}dd)`,
                    borderRadius: 8,
                    zIndex: -1
                  }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              {tab.label}
            </Button>
          </motion.div>
        ))}
      </Box>
    </Paper>
  );
};

export default TabNavigation;
