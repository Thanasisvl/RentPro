import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import api from '../api';
import StatusChip from "./StatusChip";

function PropertyList() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/properties/');
        setProperties(res.data);
      } catch (err) {
        console.error('Failed to load properties', err);
        if (err.response && err.response.status === 401) {
          setError('Η συνεδρία έληξε. Κάνε ξανά login.');
        } else {
          setError('Αποτυχία φόρτωσης ιδιοκτησιών.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const openDeleteConfirm = (p) => {
    setDeleteError('');
    setPropertyToDelete(p);
    setConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setConfirmOpen(false);
    setPropertyToDelete(null);
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!propertyToDelete) return;

    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/properties/${propertyToDelete.id}`);
      setProperties((prev) => prev.filter((x) => x.id !== propertyToDelete.id));
      setConfirmOpen(false);
      setPropertyToDelete(null);
    } catch (err) {
      console.error('Failed to delete property', err);
      if (err.response && err.response.status === 401) {
        setDeleteError('Η συνεδρία έληξε. Κάνε ξανά login.');
      } else if (err.response && err.response.status === 403) {
        setDeleteError('Δεν έχεις δικαίωμα να διαγράψεις αυτή την ιδιοκτησία.');
      } else if (err.response && err.response.status === 404) {
        setDeleteError('Η ιδιοκτησία δεν βρέθηκε (ίσως έχει ήδη διαγραφεί).');
      } else {
        setDeleteError('Αποτυχία διαγραφής ιδιοκτησίας.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box mt={4} display="flex" justifyContent="center">
      <Paper sx={{ p: 3, width: '80%' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5">Ιδιοκτησίες</Typography>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/properties/new"
          >
            Νέο ακίνητο
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!error && (
          <List>
            {properties.map((p) => (
              <ListItem
                key={p.id}
                divider
                secondaryAction={(
                  <>
                    <Tooltip title="Προβολή">
                      <IconButton component={RouterLink} to={`/properties/${p.id}`}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Επεξεργασία">
                      <IconButton component={RouterLink} to={`/properties/${p.id}/edit`}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Διαγραφή">
                      <IconButton edge="end" aria-label="delete" onClick={() => openDeleteConfirm(p)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              >
                <ListItemText
                  primary={(
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{p.title || `Property #${p.id}`}</span>
                      <StatusChip status={p.status} />
                    </div>
                  )}
                  secondary={p.address || ''}
                />
              </ListItem>
            ))}
          </List>
        )}

        <Dialog open={confirmOpen} onClose={closeDeleteConfirm}>
          <DialogTitle>Επιβεβαίωση διαγραφής</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Θέλεις σίγουρα να διαγράψεις την ιδιοκτησία
              {propertyToDelete ? ` "${propertyToDelete.title || `#${propertyToDelete.id}`}"` : ''};
            </DialogContentText>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteConfirm} disabled={deleteLoading}>
              Ακύρωση
            </Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Διαγραφή...' : 'Επιβεβαίωση'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}

export default PropertyList;