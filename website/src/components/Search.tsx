"use client";

import { Search as SearchIcon, X, FileText, Book, Briefcase, Layers, Lightbulb } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import searchIndex from "@/data/search-index.json";

type SearchResult = {
    title: string;
    path: string;
    category: string;
    keywords: string;
    excerpt: string;
};

export default function Search() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");

    const filteredResults = useMemo(() => {
        if (!query) return [];
        const lowerQuery = query.toLowerCase();
        return (searchIndex as SearchResult[])
            .filter((item) =>
                item.title.toLowerCase().includes(lowerQuery) ||
                item.keywords.toLowerCase().includes(lowerQuery)
            )
            .slice(0, 10);
    }, [query]);

    // Cmd+K to toggle
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const getIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case "runbook": return <FileText className="w-4 h-4 text-blue-400" />;
            case "workshop": return <Book className="w-4 h-4 text-green-400" />;
            case "business": return <Briefcase className="w-4 h-4 text-purple-400" />;
            case "concept": return <Lightbulb className="w-4 h-4 text-yellow-400" />;
            default: return <Layers className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-sm text-gray-300 transition-colors w-full max-w-md backdrop-blur-md"
            >
                <SearchIcon className="w-4 h-4" />
                <span className="flex-1 text-left">Search documentation...</span>
                <kbd className="hidden sm:inline-block px-2 py-0.5 bg-black/20 rounded text-xs text-gray-400 font-mono">⌘K</kbd>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className="relative w-full max-w-2xl bg-[#0F1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center border-b border-white/10 px-4 py-3">
                                <SearchIcon className="w-5 h-5 text-gray-400 mr-3" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search topics, runbooks, guides..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
                                />
                                <button onClick={() => setIsOpen(false)}>
                                    <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                                </button>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto p-2">
                                {filteredResults.length > 0 ? (
                                    <ul className="space-y-1">
                                        {filteredResults.map((result) => (
                                            <li key={result.path}>
                                                <Link
                                                    href={result.path}
                                                    onClick={() => setIsOpen(false)}
                                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                                                >
                                                    <div className="mt-1 p-1 bg-white/5 rounded-md group-hover:bg-white/10 transition-colors">
                                                        {getIcon(result.category)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-gray-200">{result.title}</span>
                                                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
                                                                {result.category}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{result.excerpt}</p>
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        {query ? "No results found." : "Type to search..."}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
