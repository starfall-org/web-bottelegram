import React, { lazy, Suspense } from 'react';

// Lazy load syntax highlighter with only common languages
const SyntaxHighlighter = lazy(() => 
    import('react-syntax-highlighter/dist/esm/light').then(mod => ({ default: mod.default }))
);

// Lazy load only common languages
const loadLanguage = async (lang: string) => {
    const normalizedLang = lang.toLowerCase();
    try {
        switch (normalizedLang) {
            case 'javascript':
            case 'js':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/javascript');
            case 'typescript':
            case 'ts':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/typescript');
            case 'python':
            case 'py':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/python');
            case 'java':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/java');
            case 'cpp':
            case 'c++':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/cpp');
            case 'c':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/c');
            case 'csharp':
            case 'cs':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/csharp');
            case 'go':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/go');
            case 'rust':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/rust');
            case 'php':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/php');
            case 'ruby':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/ruby');
            case 'swift':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/swift');
            case 'kotlin':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/kotlin');
            case 'bash':
            case 'sh':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/bash');
            case 'sql':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/sql');
            case 'json':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/json');
            case 'xml':
            case 'html':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/xml');
            case 'css':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/css');
            case 'markdown':
            case 'md':
                return await import('react-syntax-highlighter/dist/esm/languages/hljs/markdown');
            default:
                return null;
        }
    } catch {
        return null;
    }
};

// Lazy load styles
const loadStyles = () => Promise.all([
    import('react-syntax-highlighter/dist/esm/styles/hljs').then(mod => mod.vs2015),
    import('react-syntax-highlighter/dist/esm/styles/hljs').then(mod => mod.github)
]);

// Cache for loaded styles and languages
let stylesCache: { dark: any; light: any } | null = null;
const languageCache = new Map<string, any>();

// Helper to get current theme
function getCurrentTheme(): 'light' | 'dark' {
    const root = window.document.documentElement;
    const dataTheme = root.getAttribute('data-theme');
    if (dataTheme === 'dark' || dataTheme === 'light') {
        return dataTheme;
    }
    // Fallback to checking class
    if (root.classList.contains('dark')) return 'dark';
    if (root.classList.contains('light')) return 'light';
    // Default to dark
    return 'dark';
}

// Code block component with lazy loading
function CodeBlock({ language, code }: { language: string; code: string }) {
    const [styles, setStyles] = React.useState<{ dark: any; light: any } | null>(stylesCache);
    const [langDef, setLangDef] = React.useState<any>(languageCache.get(language));
    const isDark = getCurrentTheme() === 'dark';

    React.useEffect(() => {
        if (!styles) {
            loadStyles().then(([dark, light]) => {
                const loadedStyles = { dark, light };
                stylesCache = loadedStyles;
                setStyles(loadedStyles);
            });
        }
        
        if (!langDef && !languageCache.has(language)) {
            loadLanguage(language).then(lang => {
                if (lang) {
                    languageCache.set(language, lang.default);
                    setLangDef(lang.default);
                }
            });
        }
    }, [styles, language, langDef]);

    if (!styles) {
        return (
            <pre className="px-2 py-1 bg-muted rounded text-sm font-mono overflow-x-auto whitespace-pre my-2">
                {code}
            </pre>
        );
    }

    return (
        <Suspense fallback={
            <pre className="px-2 py-1 bg-muted rounded text-sm font-mono overflow-x-auto whitespace-pre my-2">
                {code}
            </pre>
        }>
            <SyntaxHighlighter
                language={language}
                style={isDark ? styles.dark : styles.light}
                customStyle={{
                    margin: 0,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                }}
            >
                {code}
            </SyntaxHighlighter>
        </Suspense>
    );
}

// Parse Telegram Markdown/HTML to React elements
export function parseMarkdown(text: string, parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'): React.ReactNode {
    if (!text) return text;
    
    if (parseMode === 'HTML') {
        return parseHTML(text);
    } else if (parseMode === 'MarkdownV2') {
        return parseMarkdownV2(text);
    } else if (parseMode === 'Markdown') {
        return parseMarkdownV1(text);
    }
    
    // Auto-detect if no parse mode specified
    if (text.includes('<b>') || text.includes('<i>') || text.includes('<code>')) {
        return parseHTML(text);
    }
    
    return parseMarkdownV2(text);
}

// Parse HTML
function parseHTML(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Regex for HTML tags
    const htmlRegex = /<(b|strong|i|em|u|ins|s|strike|del|code|pre|a\s+href="[^"]+")>([^<]*)<\/(b|strong|i|em|u|ins|s|strike|del|code|pre|a)>/g;
    
    let match;
    while ((match = htmlRegex.exec(text)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        
        const tag = match[1];
        const content = match[2];
        
        // Create styled element
        if (tag === 'b' || tag === 'strong') {
            parts.push(<strong key={match.index}>{content}</strong>);
        } else if (tag === 'i' || tag === 'em') {
            parts.push(<em key={match.index}>{content}</em>);
        } else if (tag === 'u' || tag === 'ins') {
            parts.push(<u key={match.index}>{content}</u>);
        } else if (tag === 's' || tag === 'strike' || tag === 'del') {
            parts.push(<s key={match.index}>{content}</s>);
        } else if (tag === 'code') {
            parts.push(<code key={match.index} className="px-1 py-0.5 bg-muted rounded text-sm font-mono">{content}</code>);
        } else if (tag === 'pre') {
            // Check if content has language specification
            const codeMatch = content.match(/^(\w+)\n([\s\S]*)$/);
            if (codeMatch) {
                const [, language, code] = codeMatch;
                parts.push(
                    <div key={match.index} className="my-2">
                        <CodeBlock language={language} code={code} />
                    </div>
                );
            } else {
                parts.push(<pre key={match.index} className="px-2 py-1 bg-muted rounded text-sm font-mono overflow-x-auto whitespace-pre">{content}</pre>);
            }
        } else if (tag.startsWith('a href=')) {
            const href = tag.match(/href="([^"]+)"/)?.[1];
            parts.push(<a key={match.index} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{content}</a>);
        }
        
        lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? <>{parts}</> : text;
}

// Parse MarkdownV2
function parseMarkdownV2(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    
    // MarkdownV2 patterns (escaped characters)
    const patterns = [
        { regex: /\*\*(.+?)\*\*/g, tag: 'bold' },
        { regex: /__(.+?)__/g, tag: 'italic' },
        { regex: /~~(.+?)~~/g, tag: 'strikethrough' },
        { regex: /\|\|(.+?)\|\|/g, tag: 'spoiler' },
        { regex: /`(.+?)`/g, tag: 'code' },
        { regex: /```(.+?)```/gs, tag: 'pre' },
        { regex: /\[(.+?)\]\((.+?)\)/g, tag: 'link' },
    ];
    
    // Simple approach: process each pattern
    let processedText = text;
    const replacements: Array<{ start: number; end: number; element: React.ReactNode }> = [];
    
    patterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.regex);
        while ((match = regex.exec(processedText)) !== null) {
            const content = match[1];
            const start = match.index;
            const end = start + match[0].length;
            
            let element: React.ReactNode;
            
            switch (pattern.tag) {
                case 'bold':
                    element = <strong key={key++}>{unescapeMarkdown(content)}</strong>;
                    break;
                case 'italic':
                    element = <em key={key++}>{unescapeMarkdown(content)}</em>;
                    break;
                case 'strikethrough':
                    element = <s key={key++}>{unescapeMarkdown(content)}</s>;
                    break;
                case 'spoiler':
                    element = <span key={key++} className="bg-muted px-1 rounded">{unescapeMarkdown(content)}</span>;
                    break;
                case 'code':
                    element = <code key={key++} className="px-1 py-0.5 bg-muted rounded text-sm font-mono">{unescapeMarkdown(content)}</code>;
                    break;
                case 'pre':
                    // Check if content has language specification (e.g., ```python\ncode```)
                    const unescapedContent = unescapeMarkdown(content);
                    const codeMatch = unescapedContent.match(/^(\w+)\n([\s\S]*)$/);
                    if (codeMatch) {
                        const [, language, code] = codeMatch;
                        element = (
                            <div key={key++} className="my-2">
                                <CodeBlock language={language} code={code} />
                            </div>
                        );
                    } else {
                        element = <pre key={key++} className="px-2 py-1 bg-muted rounded text-sm font-mono overflow-x-auto whitespace-pre">{unescapedContent}</pre>;
                    }
                    break;
                case 'link':
                    const url = match[2];
                    element = <a key={key++} href={unescapeMarkdown(url)} target="_blank" rel="noopener noreferrer" className="text-primary underline">{unescapeMarkdown(content)}</a>;
                    break;
                default:
                    element = content;
            }
            
            replacements.push({ start, end, element });
        }
    });
    
    // If no replacements, return original text
    if (replacements.length === 0) {
        return unescapeMarkdown(text);
    }
    
    // Sort replacements by start position
    replacements.sort((a, b) => a.start - b.start);
    
    // Build result
    replacements.forEach((replacement) => {
        // Add text before this replacement
        if (replacement.start > lastIndex) {
            parts.push(unescapeMarkdown(processedText.substring(lastIndex, replacement.start)));
        }
        
        // Add replacement
        parts.push(replacement.element);
        
        lastIndex = replacement.end;
    });
    
    // Add remaining text
    if (lastIndex < processedText.length) {
        parts.push(unescapeMarkdown(processedText.substring(lastIndex)));
    }
    
    return parts.length > 0 ? <>{parts}</> : unescapeMarkdown(text);
}

// Parse Markdown V1 (legacy)
function parseMarkdownV1(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let key = 0;
    
    // Simple patterns for Markdown V1
    let processedText = text
        .replace(/\*(.+?)\*/g, (_, content) => `<bold>${content}</bold>`)
        .replace(/_(.+?)_/g, (_, content) => `<italic>${content}</italic>`)
        .replace(/`(.+?)`/g, (_, content) => `<code>${content}</code>`)
        .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, url) => `<link href="${url}">${text}</link>`);
    
    // Parse custom tags
    const tagRegex = /<(bold|italic|code|link\s+href="[^"]+")>([^<]*)<\/(bold|italic|code|link)>/g;
    let lastIndex = 0;
    let match;
    
    while ((match = tagRegex.exec(processedText)) !== null) {
        if (match.index > lastIndex) {
            parts.push(processedText.substring(lastIndex, match.index));
        }
        
        const tag = match[1];
        const content = match[2];
        
        if (tag === 'bold') {
            parts.push(<strong key={key++}>{content}</strong>);
        } else if (tag === 'italic') {
            parts.push(<em key={key++}>{content}</em>);
        } else if (tag === 'code') {
            parts.push(<code key={key++} className="px-1 py-0.5 bg-muted rounded text-sm font-mono">{content}</code>);
        } else if (tag.startsWith('link href=')) {
            const href = tag.match(/href="([^"]+)"/)?.[1];
            parts.push(<a key={key++} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{content}</a>);
        }
        
        lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < processedText.length) {
        parts.push(processedText.substring(lastIndex));
    }
    
    return parts.length > 0 ? <>{parts}</> : text;
}

// Unescape MarkdownV2 special characters
function unescapeMarkdown(text: string): string {
    return text
        .replace(/\\([_*\[\]()~`>#+\-=|{}.!\\])/g, '$1');
}

// Escape text for MarkdownV2
export function escapeMarkdownV2(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Escape text for HTML
export function escapeHTML(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
