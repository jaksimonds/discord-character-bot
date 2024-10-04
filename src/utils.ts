import path from 'path'
import https from 'https'
import fs from 'fs'
import {
  EndBehaviorType,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource
} from '@discordjs/voice'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ClientUser
} from 'discord.js'
import { createWriteStream, createReadStream } from 'fs'
import { opus } from 'prism-media'
import { pipeline, Transform } from 'stream'
import ffmpegStatic from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'
import {
  SpeechConfig,
  AudioConfig,
  SpeechSynthesizer,
  ResultReason
} from 'microsoft-cognitiveservices-speech-sdk'
import OpenAI from 'openai'
import { TextChannel, VoiceChannel } from 'discord.js'

const configuration = {
  organization: "org-luvrFP8KIr7T00u3G61J65R8",
  apiKey: process.env.OPENAI_API_KEY,
}

const openai = new OpenAI(configuration)

interface IMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Forces the requested number to be within the min/max range.
 * 
 * @param num - The number attempting to be used
 * @param min - The minimum range the passed num value can be
 * @param max - The maximum range the passed num value can be
 * @returns The number value that is no greater and no less than the passed min/max values
 */
export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max)

/**
 * Generates a random integer between the min/max range.
 * 
 * @param min - The minimum range the random integer can be
 * @param max - The maximum range the random integer can be
 * @returns A random integer between the supplied range
 */
export const getRandomInt = (min: number, max: number) => {
  const minCeiled = Math.ceil(min)
  const maxFloored = Math.floor(max)
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled)
}

/**
 * Staggers the execution of a function by a delayed timeout to prevent rapid firing.
 * 
 * @param func - Callback function that needs to be debounced
 * @param timeout - The amount of time before the callback function can be executed
 * @returns A function with the setTimeout that ultimately calls the func callback
 */
export const debounce = (func: (...args: unknown[]) => unknown, timeout: number = 300) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      func.apply(this, args)
    }, timeout)
  }
}

/**
 * Chat function that passes a user's message to the OpenAI chat completions API.
 * 
 * @param name - The name of the character that the Discord bot is set to
 * @param personality - The stored personality prompt for the character the Discord bot is set to
 * @param chatLogs - An array of messages from previous interactions with the Discord bot
 * @param message - The user submitted prompt that was recorded and transcribed
 * @param temperature - The stored temperature value that the character is set to which gets forwarded to the OpenAI chat API
 * @param max_tokens - The stored maximum amount of tokens the OpenAI chat API can use for response generation
 * @param top_p - The stored top_p value which is basically an alternative to the temperature parameter
 * @param frequency_penalty - The stored frequency_penalty value that the character is set to which alters the likelihood of repeated lines
 * @param presence_penalty - The stored presence_penalty value that the character is set to which alters the likelihood of new topics
 * @returns A chat response message from the OpenAI Chat API
 */
export const chat = async (
  name: string,
  personality: string,
  chatLogs: IMessage[] = [],
  message: string,
  temperature?: string,
  max_tokens?: string,
  top_p?: string,
  frequency_penalty?: string,
  presence_penalty?: string,
) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Your name is ${name}. ${personality} You will respond exclusively in English.`,
      },
      ...chatLogs,
      {
        role: "user",
        content: message
      }
    ],
    temperature: temperature ? clamp(parseFloat(temperature), 0, 2) : 0.7,
    max_tokens: max_tokens ? clamp(parseInt(max_tokens), 1, 4095) : 256,
    top_p: top_p ? clamp(parseFloat(top_p), 0, 1) : 1,
    frequency_penalty: frequency_penalty ? clamp(parseFloat(frequency_penalty), 0, 2) : 0,
    presence_penalty: presence_penalty ? clamp(parseFloat(presence_penalty), 0, 2) : 0,
  })

  const answer = response.choices[0].message.content
  return answer
}

/**
 * Forwards an audio file to the OpenAI Whisper model for speech-to-text transcription.
 * 
 * @param file - The filepath to the mp3 file to pass to the OpenAI Whisper model
 * @returns The transcribed text the Whisper model extracted from the audio file
 */
export const transcribe = async (file: string) => {
  try {
    const fileObject = createReadStream(file)
    const response = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: fileObject,
    })
    return response.text
  } catch (error) {
    console.log(`transcription error: ${error}`)
  }
}

/**
 * Records the selected user's voice to a static file and passes it to the transcribe function.
 * 
 * @param user - The Discord user that is being recorded
 * @param guildId - The Discord server ID that the bot is currently active in
 * @param characterChannel - The Discord thread channel object for the currently active character in the voice call
 * @param voiceChannel - The Discord voice channel object that the character bot is active in
 */
export const subscribeToUser = (
  user: string,
  guildId: string,
  characterChannel: TextChannel,
  voiceChannel?: VoiceChannel
) => {
  ffmpeg.setFfmpegPath(ffmpegStatic)

  const connection = getVoiceConnection(guildId)
  const streamer = connection.receiver.subscribe(user, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 1000,
    }
  })

  const pcmFile = path.join(__dirname, 'recordings/output.pcm')
  const writable = createWriteStream(pcmFile)
  const opusDecoder = new opus.Decoder({
    frameSize: 960,
    channels: 2,
    rate: 48000
  })

  const logStream = new (Transform)({
    transform(chunk, _, callback) {
      callback(null, chunk)
    }
  })

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  pipeline(streamer, opusDecoder, logStream, writable, async (error) => {
    if (error) {
      console.error(`pipeline failed: ${error}`)
    } else {
      const mp3File = path.join(__dirname, 'recordings/output.mp3')
      ffmpeg()
        .input(pcmFile)
        .inputOptions([
          '-f s16le',
          '-ar 44.1k',
          '-ac 2'
        ])
        .saveToFile(mp3File)
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Processing: ${Math.floor(progress.percent)}% done`)
          }
        })
        .on('end', async () => {
          const value = await transcribe(mp3File)
          if (voiceChannel) {
            const record = new ButtonBuilder()
              .setCustomId('start')
              .setLabel('Start')
              .setStyle(ButtonStyle.Primary)
            const row = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(record)
            const recordMessage = voiceChannel.messages.cache.find(message => message.content.includes('Record:'))
            await recordMessage.edit({
              content: 'Record:',
              components: [row]
            })
          }
          characterChannel.send(`User: ${value}`)
          streamer.destroy()
        })
        .on('error', async (error) => {
          console.error(error)
          if (voiceChannel) {
            const record = new ButtonBuilder()
              .setCustomId('start')
              .setLabel('Start')
              .setStyle(ButtonStyle.Primary)
            const row = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(record)
            const recordMessage = voiceChannel.messages.cache.find(message => message.content.includes('Record:'))
            await recordMessage.edit({
              content: 'Record:',
              components: [row]
            })
          }
        })
    }
  })
}

/**
 * Passes the Character Bot's generated text response to the Azure text-to-speech model using the stored character's voice.
 * 
 * @param message - The character bot message to be passed to the Azure text-to-speech model
 * @param voice - The stored voice profile that the character is set to
 * @param guildId - The Discord server ID that the bot is currently active in
 * @param bot - The Discord character bot's user object
 */
export const azureTextToSpeech = async (
  message: string,
  voice: string,
  guildId: string,
  bot: ClientUser
) => {
  try {
    const filename = path.join(__dirname, 'recordings/tts.mp3')
    const speechConfig = SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY, process.env.AZURE_SPEECH_REGION)
    const audioConfig = AudioConfig.fromAudioFileOutput(filename)

    speechConfig.speechSynthesisVoiceName = voice

    let synthesizer = new SpeechSynthesizer(speechConfig, audioConfig)

    await synthesizer.speakTextAsync(message, (result) => {
      if (result.reason === ResultReason.SynthesizingAudioCompleted) {
        speak(filename, guildId, bot)
      } else {
        console.log(`text-to-speech error: ${result.errorDetails}`)
      }
      synthesizer.close()
      synthesizer = null
    }, (error) => {
      console.trace(`error - ${error}`)
      synthesizer.close()
      synthesizer = null
    })
  } catch (error) {
    console.log(`azure text-to-speech error: ${error}`)
  }
}

/**
 * Passes the Character Bot's generated text response to the ElevenLabs text-to-speech model using the stored character's voice.
 * 
 * @param message - The character bot message to be passed to the Azure text-to-speech model
 * @param voiceId - The stored voice profile that the character is set to
 * @param guildId - The Discord server ID that the bot is currently active in
 * @param bot - The Discord character bot's user object
 */
export const elevenlabsSpeak = async (
  message: string,
  voiceId: string,
  guildId: string,
  bot: ClientUser
) => {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        accept: 'audio/mpeg',
        'content-type': 'application/json',
        'xi-api-key': `${process.env.ELEVEN_LABS_API_KEY}`
      },
      body: JSON.stringify({
        text: message
      })
    })

    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const filename = path.join(__dirname, 'recordings/tts.mp3')
    const audioStream = createWriteStream(filename)
    audioStream.write(buffer)
    audioStream.end()

    audioStream.on('finish', () => {
      speak(filename, guildId, bot)
    })
  } catch (error) {
    console.log(`eleven labs text-to-speech error: ${error}`)
  }
}

/**
 * Passes the Character Bot's generated text response to the OpenAI text-to-speech model using the stored character's voice.
 * 
 * @param message - The character bot message to be passed to the Azure text-to-speech model
 * @param voiceId - The stored voice profile that the character is set to
 * @param guildId - The Discord server ID that the bot is currently active in
 * @param bot - The Discord character bot's user object
 */
export const openaiSpeak = async (
  message: string,
  voiceId: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
  guildId: string,
  bot: ClientUser
) => {
  try {
    const filename = path.join(__dirname, 'recordings/tts.mp3')
    const speech = await openai.audio.speech.create({
      input: message,
      model: 'tts-1',
      voice: voiceId,
    })

    const buffer = Buffer.from(await speech.arrayBuffer())
    await fs.promises.writeFile(filename, buffer)
      .then(() => speak(filename, guildId, bot))
    
  } catch (error) {
    console.log(`openai text-to-speech error: ${error}`)
  }
}

/**
 * Takes the file output from the active text-to-speech model and sends it to the Discord audio player in the active voice call.
 * 
 * @param filename - The filepath to the mp3 file to pass to Discord's audio player
 * @param guildId - The Discord server ID that the bot is currently active in
 * @param bot - The Discord character bot's user object
 */
export const speak = (
  filename: string,
  guildId: string,
  bot: ClientUser
) => {
  const connection = getVoiceConnection(guildId)
  const audioPlayer = createAudioPlayer()

  const audioResource = createAudioResource(filename, {
    inlineVolume: true
  })
  audioPlayer.play(audioResource)
  audioPlayer.on('stateChange', (oldState, newState) => {
    if (newState.status === 'playing') {
      bot.setActivity({
        name: 'Speaking'
      })
    } else if (newState.status === 'idle') {
      bot.setActivity({
        name: 'Idle'
      })
    }
  })
  connection.subscribe(audioPlayer)
}

/**
 * Takes the personality of the character and passes it as the prompt for OpenAI's Dall-E model's image generation and passes it to the downloadFile.
 * 
 * @param prompt - The personality prompt for the character that is being generated
 * @param name - The name for the character that is being generated
 */
export const generateAvatar = async (prompt: string, name: string) => {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `a singular vector shape with a simple background that represents the following personality: "${prompt}"`,
    n: 1,
    size: '1024x1024'
  })

  const avatar = response.data[0].url
  downloadFile(avatar, name)
}

/**
 * Downloads a file from a given URL to the file system.
 * 
 * @param url - The URL to the file to be downloaded
 * @param name - The name of the file to be saved locally
 */
const downloadFile = (url: string, name: string) => {
  const destination = path.join(__dirname, `avatars/${name}.png`)
  const file = createWriteStream(destination)
  https.get(url, (response) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    response.pipe(file)
    file.on('finish', () => {
      file.close()
    })
  }).on('error', (error) => {
    console.log(`Error downloading avatar to local filesystem: ${error}`)
  })
}