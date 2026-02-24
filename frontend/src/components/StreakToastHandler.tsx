import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/lib/toast';

export default function StreakToastHandler() {
    const { streak, streakEvent, setStreakEvent } = useAppStore();
    const { toast } = useToast();

    useEffect(() => {
        if (!streakEvent) return;

        if (streakEvent === 'start') {
            toast({
                title: '🔥 Streak Started!',
                description: 'You\'ve completed your first day. Keep it up!',
                tone: 'success',
            });
        } else if (streakEvent === 'increase') {
            toast({
                title: `🔥 ${streak} Day Streak!`,
                description: 'You\'re on a roll. Don\'t stop now!',
                tone: 'success',
            });
        } else if (streakEvent === 'reset') {
            toast({
                title: '❄️ Streak Lost',
                description: 'Your streak has been reset. Start a new one today!',
                tone: 'warning',
            });
        }

        setStreakEvent(null);
    }, [streakEvent, streak, toast, setStreakEvent]);

    return null;
}
