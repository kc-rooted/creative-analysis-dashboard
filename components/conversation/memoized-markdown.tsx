import { marked } from 'marked';
import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map(token => token.raw);
}

// Helper function to convert ALL CAPS to Title Case
function toTitleCase(text: string): string {
  // If the text is all uppercase, convert to title case
  if (text === text.toUpperCase() && text !== text.toLowerCase()) {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return text;
}

// Helper to extract text content from React children (which may contain objects)
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }
  if (typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    // It's a React element, extract text from its children
    return extractTextFromChildren((children as React.ReactElement).props.children);
  }
  return '';
}

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom heading renderers to convert ALL CAPS to Title Case
          // Use extractTextFromChildren to properly handle React elements (like <strong>)
          h1: ({ node, children, ...props }) => {
            const text = extractTextFromChildren(children);
            const processedText = toTitleCase(text);
            // If title case changed the text, render processed version; otherwise render children as-is
            return <h1 {...props}>{text === processedText ? children : processedText}</h1>;
          },
          h2: ({ node, children, ...props }) => {
            const text = extractTextFromChildren(children);
            const processedText = toTitleCase(text);
            return <h2 {...props}>{text === processedText ? children : processedText}</h2>;
          },
          h3: ({ node, children, ...props }) => {
            const text = extractTextFromChildren(children);
            const processedText = toTitleCase(text);
            return <h4 {...props}>{text === processedText ? children : processedText}</h4>;
          },
          h4: ({ node, children, ...props }) => {
            const text = extractTextFromChildren(children);
            const processedText = toTitleCase(text);
            return <h4 {...props}>{text === processedText ? children : processedText}</h4>;
          },
          h5: ({ node, children, ...props }) => {
            const text = extractTextFromChildren(children);
            const processedText = toTitleCase(text);
            return <h5 {...props}>{text === processedText ? children : processedText}</h5>;
          },
          h6: ({ node, children, ...props }) => {
            const text = extractTextFromChildren(children);
            const processedText = toTitleCase(text);
            return <h6 {...props}>{text === processedText ? children : processedText}</h6>;
          },
          // Custom image renderer to ensure images display
          img: ({ node, ...props }) => {
            // Handle Facebook CDN URLs that might have auth issues
            const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
              const img = e.currentTarget;
              // If image fails to load, show a placeholder with the ad name
              img.style.display = 'none';
              const container = img.parentElement;
              if (container && !container.querySelector('.image-placeholder')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'image-placeholder';
                placeholder.style.cssText = `
                  background: var(--bg-elevated);
                  border: 2px dashed var(--border-muted);
                  border-radius: 8px;
                  padding: 32px;
                  margin: 16px 0;
                  text-align: center;
                  color: var(--text-muted);
                `;
                placeholder.innerHTML = `
                  <div style="font-size: 14px; margin-bottom: 8px;">📷 Ad Creative</div>
                  <div style="font-size: 12px; color: var(--text-muted);">${props.alt || 'Image unavailable'}</div>
                  <div style="font-size: 11px; margin-top: 8px; color: var(--text-muted);">
                    (Facebook CDN image authentication expired)
                  </div>
                `;
                container.insertBefore(placeholder, img);
              }
            };

            return (
              <img
                {...props}
                alt={props.alt || 'Image'}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  margin: '16px 0',
                }}
                loading="lazy"
                onError={handleImageError}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) return false;
    return true;
  },
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return blocks.map((block, index) => (
      <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
    ));
  },
);

MemoizedMarkdown.displayName = 'MemoizedMarkdown';