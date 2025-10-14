# Mobile API Integration Examples

**Real examples from your codebase showing before/after migration**

---

## Example 1: React Query Hook (Players List)

### Before
```typescript
// src/hooks/queries/usePlayers.hook.ts
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth.hook';
import { queryKeys } from '@/lib/queryKeys';

async function fetchPlayers(tenantId: string | null) {
  if (!tenantId) return [];
  
  const response = await fetch('/api/players', { 
    credentials: 'include' 
  });
  
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const result = await response.json();
  return result.data || [];
}

export function usePlayers() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.players(tenantId),
    queryFn: () => fetchPlayers(tenantId),
    staleTime: 10 * 60 * 1000,
  });
}
```

### After
```typescript
// src/hooks/queries/usePlayers.hook.ts
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth.hook';
import { queryKeys } from '@/lib/queryKeys';
import { apiFetch } from '@/lib/apiConfig'; // ✅ Add this import

async function fetchPlayers(tenantId: string | null) {
  if (!tenantId) return [];
  
  const response = await apiFetch('/players'); // ✅ Use apiFetch, remove /api prefix
  
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const result = await response.json();
  return result.data || [];
}

export function usePlayers() {
  const { profile } = useAuth();
  const tenantId = profile.tenantId;
  
  return useQuery({
    queryKey: queryKeys.players(tenantId),
    queryFn: () => fetchPlayers(tenantId),
    staleTime: 10 * 60 * 1000,
  });
}
```

**Changes:**
1. ✅ Import `apiFetch` from `@/lib/apiConfig`
2. ✅ Change `fetch('/api/players', ...)` to `apiFetch('/players')`
3. ✅ Remove `credentials: 'include'` (handled automatically)

---

## Example 2: Form Submission (Create Player)

### Before
```typescript
// src/components/admin/PlayerForm.component.tsx
const handleSubmit = async (data: PlayerFormData) => {
  const response = await fetch('/api/admin/players', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create player');
  }

  return response.json();
};
```

### After
```typescript
// src/components/admin/PlayerForm.component.tsx
import { apiFetch } from '@/lib/apiConfig'; // ✅ Add import

const handleSubmit = async (data: PlayerFormData) => {
  const response = await apiFetch('/admin/players', { // ✅ Use apiFetch
    method: 'POST',
    body: JSON.stringify(data),
    // ✅ Content-Type and credentials handled automatically
  });

  if (!response.ok) {
    throw new Error('Failed to create player');
  }

  return response.json();
};
```

**Changes:**
1. ✅ Import `apiFetch`
2. ✅ Change `fetch('/api/admin/players', ...)` to `apiFetch('/admin/players', ...)`
3. ✅ Remove `headers` and `credentials` (handled automatically)

---

## Example 3: Mutation Hook (Delete Match)

### Before
```typescript
// src/hooks/mutations/useDeleteMatch.hook.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useDeleteMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (matchId: number) => {
      const response = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete match');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
```

### After
```typescript
// src/hooks/mutations/useDeleteMatch.hook.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiConfig'; // ✅ Add import

export function useDeleteMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (matchId: number) => {
      const response = await apiFetch(`/admin/matches/${matchId}`, { // ✅ Use apiFetch
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete match');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
```

---

## Example 4: Service Layer (Match Service)

### Before
```typescript
// src/services/MatchService.ts
export class MatchService {
  static async complete(matchId: number, data: CompleteMatchData) {
    const response = await fetch(
      `/api/admin/upcoming-matches/${matchId}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to complete match');
    }

    return response.json();
  }

  static async getHistory(matchId: number) {
    const response = await fetch(
      `/api/admin/upcoming-matches/${matchId}/historical-data`,
      { credentials: 'include' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch historical data');
    }

    return response.json();
  }
}
```

### After
```typescript
// src/services/MatchService.ts
import { apiFetch } from '@/lib/apiConfig'; // ✅ Add import

export class MatchService {
  static async complete(matchId: number, data: CompleteMatchData) {
    const response = await apiFetch( // ✅ Use apiFetch
      `/admin/upcoming-matches/${matchId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to complete match');
    }

    return response.json();
  }

  static async getHistory(matchId: number) {
    const response = await apiFetch( // ✅ Use apiFetch
      `/admin/upcoming-matches/${matchId}/historical-data`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch historical data');
    }

    return response.json();
  }
}
```

---

## Example 5: Conditional Platform Behavior

### Using platform detection for mobile-specific features

```typescript
// src/components/AppDownloadBanner.component.tsx
import { isNativeApp, getPlatform } from '@/lib/apiConfig';

export function AppDownloadBanner() {
  // Don't show banner if already in mobile app
  if (isNativeApp()) {
    return null;
  }

  return (
    <div className="banner">
      <p>Get the mobile app for the best experience!</p>
      <button>Download for iOS</button>
      <button>Download for Android</button>
    </div>
  );
}
```

```typescript
// src/components/ShareButton.component.tsx
import { getPlatform } from '@/lib/apiConfig';
import { Share } from '@capacitor/share';

export function ShareButton({ url, text }: ShareButtonProps) {
  const platform = getPlatform();

  const handleShare = async () => {
    // Use native share on mobile
    if (platform === 'ios' || platform === 'android') {
      await Share.share({
        title: 'Capo',
        text,
        url,
        dialogTitle: 'Share with friends',
      });
    } else {
      // Use Web Share API or fallback on web
      if (navigator.share) {
        await navigator.share({ title: 'Capo', text, url });
      } else {
        // Copy to clipboard fallback
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    }
  };

  return <button onClick={handleShare}>Share</button>;
}
```

---

## Example 6: Error Handling with Platform Context

```typescript
// src/lib/errorHandler.ts
import { getPlatform, getApiBaseUrl } from '@/lib/apiConfig';

export function logError(error: Error, context?: string) {
  const platform = getPlatform();
  const apiBase = getApiBaseUrl();
  
  console.error('[Error]', {
    message: error.message,
    platform,
    apiBase,
    context,
    stack: error.stack,
  });

  // Send to error tracking service
  if (platform === 'web') {
    // Use Sentry or similar
  } else {
    // Use Crashlytics or similar for mobile
  }
}
```

---

## Migration Checklist for Your Codebase

Based on your project structure, here are the files likely to need updates:

### Hooks (High Priority)
- [ ] `src/hooks/queries/*.hook.ts` - All React Query hooks
- [ ] `src/hooks/mutations/*.hook.ts` - All mutation hooks
- [ ] `src/hooks/useAuth.hook.ts` - Authentication calls

### Components (Medium Priority)
- [ ] `src/components/admin/**/*.tsx` - Admin components with API calls
- [ ] `src/components/forms/**/*.tsx` - Form submission handlers
- [ ] `src/components/dashboard/**/*.tsx` - Dashboard widgets

### Services (High Priority)
- [ ] `src/services/*.service.ts` - Service layer functions

### Pages (Low Priority)
- [ ] `src/app/**/page.tsx` - Server components (already use absolute URLs)

---

## Quick Migration Script

Use this bash script to find all files that need updating:

```bash
#!/bin/bash
# save as: scripts/find-api-calls.sh

echo "Files with fetch('/api') calls:"
grep -r "fetch('/api" src/ --include="*.ts" --include="*.tsx" -l

echo "\nFiles with fetch(\`/api) calls:"
grep -r 'fetch(`/api' src/ --include="*.ts" --include="*.tsx" -l

echo "\nTotal files to update:"
grep -r "fetch('/api\|fetch(\`/api" src/ --include="*.ts" --include="*.tsx" -l | wc -l
```

Run it:
```bash
chmod +x scripts/find-api-calls.sh
./scripts/find-api-calls.sh
```

---

**Next Steps:**
1. Run the script above to identify files
2. Update files one by one using the patterns shown
3. Test locally with `npm run dev`
4. Test mobile with `npm run ios:dev` and `npm run android:dev`
5. Deploy and test production build

