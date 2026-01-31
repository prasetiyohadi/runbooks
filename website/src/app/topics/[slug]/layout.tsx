import topics from "@/data/topics.json";
import { ReactNode } from "react";

export async function generateStaticParams() {
    return topics.map((t: any) => ({ slug: t.slug }));
}

export default function TopicLayout({ children }: { children: ReactNode }) {
    return children;
}
