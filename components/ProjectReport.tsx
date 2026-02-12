
import React, { useState } from 'react';
import { ACADEMIC_DOCS } from '../constants';

const ProjectReport: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-2xl mt-8">
      <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Engineering Project Documentation
        </h2>
        <div className="flex gap-2">
          {ACADEMIC_DOCS.map((doc, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                activeTab === idx 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {doc.title}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-slate-950 p-6 min-h-[400px]">
        <pre className="text-sm font-mono leading-relaxed text-indigo-300 overflow-x-auto whitespace-pre-wrap">
          {ACADEMIC_DOCS[activeTab].content.trim()}
        </pre>
        <div className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wider text-slate-600">
          {ACADEMIC_DOCS[activeTab].language}
        </div>
      </div>
    </div>
  );
};

export default ProjectReport;
