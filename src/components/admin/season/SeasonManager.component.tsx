'use client';
import React, { useState, useEffect } from 'react';
import SeasonFormModal from './SeasonFormModal.component';
import SeasonDeleteModal from './SeasonDeleteModal.component';
import { Season, SeasonFormData, SeasonsListResponse, CurrentSeasonResponse } from '@/types/season.types';

const SeasonManager: React.FC = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSeasons();
    fetchCurrentSeason();
  }, []);

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons');
      const data: SeasonsListResponse = await response.json();
      
      if (data.success && data.data) {
        setSeasons(data.data);
      } else {
        setError(data.error || 'Failed to fetch seasons');
      }
    } catch (err) {
      setError('Failed to fetch seasons');
      console.error('Error fetching seasons:', err);
    }
  };

  const fetchCurrentSeason = async () => {
    try {
      const response = await fetch('/api/seasons/current');
      const data: CurrentSeasonResponse = await response.json();
      
      if (data.success && data.data) {
        setCurrentSeason(data.data);
      }
      // Note: It's OK if there's no current season
    } catch (err) {
      console.error('Error fetching current season:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSeason = async (formData: SeasonFormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const url = selectedSeason ? `/api/seasons/${selectedSeason.id}` : '/api/seasons';
      const method = selectedSeason ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowSeasonModal(false);
        setSelectedSeason(null);
        await fetchSeasons();
        await fetchCurrentSeason();
      } else {
        setError(data.error || 'Failed to save season');
      }
    } catch (err) {
      setError('Failed to save season');
      console.error('Error saving season:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSeason = (season: Season) => {
    setSeasonToDelete(season);
    setShowDeleteModal(true);
  };

  const confirmDeleteSeason = async () => {
    if (!seasonToDelete) return;

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/seasons/${seasonToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteModal(false);
        setSeasonToDelete(null);
        await fetchSeasons();
        await fetchCurrentSeason();
      } else {
        setError(data.error || 'Failed to delete season');
      }
    } catch (err) {
      setError('Failed to delete season');
      console.error('Error deleting season:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSeason = (season: Season) => {
    setSelectedSeason(season);
    setShowSeasonModal(true);
  };

  const handleCreateSeason = () => {
    setSelectedSeason(null);
    setShowSeasonModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-wrap -mx-3">
        <div className="w-full max-w-full px-3 flex-none">
          <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
            <div className="text-center">
              <h6 className="mb-2 text-lg">Loading seasons...</h6>
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-soft-xl p-6 lg:w-fit max-w-7xl">
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* No current season warning */}
        {!currentSeason && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
            <p className="text-yellow-800 font-medium">⚠️ No Current Season</p>
            <p className="text-yellow-600 text-sm mt-1">
              Create a season that includes today's date to enable match creation.
            </p>
          </div>
        )}


            <div className="flex items-center justify-between mb-6">
              <h5 className="font-bold text-slate-700">Season Manager</h5>
              <button
                onClick={handleCreateSeason}
                disabled={!!currentSeason}
                className={`inline-block px-4 py-2 mb-0 text-xs font-medium text-center uppercase align-middle transition-all border-0 rounded-lg cursor-pointer leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 ${
                  currentSeason 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50' 
                    : 'text-white bg-gradient-to-tl from-purple-700 to-pink-500 hover:scale-102 active:opacity-85'
                }`}
                title={currentSeason ? 'Cannot create new season while one is active' : 'Create new season'}
              >
                Create New
              </button>
            </div>

            {seasons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">No seasons found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500">
                  <thead className="align-bottom">
                    <tr>
                      <th className="px-6 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                        Season
                      </th>
                      <th className="px-6 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                        Dates
                      </th>
                      <th className="px-6 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                        Status
                      </th>
                      <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasons.map((season) => {
                      const today = new Date();
                      const startDate = new Date(season.startDate);
                      const endDate = new Date(season.endDate);
                      const isCurrent = today >= startDate && today <= endDate;
                      const isPast = today > endDate;
                      const isFuture = today < startDate;

                      return (
                        <tr key={season.id}>
                          <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap shadow-transparent">
                            <div className="flex px-2 py-1">
                              <div className="flex flex-col justify-center">
                                <h6 className="mb-0 text-sm leading-normal font-semibold">
                                  {season.displayName}
                                </h6>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap shadow-transparent">
                            <div className="text-xs text-slate-500">
                              <div>{new Date(season.startDate).toLocaleDateString()}</div>
                              <div>to {new Date(season.endDate).toLocaleDateString()}</div>
                            </div>
                          </td>
                          <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap shadow-transparent">
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                              isCurrent 
                                ? 'bg-green-100 text-green-800' 
                                : isPast 
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isCurrent ? 'Current' : isPast ? 'Past' : 'Future'}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap shadow-transparent">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleEditSeason(season)}
                                className="inline-block px-3 py-1 text-xs font-medium text-center text-slate-700 uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-slate-100 to-slate-200 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
                                title="Edit season"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSeason(season)}
                                className="inline-block px-3 py-1 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-red-600 to-rose-400 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
                                title="Delete season"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

      {/* Season Form Modal */}
      <SeasonFormModal 
        isOpen={showSeasonModal}
        onClose={() => {
          setShowSeasonModal(false);
          setSelectedSeason(null);
          setError('');
        }}
        onSubmit={handleSubmitSeason}
        isProcessing={isSubmitting}
        initialData={selectedSeason}
        title={selectedSeason ? "Edit Season" : "Create New Season"}
        submitButtonText={selectedSeason ? "Save Changes" : "Create Season"}
      />

      {/* Season Delete Modal */}
      <SeasonDeleteModal 
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSeasonToDelete(null);
          setError('');
        }}
        onConfirm={confirmDeleteSeason}
        isProcessing={isDeleting}
        season={seasonToDelete}
      />
    </div>
  );
};

export default SeasonManager;
