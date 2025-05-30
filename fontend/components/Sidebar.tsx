"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";

export type ConversationMeta = {
  id: string;
  title: string;
};

export default function Sidebar({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("conversations");
    if (stored) setConversations(JSON.parse(stored));
  }, []);

  const createConversation = () => {
    const newConv: ConversationMeta = {
      id: uuidv4(),
      title: `Conversation ${conversations.length + 1}`,
    };
    const updated = [...conversations, newConv];
    setConversations(updated);
    localStorage.setItem("conversations", JSON.stringify(updated));
    onSelect(newConv.id);
  };

  return (
    <aside className="w-64 bg-gray-200 h-screen p-4 border-r overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Conversations</h2>
      <Button className="w-full mb-4" onClick={createConversation}>
        + New Conversation
      </Button>
      <ul className="space-y-2">
        {conversations.map((conv) => (
          <li
            key={conv.id}
            className={`p-2 rounded cursor-pointer hover:bg-gray-300 ${
              selectedId === conv.id ? "bg-gray-300" : ""
            }`}
            onClick={() => onSelect(conv.id)}
          >
            {conv.title}
          </li>
          
        ))}
      </ul>
      {conversations.length === 1 && (
        <p className="text-sm text-gray-500 text-center mt-4">No conversations yet.</p>
      )}
    </aside>
  );
}