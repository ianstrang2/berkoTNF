import React, { useState, useEffect } from 'react';
import styles from './PlayerManager.module.css';

const PlayerManager = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    is_ringer: false,
    is_retired: false, // Replace 'active' with 'is_retired'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/admin/players');
      const data = await response.json();
      if (data.data) {
        setPlayers(data.data);
      }
    } catch (error) {
      setError('Failed to fetch players');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = selectedPlayer
        ? '/api/admin/players'
        : '/api/admin/players';
      const method = selectedPlayer ? 'PUT' : 'POST';
      const body = selectedPlayer
        ? { ...formData, player_id: selectedPlayer.player_id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Reset form and refresh player list
      setFormData({ name: '', is_ringer: false, is_retired: false });
      setSelectedPlayer(null);
      fetchPlayers();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (player) => {
    setSelectedPlayer(player);
    setFormData({
      name: player.name,
      is_ringer: player.is_ringer,
      is_retired: player.is_retired, // Change active to is_retired
    });
  };

  return (
    <div className={styles.playerContainer}>
      <h2 className={styles.playerTitle}>
        {selectedPlayer ? 'Edit Player' : 'Add New Player'}
      </h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label className={styles.label}>Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={styles.input}
            required
          />
        </div>

        <div>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.is_ringer}
              onChange={(e) =>
                setFormData({ ...formData, is_ringer: e.target.checked })
              }
              className={styles.checkbox}
            />
            Ringer
          </label>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={!formData.is_retired}
              onChange={(e) =>
                setFormData({ ...formData, is_retired: !e.target.checked })
              }
              className={styles.checkbox}
            />
            Active
          </label>
        </div>

        {error && <p className="text-red-500">{error}</p>}

        <div className={styles.buttonContainer}>
          <button
            type="submit"
            disabled={isLoading}
            className={styles.actionButton}
          >
            {isLoading
              ? 'Saving...'
              : selectedPlayer
              ? 'Update Player'
              : 'Add Player'}
          </button>

          {selectedPlayer && (
            <button
              type="button"
              onClick={() => {
                setSelectedPlayer(null);
                setFormData({ name: '', is_ringer: false, is_retired: false });
              }}
              className={`${styles.actionButton} ${styles.cancelButton}`}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div>
        <h3 className={styles.playerTitle}>Player List</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Ringer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.player_id}>
                <td>{player.name}</td>
                <td>
                  <span className={player.is_retired ? styles.statusInactive : styles.statusActive}>
                    {player.is_retired ? 'Retired' : 'Active'}
                  </span>
                </td>
                <td>
                  <span className={player.is_ringer ? styles.statusActive : ''}>
                    {player.is_ringer ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleEdit(player)}
                    className={`${styles.actionButton} ${styles.editButton}`}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerManager;
