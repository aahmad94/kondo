// pages/_app.js
import { SessionProvider } from "next-auth/react"
import '../app/globals.css'

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <div className="h-full">
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </div>
  )
}

export default MyApp