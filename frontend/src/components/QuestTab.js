import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  Skeleton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EmojiEvents,
  CardGiftcard,
  History,
  Refresh,
  CheckCircle,
  Schedule,
  Lock,
  Stars
} from '@mui/icons-material';
import axios from 'axios';

const QuestTab = ({ user }) => {
  const [questData, setQuestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chestOpening, setChestOpening] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [questHistory, setQuestHistory] = useState([]);

  useEffect(() => {
    loadQuestData();
    loadQuestHistory();
  }, [user]);

  const loadQuestData = async () => {
    try {
      setLoading(true);
      const userId = user?.id || '1354543512';
      const response = await axios.get(`/api/quest/${userId}`);
      setQuestData(response.data);
    } catch (error) {
      console.error('Error loading quest data:', error);
      showSnackbar('Failed to load quest data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestHistory = async () => {
    try {
      const userId = user?.id || '1354543512';
      const response = await axios.get(`/api/quest-history/${userId}`);
      setQuestHistory(response.data || []);
    } catch (error) {
      console.error('Error loading quest history:', error);
    }
  };

  const openChest = async () => {
    try {
      setChestOpening(true);
      const userId = user?.id || '1354543512';
      const response = await axios.post(`/api/open-chest/${userId}`);
      
      if (response.data.success) {
        const reward = response.data.reward;
        if (reward > 0) {
          showSnackbar(`🎉 Chest opened! You won ${reward} AURA tokens!`, 'success');
        } else {
          showSnackbar('📦 Chest opened! Better luck tomorrow!', 'info');
        }
        
        // Reload quest data after opening chest
        setTimeout(() => {
          loadQuestData();
          loadQuestHistory();
        }, 1000);
      }
    } catch (error) {
      console.error('Error opening chest:', error);
      showSnackbar('Failed to open chest', 'error');
    } finally {
      setTimeout(() => {
        setChestOpening(false);
      }, 2000);
    }
  };

  const claimAura = async () => {
    try {
      const userId = user?.id || '1354543512';
      const response = await axios.post(`/api/claim-aura/${userId}`);
      
      if (response.data.success) {
        showSnackbar('✅ AURA tokens claimed successfully!', 'success');
        loadQuestData();
      }
    } catch (error) {
      console.error('Error claiming AURA:', error);
      showSnackbar('Failed to claim AURA tokens', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getQuestStatusIcon = (completed) => {
    return completed ? <CheckCircle color="success" /> : <Schedule color="warning" />;
  };

  const getChestIcon = (chest) => {
    if (chest?.opened) return '📦';
    if (chest?.eligible) return '🎁';
    return '🔒';
  };

  const getChestTitle = (chest) => {
    if (chest?.opened) return 'Chest Opened';
    if (chest?.eligible) return 'Chest Available';
    return 'Chest Locked';
  };

  const getChestDescription = (chest) => {
    if (chest?.opened) return `Reward: ${chest.reward_amount} AURA`;
    if (chest?.eligible) return 'Open to get 0-5 AURA tokens';
    return 'Complete daily quest to unlock';
  };

  return (
    <Box>
      {/* Daily Quest Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmojiEvents sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Daily Quest
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton onClick={loadQuestData} disabled={loading}>
                <Refresh />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ mr: 2 }}>
                  {loading ? (
                    <Skeleton variant="circular" width={32} height={32} />
                  ) : (
                    getQuestStatusIcon(questData?.quest?.completed)
                  )}
                </Box>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Send at least 1 message in group chat
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? (
                      <Skeleton variant="text" width={120} />
                    ) : (
                      `Messages today: ${questData?.messageCount || 0}`
                    )}
                  </Typography>
                </Box>
              </Box>

              {loading ? (
                <Skeleton variant="rectangular" width={80} height={32} />
              ) : (
                <Chip
                  label={questData?.quest?.completed ? '✅ Completed' : '⏳ In Progress'}
                  color={questData?.quest?.completed ? 'success' : 'warning'}
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>

            {!loading && (
              <LinearProgress
                variant="determinate"
                value={questData?.quest?.completed ? 100 : Math.min((questData?.messageCount || 0) * 100, 100)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Daily Chest */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card 
          sx={{ 
            mb: 3,
            background: questData?.chest?.eligible 
              ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)' 
              : 'default',
            color: questData?.chest?.eligible ? 'white' : 'inherit'
          }}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <motion.div
              animate={chestOpening ? { 
                scale: [1, 1.2, 1], 
                rotate: [0, 10, -10, 0] 
              } : {}}
              transition={{ duration: 0.5, repeat: chestOpening ? 3 : 0 }}
            >
              <Typography variant="h1" sx={{ fontSize: '3rem', mb: 1 }}>
                {loading ? '📦' : getChestIcon(questData?.chest)}
              </Typography>
            </motion.div>

            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {loading ? 'Loading...' : getChestTitle(questData?.chest)}
            </Typography>

            <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
              {loading ? 'Loading...' : getChestDescription(questData?.chest)}
            </Typography>

            <AnimatePresence>
              {!loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={openChest}
                    disabled={!questData?.chest?.eligible || questData?.chest?.opened || chestOpening}
                    sx={{
                      borderRadius: 3,
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      background: questData?.chest?.eligible && !questData?.chest?.opened
                        ? 'rgba(255,255,255,0.2)'
                        : 'default',
                      '&:hover': {
                        background: questData?.chest?.eligible && !questData?.chest?.opened
                          ? 'rgba(255,255,255,0.3)'
                          : 'default',
                      }
                    }}
                  >
                    {chestOpening ? '🎁 Opening...' : 
                     questData?.chest?.opened ? 'Already Opened' :
                     questData?.chest?.eligible ? 'Open Chest' : 'Locked'}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* AURA Balance & Claim */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#333' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Stars sx={{ mr: 1, fontSize: '2rem' }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    AURA Tokens
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Your quest rewards
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {loading ? '0.000' : '0.000'} {/* Will be updated with real balance */}
              </Typography>
            </Box>

            {questData?.chest?.opened && questData?.chest?.reward_amount > 0 && !questData?.chest?.transaction_hash && (
              <Button
                variant="contained"
                fullWidth
                onClick={claimAura}
                sx={{
                  background: 'rgba(0,0,0,0.1)',
                  color: '#333',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'rgba(0,0,0,0.2)',
                  }
                }}
              >
                Claim AURA Rewards
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quest History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <History sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Quest History
              </Typography>
            </Box>

            {questHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No quest history yet. Complete daily quests to see your progress!
              </Typography>
            ) : (
              <List>
                {questHistory.slice(0, 5).map((day, index) => (
                  <ListItem key={index} divider={index < questHistory.length - 1}>
                    <ListItemIcon>
                      {day.completed ? <CheckCircle color="success" /> : <Schedule color="warning" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={new Date(day.quest_date).toLocaleDateString()}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{day.completed ? '✅ Quest' : '❌ Quest'}</span>
                          <span>{day.opened ? '📦 Chest' : (day.completed ? '🎁 Chest' : '🔒 Chest')}</span>
                          {day.reward_amount > 0 && (
                            <Chip 
                              label={`+${day.reward_amount} AURA`} 
                              size="small" 
                              color="warning"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
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

export default QuestTab;
