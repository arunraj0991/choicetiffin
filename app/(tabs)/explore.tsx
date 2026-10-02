import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MyPlanRedirect() {
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(userId => {
      if (userId) router.push('/subscription' as any);
      else router.push('/login' as any);
    });
  }, []);

  return null;
}
