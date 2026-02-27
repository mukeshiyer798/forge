import { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, ExternalLink, Mail, Send } from 'lucide-react';
import { useAppStore, mapBackendUserToUser } from '@/store/useAppStore';
import { apiRequest, getCurrentUser, updateGoalApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { testGeminiConnection } from '@/lib/gemini';

export default function SettingsPage() {
  const { user, goals } = useAppStore();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [morningTime, setMorningTime] = useState('07:00');
  const [afternoonTime, setAfternoonTime] = useState('14:00');
  const [eveningTime, setEveningTime] = useState('20:00');
  const [greeting, setGreeting] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // AI API key (OpenRouter)
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'ok' | 'fail'>(
    user?.hasOpenrouterKey ? 'ok' : 'idle'
  );

  // Email test
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<'idle' | 'sent' | 'fail'>('idle');

  // Goal settings
  const [dailyTaskTarget, setDailyTaskTarget] = useState(3);


  useEffect(() => {
    if (user?.greetingPreference) setGreeting(user.greetingPreference);
  }, [user?.greetingPreference]);

  // Load daily task target from first goal (or default)
  useEffect(() => {
    const firstGoalWithTarget = goals.find(g => g.dailyTaskRequirement);
    if (firstGoalWithTarget?.dailyTaskRequirement) {
      setDailyTaskTarget(firstGoalWithTarget.dailyTaskRequirement);
    }
  }, [goals]);

  useEffect(() => {
    apiRequest<{
      email_daily_plan_enabled: boolean;
      email_morning_time: string;
      email_afternoon_time: string;
      email_evening_time: string;
    }>('/email-preferences')
      .then((prefs) => {
        setEmailEnabled(prefs.email_daily_plan_enabled ?? true);
        setMorningTime(prefs.email_morning_time || '07:00');
        setAfternoonTime(prefs.email_afternoon_time || '14:00');
        setEveningTime(prefs.email_evening_time || '20:00');
      })
      .catch(() => { });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save email preferences
      await apiRequest('/email-preferences', {
        method: 'PUT',
        body: JSON.stringify({
          email_daily_plan_enabled: emailEnabled,
          email_morning_time: morningTime,
          email_afternoon_time: afternoonTime,
          email_evening_time: eveningTime,
          greeting_preference: greeting || undefined,
        }),
      });

      // 2. Save API key + user prefs in one PATCH if key is provided
      const patchBody: Record<string, unknown> = {};
      if (geminiKey.trim()) {
        patchBody.openrouter_api_key = geminiKey.trim();
      }

      await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(patchBody),
      });

      const updatedUser = await getCurrentUser();
      useAppStore.getState().updateUser(mapBackendUserToUser(updatedUser));

      if (geminiKey.trim()) {
        setGeminiKey('');
        setGeminiStatus('ok');
      }

      // 3. Sync daily task target to all goals
      const { goals: currentGoals } = useAppStore.getState();
      for (const g of currentGoals) {
        if (g.dailyTaskRequirement !== dailyTaskTarget) {
          updateGoalApi(g.id, { daily_task_requirement: dailyTaskTarget }).catch(() => { });
        }
      }
      useAppStore.setState(state => ({
        goals: state.goals.map(g => ({ ...g, dailyTaskRequirement: dailyTaskTarget })),
      }));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('[FORGE] Save preferences error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleTestGemini = async () => {
    setGeminiTesting(true);
    setGeminiStatus('idle');
    try {
      const keyToTest = geminiKey.trim() || undefined;
      const ok = await testGeminiConnection(keyToTest);
      setGeminiStatus(ok ? 'ok' : 'fail');

      if (ok && keyToTest) {
        const updatedUser = await getCurrentUser();
        useAppStore.getState().updateUser(mapBackendUserToUser(updatedUser));
        setGeminiKey(''); // clear input, show ••••• placeholder
      }
    } catch (e) {
      console.error('[FORGE] handleTestGemini error:', e);
      setGeminiStatus('fail');
    } finally {
      setGeminiTesting(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailTestResult('idle');
    try {
      await apiRequest('/utils/test-email', {
        method: 'POST',
        body: JSON.stringify({ email_to: user?.email }),
      });
      setEmailTestResult('sent');
      setTimeout(() => setEmailTestResult('idle'), 5000);
    } catch {
      setEmailTestResult('fail');
      setTimeout(() => setEmailTestResult('idle'), 5000);
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 bg-forge-surface/98 backdrop-blur-md border-b border-forge-border px-4 lg:px-10 py-5">
        <div className="flex items-center gap-2">
          <Settings size={24} className="text-forge-amber" />
          <h2 className="font-display text-3xl tracking-widest text-forge-text">SETTINGS</h2>
        </div>
      </div>

      <div className="px-4 lg:px-10 py-8 max-w-2xl w-full">
        {/* Personalization */}
        <section className="mb-8">
          <h3 className="font-condensed font-bold text-lg uppercase tracking-wider text-forge-amber mb-4">
            Personalization
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-forge-dim mb-1">
                Custom greeting
              </label>
              <input
                type="text"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder={user?.name?.split(' ')[0] || 'Your name'}
                className="w-full px-4 py-2.5 bg-forge-surface2 border border-forge-border rounded text-forge-text font-mono text-sm placeholder:text-forge-muted focus:border-forge-amber focus:outline-none"
              />
              <p className="font-mono text-xs text-forge-muted mt-1">
                Used in dashboard header and emails
              </p>
            </div>
          </div>
        </section>

        {/* Goal Settings */}
        <section className="mb-8">
          <h3 className="font-condensed font-bold text-lg uppercase tracking-wider text-forge-amber mb-4">
            Goal Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-forge-dim mb-1">
                Daily task target
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setDailyTaskTarget(n)}
                    className={cn(
                      'w-11 h-11 font-condensed font-bold text-base border transition-colors',
                      dailyTaskTarget === n
                        ? 'border-forge-amber text-forge-amber bg-amber-500/10'
                        : 'border-forge-border text-forge-dim hover:border-forge-dim'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="font-mono text-xs text-forge-muted mt-2 leading-relaxed">
                How many subtopics to complete per day. 2-3 is realistic for most people.
                This applies to all goals and adjusts AI task granularity.
              </p>
            </div>
          </div>
        </section>

        {/* AI API Key */}
        <section id="settings-api-key" className="mb-8">
          <h3 className="font-condensed font-bold text-lg uppercase tracking-wider text-forge-amber mb-4">
            AI Connection
          </h3>
          <p className="font-mono text-xs text-forge-dim mb-3 leading-relaxed">
            Your access code powers AI features — roadmap generation, reading insights, and more. Free codes available.
          </p>
          <div className="space-y-4">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={user?.hasOpenrouterKey ? "•••••••••••••••• (API Key Active)" : "sk-or-..."}
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                spellCheck="false"
                className="w-full px-4 py-2.5 pr-10 bg-forge-surface2 border border-forge-border rounded text-forge-text font-mono text-sm placeholder:text-forge-muted focus:border-forge-amber focus:outline-none"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-forge-dim hover:text-forge-text"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleTestGemini}
                disabled={(!geminiKey.trim() && !user?.hasOpenrouterKey) || geminiTesting}
                className="font-mono text-xs uppercase tracking-wider text-forge-amber border border-forge-amber/30 px-3 py-2 min-h-[44px] hover:bg-forge-amber/10 transition-colors disabled:opacity-40"
              >
                {geminiTesting ? 'Testing...' : (user?.hasOpenrouterKey && !geminiKey.trim() ? 'Test Existing Key' : 'Test Key')}
              </button>
              <button
                onClick={async () => {
                  setGeminiKey('');
                  setGeminiStatus('idle');
                  try {
                    await apiRequest('/users/me', {
                      method: 'PATCH',
                      body: JSON.stringify({ openrouter_api_key: null })
                    });
                    const updatedUser = await getCurrentUser();
                    useAppStore.getState().updateUser(mapBackendUserToUser(updatedUser));
                    console.debug('[FORGE] API key cleared');
                  } catch { }
                }}
                className="font-mono text-xs uppercase tracking-wider text-forge-dim border border-forge-border px-3 py-2 min-h-[44px] hover:text-red-400 hover:border-red-500/30 transition-colors"
              >
                Clear Key
              </button>
              {geminiStatus === 'ok' && (
                <span className="font-mono text-xs text-green-400">✓ Connected Server</span>
              )}
              {geminiStatus === 'fail' && (
                <span className="font-mono text-xs text-red-400">✗ Failed — check key</span>
              )}
              {geminiStatus === 'idle' && user?.hasOpenrouterKey && !geminiKey.trim() && (
                <span className="font-mono text-xs text-forge-dim">✓ API Key securely stored on server</span>
              )}
            </div>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-forge-amber hover:text-forge-text transition-colors"
            >
              Get free API key <ExternalLink size={11} />
            </a>
          </div>
        </section>

        {/* Email Settings */}
        <section className="mb-8">
          <h3 className="font-condensed font-bold text-lg uppercase tracking-wider text-forge-amber mb-4">
            Daily Plan Emails
          </h3>

          {goals.length === 0 && (
            <div className="border border-dashed border-forge-border px-4 py-3 mb-4">
              <p className="font-mono text-xs text-forge-dim leading-relaxed">
                <Mail size={12} className="inline mr-1 text-forge-amber" />
                Add goals first, then enable daily emails to get your morning plan, afternoon check-in, and evening review delivered to <span className="text-forge-text">{user?.email || 'your inbox'}</span>.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="rounded border-forge-border bg-forge-surface2 text-forge-amber focus:ring-forge-amber"
              />
              <span className="font-mono text-sm text-forge-text">Send me daily plan emails</span>
            </label>
            {emailEnabled && (
              <>
                <div className="grid grid-cols-3 gap-3 pl-6">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-forge-dim mb-1">
                      Morning
                    </label>
                    <input
                      type="time"
                      value={morningTime}
                      onChange={(e) => setMorningTime(e.target.value)}
                      className="w-full px-3 py-2 bg-forge-surface2 border border-forge-border rounded text-forge-text font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-forge-dim mb-1">
                      Afternoon
                    </label>
                    <input
                      type="time"
                      value={afternoonTime}
                      onChange={(e) => setAfternoonTime(e.target.value)}
                      className="w-full px-3 py-2 bg-forge-surface2 border border-forge-border rounded text-forge-text font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-forge-dim mb-1">
                      Evening
                    </label>
                    <input
                      type="time"
                      value={eveningTime}
                      onChange={(e) => setEveningTime(e.target.value)}
                      className="w-full px-3 py-2 bg-forge-surface2 border border-forge-border rounded text-forge-text font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Test email */}
                <div className="flex items-center gap-2 flex-wrap pl-6">
                  <button
                    onClick={handleTestEmail}
                    disabled={testingEmail}
                    className="font-mono text-xs uppercase tracking-wider text-forge-amber border border-forge-amber/30 px-3 py-2 min-h-[44px] hover:bg-forge-amber/10 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Send size={11} />
                    {testingEmail ? 'Sending...' : 'Send Test Email'}
                  </button>
                  {emailTestResult === 'sent' && (
                    <span className="font-mono text-xs text-green-400">✓ Check your inbox</span>
                  )}
                  {emailTestResult === 'fail' && (
                    <span className="font-mono text-xs text-red-400">✗ Failed — check email config</span>
                  )}
                </div>

                <p className="font-mono text-xs text-forge-muted pl-6 leading-relaxed">
                  You'll get 3 emails per day: a morning plan with today's tasks, an afternoon check-in, and an evening review.
                  Check with a test email to confirm delivery.
                </p>
              </>
            )}
          </div>
        </section>

        <button
          onClick={() => handleSave()}
          disabled={saving}
          className={cn(
            'px-6 py-3 font-mono text-sm uppercase tracking-wider border transition-colors min-h-[44px]',
            saved
              ? 'border-green-500/50 text-green-400 bg-green-500/10'
              : 'border-forge-amber text-forge-amber hover:bg-forge-amber/10'
          )}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}
