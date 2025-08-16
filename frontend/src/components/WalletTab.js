import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Divider,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  Skeleton
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  ContentCopy,
  Refresh,
  AccountBalanceWallet,
  TrendingUp
} from '@mui/icons-material';
import axios from 'axios';

const WalletTab = ({ user }) => {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadWalletData();
  }, [user]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const userId = user?.id || '1354543512';
      const response = await axios.get(`/api/wallet/${userId}`);
      setWalletData(response.data);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      showSnackbar('Failed to load wallet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async () => {
    if (walletData?.address) {
      try {
        await navigator.clipboard.writeText(walletData.address);
        showSnackbar('Address copied to clipboard!', 'success');
      } catch (error) {
        showSnackbar('Failed to copy address', 'error');
      }
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const formatAddress = (address) => {
    if (!address) return 'Loading...';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance) => {
    return parseFloat(balance || 0).toFixed(4);
  };

  const balanceCards = [
    {
      symbol: 'tCORE',
      name: 'Core Token',
      balance: walletData?.balances?.eth || '0',
      icon: '⚡',
      color: '#FF6B35',
      gradient: 'linear-gradient(135deg, #FF6B35, #F7931E)'
    },
    {
      symbol: 'mUSDT',
      name: 'Mock USDT',
      balance: walletData?.balances?.usdt || '0',
      icon: '₮',
      color: '#26A17B',
      gradient: 'linear-gradient(135deg, #26A17B, #1E8E6B)'
    },
    {
      symbol: 'AURA',
      name: 'Aura Token',
      balance: walletData?.balances?.aura || '0',
      icon: '🪙',
      color: '#FFD700',
      gradient: 'linear-gradient(135deg, #FFD700, #FFA500)'
    }
  ];

  return (
    <Box>
      {/* Wallet Address Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          sx={{
            mb: 3,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
            border: (theme) => theme.palette.mode === 'dark' ? '1px solid' : 'none',
            borderColor: 'grey.700'
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AccountBalanceWallet sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Wallet Address
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton onClick={loadWalletData} disabled={loading}>
                <Refresh />
              </IconButton>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50',
                borderRadius: 2,
                border: '1px solid',
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'grey.600' : 'grey.200'
              }}
            >
              {loading ? (
                <Skeleton variant="text" width="100%" height={24} />
              ) : (
                <>
                  <Typography
                    variant="body1"
                    sx={{
                      fontFamily: 'monospace',
                      flexGrow: 1,
                      fontSize: '0.85rem',
                      wordBreak: 'break-all',
                      lineHeight: 1.2,
                      color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'grey.900'
                    }}
                  >
                    {walletData?.address || 'Loading...'}
                  </Typography>
                  <IconButton
                    onClick={copyAddress}
                    size="small"
                    sx={{
                      ml: 1,
                      flexShrink: 0,
                      color: (theme) => theme.palette.mode === 'dark' ? 'grey.300' : 'grey.600'
                    }}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Your smart contract wallet address
            </Typography>
          </CardContent>
        </Card>
      </motion.div>

      {/* Balance Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {balanceCards.map((token, index) => (
          <motion.div
            key={token.symbol}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card 
              sx={{ 
                background: token.gradient,
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Background decoration */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                }}
              />

              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {token.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {token.name}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {token.symbol}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ textAlign: 'right' }}>
                    {loading ? (
                      <Skeleton variant="text" width={80} height={32} />
                    ) : (
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {formatBalance(token.balance)}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {token.symbol}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Box>

      {/* Portfolio Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card
          sx={{
            mt: 3,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
            border: (theme) => theme.palette.mode === 'dark' ? '1px solid' : 'none',
            borderColor: 'grey.700'
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Portfolio Summary
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Total Assets
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                3 Tokens
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Wallet Status
              </Typography>
              <Chip 
                label="Active" 
                color="success" 
                size="small" 
                sx={{ fontWeight: 600 }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" color="text.secondary">
              💡 Your wallet is secured by account abstraction technology
            </Typography>
          </CardContent>
        </Card>
      </motion.div>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WalletTab;
