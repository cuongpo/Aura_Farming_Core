import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Send,
  AccountBalanceWallet,
  SwapHoriz,
  Security
} from '@mui/icons-material';
import axios from 'axios';

const TransferTab = ({ user }) => {
  const [formData, setFormData] = useState({
    token: 'CORE',
    toAddress: '',
    amount: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const tokens = [
    { value: 'CORE', label: 'Core Token (tCORE)', icon: '⚡', color: '#FF6B35' },
    { value: 'USDT', label: 'Mock USDT (mUSDT)', icon: '₮', color: '#26A17B' },
    { value: 'AURA', label: 'Aura Token (AURA)', icon: '🪙', color: '#FFD700' }
  ];

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  const handleTransfer = async () => {
    try {
      setLoading(true);
      
      // Validate form
      if (!formData.toAddress || !formData.amount) {
        showSnackbar('Please fill in all required fields', 'error');
        return;
      }

      if (parseFloat(formData.amount) <= 0) {
        showSnackbar('Amount must be greater than 0', 'error');
        return;
      }

      const userId = user?.id || '1354543512';
      const response = await axios.post('/api/transfer', {
        userId,
        token: formData.token,
        to: formData.toAddress,
        amount: formData.amount,
        message: formData.message
      });

      if (response.data.success) {
        showSnackbar('Transfer completed successfully!', 'success');
        // Reset form
        setFormData({
          token: 'CORE',
          toAddress: '',
          amount: '',
          message: ''
        });
      }
    } catch (error) {
      console.error('Transfer error:', error);
      const errorMessage = error.response?.data?.error || 'Transfer failed';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getSelectedToken = () => {
    return tokens.find(token => token.value === formData.token);
  };

  return (
    <Box>
      {/* Transfer Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Send sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Send Crypto
              </Typography>
            </Box>

            {/* Token Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Token</InputLabel>
              <Select
                value={formData.token}
                label="Select Token"
                onChange={handleInputChange('token')}
              >
                {tokens.map((token) => (
                  <MenuItem key={token.value} value={token.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: token.color,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {token.icon}
                      </Box>
                      {token.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* To Address */}
            <TextField
              fullWidth
              label="To Address"
              placeholder="0x..."
              value={formData.toAddress}
              onChange={handleInputChange('toAddress')}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <AccountBalanceWallet sx={{ mr: 1, color: 'text.secondary' }} />
                )
              }}
            />

            {/* Amount */}
            <TextField
              fullWidth
              label="Amount"
              type="number"
              placeholder="0.0"
              value={formData.amount}
              onChange={handleInputChange('amount')}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <SwapHoriz sx={{ mr: 1, color: 'text.secondary' }} />
                ),
                endAdornment: (
                  <Chip 
                    label={getSelectedToken()?.value} 
                    size="small" 
                    sx={{ 
                      background: getSelectedToken()?.color,
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                )
              }}
            />

            {/* Message (Optional) */}
            <TextField
              fullWidth
              label="Message (Optional)"
              placeholder="Enter a message..."
              value={formData.message}
              onChange={handleInputChange('message')}
              multiline
              rows={2}
              sx={{ mb: 3 }}
            />

            <Divider sx={{ my: 2 }} />

            {/* Security Notice */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 2, 
                bgcolor: 'info.light', 
                borderRadius: 2,
                mb: 3
              }}
            >
              <Security sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="body2" color="info.main">
                All transfers are secured by account abstraction technology
              </Typography>
            </Box>

            {/* Transfer Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleTransfer}
                disabled={loading || !formData.toAddress || !formData.amount}
                sx={{
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${getSelectedToken()?.color}, ${getSelectedToken()?.color}dd)`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${getSelectedToken()?.color}dd, ${getSelectedToken()?.color}bb)`,
                  }
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                    Processing Transfer...
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Send sx={{ mr: 1 }} />
                    Send {getSelectedToken()?.value}
                  </Box>
                )}
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transfer Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              💡 Transfer Tips
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                • Double-check the recipient address before sending
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Transactions on testnet are free but may take a few minutes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Your wallet uses account abstraction for enhanced security
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • AURA tokens can be earned through daily quests
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </motion.div>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TransferTab;
