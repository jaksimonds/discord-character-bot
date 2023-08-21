import path from 'path'
import { SlashCommandBuilder, TextChannel } from "discord.js"
import { readFile } from 'fs'

export const data = new SlashCommandBuilder()
  .setName('edit')
  .setDescription('Edit an existing character.')
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Sets the name of the character.')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('personality')
      .setDescription('Sets the personality that will be used by openai.'))
  .addStringOption(option => 
    option.setName('voice')
      .setDescription('Sets the voice profile for the character to use.')
      .setAutocomplete(true))
  .addStringOption(option =>
    option.setName('temperature')
      .setDescription('Controls AI randomness.'))
  .addStringOption(option => 
    option.setName('max_tokens')
      .setDescription('Controls how much text is generated.'))
  .addStringOption(option =>
    option.setName('top_p')
      .setDescription('Controls message diversity.'))
  .addStringOption(option =>
    option.setName('frequency_penalty')
      .setDescription('Decreases likelihood of repeat messages.'))
  .addStringOption(option =>
    option.setName('presence_penalty')
      .setDescription('Increases likelihood of new topics.'))

export const execute = async (interaction) => {
  try {
    const channel = interaction.channel
    const characterName = interaction.options.getString('name')
    const personality = interaction.options?.getString('personality')
    const voice = interaction.options?.getString('voice')
    const temperature = interaction.options?.getString('temperature')
    const max_tokens = interaction.options?.getString('max_tokens')
    const top_p = interaction.options?.getString('top_p')
    const frequency_penalty = interaction.options?.getString('frequency_penalty')
    const presence_penalty = interaction.options?.getString('presence_penalty')
  
    if (channel instanceof TextChannel) {
      const characterChannel = interaction.client.channels.cache.find(channel => channel.name === `character-${characterName.toLowerCase()}`)
      const pinnedMessages = await characterChannel.messages.fetchPinned()
      if (personality) {
        const pinnedPersonality = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('system'))
        pinnedPersonality.edit(`System: ${personality}`)
      }
      if (voice) {
        const pinnedVoice = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('voice'))
        pinnedVoice.edit(`Voice: ${voice}`)
      }
      if (temperature) {
        const pinnedTemperature = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('system'))
        if (pinnedTemperature) {
          pinnedTemperature.edit(`Temperature: ${temperature}`)
        } else {
          await characterChannel.send(`Temperature: ${temperature}`).then(message => message.pin())
        }
      }
      if (max_tokens) {
        const pinnedTokens = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('max tokens'))
        if (pinnedTokens) {
          pinnedTokens.edit(`Max Tokens: ${max_tokens}`)
        } else {
          await characterChannel.send(`Max Tokens: ${max_tokens}`).then(message => message.pin())
        }
      }
      if (top_p) {
        const pinnedTopP = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('top p'))
        if (pinnedTopP) {
          pinnedTopP.edit(`Top P: ${top_p}`)
        } else {
          await characterChannel.send(`Top P: ${top_p}`).then(message => message.pin())
        }
      }
      if (frequency_penalty) {
        const pinnedFrequencyPenalty = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('frequency penalty'))
        if (pinnedFrequencyPenalty) {
          pinnedFrequencyPenalty.edit(`Frequency Penalty: ${frequency_penalty}`)
        } else {
          await characterChannel.send(`Frequency Penalty: ${frequency_penalty}`).then(message => message.pin())
        }
      }
      if (presence_penalty) {
        const pinnedPresencePenalty = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('presence penalty'))
        if (pinnedPresencePenalty) {
          pinnedPresencePenalty.edit(`Presence Penalty: ${presence_penalty}`)
        } else {
          await characterChannel.send(`Presence Penalty: ${presence_penalty}`).then(message => message.pin())
        }
      }
      await interaction.reply('Character edited successfully!')
    } else {
      interaction.reply('This channel is not a text channel')
    }
  } catch (error) {
    console.error(`Error editing characer: ${error}`)
  }
}

export const autocomplete = async (interaction) => {
  const focusedValue = interaction.options.getFocused()
  if (focusedValue) {
    if (process?.env?.ELEVEN_LABS_API_KEY) {
      try {
        readFile(path.join(__dirname, '../../voices/elevenLabsVoices.json'), 'utf8', async (error, data) => {
          if (error) throw error
          const { voices } = JSON.parse(data)
          const filteredVoices = voices.filter(voice => voice.name.toLowerCase().startsWith(focusedValue))
          await interaction.respond(
            filteredVoices.map(voice => ({
              name: voice.name,
              value: voice.voice_id
            }))
          )
        })
      } catch (error) {
        console.error(`error attempting to populate command autocomplete with eleven labs voice data: ${error}`)
      }
    } else if (process?.env?.AZURE_SPEECH_KEY && process?.env?.AZURE_SPEECH_REGION) {
      try {
        readFile(path.join(__dirname, '../../voices/azureSpeechVoices.json'), 'utf8', async (error, data) => {
          if (error) throw error
          const voices = JSON.parse(data)
          const filteredVoices = voices.filter(voice => voice.DisplayName.toLowerCase().startsWith(focusedValue))
          await interaction.respond(
            filteredVoices.slice(0, 25).map(voice => ({
              name: voice.DisplayName,
              value: voice.ShortName
            }))
          )
        })
      } catch (error) {
        console.error(`error attempting to populate command autocomplete with azure voice data: ${error}`)
      }
    }
  }
}