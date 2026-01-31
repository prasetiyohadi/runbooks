import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { getContent } from "@/lib/content";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import Search from "@/components/Search";
import CodeBlock from "@/components/CodeBlock";

import topics from "@/data/topics.json";

export const dynamicParams = false;


export async function generateStaticParams() {
    const params: { slug: string; category: string }[] = [];

    topics.forEach((topic: any) => {
        topic.files.forEach((file: any) => {
            if (file.type !== 'README') {
                params.push({ slug: topic.slug, category: file.slug });
            }
        });
    });

    return params;
}



export async function generateMetadata({ params }: { params: Promise<{ slug: string; category: string }> }) {
    const { slug, category } = await params;
    const data = await getContent(slug, category);

    if (!data) {
        return {
            title: 'Content Not Found',
        }
    }

    return {
        title: `${data.title} | ${slug.charAt(0).toUpperCase() + slug.slice(1)} | Runbooks`,
        description: `Documentation for ${data.title} in ${slug} topic.`,
    }
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string; category: string }> }) {
    const { slug, category } = await params;
    const data = await getContent(slug, category);

    if (!data) {
        return <div className="p-20 text-center text-white">Content not found</div>;
    }

    return (
        <div className="min-h-screen bg-[#0F1117] text-white">
            <header className="sticky top-0 z-50 bg-[#0F1117]/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Link href="/" className="hover:text-white transition-colors"><Home className="w-4 h-4" /></Link>
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                        <Link href={`/topics/${slug}`} className="hover:text-white transition-colors capitalize">{slug}</Link>
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                        <span className="text-purple-400 capitalize">{category}</span>
                    </div>

                    <div className="w-64">
                        <Search />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12 flex gap-12">
                <article className="flex-1 min-w-0">
                    <div className="mb-8 pb-8 border-b border-white/10">
                        <h1 className="text-4xl font-bold mb-4 tracking-tight capitalize">{data.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{category.toUpperCase()}</span>
                            <span>Last updated: {new Date().toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="prose prose-invert max-w-none 
            prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-gray-100 prose-headings:mt-6 prose-headings:mb-3
            prose-p:leading-normal prose-p:my-3
            prose-li:my-0.5
            prose-a:text-purple-400 prose-a:font-medium prose-a:no-underline hover:prose-a:!no-underline 
            prose-a:border-b prose-a:border-transparent hover:prose-a:border-purple-400 prose-a:transition-colors
            [&_:is(h1,h2,h3,h4,h5,h6)_a]:border-none [&_:is(h1,h2,h3,h4,h5,h6)_a]:!no-underline
            prose-pre:bg-transparent prose-pre:border-none prose-pre:p-0 prose-pre:m-0
            prose-code:before:content-none prose-code:after:content-none
            [&_pre_code]:grid [&_pre_code]:min-w-full
            prose-blockquote:border-l-purple-500 prose-blockquote:bg-purple-500/5 prose-blockquote:px-6 prose-blockquote:py-2 prose-blockquote:rounded-r-lg prose-blockquote:my-4
            prose-table:border-collapse prose-table:border prose-table:border-white/10 prose-table:my-4
            prose-th:bg-white/5 prose-th:p-2 prose-th:text-left prose-th:border prose-th:border-white/10 prose-th:text-sm
            prose-td:p-2 prose-td:border prose-td:border-white/10 prose-td:text-sm
            prose-code:text-pink-300 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:text-sm
          ">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[
                                rehypeHighlight,
                                rehypeSlug,
                                [rehypeAutolinkHeadings, { behavior: 'wrap' }]
                            ]}
                            components={{
                                // Custom renderer for alerts if raw HTML/GFM alerts used
                                blockquote: ({ node, children, ...props }) => {
                                    return <blockquote {...props}>{children}</blockquote>
                                },
                                pre: ({ children, ...props }) => (
                                    <CodeBlock {...props}>{children}</CodeBlock>
                                ),
                                img: (props) => {
                                    let src = props.src;
                                    if (typeof src === 'string' && (src.startsWith('assets/') || src.startsWith('./assets/'))) {
                                        const cleanSrc = src.replace(/^\.?\/?assets\//, '');
                                        // Use public/images/topics/[slug]/assets
                                        src = `/images/topics/${slug}/assets/${cleanSrc}`;
                                    }
                                    return <img {...props} src={src} className="rounded-lg border border-white/10 my-4 max-w-full h-auto" />;
                                }
                            }}
                        >
                            {data.content}
                        </ReactMarkdown>
                    </div>
                </article>
            </main>
        </div>
    );
}
