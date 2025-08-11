'use client';

import { Fragment, useEffect, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { trackLanguageChange } from '@/lib';

interface Language {
  id: string;
  code: string;
  name: string;
}

interface LanguageSelectorProps {
  onClearBookmark: () => void;
  onLanguageChange: (languageCode: string) => void;
}

export default function LanguageSelector({ onClearBookmark, onLanguageChange }: LanguageSelectorProps) {
  const { data: session } = useSession();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchLanguageData = async () => {
      try {
        setIsLoading(true);
        // Fetch available languages
        const languagesResponse = await fetch('/api/getLanguages');
        if (!languagesResponse.ok) throw new Error('Failed to fetch languages');
        const languagesData = await languagesResponse.json();
        setLanguages(languagesData);

        // Fetch user's language preference if logged in
        if (session?.userId) {
          const preferenceResponse = await fetch(`/api/getUserLanguagePreference?userId=${session.userId}`);
          if (preferenceResponse.ok) {
            const { languageId } = await preferenceResponse.json();
            const userLanguage = languagesData.find((lang: Language) => lang.id === languageId);
            if (userLanguage) {
              setSelectedLanguage(userLanguage);
              return;
            }
          }
        }

        // Set Japanese as default if no preference found
        const japanese = languagesData.find((lang: Language) => lang.code === 'ja');
        if (japanese) setSelectedLanguage(japanese);
      } catch (error) {
        console.error('Error fetching language data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLanguageData();
  }, [session]);

  const handleLanguageChange = async (language: Language) => {
    if (!session?.userId) return;

    try {
      const response = await fetch('/api/updateLanguagePreference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.userId,
          languageId: language.id,
        }),
      });

      if (response.ok) {
        // Track language change before updating state
        await trackLanguageChange(selectedLanguage?.code || 'ja', language.code);
        setSelectedLanguage(language);
        // Store language in local storage
        localStorage.setItem('preferredLanguage', JSON.stringify({
          code: language.code,
          id: language.id,
          name: language.name
        }));
        // Clear the bookmark selection
        onClearBookmark();
        // Update the language in the parent component
        onLanguageChange(language.code);
        // Navigate to the base path without query parameters
        router.push('/');
        // Trigger a refetch of bookmarks to get the ones for the new language
        await fetch(`/api/getBookmarks?userId=${session.userId}`);
      }
    } catch (error) {
      console.error('Error updating language preference:', error);
    }
  };

  if (isLoading || !selectedLanguage) {
    return (
      <div className="relative w-32">
        <div className="w-full cursor-pointer rounded-sm bg-card border border-border py-2 pl-3 pr-10 text-left">
          <div className="h-5 w-20 bg-muted rounded-sm animate-pulse-fast"></div>
        </div>
      </div>
    );
  }

  return (
    <Listbox value={selectedLanguage} onChange={handleLanguageChange}>
      <div className="relative w-32">
        <Listbox.Button className="relative w-full cursor-pointer rounded-sm bg-card border border-border py-2 pl-3 pr-10 text-left text-card-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <span className="block truncate">{selectedLanguage.name}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute max-h-60 w-full overflow-auto rounded-sm bg-popover/95 backdrop-blur-sm py-1 text-base shadow-lg ring-1 ring-border focus:outline-none z-50">
            {languages.map((language) => (
              <Listbox.Option
                key={language.id}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                  }`
                }
                value={language}
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? 'font-medium' : 'font-normal'
                      }`}
                    >
                      {language.name}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                        <span className="text-lg">•</span>
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
} 