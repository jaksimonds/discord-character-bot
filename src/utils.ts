import path from 'path'
import {
  EndBehaviorType,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource
} from '@discordjs/voice'
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
import { Configuration, OpenAIApi } from "openai"

const configuration = new Configuration({
  organization: "org-luvrFP8KIr7T00u3G61J65R8",
  apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(configuration)

interface IMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const chat = async (name: string, personality: string, chatLogs: IMessage[] = [], message: string) => {
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `Your name is ${name}. ${personality}`,
      },
      ...chatLogs,
      {
        role: "user",
        content: message
      }
    ],
    temperature: 0.7,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  })

  const answer = response.data.choices[0].message.content
  return answer
}

export const transcribe = async (file: string) => {
  try {
    const fileObject = createReadStream(file)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const response = await openai.createTranscription(fileObject, 'whisper-1')
    return response.data.text
  } catch (error) {
    console.log(`transcription error: ${error}`)
  }
}

export const subscribeToUser = (user, guildId, characterChannel) => {
  ffmpeg.setFfmpegPath(ffmpegStatic)

  const connection = getVoiceConnection(guildId)
  const streamer = connection.receiver.subscribe(user, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 100,
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
          characterChannel.send(`User: ${value}`)
          streamer.destroy()
        })
        .on('error', (error) => {
          console.error(error)
        })
    }
  })
}

export const azureTextToSpeech = async (message, voice, guildId) => {
  try {
    const filename = path.join(__dirname, 'recordings/tts.mp3')
    const speechConfig = SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY, process.env.AZURE_SPEECH_REGION)
    const audioConfig = AudioConfig.fromAudioFileOutput(filename)

    speechConfig.speechSynthesisVoiceName = voice

    let synthesizer = new SpeechSynthesizer(speechConfig, audioConfig)

    await synthesizer.speakTextAsync(message, (result) => {
      if (result.reason === ResultReason.SynthesizingAudioCompleted) {
        speak(path.join(__dirname, 'recordings/tts.mp3'), guildId)
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

export const elevenlabsSpeak = async (message, voiceId, guildId) => {
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
      speak(path.join(__dirname, 'recordings/tts.mp3'), guildId)
    })
  } catch (error) {
    console.log(`eleven labs text-to-speech error: ${error}`)
  }
}

export const speak = (filename, guildId) => {
  const connection = getVoiceConnection(guildId)
  const audioPlayer = createAudioPlayer()

  const audioResource = createAudioResource(filename, {
    inlineVolume: true
  })
  audioPlayer.play(audioResource)
  connection.subscribe(audioPlayer)
}
