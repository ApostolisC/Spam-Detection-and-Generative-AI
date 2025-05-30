import { useState } from "react";

export interface Message {
    id: string;
    title: string | null;
    sender: "scammer" | "user";
    text: string;
    timestamp: number;
  }
export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
  }

// Removed useState; manage conversations via localStorage or from a React component.


export const saveConversation = (conv: Conversation) => {
  localStorage.setItem(`conv:${conv.id}`, JSON.stringify(conv));
};

export const loadConversation = (id: string): Conversation | null => {
  const item = localStorage.getItem(`conv:${id}`);
  return item ? JSON.parse(item) : null;
};



export const createConversation = (title: string | null, message: Message | null) => {
  console.log("Creating new conversation...");
  // Load all conversations from localStorage
  const keys = Object.keys(localStorage).filter((key) => key.startsWith("conv:"));
  const newConv: Conversation = {
    id: Date.now().toString(),
    title: title || `Conversation ${keys.length + 1}`,
    messages: message ? [message] : [],
  };
  saveConversation(newConv);
  return newConv;
};