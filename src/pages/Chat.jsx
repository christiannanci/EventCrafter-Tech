import React, { useState, useEffect, useRef } from 'react';
import { base44, supabase } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, MessageSquare, Loader2, FileText } from "lucide-react";
import { useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import ContractManager from '@/components/dashboard/ContractManager';
import { useTypingIndicator, TypingIndicator } from '@/components/TypingIndicator';
import { NotificationService } from '@/components/NotificationService';

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [relatedBooking, setRelatedBooking] = useState(null);
  const [participantNames, setParticipantNames] = useState({});
  const scrollRef = useRef(null);

  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollable-messages::-webkit-scrollbar {
        width: 8px;
      }
      .scrollable-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      .scrollable-messages::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
      .scrollable-messages::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialConvId = searchParams.get('conversationId');
  const targetUserId = searchParams.get('userId');
  const { toast } = useToast();

  const { isOtherUserTyping, sendTyping, stopTyping } = useTypingIndicator(
    activeConversation?.id,
    currentUser?.id
  );

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        let myConvs = [];
        try {
          const allConvs = await base44.entities.Conversation.list('-last_message_at');
          myConvs = allConvs.filter(c => c.participants && c.participants.includes(user.id)).slice(0, 20);
          myConvs.sort((a, b) => new Date(b.last_message_at || b.updated_date) - new Date(a.last_message_at || a.updated_date));
        } catch (convError) {
          console.warn("Could not load conversations:", convError);
          myConvs = [];
        }
        setConversations(myConvs);

        let allUsers = [];
        let allVendorProfiles = [];
        let allClientProfiles = [];

        try {
          allUsers = await base44.entities.User.list();
        } catch (e) { console.warn("Could not load users:", e); }

        try {
          allVendorProfiles = await base44.entities.VendorProfile.list();
        } catch (e) { console.warn("Could not load vendor profiles:", e); }

        try {
          allClientProfiles = await base44.entities.ClientProfile.list();
        } catch (e) { console.warn("Could not load client profiles:", e); }

        const names = {};
        myConvs.forEach(conv => {
          const otherUserId = conv.participants?.find(id => id !== user.id);
          if (otherUserId) {
            const otherUser = allUsers.find(u => u.id === otherUserId);
            const vendorProfile = allVendorProfiles.find(p => p.user_id === otherUserId);
            const clientProfile = allClientProfiles.find(p => p.user_id === otherUserId);

            if (vendorProfile?.business_name) {
              names[otherUserId] = vendorProfile.business_name;
            } else if (clientProfile?.first_name || clientProfile?.last_name) {
              names[otherUserId] = `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim();
            } else if (otherUser?.full_name) {
              names[otherUserId] = otherUser.full_name;
            } else if (otherUser?.email) {
              names[otherUserId] = otherUser.email.split('@')[0];
            } else {
              names[otherUserId] = 'Utilisateur';
            }
          }
        });
        setParticipantNames(names);

        if (targetUserId) {
          let targetConv = myConvs.find(c =>
            c.participants && c.participants.includes(targetUserId)
          );

          if (!targetConv) {
            targetConv = await base44.entities.Conversation.create({
              participants: [user.id, targetUserId],
              last_message: "",
              last_message_at: new Date().toISOString()
            });
            setConversations([targetConv, ...myConvs]);
          }

          setActiveConversation(targetConv);
        } else if (initialConvId) {
          const target = myConvs.find(c => c.id === initialConvId);
          if (target) setActiveConversation(target);
        } else if (myConvs.length > 0) {
          setActiveConversation(myConvs[0]);
        }
      } catch (e) {
        console.error("Chat init error", e);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les conversations. Veuillez rafraîchir la page.",
          variant: "destructive"
        });
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [initialConvId, targetUserId]);

  useEffect(() => {
    if (!activeConversation) return;

    const fetchMessages = async () => {
      const msgs = await base44.entities.Message.filter({ conversation_id: activeConversation.id });
      msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      const recentMsgs = msgs.slice(-100);
      setMessages(recentMsgs);
      scrollToBottom();

      if (activeConversation.service_id && currentUser) {
        const bookings = await base44.entities.Booking.filter({ service_id: activeConversation.service_id });
        const userBooking = bookings.find(b =>
          b.planner_id === currentUser.id || b.created_by === currentUser.email
        );
        setRelatedBooking(userBooking || null);
      }
    };

    fetchMessages();

    const messageChannel = supabase
      .channel(`chat-${activeConversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message' }, (payload) => {
        const newMsg = payload.new;
        if (newMsg.conversation_id === activeConversation.id) {
          setMessages(prev => {
            const exists = prev.find(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          });
          setTimeout(scrollToBottom, 100);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [activeConversation, currentUser]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || !currentUser) return;

    const messageContent = newMessage;
    setNewMessage("");

    // Pas d'ajout optimiste : le message arrivera via le channel Realtime une fois confirme en base

    try {
      await base44.entities.Message.create({
        conversation_id: activeConversation.id,
        sender_id: currentUser.id,
        content: messageContent,
        read_status: "unread"
      });

      await base44.entities.Conversation.update(activeConversation.id, {
        last_message: messageContent,
        last_message_at: new Date().toISOString()
      });

      setConversations(prev => {
        const others = prev.filter(c => c.id !== activeConversation.id);
        return [{...activeConversation, last_message: messageContent, last_message_at: new Date().toISOString()}, ...others];
      });

      (async () => {
        try {
          const allUsers = await base44.entities.User.list();
          const otherParticipants = activeConversation.participants.filter(id => id !== currentUser.id);

          for (const recipientId of otherParticipants) {
            const messagePreview = messageContent.length > 50 ? messageContent.substring(0, 50) + "..." : messageContent;
            await NotificationService.send({
              userId: recipientId,
              title: "💬 Nouveau message",
              message: messagePreview,
              type: "message",
              link: `/Chat?conversationId=${activeConversation.id}`
            });
          }

          const admins = allUsers.filter(u => u.role === 'admin' && u.id !== currentUser.id);
          for (const admin of admins) {
            const messagePreview = messageContent.length > 50 ? messageContent.substring(0, 50) + "..." : messageContent;
            await NotificationService.send({
              userId: admin.id,
              title: "💬 Nouveau message",
              message: `${currentUser.full_name}: ${messagePreview}`,
              type: "message",
              link: `/Chat?conversationId=${activeConversation.id}`
            });
          }
        } catch (notifError) {
          console.error("Notification error:", notifError);
        }
      })();

    } catch (error) {
      console.error("Send failed", error);
      toast({
        title: "Échec de l'envoi",
        description: "Le message n'a pas pu être envoyé. Vérifiez votre connexion.",
        variant: "destructive",
        duration: 4000
      });
    }
  };

  const getOtherParticipantName = (conv) => {
    if (!currentUser || !conv.participants) return "Utilisateur";
    const otherUserId = conv.participants.find(id => id !== currentUser.id);
    return participantNames[otherUserId] || "Utilisateur";
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto px-4 py-8 h-[calc(100vh-80px)]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">

        <Card className="md:col-span-1 h-full border-stone-200 flex flex-col">
          <div className="p-4 border-b border-stone-100 bg-stone-50 rounded-t-lg">
            <h2 className="font-bold text-lg text-stone-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Messages
            </h2>
          </div>
          <ScrollArea className="flex-grow">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm">
                No conversations yet.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-stone-50 transition-colors",
                      activeConversation?.id === conv.id ? "bg-rose-50 hover:bg-rose-50" : ""
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-stone-900 text-sm">{getOtherParticipantName(conv)}</span>
                      {conv.last_message_at && (
                        <span className="text-[10px] text-stone-400">
                          {new Date(conv.last_message_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-1">
                      {conv.last_message || "Start chatting..."}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="md:col-span-2 h-full border-stone-200 flex flex-col">
          {activeConversation ? (
            <>
              <div className="p-4 border-b border-stone-100 bg-white rounded-t-lg flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-stone-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900">{getOtherParticipantName(activeConversation)}</h3>
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
                    </p>
                  </div>
                </div>
                {relatedBooking && (
                  <ContractManager
                    booking={relatedBooking}
                    currentUser={currentUser}
                    onUpdate={() => {}}
                  />
                )}
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <ScrollArea className="flex-1 p-4 bg-stone-50/50 scrollable-messages">
                  <div className="space-y-4">
                    {messages.map((msg, i) => {
                      const isMe = msg.sender_id === currentUser?.id;
                      return (
                        <div key={msg.id || i} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                            isMe ? "bg-rose-600 text-white rounded-tr-none" : "bg-white text-stone-800 border border-stone-100 rounded-tl-none"
                          )}>
                            {msg.content}
                            <div className={cn("text-[10px] mt-1 text-right", isMe ? "text-rose-200" : "text-stone-400")}>
                              {new Date(msg.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={scrollRef} />
                    <TypingIndicator
                      show={isOtherUserTyping}
                      userName={getOtherParticipantName(activeConversation)}
                    />
                  </div>
                </ScrollArea>
              </div>

              <div className="p-4 bg-white border-t border-stone-100 rounded-b-lg flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      if (e.target.value.length > 0) {
                        sendTyping();
                      } else {
                        stopTyping();
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        stopTyping();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-grow bg-stone-50 border-stone-200 focus-visible:ring-rose-500"
                  />
                  <Button type="submit" size="icon" className="bg-rose-600 hover:bg-rose-700">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-stone-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
