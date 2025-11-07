import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface StyledMarkdownProps {
  children: string;
  className?: string;
  remarkPlugins?: any[];
  components?: Record<string, React.ComponentType<any>>;
}

const StyledMarkdown: React.FC<StyledMarkdownProps> = ({ 
  children, 
  className = "",
  remarkPlugins = [remarkGfm, remarkBreaks],
  components = {}
}) => {
  // Default components with table styling and link support
  const defaultComponents = {
    // Table components
    table: ({node, ...props}: any) => (
      <table {...props} style={{borderSpacing: '0 8px', borderCollapse: 'separate'}} />
    ),
    tr: ({node, ...props}: any) => (
      <tr {...props} style={{marginBottom: '4px'}} />
    ),
    td: ({node, ...props}: any) => (
      <td {...props} style={{padding: '8px 12px', lineHeight: '1.5'}} />
    ),
    th: ({node, ...props}: any) => (
      <th {...props} style={{padding: '8px 12px', lineHeight: '1.5', fontWeight: 'bold'}} />
    ),
    // Link component - opens in new tab and styled
    a: ({node, ...props}: any) => (
      <a 
        {...props} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      />
    ),
    // Paragraph component - adds spacing between paragraphs
    p: ({node, ...props}: any) => (
      <p {...props} style={{marginBottom: '1em'}} />
    ),
  };

  // Merge default components with any custom components passed in
  const mergedComponents = {
    ...defaultComponents,
    ...components
  };

  return (
    <Markdown 
      remarkPlugins={remarkPlugins}
      components={mergedComponents}
      className={className}
    >
      {children}
    </Markdown>
  );
};

export default StyledMarkdown; 