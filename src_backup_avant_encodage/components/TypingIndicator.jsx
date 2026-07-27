/**
 * Indicateur "en train d'écrire..." pour le chat
 */

import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";

// Store temporaire pour les états de typing
const typingStates = new Map();

export const useTypingIndicator = (conversationId, userId) => {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  let typingTimeout = null;

  // Envoyer l'événement "typing"
  const sendTyping = async () => {
    if (!conversationId || !userId) return;

    try {
      // Créer une notification temporaire de typing
      const key = `${conversationId}_${userId}`;
      typingStates.set(key, Date.now());

      // Diffuser aux autres participants
      window.dispatchEvent(new CustomEvent('user-typing', {
        detail: { conversationId, userId, timestamp: Date.now() }
      }));

      // Auto-expiration après 3 secondes
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        stopTyping();
      }, 3000);
    } catch (error) {
      console.error('Erreur envoi typing:', error);
    }
  };

  const stopTyping = () => {
    if (!conversationId || !userId) return;
    const key = `${conversationId}_${userId}`;
    typingStates.delete(key);
    
    window.dispatchEvent(new CustomEvent('user-stopped-typing', {
      detail: { conversationId, userId }
    }));
  };

  // Écouter les événements de typing des autres
  useEffect(() => {
    if (!conversationId) return;

    const handleTyping = (e) => {
      const { conversationId: eventConvId, userId: eventUserId, timestamp } = e.detail;
      
      if (eventConvId === conversationId && eventUserId !== userId) {
        setTypingUsers(prev => {
          if (!prev.includes(eventUserId)) {
            return [...prev, eventUserId];
          }
          return prev;
        });

        // Auto-suppression après 4 secondes
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== eventUserId));
        }, 4000);
      }
    };

    const handleStopTyping = (e) => {
      const { conversationId: eventConvId, userId: eventUserId } = e.detail;
      
      if (eventConvId === conversationId) {
        setTypingUsers(prev => prev.filter(id => id !== eventUserId));
      }
    };

    window.addEventListener('user-typing', handleTyping);
    window.addEventListener('user-stopped-typing', handleStopTyping);

    return () => {
      window.removeEventListener('user-typing', handleTyping);
      window.removeEventListener('user-stopped-typing', handleStopTyping);
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [conversationId, userId]);

  return {
    isOtherUserTyping: typingUsers.length > 0,
    typingUsers,
    sendTyping,
    stopTyping
  };
};

export const TypingIndicator = ({ show, userName }) => {
  if (!show) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-stone-500">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{userName || 'Quelqu\'un'} est en train d'écrire...</span>
    </div>
  );
};