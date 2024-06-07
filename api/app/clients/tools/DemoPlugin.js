const { Tool } = require('langchain/tools');
const { z } = require('zod');
const { OpenAI } = require('@langchain/openai');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');

class DemoPlugin extends Tool {
  constructor(fields) {
    super();
    this.name = 'demoplugin';
    this.description = 'Use this whenever the user asks a programming question';
    console.log('PLUGIN:\n\n\n', process.env.OPENAI_API_KEY);
    console.log('Fields:\n\n\n', fields);

    this.model = new OpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o',
      temperature: 0,
    });

    console.log('THIS\n\n\n\n\n', JSON.stringify(this, null, 2), '\n\nEND THIS');

    this.schema = z.object({
      history: z.string().describe('A summary of the conversation so far.'),
      query: z.string().describe('The user\'s question broken into keywords'),
    });
  }

  async _call(data) {
    console.log('REST\n\n\n\n', JSON.stringify(data, null, 2), '\n\n\n\nREST END');
    const systemMessage =
      new SystemMessage(`Your task is to assist in writing high-quality Typescript code. The code should be self-explanatory, easy to read, and maintainable.

## Guidelines ##
- **Avoid using \`any\` type:** The use of \`any\` type in Typescript should be avoided as much as possible. Instead, rely on type inference or explicitly define the type when necessary.
- **No use of semi-colons:** Do not use semi-colons in your code.
- **Indentation:** Use 2 spaces for indentation instead of tabs.
- **No comments:** Do not include comments in the code unless it is absolutely necessary. The code should be self-documenting.
- **Coding style:** Try to mirror the user's coding style, including naming conventions, indentation style, use of white space, and other stylistic elements.
- **Code blocks:** Use code blocks with appropriate syntax highlighting for Typescript when providing code in your responses.
- **Concise explanations:** Provide VERY brief and to-the-point explanations. Detailed explanations should only be provided when necessary for understanding the concept or code. Less is more.

## Scope and Detail Level ##
The responses should be tailored to a user with a high level of proficiency in Typescript. Basic installation steps or rudimentary explanations should not be included unless specifically requested by the user.`);

    const humanMessage = new HumanMessage(data.input);
    const response = await this.model.invoke([systemMessage, humanMessage]);

    return response;
  }
}

module.exports = DemoPlugin;
