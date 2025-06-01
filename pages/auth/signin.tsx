import { GetServerSideProps } from 'next';
import { getProviders, signIn, getCsrfToken } from 'next-auth/react';
import { InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel } from 'swiper/modules';
import 'swiper/css';
import { useRef, useEffect, useState } from 'react';
import type { Swiper as SwiperType } from 'swiper';

export default function SignIn({ providers, csrfToken }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = scrollableRef.current;
      if (!el || !swiperInstance) return;
      // At top or bottom
      if (el.scrollTop === 0 || el.scrollTop + el.clientHeight >= el.scrollHeight) {
        swiperInstance.mousewheel.enable();
      } else {
        swiperInstance.mousewheel.disable();
      }
    };
    const el = scrollableRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }
    return () => {
      if (el) el.removeEventListener('scroll', handleScroll);
    };
  }, [swiperInstance]);

  return (
    <div className="min-h-screen max-h-screen bg-gray-900 flex flex-col p-0 font-mono overflow-hidden">
      <Head>
        <title>Sign in to Kondo</title>
      </Head>
      <Swiper
        onSwiper={swiper => {
          setSwiperInstance(swiper);
          setActiveIndex(swiper.activeIndex);
        }}
        direction="vertical"
        slidesPerView={1}
        mousewheel={{ forceToAxis: true, releaseOnEdges: true, sensitivity: 3 }}
        modules={[Mousewheel]}
        className="h-screen w-full"
        onActiveIndexChange={(swiper) => setActiveIndex(swiper.activeIndex)}
      >
        {/* Slide 1: Kondo description + sign-in */}
        <SwiperSlide>
          <div className="flex items-center justify-center min-h-screen w-full bg-gray-900 relative">
            <div className="w-full max-w-4xl bg-gray-800 rounded-sm shadow-lg overflow-hidden m-4">
              <div className="flex flex-col md:flex-row">
                {/* Left section with headers */}
                <div className="p-8 md:w-2/3">
                  <h1 className="text-4xl font-bold text-white mb-3">Kondo</h1>
                  <p className="text-gray-300 text-lg mb-6">
                    Leverage AI to generate and organize study material to learn new languages
                  </p>
                  <p className="text-gray-400 text-sm">
                    Sign in to start your language learning journey with Kondo's AI-powered tools.
                  </p>
                </div>
                
                {/* Right section with login button */}
                <div className="bg-gray-700 p-8 md:w-1/3 flex flex-col justify-center">
                  {Object.values(providers || {}).map((provider: any) => (
                    <div key={provider.id} className="mb-3">
                      <button
                        onClick={() => signIn(provider.id, { callbackUrl: '/' })}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded-sm transition-colors"
                      >
                        {provider.id === 'google' && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                            <path fill="#4CAF50" d="M24,44c5.166,0,9.86,1.977,13.409,5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                          </svg>
                        )}
                        Sign in with {provider.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SwiperSlide>

        {/* Slide 2: GPT Response Image */}
        <SwiperSlide>
          <div ref={scrollableRef} className="h-screen overflow-y-auto flex flex-col items-center bg-gray-900 relative swiper-nested">
            <div className="w-full max-w-6xl flex flex-col items-center p-8">
              <p
                className="text-center text-xl overflow-hidden text-ellipsis mt-4"
                style={{ color: '#ae9b4a', minHeight: '32px', width: '100%', maxWidth: '100%' }}
              >
                Easily generate study material
              </p>
              <div className="m-4 w-full max-w-[545px]">
                <Image
                  src="/assets/GPTResponse_05-31-2025.png"
                  alt="Generate study material with AI"
                  width={654}
                  height={822}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </SwiperSlide>

        {/* Slide 3: Breakdown Image */}
        <SwiperSlide>
          <div ref={scrollableRef} className="h-screen overflow-y-auto flex flex-col items-center bg-gray-900 relative swiper-nested">
            <div className="w-full max-w-6xl flex flex-col items-center p-8">
              <p
                className="text-center text-xl overflow-hidden text-ellipsis mt-4"
                style={{ color: '#ae9b4a', minHeight: '32px', width: '100%', maxWidth: '100%' }}
              >
                Every translation automatically includes a text and audio guide
              </p>
              <div className="m-4 w-full max-w-[545px]">
                <Image
                  src="/assets/breakdown_clipped_05-31-2025.png"
                  alt="Automated breakdown generated material"
                  width={654}
                  height={822}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </SwiperSlide>
      </Swiper>

      {/* Fixed sign-in button at bottom right, only on slides 2 and 3 */}
      {(activeIndex === 1 || activeIndex === 2) && (
        <div className="fixed bottom-8 right-8 z-50">
          {Object.values(providers || {}).map((provider: any) => (
            <div key={provider.id} className="mb-3">
              <button
                onClick={() => signIn(provider.id, { callbackUrl: '/' })}
                className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-sm transition-colors shadow-lg"
              >
                {provider.id === 'google' && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86,1.977,13.409,5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                  </svg>
                )}
                Sign in with {provider.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Animated down arrow cue: only show on first slide */}
      {activeIndex === 0 && (
        <div className="fixed left-[calc(50%-46.35px)] bottom-4 md:bottom-12 flex flex-col items-center opacity-80 animate-bounce z-40">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-white text-sm mt-1">Scroll down</span>
        </div>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const providers = await getProviders();
  const csrfToken = await getCsrfToken(context);
  return {
    props: {
      providers,
      csrfToken,
    },
  };
}; 