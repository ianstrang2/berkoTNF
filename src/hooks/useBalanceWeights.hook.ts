import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/apiConfig';

interface Weight {
  attribute_id: string;
  name: string;
  description: string; // position_group
  weight: number;
}

interface FormattedWeights {
  defense: Record<string, number>;
  midfield: Record<string, number>;
  attack: Record<string, number>;
  team: Record<string, number>;
}

export const useBalanceWeights = () => {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch weights on mount
  useEffect(() => {
    const fetchWeights = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiFetch('/admin/balance-algorithm');
        
        if (!response.ok) {
          throw new Error('Failed to fetch balance weights');
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          setWeights(data.data);
        } else {
          throw new Error(data.error || 'Failed to fetch balance weights');
        }
      } catch (err) {
        console.error('Error fetching balance weights:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balance weights');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWeights();
  }, []);

  // Format weights for use in calculations
  const formattedWeights = useMemo<FormattedWeights>(() => {
    const result: FormattedWeights = {
      defense: {},
      midfield: {},
      attack: {},
      team: {}
    };
    
    weights.forEach(weight => {
      const positionGroup = weight.description;
      const attribute = weight.name;
      
      if (positionGroup && attribute && positionGroup in result) {
        result[positionGroup as keyof FormattedWeights][attribute] = weight.weight;
      }
    });
    
    return result;
  }, [weights]);

  return { weights, formattedWeights, isLoading, error };
}; 