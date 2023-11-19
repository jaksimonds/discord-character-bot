import path from 'path'
import {
  EndBehaviorType,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource
} from '@discordjs/voice'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ClientUser } from 'discord.js'
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

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max)

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
    model: 'gpt-4',
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

export const subscribeToUser = (user: string, guildId: string, characterChannel: TextChannel, voiceChannel?: VoiceChannel) => {
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

export const azureTextToSpeech = async (message: string, voice: string, guildId: string, bot: ClientUser) => {
  try {
    const filename = path.join(__dirname, 'recordings/tts.mp3')
    const speechConfig = SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY, process.env.AZURE_SPEECH_REGION)
    const audioConfig = AudioConfig.fromAudioFileOutput(filename)

    speechConfig.speechSynthesisVoiceName = voice

    let synthesizer = new SpeechSynthesizer(speechConfig, audioConfig)

    await synthesizer.speakTextAsync(message, (result) => {
      if (result.reason === ResultReason.SynthesizingAudioCompleted) {
        speak(path.join(__dirname, 'recordings/tts.mp3'), guildId, bot)
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

export const elevenlabsSpeak = async (message: string, voiceId: string, guildId: string, bot: ClientUser) => {
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
      speak(path.join(__dirname, 'recordings/tts.mp3'), guildId, bot)
    })
  } catch (error) {
    console.log(`eleven labs text-to-speech error: ${error}`)
  }
}

export const speak = (filename: string, guildId: string, bot: ClientUser) => {
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
