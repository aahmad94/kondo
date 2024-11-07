// pages/api/inngest.ts
import { serve } from "inngest/next";
import { Inngest } from 'inngest';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Create a test function
const testFunction = inngest.createFunction(
  { id: "test-function" },
  { event: "test/hello" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    
    const message = await step.run("create-message", () => {
      return `Hello from Inngest! Event data: ${JSON.stringify(event.data)}`;
    });

    return {
      message,
      timestamp: new Date().toISOString()
    };
  }
);

// Export the serve handler with our function
export default serve({
  client: inngest,
  functions: [testFunction],
});
