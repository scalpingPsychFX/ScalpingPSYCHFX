import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MarkdownContent: React.FC<{ content: string; className?: string }> = ({
  content,
  className = '',
}) => {
  return (
    <div className={`text-[15px] leading-relaxed text-slate-700 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p({ children }) {
            return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
          },
          h1({ children }) {
            return (
              <h3 className="text-base font-semibold text-slate-900 mt-4 mb-2">
                {children}
              </h3>
            );
          },
          h2({ children }) {
            return (
              <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-1.5">
                {children}
              </h4>
            );
          },
          h3({ children }) {
            return (
              <h5 className="text-sm font-medium text-slate-900 mt-2.5 mb-1">
                {children}
              </h5>
            );
          },
          ul({ children }) {
            return (
              <ul className="list-disc list-outside ml-5 mb-3 space-y-1">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-outside ml-5 mb-3 space-y-1">
                {children}
              </ol>
            );
          },
          strong({ children }) {
            return <strong className="font-semibold text-slate-900">{children}</strong>;
          },
          code({ children }) {
            return (
              <code className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                {children}
              </code>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-700 my-3 text-sm">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
