import React from 'react';

interface GPTResponseProps {
  response: string;
}

export default function GPTResponse({ response }: GPTResponseProps) {
  const formatResponse = (text: string) => {
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <div className="mt-4 p-4 border rounded text-white">
      <h2 className="font-bold text-blue-400">AI Response:</h2>
      <div className="whitespace-pre-wrap">{formatResponse(response)}</div>
    </div>
  );
}
