"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { Textarea } from "./ui/textarea";
import { createConversation, saveConversation } from "@/lib/storage";
import { useRouter } from "next/navigation";

type FileRow = {
  name: string;
  path: string;
  preview: string;
  fullText?: string;
  status: "pending" | "spam" | "ham" | "error";
  confidence?: number;
  predicted_class?: number;
  probabilities?: number[];
};

export default function BatchImportPage() {
  const [loading, setLoading] = useState(false);
  const [fileRows, setFileRows] = useState<FileRow[]>([]);
  const [sortKey, setSortKey] = useState<keyof FileRow>("status");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedText, setSelectedText] = useState<string | null>(null);


  const [checkText, setCheckText] = useState("");
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const router = useRouter();
  
  const handleCheckSpam = async () => {
      if (!checkText.trim()) return;
      setChecking(true);
      try {
        const res = await fetch("http://localhost:8000/api/classify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: checkText }),
        });
        const data = await res.json();
        console.log("Spam check result:", data);
        if (!res.ok) throw new Error(data.error || "Failed to check spam");
        setCheckResult(data);
      } catch {
        setCheckResult(null);
      } finally {
        setChecking(false);
      }
    };


  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    const newRows: FileRow[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const content = await file.text();
      newRows.push({
        name: file.name,
        path: file.webkitRelativePath || file.name,
        preview: content.replace(/\s+/g, " ").substring(0, 100),
        fullText: content,
        status: "pending",
      });
    }

    setFileRows(newRows);
    setLoading(false);

    const batchSize = 10;
    for (let i = 0; i < newRows.length; i += batchSize) {
      const batch = newRows.slice(i, i + batchSize);
      await Promise.all(
        batch.map((file, idx) => classifyFile(i + idx, file.preview))
      );
    }
  };

  const classifyFile = async (index: number, content: string) => {
    try {
      const res = await fetch("http://localhost:8000/api/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to classify");

      setFileRows((prev) => {
        const updated = [...prev];
        updated[index].status = data.predicted_class ? "spam" : "ham";
        updated[index].confidence = data.probabilities
          ? Math.max(...data.probabilities)
          : 0;
        updated[index].predicted_class = data.predicted_class;
        updated[index].probabilities = data.probabilities;
        return updated;
      });
    } catch {
      setFileRows((prev) => {
        const updated = [...prev];
        updated[index].status = "error";
        return updated;
      });
    }
  };

  const handleCreateConversation = (file: FileRow) => {
    const message = {
      id: Date.now().toString() + Math.random(),
      title: file.preview.split("\n")[0] || file.name,
      sender: 'scammer' as const,
      text: file.fullText || "error",
      timestamp: Date.now(),
    };

    const conv = {
      id: Date.now().toString(),
      title: file.name,
      messages: [message],
    };

    // Save individual conv:* and update central index
    saveConversation(conv);

    // Also update main index list used by Conversations page
    const storedList = JSON.parse(localStorage.getItem("conversations") || "[]");
    localStorage.setItem("conversations", JSON.stringify([...storedList, conv]));
  };


  useEffect(() => {
    // Load existing conversations from localStorage on mount
    const keys = Object.keys(localStorage).filter((key) => key.startsWith("conv:"));
    const conversations = keys.map((key) => JSON.parse(localStorage.getItem(key)!));
    //setConversations(conversations);
  }, []);

  const handleAddAllSpam = () => {
    const spamEmails = fileRows.filter((f) => f.status === "spam");

    const storedList = JSON.parse(localStorage.getItem("conversations") || "[]");

    spamEmails.forEach((f) => {
      const message = {
        id: Date.now().toString() + Math.random(),
        title: f.preview.split("\n")[0] || f.name,
        sender: 'scammer' as const,
        text: f.fullText || "error",
        timestamp: Date.now(),
      };

      const conv = {
        id: Date.now().toString() + Math.random(),
        title: f.name,
        messages: [message],
      };

      saveConversation(conv);
      storedList.push(conv);
    });

    localStorage.setItem("conversations", JSON.stringify(storedList));
    window.dispatchEvent(new StorageEvent("storage", { key: "conversations" }));
  };


  const sortedRows = [...fileRows].sort((a, b) => {
    if (!a[sortKey] || !b[sortKey]) return 0;
    const valA = a[sortKey]!;
    const valB = b[sortKey]!;
    if (typeof valA === "string") {
      return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
    }
    return sortAsc ? +valA - +valB : +valB - +valA;
  });

  return (
    <main className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow mb-6 border border-gray-200 ">
        <h1 className="text-2xl font-bold mb-4">Spam Check Tool</h1>
        <p className="text-lg text-gray-600 mb-4">
          Use this tool to check if a single message is spam. Paste the message below and click "Check Spam".
        </p>
        <h2 className="text-lg font-bold mb-2">Single Message Spam Check</h2>
        <Textarea
          placeholder="Paste message here to check if it's spam..."
          rows={3}
          value={checkText}
          onChange={(e) => setCheckText(e.target.value)}
          
        />
        <div className="flex items-center gap-2 mt-4">
          <Button onClick={handleCheckSpam} disabled={checking || !checkText.trim()}>
            {checking ? "Checking..." : "Check Spam"}
          </Button>

        </div>

        {checkResult && (
          <div className="mt-4 p-4 bg-gray-50 border rounded">
            <h3 className="font-semibold mb-2">Check Result</h3>
            <p>
              <span className="font-bold">Predicted Class:</span>{" "}
              {checkResult.predicted_class === 1 ? (
          <span className="text-red-600 font-semibold inline-flex items-center">
            🚩 Spam
          </span>
              ) : (
          <span className="text-green-600 font-semibold inline-flex items-center">
            ✅ Ham
          </span>
              )}
            </p>
            <p>
              <span className="font-bold">Confidence:</span>{" "}
              <span
          className={
            checkResult.confidence < 0.5
              ? "text-red-600"
              : checkResult.confidence < 0.7
              ? "text-orange-600"
              : checkResult.confidence < 0.9
              ? "text-yellow-600"
              : "text-green-600"
          }
              >
          {(checkResult.confidence * 100).toFixed(2)}%
              </span>
            </p>
            {checkResult.probabilities && (
              <p>
          <span className="font-bold">Probabilities:</span>{" "}
          <span className="text-gray-700">
            {checkResult.probabilities
              .map(
                (p: number, idx: number) =>
            `${idx === 1 ? "Spam" : "Ham"}: ${
              p < 0.5
                ? "🔴"
                : p < 0.7
                ? "🟠"
                : p < 0.9
                ? "🟡"
                : "🟢"
            } ${(p * 100).toFixed(2)}%`
              )
              .join(", ")}
          </span>
              </p>
            )}
          </div>
        )}
        
      </div>

      {/* Batch Email Import Section */}
      <div className="max-w-7xl mx-auto bg-white p-6 rounded shadow mb-6 border border-gray-200">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 text-center">Batch Email Import</h1>

        <p className="text-lg text-gray-600 mb-4">
          Select a folder containing files with email contents to classify them as spam or ham. The tool will read the files and classify them automatically.
          <br />
        </p>

        <div className="mb-6">
          <input
            type="file"
            webkitdirectory="true"
            multiple
            onChange={handleFiles}
            className="text-sm file:mr-4 file:py-2 file:px-4 file:border file:border-gray-300 file:rounded file:bg-white file:font-semibold file:text-gray-700 hover:file:bg-gray-100"
          />
        </div>

        {loading && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-2">
            <Loader2 className="animate-spin w-4 h-4" />
            <span>Reading files...</span>
          </div>
        )}

        {!loading && fileRows.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-2">
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleAddAllSpam}>
                Add All Spam Emails to Conversations
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm bg-white shadow rounded">
                <thead>
                  <tr className="bg-gray-200">
                    {["File", "Preview", "Status", "Confidence", "Actions"].map((title, i) => (
                      <th
                        key={i}
                        className="border px-2 py-1 text-left cursor-pointer"
                        onClick={() => {
                          const keys: (keyof FileRow)[] = ["path", "preview", "status", "confidence"];
                          setSortKey(keys[i] || "status");
                          setSortAsc((asc) => !asc);
                        }}
                      >
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((file, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">{file.path}</td>
                      <td className="border px-2 py-1 truncate max-w-xs">{file.preview}</td>
                      <td className="border px-2 py-1 font-medium">
                        {file.status === "spam" ? (
                          <span className="text-red-600">Spam</span>
                        ) : file.status === "ham" ? (
                          <span className="text-green-600">Ham</span>
                        ) : file.status === "pending" ? (
                          <Loader2 className="animate-spin w-4 h-4 inline-block text-gray-500" />
                        ) : (
                          <span className="text-orange-600">Error</span>
                        )}
                      </td>
                      <td className="border px-2 py-1">
                          {file.confidence !== undefined ? (
                              <span
                              className={`font-semibold ${
                                  file.confidence < 0.5
                                  ? "text-red-600"
                                  : file.confidence < 0.7
                                  ? "text-orange-600"
                                  : file.confidence < 0.9
                                  ? "text-yellow-600"
                                  : "text-green-600"
                              }`}
                              >
                              {(file.confidence * 100).toFixed(2)}%
                              </span>
                          ) : (
                              "-"
                          )}
                      </td>
                      <td className="border px-2 py-1 flex gap-2">
                        <Button
                          onClick={() => handleCreateConversation(file)}
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={file.status === "pending" || file.status === "error"}
                        >
                          Create Conversation
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedText(file.fullText || "No content")}
                        >
                          View Context
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Context Modal */}
        <Dialog open={!!selectedText} onClose={() => setSelectedText(null)} className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4 bg-gray-800 bg-opacity-50">
            <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <Dialog.Title className="text-lg font-bold mb-4">Email Context</Dialog.Title>

              <div className="mb-4">
                <span className="font-semibold">Selected File:</span> {fileRows.find(f => f.fullText === selectedText)?.name || "Unknown"}
              </div>
              <div className="mb-4">
                  <span className="font-semibold">Class:</span>
                  <span className={`ml-1 ${fileRows.find(f => f.fullText === selectedText)?.predicted_class ? "text-red-600" : "text-green-600"}`}>
                      {fileRows.find(f => f.fullText === selectedText)?.predicted_class ? "Spam" : "Ham"}
                  </span>

              </div>
              <div className="mb-4">
                  <span className="font-semibold">Confidence:</span>
                  <span className={`ml-1 ${fileRows.find(f => f.fullText === selectedText)?.confidence ? 
                      (fileRows.find(f => f.fullText === selectedText)?.confidence! < 0.5 ? "text-red-600" : 
                      fileRows.find(f => f.fullText === selectedText)?.confidence! < 0.7 ? "text-orange-600" : 
                      fileRows.find(f => f.fullText === selectedText)?.confidence! < 0.9 ? "text-yellow-600" : "text-green-600") : ""}`}>
                      {fileRows.find(f => f.fullText === selectedText)?.confidence ? 
                          `${(fileRows.find(f => f.fullText === selectedText)?.confidence! * 100).toFixed(2)}%` : "-"}
                  </span>
              </div>

              <div className="text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto text-gray-800 bg-gray-200 p-4 rounded">    
                {selectedText}
              </div>
              <div className="mt-4 text-right">
                <Button onClick={() => setSelectedText(null)}>Close</Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
        
      </div>
    </main>
  );
}
