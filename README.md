# Discord Character Bot

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?style=for-the-badge&logo=discord&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-74aa9c?style=for-the-badge&logo=openai&logoColor=white)
![ElevenLabs](https://img.shields.io/badge/ElvenLabs-white.svg?style=for-the-badge)
![Azure](https://img.shields.io/badge/azure-%230072C6.svg?style=for-the-badge&logo=microsoftazure&logoColor=white)

A Node.JS Discord Bot that allows users to create custom AI characters that can be added to voice channels. This bot uses Open AI's Whisper model for speech to text transcription, Open AI's gpt-3.5-turbo model for text generation, and either Eleven Labs or Microsoft Azure's text to speech services.

**DISCLAIMER: User consent is required to use this bot.**

## Setup

### Installation

This bot requires Node.JS and NPM to run which you can download [here](https://nodejs.org/en/download/current)

Once that is configured either clone this repo or download the latest release and run:

```
npm install
```

This will install the necessary dependencies needed to run the project.

### API Keys

Create a .env file in the root of the project and, using the .env.sample as reference, add the necessary keys. If you are unsure of where to find these follow the guides below:

- [Discord Bot Key](https://discord.com/developers/docs/getting-started#step-1-creating-an-app): This is needed to connect your bot to the code.
- [Discord Client ID](https://discord.com/developers/docs/getting-started#step-1-creating-an-app): This is needed to connect your bot to the code.
- [OpenAI](https://platform.openai.com/account/api-keys): This connects your OpenAI account to the bot and is needed to use their APIs.
  - The use of OpenAI's APIs are not free, reference their [pricing page](https://openai.com/pricing) for details.
- [Eleven Labs](https://docs.elevenlabs.io/api-reference/quick-start/authentication): High quality AI generative Text to Speech service. Can get fairly expensive with more use.
  - The use of Eleven Lab's APIs are not free, reference their [pricing page](https://elevenlabs.io/pricing) for details.
- [Azure Speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-text-to-speech?tabs=windows%2Cterminal&pivots=programming-language-javascript#prerequisites): Moderate quality AI generative Text to Speech service.
  - The use of Azure's APIs are not free, reference their [pricing page](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/) for details.

### Build

If you cloned the project you'll need to compile the project by running:

```
npm run build
```

This will generate a dist folder which is what the bot will run on.

### Deploy

Once all previous steps have been configured run:

```
npm run deploy
```

This publishes all the commands to your bot so that you can use them in the services you've added the bot to.

## Running The Project

To run the project run:

```
npm start
```

This will log the bot in and fire the ready event. The ready event will generate a json file that contains the various text to speech voices from one of the supported text to speech services. From here you are free to start using the bot.

## Commands

### Create

Used to create a thread in the text channel where the command was executed. The thread is used to store data about your character such as the personality and voice as well as API config options. When the bot has been added to a voice channel the thread will act as a chat log between your users and the AI.

| Option            | Description                                       | Type   | Required |
| ----------------- | ------------------------------------------------- | ------ | -------- |
| Name              | Sets the name of the character.                   | String | True     |
| Personality       | Sets the personality that will be used by OpenAI. | String | True     |
| Voice             | Sets the voice profile for the character to use.  | String | True     |
| Temperature       | Controls AI randomness.                           | String | False    |
| Max Tokens        | Controls how much text is generated.              | String | False    |
| Top P             | Controls message diversity.                       | String | False    |
| Frequency Penalty | Decreases likelihood of repeat messages.          | String | False    |
| Presence Penalty  | Increases likelihood of new topics.               | String | False    |

### Add

Adds the bot to the specified voice channel. Once added the bot will use the specified character thread to load config options. When the bot is set to Open all voice is captured and submitted, this is best used with one person. Otherwise a button will be added to the voice channel's chat that controls when a user starts being recorded.

| Option  | Description                                      | Type    | Required |
| ------- | ------------------------------------------------ | ------- | -------- |
| Name    | The name of the character to message.            | String  | True     |
| Channel | The name of the channel the character will join. | String  | True     |
| Open    | Sets if the call is open mic or not              | Boolean | False    |

### Edit

Edits an existing character with the specified options.
| Option | Description | Type | Required |
| ----------------- | ------------------------------------------------- | ------ | -------- |
| Name | Sets the name of the character. | String | True |
| Personality | Sets the personality that will be used by OpenAI. | String | False |
| Voice | Sets the voice profile for the character to use. | String | False |
| Temperature | Controls AI randomness. | String | False |
| Max Tokens | Controls how much text is generated. | String | False |
| Top P | Controls message diversity. | String | False |
| Frequency Penalty | Decreases likelihood of repeat messages. | String | False |
| Presence Penalty | Increases likelihood of new topics. | String | False |
