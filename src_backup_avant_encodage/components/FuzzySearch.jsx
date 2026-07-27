/**
 * Fuzzy Search avec algorithme Levenshtein simplifié
 * Permet de trouver des correspondances approximatives
 */

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Calcule le score de similarité (0-100%)
 */
const similarityScore = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  const distance = levenshteinDistance(longer, shorter);
  return ((longer.length - distance) / longer.length) * 100;
};

/**
 * Recherche floue dans un texte
 */
export const fuzzyMatch = (searchTerm, text, threshold = 60) => {
  if (!searchTerm || !text) return false;
  
  const search = searchTerm.toLowerCase().trim();
  const target = text.toLowerCase();
  
  // Correspondance exacte
  if (target.includes(search)) return true;
  
  // Diviser en mots
  const words = target.split(/\s+/);
  
  // Vérifier chaque mot
  for (const word of words) {
    const score = similarityScore(search, word);
    if (score >= threshold) return true;
  }
  
  return false;
};

/**
 * Recherche floue avancée avec scoring
 */
export const fuzzySearch = (searchTerm, items, fields, threshold = 60) => {
  if (!searchTerm || !items || items.length === 0) return items;
  
  const search = searchTerm.toLowerCase().trim();
  
  return items
    .map(item => {
      let maxScore = 0;
      
      fields.forEach(field => {
        const value = item[field];
        if (!value) return;
        
        const text = String(value).toLowerCase();
        
        // Correspondance exacte = score max
        if (text.includes(search)) {
          maxScore = 100;
          return;
        }
        
        // Recherche floue sur les mots
        const words = text.split(/\s+/);
        words.forEach(word => {
          const score = similarityScore(search, word);
          if (score > maxScore) maxScore = score;
        });
      });
      
      return { ...item, _searchScore: maxScore };
    })
    .filter(item => item._searchScore >= threshold)
    .sort((a, b) => b._searchScore - a._searchScore);
};

/**
 * Extrait des mots-clés d'un texte
 */
export const extractKeywords = (text, minLength = 3) => {
  if (!text) return [];
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length >= minLength);
  
  // Compter les occurrences
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  // Trier par fréquence
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
};

/**
 * Génère des suggestions basées sur l'historique
 */
export const generateSuggestions = (searchTerm, history, items, limit = 5) => {
  const suggestions = new Set();
  
  if (!searchTerm) {
    // Retourner l'historique récent
    return history.slice(0, limit);
  }
  
  const search = searchTerm.toLowerCase();
  
  // Suggestions depuis l'historique
  history.forEach(term => {
    if (term.toLowerCase().startsWith(search) && term.toLowerCase() !== search) {
      suggestions.add(term);
    }
  });
  
  // Suggestions depuis les données
  items.forEach(item => {
    [item.title, item.category, item.city].forEach(field => {
      if (field && field.toLowerCase().includes(search)) {
        const words = field.split(/\s+/);
        words.forEach(word => {
          if (word.toLowerCase().startsWith(search)) {
            suggestions.add(word);
          }
        });
      }
    });
  });
  
  return Array.from(suggestions).slice(0, limit);
};