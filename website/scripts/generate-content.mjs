import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_ROOT = path.join(process.cwd(), '../'); // Parent of website/
const OUTPUT_FILE = path.join(process.cwd(), 'src/data/topics.json');
const SEARCH_INDEX_FILE = path.join(process.cwd(), 'src/data/search-index.json');

// Files to look for in each topic
const KEY_FILES = {
    'README.md': 'Overview',
    'RUNBOOK.md': 'Runbook',
    'WORKSHOP.md': 'Workshop',
    'BUSINESS.md': 'Business',
    'CONCEPT.md': 'Concept',
    'CONTENT.md': 'Content'
};

const IGNORED_DIRS = ['website', '.git', '.github', '.agent', '.gemini', 'node_modules', '_templates'];

function getExcerpt(content) {
    // Remove markdown formatting and get first 150 chars
    const text = content.replace(/#+\s/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/(\r\n|\n|\r)/gm, " ");
    return text.substring(0, 150).trim() + (text.length > 150 ? '...' : '');
}

function scanTopics() {
    const topics = [];
    const searchIndex = [];

    const items = fs.readdirSync(CONTENT_ROOT, { withFileTypes: true });

    for (const item of items) {
        if (!item.isDirectory() || item.name.startsWith('.') || IGNORED_DIRS.includes(item.name)) {
            continue;
        }

        const topicPath = path.join(CONTENT_ROOT, item.name);
        const topicData = {
            slug: item.name,
            title: item.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), // Default title
            summary: '',
            files: []
        };

        // Check for README to get proper title and summary
        const readmePath = path.join(topicPath, 'README.md');
        if (fs.existsSync(readmePath)) {
            const fileContent = fs.readFileSync(readmePath, 'utf-8');
            const { data, content } = matter(fileContent);

            // Try to parse title from # Heading
            const titleMatch = content.match(/^#\s+(.+)$/m);
            if (titleMatch) {
                topicData.title = titleMatch[1].trim();
            }

            topicData.summary = getExcerpt(content);

            // Add README to search index
            searchIndex.push({
                title: topicData.title,
                slug: item.name,
                path: `/topics/${item.name}`,
                category: 'Topic',
                keywords: item.name,
                excerpt: topicData.summary
            });

            // Add README as a viewable file if needed, but usually it's the landing data
            topicData.files.push({
                type: 'README',
                path: `/topics/${item.name}` // Landing uses README usually
            });
        }

        // Check for other key files
        for (const [filename, category] of Object.entries(KEY_FILES)) {
            // Skip README here as we handled it for metadata (or treat it as 'Overview')
            if (filename === 'README.md') continue;

            const filePath = path.join(topicPath, filename);
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const { content } = matter(fileContent);

                topicData.files.push({
                    type: category, // e.g., Runbook
                    filename: filename,
                    slug: category.toLowerCase(),
                    path: `/topics/${item.name}/${category.toLowerCase()}`
                });

                // Add to search index
                searchIndex.push({
                    title: `${topicData.title} - ${category}`,
                    slug: item.name,
                    path: `/topics/${item.name}/${category.toLowerCase()}`,
                    category: category,
                    keywords: `${item.name} ${category}`,
                    excerpt: getExcerpt(content)
                });
            }
        }

        // Sort files by priority: Business -> Concept -> Runbook -> Workshop
        const priority = ['Business', 'Concept', 'Runbook', 'Workshop'];
        topicData.files.sort((a, b) => {
            const indexA = priority.indexOf(a.type);
            const indexB = priority.indexOf(b.type);

            // Items in priority list come first
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            return 0;
        });

        if (topicData.files.length > 0 || fs.existsSync(readmePath)) {
            topics.push(topicData);

            // Copy assets if they exist
            const assetsSrc = path.join(topicPath, 'assets');
            if (fs.existsSync(assetsSrc)) {
                // Target: website/public/images/topics/[slug]/assets
                const assetsDest = path.join(process.cwd(), 'public', 'images', 'topics', item.name, 'assets');

                if (!fs.existsSync(assetsDest)) {
                    fs.mkdirSync(assetsDest, { recursive: true });
                }

                fs.cpSync(assetsSrc, assetsDest, { recursive: true });
                console.log(`Copied assets for ${item.name}`);
            }
        }
    }

    return { topics, searchIndex };
}

function main() {
    console.log('Building content index...');
    const { topics, searchIndex } = scanTopics();

    // Ensure output dir exists
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(topics, null, 2));
    fs.writeFileSync(SEARCH_INDEX_FILE, JSON.stringify(searchIndex, null, 2));

    console.log(`Generated idx for ${topics.length} topics and ${searchIndex.length} search entries.`);
}

main();
