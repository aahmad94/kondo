// pages/api/inngest.ts
import { serve } from "inngest/next";
// inngest.ts
import { Inngest } from 'inngest';

// Initialize the Inngest client with your app name
export default serve({
    client: new Inngest({ id: 'Kondo' }),
    functions: [],
  });