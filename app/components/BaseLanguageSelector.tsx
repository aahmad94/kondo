import React, { useState } from 'react';

interface BaseLanguageSelectorProps {
  onBaseLanguageChange: (baseLanguage: string) => void;
  currentBaseLanguage: string;
}

const BaseLanguageSelector: React.FC<BaseLanguageSelectorProps> = ({ 
  onBaseLanguageChange, 
  currentBaseLanguage 
}) => {
  const [showModal, setShowModal] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ja', name: 'Japanese' },
    { code: 'vi', name: 'Vietnamese' }
  ];

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="block w-full px-4 py-2 text-sm text-left text-gray-200 hover:bg-gray-700 whitespace-nowrap"
      >
        Set Base Language
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-gray-800 rounded-sm p-6 max-w-sm w-full mx-4 border border-gray-700 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-white">Select Base Language</h2>
            <div className="space-y-2">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    onBaseLanguageChange(language.code);
                    setShowModal(false);
                  }}
                  className={`w-full px-4 py-2 text-left rounded ${
                    currentBaseLanguage === language.code
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  {language.name}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BaseLanguageSelector; 