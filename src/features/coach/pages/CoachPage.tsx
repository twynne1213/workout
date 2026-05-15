import { useState, useRef, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Send, BotMessageSquare, Loader2, CalendarCheck,
  Check, Dumbbell, Activity, StretchHorizontal,
  Wrench,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { db } from '@/data/db';
import { PageHeader } from '@/shared/components/PageHeader';
import { streamChat, type ChatMessage as ApiMessage } from '@/services/claude';
import { buildSystemPrompt } from '@/features/coach/utils/prompt-builder';
import {
  parseWeekPlan,
  looksLikeWeekPlan,
  createStagedWorkouts,
  type ParsedDay,
} from '@/features/coach/utils/plan-parser';
import {
  parseAdjustments,
  hasAdjustments,
  describeAction,
  applyAdjustments,
  type AdjustmentAction,
} from '@/features/coach/utils/adjustment-parser';
import { useCurrentWeekCommit, useWeekStagedWorkouts, useActiveGoals, getWeekStart } from '@/shared/hooks/useWeekPlan';
import { cn } from '@/shared/utils/cn';
import type { CoachMessage, WeekCommit } from '@/types';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const TYPE_ICON = {
  lift: Dumbbell,
  cardio: Activity,
  mobility: StretchHorizontal,
} as const;

const TYPE_COLOR = {
  lift: 'text-primary bg-primary/10',
  cardio: 'text-success bg-success/10',
  mobility: 'text-warning bg-warning/10',
} as const;

export function CoachPage() {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [pendingPlan, setPendingPlan] = useState<ParsedDay[] | null>(null);
  const [pendingAdjustments, setPendingAdjustments] = useState<AdjustmentAction[] | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Data for system prompt context
  const profile = useLiveQuery(() => db.userProfile.get('default'));
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentWorkouts = useLiveQuery(
    () => db.workoutLogs.where('startedAt').above(twoWeeksAgo).toArray(),
    [twoWeeksAgo]
  );
  const recentCardio = useLiveQuery(
    () => db.cardioSessions.where('startedAt').above(twoWeeksAgo).toArray(),
    [twoWeeksAgo]
  );
  const goals = useActiveGoals();
  const weekCommit = useCurrentWeekCommit();
  const weekWorkouts = useWeekStagedWorkouts(weekCommit?.id);
  const exercises = useLiveQuery(() => db.exercises.toArray());

  const exerciseMap = new Map(exercises?.map((e) => [e.id, e]) ?? []);
  const hasCommittedPlan = weekCommit && weekCommit.status !== 'draft';
  const threadIdRef = useRef<string | null>(null);

  // Load the most recent coach thread on mount
  useEffect(() => {
    (async () => {
      const threads = await db.coachThreads.orderBy('updatedAt').reverse().limit(1).toArray();
      if (threads.length > 0) {
        const thread = threads[0];
        threadIdRef.current = thread.id;
        const loaded: LocalMessage[] = thread.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }));
        setMessages(loaded);
      }
    })();
  }, []);

  // Save messages to DB whenever they change (debounced by the fact we only write after state settles)
  const saveThread = useCallback(async (msgs: LocalMessage[]) => {
    if (msgs.length === 0) return;
    const now = Date.now();
    const threadMessages: CoachMessage[] = msgs.map((m) => ({
      id: m.id,
      threadId: threadIdRef.current ?? '',
      role: m.role,
      content: m.content,
      createdAt: now,
    }));

    if (threadIdRef.current) {
      await db.coachThreads.update(threadIdRef.current, {
        messages: threadMessages,
        updatedAt: now,
      });
    } else {
      const id = nanoid();
      threadIdRef.current = id;
      await db.coachThreads.put({
        id,
        title: `Chat ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        weekCommitId: weekCommit?.id,
        messages: threadMessages,
        createdAt: now,
        updatedAt: now,
      });
    }
  }, [weekCommit?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingContent, pendingPlan, pendingAdjustments]);

  // When streaming finishes, check if the response contains a parseable week plan
  const handleStreamDone = useCallback((fullContent: string, allMessages: LocalMessage[]) => {
    const assistantMsg: LocalMessage = {
      id: nanoid(),
      role: 'assistant',
      content: fullContent,
    };
    const updatedMessages = [...allMessages, assistantMsg];
    setMessages(updatedMessages);
    setStreamingContent('');
    setIsStreaming(false);

    // Persist conversation to DB
    saveThread(updatedMessages);

    // Auto-detect if the response contains adjustments
    if (hasAdjustments(fullContent)) {
      const actions = parseAdjustments(fullContent);
      if (actions.length > 0) {
        setPendingAdjustments(actions);
        return;
      }
    }

    // Auto-detect if the response contains a week plan
    if (looksLikeWeekPlan(fullContent)) {
      const parsed = parseWeekPlan(fullContent);
      if (parsed.length >= 2) {
        setPendingPlan(parsed);
      }
    }
  }, [saveThread]);

  const sendMessage = async (overrideInput?: string) => {
    const text = overrideInput ?? input;
    if (!text.trim() || isStreaming || !profile) return;

    const userMsg: LocalMessage = { id: nanoid(), role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');
    setPendingPlan(null);
    setPendingAdjustments(null);

    const apiMessages: ApiMessage[] = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = buildSystemPrompt({
      profile,
      recentWorkouts: recentWorkouts ?? [],
      recentCardio: recentCardio ?? [],
      goals: goals ?? [],
      currentWeekCommit: weekCommit ?? null,
      currentWeekWorkouts: weekWorkouts ?? [],
      exerciseMap,
    });

    let fullContent = '';
    abortRef.current = new AbortController();

    try {
      await streamChat(
        apiMessages,
        systemPrompt,
        (chunk) => {
          fullContent += chunk;
          setStreamingContent(fullContent);
        },
        () => handleStreamDone(fullContent, updatedMessages),
        abortRef.current.signal,
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const errorMsg: LocalMessage = {
          id: nanoid(),
          role: 'assistant',
          content: 'Sorry, I had trouble connecting. Please try again.',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const commitPlan = async () => {
    if (!pendingPlan || isCommitting) return;
    setIsCommitting(true);

    try {
      const now = Date.now();
      const weekStart = getWeekStart();
      const commitId = nanoid();

      // Build conversation snapshot
      const snapshot: CoachMessage[] = messages.map((m) => ({
        id: m.id,
        threadId: commitId,
        role: m.role,
        content: m.content,
        createdAt: now,
      }));

      // Create the week commit
      const commit: WeekCommit = {
        id: commitId,
        weekStartDate: weekStart,
        status: 'committed',
        goalIds: goals?.map((g) => g.id) ?? [],
        coachNotes: messages.filter((m) => m.role === 'assistant').slice(-1)[0]?.content ?? '',
        conversationSnapshot: snapshot,
        adjustmentLog: [],
        createdAt: now,
        updatedAt: now,
      };

      // Create staged workouts
      const stagedWorkouts = createStagedWorkouts(pendingPlan, commitId);

      // Write to DB
      await db.weekCommits.put(commit);
      await db.stagedWorkouts.bulkPut(stagedWorkouts);

      // Save coach thread
      await db.coachThreads.put({
        id: nanoid(),
        title: `Week of ${new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        weekCommitId: commitId,
        messages: snapshot,
        createdAt: now,
        updatedAt: now,
      });

      setPendingPlan(null);

      // Add a confirmation message and persist
      const confirmMsg: LocalMessage = {
        id: nanoid(),
        role: 'assistant',
        content: `Your week is locked in! ${stagedWorkouts.length} workouts have been staged across ${pendingPlan.length} days. Head to the Home tab to see what's up first. Let me know if you need to adjust anything mid-week.`,
      };
      const finalMsgs = [...messages, confirmMsg];
      setMessages(finalMsgs);
      saveThread(finalMsgs);
    } catch (err) {
      console.error('Failed to commit plan:', err);
      const errorMsg: LocalMessage = {
        id: nanoid(),
        role: 'assistant',
        content: 'Something went wrong committing the plan. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsCommitting(false);
    }
  };

  const confirmAdjustments = async () => {
    if (!pendingAdjustments || !weekCommit || isCommitting) return;
    setIsCommitting(true);

    try {
      const applied = await applyAdjustments(pendingAdjustments, weekCommit.id);
      setPendingAdjustments(null);

      const confirmMsg: LocalMessage = {
        id: nanoid(),
        role: 'assistant',
        content: applied.length > 0
          ? `Done! ${applied.join('. ')}. Your Today tab is updated.`
          : "Couldn't match those workouts to your current plan. Try being more specific about which workout to change.",
      };
      const finalMsgs = [...messages, confirmMsg];
      setMessages(finalMsgs);
      saveThread(finalMsgs);
    } catch (err) {
      console.error('Failed to apply adjustments:', err);
      const errorMsg: LocalMessage = {
        id: nanoid(),
        role: 'assistant',
        content: 'Something went wrong applying the changes. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsCommitting(false);
    }
  };

  // Choose suggestions based on whether a plan is already committed
  const suggestions = hasCommittedPlan
    ? [
        'I need to swap a workout today',
        'I missed yesterday, what should I do?',
        "How's my week looking?",
        'I want to adjust a goal',
      ]
    : [
        "Let's plan this week",
        'Help me set a new goal',
        "What should this week look like?",
        'I want to train for a 5K',
      ];

  return (
    <div className="flex flex-col h-[calc(100svh-56px)]">
      <PageHeader title="Coach" />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <BotMessageSquare size={28} className="text-primary" />
            </div>
            <h3 className="text-base font-semibold mb-1">
              {hasCommittedPlan ? 'Need to make changes?' : 'Plan Your Week'}
            </h3>
            <p className="text-sm text-text-secondary mb-6 max-w-xs">
              {hasCommittedPlan
                ? "Life happens. Tell me what changed and we'll adjust your plan together."
                : "Let's build your week together. I'll draft a plan based on your goals and recent activity."
              }
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-3 py-1.5 text-xs font-medium bg-surface-secondary rounded-full text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          // When a plan/adjustment card is showing, strip the structured lines
          // from the last assistant message so info isn't duplicated
          const isLastAssistant =
            msg.role === 'assistant' &&
            !messages.slice(idx + 1).some((m) => m.role === 'assistant');

          let displayContent = msg.content;
          if (isLastAssistant && pendingPlan) {
            displayContent = msg.content
              .split('\n')
              .filter((line) => {
                const t = line.trim();
                if (!t) return false;
                return !/^\*{0,2}(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(day)?\b/i.test(t);
              })
              .join('\n')
              .trim();
          }
          if (isLastAssistant && pendingAdjustments) {
            displayContent = msg.content
              .split('\n')
              .filter((line) => !line.trim().startsWith('[ADJUST]'))
              .join('\n')
              .trim();
          }

          if (!displayContent) return null;

          return (
            <div
              key={msg.id}
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-white ml-auto rounded-br-md'
                  : 'bg-surface-secondary rounded-bl-md'
              )}
            >
              <p className="whitespace-pre-wrap">{displayContent}</p>
            </div>
          );
        })}

        {isStreaming && streamingContent && (
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface-secondary px-4 py-2.5 text-sm leading-relaxed">
            <p className="whitespace-pre-wrap">{streamingContent}</p>
          </div>
        )}

        {isStreaming && !streamingContent && (
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <Loader2 size={16} className="animate-spin" /> Thinking...
          </div>
        )}

        {/* Pending plan preview + commit button */}
        {pendingPlan && !isStreaming && (
          <div className="border border-primary/20 rounded-2xl overflow-hidden bg-primary/5">
            <div className="px-4 py-3 border-b border-primary/10 flex items-center gap-2">
              <CalendarCheck size={16} className="text-primary" />
              <span className="text-sm font-semibold">Week Plan Preview</span>
              <span className="text-xs text-text-muted ml-auto">
                {pendingPlan.reduce((sum, d) => sum + d.items.length, 0)} activities
              </span>
            </div>

            <div className="px-4 py-3 space-y-3">
              {pendingPlan.map((day) => (
                <div key={day.dayLabel}>
                  <p className="text-xs font-semibold text-text-secondary mb-1">{day.dayLabel}</p>
                  <div className="space-y-1">
                    {day.items.map((item, i) => {
                      const Icon = TYPE_ICON[item.type];
                      const color = TYPE_COLOR[item.type];
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className={cn('w-6 h-6 rounded flex items-center justify-center shrink-0', color)}>
                            <Icon size={12} />
                          </div>
                          <p className="text-xs truncate">
                            <span className="font-medium">{item.title}</span>
                            {item.description && (
                              <span className="text-text-muted"> — {item.description}</span>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-primary/10 flex gap-2">
              <button
                onClick={() => setPendingPlan(null)}
                className="flex-1 py-2.5 text-xs font-medium text-text-secondary bg-surface-secondary rounded-xl active:scale-[0.98] transition-transform"
              >
                Discuss More
              </button>
              <button
                onClick={commitPlan}
                disabled={isCommitting}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-primary rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {isCommitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {isCommitting ? 'Committing...' : 'Commit This Week'}
              </button>
            </div>
          </div>
        )}

        {/* Pending adjustments approval */}
        {pendingAdjustments && !isStreaming && (
          <div className="border border-warning/20 rounded-2xl overflow-hidden bg-warning/5">
            <div className="px-4 py-3 border-b border-warning/10 flex items-center gap-2">
              <Wrench size={16} className="text-warning" />
              <span className="text-sm font-semibold">Proposed Changes</span>
              <span className="text-xs text-text-muted ml-auto">
                {pendingAdjustments.length} {pendingAdjustments.length === 1 ? 'change' : 'changes'}
              </span>
            </div>

            <div className="px-4 py-3 space-y-2">
              {pendingAdjustments.map((action, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider',
                    action.type === 'skip' ? 'text-danger bg-danger/10' :
                    action.type === 'add' ? 'text-success bg-success/10' :
                    'text-warning bg-warning/10'
                  )}>
                    {action.type}
                  </span>
                  <span className="text-text-primary">{describeAction(action)}</span>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-warning/10 flex gap-2">
              <button
                onClick={() => setPendingAdjustments(null)}
                className="flex-1 py-2.5 text-xs font-medium text-text-secondary bg-surface-secondary rounded-xl active:scale-[0.98] transition-transform"
              >
                Nevermind
              </button>
              <button
                onClick={confirmAdjustments}
                disabled={isCommitting}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-warning rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {isCommitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {isCommitting ? 'Applying...' : 'Apply Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-surface/80 backdrop-blur-xl px-4 py-3">
        <div className="flex items-end gap-2 max-w-lg mx-auto">
          <textarea
            rows={1}
            placeholder={
              hasCommittedPlan
                ? 'Tell your coach what changed...'
                : 'Ask your coach to plan your week...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 p-2.5 text-sm bg-surface-secondary rounded-xl border border-transparent focus:border-primary focus:outline-none resize-none max-h-32"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className={cn(
              'p-2.5 rounded-xl transition-colors',
              input.trim() && !isStreaming
                ? 'bg-primary text-white'
                : 'bg-surface-secondary text-text-muted'
            )}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
