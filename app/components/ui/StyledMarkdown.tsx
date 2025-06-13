import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StyledMarkdownProps {
  children: string;
  className?: string;
  remarkPlugins?: any[];
  components?: Record<string, React.ComponentType<any>>;
}

const StyledMarkdown: React.FC<StyledMarkdownProps> = ({ 
  children, 
  className = "",
  remarkPlugins = [remarkGfm],
  components = {}
}) => {
  // Default table styling components
  const defaultTableComponents = {
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
  };

  // Merge default table components with any custom components passed in
  const mergedComponents = {
    ...defaultTableComponents,
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