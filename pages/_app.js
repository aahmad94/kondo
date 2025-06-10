// pages/_app.js
import { SessionProvider } from "next-auth/react"
import { AudioProvider } from '../app/contexts/AudioContext'
import '../app/globals.css'

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <div className="h-full">
      <SessionProvider session={session}>
        <AudioProvider>
          <Component {...pageProps} />
        </AudioProvider>
      </SessionProvider>
    </div>
  )
}

export default MyApp