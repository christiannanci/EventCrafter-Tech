/**
 * Gestion de l'historique de recherche
 */

const STORAGE_KEY = 'eventcrafter_search_history';
const MAX_HISTORY = 20;

/**
 * Récupère l'historique de recherche
 */
export const getSearchHistory = () => {
  try {
    const history = localStorage.getItem(STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to load search history:', error);
    return [];
  }
};

/**
 * Ajoute une recherche à l'historique
 */
export const addToSearchHistory = (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length < 2) return;
  
  try {
    const history = getSearchHistory();
    const term = searchTerm.trim();
    
    // Supprimer les doublons
    const filtered = history.filter(item => item !== term);
    
    // Ajouter au début
    const updated = [term, ...filtered].slice(0, MAX_HISTORY);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
};

/**
 * Supprime une entrée de l'historique
 */
export const removeFromSearchHistory = (searchTerm) => {
  try {
    const history = getSearchHistory();
    const updated = history.filter(item => item !== searchTerm);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to remove from search history:', error);
  }
};

/**
 * Efface tout l'historique
 */
export const clearSearchHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear search history:', error);
  }
};