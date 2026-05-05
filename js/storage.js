/**
 * storage.js
 * Thin wrapper around localStorage for persisting session data.
 * All data lives under the 'patterndrill_' namespace.
 */

const STORAGE_KEY = 'patterndrill_attempts';
const PREFS_KEY   = 'patterndrill_prefs';

const Storage = {

  /**
   * Save a completed attempt.
   * @param {{ patternKey, patternLabel, correct, iou, grade, difficulty, timestamp }} attempt
   */
  saveAttempt(attempt) {
    const attempts = this.getAttempts();
    attempts.push({ ...attempt, timestamp: Date.now() });
    // Keep last 500 attempts max
    const trimmed = attempts.slice(-500);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Storage full — oldest attempts trimmed.');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed.slice(-100)));
    }
  },

  /**
   * Get all saved attempts.
   * @returns {Array}
   */
  getAttempts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  /**
   * Clear all attempts.
   */
  clearAttempts() {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Save user preferences (last selected pattern, difficulty, etc.)
   * @param {object} prefs
   */
  savePrefs(prefs) {
    try {
      const current = this.getPrefs();
      localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
    } catch (e) {}
  },

  /**
   * Get saved preferences.
   * @returns {object}
   */
  getPrefs() {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    } catch {
      return {};
    }
  },
};
