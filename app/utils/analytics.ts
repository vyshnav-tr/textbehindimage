import { analytics } from '@/app/firebase';
import { logEvent } from 'firebase/analytics';

export const logAnalyticsEvent = (eventName: string, eventParams?: { [key: string]: string | number | boolean | undefined }) => {
    if (analytics) {
        logEvent(analytics, eventName, eventParams);
    } else {
        console.warn('Firebase Analytics not initialized');
    }
};
