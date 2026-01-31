import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import topics from '@/data/topics.json';

const CONTENT_ROOT = path.join(process.cwd(), '../');

export type TopicContent = {
    slug: string;
    title: string;
    content: string;
    frontmatter: any;
};

export async function getTopic(slug: string) {
    return topics.find(t => t.slug === slug);
}

export async function getContent(slug: string, type: string): Promise<TopicContent | null> {
    // Map type (runbook) to filename (RUNBOOK.md)
    const fileMap: Record<string, string> = {
        'runbook': 'RUNBOOK.md',
        'workshop': 'WORKSHOP.md',
        'workbook': 'WORKBOOK.md',
        'business': 'BUSINESS.md',
        'concept': 'CONCEPT.md',
        'content': 'CONTENT.md',
        'readme': 'README.md'
    };

    if (!type) {
        console.error(`[getContent] Error: type is undefined/null for slug: ${slug}`);
        return null;
    }

    const filename = fileMap[type.toLowerCase()];
    if (!filename) {
        console.error(`[getContent] Unknown type: ${type} for slug: ${slug}`);
        return null;
    }

    const filePath = path.join(CONTENT_ROOT, slug, filename);

    if (!fs.existsSync(filePath)) return null;

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { content, data } = matter(fileContent);

    return {
        slug,
        title: data.title || filename.replace('.md', ''),
        content,
        frontmatter: data
    };
}

export async function getStaticTopicParams() {
    return topics.map(t => ({ slug: t.slug }));
}
