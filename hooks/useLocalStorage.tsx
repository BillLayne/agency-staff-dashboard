import React, { useState, useEffect } from 'react';

function getValueFromLocalStorage<T,>(key: string, initialValue: T | (() => T)): T {
  try {
    const item = window.localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
  }
  
  if (initialValue instanceof Function) {
    return initialValue();
  }
  return initialValue;
}

export function useLocalStorage<T,>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return getValueFromLocalStorage(key, initialValue);
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
