import { HistoryItem } from "../types";

const HISTORY_KEY = "misconception_history_v1";

export const getHistory = (): HistoryItem[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveHistoryItem = (
  item: Omit<HistoryItem, "id" | "date">
): HistoryItem => {
  const history = getHistory();
  
  const newItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };

  // Prepend new item (newest first)
  const updatedHistory = [newItem, ...history];
  
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error("Failed to save history", e);
  }

  return newItem;
};

export const clearHistory = (): void => {
  localStorage.removeItem(HISTORY_KEY);
};
