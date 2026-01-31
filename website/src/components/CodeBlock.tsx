"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = async () => {
        if (!children) return;

        // Extract text from ReactNode if possible, simpler for string children
        let textToCopy = "";

        if (typeof children === "string") {
            textToCopy = children;
        } else if (Array.isArray(children)) {
            textToCopy = children.map(child => typeof child === 'string' ? child : '').join('');
        } else if (typeof children === 'object' && children !== null && 'props' in children) {
            // @ts-ignore - simplistic handling for nested code/spans
            textToCopy = (children as any).props.children?.toString() || "";
        }

        // Ideally, we get the raw text passed to <code />
        // But for rehype-highlight, children might be structured specific spans.
        // A safer way for pure text copy in this context is often grabbing ref.
        // For now, let's try reading the textContent from a ref if we can, or just simple string if simple.
        // Actually, preventing complex parsing issues, let's just use the `navigator.clipboard` on the parent ref in a real implementation.
        // BUT, since we are wrapping `pre`, the `children` passed to `CodeBlock` (mapped to `pre`) contains the `code` element.

        // Let's grab the text content from the DOM element directly for reliability with syntax highlighting.
    };

    const handleCopy = (e: React.MouseEvent) => {
        const pre = e.currentTarget.parentElement;
        const code = pre?.querySelector("code");
        const text = code?.textContent || "";

        navigator.clipboard.writeText(text).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-[#0d1117]">
            <button
                onClick={handleCopy}
                className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 z-10"
                aria-label="Copy code"
            >
                {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <pre className={`overflow-x-auto p-4 text-sm leading-relaxed ${className || ""}`}>
                {children}
            </pre>
        </div>
    );
}
