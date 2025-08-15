import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import Header from './components/Header';
import TabNavigation from './components/TabNavigation';
import WalletTab from './components/WalletTab';
import TransferTab from './components/TransferTab';
import QuestTab from './components/QuestTab';
import LoadingScreen from './components/LoadingScreen';

// Telegram Web App
const tg = window.Telegram?.WebApp;

// Theme configuration
const createAppTheme = (isDark) => createTheme({
  palette: {
    mode: isDark ? 'dark' : 'light',
    primary: {
      main: '#007AFF',
      light: '#4DA3FF',
      dark: '#0056CC',
    },
    secondary: {
      main: '#FFD700',
      light: '#FFE55C',
      dark: '#B8860B',
    },
    background: {
      default: isDark ? '#121212' : '#f5f5f5',
      paper: isDark ? '#1e1e1e' : '#ffffff',
    },
    text: {
      primary: isDark ? '#ffffff' : '#000000',
      secondary: isDark ? '#b3b3b3' : '#666666',
    },
    quest: {
      main: '#FF6B6B',
      light: '#FF8E8E',
      dark: '#E55555',
    },
    aura: {
      main: '#FFD700',
      light: '#FFE55C',
      dark: '#B8860B',
    }
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    }
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
        }
      }
    }
  }
});

function App() {
  const [activeTab, setActiveTab] = useState('wallet');
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize Telegram Web App
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      
      // Get user data
      const userData = tg.initDataUnsafe?.user;
      setUser(userData);
      
      // Set theme based on Telegram theme
      const isDark = tg.colorScheme === 'dark';
      setIsDarkMode(isDark);
      
      // Configure Telegram Web App
      tg.BackButton.show();
      tg.onEvent('backButtonClicked', () => {
        tg.close();
      });
    }
    
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  }, []);

  const theme = createAppTheme(isDarkMode);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoadingScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ py: 2, minHeight: '100vh' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Header user={user} />
          
          <Box sx={{ mb: 3 }}>
            <TabNavigation 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
            />
          </Box>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'wallet' && <WalletTab user={user} />}
              {activeTab === 'transfer' && <TransferTab user={user} />}
              {activeTab === 'quest' && <QuestTab user={user} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </Container>
    </ThemeProvider>
  );
}

export default App;
