import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  Stack,
  TextField,
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import api, { getUserRole } from '../api';
import StatusChip from "./StatusChip";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

function PropertyList() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = getUserRole() === "ADMIN";
  const [ownerId, setOwnerId] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (isAdmin && ownerId) params.owner_id = Number(ownerId);
      const res = await api.get('/properties/', { params });
      setProperties(res.data);
    } catch (err) {
      console.error('Failed to load properties', err);
      if (err.response && err.response.status === 401) {
        setError('Η συνεδρία έληξε. Κάνε ξανά login.');
      } else if (err.response && err.response.status === 403) {
        setError('Δεν έχεις δικαίωμα πρόσβασης.');
      } else {
        setError('Αποτυχία φόρτωσης ιδιοκτησιών.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      } else if (err.response && err.response.status === 409) {
        setDeleteError('Δεν μπορείς να διαγράψεις ακίνητο που έχει ενεργό συμβόλαιο.');
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
    <PageContainer>
      <PageHeader
        title="Ιδιοκτησίες"
        description="Διαχείριση καταχωρημένων ακινήτων (UC‑02)."
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" component={RouterLink} to="/app/owner">
              Πίνακας
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/properties/new"
            >
              Νέο ακίνητο
            </Button>
          </Stack>
        }
      />

      <Paper sx={{ p: 3 }}>
        {isAdmin ? (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
              <TextField
                label="Owner ID (admin)"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                size="small"
                sx={{ minWidth: 200 }}
              />
              <Button variant="outlined" onClick={fetchProperties}>
                Αναζήτηση
              </Button>
            </Stack>
          </Paper>
        ) : null}

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
                      <IconButton
                        aria-label="Προβολή ακινήτου"
                        component={RouterLink}
                        to={`/properties/${p.id}`}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Επεξεργασία">
                      <IconButton
                        aria-label="Επεξεργασία ακινήτου"
                        component={RouterLink}
                        to={`/properties/${p.id}/edit`}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Διαγραφή">
                      <IconButton
                        edge="end"
                        aria-label="Διαγραφή ακινήτου"
                        onClick={() => openDeleteConfirm(p)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              >
                <ListItemText
                  primary={(
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{p.title || `Ακίνητο #${p.id}`}</span>
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
    </PageContainer>
  );
}

export default PropertyList;