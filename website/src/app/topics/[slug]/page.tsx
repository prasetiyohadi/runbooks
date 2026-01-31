import Link from "next/link";
import { ArrowLeft, FileText, Book, Briefcase, ChevronRight, Layers, Lightbulb } from "lucide-react";
import { getTopic, getContent } from "@/lib/content";
import Search from "@/components/Search";
import ReactMarkdown from "react-markdown";

export async function generateStaticParams() {
    const topics = require("@/data/topics.json");
    return topics.map((t: any) => ({ slug: t.slug }));
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const topic = await getTopic(slug);

    // Try to get README content for overview
    const readme = await getContent(slug, 'readme');

    if (!topic) {
        return <div className="p-20 text-center text-white">Topic not found</div>;
    }

    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case "runbook": return <FileText className="w-6 h-6 text-blue-400" />;
            case "workshop": return <Book className="w-6 h-6 text-green-400" />;
            case "business": return <Briefcase className="w-6 h-6 text-purple-400" />;
            case "concept": return <Lightbulb className="w-6 h-6 text-yellow-400" />;
            default: return <Layers className="w-6 h-6 text-gray-400" />;
        }
    };

    const getColor = (type: string) => {
        switch (type.toLowerCase()) {
            case "runbook": return "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/50";
            case "workshop": return "bg-green-500/10 border-green-500/20 hover:border-green-500/50";
            case "business": return "bg-purple-500/10 border-purple-500/20 hover:border-purple-500/50";
            case "concept": return "bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/50";
            default: return "bg-gray-500/10 border-gray-500/20 hover:border-gray-500/50";
        }
    };

    return (
        <div className="min-h-screen bg-[#0F1117] text-white">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-900/10 blur-[100px] rounded-full" />
            </div>

            <header className="sticky top-0 z-50 bg-[#0F1117]/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Knowledgebase</span>
                    </Link>
                    <div className="w-64">
                        <Search />
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
                <div className="mb-12">
                    <div className="flex items-center gap-2 text-sm text-purple-400 mb-4">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">Topic Hub</span>
                    </div>
                    <h1 className="text-5xl font-bold mb-6 tracking-tight">{topic.title}</h1>

                    {/* README/Overview Content - First 500 chars or summary */}
                    <div className="prose prose-invert prose-lg max-w-none text-gray-300">
                        {readme ? (
                            <ReactMarkdown components={{ h1: () => null }}>{readme.content.split('##')[0] || readme.content}</ReactMarkdown> // Show intro only roughly
                        ) : (
                            <p>{topic.summary}</p>
                        )}
                    </div>
                </div>

                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-gray-400" />
                    Documentation Modules
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {topic.files.map((file: any) => {
                        if (file.type === 'README') return null; // Already shown in overview

                        return (
                            <Link
                                key={file.filename}
                                href={file.path}
                                className={`group relative p-6 border rounded-xl transition-all duration-300 ${getColor(file.type)}`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                                        {getIcon(file.type)}
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                                </div>

                                <h3 className="text-xl font-semibold mb-2 capitalize">{file.type}</h3>
                                <p className="text-sm text-gray-400">
                                    Open the {file.type} documentation for {topic.title}.
                                </p>
                            </Link>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
