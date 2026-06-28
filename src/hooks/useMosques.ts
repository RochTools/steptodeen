import { useState, useCallback } from 'react';
import {
  getLocalMosques,
  saveLocalMosque,
  deleteLocalMosque
} from '../firebase';
import {
  onSnapshot, collection, addDoc,
  doc, setDoc, deleteDoc
} from 'firebase/firestore';
import { Mosque } from '../types';
import { validateMosqueId, parseSavedMosques } from '../utils/mosqueHelpers';

export const useMosques = (
  realtimeDb: any,
  realFirebaseActive: boolean
) => {
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [isLoading, setIsLoading] = useState(true); // ← نئی state
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null);
  const [savedPopupMosques, setSavedPopupMosques] = useState<string[]>(
    () => parseSavedMosques(localStorage.getItem('user_saved_mosques'))
  );

  // ── setMosques wrapper جو loading بند کرے ──
  const setMosquesAndStopLoading = useCallback((list: Mosque[]) => {
    setMosques(list);
    setIsLoading(false);
  }, []);

  // ============ ADD / UPDATE ============
  const handleAddOrUpdateMosque = useCallback(async (
    data: Omit<Mosque, 'id' | 'updatedAt'> & { id?: string }
  ) => {
    const freshMosque = { ...data, updatedAt: new Date().toISOString() };
    if (realFirebaseActive && realtimeDb) {
      try {
        const { id, ...firestoreData } = freshMosque;
        if (data.id) {
          await setDoc(doc(realtimeDb, 'mosques', data.id), firestoreData);
        } else {
          await addDoc(collection(realtimeDb, 'mosques'), firestoreData);
        }
      } catch (error) {
        console.error('Firestore save failed:', error);
        setMosques(saveLocalMosque(freshMosque));
      }
    } else {
      setMosques(saveLocalMosque(freshMosque));
    }
  }, [realFirebaseActive, realtimeDb]);

  // ============ DELETE ============
  const handleDeleteMosque = useCallback(async (id: string) => {
    if (realFirebaseActive && realtimeDb) {
      try {
        await deleteDoc(doc(realtimeDb, 'mosques', id));
      } catch (error) {
        console.error('Firestore delete failed:', error);
        setMosques(deleteLocalMosque(id));
      }
    } else {
      setMosques(deleteLocalMosque(id));
    }
  }, [realFirebaseActive, realtimeDb]);

  // ============ SAVE / UNSAVE ============
  const handleToggleSaveMosque = useCallback((mosque: Mosque) => {
    try {
      const savedData = localStorage.getItem('user_saved_mosques');
      let currentList: Mosque[] = [];
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (Array.isArray(parsed)) {
            if (parsed.length > 0 && typeof parsed[0] === 'object') {
              currentList = parsed;
            } else if (parsed.length > 0 && typeof parsed[0] === 'string') {
              currentList = parsed
                .filter(validateMosqueId)
                .map((id: string) => ({ id } as Mosque));
            }
          }
        } catch { currentList = []; }
      }
      const exists = currentList.find(m => m.id === mosque.id);
      const newList = exists
        ? currentList.filter(m => m.id !== mosque.id)
        : [...currentList, mosque];
      localStorage.setItem('user_saved_mosques', JSON.stringify(newList));
      setSavedPopupMosques(newList.map((m: Mosque) => m.id));
    } catch (error) {
      console.error('Error saving mosque:', error);
    }
  }, []);

  // ============ ALERT ============
  const handleMosqueAlert = useCallback((mosque: Mosque) => {
    try {
      const alertList = JSON.parse(
        localStorage.getItem('mosque_alerts') || '[]'
      );
      if (!alertList.includes(mosque.id)) {
        alertList.push(mosque.id);
        localStorage.setItem('mosque_alerts', JSON.stringify(alertList));
      }
      alert(`StepToDeen الرٹ:\n\nآپ کو ${mosque.name} کی نماز کے بدلتے ہوئے اوقات کی ریئل ٹائم اپڈیٹس کا نوٹیفیکیشن آن کر دیا گیا ہے۔`);
    } catch (error) {
      console.error('Error setting alert:', error);
    }
  }, []);

  return {
    mosques,
    setMosques: setMosquesAndStopLoading, // ← wrapper return کریں
    isLoading,
    setIsLoading,
    selectedMosque, setSelectedMosque,
    savedPopupMosques, setSavedPopupMosques,
    handleAddOrUpdateMosque,
    handleDeleteMosque,
    handleToggleSaveMosque,
    handleMosqueAlert,
  };
};
