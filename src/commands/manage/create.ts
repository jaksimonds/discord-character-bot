import path from 'path'
import { SlashCommandBuilder, TextChannel } from 'discord.js'
import { readFile } from 'fs'

export const data = new SlashCommandBuilder()
  .setName('create')
  .setDescription('Begins the Character creation.')
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Sets the name of the character.')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('personality')
      .setDescription('Sets the personality that will be used by openai.')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('voice')
      .setDescription('Sets the voice profile for the character to use.')
      .setRequired(true)
      .setAutocomplete(true))

export const execute = async (interaction) => {
  const channel = interaction.channel
  const characterName = interaction.options.getString('name')
  const characterPersonality = interaction.options.getString('personality')
  const characterVoice = interaction.options.getString('voice')

  if (channel instanceof TextChannel) {
    const thread = await channel.threads.create({
      name: `character-${characterName.toLowerCase()}`,
      autoArchiveDuration: 60,
      reason: `Character log for ${characterName}.`
    })
    await thread.send(`System: ${characterPersonality}`).then(message => message.pin())
    await thread.send(`Voice: ${characterVoice}`).then(message => message.pin())
    await interaction.reply('Character creation thread created!')
  } else {
    interaction.reply('This channel is not a text channel')
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