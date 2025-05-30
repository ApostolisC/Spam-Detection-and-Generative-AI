  "use client";

  import { useState, useEffect, useRef } from "react";
  import { Button } from "@/components/ui/button";
  import { Textarea } from "@/components/ui/textarea";
  import { Card } from "@/components/ui/card";
  import { Trash2, Pencil } from "lucide-react";

  import { Conversation, Message } from "@/lib/storage";
  import { createConversation } from "@/lib/storage"; // Assuming this function is defined in your storage lib

  export default function Page() {
    const [serverConnected, setServerConnected] = useState<boolean | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [editedTitle, setEditedTitle] = useState<string>("");

    const [scammerText, setScammerText] = useState("");
    const [userReplyText, setUserReplyText] = useState("");

    const messageEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      /**
       * Checks the connection to the backend server by sending a ping request.
       * Updates the `serverConnected` state based on the server's response.
       * If the server responds with a successful status, sets `serverConnected` to true.
       * If the request fails or the server is unreachable, sets `serverConnected` to false.
       *
       * @async
       * @function
       * @returns {Promise<void>} A promise that resolves when the server check is complete.
       */
      const checkServer = async () => {
        try {
          const res = await fetch("http://localhost:8000/api/ping");
          setServerConnected(res.ok);
        } catch {
          setServerConnected(false);
        }
      };
      checkServer();
      const interval = setInterval(checkServer, 5000);
      return () => clearInterval(interval);
    }, []);

    useEffect(() => {
      const loadFromStorage = () => {
        const saved = localStorage.getItem("conversations");
        if (saved) setConversations(JSON.parse(saved));
      };

      loadFromStorage(); // initial load

      // Listen for changes from other pages
      const handleStorage = (e: StorageEvent) => {
        if (e.key === "conversations") {
          loadFromStorage();
        }
      };

      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }, []);

    useEffect(() => {
      localStorage.setItem("conversations", JSON.stringify(conversations));
    }, [conversations]);

    useEffect(() => {
      if (messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, [conversations]);


    const createConversationFunction = () => {
      const newConv = createConversation(null, null);
      setConversations((prev) => [...prev, newConv]);
      setSelectedConvId(newConv.id);
      setEditingTitleId(newConv.id);
      setEditedTitle(newConv.title);
    };

    const deleteConversation = (id: string) => {
      const confirmed = confirm("Are you sure you want to delete this conversation?");
      if (confirmed) {
        setConversations(conversations.filter((c) => c.id !== id));
        if (selectedConvId === id) setSelectedConvId(null);
      }
    };

    const renameConversation = (id: string) => {
      const newTitle = editedTitle.trim();
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle || c.title } : c))
      );
      setEditingTitleId(null);
    };

    const selectedConversation = conversations.find((c) => c.id === selectedConvId);

    const addMessage = (sender: "scammer" | "user", text: string) => {
      if (!selectedConvId || !text.trim()) return;

      const newMessage: Message = {
        id: Date.now().toString(),
        sender,
        text,
        timestamp: Date.now(),
        title: null
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConvId
            ? { ...conv, messages: [...conv.messages, newMessage] }
            : conv
        )
      );
    };

    const handleScammerSubmit = () => {
      addMessage("scammer", scammerText);
      setScammerText("");
      setUserReplyText("");
    };

    const handleUserReplySubmit = () => {
      addMessage("user", userReplyText);
      setUserReplyText("");
    };

    const generateReply = async () => {
      if (!selectedConvId || !scammerText.trim()) return;
      try {
        const res = await fetch("http://localhost:8000/api/generate-reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: scammerText }),
        });
        if (!res.ok) throw new Error("Failed to generate reply");
        const data = await res.json();
        setUserReplyText(data.reply || "(No reply generated)");
      } catch (error) {
        console.error("Error generating reply:", error);
        setUserReplyText("(Error generating reply)");
      }
    };

    
    return (
      <main className="flex min-h-9/10 bg-gray-100 p-6">
        {/* Sidebar */}
        <aside className="w-64 bg-white p-4 border-r border-gray-300">
          <h2 className="text-lg font-bold mb-4">Conversations</h2>
          <Button onClick={createConversationFunction} className="mb-4 w-full">
            + New Conversation
          </Button>
          <ul>
            {conversations.map((conv) => (
              <li
                key={conv.id}
                className={`group relative cursor-pointer p-2 rounded flex items-center justify-between ${
                  conv.id === selectedConvId
                    ? "bg-blue-200 font-semibold"
                    : "hover:bg-gray-200"
                }`}
              >
                {editingTitleId === conv.id ? (
                  <input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={() => renameConversation(conv.id)}
                    onKeyDown={(e) => e.key === "Enter" && renameConversation(conv.id)}
                    autoFocus
                    className="flex-1 p-1 border rounded text-sm"
                  />
                ) : (
                  <span
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setEditedTitle(conv.title);
                    }}
                    className="flex-1 truncate"
                  >
                    {conv.title}
                  </span>
                )}
                <div className="flex gap-1 ml-2">
                  <Pencil
                    className="w-4 h-4 text-gray-500 hover:text-blue-600"
                    onClick={() => {
                      setEditingTitleId(conv.id);
                      setEditedTitle(conv.title);
                    }}
                  />
                  <Trash2
                    className="w-4 h-4 text-red-500 hover:text-red-700"
                    onClick={() => deleteConversation(conv.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
          {conversations.length === 0 && (
            <p className="text-sm text-gray-500 text-center mt-4">No conversations yet.</p>
          )}
        </aside>

        {/* Main Content */}
        <section className="flex-1 max-w-[1200px] mx-auto flex flex-col w-full">
          <Card className="bg-white p-6 flex-1 flex flex-col">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Email Conversation</h1>
              <p className="text-sm text-gray-500">Scammer & reply message flow</p>
              {(() => {
                let serverStatus;
                if (serverConnected === null) {
                  serverStatus = "Checking...";
                } else if (serverConnected) {
                  serverStatus = "Connected ✅";
                } else {
                  serverStatus = "Disconnected ❌";
                }
                return (
                  <div className="flex justify-center items-center mt-2 text-sm">
                    <span className="mr-2 font-semibold">Server:</span>
                    <span
                      className={`px-2 py-1 rounded text-white ${
                        serverConnected === null
                          ? "bg-gray-400"
                          : serverConnected
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    >
                      {serverConnected === null ? "Checking..." : serverConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Message List */}
            <div
              className="flex-1 overflow-scroll max-h-90 border border-gray-300 p-4 mb-6 rounded bg-gray-50 space-y-4"
              style={{ minHeight: "200px" }}
            >
              {!selectedConversation ? (
                <p className="text-center text-gray-500">No conversation selected</p>
              ) : selectedConversation.messages.length === 0 ? (
                <p className="text-center text-gray-400 italic">No messages yet</p>
              ) : (
                selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.id ?? `${msg.timestamp}-${msg.title}`}
                    className={`w-full p-4 rounded shadow-sm whitespace-pre-wrap ${
                      msg.sender === "scammer"
                        ? "bg-red-100 text-red-900 border border-red-200"
                        : "bg-green-100 text-green-900 border border-green-200"
                    }`}
                  >
                    <p className="mb-2">{msg.text}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-semibold">Scammer Email</label>
                <Textarea
                  placeholder="Paste scammer email here..."
                  rows={4}
                  value={scammerText}
                  onChange={(e) => setScammerText(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handleScammerSubmit}
                    disabled={!scammerText.trim() || !selectedConvId}
                  >
                    Add Scammer Email
                  </Button>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Your Reply</label>
                <Textarea
                  placeholder="Write your reply here..."
                  rows={4}
                  value={userReplyText}
                  onChange={(e) => setUserReplyText(e.target.value)}
                />
                <div className="flex justify-between mt-2">
                  <Button onClick={generateReply} disabled={!selectedConvId || !scammerText.trim()}>
                    Generate Reply
                  </Button>
                  <Button
                    onClick={handleUserReplySubmit}
                    disabled={!userReplyText.trim() || !selectedConvId}
                  >
                    Add Your Reply
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        

      
      </main>
    );
  }
