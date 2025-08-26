'use client';

import { useChat } from '@ai-sdk/react';
import { Input } from "@/components/conversation/input"
import { Button } from "@/components/conversation/button"
import { ArrowUpFromDot, ArrowUpDown, Cog, CheckCircle, Loader2, AlertTriangle, Zap, Layers } from "lucide-react"
import { Switch } from "@/components/conversation/switch"
import { MemoizedMarkdown } from '@/components/conversation/memoized-markdown';
import { ReportRenderer } from '@/components/conversation/report-renderer';

import {  
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/conversation/select"

import React, { useState } from 'react';
import { promptTemplates, type PromptTemplate } from '@/lib/conversation/prompt-templates';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/conversation/avatar"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/conversation/collapsible"

const conversationStyles = `
  .conversation-wrapper {
    font-size: 1.2rem; /* Increase base size by 20% */
  }
  
  .grift-content {
    font-family: 'Grift', sans-serif;
  }
  
  .grift-content h1,
  .grift-content h2,
  .grift-content h3,
  .grift-content h4,
  .grift-content h5,
  .grift-content h6 {
    font-family: 'Grift', sans-serif;
    line-height: normal;
  }
  
  .grift-content p,
  .grift-content ul,
  .grift-content ol,
  .grift-content li,
  .grift-content div {
    font-family: 'Grift', sans-serif;
  }
  
  /* Tool messages stay at original size */
  .tool-message {
    font-size: 0.833rem; /* Scale back to original size (1rem / 1.2) */
  }
`;

export default function ConversationPage() {
  // State needs to be defined first
  const [input, setInput] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>("jumbomax");
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [fullReportMode, setFullReportMode] = useState<boolean>(false);
  
  // Updated useChat API for AI SDK 5.0 / @ai-sdk/react 2.0.10  
  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: selectedClient, // This will create a new chat instance per client
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('Message finished:', message);
    },
  });
  
  // Reset messages when client changes
  React.useEffect(() => {
    console.log('Client changed to:', selectedClient);
    setMessages([]); // Clear messages when switching clients
  }, [selectedClient, setMessages]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [overloadError, setOverloadError] = useState<string | null>(null);

  // Status can be: 'ready' | 'submitted' | 'streaming' | 'error'
  const isAssistantThinking = status === 'streaming' || status === 'submitted';

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 conversation-wrapper">
      <style jsx>{conversationStyles}</style>
      <div className="w-full" style={{ maxWidth: '73rem' }}>
        <div className="center">
          <h1 className="text-4xl font-extrabold text-center" style={{color: 'var(--text-primary)'}}>
            What do you want to learn today about {selectedClient === 'jumbomax' ? 'JumboMax' : selectedClient === 'hb' ? 'Holderness & Bourne' : selectedClient === 'lab' ? 'L.A.B. Golf' : selectedClient}?
          </h1>
        </div>
        
        {/* Display error state */}
        {status === 'error' && error && (
          <div className="card px-4 py-3 rounded mb-4 border" style={{borderColor: 'rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.1)'}}>
            {error.message?.includes('Overloaded') || (error as any)?.type === 'overloaded_error' ? (
              <>
                <strong style={{color: 'var(--text-primary)'}}>⚠️ Service Temporarily Overloaded</strong>
                <p className="mt-1" style={{color: 'var(--text-secondary)'}}>Claude's API is currently experiencing high demand. Please try again in a few moments.</p>
                <p className="text-sm mt-2 italic" style={{color: 'var(--text-muted)'}}>This is a temporary issue and should resolve shortly.</p>
              </>
            ) : (
              <>
                <strong style={{color: 'var(--text-primary)'}}>Error:</strong> <span style={{color: 'var(--text-secondary)'}}>{error.message || 'Something went wrong. Please try again.'}</span>
              </>
            )}
          </div>
        )}
        
        {React.useMemo(() => messages.map((message, index: number) => {
          const isLastAssistant = index === messages.length - 1 && message.role === 'assistant';
          
          // Skip tool messages in display - they should be handled by assistant messages
          if (message.role === 'tool') return null;
          
          // Check for overload errors in message parts
          const hasOverloadError = message.parts?.some(part => 
            part.type === 'error' && 
            (part.error?.type === 'overloaded_error' || part.error?.message?.includes('Overloaded'))
          );

          // Extract content from message parts (AI SDK 5.0 structure)
          const messageParts = message.parts
            ?.map((part, partIndex) => {
              if (part.type === 'text') return { type: 'text', content: part.text, key: `text-${partIndex}` };
              if (part.type === 'error' && part.error?.type === 'overloaded_error') {
                return { type: 'text', content: `⚠️ **Service Temporarily Overloaded**\n\nClaude's API is currently experiencing high demand. Please try again in a few moments.\n\n*This is a temporary issue and should resolve shortly.*`, key: `error-${partIndex}` };
              }
              if (part.type === 'tool-call') {
                return { type: 'tool-element', element: (
                  <div key={`tool-call-${partIndex}`} className="tool-message tool-call" style={{ fontFamily: "'NORD', sans-serif" }}>
                    <Cog className="w-4 h-4 inline mr-2" /> <strong>Executing {part.toolName}</strong>...
                  </div>
                ), key: `tool-call-${partIndex}` };
              }
              if (part.type === 'tool-result') {
                return { type: 'tool-element', element: (
                  <div key={`tool-result-${partIndex}`} className="tool-message tool-result" style={{ fontFamily: "'NORD', sans-serif" }}>
                    <CheckCircle className="w-4 h-4 inline mr-2" /> <strong>Tool completed successfully</strong>
                  </div>
                ), key: `tool-result-${partIndex}` };
              }
              if (part.type === 'step-start') return null; // Hide step-start
              if (part.type.startsWith('tool-')) {
                // Handle other tool-related parts like tool-runSQL
                const toolName = part.type.replace('tool-', '');
                if (part.output && part.state === 'output-available') {
                  // Format the SQL results nicely with success indicator
                  if (toolName === 'runSQL' && part.output.results) {
                    const results = part.output.results;
                    const count = part.output.count || results.length;
                    return { type: 'tool-element', element: (
                      <div key={`tool-sql-${partIndex}`} className="tool-message tool-result tool-sql" style={{ fontFamily: "'NORD', sans-serif" }}>
                        <CheckCircle className="w-4 h-4 inline mr-2" /> <strong>SQL Query Completed</strong> - Found {count} rows
                      </div>
                    ), key: `tool-sql-${partIndex}` };
                  }
                  if (toolName === 'getTableSchema' && part.output) {
                    return { type: 'tool-element', element: (
                      <div key={`tool-schema-${partIndex}`} className="tool-message tool-result tool-schema" style={{ fontFamily: "'NORD', sans-serif" }}>
                        <CheckCircle className="w-4 h-4 inline mr-2" /> <strong>Schema Retrieved</strong> - Table structure loaded successfully
                      </div>
                    ), key: `tool-schema-${partIndex}` };
                  }
                  if (toolName === 'composeReport' && part.output) {
                    // Handle report rendering
                    if (part.output.component === 'Report' && part.output.props) {
                      return { type: 'report', report: part.output.props, key: `tool-report-${partIndex}` };
                    }
                  }
                  // Other tools
                  return { type: 'tool-element', element: (
                    <div key={`tool-${toolName}-${partIndex}`} className={`tool-message tool-result tool-${toolName}`} style={{ fontFamily: "'NORD', sans-serif" }}>
                      <CheckCircle className="w-4 h-4 inline mr-2" /> <strong>{toolName} Completed</strong>
                    </div>
                  ), key: `tool-${toolName}-${partIndex}` };
                }
                if (part.input) {
                  return { type: 'tool-element', element: (
                    <div key={`tool-start-${toolName}-${partIndex}`} className={`tool-message tool-call tool-${toolName}`} style={{ fontFamily: "'NORD', sans-serif" }}>
                      <Cog className="w-4 h-4 inline mr-2" /> <strong>{toolName}</strong> started
                    </div>
                  ), key: `tool-start-${toolName}-${partIndex}` };
                }
                if (part.state === 'done') {
                  return { type: 'tool-element', element: (
                    <div key={`tool-done-${toolName}-${partIndex}`} className={`tool-message tool-result tool-${toolName}`} style={{ fontFamily: "'NORD', sans-serif" }}>
                      <CheckCircle className="w-4 h-4 inline mr-2" /> <strong>{toolName}</strong> completed successfully
                    </div>
                  ), key: `tool-done-${toolName}-${partIndex}` };
                }
                return { type: 'tool-element', element: (
                  <div key={`tool-progress-${toolName}-${partIndex}`} className={`tool-message tool-progress tool-${toolName}`} style={{ fontFamily: "'NORD', sans-serif" }}>
                    <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> <strong>{toolName}</strong> in progress...
                  </div>
                ), key: `tool-progress-${toolName}-${partIndex}` };
              }
              return null; // Hide unknown types
            })
            .filter(Boolean) || [];

          // Process parts in order to maintain streaming sequence
          const orderedContent = messageParts.map((part, idx) => {
            if (part.type === 'text') {
              // Check if this is the final text part (summary) - last text part in the message
              const textParts = messageParts.filter(p => p.type === 'text');
              const isLastTextPart = textParts.length > 0 && part === textParts[textParts.length - 1];
              
              return { 
                type: 'markdown', 
                content: part.content, 
                key: `content-${idx}`,
                isSummary: isLastTextPart 
              };
            } else if (part.type === 'tool-element') {
              return { type: 'element', element: part.element, key: `element-${idx}` };
            } else if (part.type === 'report') {
              return { type: 'report', report: part.report, key: `report-${idx}` };
            }
            return null;
          }).filter(Boolean);

          return (
            <div
              className={`gap-4 rounded-2xl text-lg p-6 mt-5 card ${
                message.role === 'user' 
                  ? 'flex' 
                  : hasOverloadError 
                  ? 'border-l-4' 
                  : ''
              }`}
              style={hasOverloadError ? {borderColor: 'rgba(239, 68, 68, 0.5)'} : {}}
              key={message.id}
            >
              {message.role === 'user' && (
                <Avatar className="bg-white">
                  <AvatarImage
                    src={`${message.role === 'user' ? '/compass_icon.svg' : '/ai_icon.svg'}`}
                    alt="Avatar"
                  />
                  <AvatarFallback>RS</AvatarFallback>
                </Avatar>
              )}
              <div>
                <div className="prose space-y-2">
                  {orderedContent.map((item, idx) => (
                    <div key={item.key} className={item.isSummary ? 'summary' : ''}>
                      {item.type === 'markdown' ? (
                        <div className="grift-content">
                          <MemoizedMarkdown id={`${message.id}-${idx}`} content={item.content} />
                        </div>
                      ) : item.type === 'report' ? (
                        <div className="my-6 grift-content">
                          <ReportRenderer report={item.report} />
                        </div>
                      ) : (
                        item.element
                      )}
                    </div>
                  ))}
                  {isLastAssistant && isAssistantThinking && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full" style={{borderColor: 'var(--accent-primary)'}}></div>
                      <p className="grift-content" style={{color: 'var(--text-muted)'}}><em>Working on your request...</em></p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }), [messages, isAssistantThinking])}

        <div className="card p-6 mt-5 mb-8 rounded-2xl">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && status === 'ready') {
              console.log('Sending message with selectedClient:', selectedClient); // Debug log
              setOverloadError(null); // Clear any previous overload errors
              const messageOptions: any = {
                body: { selectedClient }
              };

              // Add custom system context if a prompt template is selected
              if (selectedPrompt) {
                messageOptions.body.systemContext = selectedPrompt.systemContext;
              }
              // Use the switch as the source of truth for expectsReport
              messageOptions.body.expectsReport = fullReportMode;

              sendMessage({ 
                text: input
              }, messageOptions);
              setInput('');
              setSelectedPrompt(null); // Clear selected prompt after sending
            }
          }}>
            {selectedPrompt && (
              <div className="mb-3 p-3 rounded-lg border" style={{background: 'var(--accent-bg)', borderColor: 'var(--accent-border)'}}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium" style={{color: 'var(--accent-primary)'}}>Using prompt template: {selectedPrompt.title}</span>
                    <span className="text-xs ml-2 capitalize" style={{color: 'var(--accent-primary)', opacity: 0.8}}>({selectedPrompt.category})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPrompt(null);
                      setInput('');
                    }}
                    className="hover:opacity-80"
                    style={{color: 'var(--accent-primary)'}}
                  >
                    <span className="text-sm">✕</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Report Mode Indicator */}
            <div className="mb-3 flex justify-end">
              <div className="px-3 py-2 rounded-lg border" style={{background: 'var(--bg-elevated)', borderColor: 'var(--border-muted)'}}>
                <div className="flex items-center space-x-2">
                  {fullReportMode ? (
                    <>
                      <Layers className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                      <span className="text-xs" style={{color: 'var(--text-muted)'}}>Full Report Mode</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                      <span className="text-xs" style={{color: 'var(--text-muted)'}}>Quick Analysis Mode</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Input
              placeholder={selectedPrompt ? selectedPrompt.userPrompt : "Ask a data question ..."}
              name="prompt"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={status !== 'ready'}
              className="p-7 mb-3 focus-visible:ring-1"
              style={{
                background: 'var(--bg-elevated)', 
                borderColor: 'var(--border-muted)', 
                color: 'var(--text-primary)'
              }}
            />

            <div className="flex justify-between items-start">
              <div className="flex">
                <Select defaultValue="jumbomax" onValueChange={(value) => {
                  console.log('Client changed to:', value);
                  setSelectedClient(value);
                }}>
                  <SelectTrigger className="rounded-full w-[200px] border-none" style={{background: 'var(--bg-elevated)', color: 'var(--text-secondary)'}}>
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent className="border" style={{background: 'var(--bg-card)', borderColor: 'var(--border-muted)'}}>
                    <SelectItem value="jumbomax">JumboMax</SelectItem>
                    <SelectItem value="hb">Holderness & Bourne</SelectItem>
                    <SelectItem value="lab">L.A.B. Golf</SelectItem>
                  </SelectContent>
                </Select>

                <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
                  <div className="flex items-center justify-between space-x-4 px-4">
                    <CollapsibleTrigger asChild>
                      <Button className="btn-secondary">
                        <ArrowUpDown />Prompts
                      </Button>
                    </CollapsibleTrigger>
                    
                    {/* Full Report Toggle Switch */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={fullReportMode}
                        onCheckedChange={setFullReportMode}
                        disabled={status !== 'ready'}
                        className="data-[state=checked]:bg-[#89cdee] data-[state=unchecked]:bg-neutral-300"
                      />
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>
                        Full Report
                      </span>
                    </div>
                  </div>
                  <CollapsibleContent className="space-y-2">
                    <div className="grid gap-2">
                      {promptTemplates.slice(0, 6).map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => {
                            setInput(template.userPrompt);
                            setSelectedPrompt(template);
                            setIsOpen(false); // Close the collapsible
                          }}
                          className="text-left rounded-md border px-3 py-2 text-sm shadow-sm transition-colors"
                          style={{
                            background: 'var(--bg-elevated)', 
                            borderColor: 'var(--border-muted)', 
                            color: 'var(--text-primary)'
                          }}
                          disabled={status !== 'ready'}
                        >
                          <div className="font-medium" style={{color: 'var(--text-primary)'}}>{template.title}</div>
                          <div className="text-xs mt-1 capitalize" style={{color: 'var(--text-muted)'}}>
                            {template.category}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <Button 
                type="submit" 
                disabled={status !== 'ready' || !input.trim()}
                className="rounded-full h-14 w-14 p-0 flex items-center justify-center bg-[#89cdee] hover:bg-[#7bb8e1] self-start"
              >
                <ArrowUpFromDot className="text-white w-5 h-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}