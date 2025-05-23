import React, { useState, useEffect } from 'react';
import clubsData from '../../../../data/clubs.json'; // Adjust path as necessary

export interface Club {
  id: string;
  name: string;
  filename: string;
  search: string;
  league: string;
  country: string;
}

interface ClubSelectorProps {
  value: Club | null;
  onChange: (selectedClub: Club | null) => void;
}

const ClubSelector: React.FC<ClubSelectorProps> = ({ value, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // In a real app, you might fetch this data, but for now, we'll use the imported JSON
    setClubs(clubsData);
  }, []);

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.search.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectClub = (club: Club) => {
    onChange(club);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the dropdown from opening
    onChange(null);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <div 
        className="block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {value ? (
          <div className="flex items-center">
            <img 
              src={`/club-logos-40px/${value.filename}`} 
              alt={value.name} 
              className="h-6 w-6 mr-2" 
            />
            <span>{value.name}</span>
            <button 
              onClick={handleClearSelection} 
              className="ml-auto text-gray-400 hover:text-gray-600"
              aria-label="Clear selection"
            >
              &times;
            </button>
          </div>
        ) : (
          <span className="text-gray-500">Select a club (optional)</span>
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg border border-gray-300 rounded-md max-h-60 overflow-auto">
          <input
            type="text"
            placeholder="Search clubs..."
            className="block w-full border-0 border-b border-gray-300 px-3 py-2 focus:ring-0 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <ul>
            {filteredClubs.length > 0 ? (
              filteredClubs.map(club => (
                <li
                  key={club.id}
                  onClick={() => handleSelectClub(club)}
                  className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <img 
                    src={`/club-logos-40px/${club.filename}`} 
                    alt={club.name} 
                    className="h-6 w-6 mr-2" 
                  />
                  <span>{club.name}</span>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-gray-500">No clubs found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ClubSelector; 