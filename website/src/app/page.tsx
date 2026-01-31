import Link from "next/link";
import { ArrowRight, BookOpen, Layers } from "lucide-react";
import Search from "@/components/Search";
import topicsData from "@/data/topics.json";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F1117] text-white selection:bg-purple-500/30">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-indigo-900/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-24 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            Runbooks Knowledgebase v2.0
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Engineering <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Excellence</span>
          </h1>

          <p className="max-w-2xl text-lg text-gray-400 leading-relaxed">
            The single source of truth for operational procedures, troubleshooting guides,
            and system documentation. Built for high-velocity teams.
          </p>

          <div className="w-full max-w-md pt-4">
            <Search />
          </div>
        </div>

        {/* Topics Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              Available Topics
            </h2>
            <span className="text-sm text-gray-500">{topicsData.length} topics indexed</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topicsData.map((topic) => (
              <Link
                key={topic.slug}
                href={`/topics/${topic.slug}`}
                className="group relative p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-900/20"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                  <ArrowRight className="w-5 h-5 text-purple-400" />
                </div>

                <div className="h-10 w-10 mb-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-5 h-5 text-purple-300" />
                </div>

                <h3 className="text-xl font-semibold mb-2 group-hover:text-purple-200 transition-colors">
                  {topic.title}
                </h3>

                <p className="text-sm text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                  {topic.summary || "No summary available."}
                </p>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {topic.files.slice(0, 3).map((file: any) => (
                    <span
                      key={file.filename}
                      className="px-2 py-1 text-[10px] uppercase tracking-wider font-medium rounded-md bg-white/5 text-gray-400 border border-white/5"
                    >
                      {file.type}
                    </span>
                  ))}
                  {topic.files.length > 3 && (
                    <span className="px-2 py-1 text-[10px] text-gray-500">+{topic.files.length - 3} more</span>
                  )}
                </div>
              </Link>
            ))}

            {topicsData.length === 0 && (
              <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl">
                <p className="text-gray-500">No topics found. Add a folder with a README.md to get started.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
