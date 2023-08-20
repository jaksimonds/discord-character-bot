import { Events } from 'discord.js'
import {
  chat,
  azureTextToSpeech,
  elevenlabsSpeak,
} from '../utils'

export const name = Events.MessageCreate
export const execute = async (message) => {
  const client = message.client
  const author = message.author

  if (author.bot) {
    const channelId = message.channelId
    const channel = await client.channels.fetch(channelId)
    if (channel.name.includes('character')) {
      if (message.content.toLowerCase().startsWith('user:')) {
        try {
          const characterName = channel.name.replace('character-', '')

          const pinnedMessages = await channel.messages.fetchPinned()
          
          const characterPersonality = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('system'))
          const personalityMessage = characterPersonality.content.toLowerCase().replace('system: ', '')

          const temperature = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('temperature'))
          const temperatureMessage = temperature?.content?.toLowerCase()?.replace('temperature: ', '') || ''

          const max_tokens = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('max tokens'))
          const max_tokensMessage = max_tokens?.content?.toLowerCase()?.replace('max tokens: ', '') || ''

          const top_p = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('top p'))
          const top_pMessage = top_p?.content?.toLowerCase()?.replace('top p: ', '') || ''

          const frequency_penalty = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('frequency penalty'))
          const frequency_penaltyMessage = frequency_penalty?.content?.toLowerCase()?.replace('frequency penalty: ', '') || ''

          const presence_penalty = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('presence penalty'))
          const presence_penaltyMessage = presence_penalty?.content?.toLowerCase()?.replace('presence penalty: ', '') || ''

          const lastMessages = await channel.messages.fetch({
            limit: 10,
            before: message.id
          })

          const previousMessages = lastMessages?.filter(message => !message.content.toLowerCase().startsWith('system') && !message.content.toLowerCase().startsWith('voice'))
          let chatLog = []
          if (previousMessages.length) {
            chatLog = previousMessages.map(message => {
              const array = message.content.split(': ')
              const role = array?.at(0).toLowerCase()
              const content = array?.at(1).toLowerCase()
              return {
                role: role,
                content: content
              }
            })
          }

          const userMessage = message.content.toLowerCase().replace('user: ', '')

          const response = await chat(
            characterName,
            personalityMessage,
            chatLog,
            userMessage,
            temperatureMessage,
            max_tokensMessage,
            top_pMessage,
            frequency_penaltyMessage,
            presence_penaltyMessage
          )
          await channel.send(`Assistant: ${response}`)
        } catch (error) {
          console.error(`error attempting to transcribe audio: ${error}`)
        }
      } else if (message.content.toLowerCase().startsWith('assistant: ')) {
        try {
          const pinnedMessages = await channel.messages.fetchPinned()
          const voiceMessage = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('voice'))
          const voiceId = voiceMessage.content.replace('Voice: ', '')
          const assistantMessage = message.content.toLowerCase().replace('assistant: ', '')
          if (process?.env?.ELEVEN_LABS_API_KEY) {
            await elevenlabsSpeak(assistantMessage, voiceId, message.guildId)
          } else if (process?.env?.AZURE_SPEECH_KEY && process?.env?.AZURE_SPEECH_REGION) {
            await azureTextToSpeech(assistantMessage, voiceId, message.guildId)
          } else {
            throw new Error('No Text to Speech API key found in environment variables. Please close the app down and update your environment variables.')
          }
        } catch (error) {
          console.error(`error attempting to convert text to speech: ${error}`)
        }
      }
    }
  }
}