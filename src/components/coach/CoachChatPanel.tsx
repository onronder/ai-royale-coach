import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Send, Bot, User, Loader2, X, MessageSquare, Plus, Swords, Crown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataLoader } from "@/components/ui/data-loader";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  last_message_at: string;
  message_count: number;
}

interface MatchAnalysis {
  analysis: string;
  deckMatchup: string;
  recommendations: string[];
}

interface MatchContextData {
  battle: ClashRoyaleBattle;
  playerTag: string;
  analysis?: MatchAnalysis;
  isWin: boolean;
  playerCrowns: number;
  opponentCrowns: number;
  trophyChange: number;
}

interface CoachChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playerTag: string;
  playerStats?: {
    trophies: number;
    bestTrophies: number;
    arena: string;
    winRate: number;
  };
  recentMatches?: {
    wins: number;
    losses: number;
    avgTrophyChange: string;
  };
  savedDecks?: any[];
  cardMastery?: any[];
  achievements?: any[];
  cardCollection?: any[];
  matchContext?: MatchContextData | null;
}

export function CoachChatPanel({ 
  isOpen, 
  onClose, 
  playerTag, 
  playerStats, 
  recentMatches,
  savedDecks,
  cardMastery,
  achievements,
  cardCollection,
  matchContext
}: CoachChatPanelProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasAutoSentMatchContext, setHasAutoSentMatchContext] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, playerTag]);

  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId]);

  // Auto-send match context when it's set and user is loaded
  useEffect(() => {
    if (matchContext && userId && !hasAutoSentMatchContext && !isLoading) {
      setHasAutoSentMatchContext(true);
      startNewConversation();
      
      // Build the match context message
      const outcome = matchContext.isWin ? 'won' : 'lost';
      const opponent = matchContext.battle.opponent[0];
      const playerCards = matchContext.battle.team.find(p => p.tag === matchContext.playerTag)?.cards || [];
      const opponentCards = opponent?.cards || [];
      
      const contextMessage = `I just ${outcome} a match and want to discuss it.

**My Deck:** ${playerCards.map(c => c.name).join(', ')}
**Opponent's Deck:** ${opponentCards.map(c => c.name).join(', ')}
**Score:** ${matchContext.playerCrowns} - ${matchContext.opponentCrowns} crowns
**Trophy Change:** ${matchContext.trophyChange > 0 ? '+' : ''}${matchContext.trophyChange}
**Game Mode:** ${matchContext.battle.gameMode.name}

${matchContext.analysis ? `**AI Analysis Summary:**
${matchContext.analysis.deckMatchup}

**Recommendations from Analysis:**
${matchContext.analysis.recommendations.map(r => `• ${r}`).join('\n')}` : ''}

What could I have done differently to ${matchContext.isWin ? 'perform even better' : 'win this match'}?`;

      // Auto-send the context message
      handleAutoSend(contextMessage);
    }
  }, [matchContext, userId, hasAutoSentMatchContext, isLoading]);

  // Reset auto-send flag when match context clears
  useEffect(() => {
    if (!matchContext) {
      setHasAutoSentMatchContext(false);
    }
  }, [matchContext]);

  const handleAutoSend = async (message: string) => {
    if (!userId) return;
    setIsLoading(true);
    
    try {
      const { data: userMsg, error: userError } = await supabase
        .from("chat_messages")
        .insert({
          player_tag: playerTag,
          user_id: userId,
          role: "user",
          content: message,
        })
        .select()
        .single();

      if (userError) throw userError;
      setMessages([userMsg as Message]);
      
      const newDate = new Date().toLocaleDateString();
      setCurrentConversationId(newDate);
      
      await streamChat(message);
    } catch (error) {
      console.error("Auto-send error:", error);
      toast.error(t('coach.failedToSendMatchContext'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      // Get all unique conversation sessions (grouped by created_at date)
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("player_tag", playerTag)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Group messages by conversation (using date as conversation identifier)
        const grouped = data.reduce((acc: any, msg: any) => {
          const date = new Date(msg.created_at).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = {
              id: date,
              title: `Chat from ${date}`,
              last_message_at: msg.created_at,
              messages: []
            };
          }
          acc[date].messages.push(msg);
          return acc;
        }, {});

        const convos = Object.values(grouped).map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          last_message_at: conv.last_message_at,
          message_count: conv.messages.length
        }));

        setConversations(convos);
        
        // Auto-select most recent conversation
        if (convos.length > 0 && !currentConversationId) {
          setCurrentConversationId(convos[0].id);
        }
      } else {
        // Start new conversation
        setCurrentConversationId("new");
        setMessages([]);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (conversationId === "new") {
      setMessages([]);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("player_tag", playerTag)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Filter messages for this conversation (by date)
      const filtered = data?.filter((msg: any) => {
        const msgDate = new Date(msg.created_at).toLocaleDateString();
        return msgDate === conversationId;
      }) || [];

      setMessages(filtered as Message[]);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId("new");
    setMessages([]);
  };

  const streamChat = async (userMessage: string) => {
    if (!userId) return;

    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;
    
    try {
      // Get the current user's session token for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error(t('coach.signInRequired'));
        return;
      }
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })).concat([
            { role: "user", content: userMessage }
          ]),
          playerTag,
          playerStats,
          recentMatches,
          savedDecks,
          cardMastery,
          achievements,
          cardCollection,
          language: i18n.language,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 401) {
          toast.error(t('coach.sessionExpired'));
          return;
        }
        if (resp.status === 429) {
          toast.error(t('coach.rateLimitExceeded'));
          return;
        }
        if (resp.status === 402) {
          toast.error(t('coach.creditsExhausted'));
          return;
        }
        throw new Error("Failed to start stream");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      const tempId = `temp-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: tempId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString()
      }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg?.id === tempId) {
                  lastMsg.content = assistantContent;
                }
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save to database
      if (assistantContent) {
        const { data: assistantMsg, error: assistantError } = await supabase
          .from("chat_messages")
          .insert({
            player_tag: playerTag,
            user_id: userId,
            role: "assistant",
            content: assistantContent,
          })
          .select()
          .single();

        if (!assistantError && assistantMsg) {
          setMessages(prev => {
            const newMessages = prev.filter(m => m.id !== tempId);
            return [...newMessages, assistantMsg as Message];
          });
          
          // Refresh conversations list
          loadConversations();
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      toast.error(t('coach.failedToGetResponse'));
      setMessages(prev => prev.filter(m => !m.id.startsWith("temp-")));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !userId) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const { data: userMsg, error: userError } = await supabase
        .from("chat_messages")
        .insert({
          player_tag: playerTag,
          user_id: userId,
          role: "user",
          content: userMessage,
        })
        .select()
        .single();

      if (userError) throw userError;

      setMessages(prev => [...prev, userMsg as Message]);
      
      // If this is a new conversation, update the conversation ID
      if (currentConversationId === "new") {
        const newDate = new Date().toLocaleDateString();
        setCurrentConversationId(newDate);
      }
      
      await streamChat(userMessage);
    } catch (error) {
      console.error("Send error:", error);
      toast.error(t('coach.failedToSend'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-full md:w-[500px] z-50",
        "bg-background border-l border-border",
        "transform transition-transform duration-300 ease-in-out",
        "shadow-2xl",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-rajdhani font-bold text-lg text-foreground">{t('coach.title')}</h2>
              <p className="text-xs text-muted-foreground">{t('coach.panelDescription')}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs: Active Chat & Recent Chats */}
        <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger 
              value="chat" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-rajdhani"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('coach.activeChat')}
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-rajdhani"
            >
              {t('coach.recentChats')}
            </TabsTrigger>
          </TabsList>

          {/* Active Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col m-0 min-h-0">
            <div className="flex-1 flex flex-col min-h-0 p-4">
              {loadingHistory ? (
                <DataLoader context="coach" variant="inline" customMessage={t('coach.loadingHistory')} />
              ) : (
                <>
                  <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {/* Match Context Card */}
                      {matchContext && (
                        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Swords className="h-4 w-4 text-primary" />
                            <span className="font-rajdhani font-semibold text-sm">{t('coach.discussingMatch')}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className={cn(
                              "font-bold",
                              matchContext.isWin ? "text-green-500" : "text-red-500"
                            )}>
                              {matchContext.isWin ? t('coach.victory') : t('coach.defeat')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Crown className="h-3 w-3" />
                              {matchContext.playerCrowns} - {matchContext.opponentCrowns}
                            </span>
                            <span>{matchContext.battle.gameMode.name}</span>
                          </div>
                        </div>
                      )}
                      
                      {messages.length === 0 && !matchContext && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bot className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                          <p className="font-rajdhani text-lg">{t('coach.emptyStateTitle')}</p>
                          <p className="text-sm mt-2">{t('coach.emptyStateSubtitle')}</p>
                        </div>
                      )}
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-3 animate-slide-up",
                            msg.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[80%] rounded-lg px-4 py-3",
                              msg.role === "user"
                                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                                : "bg-card border border-border"
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          </div>
                          {msg.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-accent" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2 mt-4">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      placeholder={t('coach.inputPlaceholder')}
                      disabled={isLoading}
                      className="flex-1 bg-input border-border/50 focus:border-primary"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className="bg-gradient-primary hover:shadow-glow"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Recent Chats Tab */}
          <TabsContent value="history" className="flex-1 m-0 p-4 overflow-auto">
            <div className="space-y-3">
              <Button
                onClick={startNewConversation}
                className="w-full justify-start bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('coach.startNewConversation')}
              </Button>

              {conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-sm">{t('coach.noRecentConversations')}</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <Card
                    key={conv.id}
                    onClick={() => setCurrentConversationId(conv.id)}
                    className={cn(
                      "p-4 cursor-pointer transition-all hover:shadow-md",
                      currentConversationId === conv.id && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-rajdhani font-semibold text-sm text-foreground truncate">
                          {conv.title}
                        </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                          {t('coach.messageCount', { count: conv.message_count })}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(conv.last_message_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
